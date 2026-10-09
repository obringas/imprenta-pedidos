import { inject, Injectable } from '@angular/core';
import { Database } from '../../../core/supabase/database.types';
import { hasSupabaseConfig, SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';
import { AppError } from '../../../shared/errors/app-error';
import {
  aplicarValorInsumo,
  ClaveInsumo,
  ConfiguracionInsumo,
  reglaDeInsumo,
  ValorInsumo,
} from '../../../shared/models/configuracion-insumos.model';
import { IInsumosRepository } from './insumos.repository.interface';

const STORAGE_KEY = 'imprenta-configuracion-insumos';

type InsumoInicial = Omit<ConfiguracionInsumo, 'id' | 'tipo' | 'updatedAt' | 'valorTexto'> & {
  readonly valorTexto?: string;
};

/** Seed del repositorio local (sin Supabase). Espeja `supabase/configuracion-insumos.sql`. */
const INSUMOS_INICIALES: readonly InsumoInicial[] = [
  { clave: 'tapa_paquete', descripcion: 'Tapas A4 (paquete)', valor: 7900, unidad: 'ARS x {tapa_cantidad} unidades' },
  { clave: 'tapa_a5_paquete', descripcion: 'Tapas A5 (paquete)', valor: 3950, unidad: 'ARS x {tapa_cantidad} unidades' },
  { clave: 'tapa_cantidad', descripcion: 'Tapas por paquete', valor: 50, unidad: 'unidades' },
  { clave: 'espiral_paquete', descripcion: 'Espirales (paquete)', valor: 6700, unidad: 'ARS x {espiral_cantidad} unidades' },
  { clave: 'espiral_cantidad', descripcion: 'Espirales por paquete', valor: 50, unidad: 'unidades' },
  { clave: 'espiral_max_hojas', descripcion: 'Hojas máximas por espiral', valor: 85, unidad: 'hojas' },
  { clave: 'hojas_resma', descripcion: 'Hojas A4 (10 resmas)', valor: 59000, unidad: 'ARS x 10 resmas' },
  { clave: 'hojas_cantidad', descripcion: 'Hojas por resma', valor: 500, unidad: 'hojas por resma' },
  { clave: 'toner_costo', descripcion: 'Toner individual (deprecado)', valor: 160000, unidad: 'ARS x 1 cartucho' },
  { clave: 'toner_impresiones', descripcion: 'Impresiones por juego de toner (deprecado)', valor: 22000, unidad: 'caras impresas' },
  { clave: 'toner_negro_costo', descripcion: 'Toner negro (cartucho)', valor: 166000, unidad: 'ARS x 1 cartucho' },
  { clave: 'toner_negro_rinde', descripcion: 'Rendimiento toner negro', valor: 24000, unidad: 'caras al 5% de cobertura' },
  { clave: 'toner_color_costo', descripcion: 'Toner color (cada cartucho)', valor: 330000, unidad: 'ARS x 1 cartucho (C, M o Y)' },
  { clave: 'toner_color_rinde', descripcion: 'Rendimiento toner color', valor: 21000, unidad: 'caras al 5% de cobertura' },
  { clave: 'toner_factor_rendimiento', descripcion: 'Factor de rendimiento real', valor: 1, unidad: '1 = nominal, 0,8 = conservador' },
  { clave: 'cobertura_bn_negro', descripcion: 'Página B/N: % de negro', valor: 5, unidad: '%' },
  { clave: 'cobertura_poco_negro', descripcion: 'Texto con poco color: % de negro', valor: 5, unidad: '%' },
  { clave: 'cobertura_poco_color', descripcion: 'Texto con poco color: % de cada color', valor: 2, unidad: '%' },
  { clave: 'cobertura_pleno_negro', descripcion: 'Color pleno: % de negro', valor: 5, unidad: '%' },
  { clave: 'cobertura_pleno_color', descripcion: 'Color pleno: % de cada color', valor: 5, unidad: '%' },
  { clave: 'margen_default', descripcion: 'Margen de ganancia por defecto', valor: 150, unidad: '% sobre costo' },
  { clave: 'margen_minimo', descripcion: 'Margen mínimo (alerta por debajo)', valor: 60, unidad: '% sobre costo' },
  { clave: 'precio_redondeo', descripcion: 'Redondear precio a múltiplos de', valor: 50, unidad: 'ARS' },
  { clave: 'descuento_cantidad_pct', descripcion: 'Descuento por cantidad (0 = no mostrar)', valor: 12, unidad: '%' },
  { clave: 'descuento_cantidad_minima', descripcion: 'Cantidad mínima para el descuento', valor: 15, unidad: 'unidades' },
  { clave: 'whatsapp_contacto', descripcion: 'WhatsApp de contacto', valor: 0, valorTexto: '3874094328', unidad: 'número' },
  { clave: 'whatsapp_firma', descripcion: 'Firma del mensaje', valor: 0, valorTexto: 'Emilse', unidad: 'texto' },
];

/** Lo guardado en localStorage antes del cotizador no tenia tipo ni valor de texto. */
type InsumoAlmacenado = Omit<ConfiguracionInsumo, 'tipo' | 'valorTexto'> & { readonly valorTexto?: string | null };

@Injectable({ providedIn: 'root' })
export class LocalInsumosRepository implements IInsumosRepository {
  async obtenerTodos(): Promise<ConfiguracionInsumo[]> {
    return this.leer();
  }

  async actualizar(id: string, valor: ValorInsumo): Promise<void> {
    const siguiente = this.leer().map((insumo) => (insumo.id === id ? aplicarValorInsumo(insumo, valor) : insumo));
    this.guardar(siguiente);
  }

  private leer(): ConfiguracionInsumo[] {
    const serializado = localStorage.getItem(STORAGE_KEY);
    const almacenados = serializado ? (JSON.parse(serializado) as InsumoAlmacenado[]) : [];
    const insumos = [...almacenados.map((insumo) => this.completar(insumo)), ...this.faltantes(almacenados)];

    this.guardar(insumos);
    return insumos;
  }

  /** Agrega las claves del seed que todavia no estan, como hace la migracion con ON CONFLICT DO NOTHING. */
  private faltantes(almacenados: readonly InsumoAlmacenado[]): ConfiguracionInsumo[] {
    const existentes = new Set<string>(almacenados.map((insumo) => insumo.clave));
    return INSUMOS_INICIALES.filter((inicial) => !existentes.has(inicial.clave)).map((inicial, indice) =>
      this.completar({
        ...inicial,
        id: `insumo-${inicial.clave}-${indice}`,
        updatedAt: '2026-10-09T00:00:00Z',
      }),
    );
  }

  private completar(insumo: InsumoAlmacenado): ConfiguracionInsumo {
    return { ...insumo, tipo: reglaDeInsumo(insumo.clave).tipo, valorTexto: insumo.valorTexto ?? null };
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

  async actualizar(id: string, valor: ValorInsumo): Promise<void> {
    const client = this.requireClient();
    const cambio = typeof valor === 'string' ? { valor_texto: valor } : { valor };
    const { error } = await client.from('configuracion_insumos').update(cambio as never).eq('id', id);
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
      clave: row.clave as ClaveInsumo,
      descripcion: row.descripcion,
      tipo: reglaDeInsumo(row.clave).tipo,
      valor: Number(row.valor),
      // Antes de migracion_cotizador.sql la columna no existe y llega undefined.
      valorTexto: row.valor_texto ?? null,
      unidad: row.unidad,
      updatedAt: row.updated_at,
    };
  }
}

export function obtenerRepositorioInsumos() {
  return hasSupabaseConfig() ? inject(SupabaseInsumosRepository) : inject(LocalInsumosRepository);
}
