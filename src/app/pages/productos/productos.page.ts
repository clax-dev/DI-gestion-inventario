import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AlertController, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonMenuButton, IonRefresher,
  IonRefresherContent, IonText, IonTitle, IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, cartOutline, createOutline, trashOutline } from 'ionicons/icons';
import { AuthStore } from '../../core/auth/auth.store';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { mensajeDeError } from '../../core/api/error-api';
import { Producto } from '../../core/models';
import { NotificacionService } from '../../core/services/notificacion.service';
import { ProductosStore } from '../../core/state/productos.store';
import { AccionFila, Columna, DataTableComponent, EventoAccion } from '../../shared/data-table/data-table.component';
import { euros } from '../../shared/formato';

/** Catálogo de productos: todos lo ven; el admin además crea, edita y borra; el usuario pide. */
@Component({
  selector: 'app-productos',
  templateUrl: './productos.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonButton, IonIcon,
    IonRefresher, IonRefresherContent, IonText, DataTableComponent, HasPermissionDirective,
  ],
})
export class ProductosPage implements OnInit {
  protected readonly store = inject(ProductosStore);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly alertas = inject(AlertController);
  private readonly avisos = inject(NotificacionService);

  protected readonly columnas: Columna<Producto>[] = [
    { clave: 'nombre', titulo: 'Producto' },
    { clave: 'sku', titulo: 'SKU' },
    { clave: 'categoria', titulo: 'Categoría' },
    { clave: 'precio', titulo: 'Precio', numerica: true, formato: p => euros(p.precio) },
    { clave: 'stock', titulo: 'Stock', numerica: true, formato: p => (p.stock < 5 ? `${p.stock} ⚠ bajo` : String(p.stock)) },
  ];

  /** Las acciones se calculan según permisos: la tabla no sabe nada de roles. */
  protected readonly acciones = computed<AccionFila[]>(() => {
    const lista: AccionFila[] = [];
    if (this.auth.can('pedidos:crear')) lista.push({ id: 'pedir', etiqueta: 'Pedir', icono: 'cart-outline' });
    if (this.auth.can('productos:editar')) lista.push({ id: 'editar', etiqueta: 'Editar', icono: 'create-outline' });
    if (this.auth.can('productos:editar')) lista.push({ id: 'borrar', etiqueta: 'Borrar', icono: 'trash-outline', color: 'danger' });
    return lista;
  });

  constructor() {
    addIcons({ addOutline, cartOutline, createOutline, trashOutline });
  }

  ngOnInit(): void {
    void this.store.cargar();
  }

  async refrescar(evento: CustomEvent): Promise<void> {
    await this.store.cargar();
    await (evento.target as HTMLIonRefresherElement).complete();
  }

  async alPulsar({ accion, fila }: EventoAccion<Producto>): Promise<void> {
    if (accion === 'pedir') {
      await this.router.navigate(['/pedidos'], { queryParams: { producto: fila.id } });
    } else if (accion === 'editar') {
      await this.router.navigate(['/productos', fila.id, 'editar']);
    } else if (accion === 'borrar') {
      await this.confirmarBorrado(fila);
    }
  }

  private async confirmarBorrado(producto: Producto): Promise<void> {
    const alerta = await this.alertas.create({
      header: 'Borrar producto',
      message: `¿Seguro que quieres borrar «${producto.nombre}»?`,
      buttons: [{ text: 'Cancelar', role: 'cancel' }, { text: 'Borrar', role: 'destructive' }],
    });
    await alerta.present();
    const { role } = await alerta.onDidDismiss();
    if (role !== 'destructive') return;
    try {
      await this.store.borrar(producto.id);
      await this.avisos.exito('Producto borrado');
    } catch (e) {
      await this.avisos.error(mensajeDeError(e));
    }
  }
}
