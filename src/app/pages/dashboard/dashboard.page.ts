import { ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy, OnInit, signal, untracked } from '@angular/core';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonMenuButton, IonSelect, IonSelectOption, IonSpinner,
  IonText, IonTitle, IonToolbar,
} from '@ionic/angular';
import { ChartData } from 'chart.js';
import { addIcons } from 'ionicons';
import { cubeOutline, documentTextOutline, downloadOutline, hourglassOutline, trendingUpOutline, warningOutline } from 'ionicons/icons';
import { forkJoin } from 'rxjs';
import { mensajeDeError } from '../../core/api/error-api';
import { PedidosApi } from '../../core/api/pedidos.api';
import { ProductosApi } from '../../core/api/productos.api';
import { HasPermissionDirective } from '../../core/directives/has-permission.directive';
import { EstadoPedido, Pedido, Producto } from '../../core/models';
import { ColumnaInforme, ExportacionService } from '../../core/services/exportacion.service';
import { ActividadStore } from '../../core/state/actividad.store';
import { GraficoComponent } from '../../shared/grafico/grafico.component';
import { StatCardComponent } from '../../shared/stat-card/stat-card.component';
import { euros, fecha } from '../../shared/formato';

type FiltroRapido = 'ninguno' | 'stock_bajo' | 'pendientes';

/**
 * Cuadro de mando del administrador (ruta con canMatch → dashboard:ver).
 * - Carga CONCURRENTE de las dos fuentes SQL con forkJoin (espera a ambas, un solo spinner).
 * - Filtros reactivos: todo lo derivado son computed, así gráficos y tarjetas se recalculan al instante.
 * - Se recarga solo cuando llega un documento de actividad en tiempo real.
 */
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonSelect, IonSelectOption, IonButton,
    IonIcon, IonSpinner, IonText, StatCardComponent, GraficoComponent, HasPermissionDirective,
  ],
})
export class DashboardPage implements OnInit, OnDestroy {
  private readonly productosApi = inject(ProductosApi);
  private readonly pedidosApi = inject(PedidosApi);
  private readonly exportar = inject(ExportacionService);
  protected readonly actividad = inject(ActividadStore);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  private readonly productos = signal<Producto[]>([]);
  private readonly pedidos = signal<Pedido[]>([]);

  // ---- Filtros ----
  protected readonly categoria = signal('todas');
  protected readonly filtroRapido = signal<FiltroRapido>('ninguno');

  protected readonly categorias = computed(() => [...new Set(this.productos().map(p => p.categoria))].sort());

  protected readonly productosFiltrados = computed(() => {
    const cat = this.categoria();
    let lista = this.productos().filter(p => cat === 'todas' || p.categoria === cat);
    if (this.filtroRapido() === 'stock_bajo') lista = lista.filter(p => p.stock < 5);
    return lista;
  });

  protected readonly pedidosFiltrados = computed(() => {
    const cat = this.categoria();
    let lista = this.pedidos().filter(p => cat === 'todas' || p.producto?.categoria === cat);
    if (this.filtroRapido() === 'pendientes') lista = lista.filter(p => p.estado === 'pendiente');
    return lista;
  });

  // ---- Métricas (tarjetas) ----
  protected readonly valorInventario = computed(() =>
    euros(this.productosFiltrados().reduce((s, p) => s + p.precio * p.stock, 0)));
  protected readonly numStockBajo = computed(() =>
    this.productos().filter(p => (this.categoria() === 'todas' || p.categoria === this.categoria()) && p.stock < 5).length);
  protected readonly numPendientes = computed(() =>
    this.pedidos().filter(p => (this.categoria() === 'todas' || p.producto?.categoria === this.categoria()) && p.estado === 'pendiente').length);
  protected readonly ingresos = computed(() =>
    euros(this.pedidosFiltrados().filter(p => p.estado !== 'cancelado').reduce((s, p) => s + Number(p.total), 0)));

  // ---- Datos de los gráficos ----
  protected readonly datosStock = computed<ChartData>(() => {
    const porCategoria = new Map<string, number>();
    for (const p of this.productosFiltrados()) porCategoria.set(p.categoria, (porCategoria.get(p.categoria) ?? 0) + p.stock);
    return {
      labels: [...porCategoria.keys()],
      datasets: [{ label: 'Unidades en stock', data: [...porCategoria.values()], backgroundColor: '#1d5fa8' }],
    };
  });

  protected readonly datosEstados = computed<ChartData>(() => {
    const estados: EstadoPedido[] = ['pendiente', 'enviado', 'cancelado'];
    return {
      labels: ['Pendientes', 'Enviados', 'Cancelados'],
      datasets: [{
        label: 'Pedidos',
        data: estados.map(e => this.pedidosFiltrados().filter(p => p.estado === e).length),
        backgroundColor: ['#b26a00', '#1e7b34', '#b3261e'],
      }],
    };
  });

  protected readonly datosIngresos = computed<ChartData>(() => {
    const dias = [...Array(14)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return d.toISOString().slice(0, 10);
    });
    const porDia = new Map(dias.map(d => [d, 0]));
    for (const p of this.pedidosFiltrados()) {
      const dia = p.creado_en.slice(0, 10);
      if (porDia.has(dia) && p.estado !== 'cancelado') porDia.set(dia, porDia.get(dia)! + Number(p.total));
    }
    return {
      labels: dias.map(d => d.slice(8, 10) + '/' + d.slice(5, 7)),
      datasets: [{ label: 'Ingresos (€)', data: [...porDia.values()], borderColor: '#5b3fa8', backgroundColor: '#5b3fa8', tension: 0.3 }],
    };
  });

  /** Resúmenes en texto de los gráficos para lectores de pantalla. */
  protected readonly descStock = computed(() =>
    'Stock por categoría: ' + this.datosStock().labels!.map((l, i) => `${l} ${this.datosStock().datasets[0].data[i]} unidades`).join(', '));
  protected readonly descEstados = computed(() =>
    'Pedidos por estado: ' + this.datosEstados().labels!.map((l, i) => `${l} ${this.datosEstados().datasets[0].data[i]}`).join(', '));
  protected readonly descIngresos = computed(() => `Ingresos de los últimos 14 días: ${this.ingresos()} en total`);

  constructor() {
    addIcons({ cubeOutline, warningOutline, hourglassOutline, trendingUpOutline, downloadOutline, documentTextOutline });
    // Tiempo real: cada nuevo pedido o aviso de stock recarga las métricas
    let primerDocumento = true; // el primero es el historial ya cargado, no un cambio nuevo
    effect(() => {
      const doc = this.actividad.ultimo();
      if (!doc) return;
      if (primerDocumento) {
        primerDocumento = false;
        return;
      }
      if (doc.tipo === 'pedido_nuevo' || doc.tipo === 'stock_bajo') untracked(() => this.cargar(false));
    });
  }

  ngOnInit(): void {
    this.cargar(true);
    void this.actividad.conectar();
  }

  ngOnDestroy(): void {
    void this.actividad.desconectar();
  }

  /** forkJoin: lanza las dos peticiones a la vez y emite cuando terminan ambas. */
  protected cargar(conSpinner: boolean): void {
    if (conSpinner) this.cargando.set(true);
    forkJoin({ productos: this.productosApi.listar(), pedidos: this.pedidosApi.listar() }).subscribe({
      next: ({ productos, pedidos }) => {
        this.productos.set(productos);
        this.pedidos.set(pedidos);
        this.error.set(null);
        this.cargando.set(false);
      },
      error: e => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  protected alternarFiltro(filtro: FiltroRapido): void {
    this.filtroRapido.update(actual => (actual === filtro ? 'ninguno' : filtro));
  }

  // ---- Exportación ----
  private readonly colsProductos: ColumnaInforme<Producto>[] = [
    { titulo: 'SKU', valor: p => p.sku },
    { titulo: 'Producto', valor: p => p.nombre },
    { titulo: 'Categoría', valor: p => p.categoria },
    { titulo: 'Precio', valor: p => euros(p.precio) },
    { titulo: 'Stock', valor: p => p.stock },
    { titulo: 'Valor', valor: p => euros(p.precio * p.stock) },
  ];

  private readonly colsPedidos: ColumnaInforme<Pedido>[] = [
    { titulo: 'Nº', valor: p => p.id },
    { titulo: 'Fecha', valor: p => fecha(p.creado_en) },
    { titulo: 'Cliente', valor: p => p.usuario?.nombre ?? '' },
    { titulo: 'Producto', valor: p => p.producto?.nombre ?? '' },
    { titulo: 'Uds.', valor: p => p.cantidad },
    { titulo: 'Total', valor: p => euros(p.total) },
    { titulo: 'Estado', valor: p => p.estado },
  ];

  protected exportarInventario(formato: 'pdf' | 'csv'): void {
    const filas = this.productosFiltrados();
    if (formato === 'csv') {
      this.exportar.csv('inventario', this.colsProductos, filas);
    } else {
      void this.exportar.pdf('inventario', 'Informe de inventario', this.colsProductos, filas, [
        `Categoría: ${this.categoria()} · ${filas.length} productos · Valor total: ${this.valorInventario()}`,
      ]);
    }
  }

  protected exportarPedidos(formato: 'pdf' | 'csv'): void {
    const filas = this.pedidosFiltrados();
    if (formato === 'csv') {
      this.exportar.csv('pedidos', this.colsPedidos, filas);
    } else {
      void this.exportar.pdf('pedidos', 'Informe de pedidos', this.colsPedidos, filas, [
        `Categoría: ${this.categoria()} · ${filas.length} pedidos · Ingresos: ${this.ingresos()}`,
      ]);
    }
  }
}
