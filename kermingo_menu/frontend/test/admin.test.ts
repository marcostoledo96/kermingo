import { describe, it, expect } from 'vitest'
import {
  apiToAdminProduct,
  apiToAdminReportes,
  adminToApiPayload,
  apiToOrder,
  orderStatusToApi,
  apiToCocinaOrder,
  apiToCajaProduct,
  isCajaSoldOut,
  isCajaLowStock,
  mapOrderStatus,
  mapPayStatus,
} from '@/lib/admin'
import type {
  ApiCocinaPedido,
  ApiItem,
  ApiPedido,
  ApiPedidoListItem,
  ApiProducto,
  ApiReportes,
} from '@/lib/types'

describe('apiToAdminProduct', () => {
  it('converts string precio to number', () => {
    const api: ApiProducto = {
      id: 1,
      nombre: 'Item',
      descripcion: 'x',
      precio: '3500.00',
      tipo: 'comida',
      stock_limitado: 1,
      stock_actual: 10,
      stock_minimo_alerta: 3,
      activo: 1,
      imagen_archivo_id: null,
      imagen_nombre_original: null,
      imagen_mime_type: null,
      imagen_tamanio_bytes: null,
      imagen_url: null,
      categorias: 'Cena',
    }
    const p = apiToAdminProduct(api)
    expect(p.id).toBe('1')
    expect(p.name).toBe('Item')
    expect(p.price).toBe(3500)
    expect(p.type).toBe('comida')
    expect(p.meals).toEqual(['cena'])
    expect(p.active).toBe(true)
    expect(p.stockLimited).toBe(true)
    expect(p.stockCurrent).toBe(10)
    expect(p.stockMin).toBe(3)
  })

  it('keeps number precio', () => {
    const api: ApiProducto = {
      id: 2,
      nombre: 'Item',
      descripcion: 'x',
      precio: 100,
      tipo: 'bebida',
      stock_limitado: 0,
      stock_actual: null,
      stock_minimo_alerta: 0,
      activo: 0,
      imagen_archivo_id: null,
      imagen_nombre_original: null,
      imagen_mime_type: null,
      imagen_tamanio_bytes: null,
      imagen_url: null,
      categorias: 'Merienda',
    }
    const p = apiToAdminProduct(api)
    expect(p.price).toBe(100)
    expect(p.stockLimited).toBe(false)
    expect(p.stockCurrent).toBe(0) // null → 0
    expect(p.active).toBe(false)
  })

  it('treats null stock_actual as 0', () => {
    const api: ApiProducto = {
      id: 3,
      nombre: 'Item',
      descripcion: 'x',
      precio: '100',
      tipo: 'comida',
      stock_limitado: 1,
      stock_actual: null,
      stock_minimo_alerta: 0,
      activo: 1,
      imagen_archivo_id: null,
      imagen_nombre_original: null,
      imagen_mime_type: null,
      imagen_tamanio_bytes: null,
      imagen_url: null,
      categorias: null,
    }
    const p = apiToAdminProduct(api)
    expect(p.stockCurrent).toBe(0)
    expect(p.meals).toEqual([])
  })

  it('parses multiple categorias', () => {
    const api: ApiProducto = {
      id: 4,
      nombre: 'Item',
      descripcion: 'x',
      precio: '100',
      tipo: 'comida',
      stock_limitado: 1,
      stock_actual: 5,
      stock_minimo_alerta: 0,
      activo: 1,
      imagen_archivo_id: null,
      imagen_nombre_original: null,
      imagen_mime_type: null,
      imagen_tamanio_bytes: null,
      imagen_url: null,
      categorias: 'Merienda, Cena',
    }
    const p = apiToAdminProduct(api)
    expect(p.meals).toEqual(['merienda', 'cena'])
  })

  it('infers icon from product name', () => {
    const api: ApiProducto = {
      id: 5,
      nombre: 'Pizza',
      descripcion: 'x',
      precio: '100',
      tipo: 'comida',
      stock_limitado: 1,
      stock_actual: 5,
      stock_minimo_alerta: 0,
      activo: 1,
      imagen_archivo_id: null,
      imagen_nombre_original: null,
      imagen_mime_type: null,
      imagen_tamanio_bytes: null,
      imagen_url: null,
      categorias: 'Cena',
    }
    const p = apiToAdminProduct(api)
    expect(p.icon).toBe('pizza')
  })

  it('converts relative imagen_url to absolute URL', () => {
    const api: ApiProducto = {
      id: 6,
      nombre: 'Item',
      descripcion: 'x',
      precio: '100',
      tipo: 'comida',
      stock_limitado: 1,
      stock_actual: 5,
      stock_minimo_alerta: 0,
      activo: 1,
      imagen_archivo_id: 42,
      imagen_nombre_original: 'pic.jpg',
      imagen_mime_type: 'image/jpeg',
      imagen_tamanio_bytes: 1234,
      imagen_url: '/api/productos/6/imagen?v=42',
      categorias: 'Cena',
    }
    const p = apiToAdminProduct(api)
    expect(p.image).toBe('http://localhost:3001/api/productos/6/imagen?v=42')
  })

  it('returns undefined image when imagen_url is null', () => {
    const api: ApiProducto = {
      id: 7,
      nombre: 'Item',
      descripcion: 'x',
      precio: '100',
      tipo: 'comida',
      stock_limitado: 1,
      stock_actual: 5,
      stock_minimo_alerta: 0,
      activo: 1,
      imagen_archivo_id: null,
      imagen_nombre_original: null,
      imagen_mime_type: null,
      imagen_tamanio_bytes: null,
      imagen_url: null,
      categorias: 'Cena',
    }
    const p = apiToAdminProduct(api)
    expect(p.image).toBeUndefined()
  })
})

describe('adminToApiPayload', () => {
  it('maps merienda meal to categorias', () => {
    const payload = adminToApiPayload({
      id: '11',
      name: 'Item',
      description: 'x',
      price: 150,
      type: 'comida',
      meals: ['merienda'],
      icon: 'pizza',
      active: true,
      stockLimited: true,
      stockCurrent: 10,
      stockMin: 1,
    })

    expect(payload.categorias).toEqual(['Merienda'])
  })

  it('maps cena meal to categorias', () => {
    const payload = adminToApiPayload({
      id: '12',
      name: 'Item',
      description: 'x',
      price: 150,
      type: 'comida',
      meals: ['cena'],
      icon: 'pizza',
      active: true,
      stockLimited: true,
      stockCurrent: 10,
      stockMin: 1,
    })

    expect(payload.categorias).toEqual(['Cena'])
  })

  it('maps both meals to both categorias', () => {
    const payload = adminToApiPayload({
      id: '13',
      name: 'Item',
      description: 'x',
      price: 150,
      type: 'comida',
      meals: ['cena', 'merienda'],
      icon: 'pizza',
      active: true,
      stockLimited: true,
      stockCurrent: 10,
      stockMin: 1,
    })

    expect(payload.categorias).toEqual(['Merienda', 'Cena'])
  })

  it('converts stockLimited true to stock_limitado 1', () => {
    const payload = adminToApiPayload({
      id: '1',
      name: 'Item',
      description: 'x',
      price: 100,
      type: 'comida',
      meals: ['cena'],
      icon: 'pizza',
      active: true,
      stockLimited: true,
      stockCurrent: 5,
      stockMin: 2,
    })
    expect(payload.stock_limitado).toBe(1)
    expect(payload.stock_actual).toBe(5)
    expect(payload.activo).toBe(1)
    expect(payload.precio).toBe(100)
    expect(payload.tipo).toBe('comida')
  })

  it('omits stock_actual when stockLimited is false', () => {
    const payload = adminToApiPayload({
      id: '2',
      name: 'Item',
      description: 'x',
      price: 100,
      type: 'bebida',
      meals: [],
      icon: 'soda',
      active: true,
      stockLimited: false,
      stockCurrent: 0,
      stockMin: 0,
    })
    expect(payload.stock_limitado).toBe(0)
    expect(payload.stock_actual).toBeUndefined()
  })

  it('converts active false to activo 0', () => {
    const payload = adminToApiPayload({
      id: '3',
      name: 'Item',
      description: 'x',
      price: 100,
      type: 'comida',
      meals: ['cena'],
      icon: 'pizza',
      active: false,
      stockLimited: true,
      stockCurrent: 5,
      stockMin: 0,
    })
    expect(payload.activo).toBe(0)
  })

  it('omits descripcion when empty', () => {
    const payload = adminToApiPayload({
      id: '4',
      name: 'Item',
      description: '',
      price: 100,
      type: 'comida',
      meals: ['cena'],
      icon: 'pizza',
      active: true,
      stockLimited: true,
      stockCurrent: 5,
      stockMin: 0,
    })
    expect(payload.descripcion).toBeUndefined()
  })
})

describe('apiToOrder', () => {
  it('maps a pedido with items', () => {
    const items: ApiItem[] = [
      {
        producto_id: 10,
        nombre_producto: 'Pizza',
        precio_unitario: '2500.00',
        cantidad: 2,
        subtotal: '5000.00',
      },
    ]
    const api: ApiPedido = {
      id: 1,
      numero: 'KMG-0001',
      token_seguimiento: 'abc',
      origen: 'online',
      nombre_cliente: 'Test',
      mesa: '5',
      telefono_cliente: '123',
      telefono_whatsapp: '123',
      estado_pedido: 'recibido',
      estado_pago: 'pendiente',
      metodo_pago: 'efectivo',
      total: '5000.00',
      observaciones: 'sin cebolla',
      comprobante_archivo_id: null,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      items,
    }
    const o = apiToOrder(api)
    expect(o.id).toBe('1')
    expect(o.code).toBe('KMG-0001')
    expect(o.customer).toBe('Test')
    expect(o.method).toBe('efectivo')
    expect(o.payStatus).toBe('pendiente')
    expect(o.status).toBe('recibido')
    expect(o.hasReceipt).toBe(false)
    expect(o.total).toBe(5000)
    expect(o.lines).toHaveLength(1)
    expect(o.lines[0].name).toBe('Pizza')
    expect(o.lines[0].qty).toBe(2)
    expect(o.lines[0].price).toBe(2500)
    expect(o.notes).toBe('sin cebolla')
    expect(o.origen).toBe('online')
  })

  it('preserves backend payment states when mapping orders', () => {
    const base = {
      id: 99,
      numero: 'KMG-0099',
      token_seguimiento: 'xyz',
      origen: 'online' as const,
      nombre_cliente: 'Cliente',
      mesa: null,
      telefono_cliente: null,
      telefono_whatsapp: null,
      estado_pedido: 'recibido',
      metodo_pago: 'transferencia' as const,
      total: '100',
      observaciones: null,
      comprobante_archivo_id: null,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      items: [],
    } as const

    const withComprobante = apiToOrder({
      ...base,
      estado_pago: 'comprobante_subido',
      comprobante_archivo_id: 42,
    })

    const withRejected = apiToOrder({
      ...base,
      id: 100,
      numero: 'KMG-0100',
      estado_pago: 'rechazado',
    })

    const withPaid = apiToOrder({
      ...base,
      id: 101,
      numero: 'KMG-0101',
      estado_pago: 'pagado',
    })

    expect(withComprobante.payStatus).toBe('comprobante_subido')
    expect(withRejected.payStatus).toBe('rechazado')
    expect(withPaid.payStatus).toBe('pagado')
  })

  it('maps a pedido without items (empty lines)', () => {
    const api: ApiPedido = {
      id: 2,
      numero: 'KMG-0002',
      token_seguimiento: 'def',
      origen: 'caja',
      nombre_cliente: 'Test 2',
      mesa: null,
      telefono_cliente: null,
      telefono_whatsapp: null,
      estado_pedido: 'listo',
      estado_pago: 'pagado',
      metodo_pago: 'transferencia',
      total: '0',
      observaciones: null,
      comprobante_archivo_id: null,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      items: [],
    }
    const o = apiToOrder(api)
    expect(o.total).toBe(0)
    expect(o.lines).toEqual([])
    expect(o.table).toBeUndefined()
    expect(o.phone).toBeUndefined()
  })

  it('treats comprobante_archivo_id non-null as receipt', () => {
    const api: ApiPedido = {
      id: 3,
      numero: 'KMG-0003',
      token_seguimiento: 'ghi',
      origen: 'online',
      nombre_cliente: 'Test 3',
      mesa: null,
      telefono_cliente: null,
      telefono_whatsapp: null,
      estado_pedido: 'recibido',
      estado_pago: 'comprobante_subido',
      metodo_pago: 'transferencia',
      total: '1000',
      observaciones: null,
      comprobante_archivo_id: 42,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      items: [],
    }
    const o = apiToOrder(api)
    expect(o.hasReceipt).toBe(true)
  })

  it('handles a list-item shape (without items field)', () => {
    const api: ApiPedidoListItem = {
      id: 4,
      numero: 'KMG-0004',
      token_seguimiento: 'jkl',
      origen: 'caja',
      nombre_cliente: 'Test 4',
      mesa: null,
      telefono_cliente: null,
      telefono_whatsapp: null,
      estado_pedido: 'en_preparacion',
      estado_pago: 'pendiente',
      metodo_pago: 'efectivo',
      total: '2000',
      observaciones: null,
      comprobante_archivo_id: null,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    }
    const o = apiToOrder(api)
    expect(o.status).toBe('preparacion') // mapped from en_preparacion
    expect(o.lines).toEqual([]) // no items field
  })
})

describe('orderStatusToApi', () => {
  it('maps preparacion to en_preparacion', () => {
    expect(orderStatusToApi('preparacion')).toBe('en_preparacion')
  })

  it('maps recibido to recibido (legacy support)', () => {
    expect(orderStatusToApi('recibido')).toBe('recibido')
  })

  it('maps listo to listo', () => {
    expect(orderStatusToApi('listo')).toBe('listo')
  })

  it('maps entregado to entregado', () => {
    expect(orderStatusToApi('entregado')).toBe('entregado')
  })

  it('maps cancelado to cancelado', () => {
    expect(orderStatusToApi('cancelado')).toBe('cancelado')
  })
})

describe('apiToCocinaOrder', () => {
  it('maps with items', () => {
    const items: ApiItem[] = [
      {
        producto_id: 10,
        nombre_producto: 'Pizza',
        precio_unitario: '2500.00',
        cantidad: 2,
        subtotal: '5000.00',
      },
    ]
    const header: ApiCocinaPedido = {
      id: 1,
      numero: 'KMG-0001',
      nombre_cliente: 'Test',
      mesa: '5',
      estado_pedido: 'recibido',
      estado_pago: 'pendiente',
      observaciones: 'sin cebolla',
      total: '5000.00',
      created_at: '2024-01-01T00:00:00.000Z',
      cantidad_items: 1,
    }
    const o = apiToCocinaOrder(header, items)
    expect(o.id).toBe('1')
    expect(o.customer).toBe('Test')
    expect(o.status).toBe('recibido')
    expect(o.lines).toHaveLength(1)
    expect(o.lines[0].name).toBe('Pizza')
    expect(o.lines[0].qty).toBe(2)
    expect(o.lines[0].price).toBe(2500)
    expect(o.payStatus).toBe('pendiente')
  })

  it('maps without items (empty lines)', () => {
    const header: ApiCocinaPedido = {
      id: 2,
      numero: 'KMG-0002',
      nombre_cliente: 'Test 2',
      mesa: null,
      estado_pedido: 'listo',
      estado_pago: 'pagado',
      observaciones: null,
      total: '0',
      created_at: '2024-01-01T00:00:00.000Z',
      cantidad_items: 0,
    }
    const o = apiToCocinaOrder(header, undefined)
    expect(o.payStatus).toBe('pagado')
    expect(o.lines).toEqual([])
    expect(o.table).toBeUndefined()
  })

  it('preserves payment status in cocina orders', () => {
    const items: ApiItem[] = [
      {
        producto_id: 20,
        nombre_producto: 'Gomita',
        precio_unitario: 1200,
        cantidad: 1,
        subtotal: 1200,
      },
    ]

    const header: ApiCocinaPedido = {
      id: 3,
      numero: 'KMG-0103',
      nombre_cliente: 'Test 3',
      mesa: null,
      estado_pedido: 'listo',
      estado_pago: 'rechazado',
      observaciones: 'Sin hielo',
      total: '1200',
      created_at: '2024-01-01T00:00:00.000Z',
      cantidad_items: 1,
    }

    const o = apiToCocinaOrder(header, items)
    expect(o.payStatus).toBe('rechazado')
  })

  it('maps item imagen_url to absolute image URL', () => {
    const items: ApiItem[] = [
      {
        producto_id: 10,
        nombre_producto: 'Pizza',
        precio_unitario: '2500.00',
        cantidad: 2,
        subtotal: '5000.00',
        imagen_url: '/api/productos/10/imagen?v=42',
      },
    ]
    const header: ApiCocinaPedido = {
      id: 4,
      numero: 'KMG-0004',
      nombre_cliente: 'Test 4',
      mesa: null,
      estado_pedido: 'en_preparacion',
      estado_pago: 'pagado',
      observaciones: null,
      total: '5000.00',
      created_at: '2024-01-01T00:00:00.000Z',
      cantidad_items: 1,
    }
    const o = apiToCocinaOrder(header, items)
    expect(o.lines[0].image).toBe('http://localhost:3001/api/productos/10/imagen?v=42')
  })

  it('leaves image undefined when item has no imagen_url', () => {
    const items: ApiItem[] = [
      {
        producto_id: 11,
        nombre_producto: 'Sin foto',
        precio_unitario: '1000',
        cantidad: 1,
        subtotal: '1000',
        imagen_url: null,
      },
    ]
    const header: ApiCocinaPedido = {
      id: 5,
      numero: 'KMG-0005',
      nombre_cliente: 'Test 5',
      mesa: null,
      estado_pedido: 'listo',
      estado_pago: 'pendiente',
      observaciones: null,
      total: '1000',
      created_at: '2024-01-01T00:00:00.000Z',
      cantidad_items: 1,
    }
    const o = apiToCocinaOrder(header, items)
    expect(o.lines[0].image).toBeUndefined()
  })
})

describe('apiToCajaProduct', () => {
  it('maps a product with image', () => {
    const api: ApiProducto = {
      id: 1,
      nombre: 'Pizza',
      descripcion: 'x',
      precio: '100',
      tipo: 'comida',
      stock_limitado: 1,
      stock_actual: 5,
      stock_minimo_alerta: 0,
      activo: 1,
      imagen_archivo_id: 42,
      imagen_nombre_original: 'pizza.jpg',
      imagen_mime_type: 'image/jpeg',
      imagen_tamanio_bytes: 12345,
      imagen_url: '/api/productos/1/imagen?v=42',
      categorias: 'Cena',
    }
    const p = apiToCajaProduct(api)
    expect(p.id).toBe(1)
    expect(p.name).toBe('Pizza')
    expect(p.price).toBe(100)
    expect(p.type).toBe('comida')
    expect(p.meals).toEqual(['cena'])
    expect(p.image).toBe('http://localhost:3001/api/productos/1/imagen?v=42')
    expect(p.stockLimited).toBe(true)
    expect(p.stockActual).toBe(5)
  })

  it('maps a product without image', () => {
    const api: ApiProducto = {
      id: 2,
      nombre: 'Item',
      descripcion: 'x',
      precio: '100',
      tipo: 'bebida',
      stock_limitado: 0,
      stock_actual: null,
      stock_minimo_alerta: 0,
      activo: 1,
      imagen_archivo_id: null,
      imagen_nombre_original: null,
      imagen_mime_type: null,
      imagen_tamanio_bytes: null,
      imagen_url: null,
      categorias: 'Merienda',
    }
    const p = apiToCajaProduct(api)
    expect(p.image).toBeUndefined()
    expect(p.stockLimited).toBe(false)
    expect(p.stockActual).toBe(null)
    expect(p.meals).toEqual(['merienda'])
  })

  it('parses "Merienda, Cena" to meals ["merienda", "cena"]', () => {
    const api: ApiProducto = {
      id: 3,
      nombre: 'Helados palito',
      descripcion: 'x',
      precio: '500',
      tipo: 'comida',
      stock_limitado: 1,
      stock_actual: 10,
      stock_minimo_alerta: 2,
      activo: 1,
      imagen_archivo_id: null,
      imagen_nombre_original: null,
      imagen_mime_type: null,
      imagen_tamanio_bytes: null,
      imagen_url: null,
      categorias: 'Merienda, Cena',
    }
    const p = apiToCajaProduct(api)
    expect(p.meals).toEqual(['merienda', 'cena'])
  })

  it('parses null categorias to meals []', () => {
    const api: ApiProducto = {
      id: 4,
      nombre: 'Agua',
      descripcion: null,
      precio: '1000',
      tipo: 'bebida',
      stock_limitado: 0,
      stock_actual: null,
      stock_minimo_alerta: 0,
      activo: 1,
      imagen_archivo_id: null,
      imagen_nombre_original: null,
      imagen_mime_type: null,
      imagen_tamanio_bytes: null,
      imagen_url: null,
      categorias: null,
    }
    const p = apiToCajaProduct(api)
    expect(p.meals).toEqual([])
  })

  it('parses empty string categorias to meals []', () => {
    const api: ApiProducto = {
      id: 5,
      nombre: 'Gaseosa',
      descripcion: null,
      precio: '1500',
      tipo: 'bebida',
      stock_limitado: 0,
      stock_actual: null,
      stock_minimo_alerta: 0,
      activo: 1,
      imagen_archivo_id: null,
      imagen_nombre_original: null,
      imagen_mime_type: null,
      imagen_tamanio_bytes: null,
      imagen_url: null,
      categorias: '',
    }
    const p = apiToCajaProduct(api)
    expect(p.meals).toEqual([])
  })
})

describe('isCajaSoldOut', () => {
  it('true when stockLimited and stockActual is 0', () => {
    expect(
      isCajaSoldOut({ stockLimited: true, stockActual: 0, stockMinimoAlerta: 5 } as never),
    ).toBe(true)
  })

  it('false when stockLimited and stockActual > 0', () => {
    expect(
      isCajaSoldOut({ stockLimited: true, stockActual: 5, stockMinimoAlerta: 5 } as never),
    ).toBe(false)
  })

  it('false when stockLimited is false (unlimited)', () => {
    expect(
      isCajaSoldOut({ stockLimited: false, stockActual: 0, stockMinimoAlerta: 5 } as never),
    ).toBe(false)
  })

  it('true when stockActual is null (limited but no stock info — treat as sold out to be safe)', () => {
    expect(
      isCajaSoldOut({ stockLimited: true, stockActual: null, stockMinimoAlerta: 5 } as never),
    ).toBe(true)
  })
})

describe('isCajaLowStock', () => {
  it('true when stockActual <= minimo and > 0', () => {
    expect(
      isCajaLowStock({ stockLimited: true, stockActual: 3, stockMinimoAlerta: 5 } as never),
    ).toBe(true)
    expect(
      isCajaLowStock({ stockLimited: true, stockActual: 1, stockMinimoAlerta: 5 } as never),
    ).toBe(true)
  })

  it('false when stockActual is 0 (sold out, not low)', () => {
    expect(
      isCajaLowStock({ stockLimited: true, stockActual: 0, stockMinimoAlerta: 5 } as never),
    ).toBe(false)
  })

  it('false when stockActual > minimo', () => {
    expect(
      isCajaLowStock({ stockLimited: true, stockActual: 10, stockMinimoAlerta: 5 } as never),
    ).toBe(false)
  })

  it('false when stockLimited is false (unlimited)', () => {
    expect(
      isCajaLowStock({ stockLimited: false, stockActual: 3, stockMinimoAlerta: 5 } as never),
    ).toBe(false)
  })
})

describe('mapOrderStatus', () => {
  it('maps recibido to recibido (legacy support)', () => {
    expect(mapOrderStatus('recibido')).toBe('recibido')
  })

  it('maps en_preparacion to preparacion', () => {
    expect(mapOrderStatus('en_preparacion')).toBe('preparacion')
  })

  it('maps listo to listo', () => {
    expect(mapOrderStatus('listo')).toBe('listo')
  })

  it('maps entregado to entregado', () => {
    expect(mapOrderStatus('entregado')).toBe('entregado')
  })

  it('maps cancelado to cancelado', () => {
    expect(mapOrderStatus('cancelado')).toBe('cancelado')
  })

  it('maps unknown to preparacion (default)', () => {
    expect(mapOrderStatus('unknown-state')).toBe('preparacion')
  })
})

describe('mapPayStatus', () => {
  it.each([
    ['pendiente', 'pendiente'],
    ['comprobante_subido', 'comprobante_subido'],
    ['pagado', 'pagado'],
    ['rechazado', 'rechazado'],
  ] as const)('maps %s to %s', (source, expected) => {
    expect(mapPayStatus(source)).toBe(expected)
  })

  it('falls back unknown payment state to pendiente', () => {
    expect(mapPayStatus('estado_extrano')).toBe('pendiente')
  })
})

describe('apiToAdminReportes', () => {
  it('normalizes reportes payload to frontend shape', () => {
    const source: ApiReportes = {
      total_recaudado: 12800,
      total_efectivo: 3000,
      total_transferencia: 9800,
      pedidos_pagados: 14,
      productos_vendidos: 44,
      pedidos_pendientes_pago: 1,
      monto_pendiente_pago: 2500,
      producto_top: {
        producto_id: 7,
        nombre: 'Empanadas x12',
        cantidad: 12,
      },
      ranking_productos: [
        {
          producto_id: 7,
          nombre: 'Empanadas x12',
          cantidad: 12,
        },
        {
          producto_id: 8,
          nombre: 'Mini churro',
          cantidad: 9,
        },
      ],
      actualizado_en: '2026-06-17T12:00:00.000Z',
    }

    const reportes = apiToAdminReportes(source)

    expect(reportes.totalRecaudado).toBe(12800)
    expect(reportes.totalEfectivo).toBe(3000)
    expect(reportes.totalTransferencia).toBe(9800)
    expect(reportes.pedidosPendientesPago).toBe(1)
    expect(reportes.productoTop).toEqual({ productoId: 7, nombre: 'Empanadas x12', cantidad: 12 })
    expect(reportes.rankingProductos).toHaveLength(2)
    expect(reportes.rankingProductos[1]).toEqual({ productoId: 8, nombre: 'Mini churro', cantidad: 9 })
  })

  it('handles missing ranking entries gracefully', () => {
    const source = {
      total_recaudado: 0,
      total_efectivo: 0,
      total_transferencia: 0,
      pedidos_pagados: 0,
      productos_vendidos: 0,
      pedidos_pendientes_pago: 0,
      monto_pendiente_pago: 0,
      producto_top: null,
      ranking_productos: [{ producto_id: 1, nombre: 'Sorpresa', cantidad: 0 }],
      actualizado_en: '2026-06-17T12:00:00.000Z',
    } as ApiReportes

    const reportes = apiToAdminReportes(source)

    expect(reportes.productoTop).toBeNull()
    expect(reportes.rankingProductos).toHaveLength(1)
    expect(reportes.rankingProductos[0]).toEqual({ productoId: 1, nombre: 'Sorpresa', cantidad: 0 })
  })
})
