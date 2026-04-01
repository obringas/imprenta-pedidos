import { Injectable, computed, inject } from '@angular/core';
import { LibrosFacade } from '../../libros/state/libros.facade';
import { PedidoDetalle } from '../../pedidos/domain/pedido.model';
import { PedidosFacade } from '../../pedidos/state/pedidos.facade';

type GrupoPendiente = {
  readonly libroId: string;
  readonly libroTitulo: string;
  readonly hojasTotales: number;
  readonly pedidos: PedidoDetalle[];
};

type ResumenLibro = {
  readonly libroId: string;
  readonly libroTitulo: string;
  readonly totalPedidos: number;
  readonly impresos: number;
  readonly pagados: number;
  readonly porCobrar: number;
  readonly cerrados: number;
  readonly porcentajeCerrado: number;
  readonly hojasPendientes: number;
  readonly semaforo: 'alto' | 'medio' | 'bajo';
};

@Injectable({ providedIn: 'root' })
export class InformesFacade {
  private readonly pedidosFacade = inject(PedidosFacade);
  private readonly librosFacade = inject(LibrosFacade);

  readonly kpis = computed(() => {
    const pedidos = this.pedidosFacade.pedidos();
    const pendientesImprimir = pedidos.filter((pedido) => pedido.estadoImpresion === 'Pendiente');
    const hojasPendientes = pendientesImprimir.reduce((acumulado, pedido) => acumulado + pedido.libroHojas, 0);

    return {
      totalPedidos: pedidos.length,
      impresos: pedidos.filter((pedido) => pedido.estadoImpresion === 'Impreso').length,
      cobrados: pedidos.filter((pedido) => pedido.estadoPago === 'Pagado').length,
      montoCobrado: pedidos.reduce((acumulado, pedido) => acumulado + pedido.montoCobrado, 0),
      pendientesCobro: pedidos.filter((pedido) => pedido.saldo > 0).length,
      hojasPendientes,
      saldoTotal: pedidos.reduce((acumulado, pedido) => acumulado + pedido.saldo, 0),
      listosEntregar: pedidos.filter((pedido) => pedido.estadoGeneral === 'Listo p/entregar').length,
      entregadosConSaldo: pedidos.filter((pedido) => pedido.estadoGeneral === 'Entregado con saldo').length,
    };
  });

  pendientesPagoPorLibro(libroId: string | null, busquedaAlumno: string): PedidoDetalle[] {
    return this.pedidosFacade
      .pedidos()
      .filter(
        (pedido) =>
          pedido.estadoImpresion === 'Impreso' &&
          pedido.saldo > 0 &&
          this.coincideFiltros(pedido, libroId, busquedaAlumno),
      )
      .sort((a, b) => a.libroTitulo.localeCompare(b.libroTitulo) || a.alumno.localeCompare(b.alumno));
  }

  totalSaldoPendiente(libroId: string | null, busquedaAlumno: string): number {
    return this.pendientesPagoPorLibro(libroId, busquedaAlumno).reduce((acumulado, pedido) => acumulado + pedido.saldo, 0);
  }

  faltanImprimirPorLibro(libroId: string | null, busquedaAlumno: string): PedidoDetalle[] {
    return this.pedidosFacade
      .pedidos()
      .filter((pedido) => pedido.estadoImpresion === 'Pendiente' && this.coincideFiltros(pedido, libroId, busquedaAlumno));
  }

  sinEntregarPorLibro(libroId: string | null, busquedaAlumno: string): PedidoDetalle[] {
    return this.pedidosFacade
      .pedidos()
      .filter(
        (pedido) =>
          pedido.estadoImpresion === 'Impreso' &&
          pedido.estadoEntrega === 'Pendiente' &&
          this.coincideFiltros(pedido, libroId, busquedaAlumno),
      )
      .sort((a, b) => a.libroTitulo.localeCompare(b.libroTitulo) || a.alumno.localeCompare(b.alumno));
  }

  totalSinEntregar(libroId: string | null, busquedaAlumno: string): number {
    return this.sinEntregarPorLibro(libroId, busquedaAlumno).length;
  }

  gruposFaltanImprimir(libroId: string | null, busquedaAlumno: string): GrupoPendiente[] {
    const grupos = new Map<string, GrupoPendiente>();

    for (const pedido of this.faltanImprimirPorLibro(libroId, busquedaAlumno)) {
      const actual = grupos.get(pedido.libroId);

      if (!actual) {
        grupos.set(pedido.libroId, {
          libroId: pedido.libroId,
          libroTitulo: pedido.libroTitulo,
          hojasTotales: pedido.libroHojas,
          pedidos: [pedido],
        });
        continue;
      }

      grupos.set(pedido.libroId, {
        ...actual,
        hojasTotales: actual.hojasTotales + pedido.libroHojas,
        pedidos: [...actual.pedidos, pedido],
      });
    }

    return [...grupos.values()].sort((a, b) => a.libroTitulo.localeCompare(b.libroTitulo));
  }

  totalHojasPendientes(libroId: string | null, busquedaAlumno: string): number {
    return this.gruposFaltanImprimir(libroId, busquedaAlumno).reduce((acumulado, grupo) => acumulado + grupo.hojasTotales, 0);
  }

  readonly resumenPorLibro = computed<ResumenLibro[]>(() => {
    const pedidos = this.pedidosFacade.pedidos();

    return this.librosFacade.libros().map((libro) => {
      const pedidosLibro = pedidos.filter((pedido) => pedido.libroId === libro.id);
      const impresos = pedidosLibro.filter((pedido) => pedido.estadoImpresion === 'Impreso').length;
      const pagados = pedidosLibro.filter((pedido) => pedido.estadoPago === 'Pagado').length;
      const porCobrar = pedidosLibro.filter((pedido) => pedido.saldo > 0).length;
      const cerrados = pedidosLibro.filter((pedido) => pedido.estadoGeneral === 'Cerrado').length;
      const totalPedidos = pedidosLibro.length;
      const porcentajeCerrado = totalPedidos === 0 ? 0 : Math.round((cerrados / totalPedidos) * 100);
      const hojasPendientes = pedidosLibro
        .filter((pedido) => pedido.estadoImpresion === 'Pendiente')
        .reduce((acumulado, pedido) => acumulado + pedido.libroHojas, 0);

      return {
        libroId: libro.id,
        libroTitulo: libro.titulo,
        totalPedidos,
        impresos,
        pagados,
        porCobrar,
        cerrados,
        porcentajeCerrado,
        hojasPendientes,
        semaforo: porcentajeCerrado >= 75 ? 'alto' : porcentajeCerrado >= 40 ? 'medio' : 'bajo',
      };
    });
  });

  private coincideFiltros(pedido: PedidoDetalle, libroId: string | null, busquedaAlumno: string): boolean {
    const coincideLibro = !libroId || pedido.libroId === libroId;
    const texto = busquedaAlumno.trim().toLowerCase();
    const coincideAlumno = !texto || pedido.alumno.toLowerCase().includes(texto);
    return coincideLibro && coincideAlumno;
  }
}