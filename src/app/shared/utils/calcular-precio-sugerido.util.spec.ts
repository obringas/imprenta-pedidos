import { calcularPrecioSugerido, derivarCostosUnitarios } from './calcular-precio-sugerido.util';

describe('calcularPrecioSugerido', () => {
  const costos = {
    tapaPorLibro: 130,
    espiralPorLibro: 97.9,
    hojaUnitaria: 9.944,
    tonerPorCara: 23.636363636363637,
  };

  it('retorna cero cuando paginas es 0', () => {
    expect(calcularPrecioSugerido(0, 40, costos)).toEqual({
      hojas: 0,
      costoBase: 0,
      precioSugerido: 0,
    });
  });

  it('calcula 1 hoja cuando paginas es 1', () => {
    expect(calcularPrecioSugerido(1, 40, costos).hojas).toBe(1);
  });

  it('calcula 40 hojas cuando paginas es 79', () => {
    expect(calcularPrecioSugerido(79, 40, costos).hojas).toBe(40);
  });

  it('calcula 40 hojas cuando paginas es 80', () => {
    expect(calcularPrecioSugerido(80, 40, costos).hojas).toBe(40);
  });

  it('retorna precio sugerido mayor al costo base cuando el margen es positivo', () => {
    const resultado = calcularPrecioSugerido(80, 40, costos);
    expect(resultado.precioSugerido).toBeGreaterThan(resultado.costoBase);
  });
});

describe('derivarCostosUnitarios', () => {
  it('deriva los costos unitarios a partir del seed', () => {
    const costos = derivarCostosUnitarios({
      tapa_paquete: 6500,
      tapa_cantidad: 50,
      espiral_paquete: 4895,
      espiral_cantidad: 50,
      hojas_resma: 49720,
      hojas_cantidad: 500,
      toner_costo: 160000,
      toner_impresiones: 22000,
    });

    expect(costos.tapaPorLibro).toBe(130);
    expect(costos.espiralPorLibro).toBe(97.9);
    expect(costos.hojaUnitaria).toBe(9.944);
    expect(costos.tonerPorCara).toBeCloseTo(29.0909090909, 10);
  });
});
