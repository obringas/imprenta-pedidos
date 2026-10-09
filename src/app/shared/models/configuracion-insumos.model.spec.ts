import {
  aplicarValorInsumo,
  ClaveInsumo,
  CLAVES_NUMERICAS,
  ConfiguracionInsumo,
  indexarInsumos,
  reglaDeInsumo,
  resolverUnidad,
} from './configuracion-insumos.model';
import { validarValorInsumo } from './configuracion-insumos.validator';

function insumo(clave: ClaveInsumo, valor: number, valorTexto: string | null = null): ConfiguracionInsumo {
  return {
    id: clave,
    clave,
    descripcion: clave,
    tipo: reglaDeInsumo(clave).tipo,
    valor,
    valorTexto,
    unidad: '',
    updatedAt: '2026-10-09T00:00:00Z',
  };
}

describe('reglaDeInsumo', () => {
  it('debería asignar un tipo a cada clave', () => {
    expect(reglaDeInsumo('hojas_resma').tipo).toBe('dinero');
    expect(reglaDeInsumo('cobertura_poco_color').tipo).toBe('porcentaje');
    expect(reglaDeInsumo('toner_factor_rendimiento').tipo).toBe('numero');
    expect(reglaDeInsumo('whatsapp_firma').tipo).toBe('texto');
  });

  it('debería tratar una clave desconocida como número', () => {
    expect(reglaDeInsumo('clave_nueva').tipo).toBe('numero');
  });
});

describe('indexarInsumos', () => {
  it('debería separar valores numéricos y textos', () => {
    const indexados = indexarInsumos([insumo('hojas_resma', 59000), insumo('whatsapp_firma', 0, 'Emilse')]);
    expect(indexados.valores.hojas_resma).toBe(59000);
    expect(indexados.textos.whatsapp_firma).toBe('Emilse');
  });

  it('debería informar las claves que faltan y dejarlas en 0, sin inventar costos', () => {
    const indexados = indexarInsumos([insumo('hojas_resma', 59000)]);
    expect(indexados.faltantes).toContain('toner_negro_costo');
    expect(indexados.faltantes).toContain('whatsapp_contacto');
    expect(indexados.faltantes).not.toContain('hojas_resma');
    expect(indexados.valores.toner_negro_costo).toBe(0);
  });

  it('no debería informar faltantes con todas las claves cargadas', () => {
    const todos = [
      ...CLAVES_NUMERICAS.map((clave) => insumo(clave, 1)),
      insumo('whatsapp_contacto', 0, '3874094328'),
      insumo('whatsapp_firma', 0, 'Emilse'),
    ];
    expect(indexarInsumos(todos).faltantes).toEqual([]);
  });
});

describe('resolverUnidad', () => {
  it('debería armar la unidad con el valor actual de otro insumo', () => {
    expect(resolverUnidad('ARS x {tapa_cantidad} unidades', [insumo('tapa_cantidad', 50)])).toBe('ARS x 50 unidades');
  });

  it('debería dejar el marcador si la clave no existe', () => {
    expect(resolverUnidad('ARS x {tapa_cantidad} unidades', [])).toBe('ARS x {tapa_cantidad} unidades');
  });
});

describe('aplicarValorInsumo', () => {
  it('debería guardar un texto en valorTexto y un número en valor', () => {
    expect(aplicarValorInsumo(insumo('whatsapp_firma', 0, 'Emilse'), 'Emi').valorTexto).toBe('Emi');
    expect(aplicarValorInsumo(insumo('hojas_resma', 59000), 61000).valor).toBe(61000);
  });
});

describe('validarValorInsumo', () => {
  it('debería aceptar decimales en el factor de rendimiento', () => {
    expect(validarValorInsumo('toner_factor_rendimiento', 0.8)).toEqual({ ok: true, valor: 0.8 });
  });

  it('debería rechazar 0 en una cantidad que se usa como divisor', () => {
    expect(validarValorInsumo('hojas_cantidad', 0).ok).toBeFalse();
    expect(validarValorInsumo('espiral_max_hojas', 0).ok).toBeFalse();
  });

  it('debería rechazar una cobertura mayor a 100 %', () => {
    expect(validarValorInsumo('cobertura_pleno_color', 101).ok).toBeFalse();
  });

  it('debería validar los textos sin exigir números', () => {
    expect(validarValorInsumo('whatsapp_firma', '  Emilse ')).toEqual({ ok: true, valor: 'Emilse' });
    expect(validarValorInsumo('whatsapp_firma', '   ').ok).toBeFalse();
  });
});
