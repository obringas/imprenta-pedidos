import { z } from 'zod';
import { ReglaInsumo, reglaDeInsumo, ValorInsumo } from './configuracion-insumos.model';

const TEXTO_MAXIMO = 60;

function esquemaNumerico(regla: ReglaInsumo) {
  let esquema = z.number({ message: 'Ingresá un número.' }).finite('Ingresá un número.');
  if (regla.entero) {
    esquema = esquema.int('Ingresá un número entero.');
  }
  if (regla.minimo !== undefined) {
    esquema = esquema.min(regla.minimo, `El mínimo es ${formatear(regla.minimo)}.`);
  }
  if (regla.maximo !== undefined) {
    esquema = esquema.max(regla.maximo, `El máximo es ${formatear(regla.maximo)}.`);
  }
  return esquema;
}

function esquemaTexto() {
  return z
    .string({ message: 'Ingresá un texto.' })
    .trim()
    .min(1, 'No puede quedar vacío.')
    .max(TEXTO_MAXIMO, `Máximo ${TEXTO_MAXIMO} caracteres.`);
}

function formatear(valor: number): string {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(valor);
}

/** Valida el valor de un insumo segun el tipo y los limites de su clave. */
export function validarValorInsumo(
  clave: string,
  valor: ValorInsumo,
): { readonly ok: true; readonly valor: ValorInsumo } | { readonly ok: false; readonly mensaje: string } {
  const regla = reglaDeInsumo(clave);
  const esquema = regla.tipo === 'texto' ? esquemaTexto() : esquemaNumerico(regla);
  const resultado = esquema.safeParse(valor);

  return resultado.success
    ? { ok: true, valor: resultado.data }
    : { ok: false, mensaje: resultado.error.issues[0]?.message ?? 'Valor inválido.' };
}
