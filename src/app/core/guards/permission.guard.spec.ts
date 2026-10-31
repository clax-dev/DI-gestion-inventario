import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Route, Router, UrlSegment, UrlTree } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { Permiso, PERMISOS_POR_ROL, Rol } from '../auth/permisos';
import { permissionGuard } from './permission.guard';
import { authGuard } from './auth.guard';

/** AuthStore falso: permite fijar sesión y rol sin Supabase. */
function authFalso(rol: Rol | null) {
  return {
    isAuthenticated: signal(rol !== null),
    rol: signal(rol),
    can: (p: Permiso) => (rol ? PERMISOS_POR_ROL[rol].includes(p) : false),
  };
}

function preparar(rol: Rol | null) {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: AuthStore, useValue: authFalso(rol) }],
  });
  return TestBed.inject(Router);
}

const segmentos = (url: string) => url.split('/').filter(Boolean).map(p => new UrlSegment(p, {}));

function comprobarMatch(permiso: Permiso, url: string) {
  return TestBed.runInInjectionContext(() => permissionGuard(permiso)({} as Route, segmentos(url), {} as never));
}

describe('permissionGuard (canMatch)', () => {
  it('sin sesión redirige a /login con returnUrl', () => {
    const router = preparar(null);
    const r = comprobarMatch('dashboard:ver', '/dashboard') as UrlTree;
    expect(router.serializeUrl(r)).toBe('/login?returnUrl=%2Fdashboard');
  });

  it('el admin puede abrir el dashboard', () => {
    preparar('admin');
    expect(comprobarMatch('dashboard:ver', '/dashboard')).toBe(true);
  });

  it('el usuario que pide el dashboard vuelve a su inicio (/productos)', () => {
    const router = preparar('usuario');
    const r = comprobarMatch('dashboard:ver', '/dashboard') as UrlTree;
    expect(router.serializeUrl(r)).toBe('/productos');
  });

  it('el usuario puede crear pedidos pero no productos', () => {
    preparar('usuario');
    expect(comprobarMatch('pedidos:crear', '/pedidos')).toBe(true);
    expect(comprobarMatch('productos:crear', '/productos/nuevo')).not.toBe(true);
  });
});

describe('authGuard (canActivate)', () => {
  it('sin sesión manda al login guardando la URL', () => {
    const router = preparar(null);
    const r = TestBed.runInInjectionContext(() => authGuard({} as never, { url: '/pedidos' } as never)) as UrlTree;
    expect(router.serializeUrl(r)).toBe('/login?returnUrl=%2Fpedidos');
  });

  it('con sesión deja pasar', () => {
    preparar('usuario');
    expect(TestBed.runInInjectionContext(() => authGuard({} as never, { url: '/pedidos' } as never))).toBe(true);
  });
});
