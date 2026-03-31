import { z } from 'zod';
import { ESTADO_ENTREGA, ESTADO_IMPRESION, ESTADO_PAGO } from '../../../shared/constants/negocio.constants';

const fechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida').nullable().optional();

const pedidoBaseSchema = z.object({
  libroId: z.string().min(1, 'Libro requerido'),
  alumno: z.string().trim().min(2, 'Alumno requerido'),
  division: z.string().trim().max(10).nullable(),
  precioCobrado: z.number().min(1, 'Precio inválido'),
  estadoPago: z.enum([ESTADO_PAGO.PENDIENTE, ESTADO_PAGO.SENA, ESTADO_PAGO.PAGADO]),
  montoCobrado: z.number().min(0, 'Monto inválido'),
  observaciones: z.string().trim().max(280).nullable(),
});

export const crearPedidoSchema = pedidoBaseSchema.superRefine((pedido, ctx) => {
  if (pedido.estadoPago === ESTADO_PAGO.PENDIENTE && pedido.montoCobrado !== 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['montoCobrado'],
      message: 'Si el pago está pendiente, el monto cobrado debe ser 0.',
    });
  }

  if (pedido.estadoPago === ESTADO_PAGO.PAGADO && pedido.montoCobrado !== pedido.precioCobrado) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['montoCobrado'],
      message: 'Si el pedido está pagado, el monto debe ser igual al precio.',
    });
  }

  if (pedido.estadoPago === ESTADO_PAGO.SENA && (pedido.montoCobrado <= 0 || pedido.montoCobrado >= pedido.precioCobrado)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['montoCobrado'],
      message: 'La seña debe ser mayor a 0 y menor al precio total.',
    });
  }
});

export const actualizarPedidoSchema = pedidoBaseSchema.extend({
  estadoImpresion: z.enum([ESTADO_IMPRESION.PENDIENTE, ESTADO_IMPRESION.IMPRESO]),
  fechaImpresion: fechaSchema,
  estadoEntrega: z.enum([ESTADO_ENTREGA.PENDIENTE, ESTADO_ENTREGA.ENTREGADO]),
  fechaEntrega: fechaSchema,
  fechaPago: fechaSchema,
}).superRefine((pedido, ctx) => {
  if (pedido.estadoEntrega === ESTADO_ENTREGA.ENTREGADO && pedido.estadoImpresion !== ESTADO_IMPRESION.IMPRESO) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['estadoEntrega'],
      message: 'No podés marcar como entregado un pedido que todavía no fue impreso.',
    });
  }

  if (pedido.estadoPago === ESTADO_PAGO.PENDIENTE && pedido.montoCobrado !== 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['montoCobrado'],
      message: 'Si el pago está pendiente, el monto cobrado debe ser 0.',
    });
  }

  if (pedido.estadoPago === ESTADO_PAGO.PAGADO && pedido.montoCobrado !== pedido.precioCobrado) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['montoCobrado'],
      message: 'Si el pedido está pagado, el monto debe ser igual al precio.',
    });
  }

  if (pedido.estadoPago === ESTADO_PAGO.SENA && (pedido.montoCobrado <= 0 || pedido.montoCobrado >= pedido.precioCobrado)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['montoCobrado'],
      message: 'La seña debe ser mayor a 0 y menor al precio total.',
    });
  }
});
