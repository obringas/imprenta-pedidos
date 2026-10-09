import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, startWith } from 'rxjs';
import {
  ETIQUETA_TIPO_IMPRESION,
  TAMANIO_IMPRESION,
  TamanioImpresion,
  TIPO_IMPRESION,
  TIPO_IMPRESION_POR_DEFECTO,
  TipoImpresion,
  TIPOS_IMPRESION,
} from '../../../../shared/constants/negocio.constants';
import { AppError } from '../../../../shared/errors/app-error';
import { ToastService } from '../../../../shared/services/toast.service';
import { InsumosStore } from '../../../configuracion/stores/insumos.store';
import { cotizarLibro } from '../../../cotizador/domain/cotizar-libro';
import { MARGEN_LIBRO_MAXIMO } from '../../domain/libro.validator';
import { LibrosFacade } from '../../state/libros.facade';
import { PrecioSugeridoCardComponent } from '../components/precio-sugerido-card.component';

type CampoValidado = 'titulo' | 'precioA4' | 'precioA5' | 'paginas' | 'margenGanancia';

@Component({
  selector: 'app-libro-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PrecioSugeridoCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-header">
      <div>
        <p class="eyebrow">Catálogo</p>
        <h1>{{ esEdicion() ? 'Editar libro' : 'Nuevo libro' }}</h1>
      </div>
      <a [routerLink]="rutaVolver()" class="secondary-button">Volver</a>
    </section>

    <form class="card form-grid" [formGroup]="form" (ngSubmit)="guardar()">
      <label class="field">
        <span>Título</span>
        <input type="text" formControlName="titulo" [class.input-invalid]="mostrarError('titulo')" />
        @if (mostrarError('titulo')) {
          <small class="field-error">{{ mensajeErrorTitulo() }}</small>
        }
      </label>

      <div class="form-row compact-row">
        <label class="field">
          <span>Precio A4</span>
          <input type="number" inputmode="numeric" formControlName="precioA4" [class.input-invalid]="mostrarError('precioA4')" />
          @if (mostrarError('precioA4')) {
            <small class="field-error">Ingresá el precio A4, mayor que 0.</small>
          }
        </label>

        <label class="field">
          <span>Precio A5</span>
          <input type="number" inputmode="numeric" formControlName="precioA5" [class.input-invalid]="mostrarError('precioA5')" />
          @if (mostrarError('precioA5')) {
            <small class="field-error">Ingresá el precio A5, mayor que 0.</small>
          }
        </label>
      </div>

      <label class="field">
        <span>Páginas</span>
        <input type="number" formControlName="paginas" [class.input-invalid]="mostrarError('paginas')" />
        @if (mostrarError('paginas')) {
          <small class="field-error">Ingresá al menos 2 páginas para calcular hojas correctamente.</small>
        }
      </label>

      <div class="form-row compact-row">
        <label class="field">
          <span>Tipo de impresión</span>
          <select formControlName="tipoImpresion">
            @for (tipo of tiposImpresion; track tipo) {
              <option [value]="tipo">{{ etiquetaTipo[tipo] }}</option>
            }
          </select>
        </label>

        @if (esMixto()) {
          <label class="field">
            <span>Páginas a color</span>
            <input type="number" inputmode="numeric" formControlName="paginasColor" [class.input-invalid]="errorPaginasColor() !== null && form.controls.paginasColor.touched" />
            @if (errorPaginasColor() !== null && form.controls.paginasColor.touched) {
              <small class="field-error">{{ errorPaginasColor() }}</small>
            } @else {
              <small class="caption">El resto va en blanco y negro.</small>
            }
          </label>
        }
      </div>

      <label class="field">
        <span>Margen de ganancia</span>
        <div class="input-with-suffix">
          <input type="number" formControlName="margenGanancia" [class.input-invalid]="mostrarError('margenGanancia')" />
          <span class="input-suffix">%</span>
        </div>
        @if (mostrarError('margenGanancia')) {
          <small class="field-error">Ingresá un margen entre 0 y {{ margenMaximo }}.</small>
        } @else {
          <small class="caption">Sobre el costo. Es el margen con el que se calculan los precios sugeridos.</small>
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

      @if (insumosStore.cargando() && insumosStore.insumos().length === 0) {
        <div class="card suggested-price-card suggested-price-skeleton">
          <div class="skeleton-line skeleton-title"></div>
          <div class="skeleton-line skeleton-detail"></div>
        </div>
      } @else if (insumosStore.faltantes().length > 0) {
        <div class="card note-card">
          <strong class="warning-text">Precio sugerido no disponible</strong>
          <p class="caption">Faltan datos en Configuración &gt; Insumos para calcular el costo.</p>
        </div>
      } @else if (hojas() > 0) {
        <div class="form-row compact-row">
          <app-precio-sugerido-card [tamanio]="tamanioA4" [cotizacion]="cotizacionA4()" (usar)="usarPrecioSugerido(tamanioA4, $event)" />
          <app-precio-sugerido-card [tamanio]="tamanioA5" [cotizacion]="cotizacionA5()" (usar)="usarPrecioSugerido(tamanioA5, $event)" />
        </div>
      }

      <button type="submit" class="primary-button">{{ esEdicion() ? 'Guardar cambios' : 'Guardar' }}</button>
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
  protected readonly tiposImpresion = TIPOS_IMPRESION;
  protected readonly etiquetaTipo = ETIQUETA_TIPO_IMPRESION;
  protected readonly tamanioA4 = TAMANIO_IMPRESION.A4;
  protected readonly tamanioA5 = TAMANIO_IMPRESION.A5;
  protected readonly margenMaximo = MARGEN_LIBRO_MAXIMO;

  protected readonly form = this.formBuilder.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(3)]],
    precioA4: [0, [Validators.required, Validators.min(1)]],
    precioA5: [0, [Validators.required, Validators.min(1)]],
    paginas: [2, [Validators.required, Validators.min(2)]],
    // Se reemplaza por margen_default cuando cargan los insumos (solo en un libro nuevo).
    margenGanancia: [0, [Validators.required, Validators.min(0), Validators.max(MARGEN_LIBRO_MAXIMO)]],
    tipoImpresion: [TIPO_IMPRESION_POR_DEFECTO as TipoImpresion],
    paginasColor: [0, [Validators.min(0)]],
    observaciones: [''],
    activo: [true],
  });

  protected readonly paginas = this.valorDe(this.form.controls.paginas);
  private readonly margenGanancia = this.valorDe(this.form.controls.margenGanancia);
  private readonly tipoImpresion = this.valorDe(this.form.controls.tipoImpresion);
  private readonly paginasColor = this.valorDe(this.form.controls.paginasColor);

  protected readonly hojas = computed(() => this.facade.hojasPorLibro(this.paginas()));
  protected readonly esMixto = computed(() => this.tipoImpresion() === TIPO_IMPRESION.MIXTO);
  protected readonly cotizacionA4 = computed(() => this.cotizar(TAMANIO_IMPRESION.A4));
  protected readonly cotizacionA5 = computed(() => this.cotizar(TAMANIO_IMPRESION.A5));

  protected readonly errorPaginasColor = computed(() => {
    if (!this.esMixto()) {
      return null;
    }
    if (this.paginasColor() < 1) {
      return 'Indicá cuántas páginas van a color.';
    }
    return this.paginasColor() > this.paginas() ? 'No pueden ser más que las páginas del libro.' : null;
  });

  /** Si se llega desde el cotizador, se vuelve ahi con el libro nuevo tildado. */
  private readonly vieneDelCotizador = this.route.snapshot.queryParamMap.get('volver') === 'cotizador';
  protected readonly rutaVolver = computed(() => (this.vieneDelCotizador ? '/cotizador' : '/libros'));

  constructor() {
    effect(() => {
      void this.facade.cargar();
    });

    effect(() => {
      void this.insumosStore.cargar();
    });

    effect(() => {
      const margenDefault = this.insumosStore.margenDefault();
      const control = this.form.controls.margenGanancia;
      if (!this.esEdicion() && !control.dirty && this.insumosStore.insumos().length > 0) {
        control.setValue(margenDefault);
      }
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
        precioA4: libro.precioA4 ?? 0,
        precioA5: libro.precioA5,
        paginas: libro.paginas,
        margenGanancia: libro.margenGanancia,
        tipoImpresion: libro.tipoImpresion,
        paginasColor: libro.paginasColor,
        observaciones: libro.observaciones ?? '',
        activo: libro.activo,
      });
      // Libro anterior a A4/A5: se marca el campo para que se vea que falta.
      if (libro.precioA4 === null) {
        this.form.controls.precioA4.markAsTouched();
      }
      this.libroCargado.set(true);
    });
  }

  protected mostrarError(campo: CampoValidado): boolean {
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

  protected usarPrecioSugerido(tamanio: TamanioImpresion, precio: number): void {
    const control = tamanio === TAMANIO_IMPRESION.A4 ? this.form.controls.precioA4 : this.form.controls.precioA5;
    control.setValue(precio);
    control.markAsDirty();
  }

  protected async guardar(): Promise<void> {
    if (this.form.invalid || this.errorPaginasColor() !== null) {
      this.form.markAllAsTouched();
      this.toastService.error('Revisa los campos obligatorios del libro antes de guardar.');
      return;
    }

    try {
      const raw = this.form.getRawValue();
      const libro = await this.facade.guardar(
        {
          ...raw,
          // Fuera de mixto las paginas a color no cuentan: no se guardan.
          paginasColor: raw.tipoImpresion === TIPO_IMPRESION.MIXTO ? raw.paginasColor : 0,
          observaciones: raw.observaciones.trim() || null,
        },
        this.libroId() ?? undefined,
      );
      this.toastService.success(this.esEdicion() ? 'Libro actualizado correctamente.' : 'Libro creado correctamente.');
      await this.volver(libro.id);
    } catch (error) {
      this.toastService.error(error instanceof AppError && error.codigo === 'VALIDATION' ? error.mensaje : 'No se pudo guardar el libro.');
    }
  }

  private async volver(libroId: string): Promise<void> {
    if (this.vieneDelCotizador) {
      await this.router.navigate(['/cotizador'], { queryParams: { libro: libroId } });
      return;
    }

    await this.router.navigateByUrl('/libros');
  }

  private cotizar(tamanio: TamanioImpresion) {
    return cotizarLibro(
      {
        paginas: this.paginas(),
        tipoImpresion: this.tipoImpresion(),
        paginasColor: this.paginasColor(),
        tamanio,
        margenGanancia: this.margenGanancia(),
      },
      this.insumosStore.costos(),
      this.insumosStore.reglasPrecio(),
    );
  }

  private valorDe<T>(control: { value: T; valueChanges: Observable<T> }) {
    return toSignal(control.valueChanges.pipe(startWith(control.value)), { initialValue: control.value });
  }
}
