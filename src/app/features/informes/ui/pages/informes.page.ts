import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { PesoPipe } from '../../../../shared/pipes/peso.pipe';
import { ToastService } from '../../../../shared/services/toast.service';
import { LibrosFacade } from '../../../libros/state/libros.facade';
import { PedidoDetalle } from '../../../pedidos/domain/pedido.model';
import { PedidosFacade } from '../../../pedidos/state/pedidos.facade';
import { InformesFacade } from '../../state/informes.facade';

type InformeTab = 'resumen' | 'sin-pagar' | 'faltan-imprimir' | 'sin-entregar';

@Component({
  selector: 'app-informes-page',
  standalone: true,
  imports: [PesoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-header">
      <div>
        <p class="eyebrow">Dashboard</p>
        <h1>Informes</h1>
        <p class="page-description">Vision operativa y financiera para decidir que imprimir, cobrar y entregar primero.</p>
      </div>
    </section>

    <section class="tabs-bar card">
      <button type="button" class="tab-button" [class.tab-button-active]="tabActiva() === 'resumen'" (click)="tabActiva.set('resumen')">Resumen</button>
      <button type="button" class="tab-button" [class.tab-button-active]="tabActiva() === 'sin-pagar'" (click)="tabActiva.set('sin-pagar')">Sin pagar</button>
      <button type="button" class="tab-button" [class.tab-button-active]="tabActiva() === 'faltan-imprimir'" (click)="tabActiva.set('faltan-imprimir')">Faltan imprimir</button>
      <button type="button" class="tab-button" [class.tab-button-active]="tabActiva() === 'sin-entregar'" (click)="tabActiva.set('sin-entregar')">Sin entregar</button>
    </section>

    @if (tabActiva() !== 'resumen') {
      <section class="card stack">
        <div class="filters-grid">
          <label class="field">
            <span>Buscar alumno</span>
            <input type="text" [value]="busquedaAlumno()" (input)="busquedaAlumno.set($any($event.target).value)" />
          </label>

          <label class="field">
            <span>Libro</span>
            <select [value]="libroFiltroId() ?? ''" (change)="libroFiltroId.set($any($event.target).value || null)">
              <option value="">Todos</option>
              @for (libro of librosFacade.activos(); track libro.id) {
                <option [value]="libro.id">{{ libro.titulo }}</option>
              }
            </select>
          </label>
        </div>

        <div class="filters-actions">
          <button type="button" class="secondary-button" (click)="limpiarFiltros()">Limpiar filtros</button>
          <span class="caption">{{ totalItemsFiltrados() }} resultados</span>
        </div>
      </section>
    }

    @if (tabActiva() === 'resumen') {
      <section class="stack">
        <section class="kpi-grid">
          <article class="card kpi-card kpi-highlight"><span>Hojas pend. imprimir</span><strong>{{ facade.kpis().hojasPendientes }}</strong></article>
          <article
            class="card kpi-card"
            [class.kpi-toner-verde]="facade.kpis().estadoToner === 'verde'"
            [class.kpi-toner-amarillo]="facade.kpis().estadoToner === 'amarillo'"
            [class.kpi-toner-rojo]="facade.kpis().estadoToner === 'rojo'"
          >
            <span>Hojas impresas</span>
            <strong>{{ facade.kpis().hojasImpresas }}</strong>
            <small class="caption">Referencia toner: {{ facade.kpis().limiteToner }}</small>
          </article>
          <article class="card kpi-card"><span>Total pedidos</span><strong>{{ facade.kpis().totalPedidos }}</strong></article>
          <article class="card kpi-card"><span>Impresos</span><strong>{{ facade.kpis().impresos }}</strong></article>
          <article class="card kpi-card"><span>Libros cobrados</span><strong>{{ facade.kpis().cobrados }}</strong></article>
          <article class="card kpi-card"><span>Monto cobrado</span><strong>{{ facade.kpis().montoCobrado | peso }}</strong></article>
          <article class="card kpi-card"><span>Pendientes cobro</span><strong>{{ facade.kpis().pendientesCobro }}</strong></article>
          <article class="card kpi-card"><span>Saldo total</span><strong>{{ facade.kpis().saldoTotal | peso }}</strong></article>
          <article class="card kpi-card"><span>Listos p/entregar</span><strong>{{ facade.kpis().listosEntregar }}</strong></article>
          <article class="card kpi-card"><span>Entregados c/saldo</span><strong>{{ facade.kpis().entregadosConSaldo }}</strong></article>
        </section>

        <section class="card table-card">
          <div class="card-row">
            <h2>Avance por libro</h2>
            <span class="caption">Porcentaje de pedidos cerrados sobre el total por libro</span>
          </div>
          <table class="data-table compact-table">
            <thead>
              <tr>
                <th>Libro</th>
                <th>Total pedidos</th>
                <th>Impresos</th>
                <th>Pagados</th>
                <th>Por cobrar</th>
                <th>Cerrados</th>
                <th>Hojas pend.</th>
                <th>% cerrado</th>
              </tr>
            </thead>
            <tbody>
              @for (fila of facade.resumenPorLibro(); track fila.libroId) {
                <tr>
                  <td>{{ fila.libroTitulo }}</td>
                  <td>{{ fila.totalPedidos }}</td>
                  <td>{{ fila.impresos }}</td>
                  <td>{{ fila.pagados }}</td>
                  <td>{{ fila.porCobrar }}</td>
                  <td>{{ fila.cerrados }}</td>
                  <td>{{ fila.hojasPendientes }}</td>
                  <td>
                    <span class="progress-pill" [class.progress-high]="fila.semaforo === 'alto'" [class.progress-medium]="fila.semaforo === 'medio'" [class.progress-low]="fila.semaforo === 'bajo'">
                      {{ fila.porcentajeCerrado }}%
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      </section>
    }

    @if (tabActiva() === 'sin-pagar') {
      <section class="card stack">
        <div class="card-row">
          <h2>Sin pagar</h2>
          <span class="caption">Pedidos impresos con saldo pendiente</span>
        </div>

        @for (pedido of facade.pendientesPagoPorLibro(libroFiltroId(), busquedaAlumno()); track pedido.id) {
          <div class="card-row report-row">
            <div>
              <strong>{{ pedido.alumno }}</strong>
              <p class="caption">{{ pedido.libroTitulo }} {{ pedido.division ? '• ' + pedido.division : '' }}</p>
            </div>
            <div class="card-meta">
              <strong class="text-danger">{{ pedido.saldo | peso }}</strong>
              <button type="button" class="secondary-button" (click)="marcarPagado(pedido)">Marcar pagado</button>
            </div>
          </div>
        } @empty {
          <p class="caption">No hay pedidos impresos con deuda pendiente.</p>
        }

        <footer class="report-footer">
          <span>Total saldo pendiente</span>
          <strong class="text-danger">{{ facade.totalSaldoPendiente(libroFiltroId(), busquedaAlumno()) | peso }}</strong>
        </footer>
      </section>
    }

    @if (tabActiva() === 'faltan-imprimir') {
      <section class="stack">
        @for (grupo of facade.gruposFaltanImprimir(libroFiltroId(), busquedaAlumno()); track grupo.libroId) {
          <details class="card details-card" open>
            <summary class="details-summary">
              <div>
                <strong>{{ grupo.libroTitulo }}</strong>
                <p class="caption">{{ grupo.pedidos.length }} pedidos</p>
              </div>
              <strong>{{ grupo.hojasTotales }} hojas</strong>
            </summary>

            <div class="stack details-content">
              @for (pedido of grupo.pedidos; track pedido.id) {
                <div class="card-row report-row">
                  <div>
                    <strong>{{ pedido.alumno }}</strong>
                    <p class="caption">{{ pedido.division || 'Sin division' }} • {{ pedido.libroHojas }} hojas</p>
                  </div>
                  <button type="button" class="secondary-button" (click)="marcarImpreso(pedido)">Marcar impreso</button>
                </div>
              }
            </div>
          </details>
        } @empty {
          <section class="card"><p class="caption">No hay pedidos pendientes de impresion.</p></section>
        }

        <footer class="report-footer card">
          <span>Total hojas necesarias</span>
          <strong>{{ facade.totalHojasPendientes(libroFiltroId(), busquedaAlumno()) }}</strong>
        </footer>
      </section>
    }

    @if (tabActiva() === 'sin-entregar') {
      <section class="card stack">
        <div class="card-row">
          <h2>Sin entregar</h2>
          <span class="caption">Pedidos impresos y todavia pendientes de entrega</span>
        </div>

        @for (pedido of facade.sinEntregarPorLibro(libroFiltroId(), busquedaAlumno()); track pedido.id) {
          <div class="card-row report-row">
            <div>
              <strong>{{ pedido.alumno }}</strong>
              <p class="caption">{{ pedido.libroTitulo }} {{ pedido.division ? '• ' + pedido.division : '' }}</p>
            </div>
            <div class="card-meta">
              <strong>{{ pedido.estadoPago }}</strong>
              <button type="button" class="secondary-button" (click)="marcarEntregado(pedido)">Marcar entregado</button>
            </div>
          </div>
        } @empty {
          <p class="caption">No hay pedidos impresos pendientes de entrega.</p>
        }

        <footer class="report-footer">
          <span>Total pendientes de entrega</span>
          <strong>{{ facade.totalSinEntregar(libroFiltroId(), busquedaAlumno()) }}</strong>
        </footer>
      </section>
    }
  `,
})
export class InformesPageComponent {
  protected readonly facade = inject(InformesFacade);
  protected readonly pedidosFacade = inject(PedidosFacade);
  protected readonly librosFacade = inject(LibrosFacade);
  private readonly toastService = inject(ToastService);

  protected readonly tabActiva = signal<InformeTab>('resumen');
  protected readonly libroFiltroId = signal<string | null>(null);
  protected readonly busquedaAlumno = signal('');
  protected readonly totalItemsFiltrados = computed(() => {
    if (this.tabActiva() === 'sin-pagar') {
      return this.facade.pendientesPagoPorLibro(this.libroFiltroId(), this.busquedaAlumno()).length;
    }

    if (this.tabActiva() === 'faltan-imprimir') {
      return this.facade.faltanImprimirPorLibro(this.libroFiltroId(), this.busquedaAlumno()).length;
    }

    if (this.tabActiva() === 'sin-entregar') {
      return this.facade.sinEntregarPorLibro(this.libroFiltroId(), this.busquedaAlumno()).length;
    }

    return 0;
  });

  constructor() {
    effect(() => {
      void this.librosFacade.cargar();
      void this.pedidosFacade.cargar();
    });
  }

  protected limpiarFiltros(): void {
    this.libroFiltroId.set(null);
    this.busquedaAlumno.set('');
  }

  protected async marcarPagado(pedido: PedidoDetalle): Promise<void> {
    try {
      await this.pedidosFacade.avanzarPago(pedido);
      this.toastService.success('Pedido marcado como pagado.');
    } catch {
      this.toastService.error('No se pudo actualizar el pago.');
    }
  }

  protected async marcarImpreso(pedido: PedidoDetalle): Promise<void> {
    try {
      await this.pedidosFacade.toggleImpresion(pedido);
      this.toastService.success('Pedido marcado como impreso.');
    } catch {
      this.toastService.error('No se pudo actualizar la impresion.');
    }
  }

  protected async marcarEntregado(pedido: PedidoDetalle): Promise<void> {
    try {
      await this.pedidosFacade.toggleEntrega(pedido);
      this.toastService.success('Pedido marcado como entregado.');
    } catch {
      this.toastService.error('No se pudo actualizar la entrega.');
    }
  }
}
