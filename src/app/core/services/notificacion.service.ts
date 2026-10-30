import { inject, Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';

/** Avisos breves (toasts) para toda la app. Los toasts de Ionic se anuncian a los lectores de pantalla. */
@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private readonly toast = inject(ToastController);

  exito(mensaje: string): Promise<void> {
    return this.mostrar(mensaje, 'success');
  }

  error(mensaje: string): Promise<void> {
    return this.mostrar(mensaje, 'danger');
  }

  private async mostrar(message: string, color: 'success' | 'danger'): Promise<void> {
    const t = await this.toast.create({ message, color, duration: 3000, position: 'top', buttons: [{ text: 'Cerrar', role: 'cancel' }] });
    await t.present();
  }
}
