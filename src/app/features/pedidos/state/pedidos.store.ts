import { Injectable, computed, signal } from '@angular/core';
import { PRIORIDAD_ESTADO_GENERAL } from '../../../shared/constants/negocio.constants';
import { claveDivision, claveGrado, compararDivisiones, compararGrados, parsearCurso } from '../../../shared/utils/curso.util';
import { normalizarParaBusqueda } from '../../../shared/utils/text-normalizer';
import { DIVISION_SIN_ASIGNAR, FiltroPedidos, PedidoDetalle } from '../domain/pedido.model';

const FILTRO_INICIAL: FiltroPedidos = {
  busqueda: '',
  libroId: null,
  estadoGeneral: null,
  estadoPago: null,
  division: null,
  incluirInactivos: false,
};

@Injectable({ providedIn: 'root' })
export class PedidosStore {
  readonly pedidos = signal<PedidoDetalle[]>([]);
  readonly loading = signal(false);
  readonly filtros = signal<FiltroPedidos>(FILTRO_INICIAL);

  /**
   * Base de todas las vistas de pedidos. El catalogo tiene muchos libros
   * historicos, por eso los pedidos de libros inactivos quedan fuera salvo
   * que se pidan explicitamente.
   */
  readonly pedidosVisibles = computed(() => {
    if (this.filtros().incluirInactivos) {
      return this.pedidos();
    }

    return this.pedidos().filter((pedido) => pedido.libroActivo);
  });

  readonly ocultosPorLibroInactivo = computed(
    () => this.pedidos().filter((pedido) => !pedido.libroActivo).length,
  );

  /**
   * Divisiones presentes en los pedidos visibles, ordenadas como cursos
   * (`3A` antes que `10A`) y no alfabeticamente. Se arma con los valores que
   * existen, para no ofrecer opciones que no devuelven nada.
   */
  readonly divisionesDisponibles = computed(() => {
    const valores = new Set(
      this.pedidosVisibles().map((pedido) => pedido.division?.trim() || DIVISION_SIN_ASIGNAR),
    );

    return [...valores].sort((uno, otro) => {
      if (uno === DIVISION_SIN_ASIGNAR) return 1;
      if (otro === DIVISION_SIN_ASIGNAR) return -1;

      const cursoUno = parsearCurso(uno);
      const cursoOtro = parsearCurso(otro);
      return (
        compararGrados(claveGrado(cursoUno), claveGrado(cursoOtro)) ||
        compararDivisiones(claveDivision(cursoUno), claveDivision(cursoOtro)) ||
        uno.localeCompare(otro, 'es')
      );
    });
  });

  readonly pedidosFiltrados = computed(() => {
    const { busqueda, libroId, estadoGeneral, estadoPago, division } = this.filtros();
    const termino = normalizarParaBusqueda(busqueda);

    return this.pedidosVisibles()
      .filter((pedido) => {
        if (termino && !normalizarParaBusqueda(pedido.alumno).includes(termino)) return false;
        if (libroId && pedido.libroId !== libroId) return false;
        if (estadoGeneral && pedido.estadoGeneral !== estadoGeneral) return false;
        if (estadoPago && pedido.estadoPago !== estadoPago) return false;
        if (division && (pedido.division?.trim() || DIVISION_SIN_ASIGNAR) !== division) return false;
        return true;
      })
      .sort((actual, siguiente) =>
        (PRIORIDAD_ESTADO_GENERAL[actual.estadoGeneral] ?? 99) -
        (PRIORIDAD_ESTADO_GENERAL[siguiente.estadoGeneral] ?? 99)
      );
  });

  readonly estadisticas = computed(() => {
    const pedidos = this.pedidosVisibles();
    return {
      total: pedidos.length,
      impresos: pedidos.filter((pedido) => pedido.estadoImpresion === 'Impreso').length,
      pendientesPago: pedidos.filter((pedido) => pedido.saldo > 0).length,
      listosEntregar: pedidos.filter((pedido) => pedido.estadoGeneral === 'Listo p/entregar').length,
      saldoTotal: pedidos.reduce((acumulado, pedido) => acumulado + pedido.saldo, 0),
    };
  });
}

