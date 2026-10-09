/** Como se edita y valida cada insumo. `texto` se guarda en `valor_texto`; el resto en `valor`. */
export type TipoInsumo = 'numero' | 'dinero' | 'porcentaje' | 'texto';

/** Claves numericas que usan el modelo de costos y el cotizador. */
export const CLAVES_NUMERICAS = [
  'hojas_resma',
  'hojas_cantidad',
  'espiral_paquete',
  'espiral_cantidad',
  'espiral_max_hojas',
  'tapa_paquete',
  'tapa_a5_paquete',
  'tapa_cantidad',
  'toner_negro_costo',
  'toner_negro_rinde',
  'toner_color_costo',
  'toner_color_rinde',
  'toner_factor_rendimiento',
  'cobertura_bn_negro',
  'cobertura_poco_negro',
  'cobertura_poco_color',
  'cobertura_pleno_negro',
  'cobertura_pleno_color',
  'margen_default',
  'margen_minimo',
  'precio_redondeo',
  'descuento_cantidad_pct',
  'descuento_cantidad_minima',
] as const;

export const CLAVES_TEXTO = ['whatsapp_contacto', 'whatsapp_firma'] as const;

/** Reemplazadas por toner_negro_* y toner_color_*. Siguen en la tabla, pero no se muestran ni se usan. */
export const CLAVES_DEPRECADAS = ['toner_costo', 'toner_impresiones'] as const;

export type ClaveNumerica = (typeof CLAVES_NUMERICAS)[number];
export type ClaveTexto = (typeof CLAVES_TEXTO)[number];
export type ClaveDeprecada = (typeof CLAVES_DEPRECADAS)[number];
export type ClaveInsumo = ClaveNumerica | ClaveTexto | ClaveDeprecada;

export interface ReglaInsumo {
  readonly tipo: TipoInsumo;
  readonly minimo?: number;
  readonly maximo?: number;
  /** Cantidades que no admiten decimales (unidades, hojas, caras). */
  readonly entero?: boolean;
}

const CANTIDAD: ReglaInsumo = { tipo: 'numero', minimo: 1, entero: true };
const DINERO: ReglaInsumo = { tipo: 'dinero', minimo: 0 };
const COBERTURA: ReglaInsumo = { tipo: 'porcentaje', minimo: 0, maximo: 100 };
/** Tope del check de `libros.margen_ganancia`. */
const MARGEN: ReglaInsumo = { tipo: 'porcentaje', minimo: 0, maximo: 500 };

export const REGLAS_INSUMO: Readonly<Record<ClaveInsumo, ReglaInsumo>> = {
  hojas_resma: DINERO,
  hojas_cantidad: CANTIDAD,
  espiral_paquete: DINERO,
  espiral_cantidad: CANTIDAD,
  espiral_max_hojas: CANTIDAD,
  tapa_paquete: DINERO,
  tapa_a5_paquete: DINERO,
  tapa_cantidad: CANTIDAD,
  toner_negro_costo: DINERO,
  toner_negro_rinde: CANTIDAD,
  toner_color_costo: DINERO,
  toner_color_rinde: CANTIDAD,
  toner_factor_rendimiento: { tipo: 'numero', minimo: 0.1, maximo: 2 },
  cobertura_bn_negro: COBERTURA,
  cobertura_poco_negro: COBERTURA,
  cobertura_poco_color: COBERTURA,
  cobertura_pleno_negro: COBERTURA,
  cobertura_pleno_color: COBERTURA,
  margen_default: MARGEN,
  margen_minimo: MARGEN,
  precio_redondeo: { tipo: 'dinero', minimo: 1 },
  descuento_cantidad_pct: { tipo: 'porcentaje', minimo: 0, maximo: 90 },
  descuento_cantidad_minima: CANTIDAD,
  whatsapp_contacto: { tipo: 'texto' },
  whatsapp_firma: { tipo: 'texto' },
  toner_costo: DINERO,
  toner_impresiones: CANTIDAD,
};

/** Regla de una clave; una clave desconocida se trata como numero sin limites. */
export function reglaDeInsumo(clave: string): ReglaInsumo {
  return REGLAS_INSUMO[clave as ClaveInsumo] ?? { tipo: 'numero', minimo: 0 };
}

export function esClaveDeprecada(clave: string): clave is ClaveDeprecada {
  return (CLAVES_DEPRECADAS as readonly string[]).includes(clave);
}

export interface ConfiguracionInsumo {
  readonly id: string;
  readonly clave: ClaveInsumo;
  readonly descripcion: string;
  readonly tipo: TipoInsumo;
  /** En los insumos de texto queda en 0. */
  readonly valor: number;
  /** Solo en los insumos de texto. */
  readonly valorTexto: string | null;
  /** Puede incluir `{clave}` para mostrar el valor actual de otro insumo. */
  readonly unidad: string;
  readonly updatedAt: string;
}

/** Numero para `valor`, texto para `valor_texto`. */
export type ValorInsumo = number | string;

/** Devuelve el insumo con el valor nuevo en el campo que le corresponde segun su tipo. */
export function aplicarValorInsumo(insumo: ConfiguracionInsumo, valor: ValorInsumo): ConfiguracionInsumo {
  const updatedAt = new Date().toISOString();
  return typeof valor === 'string'
    ? { ...insumo, valorTexto: valor, updatedAt }
    : { ...insumo, valor, updatedAt };
}

export type ValoresInsumo = Readonly<Record<ClaveNumerica, number>>;
export type TextosInsumo = Readonly<Record<ClaveTexto, string>>;

export interface InsumosIndexados {
  readonly valores: ValoresInsumo;
  readonly textos: TextosInsumo;
  /** Claves que el modelo de costos necesita y no estan en la tabla. */
  readonly faltantes: readonly (ClaveNumerica | ClaveTexto)[];
}

/**
 * Separa los insumos en valores numericos y textos. Una clave faltante queda
 * en 0 o vacia y se informa en `faltantes`: no hay costos por defecto en el codigo.
 */
export function indexarInsumos(insumos: readonly ConfiguracionInsumo[]): InsumosIndexados {
  const porClave = new Map(insumos.map((insumo) => [insumo.clave as string, insumo]));
  const faltantes: (ClaveNumerica | ClaveTexto)[] = [];

  const valores = Object.fromEntries(
    CLAVES_NUMERICAS.map((clave) => {
      const insumo = porClave.get(clave);
      if (!insumo) {
        faltantes.push(clave);
      }
      return [clave, insumo?.valor ?? 0];
    }),
  ) as Record<ClaveNumerica, number>;

  const textos = Object.fromEntries(
    CLAVES_TEXTO.map((clave) => {
      const insumo = porClave.get(clave);
      if (!insumo) {
        faltantes.push(clave);
      }
      return [clave, insumo?.valorTexto ?? ''];
    }),
  ) as Record<ClaveTexto, string>;

  return { valores, textos, faltantes };
}

/** Reemplaza `{clave}` en la unidad por el valor actual de ese insumo ("ARS x {tapa_cantidad} unidades"). */
export function resolverUnidad(unidad: string, insumos: readonly ConfiguracionInsumo[]): string {
  return unidad.replace(/\{([a-z0-9_]+)\}/g, (marcador, clave: string) => {
    const insumo = insumos.find((item) => item.clave === clave);
    if (!insumo) {
      return marcador;
    }

    return insumo.tipo === 'texto'
      ? insumo.valorTexto ?? ''
      : new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(insumo.valor);
  });
}
