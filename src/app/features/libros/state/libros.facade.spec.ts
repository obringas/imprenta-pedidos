import { TestBed } from '@angular/core/testing';
import { TIPO_IMPRESION } from '../../../shared/constants/negocio.constants';
import { AppError } from '../../../shared/errors/app-error';
import { LibrosRepository } from '../data/libros.repository';
import { LIBROS_REPOSITORY } from '../data/libros.repository.token';
import { CrearLibroInput, Libro } from '../domain/libro.model';
import { LibrosFacade } from './libros.facade';

class LibrosRepositoryEnMemoria implements LibrosRepository {
  libros: Libro[] = [];

  async findAll(): Promise<Libro[]> {
    return this.libros;
  }

  async findById(id: string): Promise<Libro | null> {
    return this.libros.find((libro) => libro.id === id) ?? null;
  }

  async create(input: CrearLibroInput): Promise<Libro> {
    const libro: Libro = { ...input, id: `libro-${this.libros.length + 1}`, hojas: Math.ceil(input.paginas / 2), activo: true };
    this.libros = [...this.libros, libro];
    return libro;
  }

  async update(): Promise<Libro> {
    throw new Error('No se usa en estos tests');
  }
}

describe('LibrosFacade.guardar', () => {
  let facade: LibrosFacade;
  let repositorio: LibrosRepositoryEnMemoria;

  const nuevo: CrearLibroInput = {
    titulo: 'Bajo el jacarandá',
    precioA4: 11050,
    precioA5: 5700,
    paginas: 130,
    observaciones: null,
    margenGanancia: 150,
    tipoImpresion: TIPO_IMPRESION.POCO_COLOR,
    paginasColor: 0,
  };

  beforeEach(() => {
    repositorio = new LibrosRepositoryEnMemoria();
    TestBed.configureTestingModule({ providers: [{ provide: LIBROS_REPOSITORY, useValue: repositorio }] });
    facade = TestBed.inject(LibrosFacade);
  });

  it('debería devolver el libro creado y refrescar la lista', async () => {
    const creado = await facade.guardar(nuevo);
    expect(creado.id).toBe('libro-1');
    expect(creado.tipoImpresion).toBe(TIPO_IMPRESION.POCO_COLOR);
    expect(facade.libros().map((libro) => libro.id)).toEqual(['libro-1']);
  });

  it('debería rechazar con un error de validación sin llegar al repositorio', async () => {
    const espia = spyOn(repositorio, 'create').and.callThrough();
    const invalido = { ...nuevo, tipoImpresion: TIPO_IMPRESION.MIXTO, paginasColor: 0 };

    await expectAsync(facade.guardar(invalido)).toBeRejectedWith(jasmine.any(AppError));
    expect(espia).not.toHaveBeenCalled();
  });
});
