import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '../../../../shared/components/empty-state.component';
import { PesoPipe } from '../../../../shared/pipes/peso.pipe';
import { ToastService } from '../../../../shared/services/toast.service';
import { normalizarParaBusqueda } from '../../../../shared/utils/text-normalizer';
import { Libro } from '../../domain/libro.model';
import { LibrosFacade } from '../../state/libros.facade';

type FiltroEstadoLibro = 'activos' | 'inactivos' | 'todos';

@Component({
  selector: 'app-libros-lista-page',
  standalone: true,
  imports: [RouterLink, PesoPipe, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-header">
      <div>
        <p class="eyebrow">Catálogo</p>
        <h1>Libros</h1>
        <p class="page-description">Solo los libros activos aparecen en pedidos e informes.</p>
      </div>
      <a routerLink="/libros/nuevo" class="primary-button desktop-only-inline">Nuevo libro</a>
    </section>

    <section class="card libros-toolbar">
      <label class="field">
        <span class="sr-only">Buscar libro</span>
        <div class="search-field">
          <input
            type="search"
            inputmode="search"
            autocomplete="off"
            placeholder="Buscar por título"
            [value]="busqueda()"
            (input)="actualizarBusqueda($any($event.target).value)"
          />
          @if (busqueda()) {
            <button type="button" class="search-clear" (click)="actualizarBusqueda('')" aria-label="Limpiar búsqueda">×</button>
          }
        </div>
      </label>

      <div class="segmented-control" role="group" aria-label="Filtrar libros por estado">
        @for (opcion of opcionesEstado; track opcion.valor) {
          <button
            type="button"
            class="segment-button"
            [class.segment-button-active]="filtroEstado() === opcion.valor"
            [attr.aria-pressed]="filtroEstado() === opcion.valor"
            (click)="cambiarFiltroEstado(opcion.valor)"
          >
            {{ opcion.etiqueta }} ({{ contarPor(opcion.valor) }})
          </button>
        }
      </div>
    </section>

    @if (librosVisibles().length) {
      <section class="stack">
        @for (libro of librosVisibles(); track libro.id) {
          <article class="card libro-card" [class.libro-card-inactivo]="!libro.activo">
            <div class="libro-card-main">
              <a [routerLink]="['/libros', libro.id]" class="card-title">{{ libro.titulo }}</a>
              <p class="caption">
                {{ libro.precio | peso }} • {{ libro.paginas }} páginas • {{ libro.hojas }} hojas
              </p>
              @if (libro.observaciones) {
                <p class="caption">{{ libro.observaciones }}</p>
              }
            </div>

            <button
              type="button"
              class="estado-toggle"
              [class.estado-toggle-on]="libro.activo"
              [disabled]="facade.cambiandoEstado().has(libro.id)"
              [attr.aria-pressed]="libro.activo"
              [attr.aria-label]="(libro.activo ? 'Desactivar' : 'Activar') + ' ' + libro.titulo"
              (click)="toggleActivo(libro)"
            >
              <span class="estado-toggle-track"><span class="estado-toggle-thumb"></span></span>
              <span class="estado-toggle-label">{{ libro.activo ? 'Activo' : 'Inactivo' }}</span>
            </button>
          </article>
        }
      </section>
    } @else if (facade.libros().length) {
      <app-empty-state
        title="Ningún libro coincide"
        description="Probá con otro título o cambiá el filtro de estado."
      />
    } @else {
      <app-empty-state
        title="Todavía no hay libros cargados"
        description="Agregá el catálogo para habilitar la carga rápida de pedidos."
      />
    }

    <a routerLink="/libros/nuevo" class="fab-button mobile-only-fab" aria-label="Nuevo libro">+</a>
  `,
})
export class LibrosListaPageComponent {
  protected readonly facade = inject(LibrosFacade);
  private readonly toastService = inject(ToastService);

  protected readonly opcionesEstado: readonly { valor: FiltroEstadoLibro; etiqueta: string }[] = [
    { valor: 'activos', etiqueta: 'Activos' },
    { valor: 'inactivos', etiqueta: 'Inactivos' },
    { valor: 'todos', etiqueta: 'Todos' },
  ];

  protected readonly busqueda = signal('');
  protected readonly filtroEstado = signal<FiltroEstadoLibro>('activos');

  protected readonly librosVisibles = computed(() => {
    const termino = normalizarParaBusqueda(this.busqueda());
    const estado = this.filtroEstado();

    return this.facade
      .libros()
      .filter((libro) => this.coincideEstado(libro, estado) && this.coincideTexto(libro, termino));
  });

  constructor() {
    effect(() => {
      void this.facade.cargar();
    });
  }

  protected actualizarBusqueda(valor: string): void {
    this.busqueda.set(valor);
  }

  protected cambiarFiltroEstado(valor: FiltroEstadoLibro): void {
    this.filtroEstado.set(valor);
  }

  protected contarPor(estado: FiltroEstadoLibro): number {
    if (estado === 'activos') return this.facade.activos().length;
    if (estado === 'inactivos') return this.facade.inactivos().length;
    return this.facade.libros().length;
  }

  protected async toggleActivo(libro: Libro): Promise<void> {
    const actualizado = await this.facade.toggleActivo(libro.id);
    if (!actualizado) {
      this.toastService.error('No se pudo actualizar el libro.');
      return;
    }

    this.toastService.success(
      actualizado.activo
        ? `"${actualizado.titulo}" vuelve a pedidos e informes.`
        : `"${actualizado.titulo}" ya no aparece en pedidos ni informes.`,
    );
  }

  private coincideEstado(libro: Libro, estado: FiltroEstadoLibro): boolean {
    if (estado === 'activos') return libro.activo;
    if (estado === 'inactivos') return !libro.activo;
    return true;
  }

  private coincideTexto(libro: Libro, termino: string): boolean {
    if (!termino) return true;

    return (
      normalizarParaBusqueda(libro.titulo).includes(termino) ||
      normalizarParaBusqueda(libro.observaciones ?? '').includes(termino)
    );
  }
}
