import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { NavbarComponent } from './shared/ui/navbar/navbar';
import { ToastComponent } from './shared/ui/toast/toast';
import { ConfirmModalComponent } from './shared/ui/confirm-modal/confirm-modal';

// Root shell; shows the public navbar only on public routes
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    NavbarComponent,
    ToastComponent,
    ConfirmModalComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent {
  private readonly router = inject(Router);

  // Routes that should NOT render the public navbar
  private readonly chromelessPrefixes = [
    '/dashboard',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/change-password',
  ];

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  showNavbar = computed(() => {
    const url = this.currentUrl();
    return !this.chromelessPrefixes.some((p) => url === p || url.startsWith(p + '/') || url.startsWith(p + '?'));
  });
}
