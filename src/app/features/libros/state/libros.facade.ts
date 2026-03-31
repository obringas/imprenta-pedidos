import { Injectable, computed, inject, signal } from '@angular/core';
import { calcularHojas } from '../../../shared/constants/negocio.constants';
import { LIBROS_REPOSITORY } from '../data/libros.repository.token';
import { ActualizarLibroInput, CrearLibroInput, Libro } from '../domain/libro.model';

@Injectable({ providedIn: 'root' })
export class LibrosFacade {
  private readonly repository = inject(LIBROS_REPOSITORY);
  private readonly librosInternos = signal<Libro[]>([]);
  private readonly cargandoInterno = signal(false);

  readonly libros = this.librosInternos.asReadonly();
  readonly cargando = this.cargandoInterno.asReadonly();
  readonly activos = computed(() => this.librosInternos().filter((libro) => libro.activo));

  async cargar(): Promise<void> {
    this.cargandoInterno.set(true);
    this.librosInternos.set(await this.repository.findAll());
    this.cargandoInterno.set(false);
  }

  async guardar(input: CrearLibroInput | ActualizarLibroInput, id?: string): Promise<void> {
    if (id) {
      await this.repository.update(id, input as ActualizarLibroInput);
    } else {
      await this.repository.create(input as CrearLibroInput);
    }

    await this.cargar();
  }

  obtenerPorId(id: string): Libro | null {
    return this.librosInternos().find((libro) => libro.id === id) ?? null;
  }

  async toggleActivo(id: string): Promise<Libro | null> {
    const libro = await this.repository.findById(id);
    if (!libro) {
      return null;
    }

    const actualizado = await this.repository.update(id, {
      titulo: libro.titulo,
      precio: libro.precio,
      paginas: libro.paginas,
      observaciones: libro.observaciones,
      activo: !libro.activo,
    });

    await this.cargar();
    return actualizado;
  }

  hojasPorLibro(paginas: number): number {
    return calcularHojas(paginas);
  }
}

