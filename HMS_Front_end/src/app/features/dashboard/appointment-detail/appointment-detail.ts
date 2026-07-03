import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DashboardLayoutComponent } from '../../../shared/ui/dashboard-layout/dashboard-layout';
import { MedicalRecordFormDialogComponent } from '../../../shared/ui/medical-record-form-dialog/medical-record-form-dialog';
import { MedicalRecordDetailDialogComponent } from '../../../shared/ui/medical-record-detail-dialog/medical-record-detail-dialog';
import { AppointmentService } from '../../../core/services/appointment.service';
import { MedicalRecordService } from '../../../core/services/medical-record.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiErrorHandlerService } from '../../../core/services/api-error-handler.service';
import { APP_MESSAGES } from '../../../core/constants/messages';
import { ConfirmModalService } from '../../../core/services/confirm-modal.service';
import { Appointment } from '../../../core/models/appointment.model';
import { MedicalRecord } from '../../../core/models/medical-record.model';

// Appointment detail where reception edits or cancels BOOKED and any staff or doctor can mark unattended or generate records
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-appointment-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    DashboardLayoutComponent,
    DatePipe,
    MedicalRecordFormDialogComponent,
    MedicalRecordDetailDialogComponent,
  ],
  templateUrl: './appointment-detail.html',
  styleUrl: './appointment-detail.css',
})
export class AppointmentDetailComponent implements OnInit {
  private readonly appointmentService = inject(AppointmentService);
  private readonly medicalRecordService = inject(MedicalRecordService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly apiError = inject(ApiErrorHandlerService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  appointment = signal<Appointment | null>(null);
  medicalRecord = signal<MedicalRecord | null>(null);
  loading = signal(true);

  // Dialog visibility
  showForm = signal(false);
  showDetail = signal(false);

  // Action in flight; header buttons disable while set
  busyAction = signal<'cancel' | 'unattended' | null>(null);
  busy = computed(() => this.busyAction() !== null);

  isDoctor = computed(() => this.authService.getDesignation() === 'DOCTOR');
  hasReceptionAccess = computed(() => {
    const d = this.authService.getDesignation();
    return d === 'OWNER' || d === 'ADMIN' || d === 'RECEPTIONIST';
  });

  // A doctor may manage only their own appointments
  isOwnDoctorAppointment = computed(
    () =>
      this.isDoctor() &&
      this.appointment()?.doctorEmployeeId ===
        this.authService.getCurrentUser()?.employeeCode,
  );

  // Reception staff and the assigned doctor can edit/cancel — only before the slot starts
  canEdit = computed(
    () =>
      (this.hasReceptionAccess() || this.isOwnDoctorAppointment()) &&
      this.appointment()?.status === 'BOOKED' &&
      !this.startTimePassed(),
  );

  canCancel = computed(
    () =>
      (this.hasReceptionAccess() || this.isOwnDoctorAppointment()) &&
      this.appointment()?.status === 'BOOKED' &&
      !this.startTimePassed(),
  );

  hasRecord = computed(() => this.medicalRecord() !== null);

  // Mark unattended is available to any role for a BOOKED slot with no record once the slot has started
  canMarkUnattended = computed(
    () =>
      this.appointment()?.status === 'BOOKED' &&
      !this.hasRecord() &&
      this.startTimePassed(),
  );

  // Generate record: BOOKED, no record yet, and the start time has passed
  canGenerateRecord = computed(
    () =>
      this.appointment()?.status === 'BOOKED' &&
      !this.hasRecord() &&
      this.startTimePassed(),
  );

  // Existing DRAFT can be edited; FINALIZED can be viewed
  canEditRecord = computed(
    () => this.hasRecord() && this.medicalRecord()?.status === 'DRAFT',
  );
  canViewRecord = computed(
    () => this.hasRecord() && this.medicalRecord()?.status === 'FINALIZED',
  );

  // Completable only once the scheduled start (day + slot start) has passed (mirrors the backend guard)
  startTimePassed = computed(() => this.slotEdgePassed(0));

  // End of the slot; gates when "Mark Unattended" becomes actionable
  endTimePassed = computed(() => this.slotEdgePassed(1));

  // Whether the slot start (index 0) or end (index 1) has passed for the appointment day
  private slotEdgePassed(edge: 0 | 1): boolean {
    const a = this.appointment();
    if (!a) return false;
    const time = (a.timeSlot || '').split('-')[edge];
    const [h, m] = (time || '').split(':').map(Number);
    const scheduled = new Date(a.appointmentDate);
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      scheduled.setHours(h, m, 0, 0);
    }
    return scheduled.getTime() <= Date.now();
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('appointmentId');
    if (!id) {
      this.router.navigate(['/dashboard/appointments']);
      return;
    }
    this.load(id);
  }

  private load(id: string): void {
    this.loading.set(true);
    this.appointmentService.getAppointmentById(id).subscribe({
      next: (res) => {
        this.appointment.set(res.data.appointment);
        this.loading.set(false);
        this.loadRecord(id);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(APP_MESSAGES.LOAD_APPOINTMENT_FAILED);
        this.router.navigate(['/dashboard/appointments']);
      },
    });
  }

  private loadRecord(id: string): void {
    this.medicalRecordService.getByAppointment(id).subscribe({
      next: (res) => this.medicalRecord.set(res.data.medicalRecord),
      error: () => this.medicalRecord.set(null),
    });
  }

  editAppointment(): void {
    const a = this.appointment();
    if (!a) return;
    this.router.navigate(['/dashboard/appointments', a.appointmentId, 'edit']);
  }

  async cancel(): Promise<void> {
    const a = this.appointment();
    if (!a) return;
    const result = await this.confirmModal.open({
      title: 'Cancel Appointment',
      message: `Cancel appointment ${a.appointmentId}? The slot will become available again.`,
      confirmText: 'Cancel It',
      cancelText: 'Keep',
      type: 'danger',
      showInput: true,
      inputLabel: 'Cancellation Reason',
      inputPlaceholder: 'Reason for cancelling this appointment',
    });
    if (!result.confirmed) return;

    const reason = (result.inputValue ?? '').trim();
    this.busyAction.set('cancel');
    this.appointmentService.cancelAppointment(a.appointmentId, reason).subscribe({
      next: (res) => {
        this.busyAction.set(null);
        this.toast.success(res.message || APP_MESSAGES.APPOINTMENT_CANCELLED);
        this.load(a.appointmentId);
      },
      error: (err) => {
        this.busyAction.set(null);
        this.toast.error(this.apiError.message(err, APP_MESSAGES.APPOINTMENT_CANCEL_FAILED));
      },
    });
  }

  async markUnattended(): Promise<void> {
    const a = this.appointment();
    if (!a) return;
    const result = await this.confirmModal.open({
      title: 'Mark as Unattended',
      message: `Mark appointment ${a.appointmentId} as unattended? The patient will be notified by email.`,
      confirmText: 'Mark Unattended',
      cancelText: 'Cancel',
      type: 'warning',
    });
    if (!result.confirmed) return;

    this.busyAction.set('unattended');
    this.appointmentService.markUnattended(a.appointmentId).subscribe({
      next: (res) => {
        this.busyAction.set(null);
        this.toast.success(res.message || 'Appointment marked as unattended.');
        this.load(a.appointmentId);
      },
      error: (err) => {
        this.busyAction.set(null);
        this.toast.error(this.apiError.message(err, 'Failed to mark appointment as unattended.'));
      },
    });
  }

  openCreateRecord(): void {
    this.showForm.set(true);
  }

  openEditRecord(): void {
    this.showForm.set(true);
  }

  openViewRecord(): void {
    this.showDetail.set(true);
  }

  onRecordSaved(record: MedicalRecord): void {
    this.medicalRecord.set(record);
    this.showForm.set(false);
    // Finalizing completes the appointment; reload to reflect status
    const a = this.appointment();
    if (a) {
      this.load(a.appointmentId);
    }
  }

  onFormClosed(): void {
    this.showForm.set(false);
  }

  onDetailClosed(): void {
    this.showDetail.set(false);
  }

  onRecordDeleted(): void {
    this.showDetail.set(false);
    this.medicalRecord.set(null);
    const a = this.appointment();
    if (a) {
      this.load(a.appointmentId);
    }
  }
}
