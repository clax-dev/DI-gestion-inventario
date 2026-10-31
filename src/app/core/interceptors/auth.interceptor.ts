import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../auth/auth.store';
import { NotificacionService } from '../services/notificacion.service';

/** Marca las peticiones ya reintentadas tras un refresh, para no entrar en un bucle de 401. */
const YA_REINTENTADA = new HttpContextToken<boolean>(() => false);

/**
 * Interceptor funcional de autenticación (cadena de responsabilidad de HttpClient):
 * 1. Añade `apikey` y `Authorization: Bearer <token>` SOLO a las peticiones hacia nuestra API (Supabase).
 * 2. 401 → intenta una vez refrescar el token y repetir la petición; si falla, cierra sesión y va al login.
 * 3. 403 → avisa y lleva al inicio sin cerrar la sesión.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Peticiones a terceros: no se toca nada (no se filtra el token)
  if (!req.url.startsWith(environment.supabaseUrl)) {
    return next(req);
  }

  const auth = inject(AuthStore);
  const router = inject(Router);
  const avisos = inject(NotificacionService);

  // HttpRequest es inmutable: se clona con las cabeceras
  const conCabeceras = (r: HttpRequest<unknown>) => {
    const token = auth.accessToken();
    return r.clone({
      setHeaders: {
        apikey: environment.supabaseKey,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  };

  const salirAlLogin = () => {
    void auth.logout();
    void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
    avisos.error('Tu sesión ha caducado. Vuelve a iniciar sesión.');
  };

  return next(conCabeceras(req)).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.context.get(YA_REINTENTADA)) {
        // Flujo de refresh token: se canjea un token nuevo y se repite la petición original
        return from(auth.refrescar()).pipe(
          switchMap(ok => {
            if (!ok) {
              salirAlLogin();
              return throwError(() => error);
            }
            const reintento = req.clone({ context: req.context.set(YA_REINTENTADA, true) });
            return next(conCabeceras(reintento));
          }),
        );
      }
      if (error.status === 401) {
        salirAlLogin();
      } else if (error.status === 403) {
        avisos.error('No tienes permiso para realizar esta acción.');
      }
      // Se re-emite para que el componente pueda reaccionar (quitar spinner, etc.)
      return throwError(() => error);
    }),
  );
};
