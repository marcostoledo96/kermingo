import { ApiError } from '../api-error'
import {
  DEMO_COMPROBANTE_META,
  MOCK_COMPONENTES,
  MOCK_CONFIG,
  MOCK_PEDIDOS,
  MOCK_PRODUCTOS,
} from './fixtures'
import {
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_PASSWORD,
} from './mode'
import { readDemoSession, writeDemoSession, type DemoSessionUser } from './session'
import type { ApiCocinaPedido, ApiComponente, ApiConfiguracion, ApiPedido, ApiProducto } from '../types'

const DEMO_NOOP_MESSAGE =
  'Modo demo: esta acción no se guarda. El backend de Railway está apagado.'
const DEMO_ORDERS_KEY = 'kermingo:demoOrders'
const demoProducts = new Map<number, ApiProducto>()
const demoComponents = new Map<number, ApiComponente[]>()
const demoPedidos = new Map<number, ApiPedido>()

function mergedPedidos() {
  return MOCK_PEDIDOS.map((pedido) => demoPedidos.get(pedido.id) ?? pedido)
}

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
  let list = [...MOCK_PRODUCTOS, ...demoProducts.values()]
  const estado = query?.estado
  if (estado === 'activo') list = list.filter((p) =>
    p.activo === 1 && p.disponible === 1
    && (p.stock_limitado === 0 || p.stock_actual === null || p.stock_actual > 0))
  if (estado === 'agotado') list = list.filter((p) =>
    p.activo === 1 && p.disponible === 1 && p.stock_limitado === 1 && (p.stock_actual ?? 0) <= 0)
  if (estado === 'todavia_no_disponible') list = list.filter((p) => p.activo === 1 && p.disponible === 0)
  if (estado === 'inactivo' || estado === 'desactivado') list = list.filter((p) => p.activo === 0)
  if (query?.tipo) list = list.filter((p) => p.tipo === query.tipo)
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
  let list = mergedPedidos()
    .map(({ items: _items, ...pedido }) => pedido)
    .sort((a, b) => b.id - a.id)
  const equals = (key: 'estado_pedido' | 'metodo_pago' | 'origen') => {
    const value = query?.[key]
    if (typeof value === 'string' && value) list = list.filter((pedido) => pedido[key] === value)
  }
  equals('estado_pedido')
  equals('metodo_pago')
  equals('origen')
  if (query?.excluir_estado_pedido) {
    list = list.filter((pedido) => pedido.estado_pedido !== query.excluir_estado_pedido)
  }
  if (query?.buscar) {
    const normalize = (value: string | null) => (value ?? '')
      .normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase()
    const search = normalize(String(query.buscar))
    list = list.filter((pedido) => [
      pedido.nombre_cliente,
      pedido.numero,
      pedido.telefono_cliente,
      pedido.mesa,
    ].some((value) => normalize(value).includes(search)))
  }
  if (String(query?.solo_pagos_pendientes) === 'true') {
    list = list.filter((pedido) =>
      ['pendiente', 'rechazado'].includes(pedido.estado_pago)
      && pedido.estado_pedido !== 'cancelado')
  } else if (query?.estado_pago) {
    list = list.filter((pedido) => pedido.estado_pago === query.estado_pago)
  }
  const limit = Math.max(1, Math.min(100, Number(query?.limit) || 24))
  const page = Math.max(1, Number(query?.page) || 1)
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
  return demoProducts.get(id) ?? MOCK_PRODUCTOS.find((p) => p.id === id) ?? null
}

function isPublicProducto(producto: ApiProducto) {
  return producto.activo === 1
    && (producto.tipo !== 'promo' || (producto.componentes_count ?? 0) > 0)
}

function findPedido(id: number) {
  return demoPedidos.get(id) ?? MOCK_PEDIDOS.find((p) => p.id === id) ?? null
}

function findPedidoByToken(token: string) {
  const saved = JSON.parse(sessionStorage.getItem(DEMO_ORDERS_KEY) ?? '[]') as ApiPedido[]
  return saved.find((p) => p.token_seguimiento === token)
    ?? [...demoPedidos.values()].find((p) => p.token_seguimiento === token)
    ?? MOCK_PEDIDOS.find((p) => p.token_seguimiento === token)
    ?? null
}

function saveDemoPedido(pedido: ApiPedido) {
  demoPedidos.set(pedido.id, pedido)
  return pedido
}

function cocinaPedidos(): ApiCocinaPedido[] {
  return mergedPedidos()
    .filter((pedido) => ['en_preparacion', 'listo'].includes(pedido.estado_pedido))
    .map((pedido) => ({
      id: pedido.id,
      numero: pedido.numero,
      nombre_cliente: pedido.nombre_cliente,
      mesa: pedido.mesa,
      estado_pedido: pedido.estado_pedido,
      estado_pago: pedido.estado_pago,
      observaciones: pedido.observaciones,
      total: pedido.total,
      created_at: pedido.created_at,
      cantidad_items: pedido.items.reduce((total, item) => total + item.cantidad, 0),
    }))
}

function demoReportes() {
  const pedidos = mergedPedidos()
  const pagados = pedidos.filter((pedido) =>
    pedido.estado_pago === 'pagado' && pedido.estado_pedido !== 'cancelado')
  const pendientes = pedidos.filter((pedido) =>
    ['pendiente', 'rechazado'].includes(pedido.estado_pago) && pedido.estado_pedido !== 'cancelado')
  const ranking = new Map<number, {
    producto_id: number
    nombre: string
    cantidad: number
    total_recaudado: number
  }>()
  for (const pedido of pagados) {
    for (const item of pedido.items) {
      const current = ranking.get(item.producto_id) ?? {
        producto_id: item.producto_id,
        nombre: item.nombre_producto,
        cantidad: 0,
        total_recaudado: 0,
      }
      current.cantidad += item.cantidad
      current.total_recaudado += Number(item.subtotal)
      ranking.set(item.producto_id, current)
    }
  }
  const ranking_productos = [...ranking.values()].sort((a, b) =>
    b.cantidad - a.cantidad || a.producto_id - b.producto_id)
  const total = (orders: ApiPedido[]) => orders.reduce((sum, pedido) => sum + Number(pedido.total), 0)
  return {
    total_recaudado: total(pagados),
    total_efectivo: total(pagados.filter((pedido) => pedido.metodo_pago === 'efectivo')),
    total_transferencia: total(pagados.filter((pedido) => pedido.metodo_pago === 'transferencia')),
    pedidos_pagados: pagados.length,
    productos_vendidos: pagados.flatMap((pedido) => pedido.items)
      .reduce((sum, item) => sum + item.cantidad, 0),
    pedidos_pendientes_pago: pendientes.length,
    monto_pendiente_pago: total(pendientes),
    producto_top: ranking_productos[0] ?? null,
    ranking_productos,
    actualizado_en: new Date().toISOString(),
  }
}

function objectBody(body: unknown, allowed: string[], message: string): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || Object.keys(body).some((key) => !allowed.includes(key))) {
    throw new ApiError(message, 400)
  }
  return body as Record<string, unknown>
}

const PRODUCT_FIELDS = [
  'nombre', 'descripcion', 'precio', 'tipo', 'categorias', 'stock_limitado', 'stock_actual',
  'stock_minimo_alerta', 'activo', 'disponible', 'orden',
]
let nextDemoProductId = Math.max(...MOCK_PRODUCTOS.map((p) => p.id)) + 1

function integer(value: unknown, min = 0) {
  return Number.isInteger(Number(value)) && Number(value) >= min
}

type RequestedItem = { producto_id: number; cantidad: number }

function orderItems(requestedItems: RequestedItem[], previousItems: RequestedItem[] = []) {
  const expand = (items: RequestedItem[], requirements: Map<number, number>, validate = true) => {
    for (const item of items) {
      const producto = findProducto(item.producto_id)
      if (!integer(item.producto_id, 1) || !producto || !integer(item.cantidad, 1)) {
        throw new ApiError('Producto o cantidad inválidos', 400)
      }
      if (validate && (producto.activo !== 1 || producto.disponible !== 1)) {
        throw new ApiError('Producto no disponible', 400)
      }
      if (producto.tipo === 'promo') {
        const componentes = demoComponents.get(producto.id) ?? MOCK_COMPONENTES[producto.id] ?? []
        if (validate && componentes.length === 0) throw new ApiError('Promo sin componentes', 400)
        for (const componente of componentes) {
          requirements.set(
            componente.producto_id,
            (requirements.get(componente.producto_id) ?? 0) + componente.cantidad * item.cantidad,
          )
        }
      } else {
        requirements.set(producto.id, (requirements.get(producto.id) ?? 0) + item.cantidad)
      }
    }
  }
  const requirements = new Map<number, number>()
  const restored = new Map<number, number>()
  expand(requestedItems, requirements)
  expand(previousItems, restored, false)
  for (const [id, cantidad] of requirements) {
    const producto = findProducto(id)
    if (!producto || producto.activo !== 1 || producto.disponible !== 1) {
      throw new ApiError('Producto no disponible', 400)
    }
    if (producto.stock_limitado === 1
      && (producto.stock_actual ?? 0) + (restored.get(id) ?? 0) < cantidad) {
      throw new ApiError('Stock insuficiente', 409)
    }
  }
  return requestedItems.map(({ producto_id, cantidad }) => {
    const producto = findProducto(producto_id)!
    const precio = Number(producto.precio)
    return { producto_id, nombre_producto: producto.nombre, precio_unitario: precio,
      cantidad, subtotal: precio * cantidad, imagen_url: producto.imagen_url }
  })
}

function productValues(body: unknown, creating: boolean) {
  const data = objectBody(body, PRODUCT_FIELDS, 'Producto inválido')
  const categories = data.categorias
  if (categories !== undefined && (!Array.isArray(categories) || categories.length < 1
      || categories.some((value) => !['Merienda', 'Cena'].includes(String(value))))) {
    throw new ApiError('Producto inválido', 400)
  }
  if ((data.nombre !== undefined && (typeof data.nombre !== 'string' || data.nombre.length < 1 || data.nombre.length > 120))
    || (data.descripcion !== undefined && (typeof data.descripcion !== 'string' || data.descripcion.length > 500))
    || (data.precio !== undefined && (!Number.isFinite(Number(data.precio)) || Number(data.precio) < 0))
    || (data.tipo !== undefined && !['comida', 'bebida', 'promo'].includes(String(data.tipo)))
    || (data.stock_limitado !== undefined && ![0, 1].includes(Number(data.stock_limitado)))
    || (data.stock_actual !== undefined && !integer(data.stock_actual))
    || (data.stock_minimo_alerta !== undefined && !integer(data.stock_minimo_alerta))
    || (data.activo !== undefined && ![0, 1].includes(Number(data.activo)))
    || (data.disponible !== undefined && ![0, 1].includes(Number(data.disponible)))
    || (data.orden !== undefined && !integer(data.orden))) {
    throw new ApiError('Producto inválido', 400)
  }
  if (creating && (!data.nombre || typeof data.nombre !== 'string'
    || !['comida', 'bebida', 'promo'].includes(String(data.tipo))
    || !Array.isArray(categories)
    || ![0, 1].includes(Number(data.stock_limitado))
    || !Number.isFinite(Number(data.precio)) || Number(data.precio) < 0)) {
    throw new ApiError('Producto inválido', 400)
  }
  return data
}

function createDemoProducto(body: unknown): ApiProducto {
  const data = productValues(body, true)
  const id = nextDemoProductId++
  const stockLimitado = Number(data.stock_limitado) as 0 | 1
  const product: ApiProducto = {
    id,
    nombre: String(data.nombre),
    descripcion: data.descripcion === undefined ? null : String(data.descripcion),
    precio: Number(data.precio),
    tipo: data.tipo as ApiProducto['tipo'],
    stock_limitado: stockLimitado,
    stock_actual: stockLimitado === 0 ? null : data.stock_actual === undefined ? null : Number(data.stock_actual),
    stock_minimo_alerta: data.stock_minimo_alerta === undefined ? 5 : Number(data.stock_minimo_alerta),
    activo: data.activo === undefined ? 1 : Number(data.activo) as 0 | 1,
    disponible: data.disponible === undefined ? 1 : Number(data.disponible) as 0 | 1,
    orden: data.orden === undefined ? Math.max(...MOCK_PRODUCTOS.map((p) => p.orden)) + 1 : Number(data.orden),
    imagen_archivo_id: null,
    imagen_nombre_original: null,
    imagen_mime_type: null,
    imagen_tamanio_bytes: null,
    imagen_url: null,
    categorias: (data.categorias as string[]).join(','),
    componentes_count: 0,
  }
  demoProducts.set(id, product)
  return product
}

function updateDemoProducto(id: number, body: unknown): ApiProducto {
  const data = productValues(body, false)
  const base = findProducto(id)
  if (!base) throw new ApiError('Producto no encontrado', 404)
  const updates = Object.fromEntries(Object.entries(data).map(([key, value]) => [
    key,
    key === 'categorias' ? (value as string[]).join(',') : value,
  ]))
  const product = { ...base, ...updates, id } as ApiProducto
  if (demoProducts.has(id)) demoProducts.set(id, product)
  return product
}

function updateDemoComponentes(body: unknown): ApiComponente[] {
  const data = objectBody(body, ['componentes'], 'Componentes inválidos')
  if (!Array.isArray(data.componentes)) throw new ApiError('Componentes inválidos', 400)
  return data.componentes.map((value) => {
    const component = objectBody(value, ['producto_id', 'cantidad'], 'Componentes inválidos')
    const producto = findProducto(Number(component.producto_id))
    if (!integer(component.producto_id, 1) || !producto || !integer(component.cantidad, 1)) {
      throw new ApiError('Componentes inválidos', 400)
    }
    return {
      producto_id: producto.id,
      nombre: producto.nombre,
      cantidad: Number(component.cantidad),
      activo: producto.activo,
      disponible: producto.disponible,
      stock_limitado: producto.stock_limitado,
      stock_actual: producto.stock_actual,
    }
  })
}

function editDemoPedido(id: number, body: unknown): ApiPedido {
  const data = objectBody(body, [
    'nombre_cliente', 'mesa', 'telefono_cliente', 'observaciones', 'metodo_pago', 'estado_pago', 'items',
  ], 'Pedido inválido')
  const pedido = findPedido(id)
  if (!pedido || Object.keys(data).length === 0) throw new ApiError('Pedido inválido', pedido ? 400 : 404)
  if ((data.nombre_cliente !== undefined && (typeof data.nombre_cliente !== 'string' || data.nombre_cliente.length < 1 || data.nombre_cliente.length > 150))
    || (data.mesa !== undefined && (typeof data.mesa !== 'string' || data.mesa.length > 20))
    || (data.telefono_cliente !== undefined && (typeof data.telefono_cliente !== 'string' || data.telefono_cliente.length > 40))
    || (data.observaciones !== undefined && (typeof data.observaciones !== 'string' || data.observaciones.length > 500))
    || (data.metodo_pago !== undefined && !['transferencia', 'efectivo'].includes(String(data.metodo_pago)))
    || (data.estado_pago !== undefined && !['pendiente', 'comprobante_subido', 'pagado', 'rechazado'].includes(String(data.estado_pago)))) {
    throw new ApiError('Pedido inválido', 400)
  }
  if (data.metodo_pago === 'efectivo' && pedido.comprobante_archivo_id) {
    throw new ApiError('No se puede cambiar a efectivo un pedido con comprobante adjunto', 400)
  }
  const normalize = (value: unknown) => value === '' || value === null ? null : String(value)
  const items = data.items === undefined ? pedido.items : (() => {
    if (!Array.isArray(data.items) || data.items.length === 0) throw new ApiError('Items inválidos', 400)
    const requested = data.items.map((value) => {
      const item = objectBody(value, ['producto_id', 'cantidad'], 'Items inválidos')
      return { producto_id: Number(item.producto_id), cantidad: Number(item.cantidad) }
    })
    return orderItems(requested, pedido.items)
  })()
  return saveDemoPedido({
    ...pedido,
    ...data,
    mesa: data.mesa === undefined ? pedido.mesa : normalize(data.mesa),
    telefono_cliente: data.telefono_cliente === undefined ? pedido.telefono_cliente : normalize(data.telefono_cliente),
    observaciones: data.observaciones === undefined ? pedido.observaciones : normalize(data.observaciones),
    items,
    total: items.reduce((sum, item) => sum + Number(item.subtotal), 0),
    updated_at: new Date().toISOString(),
  } as ApiPedido)
}

function updateDemoPedidoState(id: number, body: unknown): ApiPedido {
  const data = objectBody(body, ['estado_pedido'], 'Estado de pedido inválido')
  const pedido = findPedido(id)
  if (!pedido) throw new ApiError('Pedido no encontrado', 404)
  if (Object.keys(data).length !== 1
    || !['recibido', 'en_preparacion', 'listo', 'entregado'].includes(String(data.estado_pedido))) {
    throw new ApiError('Estado de pedido inválido', 400)
  }
  return saveDemoPedido({ ...pedido, estado_pedido: data.estado_pedido, updated_at: new Date().toISOString() } as ApiPedido)
}

function updateDemoPaymentState(id: number, body: unknown): ApiPedido {
  const data = objectBody(body, ['estado_pago'], 'Estado de pago inválido')
  const pedido = findPedido(id)
  if (!pedido) throw new ApiError('Pedido no encontrado', 404)
  if (Object.keys(data).length !== 1
    || !['pendiente', 'comprobante_subido', 'pagado', 'rechazado'].includes(String(data.estado_pago))) {
    throw new ApiError('Estado de pago inválido', 400)
  }
  return saveDemoPedido({ ...pedido, estado_pago: data.estado_pago, updated_at: new Date().toISOString() } as ApiPedido)
}

function emptyBody(body: unknown) {
  objectBody(body, [], 'Body inválido')
}

function updateDemoProductImage(id: number, body: unknown): ApiProducto {
  if (!(body instanceof FormData) || [...body.keys()].length !== 1 || !body.has('imagen')) {
    throw new ApiError('Imagen inválida', 400)
  }
  const image = body.get('imagen')
  const producto = findProducto(id)
  if (!producto) throw new ApiError('Producto no encontrado', 404)
  if (!(image instanceof File)) throw new ApiError('Archivo de imagen requerido', 400)
  const updated = {
    ...producto,
    imagen_archivo_id: Date.now(),
    imagen_nombre_original: image.name,
    imagen_mime_type: image.type || 'image/webp',
    imagen_tamanio_bytes: image.size,
    imagen_url: `/products/${MOCK_PRODUCTOS.find((value) => value.imagen_url)?.id ?? 1}.png`,
  }
  if (demoProducts.has(id)) demoProducts.set(id, updated)
  return updated
}

function deleteDemoProductImage(id: number): ApiProducto {
  const producto = findProducto(id)
  if (!producto) throw new ApiError('Producto no encontrado', 404)
  const updated = { ...producto, imagen_archivo_id: null, imagen_nombre_original: null,
    imagen_mime_type: null, imagen_tamanio_bytes: null, imagen_url: null }
  if (demoProducts.has(id)) demoProducts.set(id, updated)
  return updated
}

function updateDemoProductStock(id: number, body: unknown): ApiProducto {
  const data = objectBody(body, ['stock_actual'], 'Stock inválido')
  if (Object.keys(data).length !== 1 || !integer(data.stock_actual)) {
    throw new ApiError('Stock inválido', 400)
  }
  const producto = findProducto(id)
  if (!producto) throw new ApiError('Producto no encontrado', 404)
  const updated = { ...producto, stock_actual: Number(data.stock_actual) }
  if (demoProducts.has(id)) demoProducts.set(id, updated)
  return updated
}

function updateDemoProductActive(id: number, active: 0 | 1, body: unknown): ApiProducto {
  emptyBody(body)
  const producto = findProducto(id)
  if (!producto) throw new ApiError('Producto no encontrado', 404)
  const updated = { ...producto, activo: active }
  if (demoProducts.has(id)) demoProducts.set(id, updated)
  return updated
}

function updateDemoConfig(body: unknown): ApiConfiguracion {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError('Configuración inválida', 400)
  }
  const allowed = ['estado', 'mensaje_publico', 'cena_habilitada_desde', 'categoria_default']
  const entries = Object.entries(body)
  if (entries.length === 0 || entries.some(([key]) => !allowed.includes(key))) {
    throw new ApiError('Configuración inválida', 400)
  }
  return { ...MOCK_CONFIG, ...body } as ApiConfiguracion
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
  const items = orderItems(requestedItems)
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
    return delay([...MOCK_PRODUCTOS, ...demoProducts.values()].filter(isPublicProducto) as T)
  }

  if (m === 'GET' && match(p, /^\/api\/productos\/(\d+)$/)) {
    const id = Number(match(p, /^\/api\/productos\/(\d+)$/)![1])
    const prod = findProducto(id)
    if (!prod || !isPublicProducto(prod)) throw new ApiError('Producto no encontrado', 404)
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
    if (!findProducto(id)) throw new ApiError('Producto no encontrado', 404)
    return delay((demoComponents.get(id) ?? MOCK_COMPONENTES[id] ?? []) as T)
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
    return delay(cocinaPedidos() as T)
  }

  if (m === 'GET' && match(p, /^\/api\/admin\/cocina\/pedidos\/(\d+)$/)) {
    const id = Number(match(p, /^\/api\/admin\/cocina\/pedidos\/(\d+)$/)![1])
    const pedido = findPedido(id)
    if (!pedido) throw new ApiError('Pedido no encontrado', 404)
    return delay(pedido as T)
  }

  if (m === 'GET' && p === '/api/admin/reportes') {
    return delay(demoReportes() as T)
  }

  // --- Mutations: showcase no-op with plausible payloads ---
  if (m === 'POST' && p === '/api/pedidos') {
    return delay(createDemoPedido(body as FormData) as T)
  }

  if (m === 'POST' && p === '/api/admin/pedidos/caja') {
    return demoNoop({ numero: 'KMG-DEMO', id: 999, message: DEMO_NOOP_MESSAGE } as T)
  }

  if (m === 'POST' && p === '/api/admin/productos') {
    return demoNoop(createDemoProducto(body) as T)
  }

  if (m === 'PUT' && p === '/api/admin/configuracion-tienda') {
    return demoNoop(updateDemoConfig(body) as T)
  }

  const adminEstadoMatch = match(p, /^\/api\/admin\/pedidos\/(\d+)\/estado$/)
  if (m === 'PATCH' && adminEstadoMatch) {
    return demoNoop(updateDemoPedidoState(Number(adminEstadoMatch[1]), body) as T)
  }

  const pagoMatch = match(p, /^\/api\/admin\/pedidos\/(\d+)\/pago$/)
  if (m === 'PATCH' && pagoMatch) {
    return demoNoop(updateDemoPaymentState(Number(pagoMatch[1]), body) as T)
  }

  const cancelarMatch = match(p, /^\/api\/admin\/pedidos\/(\d+)\/cancelar$/)
  if (m === 'PATCH' && cancelarMatch) {
    emptyBody(body)
    const pedido = findPedido(Number(cancelarMatch[1]))
    if (!pedido) throw new ApiError('Pedido no encontrado', 404)
    if (!['recibido', 'en_preparacion'].includes(pedido.estado_pedido)) {
      throw new ApiError('Solo se puede cancelar pedidos en estado en preparación', 400)
    }
    return demoNoop(saveDemoPedido({ ...pedido, estado_pedido: 'cancelado', updated_at: new Date().toISOString() }) as T)
  }

  const aprobarMatch = match(p, /^\/api\/admin\/pedidos\/(\d+)\/comprobante\/aprobar$/)
  if (m === 'PATCH' && aprobarMatch) {
    emptyBody(body)
    const pedido = findPedido(Number(aprobarMatch[1]))
    if (!pedido) throw new ApiError('Pedido no encontrado', 404)
    return demoNoop(saveDemoPedido({ ...pedido, estado_pago: 'pagado',
      estado_pedido: pedido.estado_pedido === 'recibido' ? 'en_preparacion' : pedido.estado_pedido,
      updated_at: new Date().toISOString() }) as T)
  }

  const cocinaEstadoMatch = match(p, /^\/api\/admin\/cocina\/pedidos\/(\d+)\/estado$/)
  if (m === 'PATCH' && cocinaEstadoMatch) {
    return demoNoop(updateDemoPedidoState(Number(cocinaEstadoMatch[1]), body) as T)
  }

  const productImageMatch = match(p, /^\/api\/admin\/productos\/(\d+)\/imagen$/)
  if (m === 'POST' && productImageMatch) {
    return demoNoop(updateDemoProductImage(Number(productImageMatch[1]), body) as T)
  }
  if (m === 'DELETE' && productImageMatch) {
    if (body !== undefined) throw new ApiError('Body inválido', 400)
    return demoNoop(deleteDemoProductImage(Number(productImageMatch[1])) as T)
  }

  const productStockMatch = match(p, /^\/api\/admin\/productos\/(\d+)\/stock$/)
  if (m === 'PATCH' && productStockMatch) {
    return demoNoop(updateDemoProductStock(Number(productStockMatch[1]), body) as T)
  }

  const productActiveMatch = match(p, /^\/api\/admin\/productos\/(\d+)\/(desactivar|recuperar)$/)
  if (m === 'PATCH' && productActiveMatch) {
    return demoNoop(updateDemoProductActive(
      Number(productActiveMatch[1]),
      productActiveMatch[2] === 'desactivar' ? 0 : 1,
      body,
    ) as T)
  }

  if (/^\/api\/admin\/(?:pedidos\/\d+\/(?:estado|pago|cancelar|comprobante\/aprobar)|cocina\/pedidos\/\d+\/estado|productos\/\d+\/imagen)(?:\/.*)?$/.test(p)) {
    throw new ApiError(`Mock: ruta no implementada (${m} ${p})`, 404)
  }

  if (
    (m === 'PUT' || m === 'PATCH' || m === 'POST' || m === 'DELETE') &&
    p.startsWith('/api/admin/')
  ) {
    const idMatch = match(p, /\/(\d+)(?:\/|$)/)
    const id = idMatch ? Number(idMatch[1]) : NaN
    if (p.includes('/componentes') && !Number.isNaN(id)) {
      if (!findProducto(id)) throw new ApiError('Producto no encontrado', 404)
      const components = updateDemoComponentes(body)
      if (demoProducts.has(id)) {
        demoComponents.set(id, components)
        demoProducts.set(id, { ...demoProducts.get(id)!, componentes_count: components.length })
      }
      return demoNoop(components as T)
    }
    if (p.includes('/productos') && !Number.isNaN(id)) {
      return demoNoop(updateDemoProducto(id, body) as T)
    }
    if (p.includes('/pedidos') && !Number.isNaN(id)) {
      return demoNoop(editDemoPedido(id, body) as T)
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
