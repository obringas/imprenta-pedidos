import { Injectable, computed, inject } from '@angular/core';
import { TamanioImpresion } from '../../../shared/constants/negocio.constants';
import { normalizarParaBusqueda } from '../../../shared/utils/text-normalizer';
import { LibrosFacade } from '../../libros/state/libros.facade';
import { PedidoDetalle } from '../../pedidos/domain/pedido.model';
import { PedidosFacade } from '../../pedidos/state/pedidos.facade';

export interface FiltroInforme {
  readonly libroId: string | null;
  readonly busquedaAlumno: string;
  readonly tamanio: TamanioImpresion | null;
}

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
  private readonly limiteToner = 22000;

  readonly kpis = computed(() => {
    const pedidos = this.pedidosFacade.pedidosDeLibrosActivos();
    const pendientesImprimir = pedidos.filter((pedido) => pedido.estadoImpresion === 'Pendiente');
    const impresos = pedidos.filter((pedido) => pedido.estadoImpresion === 'Impreso');
    const hojasPendientes = pendientesImprimir.reduce((acumulado, pedido) => acumulado + pedido.libroHojas, 0);
    const hojasImpresas = impresos.reduce((acumulado, pedido) => acumulado + pedido.libroHojas, 0);
    const progresoToner = hojasImpresas / this.limiteToner;
    const estadoToner = progresoToner >= 0.8 ? 'rojo' : progresoToner >= 0.5 ? 'amarillo' : 'verde';

    return {
      totalPedidos: pedidos.length,
      impresos: impresos.length,
      hojasImpresas,
      limiteToner: this.limiteToner,
      estadoToner,
      cobrados: pedidos.filter((pedido) => pedido.estadoPago === 'Pagado').length,
      montoCobrado: pedidos.reduce((acumulado, pedido) => acumulado + pedido.montoCobrado, 0),
      pendientesCobro: pedidos.filter((pedido) => pedido.saldo > 0).length,
      hojasPendientes,
      saldoTotal: pedidos.reduce((acumulado, pedido) => acumulado + pedido.saldo, 0),
      listosEntregar: pedidos.filter((pedido) => pedido.estadoGeneral === 'Listo p/entregar').length,
      entregadosConSaldo: pedidos.filter((pedido) => pedido.estadoGeneral === 'Entregado con saldo').length,
    };
  });

  pendientesPagoPorLibro(filtro: FiltroInforme): PedidoDetalle[] {
    return this.pedidosFacade
      .pedidosDeLibrosActivos()
      .filter(
        (pedido) =>
          pedido.saldo > 0 &&
          this.coincideFiltros(pedido, filtro),
      )
      .sort((a, b) => a.libroTitulo.localeCompare(b.libroTitulo) || a.alumno.localeCompare(b.alumno));
  }

  totalSaldoPendiente(filtro: FiltroInforme): number {
    return this.pendientesPagoPorLibro(filtro).reduce((acumulado, pedido) => acumulado + pedido.saldo, 0);
  }

  impresosPendientesPagoPorLibro(filtro: FiltroInforme): PedidoDetalle[] {
    return this.pendientesPagoPorLibro(filtro).filter((pedido) => pedido.estadoImpresion === 'Impreso');
  }

  totalSaldoImpresoPendiente(filtro: FiltroInforme): number {
    return this.impresosPendientesPagoPorLibro(filtro).reduce((acumulado, pedido) => acumulado + pedido.saldo, 0);
  }

  faltanImprimirPorLibro(filtro: FiltroInforme): PedidoDetalle[] {
    return this.pedidosFacade
      .pedidosDeLibrosActivos()
      .filter((pedido) => pedido.estadoImpresion === 'Pendiente' && this.coincideFiltros(pedido, filtro));
  }

  sinEntregarPorLibro(filtro: FiltroInforme): PedidoDetalle[] {
    return this.pedidosFacade
      .pedidosDeLibrosActivos()
      .filter(
        (pedido) =>
          pedido.estadoImpresion === 'Impreso' &&
          pedido.estadoEntrega === 'Pendiente' &&
          this.coincideFiltros(pedido, filtro),
      )
      .sort((a, b) => a.libroTitulo.localeCompare(b.libroTitulo) || a.alumno.localeCompare(b.alumno));
  }

  totalSinEntregar(filtro: FiltroInforme): number {
    return this.sinEntregarPorLibro(filtro).length;
  }

  gruposFaltanImprimir(filtro: FiltroInforme): GrupoPendiente[] {
    const grupos = new Map<string, GrupoPendiente>();

    for (const pedido of this.faltanImprimirPorLibro(filtro)) {
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

  totalHojasPendientes(filtro: FiltroInforme): number {
    return this.gruposFaltanImprimir(filtro).reduce((acumulado, grupo) => acumulado + grupo.hojasTotales, 0);
  }

  readonly resumenPorLibro = computed<ResumenLibro[]>(() => {
    const pedidos = this.pedidosFacade.pedidosDeLibrosActivos();

    return this.librosFacade
      .activos()
      .map((libro) => this.crearResumenLibro(libro.id, libro.titulo, pedidos))
      .filter((resumen) => resumen.totalPedidos > 0 && resumen.porcentajeCerrado < 100);
  });

  private crearResumenLibro(libroId: string, libroTitulo: string, pedidos: PedidoDetalle[]): ResumenLibro {
    const pedidosLibro = pedidos.filter((pedido) => pedido.libroId === libroId);
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
      libroId,
      libroTitulo,
      totalPedidos,
      impresos,
      pagados,
      porCobrar,
      cerrados,
      porcentajeCerrado,
      hojasPendientes,
      semaforo: porcentajeCerrado >= 75 ? 'alto' : porcentajeCerrado >= 40 ? 'medio' : 'bajo',
    };
  }

  private coincideFiltros(pedido: PedidoDetalle, filtro: FiltroInforme): boolean {
    const coincideLibro = !filtro.libroId || pedido.libroId === filtro.libroId;
    const coincideTamanio = !filtro.tamanio || pedido.tamanio === filtro.tamanio;
    const texto = normalizarParaBusqueda(filtro.busquedaAlumno);
    const coincideAlumno = !texto || normalizarParaBusqueda(pedido.alumno).includes(texto);
    return coincideLibro && coincideTamanio && coincideAlumno;
  }
}
