import { Injectable, signal } from '@angular/core';

export interface ConfirmModalConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'success' | 'info';
  showInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
}

export interface ConfirmModalState {
  isOpen: boolean;
  config: ConfirmModalConfig;
  resolveFn: ((result: { confirmed: boolean; inputValue?: string }) => void) | null;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmModalService {

  modalState = signal<ConfirmModalState>({
    isOpen: false,
    config: { title: '', message: '' },
    resolveFn: null
  });

  // Opens the modal and returns a Promise the component awaits
  open(config: ConfirmModalConfig): Promise<{ confirmed: boolean; inputValue?: string }> {
    return new Promise((resolve) => {
      this.modalState.set({
        isOpen: true,
        config: {
          confirmText: 'Confirm',
          cancelText: 'Cancel',
          type: 'danger',
          showInput: false,
          ...config
        },
        resolveFn: resolve
      });
    });
  }

  // Called by modal component when user clicks Confirm
  confirm(inputValue?: string): void {
    const state = this.modalState();
    if (state.resolveFn) {
      state.resolveFn({ confirmed: true, inputValue });
    }
    this.close();
  }

  // Called by modal component when user clicks Cancel/X
  cancel(): void {
    const state = this.modalState();
    if (state.resolveFn) {
      state.resolveFn({ confirmed: false });
    }
    this.close();
  }

  private close(): void {
    this.modalState.set({
      isOpen: false,
      config: { title: '', message: '' },
      resolveFn: null
    });
  }
}