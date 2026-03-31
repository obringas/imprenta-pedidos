import { InjectionToken } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Database } from './database.types';

function isPlaceholder(value: string): boolean {
  return !value || value.includes('[PROJECT_ID]') || value.includes('[ANON_KEY]');
}

export function hasSupabaseConfig(): boolean {
  return !isPlaceholder(environment.supabase.url) && !isPlaceholder(environment.supabase.anonKey);
}

export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient<Database> | null>('SUPABASE_CLIENT', {
  providedIn: 'root',
  factory: () => {
    if (!hasSupabaseConfig()) {
      return null;
    }

    return createClient<Database>(environment.supabase.url, environment.supabase.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  },
});
