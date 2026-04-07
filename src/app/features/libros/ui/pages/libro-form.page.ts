import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { startWith } from 'rxjs';
import { PesoPipe } from '../../../../shared/pipes/peso.pipe';
import { ToastService } from '../../../../shared/services/toast.service';
import { calcularPrecioSugerido } from '../../../../shared/utils/calcular-precio-sugerido.util';
import { InsumosStore } from '../../../configuracion/stores/insumos.store';
import { LibrosFacade } from '../../state/libros.facade';

@Component({
  selector: 'app-libro-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PesoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-header">
      <div>
        <p class="eyebrow">Catálogo</p>
        <h1>{{ esEdicion() ? 'Editar libro' : 'Nuevo libro' }}</h1>
      </div>
      <a routerLink="/libros" class="secondary-button">Volver</a>
    </section>

    <form class="card form-grid" [formGroup]="form" (ngSubmit)="guardar()">
      <label class="field">
        <span>Título</span>
        <input type="text" formControlName="titulo" [class.input-invalid]="mostrarError('titulo')" />
        @if (mostrarError('titulo')) {
          <small class="field-error">{{ mensajeErrorTitulo() }}</small>
        }
      </label>

      <label class="field">
        <span>Precio</span>
        <input type="number" formControlName="precio" [class.input-invalid]="mostrarError('precio')" />
        @if (mostrarError('precio')) {
          <small class="field-error">Ingresá un precio mayor que 0.</small>
        }
      </label>

      <label class="field">
        <span>Páginas</span>
        <input type="number" formControlName="paginas" [class.input-invalid]="mostrarError('paginas')" />
        @if (mostrarError('paginas')) {
          <small class="field-error">Ingresá al menos 2 páginas para calcular hojas correctamente.</small>
        }
      </label>

      <label class="field">
        <span>Margen de ganancia</span>
        <div class="input-with-suffix">
          <input type="number" formControlName="margenGanancia" [class.input-invalid]="mostrarError('margenGanancia')" />
          <span class="input-suffix">%</span>
        </div>
        @if (mostrarError('margenGanancia')) {
          <small class="field-error">Ingresá un margen entre 0 y 500.</small>
        }
      </label>

      <label class="field">
        <span>Observaciones</span>
        <textarea rows="2" formControlName="observaciones"></textarea>
      </label>

      @if (esEdicion()) {
        <label class="field checkbox-field">
          <input type="checkbox" formControlName="activo" />
          <span>Libro activo para nuevas cargas</span>
        </label>
      }

      <div class="card note-card">
        <strong>Hojas por ejemplar: {{ hojas() }}</strong>
        <p class="caption warning-text">Los pedidos existentes mantienen su precio original aunque cambies este valor.</p>
      </div>

      @if (hojas() > 0 && form.controls.precio.value > 0) {
        <div class="card suggested-price-card">
          <p class="eyebrow">Referencia de cobro</p>
          <strong>{{ precioPorHoja() | peso }}</strong>
          <p class="caption">Estas cobrando {{ form.controls.precio.value | peso }} por {{ hojas() }} hojas fisicas. Precio por hoja: {{ precioPorHoja() | peso }}.</p>
        </div>
      }

      @if (insumosStore.cargando()) {
        <div class="card suggested-price-card suggested-price-skeleton">
          <div class="skeleton-line skeleton-title"></div>
          <div class="skeleton-line skeleton-detail"></div>
        </div>
      } @else if (resultadoCosto().hojas > 0) {
        <div class="card suggested-price-card">
          <p class="eyebrow">Precio sugerido</p>
          <strong>{{ precioSugeridoRedondeado() | peso }}</strong>
          <p class="caption">Costo base: {{ resultadoCosto().costoBase | peso }} · Hojas físicas: {{ resultadoCosto().hojas }}</p>
          <button type="button" class="secondary-button" (click)="usarPrecioSugerido()">Usar precio sugerido</button>
        </div>
      }

      <button type="submit" class="primary-button" [disabled]="form.invalid">{{ esEdicion() ? 'Guardar cambios' : 'Guardar' }}</button>
    </form>
  `,
})
export class LibroFormPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly facade = inject(LibrosFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  protected readonly insumosStore = inject(InsumosStore);
  protected readonly libroCargado = signal(false);
  protected readonly libroId = computed(() => this.route.snapshot.paramMap.get('id'));
  protected readonly esEdicion = computed(() => Boolean(this.libroId()));

  protected readonly form = this.formBuilder.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(3)]],
    precio: [0, [Validators.required, Validators.min(1)]],
    paginas: [2, [Validators.required, Validators.min(2)]],
    margenGanancia: [156, [Validators.required, Validators.min(0), Validators.max(500)]],
    observaciones: [''],
    activo: [true],
  });

  private readonly paginas = toSignal(
    this.form.controls.paginas.valueChanges.pipe(startWith(this.form.controls.paginas.value)),
    { initialValue: this.form.controls.paginas.value },
  );
  private readonly margenGanancia = toSignal(
    this.form.controls.margenGanancia.valueChanges.pipe(startWith(this.form.controls.margenGanancia.value)),
    { initialValue: this.form.controls.margenGanancia.value },
  );

  protected readonly hojas = computed(() => this.facade.hojasPorLibro(this.paginas()));
  protected readonly resultadoCosto = computed(() =>
    calcularPrecioSugerido(this.paginas(), this.margenGanancia(), this.insumosStore.costosUnitarios()),
  );
  protected readonly precioSugeridoRedondeado = computed(() => Math.round(this.resultadoCosto().precioSugerido));
  protected readonly precioPorHoja = computed(() => {
    const hojas = this.hojas();
    const precio = this.form.controls.precio.value;
    if (hojas <= 0 || precio <= 0) {
      return 0;
    }

    return precio / hojas;
  });

  constructor() {
    effect(() => {
      void this.facade.cargar();
    });

    effect(() => {
      void this.insumosStore.cargar();
    });

    effect(() => {
      const id = this.libroId();
      if (!id) {
        this.libroCargado.set(false);
        return;
      }

      const libro = this.facade.obtenerPorId(id);
      if (!libro || this.libroCargado()) {
        return;
      }

      this.form.patchValue({
        titulo: libro.titulo,
        precio: libro.precio,
        paginas: libro.paginas,
        margenGanancia: libro.margenGanancia,
        observaciones: libro.observaciones ?? '',
        activo: libro.activo,
      });
      this.libroCargado.set(true);
    });
  }

  protected mostrarError(campo: 'titulo' | 'precio' | 'paginas' | 'margenGanancia'): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  protected mensajeErrorTitulo(): string {
    const control = this.form.controls.titulo;
    if (control.hasError('required')) {
      return 'Ingresá el título del libro.';
    }

    return 'El título debe tener al menos 3 caracteres.';
  }

  protected usarPrecioSugerido(): void {
    this.form.controls.precio.setValue(this.precioSugeridoRedondeado());
    this.form.controls.precio.markAsDirty();
  }

  protected async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    await this.facade.guardar({
      ...raw,
      observaciones: raw.observaciones.trim() || null,
    }, this.libroId() ?? undefined);
    this.toastService.success(this.esEdicion() ? 'Libro actualizado correctamente.' : 'Libro creado correctamente.');
    await this.router.navigateByUrl('/libros');
  }
}
