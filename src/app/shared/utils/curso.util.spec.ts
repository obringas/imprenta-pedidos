import {
  SIN_DIVISION,
  SIN_GRADO,
  compararDivisiones,
  compararGrados,
  etiquetaCurso,
  parsearCurso,
} from './curso.util';

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
  it('debería escribir el curso en palabras para que se lea en el Excel', () => {
    expect(etiquetaCurso({ grado: '6', division: 'A' })).toBe('6 Grado A');
    expect(etiquetaCurso({ grado: '7', division: 'B' })).toBe('7 Grado B');
  });

  it('debería resolver el caso de grado sin división', () => {
    expect(etiquetaCurso({ grado: '3', division: null })).toBe('3 Grado');
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

  it('no debería ordenar como texto: 10 va después de 6', () => {
    expect(compararGrados('10', '6')).toBeGreaterThan(0);
  });
});

describe('compararDivisiones', () => {
  it('debería ordenar alfabéticamente y dejar Sin division al final', () => {
    const ordenados = ['C', SIN_DIVISION, 'A', 'B'].sort(compararDivisiones);
    expect(ordenados).toEqual(['A', 'B', 'C', SIN_DIVISION]);
  });
});
