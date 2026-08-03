/**
 * Interpreta una lista de alumnos pegada desde WhatsApp.
 *
 * Las listas reales llegan sucias: numeracion con formatos distintos
 * (`1-`, `2.`, `10_`, `11 `, o incluso `1Leonella` sin separador), tildes de
 * verificacion, espacios dobles, espacios finales y caracteres invisibles que
 * se cuelan al copiar (word joiner, zero width space, non breaking space).
 *
 * Un invisible que sobreviva es especialmente danino: el nombre se ve bien en
 * pantalla pero no matchea en ninguna busqueda ni filtro de la app.
 */

/** Caracteres sin ancho que ensucian el copiado y hay que eliminar. */
const INVISIBLES = /[\u2060\u200B\u200C\u200D\uFEFF]/g;
/** Espacios que no son el espacio comun: se normalizan a uno simple. */
const ESPACIOS_RAROS = /[\u00A0\u2007\u202F\t]/g;
/** Emojis y pictogramas, incluido el tilde de verificacion. */
const PICTOGRAMAS = /[\p{Extended_Pictographic}\uFE0F\u20E3]/gu;
/** Numeracion inicial: `1-`, `2.`, `10_`, `11 `, `12)` o pegada al nombre. */
const NUMERACION = /^\d{1,3}\s*[-._):\]]*\s*/;
/** Vinetas que a veces acompanan la numeracion. */
const VINETAS = /^[-*•·]\s*/;
/** Nota entre parentesis al final: se guarda como observacion del pedido. */
const NOTA_FINAL = /\(([^)]*)\)\s*$/;

export interface AlumnoParseado {
  readonly alumno: string;
  readonly observaciones: string | null;
  /** Linea original, para poder mostrar de donde salio cada fila. */
  readonly lineaOriginal: string;
}

export interface ResultadoParseo {
  readonly alumnos: readonly AlumnoParseado[];
  /** Lineas que quedaron vacias despues de limpiar y se descartaron. */
  readonly descartadas: readonly string[];
}

export function parsearListaPegada(texto: string): ResultadoParseo {
  const alumnos: AlumnoParseado[] = [];
  const descartadas: string[] = [];

  for (const lineaOriginal of texto.split(/\r?\n/)) {
    const limpia = limpiarLinea(lineaOriginal);

    if (!limpia) {
      if (lineaOriginal.trim()) {
        descartadas.push(lineaOriginal.trim());
      }
      continue;
    }

    alumnos.push({ ...limpia, lineaOriginal: lineaOriginal.trim() });
  }

  return { alumnos, descartadas };
}

function limpiarLinea(linea: string): Omit<AlumnoParseado, 'lineaOriginal'> | null {
  let valor = linea
    .replace(INVISIBLES, '')
    .replace(ESPACIOS_RAROS, ' ')
    .replace(PICTOGRAMAS, '')
    .trim();

  valor = valor.replace(VINETAS, '').replace(NUMERACION, '').trim();

  const nota = NOTA_FINAL.exec(valor);
  const observaciones = nota?.[1]?.trim() || null;
  if (nota) {
    valor = valor.slice(0, nota.index).trim();
  }

  valor = valor.replace(/\s{2,}/g, ' ').trim();

  // Una linea que quedo sin letras no es un alumno (separadores, numeros sueltos).
  if (!valor || !/\p{L}/u.test(valor)) {
    return null;
  }

  return { alumno: valor, observaciones };
}
