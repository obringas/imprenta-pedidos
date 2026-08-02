import { SIN_GRADO, compararGrados, etiquetaCurso, parsearCurso } from './curso.util';

describe('parsearCurso', () => {
  it('debería separar grado y división del formato actual', () => {
    expect(parsearCurso('6A')).toEqual({ grado: '6', division: 'A' });
    expect(parsearCurso('2B')).toEqual({ grado: '2', division: 'B' });
  });

  it('debería tolerar los formatos heredados con espacios y minúsculas', () => {
    expect(parsearCurso('7 B')).toEqual({ grado: '7', division: 'B' });
    expect(parsearCurso('3b')).toEqual({ grado: '3', division: 'B' });
    expect(parsearCurso('6° A')).toEqual({ grado: '6', division: 'A' });
  });

  it('debería reconocer una división suelta sin grado', () => {
    expect(parsearCurso('A')).toEqual({ grado: null, division: 'A' });
    expect(parsearCurso('c')).toEqual({ grado: null, division: 'C' });
  });

  it('debería devolver ambos nulos cuando no hay dato utilizable', () => {
    expect(parsearCurso(null)).toEqual({ grado: null, division: null });
    expect(parsearCurso('   ')).toEqual({ grado: null, division: null });
    expect(parsearCurso('Cartilla inglés')).toEqual({ grado: null, division: null });
  });
});

describe('etiquetaCurso', () => {
  it('debería juntar grado y división sin separador', () => {
    expect(etiquetaCurso({ grado: '6', division: 'A' })).toBe('6A');
  });

  it('debería avisar cuando falta el grado', () => {
    expect(etiquetaCurso({ grado: null, division: 'B' })).toBe('Sin grado B');
    expect(etiquetaCurso({ grado: null, division: null })).toBe(SIN_GRADO);
  });
});

describe('compararGrados', () => {
  it('debería ordenar numéricamente y dejar Sin grado al final', () => {
    const ordenados = ['6', SIN_GRADO, '2', '10'].sort(compararGrados);
    expect(ordenados).toEqual(['2', '6', '10', SIN_GRADO]);
  });
});
