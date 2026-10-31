/** Roles de negocio de la aplicación (se guardan en la tabla `perfiles`). */
export type Rol = 'admin' | 'usuario';

/** Permisos con formato `recurso:acción`. La interfaz pregunta siempre por permisos, nunca por roles. */
export type Permiso =
  | 'productos:ver'
  | 'productos:crear'
  | 'productos:editar'
  | 'pedidos:crear'
  | 'pedidos:ver_propios'
  | 'pedidos:ver_todos'
  | 'dashboard:ver'
  | 'informes:exportar'
  | 'actividad:ver';

/**
 * Asignación rol → permisos (PA ⊆ R × P del modelo RBAC).
 * Es la única fuente de verdad de los privilegios en el cliente: añadir un rol es añadir una entrada.
 */
export const PERMISOS_POR_ROL: Record<Rol, readonly Permiso[]> = {
  admin: [
    'productos:ver', 'productos:crear', 'productos:editar',
    'pedidos:ver_todos', 'dashboard:ver', 'informes:exportar', 'actividad:ver',
  ],
  usuario: ['productos:ver', 'pedidos:crear', 'pedidos:ver_propios'],
};

/** Pantalla de inicio de cada rol (tras el login o si intenta entrar donde no debe). */
export const INICIO_POR_ROL: Record<Rol, string> = {
  admin: '/dashboard',
  usuario: '/productos',
};
