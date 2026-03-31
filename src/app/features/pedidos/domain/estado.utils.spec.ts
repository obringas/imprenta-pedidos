import { ESTADO_ENTREGA, ESTADO_GENERAL, ESTADO_IMPRESION, ESTADO_PAGO } from '../../../shared/constants/negocio.constants';
import { Pedido } from './pedido.model';
import { determinarEstadoGeneral } from './estado.utils';

function crearPedidoMock(parcial?: Partial<Pedido>): Pedido {
  return {
    id: 'pedido-1',
    libroId: 'libro-1',
    libroTitulo: 'Libro demo',
    alumno: 'Alumno Demo',
    division: 'A',
    precioCobrado: 10000,
    estadoImpresion: ESTADO_IMPRESION.PENDIENTE,
    estadoEntrega: ESTADO_ENTREGA.PENDIENTE,
    estadoPago: ESTADO_PAGO.PENDIENTE,
    montoCobrado: 0,
    observaciones: null,
    creadoEn: '2026-03-31',
    actualizadoEn: '2026-03-31',
    ...parcial,
  };
}

describe('determinarEstadoGeneral', () => {
  it('debería retornar Cerrado cuando está entregado y saldo es 0', () => {
    const pedido = crearPedidoMock({
      estadoEntrega: ESTADO_ENTREGA.ENTREGADO,
      estadoPago: ESTADO_PAGO.PAGADO,
      montoCobrado: 10000,
    });

    expect(determinarEstadoGeneral(pedido)).toBe(ESTADO_GENERAL.CERRADO);
  });

  it('debería retornar Listo p/entregar cuando está impreso y saldo es 0', () => {
    const pedido = crearPedidoMock({
      estadoImpresion: ESTADO_IMPRESION.IMPRESO,
      estadoPago: ESTADO_PAGO.PAGADO,
      montoCobrado: 10000,
    });

    expect(determinarEstadoGeneral(pedido)).toBe(ESTADO_GENERAL.LISTO_ENTREGAR);
  });
});

