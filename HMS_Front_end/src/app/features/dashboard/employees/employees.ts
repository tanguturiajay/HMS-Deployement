import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, Subject } from 'rxjs';
import { DashboardLayoutComponent } from '../../../shared/ui/dashboard-layout/dashboard-layout';
import { LastLoginCellComponent } from '../../../shared/ui/last-login-cell/last-login-cell';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination';
import { SortAvailabilitySlotsPipe } from '../../../shared/pipes/sort-availability-slots.pipe';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiErrorHandlerService } from '../../../core/services/api-error-handler.service';
import { APP_MESSAGES } from '../../../core/constants/messages';
import { ConfirmModalService } from '../../../core/services/confirm-modal.service';
import {
  Designation,
  EmployeeListItem,
  STAFF_DESIGNATIONS,
} from '../../../core/models/employee.model';

// Active staff list with search and designation filter (OWNER/ADMIN viewers)
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-employees-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    DashboardLayoutComponent,
    PaginationComponent,
    DatePipe,
    LastLoginCellComponent,
    SortAvailabilitySlotsPipe,
  ],
  templateUrl: './employees.html',
  styleUrl: './employees.css',
})
export class EmployeesListComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly apiError = inject(ApiErrorHandlerService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly router = inject(Router);

  loading = signal(true);
  // Active staff employees — paginated server-side (admins live on their own page)
  employees = signal<EmployeeListItem[]>([]);

  searchTerm = signal('');
  designationFilter = signal<Designation | ''>('');
  designations: (Designation | 'ALL')[] = [
    'ALL',
    ...STAFF_DESIGNATIONS,
  ];

  // Pagination
  page = signal(1);
  limit = 10;
  total = signal(0);
  totalPages = signal(0);

  selected = signal<EmployeeListItem | null>(null);
  deleting = signal(false);

  // Debounce search input
  private readonly searchSubject = new Subject<string>();

  ngOnInit(): void {
    this.load();

    this.searchSubject.pipe(debounceTime(300)).subscribe((term) => {
      this.searchTerm.set(term);
      this.page.set(1);
      this.load();
    });
  }

  load(): void {
    this.loading.set(true);
    this.adminService
      .getEmployees(this.page(), this.limit, {
        search: this.searchTerm() || undefined,
        designation: this.designationFilter() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.employees.set(res.data.employees || []);
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
          this.toast.error(APP_MESSAGES.LOAD_EMPLOYEES_FAILED);
        },
      });
  }

  onSearch(value: string): void {
    this.searchSubject.next(value);
  }

  onFilter(value: string): void {
    this.designationFilter.set(value === 'ALL' || !value ? '' : (value as Designation));
    this.page.set(1);
    this.load();
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

  editEmployee(item: EmployeeListItem): void {
    this.router.navigate(['/dashboard/employees', item.employee.employeeCode, 'edit']);
  }

  // Open Medical Records scoped to this doctor (records they created/verified)
  viewDoctorRecords(item: EmployeeListItem): void {
    this.router.navigate(['/dashboard/medical-records'], {
      queryParams: {
        doctorEmployeeId: item.employee.employeeCode,
        doctorName: item.employee.name,
      },
    });
  }

  // Never expose edit or delete for any privileged owner or admin row that slips through
  canEdit(item: EmployeeListItem): boolean {
    return item.employee.designation !== 'OWNER' && item.employee.designation !== 'ADMIN';
  }

  canDelete(item: EmployeeListItem): boolean {
    return item.employee.designation !== 'OWNER' && item.employee.designation !== 'ADMIN';
  }

  async deleteEmployee(item: EmployeeListItem): Promise<void> {
    const result = await this.confirmModal.open({
      title: 'Delete Employee',
      message: `Are you sure you want to delete ${item.employee.name} (${item.employee.employeeCode})?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!result.confirmed) {
      return;
    }

    this.deleting.set(true);
    this.adminService.deleteEmployee(item.employee.employeeCode).subscribe({
      next: (res) => {
        this.deleting.set(false);
        this.toast.success(res.message || APP_MESSAGES.EMPLOYEE_DELETED);
        this.close();
        this.load();
      },
      error: (err) => {
        this.deleting.set(false);
        this.toast.error(this.apiError.message(err, APP_MESSAGES.EMPLOYEE_DELETE_FAILED));
      },
    });
  }

  trackByCode = (_: number, item: EmployeeListItem) =>
    item.employee.employeeCode;
}
