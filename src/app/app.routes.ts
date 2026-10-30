import { Routes } from '@angular/router';
import { authGuard, soloInvitadoGuard } from './core/guards/auth.guard';
import { inicioGuard, permissionGuard } from './core/guards/permission.guard';
import { unsavedChangesGuard } from './core/guards/unsaved-changes.guard';

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
  {
    path: 'productos/nuevo',
    canMatch: [permissionGuard('productos:crear')],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./pages/producto-form/producto-form.page').then(m => m.ProductoFormPage),
  },
  {
    path: 'productos/:id/editar',
    canMatch: [permissionGuard('productos:editar')],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./pages/producto-form/producto-form.page').then(m => m.ProductoFormPage),
  },
  {
    path: 'pedidos',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/pedidos/pedidos.page').then(m => m.PedidosPage),
  },
  { path: '**', redirectTo: '' },
];
