import { Injectable, computed, signal } from '@angular/core';
import { PRIORIDAD_ESTADO_GENERAL } from '../../../shared/constants/negocio.constants';
import { FiltroPedidos, PedidoDetalle } from '../domain/pedido.model';

const FILTRO_INICIAL: FiltroPedidos = {
  busqueda: '',
  libroId: null,
  estadoGeneral: null,
  estadoPago: null,
};

@Injectable({ providedIn: 'root' })
export class PedidosStore {
  readonly pedidos = signal<PedidoDetalle[]>([]);
  readonly loading = signal(false);
  readonly filtros = signal<FiltroPedidos>(FILTRO_INICIAL);

  readonly pedidosFiltrados = computed(() => {
    const { busqueda, libroId, estadoGeneral, estadoPago } = this.filtros();
    const termino = busqueda.trim().toLowerCase();

    return this.pedidos()
      .filter((pedido) => {
        if (termino && !pedido.alumno.toLowerCase().includes(termino)) return false;
        if (libroId && pedido.libroId !== libroId) return false;
        if (estadoGeneral && pedido.estadoGeneral !== estadoGeneral) return false;
        if (estadoPago && pedido.estadoPago !== estadoPago) return false;
        return true;
      })
      .sort((actual, siguiente) =>
        (PRIORIDAD_ESTADO_GENERAL[actual.estadoGeneral] ?? 99) -
        (PRIORIDAD_ESTADO_GENERAL[siguiente.estadoGeneral] ?? 99)
      );
  });

  readonly estadisticas = computed(() => {
    const pedidos = this.pedidos();
    return {
      total: pedidos.length,
      impresos: pedidos.filter((pedido) => pedido.estadoImpresion === 'Impreso').length,
      pendientesPago: pedidos.filter((pedido) => pedido.saldo > 0).length,
      listosEntregar: pedidos.filter((pedido) => pedido.estadoGeneral === 'Listo p/entregar').length,
      saldoTotal: pedidos.reduce((acumulado, pedido) => acumulado + pedido.saldo, 0),
    };
  });
}

