import { formatearPrecioMensaje, generarMensajeWhatsapp, LibroEnMensaje, OpcionesMensaje } from './mensaje-whatsapp';

describe('generarMensajeWhatsapp', () => {
  const datos = { cantidadMinima: 15, whatsappContacto: '3874094328', firma: 'Emilse' };
  const todo: OpcionesMensaje = { incluirCantidad: true, ofrecerA5: true, aclararTomos: true };
  const jacaranda: LibroEnMensaje = {
    titulo: 'Bajo el jacarandá',
    paginas: 130,
    tomos: 1,
    precioA4: 11050,
    precioA4Cantidad: 9700,
    precioA5: 5700,
    precioA5Cantidad: 5000,
  };
  const atlas: LibroEnMensaje = {
    titulo: 'Atlas',
    paginas: 308,
    tomos: 2,
    precioA4: 47650,
    precioA4Cantidad: 41900,
    precioA5: 24500,
    precioA5Cantidad: 21550,
  };

  it('debería armar el mensaje exacto para varios libros', () => {
    expect(generarMensajeWhatsapp([jacaranda, atlas], todo, datos)).toBe(
      [
        '¡Hola familias! 👋',
        '',
        'Les paso los presupuestos de los libros:',
        '',
        '📖 *Bajo el jacarandá* (130 pág.)',
        '  A4: *$11.050* (juntando 15 o más: $9.700 c/u)',
        '  A5: *$5.700* (juntando 15 o más: $5.000 c/u)',
        '',
        '📖 *Atlas* (308 pág.)',
        '  A4: *$47.650* (juntando 15 o más: $41.900 c/u)',
        '  A5: *$24.500* (juntando 15 o más: $21.550 c/u)',
        '  Por la cantidad de páginas va en 2 tomos, incluidos en el precio.',
        '',
        'Van anillados, con tapa transparente, y la impresión es *LÁSER*: no se corre ni se destiñe con agua o roce.',
        'El A4 es el tamaño grande, ideal para no forzar la vista. El A5 es compacto y más económico (mitad de hoja A4).',
        '',
        'La entrega es en la puerta del colegio. Para encargar o consultar me escriben al 3874094328.',
        '',
        '¡Gracias! 😊',
        'Emilse',
      ].join('\n'),
    );
  });

  it('con un solo libro, la segunda línea nombra el libro y no repite el encabezado 📖', () => {
    const mensaje = generarMensajeWhatsapp([jacaranda], todo, datos);
    expect(mensaje).toContain('Les paso el presupuesto de *Bajo el jacarandá* – 130 páginas.\n\n  A4: *$11.050*');
    expect(mensaje).not.toContain('📖');
  });

  it('sin precio por cantidad (descuento 0) no va el paréntesis', () => {
    const sinDescuento = { ...jacaranda, precioA4Cantidad: null, precioA5Cantidad: null };
    const mensaje = generarMensajeWhatsapp([sinDescuento], todo, datos);
    expect(mensaje).toContain('  A4: *$11.050*\n');
    expect(mensaje).not.toContain('juntando');
  });

  it('con "incluir precio por cantidad" apagado no va el paréntesis', () => {
    expect(generarMensajeWhatsapp([jacaranda], { ...todo, incluirCantidad: false }, datos)).not.toContain('juntando');
  });

  it('sin ofrecer A5 no van la línea A5 ni la explicación de tamaños', () => {
    const mensaje = generarMensajeWhatsapp([jacaranda], { ...todo, ofrecerA5: false }, datos);
    expect(mensaje).not.toContain('A5');
    expect(mensaje).toContain('roce.\n\nLa entrega');
  });

  it('la aclaración de tomos va solo con más de un tomo y el toggle prendido', () => {
    expect(generarMensajeWhatsapp([jacaranda], todo, datos)).not.toContain('tomos');
    expect(generarMensajeWhatsapp([atlas], { ...todo, aclararTomos: false }, datos)).not.toContain('tomos');
  });

  it('sin libros devuelve un texto vacío', () => {
    expect(generarMensajeWhatsapp([], todo, datos)).toBe('');
  });
});

describe('formatearPrecioMensaje', () => {
  it('debería usar el separador de miles argentino', () => {
    expect(formatearPrecioMensaje(11050)).toBe('$11.050');
    expect(formatearPrecioMensaje(950)).toBe('$950');
  });
});
