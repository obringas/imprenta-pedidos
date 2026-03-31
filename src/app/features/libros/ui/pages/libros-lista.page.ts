import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '../../../../shared/components/empty-state.component';
import { PesoPipe } from '../../../../shared/pipes/peso.pipe';
import { ToastService } from '../../../../shared/services/toast.service';
import { LibrosFacade } from '../../state/libros.facade';

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
        <p class="page-description">El precio del catálogo se copia al pedido al momento de crearlo.</p>
      </div>
      <a routerLink="/libros/nuevo" class="primary-button">Nuevo libro</a>
    </section>

    @if (facade.libros().length) {
      <section class="stack">
        @for (libro of facade.libros(); track libro.id) {
          <article class="card card-row">
            <div>
              <a [routerLink]="['/libros', libro.id]" class="card-title">{{ libro.titulo }}</a>
              <p class="caption">{{ libro.paginas }} páginas • {{ libro.hojas }} hojas por ejemplar</p>
              @if (libro.observaciones) {
                <p class="caption">{{ libro.observaciones }}</p>
              }
            </div>
            <div class="card-meta">
              <strong>{{ libro.precio | peso }}</strong>
              <span class="caption">{{ libro.activo ? 'Activo' : 'Inactivo' }}</span>
              <button type="button" class="secondary-button" (click)="toggleActivo(libro.id)">
                {{ libro.activo ? 'Desactivar' : 'Activar' }}
              </button>
            </div>
          </article>
        }
      </section>
    } @else {
      <app-empty-state
        title="Todavía no hay libros cargados"
        description="Agregá el catálogo para habilitar la carga rápida de pedidos."
      />
    }

    <a routerLink="/libros/nuevo" class="fab-button" aria-label="Nuevo libro">+</a>
  `,
})
export class LibrosListaPageComponent {
  protected readonly facade = inject(LibrosFacade);
  private readonly toastService = inject(ToastService);

  constructor() {
    effect(() => {
      void this.facade.cargar();
    });
  }

  protected async toggleActivo(id: string): Promise<void> {
    const libro = await this.facade.toggleActivo(id);
    if (!libro) {
      this.toastService.error('No se pudo actualizar el libro.');
      return;
    }

    this.toastService.success(libro.activo ? 'Libro activado.' : 'Libro desactivado.');
  }
}
