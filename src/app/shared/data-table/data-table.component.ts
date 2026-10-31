import { ChangeDetectionStrategy, Component, computed, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonIcon, IonSearchbar, IonSkeletonText } from '@ionic/angular';

/** Definición de una columna de la tabla. */
export interface Columna<T> {
  /** Propiedad de la fila que se muestra y por la que se ordena. */
  clave: keyof T & string;
  titulo: string;
  /** Formateo opcional del valor (moneda, fechas…). */
  formato?: (fila: T) => string;
  /** Alinear a la derecha (números). */
  numerica?: boolean;
}

/** Botón de acción que se muestra en cada fila. El padre decide qué acciones pasa (según permisos). */
export interface AccionFila {
  id: string;
  etiqueta: string;
  icono: string;
  color?: string;
}

/** Evento que emite la tabla al pulsar una acción. */
export interface EventoAccion<T> {
  accion: string;
  fila: T;
}

/**
 * Tabla de datos avanzada y reutilizable (componente "tonto" / presentacional):
 * - Recibe columnas, filas y acciones por input() y NO sabe de dónde vienen los datos.
 * - Notifica al padre con output() (accion) y admite búsqueda bidireccional con model() → [(busqueda)].
 * - Buscador en todas las columnas, ordenación por cabecera y diseño de tarjetas en móvil.
 */
@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IonSearchbar, IonButton, IonIcon, IonSkeletonText],
})
export class DataTableComponent<T extends { id: number }> {
  readonly columnas = input.required<Columna<T>[]>();
  readonly filas = input.required<T[]>();
  /** Título accesible de la tabla (se usa como <caption>). */
  readonly titulo = input.required<string>();
  readonly acciones = input<AccionFila[]>([]);
  readonly cargando = input(false);
  readonly textoVacio = input('No hay datos que mostrar.');

  /** Texto del buscador: two-way binding con el padre si lo desea ([(busqueda)]). */
  readonly busqueda = model('');

  /** Se emite al pulsar un botón de acción de una fila. */
  readonly accion = output<EventoAccion<T>>();

  protected readonly orden = signal<{ clave: keyof T & string; asc: boolean } | null>(null);

  /** Filas filtradas y ordenadas: computed → solo se recalcula si cambian filas, búsqueda u orden. */
  protected readonly visibles = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    let resultado = this.filas();
    if (texto) {
      resultado = resultado.filter(fila =>
        this.columnas().some(c => this.valor(fila, c).toLowerCase().includes(texto)));
    }
    const orden = this.orden();
    if (orden) {
      resultado = [...resultado].sort((a, b) => {
        const va = a[orden.clave] as unknown;
        const vb = b[orden.clave] as unknown;
        const cmp = typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb), 'es', { numeric: true });
        return orden.asc ? cmp : -cmp;
      });
    }
    return resultado;
  });

  protected valor(fila: T, columna: Columna<T>): string {
    return columna.formato ? columna.formato(fila) : String(fila[columna.clave] ?? '');
  }

  protected ordenarPor(clave: keyof T & string): void {
    const actual = this.orden();
    this.orden.set({ clave, asc: actual?.clave === clave ? !actual.asc : true });
  }

  protected ariaSort(clave: string): 'ascending' | 'descending' | 'none' {
    const o = this.orden();
    return o?.clave === clave ? (o.asc ? 'ascending' : 'descending') : 'none';
  }

  protected pulsar(accion: AccionFila, fila: T): void {
    this.accion.emit({ accion: accion.id, fila });
  }
}
