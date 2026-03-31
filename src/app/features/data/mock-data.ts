import { Libro } from '../libros/domain/libro.model';
import { Pedido } from '../pedidos/domain/pedido.model';
import { ESTADO_ENTREGA, ESTADO_IMPRESION, ESTADO_PAGO } from '../../shared/constants/negocio.constants';

export const LIBROS_INICIALES: Libro[] = [
  { id: 'libro-1', titulo: 'WORKBOOK', precio: 10300, paginas: 144, hojas: 72, observaciones: 'Uso intensivo al inicio del ciclo.', activo: true },
  { id: 'libro-2', titulo: 'Cartilla 7ª', precio: 7500, paginas: 96, hojas: 48, observaciones: null, activo: true },
  { id: 'libro-3', titulo: 'Sentir y pensar 2', precio: 8500, paginas: 80, hojas: 40, observaciones: null, activo: true },
  { id: 'libro-4', titulo: 'Prácticas del Lenguaje 5', precio: 9200, paginas: 128, hojas: 64, observaciones: 'Precio acordado con el colegio.', activo: true },
  { id: 'libro-5', titulo: 'Matemática 4', precio: 8800, paginas: 112, hojas: 56, observaciones: null, activo: true },
  { id: 'libro-6', titulo: 'Cs. Naturales 6', precio: 9600, paginas: 120, hojas: 60, observaciones: null, activo: true },
  { id: 'libro-7', titulo: 'Cartilla Inglés 7', precio: 7000, paginas: 72, hojas: 36, observaciones: 'Confirmar versión final del PDF.', activo: true },
];

export const PEDIDOS_INICIALES: Pedido[] = [
  {
    id: 'pedido-1', libroId: 'libro-1', libroTitulo: 'WORKBOOK', libroHojas: 72, alumno: 'Duarte Irina', division: 'B',
    precioCobrado: 10300, estadoImpresion: ESTADO_IMPRESION.PENDIENTE, fechaImpresion: null, estadoEntrega: ESTADO_ENTREGA.PENDIENTE, fechaEntrega: null,
    estadoPago: ESTADO_PAGO.PENDIENTE, montoCobrado: 0, fechaPago: null, observaciones: null, creadoEn: '2026-03-12', actualizadoEn: '2026-03-12',
  },
  {
    id: 'pedido-2', libroId: 'libro-2', libroTitulo: 'Cartilla 7ª', libroHojas: 48, alumno: 'Theo Medrán', division: '7 B',
    precioCobrado: 7500, estadoImpresion: ESTADO_IMPRESION.PENDIENTE, fechaImpresion: null, estadoEntrega: ESTADO_ENTREGA.PENDIENTE, fechaEntrega: null,
    estadoPago: ESTADO_PAGO.PAGADO, montoCobrado: 7500, fechaPago: '2026-03-10', observaciones: 'Listo para entrar a producción.', creadoEn: '2026-03-09', actualizadoEn: '2026-03-10',
  },
  {
    id: 'pedido-3', libroId: 'libro-3', libroTitulo: 'Sentir y pensar 2', libroHojas: 40, alumno: 'Olivia Glotting', division: null,
    precioCobrado: 8500, estadoImpresion: ESTADO_IMPRESION.IMPRESO, fechaImpresion: '2026-03-18', estadoEntrega: ESTADO_ENTREGA.PENDIENTE, fechaEntrega: null,
    estadoPago: ESTADO_PAGO.PENDIENTE, montoCobrado: 0, fechaPago: null, observaciones: null, creadoEn: '2026-03-04', actualizadoEn: '2026-03-18',
  },
  {
    id: 'pedido-4', libroId: 'libro-4', libroTitulo: 'Prácticas del Lenguaje 5', libroHojas: 64, alumno: 'Mora Ferrero', division: 'A',
    precioCobrado: 9200, estadoImpresion: ESTADO_IMPRESION.IMPRESO, fechaImpresion: '2026-03-16', estadoEntrega: ESTADO_ENTREGA.ENTREGADO, fechaEntrega: '2026-03-20',
    estadoPago: ESTADO_PAGO.SENA, montoCobrado: 4500, fechaPago: '2026-03-20', observaciones: 'Entrega fiada.', creadoEn: '2026-03-01', actualizadoEn: '2026-03-20',
  },
  {
    id: 'pedido-5', libroId: 'libro-5', libroTitulo: 'Matemática 4', libroHojas: 56, alumno: 'Benjamín Lazarte', division: 'C',
    precioCobrado: 8800, estadoImpresion: ESTADO_IMPRESION.IMPRESO, fechaImpresion: '2026-03-18', estadoEntrega: ESTADO_ENTREGA.PENDIENTE, fechaEntrega: null,
    estadoPago: ESTADO_PAGO.PAGADO, montoCobrado: 8800, fechaPago: '2026-03-18', observaciones: null, creadoEn: '2026-03-08', actualizadoEn: '2026-03-18',
  },
  {
    id: 'pedido-6', libroId: 'libro-6', libroTitulo: 'Cs. Naturales 6', libroHojas: 60, alumno: 'Juliana Guanca', division: 'B',
    precioCobrado: 9600, estadoImpresion: ESTADO_IMPRESION.PENDIENTE, fechaImpresion: null, estadoEntrega: ESTADO_ENTREGA.PENDIENTE, fechaEntrega: null,
    estadoPago: ESTADO_PAGO.SENA, montoCobrado: 3000, fechaPago: '2026-03-26', observaciones: null, creadoEn: '2026-03-25', actualizadoEn: '2026-03-26',
  },
];
