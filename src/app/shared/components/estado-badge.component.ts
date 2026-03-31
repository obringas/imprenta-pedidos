import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ESTADO_VISUAL } from '../constants/negocio.constants';

@Component({
  selector: 'app-estado-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [class]="'badge badge-' + config().variant">
      {{ config().label }}
    </span>
  `,
})
export class EstadoBadgeComponent {
  readonly estado = input.required<string>();

  protected readonly config = computed(() => {
    return ESTADO_VISUAL[this.estado()] ?? { variant: 'muted', label: this.estado() };
  });
}

