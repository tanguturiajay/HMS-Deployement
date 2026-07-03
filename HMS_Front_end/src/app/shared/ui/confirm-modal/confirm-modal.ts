import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmModalService } from '../../../core/services/confirm-modal.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './confirm-modal.html',
  styleUrl: './confirm-modal.css'
})
export class ConfirmModalComponent {
  modalService = inject(ConfirmModalService);

  // Holds the input value typed by user (for reason/input modals)
  inputValue = signal('');

  onConfirm(): void {
    this.modalService.confirm(this.inputValue());
    this.inputValue.set('');
  }

  onCancel(): void {
    this.modalService.cancel();
    this.inputValue.set('');
  }

  // Close modal if user clicks the dark backdrop
  onBackdropClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.classList.contains('modal-backdrop')) {
      this.onCancel();
    }
  }
}