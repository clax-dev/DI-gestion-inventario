import {
  afterRenderEffect, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, input, viewChild,
} from '@angular/core';
import {
  ArcElement, BarController, BarElement, CategoryScale, Chart, ChartData, ChartType, DoughnutController, Legend,
  LinearScale, LineController, LineElement, PointElement, Tooltip,
} from 'chart.js';

// Registro explícito de lo que se usa (tree-shaking: bundle más pequeño que 'chart.js/auto')
Chart.register(
  BarController, BarElement, DoughnutController, ArcElement, LineController, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Legend,
);

/**
 * Envoltorio reutilizable de Chart.js.
 * - Recibe tipo, datos y descripción accesible por input().
 * - afterRenderEffect(): tras pintar, y cada vez que cambian los datos actualiza el gráfico sin recrearlo.
 * - DestroyRef: destruye la instancia al salir de la vista (evita fugas de memoria).
 */
@Component({
  selector: 'app-grafico',
  template: `
    <figure>
      <figcaption>{{ titulo() }}</figcaption>
      <div class="lienzo"><canvas #lienzo role="img" [attr.aria-label]="descripcion()"></canvas></div>
    </figure>
  `,
  styles: [`
    figure { margin: 0; padding: 16px; border-radius: 12px; background: var(--ion-background-color-step-50, #f4f5f8); }
    figcaption { font-weight: 600; margin-bottom: 8px; }
    .lienzo { position: relative; height: 260px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraficoComponent {
  readonly tipo = input.required<ChartType>();
  readonly datos = input.required<ChartData>();
  readonly titulo = input.required<string>();
  /** Texto alternativo que leen los lectores de pantalla (resumen de los datos). */
  readonly descripcion = input.required<string>();

  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private grafico: Chart | null = null;

  constructor() {
    afterRenderEffect(() => {
      const datos = this.datos();
      if (!this.grafico) {
        // Textos y ejes con el color de texto del tema (claro u oscuro) para mantener el contraste
        const estilos = getComputedStyle(this.lienzo().nativeElement);
        Chart.defaults.color = estilos.getPropertyValue('--ion-text-color').trim() || '#1b1b1b';
        Chart.defaults.borderColor = estilos.getPropertyValue('--ion-background-color-step-150').trim() || '#d9d9d9';
        this.grafico = new Chart(this.lienzo().nativeElement, {
          type: this.tipo(),
          data: structuredClone(datos),
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? false : undefined,
            plugins: { legend: { position: 'bottom' } },
          },
        });
      } else {
        this.grafico.data = structuredClone(datos);
        this.grafico.update();
      }
    });
    inject(DestroyRef).onDestroy(() => this.grafico?.destroy());
  }
}
