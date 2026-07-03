import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  signal,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar';

// Viewport width (px) below which the sidebar becomes a toggled overlay
const MOBILE_BREAKPOINT = 768;

// Dashboard shell with a collapsible sidebar, sticky top bar, and projected content
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.css',
})
export class DashboardLayoutComponent implements OnInit {
  @Input() pageTitle = '';

  // Whether the viewport is currently mobile-sized
  isMobile = signal(false);

  // Whether the sidebar is shown (hidden on mobile, shown on desktop by default)
  sidebarOpen = signal(true);

  ngOnInit(): void {
    this.applyViewport();
  }

  // Keep the layout in sync when the window is resized or the device rotates
  @HostListener('window:resize')
  onResize(): void {
    this.applyViewport();
  }

  private applyViewport(): void {
    const mobile = globalThis.window !== undefined && window.innerWidth < MOBILE_BREAKPOINT;
    this.isMobile.set(mobile);
    // Hidden by default on mobile, visible by default on desktop
    this.sidebarOpen.set(!mobile);
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  // Close the sidebar (used by the backdrop and after navigating on mobile)
  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  // After tapping a nav link on mobile, collapse the overlay
  onSidebarNavigate(): void {
    if (this.isMobile()) {
      this.closeSidebar();
    }
  }
}