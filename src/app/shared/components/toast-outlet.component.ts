import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-toast-outlet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-stack" aria-live="polite" aria-atomic="true">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" role="status" [class.toast-error]="toast.variant === 'error'" [class.toast-success]="toast.variant === 'success'">
          <span>{{ toast.message }}</span>
          <button type="button" class="toast-close" (click)="toastService.remove(toast.id)" aria-label="Cerrar notificación">×</button>
        </div>
      }
    </div>
  `,
})
export class ToastOutletComponent {
  protected readonly toastService = inject(ToastService);
}
