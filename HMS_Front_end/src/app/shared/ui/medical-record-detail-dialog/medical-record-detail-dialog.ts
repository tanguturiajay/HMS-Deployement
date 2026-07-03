import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiErrorHandlerService } from '../../../core/services/api-error-handler.service';
import { ConfirmModalService } from '../../../core/services/confirm-modal.service';
import { MedicalRecordService } from '../../../core/services/medical-record.service';
import {
  MedicalRecord,
  PrescriptionItem,
  ADMINISTRATION_CATEGORY_LABELS,
  ADMINISTRATION_METHOD_LABELS,
  formatFoodTiming,
} from '../../../core/models/medical-record.model';

// Read-only full view of a medical record. Admin/Owner can soft-delete from here.
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-medical-record-detail-dialog',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './medical-record-detail-dialog.html',
  styleUrl: './medical-record-detail-dialog.css',
})
export class MedicalRecordDetailDialogComponent {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly apiError = inject(ApiErrorHandlerService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly service = inject(MedicalRecordService);

  @Input({ required: true }) record!: MedicalRecord;
  @Output() closed = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<string>();

  // Display label maps + food-timing phrase for the template
  readonly categoryLabels = ADMINISTRATION_CATEGORY_LABELS;
  readonly methodLabels = ADMINISTRATION_METHOD_LABELS;

  foodTimingText(item: PrescriptionItem): string {
    return formatFoodTiming(item.foodTiming);
  }

  deleting = signal(false);

  canDelete = computed(() => {
    const d = this.auth.getDesignation();
    return d === 'OWNER' || d === 'ADMIN';
  });

  close(): void {
    this.closed.emit();
  }

  async remove(): Promise<void> {
    const r = this.record;
    if (!r) return;
    const result = await this.confirmModal.open({
      title: 'Delete Medical Record',
      message: `Delete medical record ${r.medicalRecordId}? It will be hidden from all listings.`,
      confirmText: 'Delete',
      cancelText: 'Keep',
      type: 'danger',
    });
    if (!result.confirmed) return;

    this.deleting.set(true);
    this.service.delete(r.medicalRecordId).subscribe({
      next: (res) => {
        this.deleting.set(false);
        this.toast.success(res.message || 'Medical record deleted.');
        this.deleted.emit(r.medicalRecordId);
      },
      error: (err) => {
        this.deleting.set(false);
        this.toast.error(
          this.apiError.message(err, 'Failed to delete medical record.'),
        );
      },
    });
  }
}
