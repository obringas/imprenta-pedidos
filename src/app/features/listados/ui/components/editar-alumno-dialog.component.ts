import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { PedidoDetalle } from '../../../pedidos/domain/pedido.model';
import { etiquetaCurso, parsearCurso } from '../../../../shared/utils/curso.util';

export interface CorreccionAlumno {
  readonly alumno: string;
  readonly division: string | null;
}

const LARGO_MAXIMO_DIVISION = 10;

/**
 * Edicion rapida desde el listado por curso. Solo expone alumno y division,
 * que es lo que la pantalla muestra y lo que suele venir mal de una carga
 * masiva. Para el resto del pedido esta la pantalla de detalle.
 */
@Component({
  selector: 'app-editar-alumno-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (pedido(); as pedidoActual) {
      <div class="dialog-backdrop" (click)="cancelado.emit()">
        <section
          class="dialog-card"
          role="dialog"
          aria-modal="true"
          aria-label="Editar datos del alumno"
          (click)="$event.stopPropagation()"
          (keydown.escape)="cancelado.emit()"
        >
          <p class="eyebrow">Edición rápida</p>
          <h2>Corregir datos</h2>
          <p class="page-description">{{ pedidoActual.libroTitulo }}</p>

          <div class="form-grid">
            <label class="field">
              <span>Alumno</span>
              <input
                #campoAlumno
                type="text"
                autocapitalize="words"
                [value]="alumno()"
                (input)="alumno.set($any($event.target).value)"
                [class.input-invalid]="!alumnoValido()"
              />
              @if (!alumnoValido()) {
                <small class="field-error">Ingresá al menos 2 caracteres.</small>
              }
            </label>

            <label class="field">
              <span>División</span>
              <input
                type="text"
                autocapitalize="characters"
                placeholder="6A"
                [value]="division()"
                (input)="division.set($any($event.target).value)"
                [class.input-invalid]="!divisionValida()"
              />
              @if (!divisionValida()) {
                <small class="field-error">Máximo {{ largoMaximoDivision }} caracteres.</small>
              } @else {
                <small class="caption">Se va a leer como: {{ vistaPreviaCurso() }}</small>
              }
            </label>
          </div>

          <div class="dialog-actions">
            <button type="button" class="secondary-button" (click)="cancelado.emit()">Cancelar</button>
            <button type="button" class="primary-button" [disabled]="!puedeGuardar()" (click)="guardar()">
              {{ guardando() ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </section>
      </div>
    }
  `,
})
export class EditarAlumnoDialogComponent {
  readonly pedido = input<PedidoDetalle | null>(null);
  readonly guardando = input(false);

  readonly confirmado = output<CorreccionAlumno>();
  readonly cancelado = output<void>();

  protected readonly largoMaximoDivision = LARGO_MAXIMO_DIVISION;
  protected readonly alumno = signal('');
  protected readonly division = signal('');

  protected readonly alumnoValido = computed(() => this.alumno().trim().length >= 2);
  protected readonly divisionValida = computed(() => this.division().trim().length <= LARGO_MAXIMO_DIVISION);
  protected readonly puedeGuardar = computed(
    () => this.alumnoValido() && this.divisionValida() && !this.guardando(),
  );

  protected readonly vistaPreviaCurso = computed(() => {
    const valor = this.division().trim();
    return valor ? etiquetaCurso(parsearCurso(valor)) : 'Sin grado';
  });

  constructor() {
    // Cada vez que se abre para otro pedido, el formulario arranca con sus datos.
    effect(() => {
      const actual = this.pedido();
      if (!actual) return;

      this.alumno.set(actual.alumno);
      this.division.set(actual.division ?? '');
    });
  }

  protected guardar(): void {
    if (!this.puedeGuardar()) return;

    this.confirmado.emit({
      alumno: this.alumno().trim(),
      division: this.division().trim() || null,
    });
  }
}
