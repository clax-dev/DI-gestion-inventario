import { ChangeDetectionStrategy, Component, computed, effect, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonHeader, IonInput,
  IonMenuButton, IonSelect, IonSelectOption, IonSpinner, IonText, IonTitle, IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeCircleOutline, sendOutline } from 'ionicons/icons';
import { AuthStore } from '../../core/auth/auth.store';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { mensajeDeError } from '../../core/api/error-api';
import { Pedido } from '../../core/models';
import { NotificacionService } from '../../core/services/notificacion.service';
import { PedidosStore } from '../../core/state/pedidos.store';
import { ProductosStore } from '../../core/state/productos.store';
import { AccionFila, Columna, DataTableComponent, EventoAccion } from '../../shared/data-table/data-table.component';
import { euros, fecha } from '../../shared/formato';

/**
 * Pedidos. Usuario estándar: hace pedidos y ve los suyos. Administrador: ve todos y cambia su estado.
 * El formulario usa two-way data binding ([(ngModel)] sobre signals).
 */
@Component({
  selector: 'app-pedidos',
  templateUrl: './pedidos.page.html',
  styleUrls: ['./pedidos.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonCard, IonCardHeader,
    IonCardTitle, IonCardContent, IonSelect, IonSelectOption, IonInput, IonButton, IonSpinner, IonText,
    DataTableComponent, HasPermissionDirective,
  ],
})
export class PedidosPage implements OnInit {
  /** ?producto=ID al venir desde el botón "Pedir" del catálogo. */
  readonly producto = input<string>();

  protected readonly pedidos = inject(PedidosStore);
  protected readonly productos = inject(ProductosStore);
  private readonly auth = inject(AuthStore);
  private readonly avisos = inject(NotificacionService);

  // Estado del formulario (two-way binding)
  protected readonly productoId = signal<number | null>(null);
  protected readonly cantidad = signal(1);
  protected readonly enviando = signal(false);

  protected readonly seleccionado = computed(() => this.productos.productos().find(p => p.id === this.productoId()) ?? null);
  protected readonly totalEstimado = computed(() => euros((this.seleccionado()?.precio ?? 0) * this.cantidad()));
  protected readonly cantidadValida = computed(() => {
    const p = this.seleccionado();
    const n = this.cantidad();
    return !!p && Number.isInteger(n) && n > 0 && n <= p.stock;
  });

  protected readonly esAdmin = computed(() => this.auth.can('pedidos:ver_todos'));
  protected readonly euros = euros;

  protected readonly columnas = computed<Columna<Pedido>[]>(() => [
    { clave: 'creado_en', titulo: 'Fecha', formato: p => fecha(p.creado_en) },
    ...(this.esAdmin() ? [{ clave: 'usuario_id', titulo: 'Cliente', formato: (p: Pedido) => p.usuario?.nombre ?? '—' } as Columna<Pedido>] : []),
    { clave: 'producto_id', titulo: 'Producto', formato: p => p.producto?.nombre ?? '—' },
    { clave: 'cantidad', titulo: 'Uds.', numerica: true },
    { clave: 'total', titulo: 'Total', numerica: true, formato: p => euros(p.total) },
    { clave: 'estado', titulo: 'Estado' },
  ]);

  protected readonly acciones = computed<AccionFila[]>(() => this.esAdmin()
    ? [
        { id: 'enviado', etiqueta: 'Enviar', icono: 'send-outline', color: 'success' },
        { id: 'cancelado', etiqueta: 'Cancelar', icono: 'close-circle-outline', color: 'danger' },
      ]
    : []);

  constructor() {
    addIcons({ sendOutline, closeCircleOutline });
    // Si llega ?producto=ID, se preselecciona en el formulario
    effect(() => {
      const id = this.producto();
      if (id) this.productoId.set(Number(id));
    });
  }

  ngOnInit(): void {
    void this.pedidos.cargar();
    if (this.productos.productos().length === 0) void this.productos.cargar();
  }

  protected async pedir(): Promise<void> {
    const p = this.seleccionado();
    if (!p || !this.cantidadValida()) return;
    this.enviando.set(true);
    try {
      await this.pedidos.crear(p.id, this.cantidad());
      await this.productos.refrescarUno(p.id); // el servidor ha descontado el stock
      await this.avisos.exito(`Pedido de ${this.cantidad()} × ${p.nombre} realizado`);
      this.cantidad.set(1);
    } catch (e) {
      await this.avisos.error(mensajeDeError(e));
    } finally {
      this.enviando.set(false);
    }
  }

  protected async alPulsar({ accion, fila }: EventoAccion<Pedido>): Promise<void> {
    if (accion !== 'enviado' && accion !== 'cancelado') return;
    try {
      await this.pedidos.cambiarEstado(fila.id, accion);
      await this.avisos.exito(`Pedido #${fila.id} marcado como ${accion}`);
    } catch (e) {
      await this.avisos.error(mensajeDeError(e));
    }
  }
}
