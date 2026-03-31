import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '../../../../shared/services/toast.service';
import { LibrosFacade } from '../../state/libros.facade';

@Component({
  selector: 'app-libro-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
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

  protected readonly libroCargado = signal(false);
  protected readonly libroId = computed(() => this.route.snapshot.paramMap.get('id'));
  protected readonly esEdicion = computed(() => Boolean(this.libroId()));

  protected readonly form = this.formBuilder.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(3)]],
    precio: [0, [Validators.required, Validators.min(1)]],
    paginas: [2, [Validators.required, Validators.min(2)]],
    observaciones: [''],
    activo: [true],
  });

  protected readonly hojas = computed(() => this.facade.hojasPorLibro(this.form.controls.paginas.value));

  constructor() {
    effect(() => {
      void this.facade.cargar();
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
        observaciones: libro.observaciones ?? '',
        activo: libro.activo,
      });
      this.libroCargado.set(true);
    });
  }

  protected mostrarError(campo: 'titulo' | 'precio' | 'paginas'): boolean {
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
