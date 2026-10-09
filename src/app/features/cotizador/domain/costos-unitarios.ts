import { ValoresInsumo } from '../../../shared/models/configuracion-insumos.model';
import { CostosUnitarios, ReglasPrecio } from './cotizacion.model';

/** Los rendimientos de toner que informa el fabricante son con 5 % de cobertura por cara. */
const COBERTURA_NOMINAL = 5;
/** Cian, magenta y amarillo: los tres cartuchos de color. */
const CARTUCHOS_COLOR = 3;

function dividir(dividendo: number, divisor: number): number {
  return divisor > 0 ? dividendo / divisor : 0;
}

/** Costo unitario de cada insumo, con los valores de `/configuracion/insumos`. */
export function derivarCostosUnitarios(cfg: ValoresInsumo): CostosUnitarios {
  const negroPor5 = dividir(cfg.toner_negro_costo, cfg.toner_negro_rinde * cfg.toner_factor_rendimiento);
  const colorPor5 = dividir(cfg.toner_color_costo, cfg.toner_color_rinde * cfg.toner_factor_rendimiento);

  const costoCara = (coberturaNegro: number, coberturaColor: number): number =>
    negroPor5 * (coberturaNegro / COBERTURA_NOMINAL) +
    CARTUCHOS_COLOR * colorPor5 * (coberturaColor / COBERTURA_NOMINAL);

  return {
    hoja: dividir(cfg.hojas_resma, cfg.hojas_cantidad * 10),
    espiral: dividir(cfg.espiral_paquete, cfg.espiral_cantidad),
    tapaA4: dividir(cfg.tapa_paquete, cfg.tapa_cantidad),
    tapaA5: dividir(cfg.tapa_a5_paquete, cfg.tapa_cantidad),
    // Una pagina B/N no usa color.
    caraBn: costoCara(cfg.cobertura_bn_negro, 0),
    caraPocoColor: costoCara(cfg.cobertura_poco_negro, cfg.cobertura_poco_color),
    caraColorPleno: costoCara(cfg.cobertura_pleno_negro, cfg.cobertura_pleno_color),
  };
}

export function reglasDePrecio(cfg: ValoresInsumo): ReglasPrecio {
  return {
    espiralMaxHojas: cfg.espiral_max_hojas,
    redondeo: cfg.precio_redondeo,
    descuentoCantidadPct: cfg.descuento_cantidad_pct,
    margenMinimo: cfg.margen_minimo,
  };
}
