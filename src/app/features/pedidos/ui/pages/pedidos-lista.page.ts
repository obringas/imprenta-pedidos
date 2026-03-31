import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '../../../../shared/components/empty-state.component';
import { EstadoBadgeComponent } from '../../../../shared/components/estado-badge.component';
import { ESTADO_GENERAL, ESTADO_PAGO, EstadoGeneral, EstadoPago } from '../../../../shared/constants/negocio.constants';
import { PesoPipe } from '../../../../shared/pipes/peso.pipe';
import { ToastService } from '../../../../shared/services/toast.service';
import { LibrosFacade } from '../../../libros/state/libros.facade';
import { PedidoDetalle } from '../../domain/pedido.model';
import { PedidosFacade } from '../../state/pedidos.facade';

@Component({
  selector: 'app-pedidos-lista-page',
  standalone: true,
  imports: [RouterLink, EstadoBadgeComponent, PesoPipe, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-header pedidos-header">
      <div>
        <p class="eyebrow">Operación</p>
        <h1>Pedidos</h1>
        <p class="page-description">Listado priorizado por estado general para resolver primero lo urgente.</p>
      </div>
      <a routerLink="/pedidos/nuevo" class="primary-button desktop-only-inline">Nuevo pedido</a>
    </section>

    <section class="kpi-grid">
      <article class="card kpi-card"><span>Total</span><strong>{{ facade.estadisticas().total }}</strong></article>
      <article class="card kpi-card"><span>Impresos</span><strong>{{ facade.estadisticas().impresos }}</strong></article>
      <article class="card kpi-card"><span>Listos p/entregar</span><strong>{{ facade.estadisticas().listosEntregar }}</strong></article>
      <article class="card kpi-card"><span>Saldo total</span><strong>{{ facade.estadisticas().saldoTotal | peso }}</strong></article>
    </section>

    <section class="filters-mobile-toolbar mobile-only">
      <button type="button" class="secondary-button" (click)="abrirFiltrosMobile()">
        Filtros
        @if (cantidadFiltrosActivos()) {
          <span class="filter-counter">{{ cantidadFiltrosActivos() }}</span>
        }
      </button>
    </section>

    @if (filtrosActivos().length) {
      <section class="card active-filters-card">
        <div class="filter-header">
          <span class="field-label">Filtros activos</span>
          <button type="button" class="text-button" (click)="limpiarTodos()">Limpiar todo</button>
        </div>
        <div class="chip-row chip-row-active">
          @for (filtro of filtrosActivos(); track filtro.label) {
            <button type="button" class="filter-chip filter-chip-active filter-chip-removable" (click)="filtro.clear()">
              <span>{{ filtro.label }}</span>
              <span aria-hidden="true">×</span>
            </button>
          }
        </div>
      </section>
    }

    <section class="card filters-stack desktop-only-block">
      <div class="filters-grid">
        <label class="field">
          <span>Buscar alumno</span>
          <input type="text" [value]="facade.filtros().busqueda" (input)="actualizarBusqueda($any($event.target).value)" />
        </label>

        <label class="field">
          <span>Libro</span>
          <select [value]="facade.filtros().libroId ?? ''" (change)="actualizarLibro($any($event.target).value)">
            <option value="">Todos</option>
            @for (libro of librosFacade.libros(); track libro.id) {
              <option [value]="libro.id">{{ libro.titulo }}</option>
            }
          </select>
        </label>
      </div>

      <div class="filter-group">
        <div class="filter-header">
          <span class="field-label">Estado general</span>
          <button type="button" class="text-button" (click)="limpiarEstadoGeneral()" [disabled]="!facade.filtros().estadoGeneral">Limpiar</button>
        </div>
        <div class="chip-row">
          @for (estado of estadosGenerales; track estado) {
            <button type="button" class="filter-chip" [class.filter-chip-active]="facade.filtros().estadoGeneral === estado" (click)="toggleEstadoGeneral(estado)">
              {{ estado }}
            </button>
          }
        </div>
      </div>

      <div class="filter-group">
        <div class="filter-header">
          <span class="field-label">Estado de pago</span>
          <button type="button" class="text-button" (click)="limpiarEstadoPago()" [disabled]="!facade.filtros().estadoPago">Limpiar</button>
        </div>
        <div class="chip-row">
          @for (estado of estadosPago; track estado) {
            <button type="button" class="filter-chip" [class.filter-chip-active]="facade.filtros().estadoPago === estado" (click)="toggleEstadoPago(estado)">
              {{ estado }}
            </button>
          }
        </div>
      </div>

      <div class="filters-actions">
        <button type="button" class="secondary-button" (click)="limpiarTodos()">Limpiar todos los filtros</button>
        <span class="caption">{{ facade.pedidosFiltrados().length }} pedidos visibles</span>
      </div>
    </section>

    @if (filtrosMobileAbiertos()) {
      <div class="mobile-sheet-backdrop" (click)="cerrarFiltrosMobile()">
        <section class="mobile-sheet card filters-stack" (click)="$event.stopPropagation()">
          <div class="sheet-header">
            <div>
              <p class="eyebrow">Filtros</p>
              <h2>Refinar pedidos</h2>
            </div>
            <button type="button" class="secondary-button" (click)="cerrarFiltrosMobile()">Cerrar</button>
          </div>

          <div class="filters-grid">
            <label class="field">
              <span>Buscar alumno</span>
              <input type="text" [value]="facade.filtros().busqueda" (input)="actualizarBusqueda($any($event.target).value)" />
            </label>

            <label class="field">
              <span>Libro</span>
              <select [value]="facade.filtros().libroId ?? ''" (change)="actualizarLibro($any($event.target).value)">
                <option value="">Todos</option>
                @for (libro of librosFacade.libros(); track libro.id) {
                  <option [value]="libro.id">{{ libro.titulo }}</option>
                }
              </select>
            </label>
          </div>

          <div class="filter-group">
            <div class="filter-header">
              <span class="field-label">Estado general</span>
              <button type="button" class="text-button" (click)="limpiarEstadoGeneral()" [disabled]="!facade.filtros().estadoGeneral">Limpiar</button>
            </div>
            <div class="chip-row">
              @for (estado of estadosGenerales; track estado) {
                <button type="button" class="filter-chip" [class.filter-chip-active]="facade.filtros().estadoGeneral === estado" (click)="toggleEstadoGeneral(estado)">
                  {{ estado }}
                </button>
              }
            </div>
          </div>

          <div class="filter-group">
            <div class="filter-header">
              <span class="field-label">Estado de pago</span>
              <button type="button" class="text-button" (click)="limpiarEstadoPago()" [disabled]="!facade.filtros().estadoPago">Limpiar</button>
            </div>
            <div class="chip-row">
              @for (estado of estadosPago; track estado) {
                <button type="button" class="filter-chip" [class.filter-chip-active]="facade.filtros().estadoPago === estado" (click)="toggleEstadoPago(estado)">
                  {{ estado }}
                </button>
              }
            </div>
          </div>

          <div class="filters-actions">
            <button type="button" class="secondary-button" (click)="limpiarTodos()">Limpiar todo</button>
            <button type="button" class="primary-button" (click)="cerrarFiltrosMobile()">Ver {{ pedidosPaginados().length }} pedidos</button>
          </div>
        </section>
      </div>
    }

    @if (pedidosPaginados().length) {
      <section class="desktop-only-block">
        <div class="card table-card">
          <table class="data-table">
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Libro</th>
                <th>Estado</th>
                <th>Saldo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (pedido of pedidosPaginados(); track pedido.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/pedidos', pedido.id]" class="card-title">{{ pedido.alumno }}</a>
                    <div class="caption">{{ pedido.division || '-' }}</div>
                  </td>
                  <td>{{ pedido.libroTitulo }}</td>
                  <td>
                    <div class="pedido-status-cell">
                      <app-estado-badge [estado]="pedido.estadoGeneral" />
                      <span class="caption">Pago: {{ pedido.estadoPago }}</span>
                    </div>
                  </td>
                  <td><strong [class.text-danger]="pedido.saldo > 0">{{ pedido.saldo | peso }}</strong></td>
                  <td>
                    <div class="table-actions">
                      <button type="button" class="secondary-button" (click)="toggleImpresion(pedido)">Impresión</button>
                      <button type="button" class="secondary-button" (click)="avanzarPago(pedido)">Pago</button>
                      <button type="button" class="secondary-button" (click)="toggleEntrega(pedido)">Entrega</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="stack mobile-only">
        @for (pedido of pedidosPaginados(); track pedido.id) {
          <article class="card stack pedido-card-clean">
            <div class="card-row">
              <div>
                <a [routerLink]="['/pedidos', pedido.id]" class="card-title">{{ pedido.alumno }}</a>
                <p class="caption">{{ pedido.libroTitulo }} {{ pedido.division ? '• ' + pedido.division : '' }}</p>
              </div>
              <strong [class.text-danger]="pedido.saldo > 0">{{ pedido.saldo | peso }}</strong>
            </div>

            <div class="pedido-status-row">
              <app-estado-badge [estado]="pedido.estadoGeneral" />
              <span class="caption">Pago: {{ pedido.estadoPago }}</span>
            </div>

            <div class="action-row">
              <button type="button" class="secondary-button" (click)="toggleImpresion(pedido)">
                {{ pedido.estadoImpresion === 'Impreso' ? 'Marcar pendiente' : 'Marcar impreso' }}
              </button>
              <button type="button" class="secondary-button" (click)="avanzarPago(pedido)">Cambiar pago</button>
              <button type="button" class="secondary-button" (click)="toggleEntrega(pedido)">
                {{ pedido.estadoEntrega === 'Entregado' ? 'Quitar entrega' : 'Marcar entregado' }}
              </button>
            </div>
          </article>
        }
      </section>

      @if (totalPaginas() > 1) {
        <section class="card pagination-bar">
          <button type="button" class="secondary-button" (click)="irPagina(actualPagina() - 1)" [disabled]="actualPagina() === 1">Anterior</button>
          <span class="caption">Página {{ actualPagina() }} de {{ totalPaginas() }}</span>
          <button type="button" class="secondary-button" (click)="irPagina(actualPagina() + 1)" [disabled]="actualPagina() === totalPaginas()">Siguiente</button>
        </section>
      }
    } @else {
      <app-empty-state title="No hay pedidos para esos filtros" description="Probá otra búsqueda o cargá un pedido nuevo." />
    }

    <a routerLink="/pedidos/nuevo" class="fab-button fab-button-pedidos mobile-only-fab" aria-label="Crear pedido nuevo">+</a>
  `,
})
export class PedidosListaPageComponent {
  protected readonly facade = inject(PedidosFacade);
  protected readonly librosFacade = inject(LibrosFacade);
  private readonly toastService = inject(ToastService);

  protected readonly estadosGenerales: readonly EstadoGeneral[] = [
    ESTADO_GENERAL.LISTO_ENTREGAR,
    ESTADO_GENERAL.IMPRESO_CON_SALDO,
    ESTADO_GENERAL.PAGADO_PEND_IMP,
    ESTADO_GENERAL.PENDIENTE,
    ESTADO_GENERAL.ENTREGADO_CON_SALDO,
    ESTADO_GENERAL.CERRADO,
  ];

  protected readonly estadosPago: readonly EstadoPago[] = [
    ESTADO_PAGO.PENDIENTE,
    ESTADO_PAGO.SENA,
    ESTADO_PAGO.PAGADO,
  ];

  protected readonly filtrosMobileAbiertos = signal(false);
  protected readonly actualPagina = signal(1);
  protected readonly tamanioPagina = 12;
  protected readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.facade.pedidosFiltrados().length / this.tamanioPagina)));
  protected readonly pedidosPaginados = computed(() => {
    const pagina = Math.min(this.actualPagina(), this.totalPaginas());
    const inicio = (pagina - 1) * this.tamanioPagina;
    return this.facade.pedidosFiltrados().slice(inicio, inicio + this.tamanioPagina);
  });
  protected readonly cantidadFiltrosActivos = computed(() => this.filtrosActivos().length);
  protected readonly filtrosActivos = computed(() => {
    const filtros = this.facade.filtros();
    const libro = filtros.libroId ? this.librosFacade.libros().find((item) => item.id === filtros.libroId) : null;

    return [
      filtros.busqueda
        ? {
            label: `Alumno: ${filtros.busqueda}`,
            clear: () => this.actualizarBusqueda(''),
          }
        : null,
      libro
        ? {
            label: `Libro: ${libro.titulo}`,
            clear: () => this.actualizarLibro(''),
          }
        : null,
      filtros.estadoGeneral
        ? {
            label: `General: ${filtros.estadoGeneral}`,
            clear: () => this.limpiarEstadoGeneral(),
          }
        : null,
      filtros.estadoPago
        ? {
            label: `Pago: ${filtros.estadoPago}`,
            clear: () => this.limpiarEstadoPago(),
          }
        : null,
    ].filter((item): item is { label: string; clear: () => void } => item !== null);
  });

  constructor() {
    effect(() => {
      void this.facade.cargar();
    });

    effect(() => {
      this.facade.filtros();
      this.actualPagina.set(1);
    });
  }

  protected actualizarBusqueda(valor: string): void {
    this.facade.actualizarFiltros({ busqueda: valor });
  }

  protected actualizarLibro(valor: string): void {
    this.facade.actualizarFiltros({ libroId: valor || null });
  }

  protected toggleEstadoGeneral(estado: EstadoGeneral): void {
    this.facade.actualizarFiltros({ estadoGeneral: this.facade.filtros().estadoGeneral === estado ? null : estado });
  }

  protected toggleEstadoPago(estado: EstadoPago): void {
    this.facade.actualizarFiltros({ estadoPago: this.facade.filtros().estadoPago === estado ? null : estado });
  }

  protected limpiarEstadoGeneral(): void {
    this.facade.actualizarFiltros({ estadoGeneral: null });
  }

  protected limpiarEstadoPago(): void {
    this.facade.actualizarFiltros({ estadoPago: null });
  }

  protected limpiarTodos(): void {
    this.facade.limpiarFiltros();
  }

  protected abrirFiltrosMobile(): void {
    this.filtrosMobileAbiertos.set(true);
  }

  protected cerrarFiltrosMobile(): void {
    this.filtrosMobileAbiertos.set(false);
  }

  protected irPagina(pagina: number): void {
    const paginaSegura = Math.min(Math.max(1, pagina), this.totalPaginas());
    this.actualPagina.set(paginaSegura);
  }

  protected async toggleImpresion(pedido: PedidoDetalle): Promise<void> {
    try {
      await this.facade.toggleImpresion(pedido);
      this.toastService.success('Estado de impresión actualizado.');
    } catch {
      this.toastService.error('No se pudo actualizar la impresión.');
    }
  }

  protected async avanzarPago(pedido: PedidoDetalle): Promise<void> {
    try {
      await this.facade.avanzarPago(pedido);
      this.toastService.success('Estado de pago actualizado.');
    } catch {
      this.toastService.error('No se pudo actualizar el pago.');
    }
  }

  protected async toggleEntrega(pedido: PedidoDetalle): Promise<void> {
    try {
      await this.facade.toggleEntrega(pedido);
      this.toastService.success('Estado de entrega actualizado.');
    } catch {
      this.toastService.error('No se pudo actualizar la entrega.');
    }
  }
}
