export const ESTADO_PAGO = {
  PENDIENTE: 'Pendiente',
  SENA: 'Seña',
  PAGADO: 'Pagado',
} as const;

export type EstadoPago = (typeof ESTADO_PAGO)[keyof typeof ESTADO_PAGO];

export const ESTADO_IMPRESION = {
  PENDIENTE: 'Pendiente',
  IMPRESO: 'Impreso',
} as const;

export type EstadoImpresion = (typeof ESTADO_IMPRESION)[keyof typeof ESTADO_IMPRESION];

export const ESTADO_ENTREGA = {
  PENDIENTE: 'Pendiente',
  ENTREGADO: 'Entregado',
} as const;

export type EstadoEntrega = (typeof ESTADO_ENTREGA)[keyof typeof ESTADO_ENTREGA];

export const ESTADO_GENERAL = {
  PENDIENTE: 'Pendiente',
  IMPRESO_CON_SALDO: 'Impreso con saldo',
  LISTO_ENTREGAR: 'Listo p/entregar',
  ENTREGADO_CON_SALDO: 'Entregado con saldo',
  PAGADO_PEND_IMP: 'Pagado/pend. impresión',
  CERRADO: 'Cerrado',
} as const;

export type EstadoGeneral = (typeof ESTADO_GENERAL)[keyof typeof ESTADO_GENERAL];

export const PRIORIDAD_ESTADO_GENERAL: Record<EstadoGeneral, number> = {
  [ESTADO_GENERAL.LISTO_ENTREGAR]: 1,
  [ESTADO_GENERAL.IMPRESO_CON_SALDO]: 2,
  [ESTADO_GENERAL.PAGADO_PEND_IMP]: 3,
  [ESTADO_GENERAL.PENDIENTE]: 4,
  [ESTADO_GENERAL.ENTREGADO_CON_SALDO]: 5,
  [ESTADO_GENERAL.CERRADO]: 6,
};

export const ESTADO_VISUAL: Record<string, { readonly variant: string; readonly label: string }> = {
  [ESTADO_GENERAL.PENDIENTE]: { variant: 'muted', label: 'Pendiente' },
  [ESTADO_GENERAL.IMPRESO_CON_SALDO]: { variant: 'warning', label: 'Impreso c/saldo' },
  [ESTADO_GENERAL.LISTO_ENTREGAR]: { variant: 'accent', label: 'Listo p/entregar' },
  [ESTADO_GENERAL.ENTREGADO_CON_SALDO]: { variant: 'danger', label: 'Entregado c/saldo' },
  [ESTADO_GENERAL.PAGADO_PEND_IMP]: { variant: 'info', label: 'Pagado/pend.imp.' },
  [ESTADO_GENERAL.CERRADO]: { variant: 'success', label: 'Cerrado' },
  [ESTADO_IMPRESION.IMPRESO]: { variant: 'info', label: 'Impreso' },
  [ESTADO_ENTREGA.ENTREGADO]: { variant: 'success', label: 'Entregado' },
  [ESTADO_PAGO.PAGADO]: { variant: 'success', label: 'Pagado' },
  [ESTADO_PAGO.SENA]: { variant: 'accent', label: 'Seña' },
};

export function calcularHojas(paginas: number): number {
  return Math.ceil(paginas / 2);
}
