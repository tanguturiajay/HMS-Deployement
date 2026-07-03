import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiErrorHandlerService } from '../../../core/services/api-error-handler.service';
import { APP_MESSAGES } from '../../../core/constants/messages';
import { PasswordInputComponent } from '../../../shared/ui/password-input/password-input';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PasswordInputComponent],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly apiError = inject(ApiErrorHandlerService);
  private readonly cdr = inject(ChangeDetectorRef);

  loginForm: FormGroup;
  loading = false;
  errorMessage = '';

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (response) => {
        this.loading = false;
        this.cdr.markForCheck();
        const user = response?.data?.user;
        if (response?.data?.accessToken && user) {
          this.toast.success(
            `Welcome back, ${user.profile?.name || user.username}!`,
          );

          // First-login users must change their temporary password first
          if (user.mustChangePassword) {
            this.router.navigate(['/change-password']);
            return;
          }

          // Honor a returnUrl if present, else go to the dashboard overview
          const returnUrl =
            this.route.snapshot.queryParamMap.get('returnUrl') ||
            '/dashboard/overview';
          this.router.navigateByUrl(returnUrl);
        }
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = this.apiError.message(error, APP_MESSAGES.LOGIN_FAILED);
        this.toast.error(this.errorMessage);
        this.cdr.markForCheck();
      },
    });
  }
}