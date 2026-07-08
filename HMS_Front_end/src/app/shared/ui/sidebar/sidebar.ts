import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  EventEmitter,
  inject,
  Output,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { EMPTY, interval, catchError, merge, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { NodeService } from '../../../core/services/node.service';
import { PermissionService } from '../../../core/services/permission.service';
import { SidebarNode } from '../../../core/models/node.model';

// Dynamic sidebar; menu items load from /nodes/my-nodes with Overview and Profile as defaults
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class SidebarComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly nodeService = inject(NodeService);
  private readonly permissionService = inject(PermissionService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  // Re-poll interval so owner-granted nodes surface without a reload
  private readonly nodeRefreshMs = 30_000;

  // Emitted when a nav link is activated so the parent can collapse the mobile overlay
  @Output() navigate = new EventEmitter<void>();

  // Emitted when the user clicks the sidebar's own toggle button
  @Output() sidebarToggled = new EventEmitter<void>();

  title = 'HMS';
  subtitle = 'Hospital Management';

  // Guaranteed default items shown to everyone, in this order
  private readonly defaultNodes: SidebarNode[] = [
    {
      nodeId: 'default-overview',
      name: 'Overview',
      path: '/dashboard/overview',
      icon: 'overview',
      allowedDesignations: [],
    },
    {
      nodeId: 'default-profile',
      name: 'Profile',
      path: '/dashboard/profile',
      icon: 'profile',
      allowedDesignations: [],
    },
  ];

  // Backend-provided nodes (everything except the guaranteed defaults)
  private readonly backendNodes = signal<SidebarNode[]>([]);

  // Final rendered list: defaults first, then backend nodes, de-duplicated
  menuItems = computed<SidebarNode[]>(() => {
    const seen = new Set<string>();
    const combined: SidebarNode[] = [];

    for (const node of [...this.defaultNodes, ...this.backendNodes()]) {
      const key = node.path.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      combined.push(node);
    }
    return combined;
  });

  userMenuOpen = signal(false);

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    const defaultPaths = new Set(
      this.defaultNodes.map((n) => n.path.toLowerCase()),
    );

    // Poll the backend so newly granted nodes and permissions apply without a reload while a failed tick is swallowed so the current state stays put
    interval(this.nodeRefreshMs)
      .pipe(
        startWith(0),
        switchMap(() =>
          merge(
            this.nodeService.refreshMyNodes().pipe(catchError(() => EMPTY)),
            this.permissionService
              .refreshMyPermissions()
              .pipe(
                catchError(() => EMPTY),
                switchMap(() => EMPTY),
              ),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((nodes) => {
        // Drop any backend node that collides with a default path
        this.backendNodes.set(
          nodes.filter((n) => !defaultPaths.has(n.path.toLowerCase())),
        );
      });
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
  }

  onToggle(): void {
    this.sidebarToggled.emit();
  }

  // Called when a nav link is tapped; lets the parent close the mobile overlay
  onNavigate(): void {
    this.navigate.emit();
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  logout(): void {
    this.closeUserMenu();
    this.authService.logout();
  }

  getUserInitial(): string {
    const name = this.currentUser?.profile?.name || this.currentUser?.username;
    return name?.charAt(0)?.toUpperCase() || 'U';
  }

  getDisplayName(): string {
    return (
      this.currentUser?.profile?.name || this.currentUser?.username || 'User'
    );
  }

  getDesignation(): string {
    return this.currentUser?.profile?.designation || '';
  }

  // Icon cache so identical markup is not recreated on every change detection
  private readonly iconCache = new Map<string, SafeHtml>();

  // Inline 24x24 stroke icons keyed by the node's `icon` field (with aliases)
  private readonly icons: Record<string, string> = {
    overview:
      '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    profile:
      '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users:
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    user:
      '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    'heart-pulse':
      '<path d="M19.5 12.6 12 20l-7.5-7.4A5 5 0 1 1 12 6.3a5 5 0 1 1 7.5 6.3"/><path d="M3.2 12h5.3l1.5-3 3 6 1.5-3h5.3"/>',
    key:
      '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 8.8-8.8"/><path d="m15 5 3 3"/><path d="m17.5 7.5 2-2"/>',
    'user-plus':
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>',
    'check-circle':
      '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    shield:
      '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    calendar:
      '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    'calendar-plus':
      '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/>',
    'file-text':
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>',
    menu:
      '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="12" y1="8" x2="18" y2="8"/><line x1="12" y1="12" x2="18" y2="12"/><line x1="12" y1="16" x2="18" y2="16"/>',
  };

  private readonly fallbackIcon =
    '<circle cx="12" cy="12" r="9"/>';

  iconFor(node: SidebarNode): SafeHtml {
    const key = (node.icon || '').toLowerCase();

    const cached = this.iconCache.get(key);
    if (cached) {
      return cached;
    }

    const inner = this.icons[key] || this.fallbackIcon;

    const svg =
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
      `stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
      `${inner}</svg>`;

    // Bypass sanitization because the svg comes only from trusted constant icon strings and never from user input
    const safe = this.sanitizer.bypassSecurityTrustHtml(svg); // NOSONAR only hardcoded icon constants reach this bypass

    this.iconCache.set(key, safe);
    return safe;
  }
}