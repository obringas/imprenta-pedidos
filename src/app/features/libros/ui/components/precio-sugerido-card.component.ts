import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TamanioImpresion } from '../../../../shared/constants/negocio.constants';
import { PesoPipe } from '../../../../shared/pipes/peso.pipe';
import { Cotizacion } from '../../../cotizador/domain/cotizacion.model';

/** Precio sugerido de un tamaño, con su costo, ganancia y margen. */
@Component({
  selector: 'app-precio-sugerido-card',
  standalone: true,
  imports: [PesoPipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card suggested-price-card" [class.precio-bajo-minimo]="cotizacion().bajoMinimo">
      <p class="eyebrow">Precio {{ tamanio() }} sugerido</p>
      <strong>{{ cotizacion().precio | peso }}</strong>
      <dl class="detalle-cotizacion">
        <div><dt>Costo</dt><dd>{{ cotizacion().costo | peso }}</dd></div>
        <div><dt>Ganancia</dt><dd>{{ cotizacion().ganancia | peso }}</dd></div>
        <div><dt>Margen</dt><dd>{{ cotizacion().margenSobreCosto | number: '1.0-0' }} %</dd></div>
      </dl>
      @if (cotizacion().tomos > 1) {
        <p class="caption">Va en {{ cotizacion().tomos }} tomos (espiral y tapa por tomo).</p>
      }
      <button type="button" class="secondary-button" (click)="usar.emit(cotizacion().precio)">
        Usar precio {{ tamanio() }} sugerido
      </button>
    </div>
  `,
})
export class PrecioSugeridoCardComponent {
  readonly tamanio = input.required<TamanioImpresion>();
  readonly cotizacion = input.required<Cotizacion>();
  readonly usar = output<number>();
}
