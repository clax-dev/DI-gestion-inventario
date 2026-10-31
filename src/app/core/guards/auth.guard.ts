import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../auth/auth.store';

/**
 * Guard funcional de autenticación: solo deja pasar si hay sesión.
 * Si no la hay, devuelve un UrlTree a /login (redirección atómica) guardando la URL pedida en returnUrl.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  return auth.isAuthenticated()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Evita que un usuario con sesión vuelva a ver el login: lo manda a su inicio. */
export const soloInvitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  return auth.isAuthenticated() ? router.createUrlTree(['/']) : true;
};
