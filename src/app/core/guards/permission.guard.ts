import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { INICIO_POR_ROL, Permiso } from '../auth/permisos';

/**
 * Factoría de guards de autorización: recibe un permiso y devuelve un CanMatchFn configurado.
 *
 *   canMatch: [permissionGuard('dashboard:ver')]
 *
 * Al ser canMatch, si no hay permiso la ruta "no existe" para el usuario y su chunk lazy no se descarga.
 * - Sin sesión     → /login con returnUrl
 * - Sin permiso    → inicio de su rol
 */
export function permissionGuard(permiso: Permiso): CanMatchFn {
  return (_route, segments) => {
    const auth = inject(AuthStore);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      // canMatch no recibe RouterStateSnapshot: la URL se reconstruye con los segmentos
      const returnUrl = '/' + segments.map(s => s.path).join('/');
      return router.createUrlTree(['/login'], { queryParams: { returnUrl } });
    }
    if (auth.can(permiso)) {
      return true;
    }
    return router.createUrlTree([INICIO_POR_ROL[auth.rol() ?? 'usuario']]);
  };
}

/** Redirige la raíz '/' a la pantalla de inicio del rol actual. */
export const inicioGuard: CanMatchFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  const rol = auth.rol();
  return router.createUrlTree([rol ? INICIO_POR_ROL[rol] : '/login']);
};
