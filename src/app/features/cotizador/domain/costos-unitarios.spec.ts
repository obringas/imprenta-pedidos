import { derivarCostosUnitarios, reglasDePrecio } from './costos-unitarios';
import { VALORES_INSUMO_FIXTURE } from './valores-insumo.fixture';

describe('derivarCostosUnitarios', () => {
  const costos = derivarCostosUnitarios(VALORES_INSUMO_FIXTURE);

  it('debería derivar papel, espiral y tapas por unidad', () => {
    expect(costos.hoja).toBeCloseTo(11.8, 10);
    expect(costos.espiral).toBe(134);
    expect(costos.tapaA4).toBe(158);
    expect(costos.tapaA5).toBe(79);
  });

  it('debería costear la cara B/N solo con negro (≈ 6,92)', () => {
    expect(costos.caraBn).toBeCloseTo(6.92, 2);
  });

  it('debería costear la cara con poco color (≈ 25,78)', () => {
    expect(costos.caraPocoColor).toBeCloseTo(25.78, 1);
  });

  it('debería costear la cara a color pleno (≈ 54,06)', () => {
    expect(costos.caraColorPleno).toBeCloseTo(54.06, 2);
  });

  it('debería encarecer el toner con un factor de rendimiento conservador', () => {
    const conservador = derivarCostosUnitarios({ ...VALORES_INSUMO_FIXTURE, toner_factor_rendimiento: 0.8 });
    expect(conservador.caraBn).toBeCloseTo(costos.caraBn / 0.8, 10);
    expect(conservador.caraColorPleno).toBeCloseTo(costos.caraColorPleno / 0.8, 10);
  });

  it('debería devolver 0 en vez de infinito si un divisor está en 0', () => {
    const sinRinde = derivarCostosUnitarios({ ...VALORES_INSUMO_FIXTURE, toner_negro_rinde: 0, hojas_cantidad: 0 });
    expect(sinRinde.hoja).toBe(0);
    expect(Number.isFinite(sinRinde.caraBn)).toBeTrue();
  });
});

describe('reglasDePrecio', () => {
  it('debería leer las reglas de la configuración', () => {
    expect(reglasDePrecio(VALORES_INSUMO_FIXTURE)).toEqual({
      espiralMaxHojas: 85,
      redondeo: 50,
      descuentoCantidadPct: 12,
      margenMinimo: 60,
    });
  });
});
