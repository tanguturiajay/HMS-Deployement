import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardLayoutComponent } from '../../../shared/ui/dashboard-layout/dashboard-layout';
import { AvailabilitySlotsFormComponent } from '../../../shared/ui/availability-slots-form/availability-slots-form';
import { AdminService } from '../../../core/services/admin.service';
import { OwnerService } from '../../../core/services/owner.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiErrorHandlerService } from '../../../core/services/api-error-handler.service';
import { APP_MESSAGES } from '../../../core/constants/messages';
import { FormDraftService } from '../../../core/services/form-draft.service';
import { CanComponentDeactivate } from '../../../core/guards/unsaved-changes.guard';
import {
  Designation,
  Department,
  EmployeeProfile,
  CreateEmployeePayload,
  UpdateEmployeePayload,
  STAFF_DESIGNATIONS,
  DEPARTMENTS,
  DEPARTMENT_DESIGNATIONS,
  WEEK_DAYS,
  MEDICAL_DESIGNATIONS,
  SPECIALIZATION_DESIGNATIONS,
} from '../../../core/models/employee.model';
import {
  phoneValidator,
  notBlank,
  nameValidator,
  nonNegative,
  slotTimeOrder,
  slotsNoConflict,
  medicalRegistrationValidator,
  todayIsoDate,
} from '../../../core/validators/app-validators';

// Reusable employee form for create (staff/admin) and edit modes
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-create-employee',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DashboardLayoutComponent, AvailabilitySlotsFormComponent],
  templateUrl: './employees-create.html',
  styleUrl: './employees-create.css',
})
export class CreateEmployeeComponent implements OnInit, CanComponentDeactivate {
  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(AdminService);
  private readonly ownerService = inject(OwnerService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly apiError = inject(ApiErrorHandlerService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formDraft = inject(FormDraftService);

  mode: 'staff' | 'admin' | 'edit' | 'admin-edit' = 'staff';
  editEmployeeCode = '';
  form: FormGroup;
  loading = false;
  initialLoading = false;
  submittedOk = false;

  departments = DEPARTMENTS;
  weekDays = WEEK_DAYS;
  designations: Designation[] = [...STAFF_DESIGNATIONS];
  isOwner = false;
  isDoctor = false;
  showMedical = false;
  showSpecialization = false;
  // Joining date is locked in edit mode once it has passed
  joiningDateLocked = false;

  // Snapshot of the loaded form value (edit mode) for no-op detection
  private baseline = '';

  // Edit mode: true only when the form differs from the loaded values
  hasChanges(): boolean {
    return JSON.stringify(this.form.getRawValue()) !== this.baseline;
  }

  private captureBaseline(): void {
    this.baseline = JSON.stringify(this.form.getRawValue());
  }

  constructor() {
    this.form = this.fb.group({
      username: ['', [Validators.required, notBlank]],
      name: ['', [Validators.required, notBlank, nameValidator]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, phoneValidator]],
      department: ['', Validators.required],
      designation: ['', Validators.required],
      joiningDate: ['', Validators.required],
      qualification: ['', [Validators.required, notBlank]],
      medicalRegistrationNumber: [''],
      specialization: [''],
      consultationFee: [null, nonNegative],
      bookingCutoffDate: [''],
      availabilitySlots: this.fb.array([], { validators: slotsNoConflict }),
    });
  }

  get availabilitySlots(): FormArray {
    return this.form.get('availabilitySlots') as FormArray;
  }

  get draftKey(): string {
    return `draft:create-${this.mode}`;
  }

  // True for both employee edit and admin edit (load-then-update flows)
  get isEditMode(): boolean {
    return this.mode === 'edit' || this.mode === 'admin-edit';
  }

  // True for both admin create and admin edit (designation/department locked)
  get isAdminMode(): boolean {
    return this.mode === 'admin' || this.mode === 'admin-edit';
  }

  // List to return to after save/cancel
  get listRoute(): string {
    return this.isAdminMode ? '/dashboard/admins' : '/dashboard/employees';
  }

  get pageTitle(): string {
    if (this.mode === 'admin-edit') return 'Edit Admin';
    if (this.mode === 'edit') return 'Edit Employee';
    return this.mode === 'admin' ? 'Create Admin' : 'Create Employee';
  }

  get cardTitle(): string {
    if (this.mode === 'admin-edit') return 'Edit Administrator';
    if (this.mode === 'edit') return 'Edit Employee';
    return this.mode === 'admin' ? 'New Administrator' : 'New Employee';
  }

  ngOnInit(): void {
    this.mode =
      (this.route.snapshot.data['mode'] as
        | 'staff'
        | 'admin'
        | 'edit'
        | 'admin-edit') || 'staff';
    this.isOwner = this.authService.getDesignation() === 'OWNER';

    if (this.isEditMode) {
      this.editEmployeeCode = this.route.snapshot.paramMap.get('code') ?? '';
      this.loadForEdit();
      return;
    }

    if (this.mode === 'admin') {
      this.designations = ['ADMIN'];
      this.form.patchValue({ designation: 'ADMIN', department: 'Administration' });
    }

    const draft = this.formDraft.get(this.draftKey);
    if (draft) {
      const slots = Array.isArray(draft['availabilitySlots'])
        ? draft['availabilitySlots']
        : [];
      slots.forEach(() => this.addSlot());
      this.form.patchValue(draft);
      if (this.mode !== 'admin') {
        this.refreshDesignationsForDepartment(false);
      }
      this.onDesignationChange();
    }

    this.form.valueChanges.subscribe(() => {
      if (!this.submittedOk) {
        this.formDraft.save(this.draftKey, this.form.getRawValue());
      }
    });
  }

  private loadForEdit(): void {
    this.initialLoading = true;
    // Disable non-editable controls so their validators don't affect form validity
    this.form.get('username')?.disable();
    this.form.get('email')?.disable();
    this.form.get('medicalRegistrationNumber')?.disable();

    this.adminService.getEmployee(this.editEmployeeCode).subscribe({
      next: (res) => {
        this.populateEditForm(res.data.employee);
        this.initialLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.initialLoading = false;
        this.toast.error(APP_MESSAGES.LOAD_EMPLOYEE_FAILED);
        this.router.navigate([this.listRoute]);
      },
    });
  }

  private populateEditForm(emp: EmployeeProfile): void {
    this.form.patchValue({
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      department: emp.department,
      designation: emp.designation,
      joiningDate: emp.joiningDate ? emp.joiningDate.substring(0, 10) : '',
      qualification: (emp.qualification ?? []).join(', '),
      medicalRegistrationNumber: emp.medicalRegistrationNumber ?? '',
      specialization: emp.specialization ?? '',
      consultationFee: emp.consultationFee ?? null,
      bookingCutoffDate: emp.bookingCutoffDate ? emp.bookingCutoffDate.substring(0, 10) : '',
    });

    // Lock the joining date once reached, on or after the day itself (yyyy-mm-dd compares lexicographically)
    const joinIso = emp.joiningDate ? emp.joiningDate.substring(0, 10) : '';
    if (joinIso && joinIso <= todayIsoDate()) {
      this.joiningDateLocked = true;
      this.form.get('joiningDate')?.disable();
    }

    this.refreshDesignationsForDepartment(false);
    // Admin designation/department are fixed, so keep the locked select to ADMIN
    if (this.isAdminMode) {
      this.designations = ['ADMIN'];
    }
    // Sets isDoctor/showMedical/showSpecialization, validators, and clears slots
    this.onDesignationChange();

    if (this.isDoctor) {
      const slots = emp.availabilitySlots ?? [];
      this.availabilitySlots.clear();
      if (slots.length > 0) {
        slots.forEach((slot) => {
          this.availabilitySlots.push(
            this.fb.group(
              {
                day: [slot.day, Validators.required],
                startTime: [slot.startTime, Validators.required],
                endTime: [slot.endTime, Validators.required],
              },
              { validators: slotTimeOrder },
            ),
          );
        });
      } else {
        this.addSlot();
      }
    }

    // Snapshot the populated form so the Update button enables only on real changes
    this.captureBaseline();
  }

  addSlot(): void {
    this.availabilitySlots.push(
      this.fb.group(
        {
          day: ['MONDAY', Validators.required],
          startTime: ['09:00', Validators.required],
          endTime: ['17:00', Validators.required],
        },
        { validators: slotTimeOrder },
      ),
    );
  }

  removeSlot(i: number): void {
    // Keep at least one slot — availability is required
    if (this.availabilitySlots.length <= 1) {
      return;
    }
    this.availabilitySlots.removeAt(i);
  }

  onDepartmentChange(): void {
    this.refreshDesignationsForDepartment(true);
    this.onDesignationChange();
  }

  // Rebuilds the Designation options for the selected department (ADMIN only for OWNER)
  private refreshDesignationsForDepartment(autoFill: boolean): void {
    const dept = this.form.get('department')?.value as Department | '';

    if (!dept) {
      this.designations = [...STAFF_DESIGNATIONS];
      return;
    }

    let allowed: Designation[] = [
      ...(DEPARTMENT_DESIGNATIONS[dept] || STAFF_DESIGNATIONS),
    ];

    if (!this.isOwner) {
      allowed = allowed.filter((d) => d !== 'ADMIN');
    }

    if (allowed.length === 0) {
      allowed = [...STAFF_DESIGNATIONS];
    }

    this.designations = allowed;

    if (autoFill) {
      const current = this.form.get('designation')?.value as Designation;
      if (!current || !allowed.includes(current)) {
        this.form.patchValue({ designation: allowed[0] });
      }
    }
  }

  onDesignationChange(): void {
    const d = this.form.get('designation')?.value as Designation;
    this.isDoctor = d === 'DOCTOR';
    this.showMedical = MEDICAL_DESIGNATIONS.includes(d);
    this.showSpecialization = SPECIALIZATION_DESIGNATIONS.includes(d);

    const med = this.form.get('medicalRegistrationNumber');
    const spec = this.form.get('specialization');
    const fee = this.form.get('consultationFee');

    med?.setValidators(
      this.showMedical ? [Validators.required, medicalRegistrationValidator] : [],
    );
    spec?.setValidators(this.showSpecialization ? [Validators.required] : []);
    fee?.setValidators(
      this.isDoctor ? [Validators.required, nonNegative] : [nonNegative],
    );

    if (this.isDoctor && this.availabilitySlots.length === 0) {
      this.addSlot();
    }
    if (!this.isDoctor) {
      this.availabilitySlots.clear();
    }

    med?.updateValueAndValidity();
    spec?.updateValueAndValidity();
    fee?.updateValueAndValidity();
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.submittedOk;
  }

  // Builds the payload fields shared by create and update
  private buildCommonPayload(raw: Record<string, unknown>): UpdateEmployeePayload {
    const payload: UpdateEmployeePayload = {
      name: raw['name'] as string,
      phone: raw['phone'] as string,
      department: raw['department'] as Department,
      designation: raw['designation'] as Designation,
      joiningDate: raw['joiningDate'] as string,
      qualification: String(raw['qualification'])
        .split(',')
        .map((q: string) => q.trim())
        .filter((q: string) => q.length > 0),
    };

    if (this.showMedical && raw['medicalRegistrationNumber']) {
      payload.medicalRegistrationNumber = raw['medicalRegistrationNumber'] as string;
    }
    if (this.showSpecialization && raw['specialization']) {
      payload.specialization = raw['specialization'] as string;
    }
    if (this.isDoctor) {
      payload.consultationFee = Number(raw['consultationFee']);
      payload.availabilitySlots =
        raw['availabilitySlots'] as UpdateEmployeePayload['availabilitySlots'];
      // Empty value clears the cutoff (null), so bookings reopen
      payload.bookingCutoffDate = raw['bookingCutoffDate']
        ? (raw['bookingCutoffDate'] as string)
        : null;
    }

    return payload;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Please fix the highlighted fields.');
      return;
    }

    const raw = this.form.getRawValue() as Record<string, unknown>;
    const commonPayload = this.buildCommonPayload(raw);

    if (this.isEditMode) {
      const isAdminEdit = this.mode === 'admin-edit';
      const update$ = isAdminEdit
        ? this.ownerService.updateAdmin(this.editEmployeeCode, commonPayload)
        : this.adminService.updateEmployee(this.editEmployeeCode, commonPayload);

      this.loading = true;
      update$.subscribe({
        next: (res) => {
          this.loading = false;
          this.cdr.markForCheck();
          this.submittedOk = true;
          this.toast.success(
            res.message ||
              (isAdminEdit ? APP_MESSAGES.ADMIN_UPDATED : APP_MESSAGES.EMPLOYEE_UPDATED),
          );
          this.router.navigate([this.listRoute]);
        },
        error: (err) => {
          this.loading = false;
          this.cdr.markForCheck();
          this.toast.error(
            this.apiError.message(
              err,
              isAdminEdit ? APP_MESSAGES.ADMIN_UPDATE_FAILED : APP_MESSAGES.EMPLOYEE_UPDATE_FAILED,
            ),
          );
        },
      });
      return;
    }

    const creatingAdmin = commonPayload.designation === 'ADMIN';
    const createPayload: CreateEmployeePayload = {
      username: raw['username'] as string,
      email: raw['email'] as string,
      name: commonPayload.name as string,
      phone: commonPayload.phone as string,
      department: creatingAdmin ? 'Administration' : commonPayload.department as Department,
      designation: commonPayload.designation as Designation,
      joiningDate: commonPayload.joiningDate as string,
      qualification: commonPayload.qualification as string[],
      medicalRegistrationNumber: commonPayload.medicalRegistrationNumber,
      specialization: commonPayload.specialization,
      consultationFee: commonPayload.consultationFee,
      availabilitySlots: commonPayload.availabilitySlots,
    };

    this.loading = true;
    const call = creatingAdmin
      ? this.ownerService.createAdmin(createPayload)
      : this.adminService.createEmployee(createPayload);

    call.subscribe({
      next: (res) => {
        this.loading = false;
        this.cdr.markForCheck();
        this.submittedOk = true;
        this.formDraft.clear(this.draftKey);
        this.toast.success(
          res.message ||
            (creatingAdmin ? APP_MESSAGES.ADMIN_CREATED : APP_MESSAGES.EMPLOYEE_CREATED),
        );
        this.router.navigate([
          creatingAdmin ? '/dashboard/admins' : '/dashboard/employees',
        ]);
      },
      error: (err) => {
        this.loading = false;
        this.cdr.markForCheck();
        this.toast.error(
          this.apiError.message(
            err,
            creatingAdmin ? APP_MESSAGES.ADMIN_CREATE_FAILED : APP_MESSAGES.EMPLOYEE_CREATE_FAILED,
          ),
        );
      },
    });
  }

  onCancel(): void {
    this.router.navigate([this.listRoute]);
  }
}
