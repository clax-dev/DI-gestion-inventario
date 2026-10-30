import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonButtons, IonContent, IonHeader, IonMenuButton, IonTitle, IonToolbar } from '@ionic/angular';

/** Catálogo de productos (se completa en feature/productos-pedidos). */
@Component({
  selector: 'app-productos',
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start"><ion-menu-button></ion-menu-button></ion-buttons>
        <ion-title>Productos</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding"><h1>Catálogo</h1></ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent],
})
export class ProductosPage {}
