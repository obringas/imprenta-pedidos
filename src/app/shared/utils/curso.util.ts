/**
 * La base guarda el curso en un unico campo de texto libre (`pedidos.division`).
 * Conviven formatos nuevos como `6A` o `2B` con valores heredados de la
 * migracion original: `A`, `c`, `7 B`, o directamente vacio.
 *
 * Estas funciones interpretan ese campo para poder filtrar por grado y division
 * por separado, sin tocar el schema ni reescribir datos historicos.
 */

export const SIN_GRADO = 'Sin grado';
export const SIN_DIVISION = 'Sin division';

export interface Curso {
  /** Numero de grado como texto (`6`), o null si el valor heredado no lo indica. */
  readonly grado: string | null;
  /** Letra de division en mayuscula (`A`), o null si no se puede determinar. */
  readonly division: string | null;
}

const FORMATO_GRADO_Y_DIVISION = /^(\d{1,2})\s*[°º-]?\s*([A-Z])$/;
const FORMATO_SOLO_DIVISION = /^([A-Z])$/;
const FORMATO_SOLO_GRADO = /^(\d{1,2})\s*[°º]?$/;

export function parsearCurso(valorCrudo: string | null): Curso {
  const valor = (valorCrudo ?? '').trim().toUpperCase();

  if (!valor) {
    return { grado: null, division: null };
  }

  const gradoYDivision = FORMATO_GRADO_Y_DIVISION.exec(valor);
  if (gradoYDivision) {
    return { grado: gradoYDivision[1], division: gradoYDivision[2] };
  }

  const soloDivision = FORMATO_SOLO_DIVISION.exec(valor);
  if (soloDivision) {
    return { grado: null, division: soloDivision[1] };
  }

  const soloGrado = FORMATO_SOLO_GRADO.exec(valor);
  if (soloGrado) {
    return { grado: soloGrado[1], division: null };
  }

  return { grado: null, division: null };
}

/** Valor que usan los selectores. Nunca null, para poder compararlo directo. */
export function claveGrado(curso: Curso): string {
  return curso.grado ?? SIN_GRADO;
}

export function claveDivision(curso: Curso): string {
  return curso.division ?? SIN_DIVISION;
}

/**
 * Etiqueta legible del curso: `7 Grado A`, `7 Grado`, `Sin grado B`,
 * `Sin grado`.
 *
 * Se escribe en palabras y no como `7A` porque este texto termina en el
 * Excel que se imprime y se comparte con el colegio.
 */
export function etiquetaCurso(curso: Curso): string {
  if (curso.grado && curso.division) {
    return `${curso.grado} Grado ${curso.division}`;
  }

  if (curso.division) {
    return `${SIN_GRADO} ${curso.division}`;
  }

  if (curso.grado) {
    return `${curso.grado} Grado`;
  }

  return SIN_GRADO;
}

/**
 * Ordena grados de menor a mayor dejando `Sin grado` al final, para que los
 * datos heredados no se mezclen entre los cursos reales.
 */
export function compararGrados(uno: string, otro: string): number {
  if (uno === SIN_GRADO) return 1;
  if (otro === SIN_GRADO) return -1;
  return Number(uno) - Number(otro);
}

export function compararDivisiones(uno: string, otro: string): number {
  if (uno === SIN_DIVISION) return 1;
  if (otro === SIN_DIVISION) return -1;
  return uno.localeCompare(otro);
}
