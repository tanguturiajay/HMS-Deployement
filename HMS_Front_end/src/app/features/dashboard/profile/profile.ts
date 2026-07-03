import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { DashboardLayoutComponent } from '../../../shared/ui/dashboard-layout/dashboard-layout';
import { SortAvailabilitySlotsPipe } from '../../../shared/pipes/sort-availability-slots.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiErrorHandlerService } from '../../../core/services/api-error-handler.service';
import { APP_MESSAGES } from '../../../core/constants/messages';
import { FormDraftService } from '../../../core/services/form-draft.service';
import {
  phoneValidator,
  notBlank,
} from '../../../core/validators/app-validators';
import { CanComponentDeactivate } from '../../../core/guards/unsaved-changes.guard';
import { EmployeeProfile } from '../../../core/models/employee.model';

const DRAFT_KEY = 'draft:profile';

// Profile page; edits to phone/qualification open a ProfileChangeRequest for approval
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DashboardLayoutComponent,
    SortAvailabilitySlotsPipe,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class ProfileComponent implements OnInit, CanComponentDeactivate {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly employeeService = inject(EmployeeService);
  private readonly toast = inject(ToastService);
  private readonly apiError = inject(ApiErrorHandlerService);
  private readonly formDraft = inject(FormDraftService);
  private readonly router = inject(Router);

  profile = signal<EmployeeProfile | null>(null);
  loading = signal(true);
  saving = signal(false);
  submittedOk = false;

  // OWNER and ADMIN update their profile directly; staff go through approval
  isPrivileged = computed(() => this.authService.isSuperUser());

  profileForm: FormGroup;
  attempted = false;

  constructor() {
    this.profileForm = this.fb.group({
      phone: ['', [Validators.required, phoneValidator]],
      qualification: ['', [Validators.required, notBlank]],
    });
  }

  ngOnInit(): void {
    // Pre-fill from the cached user; refresh from server for the latest values
    const cached = this.authService.getCurrentUser()?.profile;
    if (cached) {
      this.profile.set(cached);
      this.applyToForm(cached);
    }

    this.employeeService.getMe().subscribe({
      next: (res) => {
        this.profile.set(res.data.user.profile);
        this.applyToForm(res.data.user.profile);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        if (!cached) {
          this.toast.error(APP_MESSAGES.LOAD_PROFILE_FAILED);
        }
      },
    });

    // Restore in-progress edits (passwords would be filtered, but there are none)
    const draft = this.formDraft.get(DRAFT_KEY);
    if (draft) {
      this.profileForm.patchValue(draft);
    }
    this.profileForm.valueChanges.subscribe(() => {
      if (!this.submittedOk) {
        this.formDraft.save(DRAFT_KEY, this.profileForm.getRawValue());
      }
    });
  }

  // Snapshot of the loaded form value for no-op detection
  private baseline = '';

  // True only when the form differs from the loaded profile values
  hasChanges(): boolean {
    return JSON.stringify(this.profileForm.getRawValue()) !== this.baseline;
  }

  private applyToForm(p: EmployeeProfile): void {
    // Only populate if the user hasn't already typed something (no draft)
    if (this.profileForm.dirty) {
      return;
    }
    this.profileForm.patchValue({
      phone: p.phone ?? '',
      qualification: (p.qualification ?? []).join(', '),
    });
    this.profileForm.markAsPristine();
    this.baseline = JSON.stringify(this.profileForm.getRawValue());
  }

  hasUnsavedChanges(): boolean {
    return this.profileForm.dirty && !this.submittedOk;
  }

  onSubmit(): void {
    this.attempted = true;
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.toast.warning('Please fix the highlighted fields.');
      return;
    }

    const raw = this.profileForm.getRawValue();
    const payload = {
      phone: raw.phone,
      qualification: String(raw.qualification)
        .split(',')
        .map((q: string) => q.trim())
        .filter((q: string) => q.length > 0),
    };

    this.saving.set(true);
    this.employeeService.profileUpdate(payload).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.submittedOk = true;
        this.formDraft.clear(DRAFT_KEY);
        this.toast.success(
          res.message ||
            (this.isPrivileged()
              ? 'Profile updated successfully.'
              : 'Profile change request submitted for admin approval.'),
        );
        this.profileForm.markAsPristine();
        this.baseline = JSON.stringify(this.profileForm.getRawValue());

        // Owner/admin changes apply immediately, so refresh the displayed profile
        if (this.isPrivileged()) {
          this.employeeService.getMe().subscribe({
            next: (r) => this.profile.set(r.data.user.profile),
          });
          this.authService.refreshCurrentUser().subscribe({
            next: () => {},
            error: () => {},
          });
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(
          this.apiError.message(err, APP_MESSAGES.PROFILE_UPDATE_FAILED),
        );
      },
    });
  }

  // Voluntary password-change navigation
  goChangePassword(): void {
    this.router.navigate(['/change-password']);
  }
}