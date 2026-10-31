import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { AlertController } from '@ionic/angular';

/** Contrato que implementan las páginas con formularios que pueden tener cambios sin guardar. */
export interface ConCambiosPendientes {
  tieneCambiosSinGuardar(): boolean;
}

/** Guard funcional canDeactivate: pide confirmación antes de abandonar un formulario modificado. */
export const unsavedChangesGuard: CanDeactivateFn<ConCambiosPendientes> = async (componente) => {
  if (!componente.tieneCambiosSinGuardar()) {
    return true;
  }
  const alert = await inject(AlertController).create({
    header: 'Cambios sin guardar',
    message: '¿Seguro que quieres salir? Se perderán los cambios.',
    buttons: [
      { text: 'Seguir editando', role: 'cancel' },
      { text: 'Salir', role: 'confirm' },
    ],
  });
  await alert.present();
  const { role } = await alert.onDidDismiss();
  return role === 'confirm';
};
