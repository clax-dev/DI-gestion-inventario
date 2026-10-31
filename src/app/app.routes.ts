import { Routes } from '@angular/router';
import { authGuard, soloInvitadoGuard } from './core/guards/auth.guard';
import { inicioGuard } from './core/guards/permission.guard';

/**
 * Árbol de rutas con carga diferida (loadComponent).
 * - canActivate [authGuard]            → pantallas que solo requieren sesión
 * - canMatch [permissionGuard(...)]    → pantallas restringidas: sin permiso, su código ni se descarga
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', canMatch: [inicioGuard], children: [] },
  {
    path: 'login',
    canActivate: [soloInvitadoGuard],
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage),
  },
  {
    path: 'productos',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/productos/productos.page').then(m => m.ProductosPage),
  },
  { path: '**', redirectTo: '' },
];
