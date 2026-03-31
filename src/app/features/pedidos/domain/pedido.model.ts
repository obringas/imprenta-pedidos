import { EstadoEntrega, EstadoGeneral, EstadoImpresion, EstadoPago } from '../../../shared/constants/negocio.constants';

export interface Pedido {
  readonly id: string;
  readonly libroId: string;
  readonly libroTitulo: string;
  readonly libroHojas: number;
  readonly alumno: string;
  readonly division: string | null;
  readonly precioCobrado: number;
  readonly estadoImpresion: EstadoImpresion;
  readonly fechaImpresion: string | null;
  readonly estadoEntrega: EstadoEntrega;
  readonly fechaEntrega: string | null;
  readonly estadoPago: EstadoPago;
  readonly montoCobrado: number;
  readonly fechaPago: string | null;
  readonly observaciones: string | null;
  readonly creadoEn: string;
  readonly actualizadoEn: string;
}

export interface PedidoDetalle extends Pedido {
  readonly saldo: number;
  readonly estadoGeneral: EstadoGeneral;
}

export interface CrearPedidoInput {
  readonly libroId: string;
  readonly alumno: string;
  readonly division: string | null;
  readonly precioCobrado: number;
  readonly estadoPago: EstadoPago;
  readonly montoCobrado: number;
  readonly observaciones: string | null;
}

export interface ActualizarPedidoInput extends CrearPedidoInput {
  readonly estadoImpresion: EstadoImpresion;
  readonly estadoEntrega: EstadoEntrega;
  readonly fechaImpresion?: string | null | undefined;
  readonly fechaEntrega?: string | null | undefined;
  readonly fechaPago?: string | null | undefined;
}

export interface FiltroPedidos {
  readonly busqueda: string;
  readonly libroId: string | null;
  readonly estadoGeneral: EstadoGeneral | null;
  readonly estadoPago: EstadoPago | null;
}

