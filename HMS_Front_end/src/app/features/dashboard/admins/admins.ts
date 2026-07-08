import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardLayoutComponent } from '../../../shared/ui/dashboard-layout/dashboard-layout';
import { LastLoginCellComponent } from '../../../shared/ui/last-login-cell/last-login-cell';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination';
import { OwnerService } from '../../../core/services/owner.service';
import { PermissionService } from '../../../core/services/permission.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiErrorHandlerService } from '../../../core/services/api-error-handler.service';
import { APP_MESSAGES } from '../../../core/constants/messages';
import { ConfirmModalService } from '../../../core/services/confirm-modal.service';
import { EmployeeListItem } from '../../../core/models/employee.model';

// Admin management list (OWNER only)
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-admins',
  standalone: true,
  imports: [CommonModule, RouterLink, DashboardLayoutComponent, PaginationComponent, DatePipe, LastLoginCellComponent],
  templateUrl: './admins.html',
  styleUrl: './admins.css',
})
export class AdminsComponent implements OnInit {
  private readonly ownerService = inject(OwnerService);
  private readonly permissionService = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly apiError = inject(ApiErrorHandlerService);
  private readonly confirmModal = inject(ConfirmModalService);

  // Action buttons follow the granted permissions
  canCreate = computed(() => this.permissionService.can('CREATE_ADMIN'));
  canEdit = computed(() => this.permissionService.can('UPDATE_ADMIN'));
  canDelete = computed(() => this.permissionService.can('DELETE_ADMIN'));

  admins = signal<EmployeeListItem[]>([]);
  loading = signal(true);
  selected = signal<EmployeeListItem | null>(null);

  // Pagination
  page = signal(1);
  limit = 10;
  total = signal(0);
  totalPages = signal(0);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.ownerService.getAdmins(this.page(), this.limit).subscribe({
      next: (res) => {
        this.admins.set(res.data.admins || []);
        this.total.set(res.data.total || 0);
        this.totalPages.set(res.data.totalPages || 1);
        // Re-clamp if the current page fell past the end after a shrink
        if (this.total() > 0 && this.page() > this.totalPages()) {
          this.page.set(this.totalPages());
          this.load();
          return;
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(APP_MESSAGES.LOAD_ADMINS_FAILED);
      },
    });
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages() || p === this.page()) {
      return;
    }
    this.page.set(p);
    this.load();
  }

  open(item: EmployeeListItem): void {
    this.selected.set(item);
  }

  close(): void {
    this.selected.set(null);
  }

  async deleteAdmin(item: EmployeeListItem): Promise<void> {
    const result = await this.confirmModal.open({
      title: 'Delete Admin',
      message: `Permanently delete admin ${item.employee.name} (${item.employee.employeeCode})?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!result.confirmed) {
      return;
    }
    this.ownerService.deleteAdmin(item.employee.employeeCode).subscribe({
      next: (res) => {
        this.toast.success(res.message || APP_MESSAGES.ADMIN_DELETED);
        this.close();
        this.load();
      },
      error: (err) => {
        this.toast.error(this.apiError.message(err, APP_MESSAGES.ADMIN_DELETE_FAILED));
      },
    });
  }

  trackByCode = (_: number, item: EmployeeListItem) =>
    item.employee.employeeCode;
}