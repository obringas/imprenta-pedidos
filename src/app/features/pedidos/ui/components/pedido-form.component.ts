import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ESTADO_ENTREGA,
  ESTADO_IMPRESION,
  ESTADO_PAGO,
  EstadoEntrega,
  EstadoImpresion,
  EstadoPago,
} from '../../../../shared/constants/negocio.constants';
import { EstadoBadgeComponent } from '../../../../shared/components/estado-badge.component';
import { PesoPipe } from '../../../../shared/pipes/peso.pipe';
import { LibrosFacade } from '../../../libros/state/libros.facade';
import { PedidoDetalle } from '../../domain/pedido.model';
import { calcularSaldo, determinarEstadoGeneral } from '../../domain/estado.utils';

@Component({
  selector: 'app-pedido-form',
  standalone: true,
  imports: [ReactiveFormsModule, PesoPipe, EstadoBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="card form-grid pedido-form-compact" [class.form-card-detail]="modoDetalle()" [class.pedido-form-create]="!modoDetalle()" [formGroup]="form" (ngSubmit)="submit()">
      <div class="form-row compact-row create-top-grid">
        <label class="field">
          <span>Libro</span>
          <select formControlName="libroId" [class.input-invalid]="mostrarError('libroId')">
            @for (libro of librosFacade.activos(); track libro.id) {
              <option [value]="libro.id">{{ libro.titulo }}</option>
            }
          </select>
          @if (mostrarError('libroId')) {
            <small class="field-error">Elegi un libro para crear el pedido.</small>
          }
        </label>

        <label class="field">
          <span>Alumno</span>
          <input type="text" formControlName="alumno" autocapitalize="words" [class.input-invalid]="mostrarError('alumno')" />
          @if (mostrarError('alumno')) {
            <small class="field-error">{{ mensajeErrorAlumno() }}</small>
          }
        </label>
      </div>

      <div class="form-row compact-row create-top-grid">
        <label class="field">
          <span>Division</span>
          <input type="text" formControlName="division" [class.input-invalid]="mostrarError('division')" />
          @if (mostrarError('division')) {
            <small class="field-error">La division debe ser corta para identificar el curso.</small>
          }
        </label>
        <label class="field">
          <span>Precio</span>
          <input type="number" formControlName="precioCobrado" [class.input-invalid]="mostrarError('precioCobrado')" />
          @if (mostrarError('precioCobrado')) {
            <small class="field-error">Ingresa un precio mayor que 0.</small>
          }
        </label>
      </div>

      <section class="field payment-section">
        <div class="section-inline-header">
          <span>Estado de pago</span>
          @if (!modoDetalle()) {
            <strong [class.text-danger]="saldo() > 0">Saldo {{ saldo() | peso }}</strong>
          }
        </div>

        <div class="segmented-control">
          <button type="button" class="segment-button" [class.segment-button-active]="form.controls.estadoPago.value === ESTADO_PAGO.PAGADO" (click)="setEstadoPago(ESTADO_PAGO.PAGADO)">
            Pagado
          </button>
          <button type="button" class="segment-button" [class.segment-button-active]="form.controls.estadoPago.value === ESTADO_PAGO.PENDIENTE" (click)="setEstadoPago(ESTADO_PAGO.PENDIENTE)">
            Pendiente
          </button>
          <button type="button" class="segment-button" [class.segment-button-active]="form.controls.estadoPago.value === ESTADO_PAGO.SENA" (click)="setEstadoPago(ESTADO_PAGO.SENA)">
            Sena
          </button>
        </div>

        @if (muestraMontoSena()) {
          <div class="conditional-panel">
            <label class="field">
              <span>Monto de sena</span>
              <input type="number" formControlName="montoCobrado" [class.input-invalid]="mostrarError('montoCobrado')" />
              @if (mostrarError('montoCobrado')) {
                <small class="field-error">La sena debe ser mayor que 0 y menor al precio total.</small>
              }
            </label>
          </div>
        } @else {
          <div class="compact-inline-summary">
            <strong>{{ etiquetaPagoRapido() }}</strong>
          </div>
        }
      </section>

      @if (modoDetalle()) {
        <div class="form-row compact-row">
          <label class="field">
            <span>Impresion</span>
            <select formControlName="estadoImpresion">
              <option [value]="ESTADO_IMPRESION.PENDIENTE">Pendiente</option>
              <option [value]="ESTADO_IMPRESION.IMPRESO">Impreso</option>
            </select>
          </label>

          <label class="field">
            <span>Entrega</span>
            <select formControlName="estadoEntrega">
              <option [value]="ESTADO_ENTREGA.PENDIENTE">Pendiente</option>
              <option [value]="ESTADO_ENTREGA.ENTREGADO">Entregado</option>
            </select>
            @if (mostrarError('estadoEntrega')) {
              <small class="field-error">No podes marcar como entregado un pedido que todavia no fue impreso.</small>
            }
          </label>
        </div>
      }

      <label class="field">
        <span>Observaciones</span>
        <textarea [attr.rows]="modoDetalle() ? 2 : 1" formControlName="observaciones" [class.input-invalid]="mostrarError('observaciones')"></textarea>
        @if (mostrarError('observaciones')) {
          <small class="field-error">Las observaciones no pueden superar los 280 caracteres.</small>
        }
      </label>

      @if (modoDetalle()) {
        <div class="card note-card summary-panel">
          <div class="summary-row">
            <strong>Saldo actual</strong>
            <strong>{{ saldo() | peso }}</strong>
          </div>
          <div class="summary-row">
            <span>Estado general</span>
            <app-estado-badge [estado]="estadoGeneralPreview()" />
          </div>
          <div class="summary-row">
            <span>Hojas por libro</span>
            <strong>{{ pedido()?.libroHojas ?? 0 }}</strong>
          </div>
          @if (pedido()?.fechaImpresion) {
            <div class="summary-row">
              <span>Fecha impresion</span>
              <strong>{{ pedido()?.fechaImpresion }}</strong>
            </div>
          }
          @if (pedido()?.fechaPago) {
            <div class="summary-row">
              <span>Fecha pago</span>
              <strong>{{ pedido()?.fechaPago }}</strong>
            </div>
          }
          @if (pedido()?.fechaEntrega) {
            <div class="summary-row">
              <span>Fecha entrega</span>
              <strong>{{ pedido()?.fechaEntrega }}</strong>
            </div>
          }
        </div>
      }

      <div class="submit-bar" [class.submit-bar-sticky]="modoDetalle()">
        <button type="submit" class="primary-button full-width" [disabled]="form.invalid">{{ cta() }}</button>
      </div>
    </form>
  `,
})
export class PedidoFormComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly pedido = input<PedidoDetalle | null>(null);
  readonly cta = input('Guardar');
  readonly modoDetalle = input(false);
  readonly formSubmitted = output<Record<string, unknown>>();

  protected readonly librosFacade = inject(LibrosFacade);
  protected readonly ESTADO_PAGO = ESTADO_PAGO;
  protected readonly ESTADO_IMPRESION = ESTADO_IMPRESION;
  protected readonly ESTADO_ENTREGA = ESTADO_ENTREGA;

  protected readonly form = this.formBuilder.group({
    libroId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    alumno: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    division: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(10)] }),
    precioCobrado: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    estadoPago: new FormControl<EstadoPago>(ESTADO_PAGO.PENDIENTE, { nonNullable: true, validators: [Validators.required] }),
    montoCobrado: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    estadoImpresion: new FormControl<EstadoImpresion>(ESTADO_IMPRESION.PENDIENTE, { nonNullable: true, validators: [Validators.required] }),
    estadoEntrega: new FormControl<EstadoEntrega>(ESTADO_ENTREGA.PENDIENTE, { nonNullable: true, validators: [Validators.required] }),
    observaciones: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(280)] }),
  });

  protected saldo(): number {
    return calcularSaldo(this.form.controls.precioCobrado.value, this.form.controls.montoCobrado.value);
  }

  protected muestraMontoSena(): boolean {
    return this.form.controls.estadoPago.value === ESTADO_PAGO.SENA;
  }

  protected estadoGeneralPreview() {
    return determinarEstadoGeneral({
      id: this.pedido()?.id ?? 'preview',
      libroId: this.form.controls.libroId.value,
      libroTitulo: this.pedido()?.libroTitulo ?? '',
      libroHojas: this.pedido()?.libroHojas ?? 0,
      alumno: this.form.controls.alumno.value,
      division: this.form.controls.division.value || null,
      precioCobrado: this.form.controls.precioCobrado.value,
      estadoImpresion: this.form.controls.estadoImpresion.value,
      fechaImpresion: this.pedido()?.fechaImpresion ?? null,
      estadoEntrega: this.form.controls.estadoEntrega.value,
      fechaEntrega: this.pedido()?.fechaEntrega ?? null,
      estadoPago: this.form.controls.estadoPago.value,
      montoCobrado: this.form.controls.montoCobrado.value,
      fechaPago: this.pedido()?.fechaPago ?? null,
      observaciones: this.form.controls.observaciones.value || null,
      creadoEn: this.pedido()?.creadoEn ?? '',
      actualizadoEn: this.pedido()?.actualizadoEn ?? '',
    });
  }

  protected etiquetaPagoRapido(): string {
    if (this.form.controls.estadoPago.value === ESTADO_PAGO.PAGADO) {
      return `Se cobrara completo: ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(this.form.controls.precioCobrado.value)}`;
    }

    return 'Sin cobro registrado todavia.';
  }

  constructor() {
    effect(() => {
      const pedido = this.pedido();
      if (!pedido) return;

      this.form.patchValue({
        libroId: pedido.libroId,
        alumno: pedido.alumno,
        division: pedido.division ?? '',
        precioCobrado: pedido.precioCobrado,
        estadoPago: pedido.estadoPago,
        montoCobrado: pedido.montoCobrado,
        estadoImpresion: pedido.estadoImpresion,
        estadoEntrega: pedido.estadoEntrega,
        observaciones: pedido.observaciones ?? '',
      });
    });

    effect(() => {
      const primerLibroActivo = this.librosFacade.activos()[0];
      if (!primerLibroActivo || this.pedido() || this.form.controls.libroId.value) return;
      this.form.controls.libroId.setValue(primerLibroActivo.id);
    });

    this.form.controls.libroId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.actualizarPrecioSegunLibro();
    });

    this.form.controls.estadoPago.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.sincronizarMontoConPago();
    });

    this.form.controls.precioCobrado.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.sincronizarMontoConPago();
    });
  }

  protected mostrarError(campo: 'libroId' | 'alumno' | 'division' | 'precioCobrado' | 'montoCobrado' | 'estadoEntrega' | 'observaciones'): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  protected mensajeErrorAlumno(): string {
    const control = this.form.controls.alumno;
    if (control.hasError('required')) {
      return 'Ingresa el nombre del alumno.';
    }

    return 'El nombre del alumno debe tener al menos 2 caracteres.';
  }

  protected setEstadoPago(estado: EstadoPago): void {
    this.form.controls.estadoPago.setValue(estado);
    this.form.controls.montoCobrado.markAsTouched();
    if (estado === ESTADO_PAGO.SENA && this.form.controls.montoCobrado.value === 0) {
      const sugerido = Math.max(Math.round(this.form.controls.precioCobrado.value / 2), 1);
      this.form.controls.montoCobrado.setValue(sugerido);
    }
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const entregaSinImprimir =
      this.modoDetalle() &&
      this.form.controls.estadoEntrega.value === ESTADO_ENTREGA.ENTREGADO &&
      this.form.controls.estadoImpresion.value !== ESTADO_IMPRESION.IMPRESO;

    if (entregaSinImprimir) {
      this.form.controls.estadoEntrega.setErrors({ entregaInvalida: true });
      this.form.controls.estadoEntrega.markAsTouched();
      return;
    }

    if (
      this.form.controls.estadoPago.value === ESTADO_PAGO.SENA &&
      (this.form.controls.montoCobrado.value <= 0 || this.form.controls.montoCobrado.value >= this.form.controls.precioCobrado.value)
    ) {
      this.form.controls.montoCobrado.setErrors({ montoSenaInvalido: true });
      this.form.controls.montoCobrado.markAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.formSubmitted.emit({
      ...raw,
      division: raw.division.trim() || null,
      observaciones: raw.observaciones.trim() || null,
    });
  }

  private actualizarPrecioSegunLibro(): void {
    if (this.pedido()) return;

    const libroId = this.form.controls.libroId.value;
    const libro = this.librosFacade.libros().find((item) => item.id === libroId);
    if (!libro) return;

    this.form.controls.precioCobrado.setValue(libro.precio);
  }

  private sincronizarMontoConPago(): void {
    const estadoPago = this.form.controls.estadoPago.value;
    const precio = this.form.controls.precioCobrado.value;

    if (estadoPago === ESTADO_PAGO.PAGADO) {
      if (this.form.controls.montoCobrado.value !== precio) {
        this.form.controls.montoCobrado.setValue(precio);
      }
      return;
    }

    if (estadoPago === ESTADO_PAGO.PENDIENTE && this.form.controls.montoCobrado.value !== 0) {
      this.form.controls.montoCobrado.setValue(0);
    }
  }
}