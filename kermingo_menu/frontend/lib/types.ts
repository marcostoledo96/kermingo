export type ApiProducto = {
  id: number
  nombre: string
  descripcion: string | null
  precio: string | number
  tipo: 'comida' | 'bebida' | 'promo'
  stock_limitado: 0 | 1
  stock_actual: number | null
  stock_minimo_alerta: number
  activo: 0 | 1
  disponible: 0 | 1
  orden: number
  imagen_archivo_id: number | null
  imagen_nombre_original: string | null
  imagen_mime_type: string | null
  imagen_tamanio_bytes: number | null
  imagen_url: string | null
  categorias: string | null
}

export type ApiConfiguracion = {
  id: number
  estado: 'abierta' | 'cerrada' | 'demo'
  mensaje_publico: string | null
  cena_habilitada_desde?: string | null
  categoria_default?: 'merienda' | 'cena'
}

export type ApiItem = {
  producto_id: number
  nombre_producto: string
  precio_unitario: string | number
  cantidad: number
  subtotal: string | number
  imagen_url?: string | null
}

export type ApiPedido = {
  id: number
  numero: string
  token_seguimiento: string
  origen: 'online' | 'caja'
  nombre_cliente: string
  mesa: string | null
  telefono_cliente: string | null
  telefono_whatsapp: string | null
  estado_pedido: 'recibido' | 'en_preparacion' | 'listo' | 'entregado' | 'cancelado'
  estado_pago: 'pendiente' | 'comprobante_subido' | 'pagado' | 'rechazado'
  metodo_pago: 'transferencia' | 'efectivo'
  total: string | number
  observaciones: string | null
  comprobante_archivo_id: number | null
  created_at: string
  updated_at: string
  items: ApiItem[]
}

export type ApiPedidoListItem = Omit<ApiPedido, 'items'>

export type ApiPedidoPaginada = {
  pedidos: ApiPedidoListItem[]
  paginacion: { total: number; page: number; limit: number; totalPages: number }
}

export type ApiProductoPaginada = {
  productos: ApiProducto[]
  paginacion: { total: number; page: number; limit: number; totalPages: number }
}

export type ApiCocinaPedido = {
  id: number
  numero: string
  nombre_cliente: string
  mesa: string | null
  estado_pedido: 'recibido' | 'en_preparacion' | 'listo' | 'entregado' | 'cancelado'
  estado_pago: 'pendiente' | 'comprobante_subido' | 'pagado' | 'rechazado'
  observaciones: string | null
  total: string | number
  created_at: string
  cantidad_items: number
}

export type ApiReporteProducto = {
  producto_id: number
  nombre: string
  cantidad: number
  total_recaudado: number | string
}

export type ApiReportes = {
  total_recaudado: number
  total_efectivo: number
  total_transferencia: number
  pedidos_pagados: number
  productos_vendidos: number
  pedidos_pendientes_pago: number
  monto_pendiente_pago: number
  producto_top: ApiReporteProducto | null
  ranking_productos: ApiReporteProducto[]
  actualizado_en: string
}

export type ApiOk<T> = {
  ok: true
  data: T
  message?: string
}

export type ApiErr = {
  ok: false
  error: string
  stack?: string
}

export type ApiResponse<T> = ApiOk<T> | ApiErr

export type AuthUser = {
  id: number
  nombre: string
  email: string
}

export type AuthSession = {
  token: string
  user: AuthUser
}
