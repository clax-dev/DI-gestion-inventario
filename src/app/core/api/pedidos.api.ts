import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { EstadoPedido, Pedido } from '../models';
import { API_REST, DEVOLVER_FILA } from './productos.api';

/**
 * Acceso a la tabla SQL `pedidos`. RLS decide qué filas devuelve:
 * el usuario solo recibe los suyos y el administrador todos (misma petición, distinta respuesta).
 */
@Injectable({ providedIn: 'root' })
export class PedidosApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_REST}/pedidos`;

  /** Lista con relaciones embebidas (JOIN de PostgREST por clave foránea). */
  listar(): Observable<Pedido[]> {
    const params = new HttpParams()
      .set('select', '*,producto:productos(nombre,sku,categoria),usuario:perfiles(nombre,email)')
      .set('order', 'creado_en.desc');
    return this.http.get<Pedido[]>(this.url, { params });
  }

  /** El total y el descuento de stock los calcula el servidor (trigger), no el cliente. */
  crear(productoId: number, cantidad: number): Observable<Pedido> {
    return this.http
      .post<Pedido[]>(this.url, { producto_id: productoId, cantidad }, { headers: DEVOLVER_FILA })
      .pipe(map(f => f[0]));
  }

  cambiarEstado(id: number, estado: EstadoPedido): Observable<Pedido> {
    const params = new HttpParams().set('id', `eq.${id}`);
    return this.http.patch<Pedido[]>(this.url, { estado }, { params, headers: DEVOLVER_FILA }).pipe(map(f => f[0]));
  }
}
