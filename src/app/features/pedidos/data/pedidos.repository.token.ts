import { InjectionToken, inject } from '@angular/core';
import { hasSupabaseConfig } from '../../../core/supabase/supabase.client';
import { LocalPedidosRepository, PedidosRepository, SupabasePedidosRepository } from './pedidos.repository';

export const PEDIDOS_REPOSITORY = new InjectionToken<PedidosRepository>('PEDIDOS_REPOSITORY', {
  providedIn: 'root',
  factory: () => (hasSupabaseConfig() ? inject(SupabasePedidosRepository) : inject(LocalPedidosRepository)),
});
