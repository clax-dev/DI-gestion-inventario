import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ProductosApi } from '../api/productos.api';
import { mensajeDeError } from '../api/error-api';
import { Producto, ProductoNuevo } from '../models';

/**
 * Store de productos (patrón Store con signals, MVVM):
 * - estado privado y escritura solo mediante métodos → cambios predecibles
 * - las vistas leen signals de solo lectura y computed derivados
 */
@Injectable({ providedIn: 'root' })
export class ProductosStore {
  private readonly api = inject(ProductosApi);

  private readonly _productos = signal<Producto[]>([]);
  private readonly _cargando = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly productos = this._productos.asReadonly();
  readonly cargando = this._cargando.asReadonly();
  readonly error = this._error.asReadonly();

  readonly categorias = computed(() => [...new Set(this._productos().map(p => p.categoria))].sort());
  readonly stockBajo = computed(() => this._productos().filter(p => p.stock < 5));

  async cargar(): Promise<void> {
    this._cargando.set(true);
    this._error.set(null);
    try {
      this._productos.set(await firstValueFrom(this.api.listar()));
    } catch (e) {
      this._error.set(mensajeDeError(e));
    } finally {
      this._cargando.set(false);
    }
  }

  async crear(datos: ProductoNuevo): Promise<Producto> {
    const nuevo = await firstValueFrom(this.api.crear(datos));
    this._productos.update(lista => [...lista, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    return nuevo;
  }

  async actualizar(id: number, datos: Partial<ProductoNuevo>): Promise<Producto> {
    const editado = await firstValueFrom(this.api.actualizar(id, datos));
    this._productos.update(lista => lista.map(p => (p.id === id ? editado : p)));
    return editado;
  }

  async borrar(id: number): Promise<void> {
    await firstValueFrom(this.api.borrar(id));
    this._productos.update(lista => lista.filter(p => p.id !== id));
  }

  /** Tras un pedido el servidor descuenta stock: se refresca solo ese producto. */
  async refrescarUno(id: number): Promise<void> {
    const p = await firstValueFrom(this.api.obtener(id));
    if (p) {
      this._productos.update(lista => lista.map(x => (x.id === id ? p : x)));
    }
  }
}
