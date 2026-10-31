import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import {
  IonBadge, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonMenuButton, IonNote, IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addCircleOutline, cartOutline, warningOutline } from 'ionicons/icons';
import { DocumentoActividad } from '../../core/models';
import { ActividadStore } from '../../core/state/actividad.store';
import { euros, fecha } from '../../shared/formato';

/** Feed de actividad en tiempo real (Supabase Realtime sobre la colección de documentos `actividad`). */
@Component({
  selector: 'app-actividad',
  templateUrl: './actividad.page.html',
  styleUrls: ['./actividad.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonList, IonItem, IonIcon, IonLabel,
    IonNote, IonBadge,
  ],
})
export class ActividadPage implements OnInit, OnDestroy {
  protected readonly store = inject(ActividadStore);
  protected readonly fecha = fecha;

  constructor() {
    addIcons({ cartOutline, warningOutline, addCircleOutline });
  }

  ngOnInit(): void {
    void this.store.conectar();
  }

  /** Cierra la suscripción al salir: sin esto el WebSocket seguiría abierto (fuga de memoria). */
  ngOnDestroy(): void {
    void this.store.desconectar();
  }

  protected icono(doc: DocumentoActividad): string {
    return doc.tipo === 'pedido_nuevo' ? 'cart-outline' : doc.tipo === 'stock_bajo' ? 'warning-outline' : 'add-circle-outline';
  }

  /** Cada tipo de documento tiene campos distintos (sin esquema fijo): se interpreta según `tipo`. */
  protected texto(doc: DocumentoActividad): string {
    const d = doc.datos;
    switch (doc.tipo) {
      case 'pedido_nuevo':
        return `${d['usuario']} ha pedido ${d['cantidad']} × ${d['producto']} (${euros(d['total'] as number)})`;
      case 'stock_bajo':
        return `Stock bajo: ${d['producto']} (${d['sku']}) solo tiene ${d['stock']} unidades`;
      case 'producto_nuevo':
        return `Nuevo producto en catálogo: ${d['producto']} (${d['sku']})`;
      default:
        return JSON.stringify(d);
    }
  }
}
