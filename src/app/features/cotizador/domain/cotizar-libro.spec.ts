import { TAMANIO_IMPRESION, TIPO_IMPRESION } from '../../../shared/constants/negocio.constants';
import { CotizacionInput } from './cotizacion.model';
import { derivarCostosUnitarios, reglasDePrecio } from './costos-unitarios';
import {
  calcularTomos,
  cotizarLibro,
  gananciaUnitaria,
  margenDesdePrecio,
  redondearAbajo,
  redondearArriba,
} from './cotizar-libro';
import { VALORES_INSUMO_FIXTURE } from './valores-insumo.fixture';

describe('cotizarLibro', () => {
  const costos = derivarCostosUnitarios(VALORES_INSUMO_FIXTURE);
  const reglas = reglasDePrecio(VALORES_INSUMO_FIXTURE);
  const libro130: CotizacionInput = {
    paginas: 130,
    tipoImpresion: TIPO_IMPRESION.POCO_COLOR,
    tamanio: TAMANIO_IMPRESION.A4,
    margenGanancia: 150,
  };

  describe('130 páginas, texto con poco color, margen 150 %', () => {
    it('A4: costo ≈ 4410, precio 11.050 y precio por cantidad 9.700', () => {
      const a4 = cotizarLibro(libro130, costos, reglas);
      expect(a4.hojasFisicas).toBe(65);
      expect(a4.tomos).toBe(1);
      expect(a4.costo).toBeCloseTo(4410, 0);
      expect(a4.precio).toBe(11050);
      expect(a4.precioCantidad).toBe(9700);
    });

    // El papel A5 es ceil(130 / 4) = 33 hojas A4, por eso el costo da ≈ 2277,7.
    // Con 32,5 hojas (sin redondear) daria ≈ 2272: el precio es el mismo.
    it('A5: costo ≈ 2278, precio 5.700 y precio por cantidad 5.000', () => {
      const a4 = cotizarLibro(libro130, costos, reglas);
      const a5 = cotizarLibro({ ...libro130, tamanio: TAMANIO_IMPRESION.A5 }, costos, reglas);
      expect(a5.hojasFisicas).toBe(65);
      expect(a5.papel).toBeCloseTo(33 * 11.8, 10);
      expect(a5.toner).toBeCloseTo(a4.toner / 2, 10);
      expect(a5.tapa).toBe(79);
      expect(a5.costo).toBeCloseTo(2277.7, 1);
      expect(a5.precio).toBe(5700);
      expect(a5.precioCantidad).toBe(5000);
    });

    it('debería informar ganancia y márgenes del precio final', () => {
      const a4 = cotizarLibro(libro130, costos, reglas);
      expect(a4.ganancia).toBeCloseTo(11050 - a4.costo, 10);
      expect(a4.margenSobreCosto).toBeCloseTo(margenDesdePrecio(a4.costo, 11050), 10);
      expect(a4.margenSobreVenta).toBeCloseTo(1 - a4.costo / 11050, 10);
      expect(a4.bajoMinimo).toBeFalse();
    });
  });

  it('308 páginas a color pleno en A4: 2 tomos y costo ≈ 19.051', () => {
    const resultado = cotizarLibro(
      { paginas: 308, tipoImpresion: TIPO_IMPRESION.COLOR_PLENO, tamanio: TAMANIO_IMPRESION.A4, margenGanancia: 150 },
      costos,
      reglas,
    );
    expect(resultado.tomos).toBe(2);
    expect(resultado.espiral).toBe(2 * 134);
    expect(resultado.tapa).toBe(2 * 158);
    expect(resultado.costo).toBeCloseTo(19051, 0);
  });

  it('308 páginas mixto con 20 a color: toner = 20 × color pleno + 288 × B/N', () => {
    const resultado = cotizarLibro(
      { paginas: 308, tipoImpresion: TIPO_IMPRESION.MIXTO, paginasColor: 20, tamanio: TAMANIO_IMPRESION.A4, margenGanancia: 150 },
      costos,
      reglas,
    );
    expect(resultado.toner).toBeCloseTo(20 * costos.caraColorPleno + 288 * costos.caraBn, 10);
  });

  it('mixto con más páginas a color que páginas del libro: todas a color', () => {
    const resultado = cotizarLibro(
      { paginas: 10, tipoImpresion: TIPO_IMPRESION.MIXTO, paginasColor: 50, tamanio: TAMANIO_IMPRESION.A4, margenGanancia: 150 },
      costos,
      reglas,
    );
    expect(resultado.toner).toBeCloseTo(10 * costos.caraColorPleno, 10);
  });

  it('B/N: toner = páginas × cara B/N', () => {
    const resultado = cotizarLibro({ ...libro130, tipoImpresion: TIPO_IMPRESION.BN }, costos, reglas);
    expect(resultado.toner).toBeCloseTo(130 * costos.caraBn, 10);
  });

  it('con descuento por cantidad en 0, precioCantidad es null', () => {
    const sinDescuento = { ...reglas, descuentoCantidadPct: 0 };
    expect(cotizarLibro(libro130, costos, sinDescuento).precioCantidad).toBeNull();
  });

  describe('precio objetivo (modo inverso)', () => {
    it('9.000 sobre costo ≈ 4410: margen ≈ 104,1 %, ganancia ≈ 4.590, no queda bajo el mínimo', () => {
      const resultado = cotizarLibro({ ...libro130, precioObjetivo: 9000 }, costos, reglas);
      expect(resultado.precio).toBe(9000);
      expect(resultado.margenSobreCosto).toBeCloseTo(104.1, 1);
      expect(resultado.ganancia).toBeCloseTo(4590, 0);
      expect(resultado.bajoMinimo).toBeFalse();
    });

    it('6.500: margen ≈ 47,4 % y queda bajo el mínimo', () => {
      const resultado = cotizarLibro({ ...libro130, precioObjetivo: 6500 }, costos, reglas);
      expect(resultado.margenSobreCosto).toBeCloseTo(47.4, 1);
      expect(resultado.bajoMinimo).toBeTrue();
    });

    it('un precio igual o menor al costo deja margen ≤ 0', () => {
      const resultado = cotizarLibro({ ...libro130, precioObjetivo: 4400 }, costos, reglas);
      expect(resultado.margenSobreCosto).toBeLessThanOrEqual(0);
      expect(resultado.ganancia).toBeLessThanOrEqual(0);
      expect(resultado.bajoMinimo).toBeTrue();
    });

    it('el precio objetivo manda sobre el margen', () => {
      const resultado = cotizarLibro({ ...libro130, margenGanancia: 300, precioObjetivo: 9000 }, costos, reglas);
      expect(resultado.precio).toBe(9000);
    });

    it('un precio objetivo vacío o en 0 vuelve al cálculo por margen', () => {
      expect(cotizarLibro({ ...libro130, precioObjetivo: null }, costos, reglas).precio).toBe(11050);
      expect(cotizarLibro({ ...libro130, precioObjetivo: 0 }, costos, reglas).precio).toBe(11050);
    });
  });

  it('sin páginas no cotiza', () => {
    const resultado = cotizarLibro({ ...libro130, paginas: 0 }, costos, reglas);
    expect(resultado.costo).toBe(0);
    expect(resultado.precio).toBe(0);
    expect(resultado.precioCantidad).toBeNull();
  });
});

describe('redondeo', () => {
  it('el precio redondea hacia arriba al múltiplo', () => {
    expect(redondearArriba(11024, 50)).toBe(11050);
    expect(redondearArriba(11000, 50)).toBe(11000);
  });

  it('el precio por cantidad redondea hacia abajo al múltiplo', () => {
    expect(redondearAbajo(9724, 50)).toBe(9700);
    expect(redondearAbajo(9700, 50)).toBe(9700);
  });

  it('no se corre de múltiplo por errores de coma flotante', () => {
    expect(redondearArriba(0.1 * 3 * 30000, 50)).toBe(9000);
  });
});

describe('margenDesdePrecio y gananciaUnitaria', () => {
  it('debería calcular el % sobre costo', () => {
    expect(margenDesdePrecio(4000, 10000)).toBe(150);
    expect(margenDesdePrecio(0, 10000)).toBe(0);
  });

  it('debería calcular la ganancia por ejemplar', () => {
    expect(gananciaUnitaria(4410, 9000)).toBe(4590);
  });
});

describe('calcularTomos', () => {
  it('debería partir el libro cuando supera las hojas de un espiral', () => {
    expect(calcularTomos(85, 85)).toBe(1);
    expect(calcularTomos(86, 85)).toBe(2);
    expect(calcularTomos(0, 85)).toBe(1);
  });
});
