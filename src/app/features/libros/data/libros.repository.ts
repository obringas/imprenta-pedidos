import { inject, Injectable } from '@angular/core';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';
import { Database } from '../../../core/supabase/database.types';
import { esTipoImpresion, TIPO_IMPRESION_POR_DEFECTO, TipoImpresion } from '../../../shared/constants/negocio.constants';
import { AppError } from '../../../shared/errors/app-error';
import { LIBROS_INICIALES } from '../../data/mock-data';
import { normalizarTextoMojibake } from '../../../shared/utils/text-normalizer';
import { ActualizarLibroInput, CrearLibroInput, Libro } from '../domain/libro.model';

const STORAGE_KEY = 'imprenta-libros';

/**
 * Lo guardado en localStorage antes de A4/A5 tenia un unico `precio`, y antes
 * del cotizador no tenia tipo de impresion ni paginas a color.
 */
type LibroAlmacenado = Partial<Pick<Libro, 'precioA4' | 'precioA5' | 'tipoImpresion' | 'paginasColor'>> &
  Omit<Libro, 'precioA4' | 'precioA5' | 'tipoImpresion' | 'paginasColor'> & { readonly precio?: number };

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
      precioA4: input.precioA4,
      precioA5: input.precioA5,
      paginas: input.paginas,
      hojas: Math.ceil(input.paginas / 2),
      observaciones: input.observaciones,
      margenGanancia: input.margenGanancia,
      tipoImpresion: input.tipoImpresion,
      paginasColor: input.paginasColor,
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
      margenGanancia: input.margenGanancia,
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

    const libros = (JSON.parse(serializado) as LibroAlmacenado[]).map(({ precio, ...libro }) => ({
      ...libro,
      // El precio unico de antes era el A5: con el se cargaban los pedidos.
      precioA4: libro.precioA4 ?? null,
      precioA5: libro.precioA5 ?? precio ?? 0,
      hojas: libro.hojas ?? Math.ceil(libro.paginas / 2),
      observaciones: libro.observaciones ?? null,
      margenGanancia: libro.margenGanancia ?? 156,
      tipoImpresion: libro.tipoImpresion ?? TIPO_IMPRESION_POR_DEFECTO,
      paginasColor: libro.paginasColor ?? 0,
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
    const payloadConMargen = { ...this.aFila(input), activo: true };

    const { data, error } = await client.from('libros').insert(payloadConMargen as never).select('*').single();
    if (error && this.esColumnaMargenInexistente(error)) {
      const { margen_ganancia: _margen, ...payloadLegacy } = payloadConMargen;

      const reintento = await client.from('libros').insert(payloadLegacy as never).select('*').single();
      if (reintento.error) {
        throw AppError.inesperado(reintento.error);
      }

      return this.mapLibro(reintento.data);
    }

    if (error) {
      throw AppError.inesperado(error);
    }

    return this.mapLibro(data);
  }

  async update(id: string, input: ActualizarLibroInput): Promise<Libro> {
    const client = this.requireClient();
    const payloadConMargen = { ...this.aFila(input), activo: input.activo };

    const { data, error } = await client.from('libros').update(payloadConMargen as never).eq('id', id).select('*').single();
    if (error && this.esColumnaMargenInexistente(error)) {
      const { margen_ganancia: _margen, ...payloadLegacy } = payloadConMargen;

      const reintento = await client.from('libros').update(payloadLegacy as never).eq('id', id).select('*').single();
      if (reintento.error) {
        throw AppError.inesperado(reintento.error);
      }

      return this.mapLibro(reintento.data);
    }

    if (error) {
      throw AppError.inesperado(error);
    }

    return this.mapLibro(data);
  }

  private requireClient() {
    if (!this.supabase) {
      throw AppError.inesperado('Supabase no configurado');
    }

    return this.supabase;
  }

  private aFila(input: CrearLibroInput | ActualizarLibroInput) {
    return {
      titulo: input.titulo.trim(),
      precio_a4: input.precioA4,
      precio_a5: input.precioA5,
      paginas: input.paginas,
      observaciones: input.observaciones,
      margen_ganancia: input.margenGanancia,
      tipo_impresion: input.tipoImpresion,
      paginas_color: input.paginasColor,
    };
  }

  private mapLibro(row: Database['public']['Tables']['libros']['Row']): Libro {
    return {
      id: row.id,
      titulo: row.titulo,
      precioA4: row.precio_a4 === null ? null : Number(row.precio_a4),
      precioA5: Number(row.precio_a5),
      paginas: row.paginas,
      hojas: row.hojas,
      observaciones: row.observaciones,
      margenGanancia: Number(row.margen_ganancia ?? 156),
      tipoImpresion: this.mapTipoImpresion(row.tipo_impresion),
      paginasColor: row.paginas_color ?? 0,
      activo: row.activo,
    };
  }

  /** Antes de `migracion_cotizador.sql` la columna no existe y llega undefined. */
  private mapTipoImpresion(valor: string | undefined): TipoImpresion {
    return valor && esTipoImpresion(valor) ? valor : TIPO_IMPRESION_POR_DEFECTO;
  }

  private esColumnaMargenInexistente(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const code = 'code' in error ? String(error.code) : '';
    const message = 'message' in error ? String(error.message) : '';
    return code === 'PGRST204' && message.includes('margen_ganancia');
  }
}
