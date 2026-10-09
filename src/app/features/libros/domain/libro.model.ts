import { TAMANIO_IMPRESION, TamanioImpresion, TipoImpresion } from '../../../shared/constants/negocio.constants';

export interface Libro {
  readonly id: string;
  readonly titulo: string;
  /** Null solo en libros cargados antes de que existiera el precio A4. */
  readonly precioA4: number | null;
  readonly precioA5: number;
  readonly paginas: number;
  readonly hojas: number;
  readonly observaciones: string | null;
  /** Margen (% sobre costo) con el que se aplicaron los precios de este libro. */
  readonly margenGanancia: number;
  readonly tipoImpresion: TipoImpresion;
  /** Solo cuenta en tipo `mixto`: esas paginas van a color pleno, el resto en B/N. */
  readonly paginasColor: number;
  readonly activo: boolean;
}

export interface CrearLibroInput {
  readonly titulo: string;
  readonly precioA4: number;
  readonly precioA5: number;
  readonly paginas: number;
  readonly observaciones: string | null;
  readonly margenGanancia: number;
  readonly tipoImpresion: TipoImpresion;
  readonly paginasColor: number;
}

export interface ActualizarLibroInput extends Omit<CrearLibroInput, 'precioA4'> {
  /** Admite null para poder activar o desactivar un libro que todavia no tiene precio A4. */
  readonly precioA4: number | null;
  readonly activo: boolean;
}

/** Precio vigente del libro para ese tamaño, o null si todavia no se cargo. */
export function precioSegunTamanio(
  libro: Pick<Libro, 'precioA4' | 'precioA5'>,
  tamanio: TamanioImpresion,
): number | null {
  return tamanio === TAMANIO_IMPRESION.A4 ? libro.precioA4 : libro.precioA5;
}

/** Datos actuales del libro listos para `update`, para cambiar solo algunos campos. */
export function aActualizarLibroInput(libro: Libro): ActualizarLibroInput {
  return {
    titulo: libro.titulo,
    precioA4: libro.precioA4,
    precioA5: libro.precioA5,
    paginas: libro.paginas,
    observaciones: libro.observaciones,
    margenGanancia: libro.margenGanancia,
    tipoImpresion: libro.tipoImpresion,
    paginasColor: libro.paginasColor,
    activo: libro.activo,
  };
}
