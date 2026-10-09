import { TAMANIO_IMPRESION, TIPO_IMPRESION } from '../../../shared/constants/negocio.constants';
import { Cotizacion, CotizacionInput, CostosUnitarios, ReglasPrecio } from './cotizacion.model';

/** Evita que 180.00000000001 se redondee hacia arriba a 181. */
const DECIMALES_SEGUROS = 9;

const COTIZACION_VACIA: Cotizacion = {
  hojasFisicas: 0,
  tomos: 0,
  papel: 0,
  toner: 0,
  espiral: 0,
  tapa: 0,
  costo: 0,
  precio: 0,
  precioCantidad: null,
  margenSobreCosto: 0,
  margenSobreVenta: 0,
  ganancia: 0,
  bajoMinimo: false,
};

function cociente(valor: number, multiplo: number): number {
  return Number((valor / multiplo).toFixed(DECIMALES_SEGUROS));
}

/** Precio de lista: hacia arriba, para no quedar nunca debajo del margen elegido. */
export function redondearArriba(valor: number, multiplo: number): number {
  return multiplo > 0 ? Math.ceil(cociente(valor, multiplo)) * multiplo : Math.ceil(valor);
}

/** Precio por cantidad: hacia abajo, para que el descuento nunca sea menor al anunciado. */
export function redondearAbajo(valor: number, multiplo: number): number {
  return multiplo > 0 ? Math.floor(cociente(valor, multiplo)) * multiplo : Math.floor(valor);
}

/** % sobre costo que deja ese precio. Con costo 0 no hay margen que calcular. */
export function margenDesdePrecio(costo: number, precio: number): number {
  return costo > 0 ? (precio / costo - 1) * 100 : 0;
}

export function gananciaUnitaria(costo: number, precio: number): number {
  return precio - costo;
}

export function calcularTomos(hojasFisicas: number, espiralMaxHojas: number): number {
  if (espiralMaxHojas <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(hojasFisicas / espiralMaxHojas));
}

/** Toner de un ejemplar impreso en A4. */
function tonerA4(input: CotizacionInput, paginas: number, costos: CostosUnitarios): number {
  switch (input.tipoImpresion) {
    case TIPO_IMPRESION.BN:
      return paginas * costos.caraBn;
    case TIPO_IMPRESION.COLOR_PLENO:
      return paginas * costos.caraColorPleno;
    case TIPO_IMPRESION.MIXTO: {
      const paginasColor = Math.min(Math.max(input.paginasColor ?? 0, 0), paginas);
      return paginasColor * costos.caraColorPleno + (paginas - paginasColor) * costos.caraBn;
    }
    case TIPO_IMPRESION.POCO_COLOR:
    default:
      return paginas * costos.caraPocoColor;
  }
}

function precioFinal(costo: number, input: CotizacionInput, reglas: ReglasPrecio): number {
  const objetivo = input.precioObjetivo;
  if (objetivo != null && objetivo > 0) {
    return redondearArriba(objetivo, reglas.redondeo);
  }

  return redondearArriba(costo * (1 + input.margenGanancia / 100), reglas.redondeo);
}

function precioPorCantidad(precio: number, reglas: ReglasPrecio): number | null {
  if (reglas.descuentoCantidadPct <= 0) {
    return null;
  }

  return redondearAbajo(precio * (1 - reglas.descuentoCantidadPct / 100), reglas.redondeo);
}

/**
 * Costo y precio de un ejemplar. Siempre doble faz: 1 pagina = 1 cara.
 * El A5 se imprime 2-up sobre A4 cortada: usa la mitad del papel (redondeado
 * hacia arriba) y del toner, y su propia tapa. Las hojas y los tomos no cambian.
 */
export function cotizarLibro(input: CotizacionInput, costos: CostosUnitarios, reglas: ReglasPrecio): Cotizacion {
  const paginas = Math.floor(input.paginas);
  if (!(paginas > 0)) {
    return COTIZACION_VACIA;
  }

  const esA5 = input.tamanio === TAMANIO_IMPRESION.A5;
  const hojasFisicas = Math.ceil(paginas / 2);
  const tomos = calcularTomos(hojasFisicas, reglas.espiralMaxHojas);

  const papel = (esA5 ? Math.ceil(paginas / 4) : hojasFisicas) * costos.hoja;
  const toner = tonerA4(input, paginas, costos) / (esA5 ? 2 : 1);
  const espiral = costos.espiral * tomos;
  const tapa = (esA5 ? costos.tapaA5 : costos.tapaA4) * tomos;
  const costo = papel + toner + espiral + tapa;

  const precio = precioFinal(costo, input, reglas);
  const margenSobreCosto = margenDesdePrecio(costo, precio);

  return {
    hojasFisicas,
    tomos,
    papel,
    toner,
    espiral,
    tapa,
    costo,
    precio,
    precioCantidad: precioPorCantidad(precio, reglas),
    margenSobreCosto,
    margenSobreVenta: precio > 0 ? 1 - costo / precio : 0,
    ganancia: gananciaUnitaria(costo, precio),
    bajoMinimo: margenSobreCosto < reglas.margenMinimo,
  };
}
