import { Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthStore } from '../auth/auth.store';
import { Permiso } from '../auth/permisos';

/**
 * Directiva estructural de UI condicional: solo crea el elemento si el usuario tiene el permiso.
 *
 *   <ion-button *hasPermission="'informes:exportar'">Exportar PDF</ion-button>
 *
 * El elemento se elimina del DOM (y del árbol de accesibilidad), no se oculta con CSS.
 * Ocultar NO es seguridad: la protección real la dan los guards y RLS en el servidor.
 */
@Directive({ selector: '[hasPermission]' })
export class HasPermissionDirective {
  /** Permiso necesario para mostrar el elemento. */
  readonly hasPermission = input.required<Permiso>();

  private readonly plantilla = inject(TemplateRef);
  private readonly contenedor = inject(ViewContainerRef);
  private readonly auth = inject(AuthStore);
  private visible = false;

  constructor() {
    // Se re-ejecuta solo cuando cambian los permisos (signal) o el input
    effect(() => {
      const debeVerse = this.auth.can(this.hasPermission());
      if (debeVerse && !this.visible) {
        this.contenedor.createEmbeddedView(this.plantilla);
      } else if (!debeVerse && this.visible) {
        this.contenedor.clear();
      }
      this.visible = debeVerse;
    });
  }
}
