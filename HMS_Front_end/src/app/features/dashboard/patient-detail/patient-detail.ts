import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DashboardLayoutComponent } from '../../../shared/ui/dashboard-layout/dashboard-layout';
import { PatientService } from '../../../core/services/patient.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiErrorHandlerService } from '../../../core/services/api-error-handler.service';
import { APP_MESSAGES } from '../../../core/constants/messages';
import { FormDraftService } from '../../../core/services/form-draft.service';
import { ConfirmModalService } from '../../../core/services/confirm-modal.service';
import { CanComponentDeactivate } from '../../../core/guards/unsaved-changes.guard';
import {
  GENDERS,
  Patient,
  PATIENT_STATUSES,
} from '../../../core/models/patient.model';
import {
  phoneValidator,
  noFutureDate,
  notBlank,
  nameValidator,
  todayIsoDate,
} from '../../../core/validators/app-validators';

// Patient detail; read-only by default, Edit reveals the create form pre-filled
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-patient-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    DashboardLayoutComponent,
    DatePipe,
  ],
  templateUrl: './patient-detail.html',
  styleUrl: './patient-detail.css',
})
export class PatientDetailComponent
  implements OnInit, CanComponentDeactivate
{
  private readonly fb = inject(FormBuilder);
  private readonly patientService = inject(PatientService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly apiError = inject(ApiErrorHandlerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formDraft = inject(FormDraftService);
  private readonly confirmModal = inject(ConfirmModalService);

  patient = signal<Patient | null>(null);
  loading = signal(true);
  saving = signal(false);
  editing = signal(false);
  deleting = signal(false);
  submittedOk = false;

  // Only admin/owner may delete a patient
  isPrivileged = computed(() => {
    const d = this.authService.getDesignation();
    return d === 'OWNER' || d === 'ADMIN';
  });

  genders = GENDERS;
  statuses = PATIENT_STATUSES;
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

  get draftKey(): string {
    const uhid = this.route.snapshot.paramMap.get('UHID') || 'unknown';
    return `draft:patient-edit:${uhid}`;
  }

  ngOnInit(): void {
    const uhid = this.route.snapshot.paramMap.get('UHID');
    if (!uhid) {
      this.toast.error('Missing patient UHID.');
      this.router.navigate(['/dashboard/patients']);
      return;
    }

    this.patientService.getPatientByUHID(uhid).subscribe({
      next: (res) => {
        this.patient.set(res.data.patient);
        this.applyToForm(res.data.patient);
        // Restore any in-progress edits
        const draft = this.formDraft.get(this.draftKey);
        if (draft) {
          this.form.patchValue(draft);
          this.editing.set(true);
        }
        // Opened straight into edit mode from the patient list modal
        if (this.route.snapshot.queryParamMap.get('edit') === '1') {
          this.editing.set(true);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(APP_MESSAGES.LOAD_PATIENT_FAILED);
        this.router.navigate(['/dashboard/patients']);
      },
    });

    this.form.valueChanges.subscribe(() => {
      if (this.editing() && !this.submittedOk) {
        this.formDraft.save(this.draftKey, this.form.getRawValue());
      }
    });
  }

  // Snapshot of the loaded form value for no-op detection
  private baseline = '';

  // True only when the form differs from the loaded patient values
  hasChanges(): boolean {
    return JSON.stringify(this.form.getRawValue()) !== this.baseline;
  }

  private applyToForm(p: Patient): void {
    this.form.patchValue({
      name: p.name,
      email: p.email,
      phone: p.phone,
      gender: p.gender,
      dob: p.dob ? p.dob.substring(0, 10) : '',
      status: p.status,
      address: p.address,
      emergencyContact: p.emergencyContact,
    });
    this.form.markAsPristine();
    this.baseline = JSON.stringify(this.form.getRawValue());
  }

  startEdit(): void {
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
    this.formDraft.clear(this.draftKey);
    const p = this.patient();
    if (p) {
      this.applyToForm(p);
    }
  }

  hasUnsavedChanges(): boolean {
    return this.editing() && this.form.dirty && !this.submittedOk;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Please fix the highlighted fields.');
      return;
    }

    const p = this.patient();
    if (!p) {
      return;
    }

    this.saving.set(true);
    this.patientService.updatePatient(p.UHID, this.form.getRawValue()).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.submittedOk = true;
        this.formDraft.clear(this.draftKey);
        this.patient.set(res.data.patient);
        this.applyToForm(res.data.patient);
        this.editing.set(false);
        this.toast.success(res.message || APP_MESSAGES.PATIENT_UPDATED);
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(this.apiError.message(err, APP_MESSAGES.PATIENT_UPDATE_FAILED));
      },
    });
  }

  async deletePatient(): Promise<void> {
    const p = this.patient();
    if (!p) {
      return;
    }

    const result = await this.confirmModal.open({
      title: 'Delete Patient',
      message: `Are you sure you want to delete ${p.name} (${p.UHID})?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!result.confirmed) {
      return;
    }

    this.deleting.set(true);
    this.patientService.deletePatient(p.UHID).subscribe({
      next: (res) => {
        this.deleting.set(false);
        this.formDraft.clear(this.draftKey);
        this.submittedOk = true;
        this.toast.success(res.message || APP_MESSAGES.PATIENT_DELETED);
        this.router.navigate(['/dashboard/patients']);
      },
      error: (err) => {
        this.deleting.set(false);
        this.toast.error(this.apiError.message(err, APP_MESSAGES.PATIENT_DELETE_FAILED));
      },
    });
  }

  addressCtrl(name: string) {
    return this.form.get(['address', name]);
  }
  emergencyCtrl(name: string) {
    return this.form.get(['emergencyContact', name]);
  }
}
