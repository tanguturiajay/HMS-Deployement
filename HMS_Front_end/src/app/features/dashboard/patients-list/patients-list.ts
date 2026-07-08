import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, Subject } from 'rxjs';
import { DashboardLayoutComponent } from '../../../shared/ui/dashboard-layout/dashboard-layout';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination';
import { PatientService } from '../../../core/services/patient.service';
import { PermissionService } from '../../../core/services/permission.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiErrorHandlerService } from '../../../core/services/api-error-handler.service';
import { ConfirmModalService } from '../../../core/services/confirm-modal.service';
import { APP_MESSAGES } from '../../../core/constants/messages';
import {
  GENDERS,
  Patient,
  PATIENT_STATUSES,
} from '../../../core/models/patient.model';

// Patients list (OWNER/ADMIN/RECEPTIONIST) with filters and debounced search
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-patients-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    DashboardLayoutComponent,
    PaginationComponent,
    DatePipe,
  ],
  templateUrl: './patients-list.html',
  styleUrl: './patients-list.css',
})
export class PatientsListComponent implements OnInit {
  private readonly patientService = inject(PatientService);
  private readonly permissionService = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly apiError = inject(ApiErrorHandlerService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly router = inject(Router);

  // Detail modal
  selected = signal<Patient | null>(null);
  deleting = signal(false);

  // Action buttons follow the granted permissions
  canCreate = computed(() => this.permissionService.can('CREATE_PATIENT'));
  canEdit = computed(() => this.permissionService.can('UPDATE_PATIENT'));
  canDelete = computed(() => this.permissionService.can('DELETE_PATIENT'));

  patients = signal<Patient[]>([]);
  loading = signal(true);

  page = signal(1);
  limit = 10;
  total = signal(0);
  totalPages = signal(0);

  searchTerm = signal('');
  statusFilter = signal<string>('');
  genderFilter = signal<string>('');

  genders = GENDERS;
  statuses = PATIENT_STATUSES;

  searching = computed(() => this.searchTerm().trim().length > 0);

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

    if (this.searching()) {
      this.patientService.searchPatients(this.searchTerm()).subscribe({
        next: (res) => {
          this.patients.set(res.data.patients || []);
          this.total.set(res.data.total || 0);
          this.totalPages.set(1);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error(APP_MESSAGES.LOAD_PATIENTS_FAILED);
        },
      });
      return;
    }

    this.patientService
      .getPatients(this.page(), this.limit, {
        status: this.statusFilter() || undefined,
        gender: this.genderFilter() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.patients.set(res.data.patients || []);
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
          this.toast.error(APP_MESSAGES.LOAD_PATIENTS_FAILED);
        },
      });
  }

  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value);
    this.page.set(1);
    this.load();
  }

  onGenderChange(value: string): void {
    this.genderFilter.set(value);
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

  open(p: Patient): void {
    this.selected.set(p);
  }

  close(): void {
    this.selected.set(null);
  }

  viewMedicalRecords(p: Patient): void {
    this.router.navigate(['/dashboard/medical-records'], {
      queryParams: { patientUHID: p.UHID, patientName: p.name },
    });
  }

  editPatient(p: Patient): void {
    this.router.navigate(['/dashboard/patients', p.UHID], {
      queryParams: { edit: '1' },
    });
  }

  async deletePatient(p: Patient): Promise<void> {
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
        this.toast.success(res.message || APP_MESSAGES.PATIENT_DELETED);
        this.close();
        this.load();
      },
      error: (err) => {
        this.deleting.set(false);
        this.toast.error(this.apiError.message(err, APP_MESSAGES.PATIENT_DELETE_FAILED));
      },
    });
  }

  trackByUHID = (_: number, p: Patient) => p.UHID;
}