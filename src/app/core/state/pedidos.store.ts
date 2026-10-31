import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PedidosApi } from '../api/pedidos.api';
import { mensajeDeError } from '../api/error-api';
import { EstadoPedido, Pedido } from '../models';

/** Store de pedidos (signals). RLS hace que contenga los pedidos propios o todos, según el rol. */
@Injectable({ providedIn: 'root' })
export class PedidosStore {
  private readonly api = inject(PedidosApi);

  private readonly _pedidos = signal<Pedido[]>([]);
  private readonly _cargando = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly pedidos = this._pedidos.asReadonly();
  readonly cargando = this._cargando.asReadonly();
  readonly error = this._error.asReadonly();
  readonly totalGastado = computed(() =>
    this._pedidos().filter(p => p.estado !== 'cancelado').reduce((suma, p) => suma + Number(p.total), 0));

  async cargar(): Promise<void> {
    this._cargando.set(true);
    this._error.set(null);
    try {
      this._pedidos.set(await firstValueFrom(this.api.listar()));
    } catch (e) {
      this._error.set(mensajeDeError(e));
    } finally {
      this._cargando.set(false);
    }
  }

  async crear(productoId: number, cantidad: number): Promise<void> {
    await firstValueFrom(this.api.crear(productoId, cantidad));
    await this.cargar(); // recarga para traer las relaciones embebidas (producto, usuario)
  }

  async cambiarEstado(id: number, estado: EstadoPedido): Promise<void> {
    await firstValueFrom(this.api.cambiarEstado(id, estado));
    this._pedidos.update(lista => lista.map(p => (p.id === id ? { ...p, estado } : p)));
  }
}
