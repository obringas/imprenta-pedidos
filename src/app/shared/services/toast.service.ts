import { Injectable, signal } from '@angular/core';

type ToastVariant = 'success' | 'error';

export interface ToastItem {
  readonly id: string;
  readonly message: string;
  readonly variant: ToastVariant;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastsInternos = signal<ToastItem[]>([]);

  readonly toasts = this.toastsInternos.asReadonly();

  success(message: string): void {
    this.agregar(message, 'success');
  }

  error(message: string): void {
    this.agregar(message, 'error');
  }

  remove(id: string): void {
    this.toastsInternos.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  private agregar(message: string, variant: ToastVariant): void {
    const id = crypto.randomUUID();
    this.toastsInternos.update((toasts) => [...toasts, { id, message, variant }]);
    window.setTimeout(() => this.remove(id), 3200);
  }
}
