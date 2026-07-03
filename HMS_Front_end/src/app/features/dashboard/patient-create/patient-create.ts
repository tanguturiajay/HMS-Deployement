import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { DashboardLayoutComponent } from '../../../shared/ui/dashboard-layout/dashboard-layout';
import { PatientService } from '../../../core/services/patient.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiErrorHandlerService } from '../../../core/services/api-error-handler.service';
import { APP_MESSAGES } from '../../../core/constants/messages';
import { FormDraftService } from '../../../core/services/form-draft.service';
import { CanComponentDeactivate } from '../../../core/guards/unsaved-changes.guard';
import { GENDERS } from '../../../core/models/patient.model';
import {
  phoneValidator,
  noFutureDate,
  notBlank,
  nameValidator,
  todayIsoDate,
} from '../../../core/validators/app-validators';

const DRAFT_KEY = 'draft:patient-create';

// Patient creation form (OWNER/ADMIN/RECEPTIONIST); DOB cannot be a future date
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-patient-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DashboardLayoutComponent],
  templateUrl: './patient-create.html',
  styleUrl: './patient-create.css',
})
export class PatientCreateComponent
  implements OnInit, CanComponentDeactivate
{
  private readonly fb = inject(FormBuilder);
  private readonly patientService = inject(PatientService);
  private readonly toast = inject(ToastService);
  private readonly apiError = inject(ApiErrorHandlerService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly formDraft = inject(FormDraftService);
  private readonly router = inject(Router);

  genders = GENDERS;
  loading = false;
  submittedOk = false;
  todayIso = todayIsoDate();

  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, notBlank, nameValidator]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, phoneValidator]],
    gender: ['', Validators.required],
    dob: ['', [Validators.required, noFutureDate]],
    status: ['ACTIVE', Validators.required],
    address: this.fb.group({
      houseName: ['', [Validators.required, notBlank]],
      houseNumber: ['', [Validators.required, notBlank]],
      city: ['', [Validators.required, notBlank]],
      postCode: ['', [Validators.required, notBlank]],
    }),
    emergencyContact: this.fb.group({
      contactName: ['', [Validators.required, notBlank, nameValidator]],
      relationship: ['', [Validators.required, notBlank]],
      contactNumber: ['', [Validators.required, phoneValidator]],
    }),
  });

  ngOnInit(): void {
    const draft = this.formDraft.get(DRAFT_KEY);
    if (draft) {
      this.form.patchValue(draft);
    }
    this.form.valueChanges.subscribe(() => {
      if (!this.submittedOk) {
        this.formDraft.save(DRAFT_KEY, this.form.getRawValue());
      }
    });
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.submittedOk;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Please fix the highlighted fields.');
      return;
    }

    this.loading = true;
    const raw = this.form.getRawValue();

    this.patientService.createPatient(raw).subscribe({
      next: (res) => {
        this.loading = false;
        this.cdr.markForCheck();
        this.submittedOk = true;
        this.formDraft.clear(DRAFT_KEY);
        this.toast.success(res.message || APP_MESSAGES.PATIENT_CREATED);
        // Navigate to the new patient's detail page if UHID was returned
        if (res.data.patient?.UHID) {
          this.router.navigate(['/dashboard/patients', res.data.patient.UHID]);
        } else {
          this.router.navigate(['/dashboard/patients']);
        }
      },
      error: (err) => {
        this.loading = false;
        this.cdr.markForCheck();
        this.toast.error(this.apiError.message(err, APP_MESSAGES.PATIENT_CREATE_FAILED));
      },
    });
  }

  onCancel(): void {
    this.router.navigate(['/dashboard/patients']);
  }

  // Template helpers for nested form access
  addressCtrl(name: string) {
    return this.form.get(['address', name]);
  }
  emergencyCtrl(name: string) {
    return this.form.get(['emergencyContact', name]);
  }
}
