import { Injectable, computed, inject, signal } from '@angular/core';
import { SUPABASE_CLIENT, hasSupabaseConfig } from '../supabase/supabase.client';

const AUTH_STORAGE_KEY = 'imprenta-auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SUPABASE_CLIENT);
  private readonly usuarioInterno = signal<string | null>(null);
  private readonly inicializadoInterno = signal(false);
  private readonly errorInterno = signal<string | null>(null);

  readonly usuario = this.usuarioInterno.asReadonly();
  readonly autenticado = computed(() => this.usuarioInterno() !== null);
  readonly inicializado = this.inicializadoInterno.asReadonly();
  readonly error = this.errorInterno.asReadonly();
  readonly usandoSupabase = computed(() => hasSupabaseConfig() && this.supabase !== null);

  constructor() {
    if (this.usandoSupabase()) {
      void this.hidratarSesionSupabase();
      this.supabase?.auth.onAuthStateChange((_event, session) => {
        this.aplicarSesion(session?.user.email ?? null);
        this.inicializadoInterno.set(true);
      });
      return;
    }

    this.usuarioInterno.set(this.leerSesionLocal());
    this.inicializadoInterno.set(true);
  }

  async iniciarSesion(email: string, password: string): Promise<boolean> {
    this.errorInterno.set(null);
    const emailNormalizado = email.trim().toLowerCase();
    const passwordNormalizado = password.trim();

    if (!emailNormalizado || !passwordNormalizado) {
      this.errorInterno.set('Completá email y contraseña.');
      return false;
    }

    if (this.usandoSupabase()) {
      const { data, error } = await this.supabase!.auth.signInWithPassword({
        email: emailNormalizado,
        password: passwordNormalizado,
      });

      if (error) {
        this.errorInterno.set('No se pudo iniciar sesión. Revisá email y contraseña.');
        return false;
      }

      this.aplicarSesion(data.user?.email ?? emailNormalizado);
      return true;
    }

    this.aplicarSesion(emailNormalizado);
    localStorage.setItem(AUTH_STORAGE_KEY, emailNormalizado);
    return true;
  }

  async cerrarSesion(): Promise<void> {
    this.errorInterno.set(null);

    if (this.usandoSupabase()) {
      await this.supabase!.auth.signOut();
      this.aplicarSesion(null);
      return;
    }

    this.aplicarSesion(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  async asegurarSesion(): Promise<boolean> {
    if (this.inicializadoInterno()) {
      return this.autenticado();
    }

    if (this.usandoSupabase()) {
      await this.hidratarSesionSupabase();
      return this.autenticado();
    }

    this.usuarioInterno.set(this.leerSesionLocal());
    this.inicializadoInterno.set(true);
    return this.autenticado();
  }

  limpiarError(): void {
    this.errorInterno.set(null);
  }

  private async hidratarSesionSupabase(): Promise<void> {
    const { data } = await this.supabase!.auth.getSession();
    this.aplicarSesion(data.session?.user.email ?? null);
    this.inicializadoInterno.set(true);
  }

  private aplicarSesion(email: string | null): void {
    this.usuarioInterno.set(email);
    if (!this.usandoSupabase()) {
      if (email) {
        localStorage.setItem(AUTH_STORAGE_KEY, email);
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
  }

  private leerSesionLocal(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    return localStorage.getItem(AUTH_STORAGE_KEY);
  }
}
