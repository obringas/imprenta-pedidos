/**
 * Normaliza para comparar en buscadores: sin acentos, sin mayusculas y sin
 * espacios sobrantes. Asi "Martin" encuentra "Martín" y al reves, que es lo
 * que se espera al tipear rapido desde el celular.
 *
 * NFD separa la letra de su tilde y \p{Mn} elimina las marcas resultantes.
 */
export function normalizarParaBusqueda(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .trim();
}

export function normalizarTextoMojibake(valor: string): string {
  return valor
    .replaceAll('\u00C3\u00A1', 'á')
    .replaceAll('\u00C3\u00A9', 'é')
    .replaceAll('\u00C3\u00AD', 'í')
    .replaceAll('\u00C3\u00B3', 'ó')
    .replaceAll('\u00C3\u00BA', 'ú')
    .replaceAll('\u00C3\u0081', 'Á')
    .replaceAll('\u00C3\u0089', 'É')
    .replaceAll('\u00C3\u008D', 'Í')
    .replaceAll('\u00C3\u0093', 'Ó')
    .replaceAll('\u00C3\u009A', 'Ú')
    .replaceAll('\u00C3\u00B1', 'ñ')
    .replaceAll('\u00C3\u0091', 'Ñ')
    .replaceAll('\u00C3\u00BC', 'ü')
    .replaceAll('\u00C3\u009C', 'Ü')
    .replaceAll('\u00C2\u00AA', 'ª')
    .replaceAll('\u00E2\u0080\u00A2', '•');
}
