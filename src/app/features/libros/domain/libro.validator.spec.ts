import { TIPO_IMPRESION } from '../../../shared/constants/negocio.constants';
import { actualizarLibroSchema, crearLibroSchema } from './libro.validator';

describe('crearLibroSchema', () => {
  const valido = {
    titulo: 'Bajo el jacarandá',
    precioA4: 11050,
    precioA5: 5700,
    paginas: 130,
    observaciones: null,
    margenGanancia: 150,
    tipoImpresion: TIPO_IMPRESION.POCO_COLOR,
    paginasColor: 0,
  };

  it('debería aceptar un libro completo', () => {
    expect(crearLibroSchema.safeParse(valido).success).toBeTrue();
  });

  it('debería rechazar un tipo de impresión desconocido', () => {
    expect(crearLibroSchema.safeParse({ ...valido, tipoImpresion: 'sepia' }).success).toBeFalse();
  });

  it('debería exigir páginas a color en un libro mixto', () => {
    const resultado = crearLibroSchema.safeParse({ ...valido, tipoImpresion: TIPO_IMPRESION.MIXTO, paginasColor: 0 });
    expect(resultado.success).toBeFalse();
    expect(resultado.error?.issues[0]?.path).toEqual(['paginasColor']);
  });

  it('debería rechazar más páginas a color que páginas del libro', () => {
    const resultado = crearLibroSchema.safeParse({ ...valido, tipoImpresion: TIPO_IMPRESION.MIXTO, paginasColor: 131 });
    expect(resultado.success).toBeFalse();
  });

  it('debería rechazar un margen fuera del rango de la base (0 a 500)', () => {
    expect(crearLibroSchema.safeParse({ ...valido, margenGanancia: -1 }).success).toBeFalse();
    expect(crearLibroSchema.safeParse({ ...valido, margenGanancia: 501 }).success).toBeFalse();
  });
});

describe('actualizarLibroSchema', () => {
  it('debería admitir precio A4 null para activar un libro viejo', () => {
    const resultado = actualizarLibroSchema.safeParse({
      titulo: 'Libro viejo',
      precioA4: null,
      precioA5: 5000,
      paginas: 80,
      observaciones: null,
      margenGanancia: 156,
      tipoImpresion: TIPO_IMPRESION.POCO_COLOR,
      paginasColor: 0,
      activo: true,
    });
    expect(resultado.success).toBeTrue();
  });
});
