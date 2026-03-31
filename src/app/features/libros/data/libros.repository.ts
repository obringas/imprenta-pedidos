import { inject, Injectable } from '@angular/core';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';
import { AppError } from '../../../shared/errors/app-error';
import { LIBROS_INICIALES } from '../../data/mock-data';
import { normalizarTextoMojibake } from '../../../shared/utils/text-normalizer';
import { ActualizarLibroInput, CrearLibroInput, Libro } from '../domain/libro.model';

const STORAGE_KEY = 'imprenta-libros';

export interface LibrosRepository {
  findAll(): Promise<Libro[]>;
  findById(id: string): Promise<Libro | null>;
  create(input: CrearLibroInput): Promise<Libro>;
  update(id: string, input: ActualizarLibroInput): Promise<Libro>;
}

@Injectable({ providedIn: 'root' })
export class LocalLibrosRepository implements LibrosRepository {
  async findAll(): Promise<Libro[]> {
    return this.leer();
  }

  async findById(id: string): Promise<Libro | null> {
    return this.leer().find((libro) => libro.id === id) ?? null;
  }

  async create(input: CrearLibroInput): Promise<Libro> {
    const libro: Libro = {
      id: crypto.randomUUID(),
      titulo: input.titulo.trim(),
      precio: input.precio,
      paginas: input.paginas,
      hojas: Math.ceil(input.paginas / 2),
      observaciones: input.observaciones,
      activo: true,
    };

    const libros = [...this.leer(), libro];
    this.guardar(libros);
    return libro;
  }

  async update(id: string, input: ActualizarLibroInput): Promise<Libro> {
    const libros = this.leer();
    const libroActualizado: Libro = {
      id,
      ...input,
      titulo: input.titulo.trim(),
      hojas: Math.ceil(input.paginas / 2),
      observaciones: input.observaciones,
    };
    const siguiente = libros.map((libro) => (libro.id === id ? libroActualizado : libro));
    this.guardar(siguiente);
    return libroActualizado;
  }

  private leer(): Libro[] {
    const serializado = localStorage.getItem(STORAGE_KEY);
    if (!serializado) {
      this.guardar(LIBROS_INICIALES);
      return LIBROS_INICIALES;
    }

    const libros = (JSON.parse(serializado) as Libro[]).map((libro) => ({
      ...libro,
      hojas: libro.hojas ?? Math.ceil(libro.paginas / 2),
      observaciones: libro.observaciones ?? null,
      titulo: normalizarTextoMojibake(libro.titulo),
    }));

    this.guardar(libros);
    return libros;
  }

  private guardar(libros: Libro[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(libros));
  }
}

@Injectable({ providedIn: 'root' })
export class SupabaseLibrosRepository implements LibrosRepository {
  private readonly supabase = inject(SUPABASE_CLIENT);

  async findAll(): Promise<Libro[]> {
    const client = this.requireClient();
    const { data, error } = await client.from('libros').select('*').order('titulo');
    if (error) {
      throw AppError.inesperado(error);
    }

    return (data ?? []).map((libro) => this.mapLibro(libro));
  }

  async findById(id: string): Promise<Libro | null> {
    const client = this.requireClient();
    const { data, error } = await client.from('libros').select('*').eq('id', id).maybeSingle();
    if (error) {
      throw AppError.inesperado(error);
    }

    return data ? this.mapLibro(data) : null;
  }

  async create(input: CrearLibroInput): Promise<Libro> {
    const client = this.requireClient();
    const payload = {
      titulo: input.titulo.trim(),
      precio: input.precio,
      paginas: input.paginas,
      observaciones: input.observaciones,
      activo: true,
    };

    const { data, error } = await client.from('libros').insert(payload as never).select('*').single();
    if (error) {
      throw AppError.inesperado(error);
    }

    return this.mapLibro(data as { id: string; titulo: string; precio: number; paginas: number; hojas: number; observaciones: string | null; activo: boolean });
  }

  async update(id: string, input: ActualizarLibroInput): Promise<Libro> {
    const client = this.requireClient();
    const payload = {
      titulo: input.titulo.trim(),
      precio: input.precio,
      paginas: input.paginas,
      observaciones: input.observaciones,
      activo: input.activo,
    };

    const { data, error } = await client.from('libros').update(payload as never).eq('id', id).select('*').single();
    if (error) {
      throw AppError.inesperado(error);
    }

    return this.mapLibro(data as { id: string; titulo: string; precio: number; paginas: number; hojas: number; observaciones: string | null; activo: boolean });
  }

  private requireClient() {
    if (!this.supabase) {
      throw AppError.inesperado('Supabase no configurado');
    }

    return this.supabase;
  }

  private mapLibro(row: { id: string; titulo: string; precio: number; paginas: number; hojas: number; observaciones: string | null; activo: boolean }): Libro {
    return {
      id: row.id,
      titulo: row.titulo,
      precio: Number(row.precio),
      paginas: row.paginas,
      hojas: row.hojas,
      observaciones: row.observaciones,
      activo: row.activo,
    };
  }
}
