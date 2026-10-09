import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ETIQUETA_TIPO_IMPRESION, TAMANIO_IMPRESION, TamanioImpresion } from '../../../../shared/constants/negocio.constants';
import { PesoPipe } from '../../../../shared/pipes/peso.pipe';
import { Cotizacion } from '../../domain/cotizacion.model';
import { FilaCotizacion } from '../../state/cotizador.facade';

interface BloqueTamanio {
  readonly tamanio: TamanioImpresion;
  readonly cotizacion: Cotizacion;
  readonly objetivo: number | null;
  readonly precioActual: number | null;
}

export interface CambioObjetivo {
  readonly tamanio: TamanioImpresion;
  readonly precio: number | null;
}

/** Un libro tildado: su margen, y por tamaño precio, ganancia, margen y precio objetivo. */
@Component({
  selector: 'app-fila-cotizacion',
  standalone: true,
  imports: [PesoPipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .fila-cotizacion { display: grid; gap: 0.9rem; }
    .fila-cotizacion-encabezado { display: flex; justify-content: space-between; align-items: start; gap: 1rem; }
    .fila-cotizacion-encabezado h3 { margin: 0 0 0.2rem; font-size: 1.15rem; color: var(--brand-deep); }
    .fila-cotizacion-encabezado .text-button { min-height: 44px; }
    .fila-margen { display: grid; grid-template-columns: minmax(0, 11rem) 1fr; align-items: end; gap: 0.75rem; }
    .fila-margen-fijado { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; min-height: 44px; }
    .fila-tamanios { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; }
    .bloque-tamanio { display: grid; gap: 0.45rem; align-content: start; padding: 0.8rem; border-radius: 1rem; border: 1px solid rgba(91, 56, 176, 0.14); background: rgba(255, 255, 255, 0.7); }
    .bloque-precio { font-size: 1.55rem; line-height: 1.1; color: var(--brand-deep); }
    .detalle-cotizacion-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .fila-bajo-minimo { border-color: rgba(185, 28, 28, 0.55); background: linear-gradient(135deg, rgba(254, 202, 202, 0.5), rgba(255, 247, 237, 0.95)); }
    .fila-alerta { margin: 0; font-weight: 700; }
  `,
  template: `
    @let f = fila();
    <article class="card fila-cotizacion" [class.fila-bajo-minimo]="f.bajoMinimo" [attr.aria-label]="f.libro.titulo">
      <header class="fila-cotizacion-encabezado">
        <div>
          <h3>{{ f.libro.titulo }}</h3>
          <p class="caption">
            {{ f.libro.paginas }} pág. · {{ etiquetaTipo() }}
            @if (f.a4.tomos > 1) {
              · <strong>{{ f.a4.tomos }} tomos</strong>
            }
          </p>
        </div>
        <button type="button" class="text-button" (click)="quitar.emit()">Quitar</button>
      </header>

      <div class="fila-margen">
        <label class="field">
          <span>Margen de este libro</span>
          <div class="input-with-suffix">
            <input type="number" inputmode="decimal" min="0" [value]="f.margen" (input)="emitirMargen($any($event.target).value)" />
            <span class="input-suffix">%</span>
          </div>
        </label>
        @if (f.margenFijado) {
          <div class="fila-margen-fijado">
            <span class="badge badge-accent">Fijado</span>
            <button type="button" class="text-button" (click)="sincronizar.emit()">Seguir al general</button>
          </div>
        }
      </div>

      <div class="fila-tamanios">
        @for (bloque of bloques(); track bloque.tamanio) {
          <section class="bloque-tamanio" [class.fila-bajo-minimo]="bloque.cotizacion.bajoMinimo" [attr.aria-label]="'Precio ' + bloque.tamanio">
            <p class="eyebrow">{{ bloque.tamanio }}</p>
            <strong class="bloque-precio">{{ bloque.cotizacion.precio | peso }}</strong>
            @if (bloque.cotizacion.precioCantidad !== null) {
              <p class="caption">{{ cantidadMinima() }} o más: {{ bloque.cotizacion.precioCantidad | peso }}</p>
            }
            <dl class="detalle-cotizacion detalle-cotizacion-2">
              <div><dt>Ganancia</dt><dd>{{ bloque.cotizacion.ganancia | peso }}</dd></div>
              <div><dt>Margen</dt><dd>{{ bloque.cotizacion.margenSobreCosto | number: '1.0-0' }} %</dd></div>
            </dl>
            <label class="field">
              <span>Precio objetivo</span>
              <div class="input-with-prefix">
                <span class="input-prefix">$</span>
                <input
                  type="number"
                  inputmode="numeric"
                  min="0"
                  placeholder="Opcional"
                  [value]="bloque.objetivo ?? ''"
                  (input)="emitirObjetivo(bloque.tamanio, $any($event.target).value)"
                />
              </div>
            </label>
            <p class="caption">
              Costo {{ bloque.cotizacion.costo | peso }} · Hoy {{ bloque.precioActual | peso }}
            </p>
          </section>
        }
      </div>

      @if (f.bajoMinimo) {
        <p class="text-danger fila-alerta" role="status">Margen por debajo del mínimo ({{ margenMinimo() }} %).</p>
      }

      <button type="button" class="primary-button" [disabled]="aplicando()" (click)="aplicar.emit()">
        {{ aplicando() ? 'Guardando…' : 'Aplicar precios' }}
      </button>
    </article>
  `,
})
export class FilaCotizacionComponent {
  readonly fila = input.required<FilaCotizacion>();
  readonly margenMinimo = input.required<number>();
  readonly cantidadMinima = input.required<number>();
  readonly aplicando = input(false);

  readonly cambiarMargen = output<number>();
  readonly sincronizar = output<void>();
  readonly cambiarObjetivo = output<CambioObjetivo>();
  readonly aplicar = output<void>();
  readonly quitar = output<void>();

  protected readonly etiquetaTipo = computed(() => ETIQUETA_TIPO_IMPRESION[this.fila().libro.tipoImpresion]);

  protected readonly bloques = computed<BloqueTamanio[]>(() => {
    const fila = this.fila();
    return [
      { tamanio: TAMANIO_IMPRESION.A4, cotizacion: fila.a4, objetivo: fila.objetivoA4, precioActual: fila.libro.precioA4 },
      { tamanio: TAMANIO_IMPRESION.A5, cotizacion: fila.a5, objetivo: fila.objetivoA5, precioActual: fila.libro.precioA5 },
    ];
  });

  protected emitirMargen(texto: string): void {
    if (texto !== '') {
      this.cambiarMargen.emit(Number(texto));
    }
  }

  protected emitirObjetivo(tamanio: TamanioImpresion, texto: string): void {
    this.cambiarObjetivo.emit({ tamanio, precio: texto === '' ? null : Number(texto) });
  }
}
