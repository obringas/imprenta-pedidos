import { TAMANIO_IMPRESION } from '../../../shared/constants/negocio.constants';
import { precioSegunTamanio } from './libro.model';

describe('precioSegunTamanio', () => {
  const libro = { precioA4: 6800, precioA5: 3500 };

  it('debería devolver el precio A4 para A4', () => {
    expect(precioSegunTamanio(libro, TAMANIO_IMPRESION.A4)).toBe(6800);
  });

  it('debería devolver el precio A5 para A5', () => {
    expect(precioSegunTamanio(libro, TAMANIO_IMPRESION.A5)).toBe(3500);
  });

  it('debería devolver null si el libro todavía no tiene precio A4', () => {
    expect(precioSegunTamanio({ precioA4: null, precioA5: 3500 }, TAMANIO_IMPRESION.A4)).toBeNull();
  });
});
