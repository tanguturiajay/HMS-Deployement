import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ReactiveFormsModule, FormArray, FormGroup } from '@angular/forms';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-availability-slots-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './availability-slots-form.html',
  styleUrl: './availability-slots-form.css',
})
export class AvailabilitySlotsFormComponent {
  @Input() formArray!: FormArray;
  @Input() weekDays: string[] = [];
  @Output() addSlot = new EventEmitter<void>();
  @Output() removeSlot = new EventEmitter<number>();

  slotGroup(i: number): FormGroup {
    return this.formArray.controls[i] as FormGroup;
  }
}
