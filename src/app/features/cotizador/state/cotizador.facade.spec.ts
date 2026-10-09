import { TestBed } from '@angular/core/testing';
import { TAMANIO_IMPRESION, TIPO_IMPRESION } from '../../../shared/constants/negocio.constants';
import {
  ClaveInsumo,
  CLAVES_NUMERICAS,
  ConfiguracionInsumo,
  reglaDeInsumo,
} from '../../../shared/models/configuracion-insumos.model';
import { IInsumosRepository } from '../../configuracion/repositories/insumos.repository.interface';
import { INSUMOS_REPOSITORY } from '../../configuracion/repositories/insumos.repository.token';
import { LibrosRepository } from '../../libros/data/libros.repository';
import { LIBROS_REPOSITORY } from '../../libros/data/libros.repository.token';
import { ActualizarLibroInput, Libro } from '../../libros/domain/libro.model';
import { VALORES_INSUMO_FIXTURE } from '../domain/valores-insumo.fixture';
import { CotizadorFacade } from './cotizador.facade';

function insumo(clave: ClaveInsumo, valor: number, valorTexto: string | null = null): ConfiguracionInsumo {
  return { id: clave, clave, descripcion: clave, tipo: reglaDeInsumo(clave).tipo, valor, valorTexto, unidad: '', updatedAt: '' };
}

const INSUMOS: ConfiguracionInsumo[] = [
  ...CLAVES_NUMERICAS.map((clave) => insumo(clave, VALORES_INSUMO_FIXTURE[clave])),
  insumo('whatsapp_contacto', 0, '3874094328'),
  insumo('whatsapp_firma', 0, 'Emilse'),
];

const JACARANDA: Libro = {
  id: 'libro-1',
  titulo: 'Bajo el jacarandá',
  precioA4: null,
  precioA5: 5000,
  paginas: 130,
  hojas: 65,
  observaciones: null,
  margenGanancia: 156,
  tipoImpresion: TIPO_IMPRESION.POCO_COLOR,
  paginasColor: 0,
  activo: true,
};

class LibrosEnMemoria implements LibrosRepository {
  libros: Libro[] = [JACARANDA];
  ultimoUpdate: ActualizarLibroInput | null = null;

  async findAll(): Promise<Libro[]> {
    return this.libros;
  }

  async findById(id: string): Promise<Libro | null> {
    return this.libros.find((libro) => libro.id === id) ?? null;
  }

  async create(): Promise<Libro> {
    throw new Error('No se usa en estos tests');
  }

  async update(id: string, input: ActualizarLibroInput): Promise<Libro> {
    this.ultimoUpdate = input;
    const actualizado: Libro = { ...input, id, hojas: Math.ceil(input.paginas / 2) };
    this.libros = this.libros.map((libro) => (libro.id === id ? actualizado : libro));
    return actualizado;
  }
}

describe('CotizadorFacade', () => {
  let facade: CotizadorFacade;
  let libros: LibrosEnMemoria;

  beforeEach(async () => {
    libros = new LibrosEnMemoria();
    const insumosRepo: IInsumosRepository = { obtenerTodos: async () => INSUMOS, actualizar: async () => undefined };
    TestBed.configureTestingModule({
      providers: [
        { provide: LIBROS_REPOSITORY, useValue: libros },
        { provide: INSUMOS_REPOSITORY, useValue: insumosRepo },
      ],
    });
    facade = TestBed.inject(CotizadorFacade);
    await facade.cargar();
    facade.seleccionar(JACARANDA.id);
  });

  it('debería arrancar con el margen por defecto de los insumos', () => {
    expect(facade.margenGeneral()).toBe(150);
    expect(facade.filas()[0].a4.precio).toBe(11050);
    expect(facade.filas()[0].a5.precio).toBe(5700);
  });

  it('debería recalcular los libros que siguen al margen general', () => {
    facade.cambiarMargenGeneral(100);
    expect(facade.filas()[0].margen).toBe(100);
    facade.volverAlMargenDefault();
    expect(facade.filas()[0].margen).toBe(150);
  });

  it('un margen editado en la fila queda fijado y no sigue al general', () => {
    facade.cambiarMargenLibro(JACARANDA.id, 90);
    facade.cambiarMargenGeneral(200);
    expect(facade.filas()[0].margen).toBe(90);
    expect(facade.filas()[0].margenFijado).toBeTrue();

    facade.sincronizarMargen(JACARANDA.id);
    expect(facade.filas()[0].margen).toBe(200);
  });

  it('con precio objetivo, el margen sale del precio y queda marcado bajo el mínimo', () => {
    facade.cambiarPrecioObjetivo(JACARANDA.id, TAMANIO_IMPRESION.A4, 6500);
    const fila = facade.filas()[0];
    expect(fila.a4.precio).toBe(6500);
    expect(fila.bajoMinimo).toBeTrue();
    expect(fila.margenAAplicar).toBeCloseTo(47.4, 1);

    facade.cambiarPrecioObjetivo(JACARANDA.id, TAMANIO_IMPRESION.A4, null);
    expect(facade.filas()[0].a4.precio).toBe(11050);
  });

  it('aplicar precios guarda A4, A5 y el margen usado en el libro', async () => {
    facade.cambiarMargenLibro(JACARANDA.id, 120);
    await facade.aplicarPrecios(JACARANDA.id);

    expect(libros.ultimoUpdate).toEqual(
      jasmine.objectContaining({
        precioA4: facade.filas()[0].a4.precio,
        precioA5: facade.filas()[0].a5.precio,
        margenGanancia: 120,
        tipoImpresion: TIPO_IMPRESION.POCO_COLOR,
      }),
    );
  });

  it('el mensaje se arma con los precios que se ven, incluidos los bajados a mano', () => {
    facade.cambiarPrecioObjetivo(JACARANDA.id, TAMANIO_IMPRESION.A4, 9000);
    expect(facade.mensaje()).toContain('A4: *$9.000*');
    expect(facade.mensaje()).toContain('me escriben al 3874094328');
    expect(facade.mensaje()).toContain('Emilse');
  });

  it('destildar un libro lo saca de la cotización y del mensaje', () => {
    facade.alternarLibro(JACARANDA.id);
    expect(facade.filas()).toEqual([]);
    expect(facade.mensaje()).toBe('');
  });
});
