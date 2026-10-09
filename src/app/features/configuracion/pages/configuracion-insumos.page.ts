import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import {
  ConfiguracionInsumo,
  reglaDeInsumo,
  resolverUnidad,
  ValorInsumo,
} from '../../../shared/models/configuracion-insumos.model';
import { validarValorInsumo } from '../../../shared/models/configuracion-insumos.validator';
import { PesoPipe } from '../../../shared/pipes/peso.pipe';
import { ToastService } from '../../../shared/services/toast.service';
import { formatearValorInsumo, parsearValorInsumo } from '../domain/formato-insumo';
import { agruparInsumos } from '../domain/grupos-insumo';
import { InsumosStore } from '../stores/insumos.store';

type InsumoForm = FormGroup<{
  valor: FormControl<ValorInsumo>;
}>;

interface CostoDerivado {
  readonly etiqueta: string;
  readonly valor: number;
  readonly decimales: number;
}

@Component({
  selector: 'app-configuracion-insumos-page',
  standalone: true,
  imports: [ReactiveFormsModule, PesoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .grupo-insumo th { padding-top: 1.1rem; background: var(--brand-soft); color: var(--brand-deep); font-size: 0.82rem; }
    .data-table tr.grupo-insumo:hover { background: transparent; }
    /* En 375px el input quedaba en "$ 5" para 59.000: ancho minimo y la tabla scrollea en su tarjeta. */
    .celda-valor-insumo { min-width: 9.5rem; }
    .costos-derivados { display: grid; gap: 1rem; margin-top: 1rem; }
    .costos-derivados h2 { margin: 0.15rem 0 0.25rem; font-size: 1.2rem; }
    .costos-derivados-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem; margin: 0; }
    .costo-derivado { display: grid; gap: 0.2rem; padding: 0.75rem 0.9rem; border-radius: 0.9rem; background: rgba(91, 56, 176, 0.07); }
    .costo-derivado dt { font-size: 0.82rem; color: #4b3c76; }
    .costo-derivado dd { margin: 0; font-size: 1.15rem; font-weight: 700; color: var(--brand-deep); }
  `,
  template: `
    <section class="page-header">
      <div>
        <p class="eyebrow">Configuracion</p>
        <h1>Insumos</h1>
        <p class="page-description">Costos, márgenes y datos del mensaje que usan el cotizador y el precio sugerido de cada libro.</p>
      </div>
    </section>

    @if (store.faltantes().length > 0 && store.insumos().length > 0) {
      <div class="card note-card stack-compact" role="status">
        <strong class="warning-text">Faltan {{ store.faltantes().length }} datos de configuración</strong>
        <p class="caption">El cotizador los toma como 0 hasta que se carguen: {{ store.faltantes().join(', ') }}. Hay que ejecutar la actualización de la base (migracion_cotizador.sql).</p>
      </div>
    }

    <section class="card table-card">
      @if (store.cargando() && store.insumos().length === 0) {
        <div class="stack">
          @for (item of skeletonRows; track item) {
            <div class="card suggested-price-skeleton">
              <div class="skeleton-line skeleton-title"></div>
              <div class="skeleton-line skeleton-detail"></div>
            </div>
          }
        </div>
      } @else if (store.error() && store.insumos().length === 0) {
        <div class="stack-compact">
          <p class="text-danger">No se pudieron cargar los insumos.</p>
          <button type="button" class="secondary-button" (click)="store.cargar()">Reintentar</button>
        </div>
      } @else {
        <table class="data-table compact-table">
          <thead>
            <tr>
              <th>Insumo</th>
              <th>Valor actual</th>
              <th>Unidad</th>
              <th>Accion</th>
            </tr>
          </thead>
          @for (grupo of grupos(); track grupo.titulo) {
            <tbody>
              <tr class="grupo-insumo">
                <th colspan="4" scope="colgroup">{{ grupo.titulo }}</th>
              </tr>
              @for (insumo of grupo.insumos; track insumo.id) {
                <tr [formGroup]="obtenerFormulario(insumo)">
                  <td>
                    <strong>{{ insumo.descripcion }}</strong>
                    <div class="caption">{{ insumo.clave }}</div>
                  </td>
                  <td class="celda-valor-insumo">
                    @switch (insumo.tipo) {
                      @case ('dinero') {
                        <div class="input-with-prefix">
                          <span class="input-prefix">$</span>
                          <input type="text" inputmode="numeric" [attr.aria-label]="insumo.descripcion" [value]="valorFormateado(insumo)" (input)="actualizarValor(insumo, $any($event.target).value)" />
                        </div>
                      }
                      @case ('porcentaje') {
                        <div class="input-with-suffix">
                          <input type="text" inputmode="decimal" [attr.aria-label]="insumo.descripcion" [value]="valorFormateado(insumo)" (input)="actualizarValor(insumo, $any($event.target).value)" />
                          <span class="input-suffix">%</span>
                        </div>
                      }
                      @case ('texto') {
                        <input type="text" maxlength="60" [attr.aria-label]="insumo.descripcion" [value]="valorFormateado(insumo)" (input)="actualizarValor(insumo, $any($event.target).value)" />
                      }
                      @default {
                        <input type="text" [attr.inputmode]="reglaDe(insumo).entero ? 'numeric' : 'decimal'" [attr.aria-label]="insumo.descripcion" [value]="valorFormateado(insumo)" (input)="actualizarValor(insumo, $any($event.target).value)" />
                      }
                    }
                    @if (mensajeError(insumo); as mensaje) {
                      <small class="field-error">{{ mensaje }}</small>
                    }
                  </td>
                  <td>{{ unidad(insumo) }}</td>
                  <td>
                    <button
                      type="button"
                      class="primary-button"
                      [disabled]="obtenerFormulario(insumo).invalid || store.cargando()"
                      (click)="guardar(insumo)"
                    >
                      Guardar
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          }
        </table>
      }
    </section>

    @if (store.insumos().length > 0) {
      <section class="card costos-derivados" aria-labelledby="titulo-costos-derivados">
        <div>
          <p class="eyebrow">Solo lectura</p>
          <h2 id="titulo-costos-derivados">Costos unitarios derivados</h2>
          <p class="caption">Se recalculan al guardar cada insumo. El toner es por cara impresa en A4; en A5 se usa la mitad.</p>
        </div>
        <dl class="costos-derivados-grid">
          @for (costo of costosDerivados(); track costo.etiqueta) {
            <div class="costo-derivado">
              <dt>{{ costo.etiqueta }}</dt>
              <dd>{{ costo.valor | peso: costo.decimales }}</dd>
            </div>
          }
        </dl>
      </section>
    }
  `,
})
export class ConfiguracionInsumosPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly toastService = inject(ToastService);

  protected readonly store = inject(InsumosStore);
  protected readonly formularios = new Map<string, InsumoForm>();
  protected readonly skeletonRows = Array.from({ length: 4 }, (_, index) => index);

  protected readonly grupos = computed(() => agruparInsumos(this.store.insumos()));

  protected readonly costosDerivados = computed<CostoDerivado[]>(() => {
    const costos = this.store.costos();
    return [
      { etiqueta: 'Hoja A4', valor: costos.hoja, decimales: 2 },
      { etiqueta: 'Espiral', valor: costos.espiral, decimales: 0 },
      { etiqueta: 'Tapa A4', valor: costos.tapaA4, decimales: 0 },
      { etiqueta: 'Tapa A5', valor: costos.tapaA5, decimales: 0 },
      { etiqueta: 'Cara B/N', valor: costos.caraBn, decimales: 2 },
      { etiqueta: 'Cara con poco color', valor: costos.caraPocoColor, decimales: 2 },
      { etiqueta: 'Cara color pleno', valor: costos.caraColorPleno, decimales: 2 },
    ];
  });

  constructor() {
    effect(() => {
      void this.store.cargar();
    });

    effect(() => {
      for (const insumo of this.store.insumos()) {
        const form = this.obtenerFormulario(insumo);
        if (!form.dirty) {
          form.patchValue({ valor: insumo.tipo === 'texto' ? insumo.valorTexto ?? '' : insumo.valor });
        }
      }
    });
  }

  protected obtenerFormulario(insumo: ConfiguracionInsumo): InsumoForm {
    const existente = this.formularios.get(insumo.id);
    if (existente) {
      return existente;
    }

    const inicial: ValorInsumo = insumo.tipo === 'texto' ? '' : 0;
    const creado = this.formBuilder.nonNullable.group({
      valor: [inicial, [(control: AbstractControl) => this.validar(insumo, control)]],
    });
    this.formularios.set(insumo.id, creado);
    return creado;
  }

  protected reglaDe(insumo: ConfiguracionInsumo) {
    return reglaDeInsumo(insumo.clave);
  }

  protected unidad(insumo: ConfiguracionInsumo): string {
    return resolverUnidad(insumo.unidad, this.store.insumos());
  }

  protected valorFormateado(insumo: ConfiguracionInsumo): string {
    return formatearValorInsumo(this.obtenerFormulario(insumo).controls.valor.value, this.reglaDe(insumo));
  }

  protected actualizarValor(insumo: ConfiguracionInsumo, texto: string): void {
    const control = this.obtenerFormulario(insumo).controls.valor;
    control.setValue(parsearValorInsumo(texto, this.reglaDe(insumo)));
    control.markAsDirty();
  }

  protected mensajeError(insumo: ConfiguracionInsumo): string | null {
    const control = this.obtenerFormulario(insumo).controls.valor;
    return control.dirty ? (control.errors?.['insumo'] as string | undefined) ?? null : null;
  }

  protected async guardar(insumo: ConfiguracionInsumo): Promise<void> {
    const form = this.obtenerFormulario(insumo);
    const validado = validarValorInsumo(insumo.clave, form.getRawValue().valor);
    if (!validado.ok) {
      form.markAllAsTouched();
      return;
    }

    try {
      await this.store.actualizarInsumo(insumo.id, validado.valor);
      form.markAsPristine();
      this.toastService.success('Insumo actualizado correctamente.');
    } catch {
      this.toastService.error(this.store.error() ?? 'No se pudo actualizar el insumo.');
    }
  }

  private validar(insumo: ConfiguracionInsumo, control: AbstractControl): ValidationErrors | null {
    const resultado = validarValorInsumo(insumo.clave, control.value as ValorInsumo);
    return resultado.ok ? null : { insumo: resultado.mensaje };
  }
}
