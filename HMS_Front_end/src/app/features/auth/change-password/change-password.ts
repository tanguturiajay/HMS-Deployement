import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiErrorHandlerService } from '../../../core/services/api-error-handler.service';
import { APP_MESSAGES } from '../../../core/constants/messages';
import {
  passwordComplexity,
  passwordMatchValidator,
  notSameAs,
} from '../../../core/validators/app-validators';
import { PasswordInputComponent } from '../../../shared/ui/password-input/password-input';

// Change-password screen with forced (first-login) and voluntary modes
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PasswordInputComponent],
  templateUrl: './change-password.html',
  styleUrl: './change-password.css',
})
export class ChangePasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly apiError = inject(ApiErrorHandlerService);
  private readonly cdr = inject(ChangeDetectorRef);

  changeForm: FormGroup;
  loading = false;
  forced = false;
  submitted = false;

  constructor() {
    this.changeForm = this.fb.group(
      {
        currentPassword: ['', Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(8), passwordComplexity]],
        confirmPassword: ['', Validators.required],
      },
      {
        validators: [
          passwordMatchValidator('newPassword', 'confirmPassword'),
          notSameAs('newPassword', 'currentPassword'),
        ],
      },
    );
  }

  ngOnInit(): void {
    this.forced = this.authService.isPasswordChangeRequired();
  }

  onSubmit(): void {
    this.submitted = true;

    if (this.changeForm.invalid) {
      this.changeForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const { currentPassword, newPassword, confirmPassword } =
      this.changeForm.value;

    this.authService
      .changePassword(currentPassword, newPassword, confirmPassword)
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.cdr.markForCheck();
          this.toast.success(
            response?.message || APP_MESSAGES.PASSWORD_CHANGED,
          );
          // Changing the password invalidates every server session so the user returns to login to sign in again
          this.authService.forceClearSession();
        },
        error: (error) => {
          this.loading = false;
          this.cdr.markForCheck();
          this.toast.error(
            this.apiError.message(error, APP_MESSAGES.PASSWORD_CHANGE_FAILED),
          );
        },
      });
  }

  onCancel(): void {
    if (this.forced) {
      return;
    }
    this.router.navigate(['/dashboard/overview']);
  }
}