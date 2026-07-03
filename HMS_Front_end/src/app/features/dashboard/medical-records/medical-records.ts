import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DashboardLayoutComponent } from '../../../shared/ui/dashboard-layout/dashboard-layout';
import { MedicalRecordDetailDialogComponent } from '../../../shared/ui/medical-record-detail-dialog/medical-record-detail-dialog';
import { PaginationComponent } from '../../../shared/ui/pagination/pagination';
import { MedicalRecordService } from '../../../core/services/medical-record.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiErrorHandlerService } from '../../../core/services/api-error-handler.service';
import {
  MedicalRecord,
  MedicalRecordFilters,
  MedicalRecordListItem,
} from '../../../core/models/medical-record.model';

// Role aware medical records list where doctors are scoped to their own records and a row opens the full detail dialog
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-medical-records',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DashboardLayoutComponent,
    MedicalRecordDetailDialogComponent,
    PaginationComponent,
  ],
  templateUrl: './medical-records.html',
  styleUrl: './medical-records.css',
})
export class MedicalRecordsComponent implements OnInit {
  private readonly service = inject(MedicalRecordService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly apiError = inject(ApiErrorHandlerService);
  private readonly route = inject(ActivatedRoute);

  loading = signal(true);
  records = signal<MedicalRecordListItem[]>([]);

  // Search fields
  patientUHID = signal('');
  patientName = signal('');
  doctorEmployeeId = signal('');
  doctorName = signal('');
  appointmentId = signal('');

  // Pagination
  page = signal(1);
  limit = 10;
  totalPages = signal(1);
  total = signal(0);

  // Detail dialog
  selected = signal<MedicalRecord | null>(null);
  opening = signal<string | null>(null);

  isDoctor = computed(() => this.auth.getDesignation() === 'DOCTOR');

  // When opened from a patient profile, the list is pre-filtered to that patient
  scopedToPatient = signal(false);
  // When opened from a doctor profile, the list is pre-filtered to that doctor
  scopedToDoctor = signal(false);

  ngOnInit(): void {
    const uhid = this.route.snapshot.queryParamMap.get('patientUHID');
    const name = this.route.snapshot.queryParamMap.get('patientName');
    const docId = this.route.snapshot.queryParamMap.get('doctorEmployeeId');
    const docName = this.route.snapshot.queryParamMap.get('doctorName');
    if (uhid) {
      this.patientUHID.set(uhid);
      this.scopedToPatient.set(true);
    }
    if (name) {
      this.patientName.set(name);
    }
    if (docId) {
      this.doctorEmployeeId.set(docId);
      this.scopedToDoctor.set(true);
    }
    if (docName) {
      this.doctorName.set(docName);
    }
    this.load();
  }

  private buildFilters(): MedicalRecordFilters {
    const filters: MedicalRecordFilters = {};
    if (this.patientUHID()) filters.patientUHID = this.patientUHID().trim();
    if (this.patientName()) filters.patientName = this.patientName().trim();
    if (this.appointmentId()) filters.appointmentId = this.appointmentId().trim();
    if (!this.isDoctor()) {
      if (this.doctorEmployeeId())
        filters.doctorEmployeeId = this.doctorEmployeeId().trim();
      if (this.doctorName()) filters.doctorName = this.doctorName().trim();
    }
    return filters;
  }

  load(): void {
    this.loading.set(true);
    this.service.list(this.page(), this.limit, this.buildFilters()).subscribe({
      next: (res) => {
        this.records.set(res.data.medicalRecords || []);
        this.totalPages.set(res.data.totalPages || 1);
        this.total.set(res.data.total || 0);
        // Re-clamp if the current page fell past the end after a shrink
        if (this.total() > 0 && this.page() > this.totalPages()) {
          this.page.set(this.totalPages());
          this.load();
          return;
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(
          this.apiError.message(err, 'Failed to load medical records.'),
        );
      },
    });
  }

  search(): void {
    this.page.set(1);
    this.load();
  }

  clearFilters(): void {
    this.appointmentId.set('');
    // Keep the scoped patient UHID + name locked when opened from a patient profile
    if (!this.scopedToPatient()) {
      this.patientUHID.set('');
      this.patientName.set('');
    }
    // Keep the scoped doctor ID + name locked when opened from a doctor profile
    if (!this.scopedToDoctor()) {
      this.doctorEmployeeId.set('');
      this.doctorName.set('');
    }
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

  open(row: MedicalRecordListItem): void {
    this.opening.set(row.medicalRecordId);
    this.service.getById(row.medicalRecordId).subscribe({
      next: (res) => {
        this.opening.set(null);
        this.selected.set(res.data.medicalRecord);
      },
      error: (err) => {
        this.opening.set(null);
        this.toast.error(
          this.apiError.message(err, 'Failed to load medical record.'),
        );
      },
    });
  }

  closeDialog(): void {
    this.selected.set(null);
  }

  onDeleted(): void {
    this.selected.set(null);
    this.load();
  }

  trackById = (_: number, r: MedicalRecordListItem) => r.medicalRecordId;
}
