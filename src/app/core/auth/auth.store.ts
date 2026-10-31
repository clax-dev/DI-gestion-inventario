import { computed, inject, Injectable, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import { SupabaseService } from '../services/supabase.service';
import { Permiso, PERMISOS_POR_ROL, Rol } from './permisos';

/** Claims del JWT de Supabase que usa la aplicación. */
interface Claims {
  sub: string;
  exp: number;
  /** Claim propio añadido por el Custom Access Token Hook (rol de negocio). */
  app_rol?: Rol;
}

/** Decodifica el payload (base64url) de un JWT. Solo para la UI: la firma la verifica el servidor. */
export function leerClaims(token: string): Claims | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)) as Claims;
  } catch {
    return null;
  }
}

/**
 * Store de sesión (patrón Store con signals).
 * Único punto que conoce el token: guards, interceptor y directivas solo leen sus signals.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly supabase = inject(SupabaseService).client;

  // Estado privado: solo este servicio lo modifica
  private readonly _session = signal<Session | null>(null);
  private readonly _rol = signal<Rol | null>(null);

  // Selectores de solo lectura
  readonly session = this._session.asReadonly();
  readonly rol = this._rol.asReadonly();
  readonly isAuthenticated = computed(() => this._session() !== null);
  readonly accessToken = computed(() => this._session()?.access_token ?? null);
  readonly userId = computed(() => this._session()?.user.id ?? null);
  readonly email = computed(() => this._session()?.user.email ?? '');
  readonly permisos = computed(() => {
    const rol = this._rol();
    return new Set<Permiso>(rol ? PERMISOS_POR_ROL[rol] : []);
  });

  /** ¿El usuario actual tiene el permiso? */
  can(permiso: Permiso): boolean {
    return this.permisos().has(permiso);
  }

  /**
   * Restaura la sesión guardada por Supabase antes de que se evalúe ningún guard
   * (se llama desde provideAppInitializer en main.ts).
   */
  async init(): Promise<void> {
    const { data } = await this.supabase.auth.getSession();
    await this.aplicarSesion(data.session);
    // Refrescos de token, cierres de sesión en otra pestaña, etc.
    this.supabase.auth.onAuthStateChange((_evento, session) => {
      // setTimeout: Supabase recomienda no llamar a su API dentro del propio callback
      setTimeout(() => void this.aplicarSesion(session), 0);
    });
  }

  /** Inicia sesión. Devuelve null si va bien o el mensaje de error. */
  async login(email: string, password: string): Promise<string | null> {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos' : error.message;
    }
    await this.aplicarSesion(data.session);
    return null;
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
    await this.aplicarSesion(null);
  }

  /** Canjea el refresh token por un access token nuevo (lo usa el interceptor ante un 401). */
  async refrescar(): Promise<boolean> {
    const { data, error } = await this.supabase.auth.refreshSession();
    if (error || !data.session) {
      return false;
    }
    await this.aplicarSesion(data.session);
    return true;
  }

  /** Calcula el rol (claim app_rol o, si el hook no está activo, la tabla perfiles) y publica el estado. */
  private async aplicarSesion(session: Session | null): Promise<void> {
    if (!session) {
      this._rol.set(null);
      this._session.set(null);
      return;
    }
    let rol = leerClaims(session.access_token)?.app_rol ?? null;
    if (!rol) {
      const { data } = await this.supabase.from('perfiles').select('rol').eq('id', session.user.id).single();
      rol = (data?.rol as Rol | undefined) ?? 'usuario';
    }
    // Primero el rol y después la sesión: ningún guard ve "autenticado sin rol"
    this._rol.set(rol);
    this._session.set(session);
  }
}
