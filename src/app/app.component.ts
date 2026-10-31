import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonApp, IonButton, IonContent, IonIcon, IonItem, IonLabel, IonList, IonListHeader, IonMenu, IonMenuToggle,
  IonNote, IonRouterLink, IonRouterOutlet, IonSplitPane,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cubeOutline, cubeSharp, cartOutline, cartSharp, statsChartOutline, statsChartSharp, pulseOutline, pulseSharp,
  helpCircleOutline, helpCircleSharp, logOutOutline,
} from 'ionicons/icons';
import { AuthStore } from './core/auth/auth.store';
import { Permiso } from './core/auth/permisos';
import { HasPermissionDirective } from './core/directives/has-permission.directive';

/** Entrada del menú lateral: si tiene permiso, solo se pinta para quien lo posea. */
interface EntradaMenu {
  titulo: string;
  url: string;
  icono: string;
  permiso: Permiso | null;
}

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, RouterLinkActive, IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonListHeader, IonNote,
    IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterLink, IonRouterOutlet, IonButton, HasPermissionDirective,
    NgTemplateOutlet,
  ],
})
export class AppComponent {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly paginas: EntradaMenu[] = [
    { titulo: 'Cuadro de mando', url: '/dashboard', icono: 'stats-chart', permiso: 'dashboard:ver' },
    { titulo: 'Productos', url: '/productos', icono: 'cube', permiso: 'productos:ver' },
    { titulo: 'Pedidos', url: '/pedidos', icono: 'cart', permiso: null },
    { titulo: 'Actividad en tiempo real', url: '/actividad', icono: 'pulse', permiso: 'actividad:ver' },
    { titulo: 'Ayuda', url: '/ayuda', icono: 'help-circle', permiso: null },
  ];

  constructor() {
    addIcons({
      cubeOutline, cubeSharp, cartOutline, cartSharp, statsChartOutline, statsChartSharp, pulseOutline, pulseSharp,
      helpCircleOutline, helpCircleSharp, logOutOutline,
    });
  }

  async cerrarSesion(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/login'], { replaceUrl: true });
  }
}
