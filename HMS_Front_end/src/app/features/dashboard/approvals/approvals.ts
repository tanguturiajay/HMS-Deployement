import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DashboardLayoutComponent } from '../../../shared/ui/dashboard-layout/dashboard-layout';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiErrorHandlerService } from '../../../core/services/api-error-handler.service';
import { APP_MESSAGES } from '../../../core/constants/messages';
import { ConfirmModalService } from '../../../core/services/confirm-modal.service';
import { EmployeeListItem } from '../../../core/models/employee.model';
import {
  ChangeValue,
  ProfileChangeRequest,
} from '../../../core/models/profile-change-request.model';

type Tab = 'registrations' | 'profileChanges';

// Approvals page (OWNER/ADMIN) with registration and profile-change tabs
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-approvals',
  standalone: true,
  imports: [CommonModule, DatePipe, DashboardLayoutComponent, PaginationComponent],
  templateUrl: './approvals.html',
  styleUrl: './approvals.css',
})
export class ApprovalsComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly apiError = inject(ApiErrorHandlerService);
  private readonly confirmModal = inject(ConfirmModalService);

  tab = signal<Tab>('registrations');

  registrations = signal<EmployeeListItem[]>([]);
  changes = signal<ProfileChangeRequest[]>([]);
  loadingReg = signal(true);
  loadingChanges = signal(true);

  selectedRegistration = signal<EmployeeListItem | null>(null);
  selectedChange = signal<ProfileChangeRequest | null>(null);

  limit = 10;

  // Registration tab pagination
  regPage = signal(1);
  regTotal = signal(0);
  regTotalPages = signal(0);

  // Profile-change tab pagination
  changePage = signal(1);
  changeTotal = signal(0);
  changeTotalPages = signal(0);

  // Pending badge reflects server totals across both tabs
  totalPending = computed(() => this.regTotal() + this.changeTotal());

  ngOnInit(): void {
    this.loadRegistrations();
    this.loadChanges();
  }

  switchTab(tab: Tab): void {
    this.tab.set(tab);
  }

  private loadRegistrations(): void {
    this.loadingReg.set(true);
    this.adminService.getPendingEmployees(this.regPage(), this.limit).subscribe({
      next: (res) => {
        this.registrations.set(res.data.employees || []);
        this.regTotal.set(res.data.total || 0);
        this.regTotalPages.set(res.data.totalPages || 1);
        // Re-clamp if the current page fell past the end after a shrink
        if (this.regTotal() > 0 && this.regPage() > this.regTotalPages()) {
          this.regPage.set(this.regTotalPages());
          this.loadRegistrations();
          return;
        }
        this.loadingReg.set(false);
      },
      error: () => {
        this.loadingReg.set(false);
        this.toast.error(APP_MESSAGES.LOAD_APPROVALS_FAILED);
      },
    });
  }

  private loadChanges(): void {
    this.loadingChanges.set(true);
    this.adminService.getProfileChangeRequests(this.changePage(), this.limit).subscribe({
      next: (res) => {
        this.changes.set(res.data.requests || []);
        this.changeTotal.set(res.data.total || 0);
        this.changeTotalPages.set(res.data.totalPages || 1);
        // Re-clamp if the current page fell past the end after a shrink
        if (this.changeTotal() > 0 && this.changePage() > this.changeTotalPages()) {
          this.changePage.set(this.changeTotalPages());
          this.loadChanges();
          return;
        }
        this.loadingChanges.set(false);
      },
      error: () => {
        this.loadingChanges.set(false);
        this.toast.error(APP_MESSAGES.LOAD_APPROVALS_FAILED);
      },
    });
  }

  goToRegPage(p: number): void {
    if (p < 1 || p > this.regTotalPages() || p === this.regPage()) {
      return;
    }
    this.regPage.set(p);
    this.loadRegistrations();
  }

  goToChangePage(p: number): void {
    if (p < 1 || p > this.changeTotalPages() || p === this.changePage()) {
      return;
    }
    this.changePage.set(p);
    this.loadChanges();
  }

  // Registration approvals
  openRegistration(item: EmployeeListItem): void {
    this.selectedRegistration.set(item);
  }

  closeRegistration(): void {
    this.selectedRegistration.set(null);
  }

  async approveRegistration(item: EmployeeListItem): Promise<void> {
    const result = await this.confirmModal.open({
      title: 'Approve Registration',
      message: `Approve ${item.employee.name} (${item.employee.employeeCode}) and send their welcome email?`,
      confirmText: 'Approve',
      cancelText: 'Cancel',
      type: 'success',
    });
    if (!result.confirmed) {
      return;
    }
    this.adminService.approveEmployee(item.employee.employeeCode).subscribe({
      next: (res) => {
        this.toast.success(res.message || APP_MESSAGES.EMPLOYEE_APPROVED);
        this.closeRegistration();
        this.loadRegistrations();
      },
      error: (err) => {
        this.toast.error(this.apiError.message(err, APP_MESSAGES.EMPLOYEE_APPROVE_FAILED));
      },
    });
  }

  async rejectRegistration(item: EmployeeListItem): Promise<void> {
    const result = await this.confirmModal.open({
      title: 'Reject Registration',
      message: `Reject the registration request from ${item.employee.name}? They will be notified by email.`,
      confirmText: 'Reject',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!result.confirmed) {
      return;
    }
    this.adminService.rejectEmployee(item.employee.employeeCode).subscribe({
      next: (res) => {
        this.toast.success(res.message || APP_MESSAGES.EMPLOYEE_REJECTED);
        this.closeRegistration();
        this.loadRegistrations();
      },
      error: (err) => {
        this.toast.error(this.apiError.message(err, APP_MESSAGES.EMPLOYEE_REJECT_FAILED));
      },
    });
  }

  // Profile change approvals
  openChange(req: ProfileChangeRequest): void {
    this.selectedChange.set(req);
  }

  closeChange(): void {
    this.selectedChange.set(null);
  }

  // Materializes the requestedChanges map into a stable list for the template
  changeEntries(req: ProfileChangeRequest): { field: string; diff: ChangeValue }[] {
    return Object.entries(req.requestedChanges || {}).map(([field, diff]) => ({
      field,
      diff,
    }));
  }

  formatValue(value: any): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  formatField(field: string): string {
    return field
      .replaceAll(/([A-Z])/g, ' $1')
      .replaceAll(/^./g, (c) => c.toUpperCase());
  }

  async approveChange(req: ProfileChangeRequest): Promise<void> {
    const result = await this.confirmModal.open({
      title: 'Approve Profile Change',
      message: `Apply the requested changes for ${req.employeeName} (${req.employeeCode})?`,
      confirmText: 'Approve',
      cancelText: 'Cancel',
      type: 'success',
    });
    if (!result.confirmed) {
      return;
    }
    this.adminService.approveProfileChange(req.requestId).subscribe({
      next: (res) => {
        this.toast.success(res.message || APP_MESSAGES.PROFILE_CHANGE_APPROVED);
        this.closeChange();
        this.loadChanges();
      },
      error: (err) => {
        this.toast.error(this.apiError.message(err, APP_MESSAGES.PROFILE_CHANGE_APPROVE_FAILED));
      },
    });
  }

  async rejectChange(req: ProfileChangeRequest): Promise<void> {
    const result = await this.confirmModal.open({
      title: 'Reject Profile Change',
      message: `Reject the profile change request from ${req.employeeName}? They will be notified by email.`,
      confirmText: 'Reject',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!result.confirmed) {
      return;
    }
    this.adminService.rejectProfileChange(req.requestId).subscribe({
      next: (res) => {
        this.toast.success(res.message || APP_MESSAGES.PROFILE_CHANGE_REJECTED);
        this.closeChange();
        this.loadChanges();
      },
      error: (err) => {
        this.toast.error(this.apiError.message(err, APP_MESSAGES.PROFILE_CHANGE_REJECT_FAILED));
      },
    });
  }

  trackByCode = (_: number, item: EmployeeListItem) =>
    item.employee.employeeCode;
  trackByRequest = (_: number, r: ProfileChangeRequest) => r.requestId;
}
