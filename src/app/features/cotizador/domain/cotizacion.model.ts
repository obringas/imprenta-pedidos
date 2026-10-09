import { TamanioImpresion, TipoImpresion } from '../../../shared/constants/negocio.constants';

/** Costo de cada insumo por unidad, derivado de `/configuracion/insumos`. */
export interface CostosUnitarios {
  /** Una hoja A4. */
  readonly hoja: number;
  readonly espiral: number;
  readonly tapaA4: number;
  readonly tapaA5: number;
  /** Toner por cara impresa en A4, segun la cobertura de cada tipo de pagina. */
  readonly caraBn: number;
  readonly caraPocoColor: number;
  readonly caraColorPleno: number;
}

/** Reglas de armado y precio, tambien de `/configuracion/insumos`. */
export interface ReglasPrecio {
  readonly espiralMaxHojas: number;
  /** El precio se redondea a multiplos de este valor. */
  readonly redondeo: number;
  /** 0 = sin precio por cantidad. */
  readonly descuentoCantidadPct: number;
  /** % sobre costo; por debajo, la cotizacion queda marcada. */
  readonly margenMinimo: number;
}

export interface CotizacionInput {
  readonly paginas: number;
  readonly tipoImpresion: TipoImpresion;
  /** Solo `mixto`: esas paginas van a color pleno, el resto en B/N. */
  readonly paginasColor?: number;
  readonly tamanio: TamanioImpresion;
  /** % sobre costo. */
  readonly margenGanancia: number;
  /** Si viene, manda sobre el margen: el margen sale del precio (modo inverso). */
  readonly precioObjetivo?: number | null;
}

export interface Cotizacion {
  /** Hojas de un ejemplar impreso doble faz: `ceil(paginas / 2)`. Igual en A4 y A5. */
  readonly hojasFisicas: number;
  readonly tomos: number;
  readonly papel: number;
  readonly toner: number;
  readonly espiral: number;
  readonly tapa: number;
  readonly costo: number;
  readonly precio: number;
  /** Precio con descuento por cantidad; null si el descuento es 0. Nunca se persiste. */
  readonly precioCantidad: number | null;
  /** % sobre costo del precio final (ya redondeado). */
  readonly margenSobreCosto: number;
  /** Fraccion de 0 a 1: `1 - costo / precio`. */
  readonly margenSobreVenta: number;
  readonly ganancia: number;
  readonly bajoMinimo: boolean;
}
