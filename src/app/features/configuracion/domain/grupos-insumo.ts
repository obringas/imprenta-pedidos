import {
  ClaveInsumo,
  ConfiguracionInsumo,
  esClaveDeprecada,
} from '../../../shared/models/configuracion-insumos.model';

export interface GrupoInsumos {
  readonly titulo: string;
  readonly insumos: readonly ConfiguracionInsumo[];
}

/** Bloques de la pantalla de insumos, en el orden en que se muestran. */
const GRUPOS: readonly { readonly titulo: string; readonly claves: readonly ClaveInsumo[] }[] = [
  { titulo: 'Papel', claves: ['hojas_resma', 'hojas_cantidad'] },
  {
    titulo: 'Espiral y tapa',
    claves: ['espiral_paquete', 'espiral_cantidad', 'espiral_max_hojas', 'tapa_paquete', 'tapa_a5_paquete', 'tapa_cantidad'],
  },
  {
    titulo: 'Toner',
    claves: ['toner_negro_costo', 'toner_negro_rinde', 'toner_color_costo', 'toner_color_rinde', 'toner_factor_rendimiento'],
  },
  {
    titulo: 'Cobertura de página',
    claves: [
      'cobertura_bn_negro',
      'cobertura_poco_negro',
      'cobertura_poco_color',
      'cobertura_pleno_negro',
      'cobertura_pleno_color',
    ],
  },
  {
    titulo: 'Precio',
    claves: ['margen_default', 'margen_minimo', 'precio_redondeo', 'descuento_cantidad_pct', 'descuento_cantidad_minima'],
  },
  { titulo: 'Mensaje', claves: ['whatsapp_contacto', 'whatsapp_firma'] },
];

/**
 * Agrupa los insumos por bloque. Las claves deprecadas no se muestran; una
 * clave que no esta en ningun bloque va a "Otros" para no esconderla.
 */
export function agruparInsumos(insumos: readonly ConfiguracionInsumo[]): GrupoInsumos[] {
  const porClave = new Map<string, ConfiguracionInsumo>(insumos.map((insumo) => [insumo.clave, insumo]));
  const agrupadas = new Set<string>(GRUPOS.flatMap((grupo) => grupo.claves));

  const grupos: GrupoInsumos[] = GRUPOS.map((grupo) => ({
    titulo: grupo.titulo,
    insumos: grupo.claves
      .map((clave) => porClave.get(clave))
      .filter((insumo): insumo is ConfiguracionInsumo => insumo !== undefined),
  }));

  const otros = insumos.filter((insumo) => !agrupadas.has(insumo.clave) && !esClaveDeprecada(insumo.clave));
  return [...grupos, { titulo: 'Otros', insumos: otros }].filter((grupo) => grupo.insumos.length > 0);
}
