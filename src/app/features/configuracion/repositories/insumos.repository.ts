import { inject, Injectable } from '@angular/core';
import { Database } from '../../../core/supabase/database.types';
import { hasSupabaseConfig, SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';
import { AppError } from '../../../shared/errors/app-error';
import { ConfiguracionInsumo } from '../../../shared/models/configuracion-insumos.model';
import { IInsumosRepository } from './insumos.repository.interface';

const STORAGE_KEY = 'imprenta-configuracion-insumos';

const INSUMOS_INICIALES: readonly ConfiguracionInsumo[] = [
  { id: 'insumo-1', clave: 'tapa_paquete', descripcion: 'Tapas A4 (paquete)', valor: 6500, unidad: 'ARS x 50 unidades', updatedAt: '2026-04-01T00:00:00Z' },
  { id: 'insumo-2', clave: 'tapa_cantidad', descripcion: 'Tapas por paquete', valor: 50, unidad: 'unidades', updatedAt: '2026-04-01T00:00:00Z' },
  { id: 'insumo-3', clave: 'espiral_paquete', descripcion: 'Espirales (paquete)', valor: 4895, unidad: 'ARS x 50 unidades', updatedAt: '2026-04-01T00:00:00Z' },
  { id: 'insumo-4', clave: 'espiral_cantidad', descripcion: 'Espirales por paquete', valor: 50, unidad: 'unidades', updatedAt: '2026-04-01T00:00:00Z' },
  { id: 'insumo-5', clave: 'hojas_resma', descripcion: 'Hojas A4 (10 resmas)', valor: 49720, unidad: 'ARS x 10 resmas', updatedAt: '2026-04-01T00:00:00Z' },
  { id: 'insumo-6', clave: 'hojas_cantidad', descripcion: 'Hojas por resma', valor: 500, unidad: 'hojas por resma', updatedAt: '2026-04-01T00:00:00Z' },
  { id: 'insumo-7', clave: 'toner_costo', descripcion: 'Toner individual', valor: 160000, unidad: 'ARS x cartucho', updatedAt: '2026-04-01T00:00:00Z' },
  { id: 'insumo-8', clave: 'toner_impresiones', descripcion: 'Impresiones por juego de toner', valor: 22000, unidad: 'caras impresas', updatedAt: '2026-04-01T00:00:00Z' },
];

@Injectable({ providedIn: 'root' })
export class LocalInsumosRepository implements IInsumosRepository {
  async obtenerTodos(): Promise<ConfiguracionInsumo[]> {
    return this.leer();
  }

  async actualizar(id: string, valor: number): Promise<void> {
    const siguiente = this.leer().map((insumo) =>
      insumo.id === id ? { ...insumo, valor, updatedAt: new Date().toISOString() } : insumo,
    );
    this.guardar(siguiente);
  }

  private leer(): ConfiguracionInsumo[] {
    const serializado = localStorage.getItem(STORAGE_KEY);
    if (!serializado) {
      this.guardar([...INSUMOS_INICIALES]);
      return [...INSUMOS_INICIALES];
    }

    return JSON.parse(serializado) as ConfiguracionInsumo[];
  }

  private guardar(insumos: ConfiguracionInsumo[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(insumos));
  }
}

@Injectable({ providedIn: 'root' })
export class SupabaseInsumosRepository implements IInsumosRepository {
  private readonly supabase = inject(SUPABASE_CLIENT);

  async obtenerTodos(): Promise<ConfiguracionInsumo[]> {
    const client = this.requireClient();
    const { data, error } = await client.from('configuracion_insumos').select('*').order('clave');
    if (error) {
      throw AppError.inesperado(error);
    }

    return (data ?? []).map((insumo) => this.mapInsumo(insumo));
  }

  async actualizar(id: string, valor: number): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.from('configuracion_insumos').update({ valor } as never).eq('id', id);
    if (error) {
      throw AppError.inesperado(error);
    }
  }

  private requireClient() {
    if (!this.supabase) {
      throw AppError.inesperado('Supabase no configurado');
    }

    return this.supabase;
  }

  private mapInsumo(row: Database['public']['Tables']['configuracion_insumos']['Row']): ConfiguracionInsumo {
    return {
      id: row.id,
      clave: row.clave,
      descripcion: row.descripcion,
      valor: Number(row.valor),
      unidad: row.unidad,
      updatedAt: row.updated_at,
    };
  }
}

export function obtenerRepositorioInsumos() {
  return hasSupabaseConfig() ? inject(SupabaseInsumosRepository) : inject(LocalInsumosRepository);
}
