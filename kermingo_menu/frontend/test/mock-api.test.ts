import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('mock API mode', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('NEXT_PUBLIC_MOCK_API', 'true')
    if (typeof localStorage !== 'undefined') {
      localStorage.clear()
    }
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('isMockApi reads the flag', async () => {
    const { isMockApi } = await import('@/lib/mocks/mode')
    expect(isMockApi()).toBe(true)
  })

  it('returns public product fixtures via apiGet', async () => {
    const { apiGet } = await import('@/lib/api')
    const productos = await apiGet<Array<{ id: number; nombre: string }>>('/api/productos')
    expect(productos.length).toBeGreaterThan(10)
    expect(productos[0]?.nombre).toBeTruthy()
    expect(productos[0]?.id).toBe(1)
  })

  it('keeps product 14 image fields null in the fixture and public endpoint', async () => {
    const [{ apiGet }, { MOCK_PRODUCTOS }] = await Promise.all([
      import('@/lib/api'),
      import('@/lib/mocks/fixtures'),
    ])
    const expected = {
      imagen_archivo_id: null,
      imagen_nombre_original: null,
      imagen_mime_type: null,
      imagen_tamanio_bytes: null,
      imagen_url: null,
    }

    expect(MOCK_PRODUCTOS.find((producto) => producto.id === 14)).toMatchObject(expected)
    await expect(apiGet('/api/productos/14')).resolves.toMatchObject(expected)
  })

  it('keeps public checkout open in demo', async () => {
    const { apiGet } = await import('@/lib/api')
    const config = await apiGet<{ estado: string }>('/api/configuracion-tienda')
    expect(config.estado).toBe('abierta')
  })

  it.each([
    [{ estado: 'abierta' }, { estado: 'abierta' }],
    [{ mensaje_publico: null }, { mensaje_publico: null }],
    [{ cena_habilitada_desde: '20:30:00' }, { cena_habilitada_desde: '20:30:00' }],
    [{ cena_habilitada_desde: null }, { cena_habilitada_desde: null }],
    [{ categoria_default: 'cena' }, { categoria_default: 'cena' }],
  ])('returns complete config for partial PUT body %j without persisting it', async (body, expected) => {
    const { apiGet, apiPut } = await import('@/lib/api')
    const updated = await apiPut<Record<string, unknown>>('/api/admin/configuracion-tienda', body)
    const unchanged = await apiGet<Record<string, unknown>>('/api/admin/configuracion-tienda')

    expect(updated).toEqual(expect.objectContaining({
      id: 1,
      estado: 'cerrada',
      mensaje_publico: expect.any(String),
      cena_habilitada_desde: null,
      categoria_default: 'merienda',
      ...expected,
    }))
    expect(unchanged).toMatchObject({
      estado: 'cerrada',
      mensaje_publico: expect.any(String),
      cena_habilitada_desde: null,
      categoria_default: 'merienda',
    })
  })

  it('rejects arbitrary config fields', async () => {
    const { apiPut } = await import('@/lib/api')

    await expect(apiPut('/api/admin/configuracion-tienda', {
      estado: 'abierta',
      isAdmin: true,
    })).rejects.toMatchObject({ name: 'ApiError', status: 400 })
  })

  it('returns the component array after saving promo components', async () => {
    const { apiPut } = await import('@/lib/api')
    const componentes = await apiPut<Array<{ producto_id: number; cantidad: number }>>(
      '/api/admin/productos/23/componentes',
      { componentes: [{ producto_id: 10, cantidad: 3 }] },
    )

    expect(componentes).toEqual(expect.arrayContaining([
      expect.objectContaining({ producto_id: 10, cantidad: 3 }),
    ]))
  })

  it('creates an exact nonpersistent ApiProducto from the validated create body', async () => {
    const { apiGet, apiPost } = await import('@/lib/api')
    const body = {
      nombre: 'Promo nueva', precio: 4200, tipo: 'promo', categorias: ['Merienda'],
      stock_limitado: 0, injected: 'no',
    }

    await expect(apiPost('/api/admin/productos', body)).rejects.toMatchObject({ status: 400 })
    delete (body as { injected?: string }).injected
    const created = await apiPost<Record<string, unknown>>('/api/admin/productos', body)

    expect(created).toEqual({
      id: expect.any(Number), nombre: 'Promo nueva', descripcion: null, precio: 4200,
      tipo: 'promo', stock_limitado: 0, stock_actual: null, stock_minimo_alerta: 5,
      activo: 1, disponible: 1, orden: expect.any(Number), imagen_archivo_id: null,
      imagen_nombre_original: null, imagen_mime_type: null, imagen_tamanio_bytes: null,
      imagen_url: null, categorias: 'Merienda', componentes_count: 0,
    })
    expect((await apiGet<{ productos: Array<{ id: number }> }>('/api/admin/productos', { estado: 'todos' })).productos)
      .not.toContainEqual(expect.objectContaining({ id: created.id }))
  })

  it('echoes validated promo updates and resolves component bodies for new ids', async () => {
    const { apiPut } = await import('@/lib/api')
    const updated = await apiPut<Record<string, unknown>>('/api/admin/productos/999', {
      nombre: 'Promo editada', disponible: 0, categorias: ['Cena'],
    })
    const components = await apiPut<Array<Record<string, unknown>>>('/api/admin/productos/999/componentes', {
      componentes: [{ producto_id: 10, cantidad: 2 }],
    })

    expect(updated).toEqual(expect.objectContaining({ id: 999, nombre: 'Promo editada', disponible: 0, categorias: 'Cena' }))
    expect(components).toEqual([expect.objectContaining({ producto_id: 10, nombre: expect.any(String), cantidad: 2 })])
  })

  it('edits an order from the strict body and recalculates authoritative items and total', async () => {
    const { apiGet, apiPut } = await import('@/lib/api')
    const before = await apiGet<Record<string, unknown>>('/api/admin/pedidos/1')
    const edited = await apiPut<Record<string, unknown>>('/api/admin/pedidos/1', {
      nombre_cliente: 'Cliente corregido', mesa: '', telefono_cliente: '', observaciones: '',
      items: [{ producto_id: 5, cantidad: 2 }],
    })

    expect(edited).toEqual(expect.objectContaining({
      id: 1, nombre_cliente: 'Cliente corregido', mesa: null, telefono_cliente: null,
      observaciones: null, total: 5000,
      items: [expect.objectContaining({ producto_id: 5, nombre_producto: 'Pancho', cantidad: 2, subtotal: 5000 })],
    }))
    await expect(apiGet('/api/admin/pedidos/1')).resolves.toEqual(before)
    await expect(apiPut('/api/admin/pedidos/1', { total: 1 })).rejects.toMatchObject({ status: 400 })
    await expect(apiPut('/api/admin/pedidos/1', { items: [{ producto_id: 999, cantidad: 1 }] })).rejects.toMatchObject({ status: 400 })
  })

  it.each([
    ['activo', (p: { activo: number; disponible: number; stock_limitado: number; stock_actual: number | null }) => p.activo === 1 && p.disponible === 1 && (p.stock_limitado === 0 || p.stock_actual === null || p.stock_actual > 0)],
    ['agotado', (p: { activo: number; disponible: number; stock_limitado: number; stock_actual: number | null }) => p.activo === 1 && p.disponible === 1 && p.stock_limitado === 1 && (p.stock_actual ?? 0) <= 0],
    ['todavia_no_disponible', (p: { activo: number; disponible: number }) => p.activo === 1 && p.disponible === 0],
    ['desactivado', (p: { activo: number }) => p.activo === 0],
    ['inactivo', (p: { activo: number }) => p.activo === 0],
  ])('matches buildWhereAdmin behavior for product filter %s', async (estado, predicate) => {
    const [{ apiGet }, { MOCK_PRODUCTOS }] = await Promise.all([import('@/lib/api'), import('@/lib/mocks/fixtures')])
    const result = await apiGet<{ productos: typeof MOCK_PRODUCTOS; paginacion: { total: number } }>('/api/admin/productos', { estado })
    const expected = MOCK_PRODUCTOS.filter(predicate)
    expect(result.productos).toEqual(expected)
    expect(result.paginacion.total).toBe(expected.length)
  })

  it.each(['todos', undefined])('does not apply product state or schedule filters for %s', async (estado) => {
    const [{ apiGet }, { MOCK_PRODUCTOS }] = await Promise.all([import('@/lib/api'), import('@/lib/mocks/fixtures')])
    const result = await apiGet<{ productos: typeof MOCK_PRODUCTOS }>('/api/admin/productos', { estado, horario: 'cena' })
    expect(result.productos).toEqual(MOCK_PRODUCTOS)
  })

  it('applies the buildWhereAdmin tipo filter without applying horarios', async () => {
    const [{ apiGet }, { MOCK_PRODUCTOS }] = await Promise.all([import('@/lib/api'), import('@/lib/mocks/fixtures')])
    const result = await apiGet<{ productos: typeof MOCK_PRODUCTOS }>('/api/admin/productos', {
      estado: 'todos', tipo: 'promo', horario: 'merienda',
    })
    expect(result.productos).toEqual(MOCK_PRODUCTOS.filter((producto) => producto.tipo === 'promo'))
  })

  it('returns only en_preparacion and listo orders from the kitchen endpoint', async () => {
    const { apiGet } = await import('@/lib/api')
    const pedidos = await apiGet<Array<{ id: number; estado_pedido: string }>>(
      '/api/admin/cocina/pedidos',
    )

    expect(pedidos.length).toBeGreaterThan(0)
    expect(pedidos.every((pedido) =>
      ['en_preparacion', 'listo'].includes(pedido.estado_pedido))).toBe(true)
    expect(pedidos.some((pedido) => pedido.estado_pedido === 'recibido')).toBe(false)
  })

  it.each([
    ['estado_pedido', { estado_pedido: 'entregado' }, [2, 1]],
    ['excluir_estado_pedido', { excluir_estado_pedido: 'entregado' }, [5, 4, 3]],
    ['metodo_pago', { metodo_pago: 'efectivo' }, [4, 2]],
    ['estado_pago', { estado_pago: 'comprobante_subido' }, [3]],
    ['origen', { origen: 'caja' }, [4, 2]],
    ['buscar cliente', { buscar: 'Demo 4' }, [4]],
    ['buscar numero', { buscar: 'KMG-0005' }, [5]],
    ['buscar telefono', { buscar: '1199001002' }, [2]],
    ['buscar mesa', { buscar: 'Barra' }, [4]],
  ])('filters admin orders by %s before pagination', async (_case, query, expectedIds) => {
    const { apiGet } = await import('@/lib/api')
    const result = await apiGet<{
      pedidos: Array<{ id: number }>
      paginacion: { total: number }
    }>('/api/admin/pedidos', { ...query, page: 1, limit: 1 })

    expect(result.paginacion.total).toBe(expectedIds.length)
    expect(result.pedidos.map((pedido) => pedido.id)).toEqual(expectedIds.slice(0, 1))
  })

  it('treats solo_pagos_pendientes as pendiente/rechazado, excludes cancelados, and overrides estado_pago', async () => {
    const { apiGet } = await import('@/lib/api')
    const result = await apiGet<{
      pedidos: Array<{ id: number }>
      paginacion: { total: number }
    }>('/api/admin/pedidos', {
      solo_pagos_pendientes: 'true',
      estado_pago: 'pagado',
    })

    expect(result).toMatchObject({ pedidos: [], paginacion: { total: 0 } })
  })

  it('derives report totals and ranking from paid, non-cancelled mock orders', async () => {
    const [{ apiGet }, { MOCK_PEDIDOS }] = await Promise.all([
      import('@/lib/api'),
      import('@/lib/mocks/fixtures'),
    ])
    const paid = MOCK_PEDIDOS.filter((pedido) =>
      pedido.estado_pago === 'pagado' && pedido.estado_pedido !== 'cancelado')
    const ranking = new Map<number, { producto_id: number; nombre: string; cantidad: number; total_recaudado: number }>()
    for (const pedido of paid) {
      for (const item of pedido.items) {
        const current = ranking.get(item.producto_id) ?? {
          producto_id: item.producto_id,
          nombre: item.nombre_producto,
          cantidad: 0,
          total_recaudado: 0,
        }
        current.cantidad += item.cantidad
        current.total_recaudado += item.subtotal
        ranking.set(item.producto_id, current)
      }
    }
    const expectedRanking = [...ranking.values()].sort((a, b) =>
      b.cantidad - a.cantidad || a.producto_id - b.producto_id)
    const reportes = await apiGet<Record<string, unknown>>('/api/admin/reportes')

    expect(reportes).toMatchObject({
      total_recaudado: paid.reduce((sum, pedido) => sum + pedido.total, 0),
      total_efectivo: paid.filter((pedido) => pedido.metodo_pago === 'efectivo').reduce((sum, pedido) => sum + pedido.total, 0),
      total_transferencia: paid.filter((pedido) => pedido.metodo_pago === 'transferencia').reduce((sum, pedido) => sum + pedido.total, 0),
      pedidos_pagados: paid.length,
      productos_vendidos: paid.flatMap((pedido) => pedido.items).reduce((sum, item) => sum + item.cantidad, 0),
      pedidos_pendientes_pago: 0,
      monto_pendiente_pago: 0,
      producto_top: expectedRanking[0],
      ranking_productos: expectedRanking,
    })
  })

  it('creates a complete demo order from FormData without network', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const { apiPostForm } = await import('@/lib/api')
    const form = new FormData()
    form.set('nombre_cliente', 'Ana Demo')
    form.set('mesa', '4')
    form.set('telefono_cliente', '2915551234')
    form.set('observaciones', 'Sin cebolla')
    form.set('metodo_pago', 'transferencia')
    form.set('items', JSON.stringify([
      { producto_id: 1, cantidad: 2 },
      { producto_id: 15, cantidad: 1 },
    ]))
    form.set('comprobante', new File(['ignored'], 'comprobante.pdf', { type: 'application/pdf' }))

    const pedido = await apiPostForm<{
      id: number
      numero: string
      token_seguimiento: string
      total: number
      estado_pedido: string
      estado_pago: string
      origen: string
      items: Array<{ producto_id: number; cantidad: number; subtotal: number }>
    }>('/api/pedidos', form)

    expect(pedido).toMatchObject({
      numero: expect.stringMatching(/^KMG-DEMO-/),
      token_seguimiento: expect.any(String),
      total: 9000,
      estado_pedido: 'en_preparacion',
      estado_pago: 'pagado',
      origen: 'online',
      items: [
        { producto_id: 1, cantidad: 2, subtotal: 7000 },
        { producto_id: 15, cantidad: 1, subtotal: 2000 },
      ],
    })
    expect(pedido.id).toBeGreaterThan(0)
    expect(pedido.token_seguimiento).toHaveLength(32)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('kermingo:demoOrders')).not.toContain('ignored')
  })

  it('returns the demo order created in this tab by tracking token', async () => {
    const { apiGet, apiPostForm } = await import('@/lib/api')
    const form = new FormData()
    form.set('nombre_cliente', 'Ana Demo')
    form.set('items', JSON.stringify([{ producto_id: 5, cantidad: 2 }]))

    const created = await apiPostForm<{ token_seguimiento: string }>('/api/pedidos', form)
    const tracked = await apiGet<{
      token_seguimiento: string
      nombre_cliente: string
      total: number
      estado_pedido: string
    }>(`/api/pedidos/seguimiento/${created.token_seguimiento}`)

    expect(tracked).toMatchObject({
      token_seguimiento: created.token_seguimiento,
      nombre_cliente: 'Ana Demo',
      total: 5000,
      estado_pedido: 'en_preparacion',
    })
  })

  it.each([
    ['body inválido', null],
    ['items ausentes', new FormData()],
    ['items malformados', (() => { const form = new FormData(); form.set('items', 'no-json'); return form })()],
    ['items vacíos', (() => { const form = new FormData(); form.set('items', '[]'); return form })()],
    ['producto inexistente', (() => { const form = new FormData(); form.set('items', '[{"producto_id":999,"cantidad":1}]'); return form })()],
    ['cantidad inválida', (() => { const form = new FormData(); form.set('items', '[{"producto_id":1,"cantidad":0}]'); return form })()],
  ])('rejects %s with a basic validation error', async (_case, body) => {
    const { mockApiRequest } = await import('@/lib/mocks/adapter')
    await expect(mockApiRequest('POST', '/api/pedidos', undefined, body)).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
    })
  })

  it('accepts demo login and me()', async () => {
    const { mockLogin, mockMe, mockLogout } = await import('@/lib/mocks/adapter')
    const user = await mockLogin('admin@kermingo.com', 'admin123')
    expect(user.email).toBe('admin@kermingo.com')
    const me = await mockMe()
    expect(me.email).toBe('admin@kermingo.com')
    await mockLogout()
    await expect(mockMe()).rejects.toMatchObject({ name: 'ApiError', status: 401 })
  })

  it('rejects wrong demo password', async () => {
    const { mockLogin } = await import('@/lib/mocks/adapter')
    await expect(mockLogin('admin@kermingo.com', 'wrong')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
    })
  })
})
