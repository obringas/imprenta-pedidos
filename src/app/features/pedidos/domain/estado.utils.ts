import {
  ESTADO_ENTREGA,
  ESTADO_GENERAL,
  ESTADO_IMPRESION,
  EstadoGeneral,
} from '../../../shared/constants/negocio.constants';
import { Pedido } from './pedido.model';

export function calcularSaldo(precioCobrado: number, montoCobrado: number): number {
  return Math.max(precioCobrado - montoCobrado, 0);
}

export function determinarEstadoGeneral(pedido: Pedido): EstadoGeneral {
  const saldo = calcularSaldo(pedido.precioCobrado, pedido.montoCobrado);

  if (pedido.estadoEntrega === ESTADO_ENTREGA.ENTREGADO && saldo === 0) {
    return ESTADO_GENERAL.CERRADO;
  }

  if (pedido.estadoEntrega === ESTADO_ENTREGA.ENTREGADO && saldo > 0) {
    return ESTADO_GENERAL.ENTREGADO_CON_SALDO;
  }

  if (pedido.estadoImpresion === ESTADO_IMPRESION.IMPRESO && saldo === 0) {
    return ESTADO_GENERAL.LISTO_ENTREGAR;
  }

  if (pedido.estadoImpresion === ESTADO_IMPRESION.IMPRESO && saldo > 0) {
    return ESTADO_GENERAL.IMPRESO_CON_SALDO;
  }

  if (pedido.montoCobrado > 0 && pedido.estadoImpresion === ESTADO_IMPRESION.PENDIENTE) {
    return ESTADO_GENERAL.PAGADO_PEND_IMP;
  }

  return ESTADO_GENERAL.PENDIENTE;
}
