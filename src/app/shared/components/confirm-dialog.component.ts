import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="dialog-backdrop" (click)="cancelled.emit()">
        <section class="dialog-card" role="dialog" aria-modal="true" [attr.aria-label]="title()" (click)="$event.stopPropagation()">
          <p class="eyebrow">Confirmación</p>
          <h2>{{ title() }}</h2>
          <p class="page-description">{{ description() }}</p>
          <div class="dialog-actions">
            <button type="button" class="secondary-button" (click)="cancelled.emit()">Cancelar</button>
            <button type="button" class="danger-button" (click)="confirmed.emit()">{{ confirmLabel() }}</button>
          </div>
        </section>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  readonly open = input(false);
  readonly title = input('Confirmar acción');
  readonly description = input('Esta acción no se puede deshacer.');
  readonly confirmLabel = input('Eliminar');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
