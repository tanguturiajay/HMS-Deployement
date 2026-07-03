import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private counter = 0;
  toasts = signal<Toast[]>([]);

  getToasts(): Toast[] {
    return this.toasts();
  }

  show(message: string, type: ToastType = 'info', duration = 3000): void {
    const id = ++this.counter;
    this.toasts.update((t) => [...t, { id, message, type }]);
    setTimeout(() => this.remove(id), duration);
  }

  success(message: string): void {
    this.show(message, 'success');
  }
  error(message: string): void {
    this.show(message, 'error', 4000);
  }
  info(message: string): void {
    this.show(message, 'info');
  }
  warning(message: string): void {
    this.show(message, 'warning');
  }

  remove(id: number): void {
    this.toasts.update((t) => t.filter((toast) => toast.id !== id));
  }
}
