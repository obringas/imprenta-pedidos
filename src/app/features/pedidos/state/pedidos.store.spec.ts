import { TestBed } from '@angular/core/testing';
import { ESTADO_ENTREGA, ESTADO_GENERAL, ESTADO_IMPRESION, ESTADO_PAGO } from '../../../shared/constants/negocio.constants';
import { DIVISION_SIN_ASIGNAR, PedidoDetalle } from '../domain/pedido.model';
import { PedidosStore } from './pedidos.store';

function crearDetalleMock(parcial?: Partial<PedidoDetalle>): PedidoDetalle {
  return {
    id: 'pedido-1',
    libroId: 'libro-1',
    libroTitulo: 'Libro demo',
    libroHojas: 72,
    alumno: 'Alumno Demo',
    division: '6B',
    precioCobrado: 10000,
    estadoImpresion: ESTADO_IMPRESION.PENDIENTE,
    fechaImpresion: null,
    estadoEntrega: ESTADO_ENTREGA.PENDIENTE,
    fechaEntrega: null,
    estadoPago: ESTADO_PAGO.PENDIENTE,
    montoCobrado: 0,
    fechaPago: null,
    observaciones: null,
    creadoEn: '2026-07-29',
    actualizadoEn: '2026-07-29',
    saldo: 10000,
    estadoGeneral: ESTADO_GENERAL.PENDIENTE,
    libroActivo: true,
    ...parcial,
  };
}

describe('PedidosStore', () => {
  let store: PedidosStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(PedidosStore);
  });

  it('debería excluir los pedidos de libros inactivos por defecto', () => {
    store.pedidos.set([
      crearDetalleMock({ id: 'activo', libroActivo: true }),
      crearDetalleMock({ id: 'inactivo', libroId: 'libro-2', libroActivo: false }),
    ]);

    expect(store.pedidosVisibles().map((pedido) => pedido.id)).toEqual(['activo']);
    expect(store.ocultosPorLibroInactivo()).toBe(1);
  });

  it('debería incluir los pedidos de libros inactivos cuando se pide explícitamente', () => {
    store.pedidos.set([
      crearDetalleMock({ id: 'activo', libroActivo: true }),
      crearDetalleMock({ id: 'inactivo', libroId: 'libro-2', libroActivo: false }),
    ]);
    store.filtros.update((actual) => ({ ...actual, incluirInactivos: true }));

    expect(store.pedidosVisibles().length).toBe(2);
  });

  it('debería dejar los libros inactivos fuera de las estadísticas', () => {
    store.pedidos.set([
      crearDetalleMock({ id: 'activo', saldo: 5000, libroActivo: true }),
      crearDetalleMock({ id: 'inactivo', libroId: 'libro-2', saldo: 9000, libroActivo: false }),
    ]);

    expect(store.estadisticas().total).toBe(1);
    expect(store.estadisticas().saldoTotal).toBe(5000);
  });

  it('debería encontrar alumnos ignorando acentos', () => {
    store.pedidos.set([crearDetalleMock({ alumno: 'Valentín Esliman' })]);
    store.filtros.update((actual) => ({ ...actual, busqueda: 'valentin' }));

    expect(store.pedidosFiltrados().length).toBe(1);
  });

  describe('filtro por división', () => {
    beforeEach(() => {
      store.pedidos.set([
        crearDetalleMock({ id: 'a', alumno: 'Ana', division: '6A' }),
        crearDetalleMock({ id: 'b', alumno: 'Bruno', division: '10A' }),
        crearDetalleMock({ id: 'c', alumno: 'Carla', division: '3A' }),
        crearDetalleMock({ id: 'd', alumno: 'Dario', division: null }),
      ]);
    });

    it('debería ofrecer las divisiones existentes ordenadas como cursos', () => {
      expect(store.divisionesDisponibles()).toEqual(['3A', '6A', '10A', DIVISION_SIN_ASIGNAR]);
    });

    it('debería filtrar por la división elegida', () => {
      store.filtros.update((actual) => ({ ...actual, division: '6A' }));

      expect(store.pedidosFiltrados().map((pedido) => pedido.id)).toEqual(['a']);
    });

    it('debería poder aislar los pedidos sin división cargada', () => {
      store.filtros.update((actual) => ({ ...actual, division: DIVISION_SIN_ASIGNAR }));

      expect(store.pedidosFiltrados().map((pedido) => pedido.id)).toEqual(['d']);
    });

    it('debería combinarse con la búsqueda por alumno', () => {
      store.filtros.update((actual) => ({ ...actual, division: '6A', busqueda: 'bruno' }));

      expect(store.pedidosFiltrados().length).toBe(0);
    });
  });
});
