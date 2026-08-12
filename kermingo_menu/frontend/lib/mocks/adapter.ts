import { ApiError } from '../api-error'
import {
  DEMO_COMPROBANTE_META,
  listPedidoItems,
  MOCK_COMPONENTES,
  MOCK_CONFIG,
  MOCK_PEDIDOS,
  MOCK_PRODUCTOS,
  MOCK_REPORTES,
  toCocinaHeaders,
} from './fixtures'
import {
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_PASSWORD,
} from './mode'
import { readDemoSession, writeDemoSession, type DemoSessionUser } from './session'
import type { ApiPedido } from '../types'

const DEMO_NOOP_MESSAGE =
  'Modo demo: esta acción no se guarda. El backend de Railway está apagado.'
const DEMO_ORDERS_KEY = 'kermingo:demoOrders'

function delay<T>(value: T, ms = 80): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

function pathOnly(path: string): string {
  return path.split('?')[0].replace(/\/$/, '') || '/'
}

function match(path: string, pattern: RegExp): RegExpMatchArray | null {
  return pathOnly(path).match(pattern)
}

function paginateProductos(query?: Record<string, string | number | undefined>) {
  let list = [...MOCK_PRODUCTOS]
  const estado = query?.estado
  if (estado === 'activo') list = list.filter((p) => p.activo === 1)
  if (estado === 'inactivo') list = list.filter((p) => p.activo === 0)
  const limit = Number(query?.limit ?? 100) || 100
  const page = Number(query?.page ?? 1) || 1
  const start = (page - 1) * limit
  const slice = list.slice(start, start + limit)
  return {
    productos: slice,
    paginacion: {
      total: list.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(list.length / limit)),
    },
  }
}

function paginatePedidos(query?: Record<string, string | number | undefined>) {
  let list = listPedidoItems()
  const estadoPedido = query?.estado_pedido
  const estadoPago = query?.estado_pago
  if (typeof estadoPedido === 'string' && estadoPedido) {
    list = list.filter((p) => p.estado_pedido === estadoPedido)
  }
  if (typeof estadoPago === 'string' && estadoPago) {
    list = list.filter((p) => p.estado_pago === estadoPago)
  }
  const limit = Number(query?.limit ?? 50) || 50
  const page = Number(query?.page ?? 1) || 1
  const start = (page - 1) * limit
  return {
    pedidos: list.slice(start, start + limit),
    paginacion: {
      total: list.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(list.length / limit)),
    },
  }
}

function findProducto(id: number) {
  return MOCK_PRODUCTOS.find((p) => p.id === id) ?? null
}

function findPedido(id: number) {
  return MOCK_PEDIDOS.find((p) => p.id === id) ?? null
}

function findPedidoByToken(token: string) {
  const saved = JSON.parse(sessionStorage.getItem(DEMO_ORDERS_KEY) ?? '[]') as ApiPedido[]
  return saved.find((p) => p.token_seguimiento === token)
    ?? MOCK_PEDIDOS.find((p) => p.token_seguimiento === token)
    ?? null
}

function createDemoPedido(body: FormData): ApiPedido {
  if (!(body instanceof FormData)) throw new ApiError('Formulario inválido', 400)
  const now = new Date().toISOString()
  const id = Date.now()
  let requestedItems: Array<{
    producto_id: number
    cantidad: number
  }>
  try {
    requestedItems = JSON.parse(String(body.get('items')))
  } catch {
    throw new ApiError('Items inválidos', 400)
  }
  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    throw new ApiError('El pedido debe incluir items', 400)
  }
  if (requestedItems.some((item) =>
    !Number.isInteger(item.producto_id)
    || !Number.isInteger(item.cantidad)
    || item.cantidad < 1
    || !findProducto(item.producto_id)
  )) {
    throw new ApiError('Producto o cantidad inválidos', 400)
  }
  const items = requestedItems.map(({ producto_id, cantidad }) => {
    const producto = findProducto(producto_id)!
    const precio = Number(producto.precio)
    return {
      producto_id,
      nombre_producto: producto.nombre,
      precio_unitario: precio,
      cantidad,
      subtotal: precio * cantidad,
      imagen_url: producto.imagen_url,
    }
  })
  const pedido: ApiPedido = {
    id,
    numero: `KMG-DEMO-${String(id).slice(-6)}`,
    token_seguimiento: crypto.randomUUID().replaceAll('-', ''),
    origen: 'online',
    nombre_cliente: String(body.get('nombre_cliente') ?? ''),
    mesa: body.get('mesa') ? String(body.get('mesa')) : null,
    telefono_cliente: body.get('telefono_cliente') ? String(body.get('telefono_cliente')) : null,
    telefono_whatsapp: null,
    estado_pedido: 'en_preparacion',
    estado_pago: 'pagado',
    metodo_pago: 'transferencia',
    total: items.reduce((sum, item) => sum + item.subtotal, 0),
    observaciones: body.get('observaciones') ? String(body.get('observaciones')) : null,
    comprobante_archivo_id: null,
    created_at: now,
    updated_at: now,
    items,
  }
  const saved = JSON.parse(sessionStorage.getItem(DEMO_ORDERS_KEY) ?? '[]') as ApiPedido[]
  sessionStorage.setItem(DEMO_ORDERS_KEY, JSON.stringify([...saved, pedido]))
  return pedido
}

/** Showcase writes: acknowledge without mutating fixtures. */
async function demoNoop<T>(payload: T): Promise<T> {
  return delay(payload)
}

export async function mockApiRequest<T>(
  method: string,
  path: string,
  query?: Record<string, string | number | undefined>,
  body?: unknown,
): Promise<T> {
  const m = method.toUpperCase()
  const p = pathOnly(path)

  if (m === 'GET' && (p === '/api/health' || p === '/health')) {
    return delay({ status: 'ok', timestamp: new Date().toISOString(), mock: true } as T)
  }

  if (m === 'GET' && p === '/api/configuracion-tienda') {
    return delay({ ...MOCK_CONFIG, estado: 'abierta' } as T)
  }

  if (m === 'GET' && p === '/api/admin/configuracion-tienda') {
    return delay(MOCK_CONFIG as T)
  }

  if (m === 'GET' && p === '/api/productos') {
    // Public menu expects a bare array from apiGet unwrap
    return delay(MOCK_PRODUCTOS as T)
  }

  if (m === 'GET' && match(p, /^\/api\/productos\/(\d+)$/)) {
    const id = Number(match(p, /^\/api\/productos\/(\d+)$/)![1])
    const prod = findProducto(id)
    if (!prod) throw new ApiError('Producto no encontrado', 404)
    return delay(prod as T)
  }

  if (m === 'GET' && match(p, /^\/api\/pedidos\/seguimiento\/(.+)$/)) {
    const token = decodeURIComponent(match(p, /^\/api\/pedidos\/seguimiento\/(.+)$/)![1])
    const pedido = findPedidoByToken(token)
    if (!pedido) throw new ApiError('Pedido no encontrado', 404)
    return delay(pedido as T)
  }

  if (m === 'GET' && p === '/api/admin/productos') {
    return delay(paginateProductos(query) as T)
  }

  if (m === 'GET' && match(p, /^\/api\/admin\/productos\/(\d+)\/componentes$/)) {
    const id = Number(match(p, /^\/api\/admin\/productos\/(\d+)\/componentes$/)![1])
    return delay((MOCK_COMPONENTES[id] ?? []) as T)
  }

  if (m === 'GET' && p === '/api/admin/pedidos') {
    return delay(paginatePedidos(query) as T)
  }

  if (m === 'GET' && match(p, /^\/api\/admin\/pedidos\/(\d+)$/)) {
    const id = Number(match(p, /^\/api\/admin\/pedidos\/(\d+)$/)![1])
    const pedido = findPedido(id)
    if (!pedido) throw new ApiError('Pedido no encontrado', 404)
    return delay(pedido as T)
  }

  if (m === 'GET' && match(p, /^\/api\/admin\/pedidos\/(\d+)\/comprobante$/)) {
    return delay(DEMO_COMPROBANTE_META as T)
  }

  if (m === 'GET' && p === '/api/admin/cocina/pedidos') {
    return delay(toCocinaHeaders() as T)
  }

  if (m === 'GET' && match(p, /^\/api\/admin\/cocina\/pedidos\/(\d+)$/)) {
    const id = Number(match(p, /^\/api\/admin\/cocina\/pedidos\/(\d+)$/)![1])
    const pedido = findPedido(id)
    if (!pedido) throw new ApiError('Pedido no encontrado', 404)
    return delay(pedido as T)
  }

  if (m === 'GET' && p === '/api/admin/reportes') {
    return delay(MOCK_REPORTES as T)
  }

  // --- Mutations: showcase no-op with plausible payloads ---
  if (m === 'POST' && p === '/api/pedidos') {
    return delay(createDemoPedido(body as FormData) as T)
  }

  if (m === 'POST' && p === '/api/admin/pedidos/caja') {
    return demoNoop({ numero: 'KMG-DEMO', id: 999, message: DEMO_NOOP_MESSAGE } as T)
  }

  if (m === 'POST' && p === '/api/admin/productos') {
    return demoNoop({
      ...MOCK_PRODUCTOS[0],
      id: 999,
      nombre: 'Producto demo (no guardado)',
    } as T)
  }

  if (
    (m === 'PUT' || m === 'PATCH' || m === 'POST' || m === 'DELETE') &&
    p.startsWith('/api/admin/')
  ) {
    const idMatch = match(p, /\/(\d+)(?:\/|$)/)
    const id = idMatch ? Number(idMatch[1]) : NaN
    if (p.includes('/productos') && !Number.isNaN(id)) {
      const prod = findProducto(id) ?? MOCK_PRODUCTOS[0]
      return demoNoop(prod as T)
    }
    if (p.includes('/pedidos') && !Number.isNaN(id)) {
      const pedido = findPedido(id) ?? MOCK_PEDIDOS[0]
      return demoNoop(pedido as T)
    }
    if (p.includes('configuracion-tienda')) {
      return demoNoop(MOCK_CONFIG as T)
    }
    if (p.includes('/componentes') && !Number.isNaN(id)) {
      return demoNoop((MOCK_COMPONENTES[id] ?? []) as T)
    }
    if (p.includes('/orden')) {
      return demoNoop(MOCK_PRODUCTOS as T)
    }
    return demoNoop({ ok: true, message: DEMO_NOOP_MESSAGE } as T)
  }

  throw new ApiError(`Mock: ruta no implementada (${m} ${p})`, 404)
}

export async function mockLogin(email: string, contrasenia: string): Promise<DemoSessionUser> {
  if (email.trim().toLowerCase() !== DEMO_ADMIN_EMAIL || contrasenia !== DEMO_ADMIN_PASSWORD) {
    throw new ApiError('Credenciales inválidas', 401)
  }
  const user: DemoSessionUser = {
    id: 1,
    name: 'Admin',
    nombre: 'Admin',
    email: DEMO_ADMIN_EMAIL,
    role: 'admin',
  }
  writeDemoSession(user)
  return delay(user)
}

export async function mockMe(): Promise<DemoSessionUser> {
  const session = readDemoSession()
  if (!session) throw new ApiError('No autorizado', 401)
  return delay(session)
}

export async function mockLogout(): Promise<void> {
  writeDemoSession(null)
  await delay(undefined)
}

export { DEMO_NOOP_MESSAGE }
