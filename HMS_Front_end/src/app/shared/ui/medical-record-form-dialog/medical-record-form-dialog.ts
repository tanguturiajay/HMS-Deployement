import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { PermissionService } from '../../../core/services/permission.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiErrorHandlerService } from '../../../core/services/api-error-handler.service';
import { ConfirmModalService } from '../../../core/services/confirm-modal.service';
import { MedicalRecordService } from '../../../core/services/medical-record.service';
import { Appointment } from '../../../core/models/appointment.model';
import {
  MedicalRecord,
  MedicalRecordStatus,
  MedicalObservation,
  PrescriptionItem,
  AdministrationCategory,
  AdministrationMethod,
  ADMINISTRATION_CATEGORIES,
  ADMINISTRATION_METHODS_BY_CATEGORY,
  ADMINISTRATION_CATEGORY_LABELS,
  ADMINISTRATION_METHOD_LABELS,
  FOOD_RELATIONS,
  FOOD_RELATION_SHORT_LABELS,
} from '../../../core/models/medical-record.model';

// Create or edit dialog for a medical record where finalize permission holders may finalize and everyone else is locked to DRAFT
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-medical-record-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './medical-record-form-dialog.html',
  styleUrl: './medical-record-form-dialog.css',
})
export class MedicalRecordFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly permissionService = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly apiError = inject(ApiErrorHandlerService);
  private readonly confirm = inject(ConfirmModalService);
  private readonly service = inject(MedicalRecordService);

  // Appointment context (provides the read-only auto-filled fields)
  @Input({ required: true }) appointment!: Appointment;
  // When set, the dialog edits an existing DRAFT; otherwise it creates a new record
  @Input() existingRecord: MedicalRecord | null = null;

  @Output() saved = new EventEmitter<MedicalRecord>();
  @Output() closed = new EventEmitter<void>();

  saving = signal(false);

  // Creating finalizes with the create permission while editing a draft finalizes with the verify permission
  canFinalize = computed(() =>
    this.permissionService.can(
      this.existingRecord
        ? 'VERIFY_AND_FINALIZE_MEDICAL_RECORD'
        : 'CREATE_AND_FINALIZE_MEDICAL_RECORD',
    ),
  );

  // Dropdown option sources / label maps exposed to the template
  readonly categories = ADMINISTRATION_CATEGORIES;
  readonly categoryLabels = ADMINISTRATION_CATEGORY_LABELS;
  readonly methodLabels = ADMINISTRATION_METHOD_LABELS;
  readonly foodRelations = FOOD_RELATIONS;
  readonly foodRelationShortLabels = FOOD_RELATION_SHORT_LABELS;

  // Mirror of the status control so the primary button label stays reactive
  private readonly statusSig = signal<MedicalRecordStatus>('DRAFT');

  form!: FormGroup;

  // Read-only auto-filled values
  get patientUHID(): string {
    return (
      this.existingRecord?.patientUHID ||
      this.appointment.patient?.UHID ||
      this.appointment.patientUHID
    );
  }
  get patientName(): string {
    return (
      this.existingRecord?.patientName ||
      this.appointment.patient?.name ||
      this.appointment.patientUHID
    );
  }
  get doctorEmployeeId(): string {
    return (
      this.existingRecord?.doctorEmployeeId || this.appointment.doctorEmployeeId
    );
  }
  get doctorName(): string {
    return (
      this.existingRecord?.doctorName ||
      this.appointment.doctor?.name ||
      this.appointment.doctorEmployeeId
    );
  }
  get appointmentId(): string {
    return this.appointment.appointmentId;
  }

  ngOnInit(): void {
    const r = this.existingRecord;

    // Prescription and observations are optional: only seed rows that already exist
    const items = (r?.prescriptionItems ?? []).map((item) => this.newItem(item));
    const obs = (r?.medicalObservations ?? []).map((o) => this.newObs(o));

    this.form = this.fb.group({
      chiefComplaint: [r?.chiefComplaint ?? '', [Validators.required]],
      symptoms: [r?.symptoms ?? '', [Validators.required]],
      diagnosis: [r?.diagnosis ?? '', [Validators.required]],
      advice: [r?.advice ?? '', [Validators.required]],
      notes: [r?.notes ?? ''],
      status: [(r?.status as MedicalRecordStatus) ?? 'DRAFT'],
      prescriptionItems: this.fb.array(items),
      medicalObservations: this.fb.array(obs),
    });

    // Keep the status signal in sync so primaryLabel() recomputes on change
    this.statusSig.set(this.form.get('status')!.value as MedicalRecordStatus);
    this.form
      .get('status')!
      .valueChanges.subscribe((v) =>
        this.statusSig.set(v as MedicalRecordStatus),
      );

    // Snapshot for no-op detection (edit only); a status change also counts as a change
    this.baseline = JSON.stringify(this.form.getRawValue());
  }

  // Snapshot of the loaded record for no-op detection
  private baseline = '';

  // True when the form differs from its initial snapshot driving the submit guard and the discard prompt
  hasChanges(): boolean {
    return JSON.stringify(this.form.getRawValue()) !== this.baseline;
  }

  // ---- Prescription items (optional) ----

  get prescriptionItems(): FormArray {
    return this.form.get('prescriptionItems') as FormArray;
  }

  private newItem(value?: PrescriptionItem) {
    return this.fb.group({
      name: [value?.name ?? '', [Validators.required]],
      dosage: [value?.dosage ?? '', [Validators.required]],
      frequency: [value?.frequency ?? '', [Validators.required]],
      duration: [value?.duration ?? '', [Validators.required]],
      foodTiming: this.fb.group({
        relation: [value?.foodTiming?.relation ?? ''],
        offsetMinutes: [value?.foodTiming?.offsetMinutes ?? null],
      }),
      administrationCategory: [value?.administrationCategory ?? '', [Validators.required]],
      administrationMethod: [value?.administrationMethod ?? '', [Validators.required]],
    });
  }

  addItem(): void {
    this.prescriptionItems.push(this.newItem());
  }

  removeItem(index: number): void {
    this.prescriptionItems.removeAt(index);
  }

  // Methods available for the category currently chosen in a given row
  methodsFor(index: number): AdministrationMethod[] {
    const cat = this.prescriptionItems
      .at(index)
      .get('administrationCategory')?.value as AdministrationCategory | '';
    return cat ? ADMINISTRATION_METHODS_BY_CATEGORY[cat] : [];
  }

  // Clear the method when it no longer belongs to the newly chosen category
  onCategoryChange(index: number): void {
    const group = this.prescriptionItems.at(index);
    const methods = this.methodsFor(index);
    const current = group.get('administrationMethod')?.value as AdministrationMethod;
    if (!current || !methods.includes(current)) {
      group.patchValue({ administrationMethod: '' });
    }
  }

  // True when a prescription field has been touched and left invalid (empty)
  itemInvalid(index: number, field: string): boolean {
    const control = this.prescriptionItems.at(index).get(field);
    return !!control && control.touched && control.invalid;
  }

  // ---- Medical observations / vitals (optional) ----

  get observations(): FormArray {
    return this.form.get('medicalObservations') as FormArray;
  }

  private newObs(value?: MedicalObservation) {
    return this.fb.group({
      metricName: [value?.metricName ?? '', [Validators.required]],
      metricValue: [value?.metricValue ?? '', [Validators.required]],
      recordedTime: [this.toLocalInput(value?.recordedTime), [Validators.required]],
    });
  }

  addObs(): void {
    this.observations.push(this.newObs());
  }

  removeObs(index: number): void {
    this.observations.removeAt(index);
  }

  obsInvalid(index: number, field: string): boolean {
    const control = this.observations.at(index).get(field);
    return !!control && control.touched && control.invalid;
  }

  // ISO timestamp -> value for <input type="datetime-local"> ("yyyy-MM-ddThh:mm")
  private toLocalInput(iso?: string): string {
    if (!iso) {
      return '';
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return '';
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours(),
    )}:${pad(d.getMinutes())}`;
  }

  // Primary button label adapts to permission / edit-state / chosen status
  primaryLabel = computed(() => {
    const editing = !!this.existingRecord;
    if (!this.canFinalize()) {
      return editing ? 'Update Draft' : 'Generate Medical Record';
    }
    const finalizing = this.statusSig() === 'FINALIZED';
    if (editing) {
      return finalizing ? 'Verify & Finalize' : 'Update Draft';
    }
    return finalizing ? 'Create & Finalize' : 'Create Draft';
  });

  close(): void {
    this.closed.emit();
  }

  // Guards against accidental data loss (e.g. clicking outside the dialog)
  async requestClose(): Promise<void> {
    if (this.saving()) {
      return;
    }
    if (!this.hasChanges()) {
      this.close();
      return;
    }
    const result = await this.confirm.open({
      title: 'Discard changes?',
      message: 'You have unsaved changes. If you leave now, they will be lost.',
      confirmText: 'Discard',
      cancelText: 'Keep editing',
      type: 'warning',
    });
    if (result.confirmed) {
      this.close();
    }
  }

  // Collects the prescription rows, dropping empty food-timing and coercing minutes
  private buildPrescriptionItems(): PrescriptionItem[] {
    return this.prescriptionItems.getRawValue().map((it) => {
      const item: PrescriptionItem = {
        name: it.name,
        dosage: it.dosage,
        frequency: it.frequency,
        duration: it.duration,
        administrationCategory: it.administrationCategory,
        administrationMethod: it.administrationMethod,
      };
      const relation = it.foodTiming?.relation;
      if (relation) {
        item.foodTiming = { relation };
        const mins = it.foodTiming?.offsetMinutes;
        if (mins !== null && mins !== undefined && `${mins}` !== '') {
          item.foodTiming.offsetMinutes = Number(mins);
        }
      }
      return item;
    });
  }

  // Collects observation rows, converting the local datetime input to an ISO string
  private buildObservations(): MedicalObservation[] {
    return this.observations.getRawValue().map((o) => ({
      metricName: o.metricName,
      metricValue: o.metricValue,
      recordedTime: o.recordedTime ? new Date(o.recordedTime).toISOString() : o.recordedTime,
    }));
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Without the finalize permission the record always stays DRAFT
    const status: MedicalRecordStatus = this.canFinalize()
      ? this.form.value.status
      : 'DRAFT';

    const payload = {
      chiefComplaint: this.form.value.chiefComplaint,
      symptoms: this.form.value.symptoms,
      diagnosis: this.form.value.diagnosis,
      advice: this.form.value.advice,
      notes: this.form.value.notes,
      prescriptionItems: this.buildPrescriptionItems(),
      medicalObservations: this.buildObservations(),
      status,
    };

    this.saving.set(true);

    const request$ = this.existingRecord
      ? this.service.update(this.existingRecord.medicalRecordId, payload)
      : this.service.create({
        appointmentId: this.appointmentId,
        ...payload,
      });

    request$.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.toast.success(res.message || 'Medical record saved.');
        if (res.data.medicalRecord) {
          this.saved.emit(res.data.medicalRecord);
        } else {
          this.closed.emit();
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(
          this.apiError.message(err, 'Failed to save medical record.'),
        );
      },
    });
  }
}