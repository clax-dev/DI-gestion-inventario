import { HttpErrorResponse } from '@angular/common/http';

/** Traduce los errores de PostgREST/PostgreSQL a mensajes comprensibles para el usuario. */
export function mensajeDeError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Ha ocurrido un error inesperado.';
  }
  if (error.status === 0) {
    return 'No hay conexión con el servidor.';
  }
  const detalle = (error.error as { message?: string; code?: string } | null) ?? {};
  switch (detalle.code) {
    case '23505': return 'Ya existe un registro con ese valor (duplicado).';
    case '23503': return 'No se puede borrar: hay pedidos que dependen de este producto.';
    case '23514': return 'Algún valor no es válido (por ejemplo, un número negativo).';
    case '42501': return 'No tienes permiso para realizar esta acción.';
  }
  if (detalle.message?.includes('Stock insuficiente')) {
    return 'No hay stock suficiente para ese pedido.';
  }
  return detalle.message ?? `Error ${error.status}`;
}
