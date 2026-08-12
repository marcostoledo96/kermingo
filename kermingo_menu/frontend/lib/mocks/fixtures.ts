import type {
  ApiComponente,
  ApiConfiguracion,
  ApiCocinaPedido,
  ApiPedido,
  ApiPedidoListItem,
  ApiProducto,
  ApiReportes,
} from '../types'

const ARCHIVAL_MESSAGE =
  'Kermingo 2026 finalizó. Este sitio es un portfolio en modo demo: los pedidos y cambios no se guardan.'

function productImage(id: number): string {
  return `/products/${id}.png`
}

type SeedProduct = {
  id: number
  nombre: string
  descripcion: string
  precio: number
  tipo: 'comida' | 'bebida' | 'promo'
  stock_limitado: 0 | 1
  stock_actual: number | null
  stock_minimo_alerta: number
  categorias: string
  componentes_count?: number
}

const SEED: SeedProduct[] = [
  { id: 1, nombre: 'Pizza muzza', descripcion: 'Porción de muzzarella bien tirada con orégano.', precio: 3500, tipo: 'comida', stock_limitado: 1, stock_actual: 30, stock_minimo_alerta: 5, categorias: 'Cena' },
  { id: 2, nombre: 'Pizza napolitana', descripcion: 'Muzza, tomate en rodajas y ajo.', precio: 3800, tipo: 'comida', stock_limitado: 1, stock_actual: 20, stock_minimo_alerta: 5, categorias: 'Cena' },
  { id: 3, nombre: 'Pizza jamón', descripcion: 'Muzza con jamón cocido.', precio: 3900, tipo: 'comida', stock_limitado: 1, stock_actual: 15, stock_minimo_alerta: 3, categorias: 'Cena' },
  { id: 4, nombre: 'Pizza sin TACC', descripcion: 'Masa apta celíacos. Cantidad limitada.', precio: 4200, tipo: 'comida', stock_limitado: 1, stock_actual: 0, stock_minimo_alerta: 2, categorias: 'Cena' },
  { id: 5, nombre: 'Pancho', descripcion: 'Pancho completo con aderezos a elección.', precio: 2500, tipo: 'comida', stock_limitado: 1, stock_actual: 40, stock_minimo_alerta: 5, categorias: 'Cena' },
  { id: 6, nombre: 'Nuggets', descripcion: 'Porción de 6 con papas.', precio: 3000, tipo: 'comida', stock_limitado: 1, stock_actual: 20, stock_minimo_alerta: 5, categorias: 'Cena' },
  { id: 7, nombre: 'Nuggets veggies', descripcion: 'Opción vegetariana, porción de 6.', precio: 3200, tipo: 'comida', stock_limitado: 1, stock_actual: 12, stock_minimo_alerta: 3, categorias: 'Cena' },
  { id: 8, nombre: 'Chocotorta', descripcion: 'Porción clásica de chocolinas y dulce de leche.', precio: 2500, tipo: 'comida', stock_limitado: 1, stock_actual: 20, stock_minimo_alerta: 3, categorias: 'Merienda' },
  { id: 9, nombre: 'Torta frita', descripcion: 'Recién hechas, ideales con mate.', precio: 1000, tipo: 'comida', stock_limitado: 1, stock_actual: 30, stock_minimo_alerta: 5, categorias: 'Merienda' },
  { id: 10, nombre: 'Medialunas', descripcion: 'Par de medialunas de manteca.', precio: 1600, tipo: 'comida', stock_limitado: 1, stock_actual: 25, stock_minimo_alerta: 3, categorias: 'Merienda' },
  { id: 11, nombre: 'Medialunas J&Q', descripcion: 'Rellenas con jamón y queso, calentitas.', precio: 2200, tipo: 'comida', stock_limitado: 1, stock_actual: 15, stock_minimo_alerta: 3, categorias: 'Merienda' },
  { id: 12, nombre: 'Churros', descripcion: 'Rellenos de dulce de leche.', precio: 1500, tipo: 'comida', stock_limitado: 1, stock_actual: 20, stock_minimo_alerta: 3, categorias: 'Merienda' },
  { id: 13, nombre: 'Tortas varias', descripcion: 'Porción del día, consultá los sabores.', precio: 2500, tipo: 'comida', stock_limitado: 1, stock_actual: 12, stock_minimo_alerta: 2, categorias: 'Merienda' },
  { id: 14, nombre: 'Helados palito', descripcion: 'Variedad de gustos. Sujeto a disponibilidad.', precio: 2000, tipo: 'comida', stock_limitado: 1, stock_actual: 0, stock_minimo_alerta: 3, categorias: 'Merienda,Cena' },
  { id: 15, nombre: 'Coca Cola', descripcion: 'Lata 354 ml bien fría.', precio: 2000, tipo: 'bebida', stock_limitado: 1, stock_actual: 60, stock_minimo_alerta: 5, categorias: 'Merienda,Cena' },
  { id: 16, nombre: 'Gaseosa naranja', descripcion: 'Lata 354 ml.', precio: 1900, tipo: 'bebida', stock_limitado: 1, stock_actual: 30, stock_minimo_alerta: 5, categorias: 'Merienda,Cena' },
  { id: 17, nombre: 'Lima limón', descripcion: 'Lata 354 ml.', precio: 1900, tipo: 'bebida', stock_limitado: 1, stock_actual: 20, stock_minimo_alerta: 5, categorias: 'Merienda,Cena' },
  { id: 18, nombre: 'Agua mineral', descripcion: 'Botella 500 ml, con o sin gas.', precio: 1500, tipo: 'bebida', stock_limitado: 0, stock_actual: null, stock_minimo_alerta: 0, categorias: 'Merienda,Cena' },
  { id: 19, nombre: 'Mate cocido', descripcion: 'Calentito, servido en vaso.', precio: 1200, tipo: 'bebida', stock_limitado: 0, stock_actual: null, stock_minimo_alerta: 0, categorias: 'Merienda' },
  { id: 20, nombre: 'Té', descripcion: 'Variedad de saquitos.', precio: 1000, tipo: 'bebida', stock_limitado: 0, stock_actual: null, stock_minimo_alerta: 0, categorias: 'Merienda' },
  { id: 21, nombre: 'Café', descripcion: 'Café de filtro recién hecho.', precio: 1500, tipo: 'bebida', stock_limitado: 1, stock_actual: 40, stock_minimo_alerta: 5, categorias: 'Merienda' },
  { id: 22, nombre: 'Chocolatada', descripcion: 'Bien chocolatosa, fría o caliente.', precio: 1800, tipo: 'bebida', stock_limitado: 1, stock_actual: 30, stock_minimo_alerta: 5, categorias: 'Merienda' },
  { id: 23, nombre: 'Combo merienda', descripcion: '3 medialunas + café o mate cocido.', precio: 3500, tipo: 'promo', stock_limitado: 0, stock_actual: null, stock_minimo_alerta: 0, categorias: 'Merienda', componentes_count: 2 },
  { id: 24, nombre: 'Combo cena', descripcion: 'Pancho + porción de pizza + gaseosa.', precio: 6500, tipo: 'promo', stock_limitado: 0, stock_actual: null, stock_minimo_alerta: 0, categorias: 'Cena', componentes_count: 3 },
]

export function toApiProducto(p: SeedProduct): ApiProducto {
  return {
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion,
    precio: p.precio,
    tipo: p.tipo,
    stock_limitado: p.stock_limitado,
    stock_actual: p.stock_actual,
    stock_minimo_alerta: p.stock_minimo_alerta,
    activo: 1,
    disponible: 1,
    orden: p.id,
    imagen_archivo_id: p.id,
    imagen_nombre_original: `${p.id}.png`,
    imagen_mime_type: 'image/png',
    imagen_tamanio_bytes: 100000,
    imagen_url: productImage(p.id),
    categorias: p.categorias,
    componentes_count: p.componentes_count,
  }
}

export const MOCK_PRODUCTOS: ApiProducto[] = SEED.map(toApiProducto)

export const MOCK_CONFIG: ApiConfiguracion = {
  id: 1,
  estado: 'cerrada',
  mensaje_publico: ARCHIVAL_MESSAGE,
  cena_habilitada_desde: null,
  categoria_default: 'merienda',
}

export const MOCK_COMPONENTES: Record<number, ApiComponente[]> = {
  23: [
    { producto_id: 10, nombre: 'Medialunas', cantidad: 3, activo: 1, disponible: 1, stock_limitado: 1, stock_actual: 25 },
    { producto_id: 21, nombre: 'Café', cantidad: 1, activo: 1, disponible: 1, stock_limitado: 1, stock_actual: 40 },
  ],
  24: [
    { producto_id: 5, nombre: 'Pancho', cantidad: 1, activo: 1, disponible: 1, stock_limitado: 1, stock_actual: 40 },
    { producto_id: 1, nombre: 'Pizza muzza', cantidad: 1, activo: 1, disponible: 1, stock_limitado: 1, stock_actual: 30 },
    { producto_id: 15, nombre: 'Coca Cola', cantidad: 1, activo: 1, disponible: 1, stock_limitado: 1, stock_actual: 60 },
  ],
}

function buildPedido(
  partial: Omit<ApiPedido, 'items' | 'updated_at'> & { items: ApiPedido['items']; updated_at?: string },
): ApiPedido {
  return {
    ...partial,
    updated_at: partial.updated_at ?? partial.created_at,
  }
}

export const MOCK_PEDIDOS: ApiPedido[] = [
  buildPedido({
    id: 1,
    numero: 'KMG-0001',
    token_seguimiento: 'demodemo000000000000000000000001',
    origen: 'online',
    nombre_cliente: 'Cliente Demo 1',
    mesa: 'Mesa 3',
    telefono_cliente: '1199001001',
    telefono_whatsapp: '5491199001001',
    estado_pedido: 'entregado',
    estado_pago: 'pagado',
    metodo_pago: 'transferencia',
    total: 7000,
    observaciones: null,
    comprobante_archivo_id: 2,
    created_at: '2026-06-20T12:10:00.000Z',
    items: [
      {
        producto_id: 1,
        nombre_producto: 'Pizza muzza',
        precio_unitario: 3500,
        cantidad: 2,
        subtotal: 7000,
        imagen_url: productImage(1),
      },
    ],
  }),
  buildPedido({
    id: 2,
    numero: 'KMG-0002',
    token_seguimiento: 'demodemo000000000000000000000002',
    origen: 'caja',
    nombre_cliente: 'Cliente Demo 2',
    mesa: 'Mesa 7',
    telefono_cliente: '1199001002',
    telefono_whatsapp: '5491199001002',
    estado_pedido: 'entregado',
    estado_pago: 'pagado',
    metodo_pago: 'efectivo',
    total: 2500,
    observaciones: 'Sin cebolla',
    comprobante_archivo_id: null,
    created_at: '2026-06-20T12:25:00.000Z',
    items: [
      {
        producto_id: 5,
        nombre_producto: 'Pancho',
        precio_unitario: 2500,
        cantidad: 1,
        subtotal: 2500,
        imagen_url: productImage(5),
      },
    ],
  }),
  buildPedido({
    id: 3,
    numero: 'KMG-0003',
    token_seguimiento: 'demodemo000000000000000000000003',
    origen: 'online',
    nombre_cliente: 'Cliente Demo 3',
    mesa: null,
    telefono_cliente: '1199001003',
    telefono_whatsapp: '5491199001003',
    estado_pedido: 'recibido',
    estado_pago: 'comprobante_subido',
    metodo_pago: 'transferencia',
    total: 3500,
    observaciones: null,
    comprobante_archivo_id: 2,
    created_at: '2026-06-20T13:05:00.000Z',
    items: [
      {
        producto_id: 23,
        nombre_producto: 'Combo merienda',
        precio_unitario: 3500,
        cantidad: 1,
        subtotal: 3500,
        imagen_url: productImage(23),
      },
    ],
  }),
  buildPedido({
    id: 4,
    numero: 'KMG-0004',
    token_seguimiento: 'demodemo000000000000000000000004',
    origen: 'caja',
    nombre_cliente: 'Cliente Demo 4',
    mesa: 'Barra',
    telefono_cliente: '1199001004',
    telefono_whatsapp: '5491199001004',
    estado_pedido: 'en_preparacion',
    estado_pago: 'pagado',
    metodo_pago: 'efectivo',
    total: 6500,
    observaciones: null,
    comprobante_archivo_id: null,
    created_at: '2026-06-20T13:20:00.000Z',
    items: [
      {
        producto_id: 24,
        nombre_producto: 'Combo cena',
        precio_unitario: 6500,
        cantidad: 1,
        subtotal: 6500,
        imagen_url: productImage(24),
      },
    ],
  }),
  buildPedido({
    id: 5,
    numero: 'KMG-0005',
    token_seguimiento: 'demodemo000000000000000000000005',
    origen: 'online',
    nombre_cliente: 'Cliente Demo 5',
    mesa: 'Mesa 1',
    telefono_cliente: '1199001005',
    telefono_whatsapp: '5491199001005',
    estado_pedido: 'listo',
    estado_pago: 'pagado',
    metodo_pago: 'transferencia',
    total: 4000,
    observaciones: null,
    comprobante_archivo_id: 2,
    created_at: '2026-06-20T13:40:00.000Z',
    items: [
      {
        producto_id: 15,
        nombre_producto: 'Coca Cola',
        precio_unitario: 2000,
        cantidad: 2,
        subtotal: 4000,
        imagen_url: productImage(15),
      },
    ],
  }),
]

export function listPedidoItems(): ApiPedidoListItem[] {
  return MOCK_PEDIDOS.map(({ items: _items, ...rest }) => rest)
}

export function toCocinaHeaders(): ApiCocinaPedido[] {
  return MOCK_PEDIDOS.filter((p) =>
    ['recibido', 'en_preparacion', 'listo'].includes(p.estado_pedido),
  ).map((p) => ({
    id: p.id,
    numero: p.numero,
    nombre_cliente: p.nombre_cliente,
    mesa: p.mesa,
    estado_pedido: p.estado_pedido,
    estado_pago: p.estado_pago,
    observaciones: p.observaciones,
    total: p.total,
    created_at: p.created_at,
    cantidad_items: p.items.reduce((n, i) => n + i.cantidad, 0),
  }))
}

export const MOCK_REPORTES: ApiReportes = {
  total_recaudado: 20000,
  total_efectivo: 9000,
  total_transferencia: 11000,
  pedidos_pagados: 4,
  productos_vendidos: 6,
  pedidos_pendientes_pago: 0,
  monto_pendiente_pago: 0,
  producto_top: {
    producto_id: 1,
    nombre: 'Pizza muzza',
    cantidad: 2,
    total_recaudado: 7000,
  },
  ranking_productos: [
    { producto_id: 1, nombre: 'Pizza muzza', cantidad: 2, total_recaudado: 7000 },
    { producto_id: 15, nombre: 'Coca Cola', cantidad: 2, total_recaudado: 4000 },
    { producto_id: 5, nombre: 'Pancho', cantidad: 1, total_recaudado: 2500 },
    { producto_id: 24, nombre: 'Combo cena', cantidad: 1, total_recaudado: 6500 },
  ],
  actualizado_en: '2026-06-20T15:00:00.000Z',
}

export const DEMO_COMPROBANTE_META = {
  nombre_original: 'receipt-demo.png',
  mime_type: 'image/png',
  tamanio_bytes: 50000,
  url_publica: '/bank-transfer-confirmation.png',
  url_proxy: '/bank-transfer-confirmation.png',
  created_at: '2026-06-20T13:05:00.000Z',
}

export { ARCHIVAL_MESSAGE }
