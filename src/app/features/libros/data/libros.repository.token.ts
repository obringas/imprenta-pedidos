import { InjectionToken, inject } from '@angular/core';
import { hasSupabaseConfig } from '../../../core/supabase/supabase.client';
import { LibrosRepository, LocalLibrosRepository, SupabaseLibrosRepository } from './libros.repository';

export const LIBROS_REPOSITORY = new InjectionToken<LibrosRepository>('LIBROS_REPOSITORY', {
  providedIn: 'root',
  factory: () => (hasSupabaseConfig() ? inject(SupabaseLibrosRepository) : inject(LocalLibrosRepository)),
});
