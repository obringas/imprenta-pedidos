import { computed, inject, Injectable, linkedSignal, signal } from '@angular/core';
import { TAMANIO_IMPRESION, TamanioImpresion } from '../../../shared/constants/negocio.constants';
import { InsumosStore } from '../../configuracion/stores/insumos.store';
import { aActualizarLibroInput, Libro } from '../../libros/domain/libro.model';
import { MARGEN_LIBRO_MAXIMO } from '../../libros/domain/libro.validator';
import { LibrosFacade } from '../../libros/state/libros.facade';
import { Cotizacion } from '../domain/cotizacion.model';
import { cotizarLibro } from '../domain/cotizar-libro';
import { generarMensajeWhatsapp, LibroEnMensaje, OpcionesMensaje } from '../domain/mensaje-whatsapp';

/** Lo que la usuaria ajusto a mano para un libro tildado. */
interface AjusteLibro {
  /** null = sigue al margen general. */
  readonly margenFijado: number | null;
  readonly objetivoA4: number | null;
  readonly objetivoA5: number | null;
}

export interface FilaCotizacion {
  readonly libro: Libro;
  readonly margen: number;
  readonly margenFijado: boolean;
  readonly objetivoA4: number | null;
  readonly objetivoA5: number | null;
  readonly a4: Cotizacion;
  readonly a5: Cotizacion;
  readonly bajoMinimo: boolean;
  /** Margen que se guarda en el libro al aplicar: el de la fila, o el que sale del precio objetivo. */
  readonly margenAAplicar: number;
}

export const MARGEN_SLIDER_MAXIMO = 300;

const AJUSTE_INICIAL: AjusteLibro = { margenFijado: null, objetivoA4: null, objetivoA5: null };

function acotarMargen(margen: number): number {
  return Math.min(Math.max(margen, 0), MARGEN_LIBRO_MAXIMO);
}

/** `libros.margen_ganancia` es numeric(5,2). */
function redondearMargen(margen: number): number {
  return Math.round(acotarMargen(margen) * 100) / 100;
}

/**
 * Estado del cotizador. Vive en root para que la seleccion y los margenes
 * sobrevivan a la ida y vuelta al formulario de libro nuevo.
 */
@Injectable({ providedIn: 'root' })
export class CotizadorFacade {
  private readonly insumos = inject(InsumosStore);
  private readonly librosFacade = inject(LibrosFacade);

  private readonly seleccion = signal<ReadonlyMap<string, AjusteLibro>>(new Map());
  private readonly aplicandoInterno = signal<ReadonlySet<string>>(new Set());

  /** Arranca en margen_default y lo sigue mientras la usuaria no lo cambie. */
  readonly margenGeneral = linkedSignal(() => this.insumos.margenDefault());
  readonly margenDefault = this.insumos.margenDefault;
  readonly margenMinimo = computed(() => this.insumos.reglasPrecio().margenMinimo);
  readonly opciones = signal<OpcionesMensaje>({ incluirCantidad: true, ofrecerA5: true, aclararTomos: true });

  readonly librosActivos = this.librosFacade.activos;
  readonly cargando = computed(() => this.librosFacade.cargando() || this.insumos.cargando());
  readonly faltantes = this.insumos.faltantes;
  readonly aplicando = this.aplicandoInterno.asReadonly();
  readonly seleccionados = computed(() => new Set(this.seleccion().keys()));
  readonly hayDescuentoCantidad = computed(() => this.insumos.reglasPrecio().descuentoCantidadPct > 0);
  readonly cantidadMinima = computed(() => this.insumos.valores().descuento_cantidad_minima);

  readonly filas = computed<FilaCotizacion[]>(() => {
    const libros = new Map(this.librosFacade.libros().map((libro) => [libro.id, libro]));
    return [...this.seleccion()]
      .map(([id, ajuste]) => {
        const libro = libros.get(id);
        return libro ? this.armarFila(libro, ajuste) : null;
      })
      .filter((fila): fila is FilaCotizacion => fila !== null);
  });

  readonly mensaje = computed(() =>
    generarMensajeWhatsapp(this.filas().map((fila) => this.aLibroEnMensaje(fila)), this.opciones(), {
      cantidadMinima: this.cantidadMinima(),
      whatsappContacto: this.insumos.textos().whatsapp_contacto,
      firma: this.insumos.textos().whatsapp_firma,
    }),
  );

  async cargar(): Promise<void> {
    await Promise.all([this.librosFacade.cargar(), this.insumos.cargar()]);
  }

  alternarLibro(id: string): void {
    if (this.seleccion().has(id)) {
      this.actualizarSeleccion((mapa) => mapa.delete(id));
    } else {
      this.seleccionar(id);
    }
  }

  seleccionar(id: string): void {
    if (!this.seleccion().has(id)) {
      this.actualizarSeleccion((mapa) => mapa.set(id, AJUSTE_INICIAL));
    }
  }

  cambiarMargenGeneral(margen: number): void {
    if (Number.isFinite(margen)) {
      this.margenGeneral.set(acotarMargen(margen));
    }
  }

  volverAlMargenDefault(): void {
    this.margenGeneral.set(this.margenDefault());
  }

  /** Editar el margen de un libro lo fija: deja de seguir al general. */
  cambiarMargenLibro(id: string, margen: number): void {
    if (Number.isFinite(margen)) {
      this.ajustar(id, { margenFijado: acotarMargen(margen) });
    }
  }

  sincronizarMargen(id: string): void {
    this.ajustar(id, { margenFijado: null });
  }

  /** Un precio vacio o en 0 vuelve al calculo por margen. */
  cambiarPrecioObjetivo(id: string, tamanio: TamanioImpresion, precio: number | null): void {
    const valor = precio !== null && Number.isFinite(precio) && precio > 0 ? precio : null;
    this.ajustar(id, tamanio === TAMANIO_IMPRESION.A4 ? { objetivoA4: valor } : { objetivoA5: valor });
  }

  cambiarOpcion(opcion: keyof OpcionesMensaje, valor: boolean): void {
    this.opciones.update((actual) => ({ ...actual, [opcion]: valor }));
  }

  /**
   * Guarda en el libro los precios A4 y A5 que se ven en la fila y el margen
   * usado. Los pedidos existentes no cambian: copiaron su precio al crearse.
   */
  async aplicarPrecios(id: string): Promise<Libro> {
    const fila = this.filas().find((item) => item.libro.id === id);
    if (!fila) {
      throw new Error(`El libro ${id} no está en la cotización.`);
    }

    this.marcarAplicando(id, true);
    try {
      return await this.librosFacade.guardar(
        {
          ...aActualizarLibroInput(fila.libro),
          precioA4: fila.a4.precio,
          precioA5: fila.a5.precio,
          margenGanancia: fila.margenAAplicar,
        },
        id,
      );
    } finally {
      this.marcarAplicando(id, false);
    }
  }

  private armarFila(libro: Libro, ajuste: AjusteLibro): FilaCotizacion {
    const margen = ajuste.margenFijado ?? this.margenGeneral();
    const cotizar = (tamanio: TamanioImpresion, precioObjetivo: number | null) =>
      cotizarLibro(
        {
          paginas: libro.paginas,
          tipoImpresion: libro.tipoImpresion,
          paginasColor: libro.paginasColor,
          tamanio,
          margenGanancia: margen,
          precioObjetivo,
        },
        this.insumos.costos(),
        this.insumos.reglasPrecio(),
      );
    const a4 = cotizar(TAMANIO_IMPRESION.A4, ajuste.objetivoA4);
    const a5 = cotizar(TAMANIO_IMPRESION.A5, ajuste.objetivoA5);

    return {
      libro,
      margen,
      margenFijado: ajuste.margenFijado !== null,
      objetivoA4: ajuste.objetivoA4,
      objetivoA5: ajuste.objetivoA5,
      a4,
      a5,
      bajoMinimo: a4.bajoMinimo || a5.bajoMinimo,
      margenAAplicar: redondearMargen(this.margenEfectivo(margen, ajuste, a4, a5)),
    };
  }

  /** Con precio objetivo manda el margen que sale de ese precio; el A4 tiene prioridad. */
  private margenEfectivo(margen: number, ajuste: AjusteLibro, a4: Cotizacion, a5: Cotizacion): number {
    if (ajuste.objetivoA4 !== null) {
      return a4.margenSobreCosto;
    }
    return ajuste.objetivoA5 !== null ? a5.margenSobreCosto : margen;
  }

  private aLibroEnMensaje(fila: FilaCotizacion): LibroEnMensaje {
    return {
      titulo: fila.libro.titulo,
      paginas: fila.libro.paginas,
      tomos: fila.a4.tomos,
      precioA4: fila.a4.precio,
      precioA4Cantidad: fila.a4.precioCantidad,
      precioA5: fila.a5.precio,
      precioA5Cantidad: fila.a5.precioCantidad,
    };
  }

  private ajustar(id: string, cambio: Partial<AjusteLibro>): void {
    const actual = this.seleccion().get(id);
    if (actual) {
      this.actualizarSeleccion((mapa) => mapa.set(id, { ...actual, ...cambio }));
    }
  }

  private actualizarSeleccion(cambio: (mapa: Map<string, AjusteLibro>) => void): void {
    this.seleccion.update((actual) => {
      const siguiente = new Map(actual);
      cambio(siguiente);
      return siguiente;
    });
  }

  private marcarAplicando(id: string, aplicando: boolean): void {
    this.aplicandoInterno.update((actual) => {
      const siguiente = new Set(actual);
      if (aplicando) {
        siguiente.add(id);
      } else {
        siguiente.delete(id);
      }
      return siguiente;
    });
  }
}
