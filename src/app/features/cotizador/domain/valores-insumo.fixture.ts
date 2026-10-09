import { ValoresInsumo } from '../../../shared/models/configuracion-insumos.model';

/** Valores de `/configuracion/insumos` al 2026-10-09. Solo para tests. */
export const VALORES_INSUMO_FIXTURE: ValoresInsumo = {
  hojas_resma: 59000,
  hojas_cantidad: 500,
  espiral_paquete: 6700,
  espiral_cantidad: 50,
  espiral_max_hojas: 85,
  tapa_paquete: 7900,
  tapa_a5_paquete: 3950,
  tapa_cantidad: 50,
  toner_negro_costo: 166000,
  toner_negro_rinde: 24000,
  toner_color_costo: 330000,
  toner_color_rinde: 21000,
  toner_factor_rendimiento: 1,
  cobertura_bn_negro: 5,
  cobertura_poco_negro: 5,
  cobertura_poco_color: 2,
  cobertura_pleno_negro: 5,
  cobertura_pleno_color: 5,
  margen_default: 150,
  margen_minimo: 60,
  precio_redondeo: 50,
  descuento_cantidad_pct: 12,
  descuento_cantidad_minima: 15,
};
