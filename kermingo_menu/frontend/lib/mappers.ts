import type {
  ApiPedido,
  ApiProducto,
  ApiItem,
} from './types'
import type {
  MealCategory,
  OrderItem,
  PedidoEstado,
  PedidoPago,
  Product,
  ProductIcon,
  ProductType,
  StockStatus,
} from './products'
import { ABSOLUTE_IMAGE_URL } from './config'

const ICON_BY_NAME: Array<[RegExp, ProductIcon]> = [
  [/pizza/i, 'pizza'],
  [/pancho|chorip[áa]n/i, 'sandwich'],
  [/nugget/i, 'drumstick'],
  [/veggie|vegetarian/i, 'sprout'],
  [/chocotorta|torta|porci[óo]n de/i, 'cake'],
  [/churro|cookie|gallet/i, 'cookie'],
  [/medialuna|croissant/i, 'croissant'],
  [/torta frita|donut|rosca/i, 'donut'],
  [/coca|gaseosa|soda|cola/i, 'soda'],
  [/agua/i, 'water'],
  [/caf[ée]|mate|t[ée]|cocido/i, 'coffee'],
  [/chocolatada|leche|milk/i, 'milk'],
  [/helado/i, 'icecream'],
]

const DEFAULT_ICON_BY_TYPE: Record<ProductType, ProductIcon> = {
  comida: 'cake',
  bebida: 'soda',
  promo: 'combo',
}

export function pickProductIcon(nombre: string, tipo: ProductType): ProductIcon {
  for (const [re, icon] of ICON_BY_NAME) {
    if (re.test(nombre)) return icon
  }
  return DEFAULT_ICON_BY_TYPE[tipo]
}

export function deriveStockStatus(
  stockLimitado: 0 | 1,
  stockActual: number | null,
  stockMinimoAlerta: number,
  disponible: 0 | 1 | boolean = 1,
): StockStatus {
  if (!disponible) return 'no_disponible'
  if (!stockLimitado) return 'ilimitado'
  if (stockActual === null || stockActual === undefined) return 'disponible'
  if (stockActual <= 0) return 'agotado'
  if (stockActual <= stockMinimoAlerta) return 'bajo'
  return 'disponible'
}

export function parseCategorias(categorias: string | null | undefined): MealCategory[] {
  if (!categorias) return []
  const result: MealCategory[] = []
  for (const raw of categorias.split(',')) {
    const cat = raw.trim().toLowerCase()
    if (cat === 'merienda' || cat === 'cena') {
      result.push(cat)
    }
  }
  return result
}

export function mapProducto(p: ApiProducto): Product {
  return {
    id: String(p.id),
    name: p.nombre,
    description: p.descripcion ?? '',
    price: typeof p.precio === 'string' ? parseFloat(p.precio) : p.precio,
    meals: parseCategorias(p.categorias),
    type: p.tipo,
    stock: deriveStockStatus(p.stock_limitado, p.stock_actual, p.stock_minimo_alerta, p.disponible),
    icon: pickProductIcon(p.nombre, p.tipo),
    image: ABSOLUTE_IMAGE_URL(p.imagen_url),
    order: p.orden ?? 0,
    available: p.disponible === 1,
  }
}

function asNumber(v: string | number): number {
  return typeof v === 'string' ? parseFloat(v) : v
}

function mapItem(api: ApiItem, fallbackNombre: string): OrderItem {
  return {
    id: String(api.producto_id),
    producto_id: api.producto_id,
    nombre: api.nombre_producto ?? fallbackNombre,
    precio_unitario: asNumber(api.precio_unitario),
    cantidad: api.cantidad,
    subtotal: asNumber(api.subtotal),
    icon: pickProductIcon(api.nombre_producto ?? fallbackNombre, 'comida'),
  }
}

export function mapPedido(pedido: ApiPedido): {
  id: number
  numero: string
  token: string
  createdAt: string
  name: string
  table: string
  method: 'transferencia' | 'efectivo'
  total: number
  count: number
  items: OrderItem[]
  status: PedidoEstado
  payment: PedidoPago
} {
  const items = (pedido.items || []).map((it) => mapItem(it, ''))
  return {
    id: pedido.id,
    numero: pedido.numero,
    token: pedido.token_seguimiento,
    createdAt: pedido.created_at,
    name: pedido.nombre_cliente,
    table: pedido.mesa ?? '',
    method: pedido.metodo_pago,
    total: asNumber(pedido.total),
    count: items.reduce((acc, i) => acc + i.cantidad, 0),
    items,
    status: pedido.estado_pedido,
    payment: pedido.estado_pago,
  }
}
