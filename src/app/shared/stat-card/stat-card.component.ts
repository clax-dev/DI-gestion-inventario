import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonIcon } from '@ionic/angular';

/**
 * Widget estadístico reutilizable: muestra una métrica y avisa al padre al pulsarlo.
 * Es un <button> real → accesible con teclado y lector de pantalla (aria-pressed indica si está activo).
 *
 *   <app-stat-card titulo="Pedidos" [valor]="12" icono="cart" [activo]="filtro() === 'pedidos'"
 *                  (seleccionar)="filtro.set('pedidos')" />
 */
@Component({
  selector: 'app-stat-card',
  templateUrl: './stat-card.component.html',
  styleUrls: ['./stat-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon],
})
export class StatCardComponent {
  readonly titulo = input.required<string>();
  readonly valor = input.required<string | number>();
  readonly icono = input('analytics');
  readonly color = input<'primary' | 'success' | 'warning' | 'danger' | 'tertiary'>('primary');
  readonly detalle = input('');
  readonly activo = input(false);

  /** Se emite cuando el usuario pulsa la tarjeta. */
  readonly seleccionar = output<void>();
}
