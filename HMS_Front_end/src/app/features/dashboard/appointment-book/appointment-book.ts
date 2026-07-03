import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, Subject } from 'rxjs';
import { DashboardLayoutComponent } from '../../../shared/ui/dashboard-layout/dashboard-layout';
import { SearchableSelectComponent } from '../../../shared/ui/searchable-select/searchable-select';
import { SlotPickerComponent } from '../../../shared/ui/slot-picker/slot-picker';
import { AvailabilityCalendarComponent } from '../../../shared/ui/availability-calendar/availability-calendar';
import { PatientService } from '../../../core/services/patient.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiErrorHandlerService } from '../../../core/services/api-error-handler.service';
import { APP_MESSAGES } from '../../../core/constants/messages';
import { FormDraftService } from '../../../core/services/form-draft.service';
import { CanComponentDeactivate } from '../../../core/guards/unsaved-changes.guard';
import { Patient } from '../../../core/models/patient.model';
import {
  AvailabilitySlot,
  WeekDay,
} from '../../../core/models/employee.model';
import { DoctorOption } from '../../../core/models/appointment.model';
import {
  noPastDate,
  todayIsoDate,
} from '../../../core/validators/app-validators';

const DRAFT_KEY_CREATE = 'draft:appointment-book';

// Slot length in minutes — kept consistent with the backend HH:mm-HH:mm format
const SLOT_MINUTES = 30;

// JS Date.getDay() (0=Sunday) -> backend WeekDay enum
const DAY_MAP: Record<number, WeekDay> = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
};

// Appointment booking/editing (OWNER/ADMIN/RECEPTIONIST) with create and edit modes
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-appointment-book',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DashboardLayoutComponent,
    SearchableSelectComponent,
    SlotPickerComponent,
    AvailabilityCalendarComponent,
  ],
  templateUrl: './appointment-book.html',
  styleUrl: './appointment-book.css',
})
export class AppointmentBookComponent
  implements OnInit, CanComponentDeactivate {
  private readonly fb = inject(FormBuilder);
  private readonly patientService = inject(PatientService);
  private readonly employeeService = inject(EmployeeService);
  private readonly appointmentService = inject(AppointmentService);
  private readonly toast = inject(ToastService);
  private readonly apiError = inject(ApiErrorHandlerService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly formDraft = inject(FormDraftService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  // Doctors only reach this in edit mode; patient + doctor are locked to the existing values
  isDoctor = false;

  form: FormGroup = this.fb.group({
    patientUHID: ['', Validators.required],
    doctorEmployeeId: ['', Validators.required],
    appointmentDate: ['', [Validators.required, noPastDate]],
    timeSlot: ['', Validators.required],
  });

  // Rejects an appointment date earlier than the selected doctor's joining date
  private readonly beforeJoiningValidator = (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    const joinIso = this.doctorJoinIso();
    if (!value || !joinIso) {
      return null;
    }
    // yyyy-mm-dd strings compare correctly lexicographically
    return String(value) < joinIso ? { beforeJoining: true } : null;
  };

  todayIso = todayIsoDate();
  // Latest bookable date: 6 months ahead (mirrors the backend cap)
  maxIso = this.sixMonthsAhead();
  loading = false;
  submittedOk = false;

  // 'create' | 'edit' — set from route data in ngOnInit
  mode: 'create' | 'edit' = 'create';
  // appointmentId being edited (edit mode only)
  editAppointmentId: string | null = null;

  // Slot to restore after async booked-slots load (edit mode only)
  private pendingTimeSlot: string | null = null;

  // Date-picker minimum: today, raised to the doctor's joining date when later
  minDate = signal(this.todayIso);
  // The selected doctor's joining date as yyyy-mm-dd (null if none/unset)
  private readonly doctorJoinIso = signal<string | null>(null);
  // Friendly joining date for the error message (e.g. "Jun 25, 2026")
  doctorJoinDisplay = signal('');

  // Searchable options + display fields
  patients = signal<Patient[]>([]);
  doctors = signal<DoctorOption[]>([]);

  // Slot rendering
  availableSlots = signal<string[]>([]);
  bookedSlots = signal<string[]>([]);
  loadingSlots = signal(false);

  // Adapter options exposing label/sublabel for SearchableSelectComponent
  patientOptions = signal<any[]>([]);
  doctorOptions = signal<any[]>([]);

  private readonly patientSearch$ = new Subject<string>();

  get pageTitle(): string {
    return this.mode === 'edit' ? 'Edit Appointment' : 'Book Appointment';
  }

  ngOnInit(): void {
    this.mode = (this.route.snapshot.data['mode'] ?? 'create') as 'create' | 'edit';
    this.editAppointmentId = this.route.snapshot.paramMap.get('appointmentId');
    this.isDoctor = this.authService.getDesignation() === 'DOCTOR';

    if (this.mode === 'edit' && !this.editAppointmentId) {
      this.router.navigate(['/dashboard/appointments']);
      return;
    }

    if (this.isDoctor) {
      this.loadSelfDoctor();
    } else {
      this.loadReceptionOptions();
    }

    // Attach the joining-date validator to the date control
    this.form
      .get('appointmentDate')!
      .addValidators(this.beforeJoiningValidator);

    // Recompute slots whenever the doctor or date changes
    this.form.get('doctorEmployeeId')!.valueChanges.subscribe(() => {
      this.updateDoctorJoining();
      this.refreshSlots();
    });
    this.form.get('appointmentDate')!.valueChanges.subscribe(() =>
      this.refreshSlots(),
    );

    // Draft restore + auto-save (create mode only)
    if (this.mode === 'create') {
      const draft = this.formDraft.get(DRAFT_KEY_CREATE);
      if (draft) {
        this.form.patchValue(draft);
      }
      this.form.valueChanges.subscribe(() => {
        if (!this.submittedOk) {
          this.formDraft.save(DRAFT_KEY_CREATE, this.form.getRawValue());
        }
      });
    }
  }

  // Reception/admin/owner: full doctor + patient pickers
  private loadReceptionOptions(): void {
    this.employeeService.getDoctors().subscribe({
      next: (res) => {
        const docs = res.data.doctors || [];
        this.doctors.set(docs);
        this.doctorOptions.set(
          docs.map((d) => ({
            value: d.employeeCode,
            label: d.name,
            sublabel: d.specialization || d.department || '',
          })),
        );
        this.updateDoctorJoining();
        this.cdr.markForCheck();

        if (this.mode === 'edit' && this.editAppointmentId) {
          this.loadForEdit(this.editAppointmentId);
        }
      },
      error: () => this.toast.error(APP_MESSAGES.LOAD_DOCTORS_FAILED),
    });

    this.patientService.getPatients(1, 25).subscribe({
      next: (res) => this.setPatientOptions(res.data.patients),
      error: () => this.toast.error(APP_MESSAGES.LOAD_PATIENTS_FAILED),
    });

    // Debounced server-side patient search
    this.patientSearch$.pipe(debounceTime(300)).subscribe((term) => {
      if (!term || term.trim().length === 0) {
        this.patientService.getPatients(1, 25).subscribe({
          next: (res) => this.setPatientOptions(res.data.patients),
        });
        return;
      }
      this.patientService.searchPatients(term).subscribe({
        next: (res) => this.setPatientOptions(res.data.patients),
      });
    });
  }

  // Doctor reschedule locks patient and doctor and loads the own profile while the patient option comes from the loaded appointment
  private loadSelfDoctor(): void {
    this.form.get('patientUHID')!.disable();
    this.form.get('doctorEmployeeId')!.disable();

    this.employeeService.getMe().subscribe({
      next: (res) => {
        const p = res.data.user.profile;
        const self: DoctorOption = {
          employeeCode: p.employeeCode,
          name: p.name,
          specialization: p.specialization,
          department: p.department,
          consultationFee: p.consultationFee,
          availabilitySlots: p.availabilitySlots,
          joiningDate: p.joiningDate,
          bookingCutoffDate: p.bookingCutoffDate,
        };
        this.doctors.set([self]);
        this.doctorOptions.set([
          {
            value: self.employeeCode,
            label: self.name,
            sublabel: self.specialization || self.department || '',
          },
        ]);
        this.updateDoctorJoining();
        this.cdr.markForCheck();

        if (this.editAppointmentId) {
          this.loadForEdit(this.editAppointmentId);
        }
      },
      error: () => this.toast.error(APP_MESSAGES.LOAD_DOCTORS_FAILED),
    });
  }

  // Loads and patches the form for edit mode (after the doctors list is available)
  private loadForEdit(id: string): void {
    this.loading = true;
    this.appointmentService.getAppointmentById(id).subscribe({
      next: (res) => {
        const a = res.data.appointment;
        if (a.status !== 'BOOKED') {
          this.loading = false;
          this.toast.error('Only BOOKED appointments can be edited.');
          this.router.navigate(['/dashboard/appointments', id]);
          return;
        }

        // Ensure the appointment's patient appears in the dropdown
        if (a.patient) {
          const alreadyListed = this.patientOptions().some(
            (o) => o.value === a.patientUHID,
          );
          if (!alreadyListed) {
            this.patientOptions.set([
              {
                value: a.patientUHID,
                label: a.patient.name,
                sublabel: `${a.patientUHID} · ${a.patient.phone}`,
              },
              ...this.patientOptions(),
            ]);
          }
        }

        // Set values without emitting to avoid racing valueChanges subscriptions
        this.form.get('patientUHID')!.setValue(a.patientUHID, { emitEvent: false });
        this.form.get('doctorEmployeeId')!.setValue(a.doctorEmployeeId, { emitEvent: false });
        this.form.get('appointmentDate')!.setValue(
          this.toIso(new Date(a.appointmentDate)),
          { emitEvent: false },
        );

        this.updateDoctorJoining();

        // refreshSlots clears the timeSlot; restore it once booked-slots loads
        this.pendingTimeSlot = a.timeSlot;
        this.refreshSlots();

        // Baseline from the appointment's canonical values (matches the form once the slot restores)
        this.baseline = JSON.stringify({
          patientUHID: a.patientUHID,
          doctorEmployeeId: a.doctorEmployeeId,
          appointmentDate: this.toIso(new Date(a.appointmentDate)),
          timeSlot: a.timeSlot,
        });

        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.error(APP_MESSAGES.LOAD_APPOINTMENT_FAILED);
        this.router.navigate(['/dashboard/appointments']);
      },
    });
  }

  private setPatientOptions(patients: Patient[]): void {
    this.patients.set(patients);
    this.patientOptions.set(
      patients.map((p) => ({
        value: p.UHID,
        label: p.name,
        sublabel: `${p.UHID} · ${p.phone}`,
      })),
    );
  }

  onPatientSearch = (term: string) => this.patientSearch$.next(term);

  // Updates joining-date state (min date, display, validity) for the selected doctor
  private updateDoctorJoining(): void {
    const doctorId = this.form.get('doctorEmployeeId')!.value;
    const doctor = this.doctors().find((d) => d.employeeCode === doctorId);
    const joiningRaw = doctor?.joiningDate;

    if (joiningRaw) {
      const joinDate = new Date(joiningRaw);
      const joinIso = this.toIso(joinDate);

      this.doctorJoinIso.set(joinIso);
      this.doctorJoinDisplay.set(
        joinDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
      );

      this.minDate.set(
        this.toIso(
          new Date(
            Math.max(
              new Date(joinIso).getTime(),
              new Date(this.todayIso).getTime(),
            ),
          ),
        ),
      );
    } else {
      this.doctorJoinIso.set(null);
      this.doctorJoinDisplay.set('');
      this.minDate.set(this.todayIso);
    }

    // Re-validate the date against the new doctor's joining date
    this.form.get('appointmentDate')!.updateValueAndValidity();
  }

  // Formats a Date as yyyy-mm-dd in local time
  private toIso(d: Date): string {
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }

  private refreshSlots(): void {
    const doctorId = this.form.get('doctorEmployeeId')!.value;
    const date = this.form.get('appointmentDate')!.value;

    // Reset slot when inputs change
    this.form.patchValue({ timeSlot: '' }, { emitEvent: false });
    this.availableSlots.set([]);
    this.bookedSlots.set([]);

    if (!doctorId || !date) {
      return;
    }

    // 1. Derive candidate slots from the doctor's availability for the weekday
    const doctor = this.doctors().find((d) => d.employeeCode === doctorId);
    if (!doctor) {
      return;
    }
    const weekday = DAY_MAP[new Date(date).getDay()];
    const dayWindows = (doctor.availabilitySlots || []).filter(
      (w) => w.day === weekday,
    );
    const candidate = this.expandSlots(dayWindows);

    // For today, hide slots whose start time has already passed
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const filtered =
      date === todayIsoDate()
        ? candidate.filter(
            (slot) => this.toMinutes(slot.split('-')[0]) > nowMinutes,
          )
        : candidate;

    this.availableSlots.set(filtered);

    if (candidate.length === 0) {
      this.restorePendingSlot();
      return;
    }

    // 2. Fetch booked slots for that doctor/date (excluding the current appointment in edit mode)
    this.loadingSlots.set(true);
    this.appointmentService
      .getBookedSlots(
        doctorId,
        date,
        this.mode === 'edit' ? (this.editAppointmentId ?? undefined) : undefined,
      )
      .subscribe({
        next: (res) => {
          this.bookedSlots.set(res.data.bookedSlots || []);
          this.loadingSlots.set(false);
          // Restore the pre-selected slot after slots finish loading (edit mode)
          this.restorePendingSlot();
        },
        error: () => {
          this.loadingSlots.set(false);
          this.bookedSlots.set([]);
        },
      });
  }

  // Restores the edited appointment's slot only if it is still offered
  private restorePendingSlot(): void {
    if (!this.pendingTimeSlot) {
      return;
    }
    if (this.availableSlots().includes(this.pendingTimeSlot)) {
      this.form.patchValue(
        { timeSlot: this.pendingTimeSlot },
        { emitEvent: false },
      );
    } else {
      this.toast.warning(APP_MESSAGES.APPOINTMENT_SLOT_UNAVAILABLE);
    }
    this.pendingTimeSlot = null;
  }

  // Expands availability windows into SLOT_MINUTES "HH:mm-HH:mm" chunks
  private expandSlots(windows: AvailabilitySlot[]): string[] {
    const out: string[] = [];
    for (const w of windows) {
      let cur = this.toMinutes(w.startTime);
      const end = this.toMinutes(w.endTime);
      while (cur + SLOT_MINUTES <= end) {
        const next = cur + SLOT_MINUTES;
        out.push(`${this.fmt(cur)}-${this.fmt(next)}`);
        cur = next;
      }
    }
    return out;
  }

  private toMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private fmt(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.submittedOk;
  }

  // Snapshot of the appointment's scheduling fields when editing (no-op detection)
  private baseline = '';

  private schedulingSnapshot(): string {
    const v = this.form.getRawValue();
    return JSON.stringify({
      patientUHID: v.patientUHID,
      doctorEmployeeId: v.doctorEmployeeId,
      appointmentDate: v.appointmentDate,
      timeSlot: v.timeSlot,
    });
  }

  // Edit mode: true only when patient/doctor/date/time differ from the loaded appointment
  hasChanges(): boolean {
    return this.schedulingSnapshot() !== this.baseline;
  }

  // Selected doctor — used to show a fee summary
  get selectedDoctor(): DoctorOption | null {
    const id = this.form.get('doctorEmployeeId')!.value;
    return this.doctors().find((d) => d.employeeCode === id) || null;
  }

  // Weekdays the selected doctor is available on (drives the date calendar)
  get doctorAvailableDays(): WeekDay[] {
    const slots = this.selectedDoctor?.availabilitySlots || [];
    return [...new Set(slots.map((s) => s.day))];
  }

  // Selected doctor's booking cutoff as yyyy-mm-dd (null if none)
  get doctorCutoffIso(): string | null {
    const cutoff = this.selectedDoctor?.bookingCutoffDate;
    return cutoff ? cutoff.substring(0, 10) : null;
  }

  // yyyy-mm-dd six months from today
  private sixMonthsAhead(): string {
    const d = new Date(this.todayIso);
    d.setMonth(d.getMonth() + 6);
    return this.toIso(d);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Please fix the highlighted fields.');
      return;
    }

    this.loading = true;
    const payload = this.form.getRawValue();

    if (this.mode === 'edit') {
      this.appointmentService
        .updateAppointment(this.editAppointmentId!, payload)
        .subscribe({
          next: (res) => {
            this.loading = false;
            this.cdr.markForCheck();
            this.submittedOk = true;
            this.toast.success(res.message || APP_MESSAGES.APPOINTMENT_UPDATED);
            this.router.navigate([
              '/dashboard/appointments',
              this.editAppointmentId,
            ]);
          },
          error: (err) => {
            this.loading = false;
            this.cdr.markForCheck();
            this.toast.error(
              this.apiError.message(err, APP_MESSAGES.APPOINTMENT_UPDATE_FAILED),
            );
            this.refreshSlots();
          },
        });
    } else {
      this.appointmentService.createAppointment(payload).subscribe({
        next: (res) => {
          this.loading = false;
          this.cdr.markForCheck();
          this.submittedOk = true;
          this.formDraft.clear(DRAFT_KEY_CREATE);
          this.toast.success(res.message || APP_MESSAGES.APPOINTMENT_BOOKED);
          this.router.navigate([
            '/dashboard/appointments',
            res.data.appointment.appointmentId,
          ]);
        },
        error: (err) => {
          this.loading = false;
          this.cdr.markForCheck();
          this.toast.error(
            this.apiError.message(err, APP_MESSAGES.APPOINTMENT_BOOK_FAILED),
          );
          // Refresh slots in case a race produced the conflict
          this.refreshSlots();
        },
      });
    }
  }

  onCancel(): void {
    if (this.mode === 'edit' && this.editAppointmentId) {
      this.router.navigate(['/dashboard/appointments', this.editAppointmentId]);
    } else {
      this.router.navigate(['/dashboard/appointments']);
    }
  }
}
