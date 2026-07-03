import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormArray,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiErrorHandlerService } from '../../../core/services/api-error-handler.service';
import { APP_MESSAGES } from '../../../core/constants/messages';
import { FormDraftService } from '../../../core/services/form-draft.service';
import {
  STAFF_DESIGNATIONS,
  DEPARTMENTS,
  DEPARTMENT_DESIGNATIONS,
  WEEK_DAYS,
  MEDICAL_DESIGNATIONS,
  SPECIALIZATION_DESIGNATIONS,
  Designation,
  Department,
} from '../../../core/models/employee.model';
import { CanComponentDeactivate } from '../../../core/guards/unsaved-changes.guard';
import {
  phoneValidator,
  passwordComplexity,
  passwordMatchValidator,
  nonNegative,
  slotTimeOrder,
  slotsNoConflict,
  notBlank,
  nameValidator,
  medicalRegistrationValidator,
} from '../../../core/validators/app-validators';
import { PasswordInputComponent } from '../../../shared/ui/password-input/password-input';
import { AvailabilitySlotsFormComponent } from '../../../shared/ui/availability-slots-form/availability-slots-form';

const DRAFT_KEY = 'draft:self-register';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PasswordInputComponent, AvailabilitySlotsFormComponent],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class RegisterComponent implements OnInit, CanComponentDeactivate {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly apiError = inject(ApiErrorHandlerService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly formDraft = inject(FormDraftService);

  registerForm: FormGroup;
  loading = false;
  submitted = false;
  // Gates password validation messages until the submit button is clicked
  attempted = false;

  designations: Designation[] = [...STAFF_DESIGNATIONS];
  departments = DEPARTMENTS;
  weekDays = WEEK_DAYS;

  showMedicalFields = false;
  showSpecialization = false;
  isDoctor = false;

  constructor() {
    this.registerForm = this.fb.group(
      {
        username: ['', Validators.required],
        name: ['', [Validators.required, notBlank, nameValidator]],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', [Validators.required, phoneValidator]],
        department: ['', Validators.required],
        designation: ['', Validators.required],
        joiningDate: ['', Validators.required],
        qualification: ['', Validators.required],
        medicalRegistrationNumber: [''],
        specialization: [''],
        consultationFee: [null, nonNegative],
        availabilitySlots: this.fb.array([], { validators: slotsNoConflict }),
        password: ['', [Validators.required, Validators.minLength(8), passwordComplexity]],
        confirmPassword: ['', Validators.required],
      },
      { validators: passwordMatchValidator('password', 'confirmPassword') },
    );
  }

  ngOnInit(): void {
    // Restore a saved draft (password fields are never stored)
    const draft = this.formDraft.get(DRAFT_KEY);
    if (draft) {
      // availabilitySlots is a FormArray; rebuild it before patching
      const slots = Array.isArray(draft['availabilitySlots'])
        ? draft['availabilitySlots']
        : [];
      slots.forEach(() => this.addSlot());
      this.registerForm.patchValue(draft);
      // Rebuild the designation list and conditional fields for the restored values
      this.refreshDesignationsForDepartment(false);
      this.onDesignationChange();
    }

    // Auto-save on every change (sanitized of password fields)
    this.registerForm.valueChanges.subscribe(() => {
      if (!this.submitted) {
        this.formDraft.save(DRAFT_KEY, this.registerForm.getRawValue());
      }
    });
  }

  get availabilitySlots(): FormArray {
    return this.registerForm.get('availabilitySlots') as FormArray;
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

  removeSlot(index: number): void {
    // Keep at least one slot — availability is required
    if (this.availabilitySlots.length <= 1) {
      return;
    }
    this.availabilitySlots.removeAt(index);
  }

  // Narrows the Designation list to the chosen department and auto-fills a default
  onDepartmentChange(): void {
    this.refreshDesignationsForDepartment(true);
    this.onDesignationChange();
  }

  // Rebuilds the Designation options for the selected department (ADMIN always excluded)
  private refreshDesignationsForDepartment(autoFill: boolean): void {
    const dept = this.registerForm.get('department')?.value as Department | '';

    if (!dept) {
      this.designations = [...STAFF_DESIGNATIONS];
      return;
    }

    // Exclude ADMIN — never self-registerable
    let allowed: Designation[] = [
      ...(DEPARTMENT_DESIGNATIONS[dept] || STAFF_DESIGNATIONS),
    ].filter((d) => d !== 'ADMIN');

    // Fallback so the dropdown is never empty (e.g. Administration)
    if (allowed.length === 0) {
      allowed = [...STAFF_DESIGNATIONS];
    }

    this.designations = allowed;

    if (autoFill) {
      const current = this.registerForm.get('designation')?.value as Designation;
      if (!current || !allowed.includes(current)) {
        this.registerForm.patchValue({ designation: allowed[0] });
      }
    }
  }

  onDesignationChange(): void {
    const designation = this.registerForm.get('designation')
      ?.value as Designation;

    this.isDoctor = designation === 'DOCTOR';
    this.showMedicalFields = MEDICAL_DESIGNATIONS.includes(designation);
    this.showSpecialization =
      SPECIALIZATION_DESIGNATIONS.includes(designation);

    // Apply/clear conditional validators
    const medReg = this.registerForm.get('medicalRegistrationNumber');
    const spec = this.registerForm.get('specialization');
    const fee = this.registerForm.get('consultationFee');

    medReg?.setValidators(
      this.showMedicalFields
        ? [Validators.required, medicalRegistrationValidator]
        : [],
    );
    spec?.setValidators(
      this.showSpecialization ? [Validators.required] : [],
    );
    fee?.setValidators(this.isDoctor ? [Validators.required] : []);

    // Doctors need at least one availability slot
    if (this.isDoctor && this.availabilitySlots.length === 0) {
      this.addSlot();
    }
    if (!this.isDoctor) {
      this.availabilitySlots.clear();
    }

    medReg?.updateValueAndValidity();
    spec?.updateValueAndValidity();
    fee?.updateValueAndValidity();
  }

  hasUnsavedChanges(): boolean {
    return this.registerForm.dirty && !this.submitted;
  }

  onSubmit(): void {
    this.attempted = true;

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.toast.warning('Please fix the highlighted fields.');
      return;
    }

    this.loading = true;

    const raw = this.registerForm.getRawValue();

    // Build the backend payload, omitting empty optional fields
    const payload: any = {
      username: raw.username,
      name: raw.name,
      email: raw.email,
      phone: raw.phone,
      department: raw.department,
      designation: raw.designation,
      joiningDate: raw.joiningDate,
      qualification: this.toQualificationArray(raw.qualification),
      password: raw.password,
    };

    if (this.showMedicalFields && raw.medicalRegistrationNumber) {
      payload.medicalRegistrationNumber = raw.medicalRegistrationNumber;
    }
    if (this.showSpecialization && raw.specialization) {
      payload.specialization = raw.specialization;
    }
    if (this.isDoctor) {
      payload.consultationFee = Number(raw.consultationFee);
      payload.availabilitySlots = raw.availabilitySlots;
    }

    this.authService.selfRegister(payload).subscribe({
      next: (response) => {
        this.loading = false;
        this.cdr.markForCheck();
        this.submitted = true;
        this.formDraft.clear(DRAFT_KEY);
        this.toast.success(
          response?.message || APP_MESSAGES.REGISTRATION_SUBMITTED,
        );
        setTimeout(() => this.router.navigate(['/login']), 2500);
      },
      error: (error) => {
        this.loading = false;
        this.cdr.markForCheck();
        this.toast.error(
          this.apiError.message(error, APP_MESSAGES.REGISTRATION_FAILED),
        );
      },
    });
  }

  // Accepts comma-separated text and converts to a trimmed string array
  private toQualificationArray(value: string | string[]): string[] {
    if (Array.isArray(value)) {
      return value;
    }
    return String(value || '')
      .split(',')
      .map((q) => q.trim())
      .filter((q) => q.length > 0);
  }
}