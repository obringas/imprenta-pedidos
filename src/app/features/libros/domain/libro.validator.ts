import { z } from 'zod';
import { TIPO_IMPRESION } from '../../../shared/constants/negocio.constants';

/** Mismo rango que el check de `libros.margen_ganancia` en la base. */
export const MARGEN_LIBRO_MAXIMO = 500;

const tipoImpresionSchema = z.enum(
  [TIPO_IMPRESION.BN, TIPO_IMPRESION.POCO_COLOR, TIPO_IMPRESION.COLOR_PLENO, TIPO_IMPRESION.MIXTO],
  { message: 'Elegí el tipo de impresión.' },
);

const libroBaseSchema = z.object({
  titulo: z.string().trim().min(3, 'El título debe tener al menos 3 caracteres.'),
  precioA5: z.number().min(1, 'Ingresá el precio A5, mayor que 0.'),
  paginas: z.number().int().min(2, 'Ingresá al menos 2 páginas.'),
  observaciones: z.string().trim().max(280).nullable(),
  margenGanancia: z
    .number()
    .min(0, 'El margen no puede ser negativo.')
    .max(MARGEN_LIBRO_MAXIMO, `El margen no puede superar ${MARGEN_LIBRO_MAXIMO} %.`),
  tipoImpresion: tipoImpresionSchema,
  paginasColor: z.number().int().min(0, 'Las páginas a color no pueden ser negativas.'),
});

type LibroBase = z.infer<typeof libroBaseSchema>;

function validarPaginasColor(libro: Pick<LibroBase, 'tipoImpresion' | 'paginas' | 'paginasColor'>, ctx: z.RefinementCtx): void {
  if (libro.paginasColor > libro.paginas) {
    ctx.addIssue({
      code: 'custom',
      path: ['paginasColor'],
      message: 'Las páginas a color no pueden ser más que las del libro.',
    });
  }

  if (libro.tipoImpresion === TIPO_IMPRESION.MIXTO && libro.paginasColor === 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['paginasColor'],
      message: 'En un libro mixto indicá cuántas páginas van a color.',
    });
  }
}

export const crearLibroSchema = libroBaseSchema
  .extend({ precioA4: z.number().min(1, 'Ingresá el precio A4, mayor que 0.') })
  .superRefine(validarPaginasColor);

export const actualizarLibroSchema = libroBaseSchema
  .extend({
    // Null solo para activar o desactivar un libro viejo sin precio A4.
    precioA4: z.number().min(1, 'Ingresá el precio A4, mayor que 0.').nullable(),
    activo: z.boolean(),
  })
  .superRefine(validarPaginasColor);
