import { reglaDeInsumo } from '../../../shared/models/configuracion-insumos.model';
import { formatearValorInsumo, parsearValorInsumo } from './formato-insumo';

describe('formato de insumos', () => {
  const dinero = reglaDeInsumo('toner_negro_costo');
  const factor = reglaDeInsumo('toner_factor_rendimiento');
  const cantidad = reglaDeInsumo('hojas_cantidad');
  const texto = reglaDeInsumo('whatsapp_firma');

  it('debería mostrar miles con punto y decimales con coma', () => {
    expect(formatearValorInsumo(166000, dinero)).toBe('166.000');
    expect(formatearValorInsumo(0.8, factor)).toBe('0,8');
  });

  it('debería leer la coma como decimal y el punto como miles', () => {
    expect(parsearValorInsumo('0,8', factor)).toBe(0.8);
    expect(parsearValorInsumo('24.000', cantidad)).toBe(24000);
  });

  it('debería ignorar decimales en dinero y cantidades enteras', () => {
    expect(parsearValorInsumo('$ 166.000,50', dinero)).toBe(166000);
    expect(parsearValorInsumo('500,5', cantidad)).toBe(500);
  });

  it('debería tomar el texto tal cual', () => {
    expect(parsearValorInsumo('Emilse', texto)).toBe('Emilse');
    expect(formatearValorInsumo('Emilse', texto)).toBe('Emilse');
  });

  it('debería devolver 0 si no hay dígitos', () => {
    expect(parsearValorInsumo('', dinero)).toBe(0);
  });
});
