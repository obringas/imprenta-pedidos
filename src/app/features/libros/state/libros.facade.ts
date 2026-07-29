import { Injectable, computed, inject, signal } from '@angular/core';
import { calcularHojas } from '../../../shared/constants/negocio.constants';
import { LIBROS_REPOSITORY } from '../data/libros.repository.token';
import { ActualizarLibroInput, CrearLibroInput, Libro } from '../domain/libro.model';

@Injectable({ providedIn: 'root' })
export class LibrosFacade {
  private readonly repository = inject(LIBROS_REPOSITORY);
  private readonly librosInternos = signal<Libro[]>([]);
  private readonly cargandoInterno = signal(false);

  private readonly cambiandoEstadoInterno = signal<ReadonlySet<string>>(new Set());

  readonly libros = this.librosInternos.asReadonly();
  readonly cargando = this.cargandoInterno.asReadonly();
  readonly activos = computed(() => this.librosInternos().filter((libro) => libro.activo));
  readonly inactivos = computed(() => this.librosInternos().filter((libro) => !libro.activo));
  readonly cambiandoEstado = this.cambiandoEstadoInterno.asReadonly();

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

  /**
   * Activa o desactiva un libro con feedback inmediato.
   *
   * Usa el libro que ya esta en memoria y pinta el cambio antes de que
   * responda el servidor: desde el celular el toque tiene que sentirse
   * instantaneo. Si la escritura falla, revierte al estado anterior.
   */
  async toggleActivo(id: string): Promise<Libro | null> {
    const libro = this.obtenerPorId(id);
    if (!libro || this.cambiandoEstadoInterno().has(id)) {
      return null;
    }

    const estadoDeseado = !libro.activo;
    this.marcarEnProceso(id, true);
    this.aplicarEstadoLocal(id, estadoDeseado);

    try {
      const actualizado = await this.repository.update(id, {
        titulo: libro.titulo,
        precio: libro.precio,
        paginas: libro.paginas,
        observaciones: libro.observaciones,
        margenGanancia: libro.margenGanancia,
        activo: estadoDeseado,
      });

      this.aplicarEstadoLocal(id, actualizado.activo);
      return actualizado;
    } catch {
      this.aplicarEstadoLocal(id, libro.activo);
      return null;
    } finally {
      this.marcarEnProceso(id, false);
    }
  }

  private aplicarEstadoLocal(id: string, activo: boolean): void {
    this.librosInternos.update((libros) =>
      libros.map((libro) => (libro.id === id ? { ...libro, activo } : libro)),
    );
  }

  private marcarEnProceso(id: string, enProceso: boolean): void {
    this.cambiandoEstadoInterno.update((actual) => {
      const siguiente = new Set(actual);
      if (enProceso) {
        siguiente.add(id);
      } else {
        siguiente.delete(id);
      }
      return siguiente;
    });
  }

  hojasPorLibro(paginas: number): number {
    return calcularHojas(paginas);
  }
}

