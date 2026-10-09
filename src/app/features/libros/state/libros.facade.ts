import { Injectable, computed, inject, signal } from '@angular/core';
import { z } from 'zod';
import { calcularHojas } from '../../../shared/constants/negocio.constants';
import { AppError } from '../../../shared/errors/app-error';
import { LIBROS_REPOSITORY } from '../data/libros.repository.token';
import { aActualizarLibroInput, ActualizarLibroInput, CrearLibroInput, Libro } from '../domain/libro.model';
import { actualizarLibroSchema, crearLibroSchema } from '../domain/libro.validator';

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

  /**
   * Valida con Zod y persiste. Devuelve el libro guardado para que quien llama
   * pueda seguir trabajando con el (por ejemplo, tildarlo en el cotizador).
   * Lanza `AppError` de validacion si el input no cumple las reglas.
   */
  async guardar(input: CrearLibroInput | ActualizarLibroInput, id?: string): Promise<Libro> {
    const guardado = id
      ? await this.repository.update(id, this.validar(actualizarLibroSchema, input))
      : await this.repository.create(this.validar(crearLibroSchema, input));

    await this.cargar();
    return guardado;
  }

  private validar<T>(schema: z.ZodType<T>, input: unknown): T {
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      throw AppError.validacion('libro', parsed.error.issues[0]?.message ?? 'Dato inválido');
    }

    return parsed.data;
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
        ...aActualizarLibroInput(libro),
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

