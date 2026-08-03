import { parsearListaPegada } from './parsear-lista.util';

/** Construye una linea con un caracter invisible pegado adelante. */
function conWordJoiner(texto: string): string {
  return '\u2060' + texto; // word joiner, el invisible que aparecio en las listas reales
}

describe('parsearListaPegada', () => {
  it('debería quitar la numeración en sus distintos formatos', () => {
    const texto = ['1-Oli P', '2. Fabian Prentice', '10_Marcos Gomez', '11 Joel Turco', '12) Ana Paz'].join('\n');

    expect(parsearListaPegada(texto).alumnos.map((a) => a.alumno)).toEqual([
      'Oli P',
      'Fabian Prentice',
      'Marcos Gomez',
      'Joel Turco',
      'Ana Paz',
    ]);
  });

  it('debería quitar la numeración aunque esté pegada al nombre', () => {
    const { alumnos } = parsearListaPegada('1Leonella Martinez Romegialli');
    expect(alumnos[0].alumno).toBe('Leonella Martinez Romegialli');
  });

  it('debería quitar tildes de verificación y otros emojis', () => {
    const { alumnos } = parsearListaPegada('3. Bauti Gutierraz✅\n4. Ana 😊');
    expect(alumnos.map((a) => a.alumno)).toEqual(['Bauti Gutierraz', 'Ana']);
  });

  it('debería eliminar los caracteres invisibles que se cuelan al copiar', () => {
    const { alumnos } = parsearListaPegada(conWordJoiner('5. Malala Vargas'));

    expect(alumnos[0].alumno).toBe('Malala Vargas');
    expect([...alumnos[0].alumno].every((c) => c.codePointAt(0)! !== 0x2060)).toBe(true);
  });

  it('debería normalizar espacios dobles y finales', () => {
    const { alumnos } = parsearListaPegada('32. Mileka  Levy Cein   ');
    expect(alumnos[0].alumno).toBe('Mileka Levy Cein');
  });

  it('debería guardar la nota entre paréntesis como observación', () => {
    const { alumnos } = parsearListaPegada('32. Mileka Levy Cein ✅(A4)');

    expect(alumnos[0].alumno).toBe('Mileka Levy Cein');
    expect(alumnos[0].observaciones).toBe('A4');
  });

  it('debería dejar la observación en null cuando no hay nota', () => {
    expect(parsearListaPegada('1. Ana Paz').alumnos[0].observaciones).toBeNull();
  });

  it('debería conservar tildes y eñes del nombre', () => {
    const { alumnos } = parsearListaPegada('15. Clarita Montaño\n19. Julieta Garzón');
    expect(alumnos.map((a) => a.alumno)).toEqual(['Clarita Montaño', 'Julieta Garzón']);
  });

  it('debería ignorar líneas vacías sin contarlas como descartadas', () => {
    const { alumnos, descartadas } = parsearListaPegada('1. Ana\n\n   \n2. Beto');

    expect(alumnos.length).toBe(2);
    expect(descartadas).toEqual([]);
  });

  it('debería descartar líneas sin letras e informarlas', () => {
    const { alumnos, descartadas } = parsearListaPegada('1. Ana\n---\n42\n2. Beto');

    expect(alumnos.map((a) => a.alumno)).toEqual(['Ana', 'Beto']);
    expect(descartadas).toEqual(['---', '42']);
  });

  it('debería quitar viñetas', () => {
    const { alumnos } = parsearListaPegada('- Ana Paz\n• Beto Ruiz');
    expect(alumnos.map((a) => a.alumno)).toEqual(['Ana Paz', 'Beto Ruiz']);
  });

  it('debería conservar la línea original para poder mostrarla', () => {
    const { alumnos } = parsearListaPegada('  7. Agustín Vaca✅  ');
    expect(alumnos[0].lineaOriginal).toBe('7. Agustín Vaca✅');
  });
});
