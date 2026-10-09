import { ReglaInsumo, ValorInsumo } from '../../../shared/models/configuracion-insumos.model';

/** Lo que se ve en el input: miles con punto y decimales con coma, como se escribe en Argentina. */
export function formatearValorInsumo(valor: ValorInsumo, regla: ReglaInsumo): string {
  if (regla.tipo === 'texto') {
    return String(valor);
  }

  const decimales = regla.tipo === 'dinero' || regla.entero ? 0 : 2;
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: decimales }).format(Number(valor));
}

/**
 * Interpreta lo que escribe la usuaria. El punto se toma como separador de
 * miles y la coma como decimal ("0,8", "24.000"). Dinero y cantidades enteras
 * ignoran los decimales.
 */
export function parsearValorInsumo(texto: string, regla: ReglaInsumo): ValorInsumo {
  if (regla.tipo === 'texto') {
    return texto;
  }

  const admiteDecimales = regla.tipo !== 'dinero' && !regla.entero;
  const [enteros, ...resto] = texto.replace(/[^\d,]/g, '').split(',');
  const decimales = admiteDecimales ? resto.join('') : '';
  const normalizado = decimales ? `${enteros || '0'}.${decimales}` : enteros;

  return normalizado ? Number(normalizado) : 0;
}
