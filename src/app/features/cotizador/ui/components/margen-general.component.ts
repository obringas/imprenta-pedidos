import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** El numero que se negocia en cada cotizacion: siempre arriba y a mano. */
@Component({
  selector: 'app-margen-general',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .margen-general { display: grid; gap: 0.75rem; border-color: rgba(242, 163, 0, 0.32); background: linear-gradient(135deg, rgba(242, 163, 0, 0.16), rgba(91, 56, 176, 0.1)); }
    .margen-general-encabezado { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    .margen-general-valor { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 1.6rem; font-weight: 800; color: var(--brand-deep); }
    .margen-general-valor input { width: 6.5rem; padding: 0.55rem 0.7rem; font-size: 1.6rem; font-weight: 800; text-align: right; color: var(--brand-deep); }
    .margen-slider { padding: 0; min-height: 44px; border: 0; background: transparent; accent-color: var(--brand-mid); }
    .margen-slider-escala { display: flex; justify-content: space-between; margin-top: -0.6rem; font-size: 0.78rem; color: #6b7280; }
  `,
  template: `
    <section class="card margen-general" aria-labelledby="titulo-margen-general">
      <div class="margen-general-encabezado">
        <div>
          <p class="eyebrow" id="titulo-margen-general">Margen general</p>
          <p class="caption">Sobre el costo. Lo siguen todos los libros que no tengan margen propio.</p>
        </div>
        <label class="margen-general-valor">
          <span class="sr-only">Margen general en porcentaje</span>
          <input
            type="number"
            inputmode="decimal"
            min="0"
            [max]="maximoInput()"
            [value]="margen()"
            (input)="emitir($any($event.target).value)"
          />
          <span aria-hidden="true">%</span>
        </label>
      </div>

      <input
        class="margen-slider"
        type="range"
        min="0"
        [max]="maximoSlider()"
        step="1"
        aria-label="Margen general"
        [attr.aria-valuetext]="margen() + ' %'"
        [value]="margen()"
        (input)="emitir($any($event.target).value)"
      />
      <div class="margen-slider-escala" aria-hidden="true">
        <span>0 %</span>
        <span>{{ maximoSlider() }} %</span>
      </div>

      <button type="button" class="text-button" [disabled]="margen() === margenDefault()" (click)="restablecer.emit()">
        Volver al default ({{ margenDefault() }} %)
      </button>
    </section>
  `,
})
export class MargenGeneralComponent {
  readonly margen = input.required<number>();
  readonly margenDefault = input.required<number>();
  readonly maximoSlider = input.required<number>();
  readonly maximoInput = input.required<number>();

  readonly cambiar = output<number>();
  readonly restablecer = output<void>();

  protected emitir(texto: string): void {
    if (texto !== '') {
      this.cambiar.emit(Number(texto));
    }
  }
}
