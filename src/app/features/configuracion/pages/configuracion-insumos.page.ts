import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService } from '../../../shared/services/toast.service';
import { InsumosStore } from '../stores/insumos.store';

type InsumoForm = FormGroup<{
  valor: FormControl<number>;
}>;

@Component({
  selector: 'app-configuracion-insumos-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-header">
      <div>
        <p class="eyebrow">Configuracion</p>
        <h1>Insumos</h1>
        <p class="page-description">Edita los costos base que se usan para calcular el precio sugerido de cada libro.</p>
      </div>
    </section>

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
          <tbody>
            @for (insumo of store.insumos(); track insumo.id) {
              <tr [formGroup]="obtenerFormulario(insumo.id)">
                <td>
                  <strong>{{ insumo.descripcion }}</strong>
                  <div class="caption">{{ insumo.clave }}</div>
                </td>
                <td>
                  @if (esMonetario(insumo.unidad)) {
                    <div class="input-with-prefix">
                      <span class="input-prefix">$</span>
                      <input
                        type="text"
                        inputmode="numeric"
                        [value]="valorFormateado(insumo.id)"
                        (input)="actualizarValor(insumo.id, $any($event.target).value)"
                      />
                    </div>
                  } @else {
                    <input
                      type="text"
                      inputmode="numeric"
                      [value]="valorFormateado(insumo.id)"
                      (input)="actualizarValor(insumo.id, $any($event.target).value)"
                    />
                  }
                </td>
                <td>{{ insumo.unidad }}</td>
                <td>
                  <button
                    type="button"
                    class="primary-button"
                    [disabled]="obtenerFormulario(insumo.id).invalid || store.cargando()"
                    (click)="guardar(insumo.id)"
                  >
                    Guardar
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
})
export class ConfiguracionInsumosPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly toastService = inject(ToastService);

  protected readonly store = inject(InsumosStore);
  protected readonly formularios = new Map<string, InsumoForm>();
  protected readonly skeletonRows = Array.from({ length: 4 }, (_, index) => index);

  constructor() {
    effect(() => {
      void this.store.cargar();
    });

    effect(() => {
      for (const insumo of this.store.insumos()) {
        const form = this.obtenerFormulario(insumo.id);
        if (!form.dirty) {
          form.patchValue({ valor: insumo.valor });
        }
      }
    });
  }

  protected obtenerFormulario(id: string): InsumoForm {
    const existente = this.formularios.get(id);
    if (existente) {
      return existente;
    }

    const creado = this.formBuilder.nonNullable.group({
      valor: [0, [Validators.required, Validators.min(0)]],
    });
    this.formularios.set(id, creado);
    return creado;
  }

  protected esMonetario(unidad: string): boolean {
    return unidad.toUpperCase().includes('ARS');
  }

  protected valorFormateado(id: string): string {
    const valor = this.obtenerFormulario(id).controls.valor.value;
    return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(valor);
  }

  protected actualizarValor(id: string, texto: string): void {
    const digitos = texto.replace(/\D/g, '');
    const valor = digitos ? Number(digitos) : 0;
    this.obtenerFormulario(id).controls.valor.setValue(valor);
  }

  protected async guardar(id: string): Promise<void> {
    const form = this.obtenerFormulario(id);
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    try {
      await this.store.actualizarInsumo(id, form.getRawValue().valor);
      form.markAsPristine();
      this.toastService.success('Insumo actualizado correctamente.');
    } catch {
      this.toastService.error(this.store.error() ?? 'No se pudo actualizar el insumo.');
    }
  }
}
