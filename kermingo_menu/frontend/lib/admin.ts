import type {
  ApiCocinaPedido,
  ApiItem,
  ApiPedido,
  ApiPedidoListItem,
  ApiProducto,
} from './types'
import type { MealCategory, ProductIcon, ProductType } from './products'
import { ABSOLUTE_IMAGE_URL } from './config'

/* Product mapping --------------------------------------------------------- */

export type AdminProduct = {
  id: string
  name: string
  description: string
  price: number
  type: ProductType
  meals: MealCategory[]
  icon: ProductIcon
  image?: string
  active: boolean
  stockLimited: boolean
  stockCurrent: number
  stockMin: number
}

export function apiToAdminProduct(p: ApiProducto): AdminProduct {
  return {
    id: String(p.id),
    name: p.nombre,
    description: p.descripcion ?? '',
    price: typeof p.precio === 'string' ? parseFloat(p.precio) : p.precio,
    type: p.tipo,
    meals: parseCategorias(p.categorias),
    icon: inferIcon(p.nombre, p.tipo),
    image: ABSOLUTE_IMAGE_URL(p.imagen_url),
    active: p.activo === 1,
    stockLimited: p.stock_limitado === 1,
    stockCurrent: p.stock_actual ?? 0,
    stockMin: p.stock_minimo_alerta,
  }
}

export function adminToApiPayload(p: AdminProduct) {
  const categorias: Array<'Merienda' | 'Cena'> = []
  if (p.meals.includes('merienda')) categorias.push('Merienda')
  if (p.meals.includes('cena')) categorias.push('Cena')

  return {
    nombre: p.name.trim(),
    descripcion: p.description.trim() || undefined,
    precio: p.price,
    tipo: p.type,
    categorias,
    stock_limitado: p.stockLimited ? 1 : 0,
    stock_actual: p.stockLimited ? p.stockCurrent : undefined,
    stock_minimo_alerta: p.stockMin,
    activo: p.active ? 1 : 0,
  } as const
}

function parseCategorias(c: string | null): MealCategory[] {
  if (!c) return []
  const out: MealCategory[] = []
  if (/merienda/i.test(c)) out.push('merienda')
  if (/cena/i.test(c)) out.push('cena')
  return out
}

function inferIcon(name: string, tipo: ProductType): ProductIcon {
  const n = name.toLowerCase()
  if (/(pizza)/.test(n)) return 'pizza'
  if (/(panch|sandwich|hambur|empanada|tarta)/.test(n)) return 'sandwich'
  if (/(pollo|nugget|alita|pata)/.test(n)) return 'drumstick'
  if (/(torta|chocotorta)/.test(n)) return 'cake'
  if (/(gallet|cookie)/.test(n)) return 'cookie'
  if (/(medialuna|croissant|churro)/.test(n)) return 'croissant'
  if (/(donut|dona)/.test(n)) return 'donut'
  if (/(gaseosa|coca|cola|seven|sprite|fanta)/.test(n)) return 'soda'
  if (/(agua)/.test(n)) return 'water'
  if (/(cafe|mate|te)/.test(n)) return 'coffee'
  if (/(leche)/.test(n)) return 'milk'
  if (/(helado)/.test(n)) return 'icecream'
  if (/(combo)/.test(n)) return 'combo'
  if (tipo === 'bebida') return 'soda'
  if (tipo === 'promo') return 'combo'
  return 'pizza'
}

/* Pedido mapping ---------------------------------------------------------- */

export type OrderStatus = 'recibido' | 'preparacion' | 'listo' | 'entregado' | 'cancelado'
export type PayStatus = 'pendiente' | 'comprobante_subido' | 'pagado' | 'rechazado'
export type PayMethod = 'efectivo' | 'transferencia'

export type Order = {
  id: string
  code: string
  customer: string
  phone?: string
  table?: string
  method: PayMethod
  payStatus: PayStatus
  status: OrderStatus
  time: string
  notes?: string
  hasReceipt: boolean
  lines: { name: string; icon: ProductIcon; qty: number; price: number }[]
  origen: 'online' | 'caja'
}

export function apiToOrder(p: ApiPedido | ApiPedidoListItem): Order {
  const items = 'items' in p && Array.isArray((p as ApiPedido).items)
    ? (p as ApiPedido).items
    : null
  return {
    id: String(p.id),
    code: p.numero,
    customer: p.nombre_cliente,
    phone: p.telefono_cliente ?? undefined,
    table: p.mesa ?? undefined,
    method: p.metodo_pago,
    payStatus: mapPayStatus(p.estado_pago),
    status: mapOrderStatus(p.estado_pedido),
    time: formatTime(p.created_at),
    notes: p.observaciones ?? undefined,
    hasReceipt: p.comprobante_archivo_id != null,
    lines:
      items?.map((it) => ({
        name: it.nombre_producto,
        icon: inferIcon(it.nombre_producto, 'comida'),
        qty: it.cantidad,
        price: typeof it.precio_unitario === 'string' ? parseFloat(it.precio_unitario) : it.precio_unitario,
      })) ?? [],
    origen: p.origen,
  }
}

export function orderStatusToApi(s: OrderStatus): 'recibido' | 'en_preparacion' | 'listo' | 'entregado' | 'cancelado' {
  switch (s) {
    case 'preparacion':
      return 'en_preparacion'
    default:
      return s
  }
}

export function mapPayStatus(s: string): PayStatus {
  switch (s) {
    case 'comprobante_subido':
      return 'comprobante_subido'
    case 'pagado':
      return 'pagado'
    case 'rechazado':
      return 'rechazado'
    case 'pendiente':
    default:
      return 'pendiente'
  }
}

function mapOrderStatus(s: string): OrderStatus {
  switch (s) {
    case 'recibido':
      return 'recibido'
    case 'en_preparacion':
      return 'preparacion'
    case 'listo':
      return 'listo'
    case 'entregado':
      return 'entregado'
    case 'cancelado':
      return 'cancelado'
    default:
      return 'recibido'
  }
}

export { mapOrderStatus }

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '--:--'
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/* Cocina mapping --------------------------------------------------------- */

export type CocinaPedido = {
  id: string
  code: string
  customer: string
  table?: string
  payStatus: PayStatus
  status: OrderStatus
  time: string
  observations?: string
  lines: { name: string; icon: ProductIcon; qty: number; price: number }[]
}

export function apiToCocinaOrder(
  header: ApiCocinaPedido,
  items: ApiItem[] | undefined,
): CocinaPedido {
  return {
    id: String(header.id),
    code: header.numero,
    customer: header.nombre_cliente,
    table: header.mesa ?? undefined,
    payStatus: mapPayStatus(header.estado_pago),
    status: mapOrderStatus(header.estado_pedido),
    time: formatTime(header.created_at),
    observations: header.observaciones ?? undefined,
    lines: (items ?? []).map((it) => ({
      name: it.nombre_producto,
      icon: inferIcon(it.nombre_producto, 'comida'),
      qty: it.cantidad,
      price:
        typeof it.precio_unitario === 'string'
          ? parseFloat(it.precio_unitario)
          : it.precio_unitario,
    })),
  }
}

/* Caja mapping ------------------------------------------------------------ */

export type CajaProduct = {
  id: number
  name: string
  price: number
  type: ProductType
  icon: ProductIcon
  image?: string
  stockLimited: boolean
  stockActual: number | null
  stockMinimoAlerta: number
}

export type CajaFilter = 'todos' | 'merienda' | 'cena' | 'bebida' | 'promo'

export function apiToCajaProduct(p: ApiProducto): CajaProduct {
  return {
    id: p.id,
    name: p.nombre,
    price: typeof p.precio === 'string' ? parseFloat(p.precio) : p.precio,
    type: p.tipo,
    icon: inferIcon(p.nombre, p.tipo),
    image: ABSOLUTE_IMAGE_URL(p.imagen_url),
    stockLimited: p.stock_limitado === 1,
    stockActual: p.stock_actual,
    stockMinimoAlerta: p.stock_minimo_alerta,
  }
}

export function isCajaSoldOut(p: CajaProduct): boolean {
  return p.stockLimited && (p.stockActual ?? 0) <= 0
}

export function isCajaLowStock(p: CajaProduct): boolean {
  return p.stockLimited && (p.stockActual ?? 0) > 0 && (p.stockActual ?? 0) <= p.stockMinimoAlerta
}
