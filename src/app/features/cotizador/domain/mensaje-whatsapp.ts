/** Lo que el mensaje necesita de cada libro: los precios tal como se ven en pantalla. */
export interface LibroEnMensaje {
  readonly titulo: string;
  readonly paginas: number;
  readonly tomos: number;
  readonly precioA4: number;
  readonly precioA4Cantidad: number | null;
  readonly precioA5: number;
  readonly precioA5Cantidad: number | null;
}

export interface OpcionesMensaje {
  readonly incluirCantidad: boolean;
  readonly ofrecerA5: boolean;
  readonly aclararTomos: boolean;
}

/** Datos fijos del mensaje, de `/configuracion/insumos`. */
export interface DatosMensaje {
  readonly cantidadMinima: number;
  readonly whatsappContacto: string;
  readonly firma: string;
}

const ANILLADO =
  'Van anillados, con tapa transparente, y la impresión es *LÁSER*: no se corre ni se destiñe con agua o roce.';
const TAMANIOS =
  'El A4 es el tamaño grande, ideal para no forzar la vista. El A5 es compacto y más económico (mitad de hoja A4).';

/** `$11.050`: separador de miles argentino, sin decimales ni espacio. */
export function formatearPrecioMensaje(valor: number): string {
  return `$${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(valor)}`;
}

function lineaPrecio(tamanio: string, precio: number, precioCantidad: number | null, opciones: OpcionesMensaje, datos: DatosMensaje): string {
  const cantidad =
    opciones.incluirCantidad && precioCantidad !== null
      ? ` (juntando ${datos.cantidadMinima} o más: ${formatearPrecioMensaje(precioCantidad)} c/u)`
      : '';
  return `  ${tamanio}: *${formatearPrecioMensaje(precio)}*${cantidad}`;
}

function lineasDeLibro(libro: LibroEnMensaje, opciones: OpcionesMensaje, datos: DatosMensaje): string[] {
  const lineas = [lineaPrecio('A4', libro.precioA4, libro.precioA4Cantidad, opciones, datos)];
  if (opciones.ofrecerA5) {
    lineas.push(lineaPrecio('A5', libro.precioA5, libro.precioA5Cantidad, opciones, datos));
  }
  if (opciones.aclararTomos && libro.tomos > 1) {
    lineas.push(`  Por la cantidad de páginas va en ${libro.tomos} tomos, incluidos en el precio.`);
  }
  return lineas;
}

function cuerpo(libros: readonly LibroEnMensaje[], opciones: OpcionesMensaje, datos: DatosMensaje): string[] {
  if (libros.length === 1) {
    const [libro] = libros;
    return [
      `Les paso el presupuesto de *${libro.titulo}* – ${libro.paginas} páginas.`,
      '',
      ...lineasDeLibro(libro, opciones, datos),
    ];
  }

  const bloques = libros.map((libro) =>
    [`📖 *${libro.titulo}* (${libro.paginas} pág.)`, ...lineasDeLibro(libro, opciones, datos)].join('\n'),
  );
  return ['Les paso los presupuestos de los libros:', '', bloques.join('\n\n')];
}

/** Mensaje listo para pegar en el grupo del colegio. Sin libros, devuelve un texto vacio. */
export function generarMensajeWhatsapp(
  libros: readonly LibroEnMensaje[],
  opciones: OpcionesMensaje,
  datos: DatosMensaje,
): string {
  if (libros.length === 0) {
    return '';
  }

  return [
    '¡Hola familias! 👋',
    '',
    ...cuerpo(libros, opciones, datos),
    '',
    opciones.ofrecerA5 ? `${ANILLADO}\n${TAMANIOS}` : ANILLADO,
    '',
    `La entrega es en la puerta del colegio. Para encargar o consultar me escriben al ${datos.whatsappContacto}.`,
    '',
    '¡Gracias! 😊',
    datos.firma,
  ].join('\n');
}
