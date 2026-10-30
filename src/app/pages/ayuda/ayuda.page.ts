import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  IonAccordion, IonAccordionGroup, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonMenuButton, IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { AuthStore } from '../../core/auth/auth.store';
import { Permiso } from '../../core/auth/permisos';

interface SeccionAyuda {
  id: string;
  titulo: string;
  pasos: string[];
  /** Si tiene permiso, solo se muestra a quien lo posea (ayuda contextual según rol). */
  permiso?: Permiso;
}

/** Manual de usuario integrado en la app: muestra solo las secciones que aplican al rol del usuario. */
@Component({
  selector: 'app-ayuda',
  templateUrl: './ayuda.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonAccordionGroup, IonAccordion, IonItem,
    IonLabel,
  ],
})
export class AyudaPage {
  private readonly auth = inject(AuthStore);

  private readonly secciones: SeccionAyuda[] = [
    {
      id: 'acceso', titulo: 'Iniciar y cerrar sesión', pasos: [
        'Escribe tu correo y tu contraseña y pulsa «Entrar».',
        'Si intentabas abrir una página concreta, al entrar volverás a ella automáticamente.',
        'Para salir, abre el menú lateral y pulsa «Cerrar sesión».',
      ],
    },
    {
      id: 'navegar', titulo: 'Moverse por la aplicación', pasos: [
        'En el móvil, abre el menú con el botón ☰ de la esquina superior izquierda; en pantallas grandes está siempre visible.',
        'Con teclado: Tab avanza, Mayús+Tab retrocede, Enter o Espacio activan botones. El primer Tab muestra «Saltar al contenido principal».',
        'Solo verás en el menú las pantallas a las que tienes acceso.',
      ],
    },
    {
      id: 'catalogo', titulo: 'Consultar el catálogo', pasos: [
        'En «Productos» verás todos los artículos con su precio y stock.',
        'Usa el buscador para filtrar por cualquier dato (nombre, SKU, categoría…).',
        'Pulsa el título de una columna para ordenar; vuelve a pulsarlo para invertir el orden.',
        'Desliza hacia abajo para actualizar la lista.',
      ],
    },
    {
      id: 'pedir', titulo: 'Hacer un pedido', permiso: 'pedidos:crear', pasos: [
        'Pulsa «Pedir» junto a un producto o ve a «Pedidos».',
        'Elige el producto y la cantidad; verás el total estimado antes de confirmar.',
        'Pulsa «Confirmar pedido». El stock se descuenta al momento y el pedido aparece en tu lista como «pendiente».',
        'Solo ves tus propios pedidos.',
      ],
    },
    {
      id: 'productos', titulo: 'Gestionar productos', permiso: 'productos:crear', pasos: [
        'En «Productos» pulsa «Nuevo producto» para dar de alta un artículo.',
        'El SKU debe tener el formato ABC-123 y no repetirse: la app lo comprueba mientras escribes.',
        'Pulsa «Editar» o «Borrar» en la fila de un producto. No se puede borrar un producto que tenga pedidos.',
        'Si sales de un formulario con cambios sin guardar, la app te pedirá confirmación.',
      ],
    },
    {
      id: 'gestion-pedidos', titulo: 'Gestionar pedidos', permiso: 'pedidos:ver_todos', pasos: [
        'En «Pedidos» ves los pedidos de todos los clientes.',
        'Usa «Enviar» o «Cancelar» para cambiar su estado.',
      ],
    },
    {
      id: 'dashboard', titulo: 'Cuadro de mando e informes', permiso: 'dashboard:ver', pasos: [
        'El cuadro de mando resume el inventario y las ventas con tarjetas y gráficos.',
        'Filtra por categoría o pulsa una tarjeta («Stock bajo», «Pendientes») para filtrar todo el panel.',
        'Los datos se actualizan solos cuando entra un pedido nuevo.',
        'En «Informes» descarga inventario o pedidos en PDF o CSV (se exporta lo que estás filtrando).',
      ],
    },
    {
      id: 'actividad', titulo: 'Actividad en tiempo real', permiso: 'actividad:ver', pasos: [
        'Muestra al instante cada pedido nuevo, cada producto creado y los avisos de stock bajo.',
        'El indicador de estado muestra si la conexión en tiempo real está activa.',
      ],
    },
  ];

  protected readonly visibles = computed(() =>
    this.secciones.filter(s => !s.permiso || this.auth.can(s.permiso)));

  protected readonly rol = computed(() => (this.auth.rol() === 'admin' ? 'administrador' : 'usuario estándar'));
}
