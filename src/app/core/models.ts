/** Fila de la tabla `productos`. */
export interface Producto {
  id: number;
  sku: string;
  nombre: string;
  categoria: string;
  precio: number;
  stock: number;
  creado_en: string;
}

/** Datos que se envían al crear o editar un producto. */
export type ProductoNuevo = Pick<Producto, 'sku' | 'nombre' | 'categoria' | 'precio' | 'stock'>;

export type EstadoPedido = 'pendiente' | 'enviado' | 'cancelado';

/** Fila de `pedidos` con sus relaciones embebidas (producto y usuario) devueltas por la API REST. */
export interface Pedido {
  id: number;
  usuario_id: string;
  producto_id: number;
  cantidad: number;
  total: number;
  estado: EstadoPedido;
  creado_en: string;
  producto?: { nombre: string; sku: string; categoria: string } | null;
  usuario?: { nombre: string; email: string } | null;
}

/** Documento de la colección en tiempo real `actividad` (columna jsonb sin esquema fijo). */
export interface DocumentoActividad {
  id: number;
  tipo: 'pedido_nuevo' | 'stock_bajo' | 'producto_nuevo' | string;
  datos: Record<string, unknown>;
  creado_en: string;
}
