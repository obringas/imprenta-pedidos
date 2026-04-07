import { CostosUnitariosInsumos } from '../models/configuracion-insumos.model';

export interface ResultadoCostoLibro {
  readonly hojas: number;
  readonly costoBase: number;
  readonly precioSugerido: number;
}

export function calcularPrecioSugerido(
  paginas: number,
  margenPorcentaje: number,
  costos: CostosUnitariosInsumos,
): ResultadoCostoLibro {
  if (paginas <= 0) {
    return { hojas: 0, costoBase: 0, precioSugerido: 0 };
  }

  const hojas = Math.ceil(paginas / 2);
  const costoBase =
    costos.tapaPorLibro +
    costos.espiralPorLibro +
    hojas * costos.hojaUnitaria +
    paginas * costos.tonerPorCara;
  const precioSugerido = costoBase * (1 + margenPorcentaje / 100);

  return { hojas, costoBase, precioSugerido };
}

export function derivarCostosUnitarios(
  insumos: Record<string, number>,
): CostosUnitariosInsumos {
  const dividir = (dividendo: number | undefined, divisor: number | undefined): number => {
    if (!dividendo || !divisor) {
      return 0;
    }

    return dividendo / divisor;
  };

  return {
    tapaPorLibro: dividir(insumos['tapa_paquete'], insumos['tapa_cantidad']),
    espiralPorLibro: dividir(insumos['espiral_paquete'], insumos['espiral_cantidad']),
    hojaUnitaria: dividir(insumos['hojas_resma'], (insumos['hojas_cantidad'] ?? 0) * 10),
    tonerPorCara: dividir((insumos['toner_costo'] ?? 0) * 4, insumos['toner_impresiones']),
  };
}
