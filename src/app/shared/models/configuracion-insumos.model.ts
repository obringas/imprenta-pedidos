export type ClaveInsumo =
  | 'tapa_paquete'
  | 'tapa_cantidad'
  | 'espiral_paquete'
  | 'espiral_cantidad'
  | 'hojas_resma'
  | 'hojas_cantidad'
  | 'toner_costo'
  | 'toner_impresiones';

export interface ConfiguracionInsumo {
  readonly id: string;
  readonly clave: ClaveInsumo;
  readonly descripcion: string;
  readonly valor: number;
  readonly unidad: string;
  readonly updatedAt: string;
}

export interface CostosUnitariosInsumos {
  readonly tapaPorLibro: number;
  readonly espiralPorLibro: number;
  readonly hojaUnitaria: number;
  readonly tonerPorCara: number;
}
