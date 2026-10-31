import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Producto, ProductoNuevo } from '../models';

/** URL base de la API REST (PostgREST) generada por Supabase sobre PostgreSQL. */
export const API_REST = `${environment.supabaseUrl}/rest/v1`;

/** Pide a PostgREST que devuelva la fila creada/modificada. */
export const DEVOLVER_FILA = new HttpHeaders({ Prefer: 'return=representation' });

/**
 * Acceso a la tabla SQL `productos` mediante la API REST (Observables de RxJS).
 * Las cabeceras de autenticación las añade el interceptor, no este servicio.
 */
@Injectable({ providedIn: 'root' })
export class ProductosApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_REST}/productos`;

  listar(): Observable<Producto[]> {
    const params = new HttpParams().set('select', '*').set('order', 'nombre.asc');
    return this.http.get<Producto[]>(this.url, { params });
  }

  obtener(id: number): Observable<Producto> {
    const params = new HttpParams().set('id', `eq.${id}`).set('select', '*');
    return this.http.get<Producto[]>(this.url, { params }).pipe(map(filas => filas[0]));
  }

  /** ¿Existe ya un producto con ese SKU? (lo usa el validador asíncrono). Se puede excluir un id al editar. */
  existeSku(sku: string, excluirId?: number): Observable<boolean> {
    let params = new HttpParams().set('sku', `eq.${sku.trim().toUpperCase()}`).set('select', 'id');
    if (excluirId) {
      params = params.set('id', `neq.${excluirId}`);
    }
    return this.http.get<{ id: number }[]>(this.url, { params }).pipe(map(filas => filas.length > 0));
  }

  crear(producto: ProductoNuevo): Observable<Producto> {
    return this.http.post<Producto[]>(this.url, producto, { headers: DEVOLVER_FILA }).pipe(map(f => f[0]));
  }

  actualizar(id: number, cambios: Partial<ProductoNuevo>): Observable<Producto> {
    const params = new HttpParams().set('id', `eq.${id}`);
    return this.http.patch<Producto[]>(this.url, cambios, { params, headers: DEVOLVER_FILA }).pipe(map(f => f[0]));
  }

  borrar(id: number): Observable<void> {
    const params = new HttpParams().set('id', `eq.${id}`);
    return this.http.delete<void>(this.url, { params });
  }
}
