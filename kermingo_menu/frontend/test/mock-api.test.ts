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

  it('keeps a created product coherent through the in-memory adapter lifecycle only', async () => {
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
    const id = Number(created.id)
    expect((await apiGet<{ productos: Array<{ id: number }> }>('/api/admin/productos', { estado: 'todos' })).productos)
      .toContainEqual(expect.objectContaining({ id }))
    await expect(apiGet(`/api/productos/${id}`)).resolves.toMatchObject({ id, nombre: 'Promo nueva' })

    const { apiDelete, apiPatch, apiPostForm, apiPut } = await import('@/lib/api')
    await expect(apiPut(`/api/admin/productos/${id}`, {
      nombre: 'Promo editada', stock_limitado: 1, stock_actual: 3,
    })).resolves.toMatchObject({ id, nombre: 'Promo editada', stock_limitado: 1, stock_actual: 3 })
    await expect(apiPatch(`/api/admin/productos/${id}/stock`, { stock_actual: 0 }))
      .resolves.toMatchObject({ id, stock_actual: 0 })
    expect((await apiGet<{ productos: Array<{ id: number }> }>('/api/admin/productos', { estado: 'agotado' })).productos)
      .toContainEqual(expect.objectContaining({ id }))
    await expect(apiPatch(`/api/admin/productos/${id}/desactivar`, {}))
      .resolves.toMatchObject({ id, activo: 0 })
    expect((await apiGet<{ productos: Array<{ id: number }> }>('/api/admin/productos', { estado: 'desactivado' })).productos)
      .toContainEqual(expect.objectContaining({ id }))
    await expect(apiPatch(`/api/admin/productos/${id}/recuperar`, {}))
      .resolves.toMatchObject({ id, activo: 1 })
    await expect(apiPut(`/api/admin/productos/${id}/componentes`, {
      componentes: [{ producto_id: 10, cantidad: 2 }],
    })).resolves.toEqual([expect.objectContaining({ producto_id: 10, cantidad: 2 })])
    await expect(apiGet(`/api/admin/productos/${id}/componentes`))
      .resolves.toEqual([expect.objectContaining({ producto_id: 10, cantidad: 2 })])
    await expect(apiGet(`/api/productos/${id}`)).resolves.toMatchObject({ componentes_count: 1 })

    const form = new FormData()
    form.set('imagen', new File(['demo'], 'synthetic.png', { type: 'image/png' }))
    await expect(apiPostForm(`/api/admin/productos/${id}/imagen`, form))
      .resolves.toMatchObject({ id, imagen_nombre_original: 'synthetic.png' })
    await expect(apiGet(`/api/productos/${id}`)).resolves.toMatchObject({ imagen_nombre_original: 'synthetic.png' })
    await expect(apiDelete(`/api/admin/productos/${id}/imagen`))
      .resolves.toMatchObject({ id, imagen_url: null })
    await expect(apiGet(`/api/productos/${id}`)).resolves.toMatchObject({ imagen_url: null })

    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
    vi.resetModules()
    const { apiGet: freshApiGet } = await import('@/lib/api')
    await expect(freshApiGet(`/api/productos/${id}`)).rejects.toMatchObject({ status: 404 })
  })

  it('updates a created promo and resolves its component bodies', async () => {
    const { apiPost, apiPut } = await import('@/lib/api')
    const created = await apiPost<{ id: number }>('/api/admin/productos', {
      nombre: 'Promo temporal', precio: 4200, tipo: 'promo', categorias: ['Merienda'], stock_limitado: 0,
    })
    const updated = await apiPut<Record<string, unknown>>(`/api/admin/productos/${created.id}`, {
      nombre: 'Promo editada', disponible: 0, categorias: ['Cena'],
    })
    const components = await apiPut<Array<Record<string, unknown>>>(`/api/admin/productos/${created.id}/componentes`, {
      componentes: [{ producto_id: 10, cantidad: 2 }],
    })

    expect(updated).toEqual(expect.objectContaining({ id: created.id, nombre: 'Promo editada', disponible: 0, categorias: 'Cena' }))
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

  it('returns a nonpersistent order with the requested admin state', async () => {
    const { apiGet, apiPatch } = await import('@/lib/api')
    const before = await apiGet<Record<string, unknown>>('/api/admin/pedidos/1')
    const updated = await apiPatch<Record<string, unknown>>('/api/admin/pedidos/1/estado', {
      estado_pedido: 'listo',
    })

    expect(updated).toMatchObject({ id: 1, estado_pedido: 'listo' })
    await expect(apiGet('/api/admin/pedidos/1')).resolves.toEqual(before)
  })

  it('returns a nonpersistent order with the requested payment state', async () => {
    const { apiPatch } = await import('@/lib/api')

    await expect(apiPatch('/api/admin/pedidos/1/pago', { estado_pago: 'rechazado' }))
      .resolves.toMatchObject({ id: 1, estado_pago: 'rechazado' })
    await expect(apiPatch('/api/admin/pedidos/1/pago', {
      estado_pago: 'pagado', extra: true,
    })).rejects.toMatchObject({ status: 400 })
    await expect(apiPatch('/api/admin/pedidos/1/pago', {
      estado_pago: 'inventado',
    })).rejects.toMatchObject({ status: 400 })
  })

  it.each([
    ['/api/admin/pedidos/1/estado', { estado_pedido: 'inventado' }],
    ['/api/admin/cocina/pedidos/1/estado', { estado_pedido: 'inventado' }],
  ])('rejects invalid backend order enums on %s', async (path, body) => {
    const { apiPatch } = await import('@/lib/api')
    await expect(apiPatch(path, body)).rejects.toMatchObject({ status: 400 })
  })

  it.each([
    ['/api/admin/pedidos/1/estado', { estado_pedido: 'listo', extra: true }],
    ['/api/admin/cocina/pedidos/1/estado', { estado_pedido: 'listo', extra: true }],
  ])('rejects extra state mutation fields on %s', async (path, body) => {
    const { apiPatch } = await import('@/lib/api')
    await expect(apiPatch(path, body)).rejects.toMatchObject({ status: 400 })
  })

  it('returns cancelar and aprobar mutations with their contract states', async () => {
    const { apiPatch } = await import('@/lib/api')

    await expect(apiPatch('/api/admin/pedidos/1/cancelar', {}))
      .resolves.toMatchObject({ id: 1, estado_pedido: 'cancelado' })
    await expect(apiPatch('/api/admin/pedidos/3/comprobante/aprobar', {}))
      .resolves.toMatchObject({ id: 3, estado_pago: 'pagado', estado_pedido: 'en_preparacion' })
    await expect(apiPatch('/api/admin/pedidos/1/cancelar', { extra: true }))
      .rejects.toMatchObject({ status: 400 })
    await expect(apiPatch('/api/admin/pedidos/3/comprobante/aprobar', { extra: true }))
      .rejects.toMatchObject({ status: 400 })
  })

  it('returns a nonpersistent kitchen order with the requested state', async () => {
    const { apiPatch } = await import('@/lib/api')

    await expect(apiPatch('/api/admin/cocina/pedidos/1/estado', { estado_pedido: 'listo' }))
      .resolves.toMatchObject({ id: 1, estado_pedido: 'listo' })
  })

  it('uploads a product image from exact FormData without persisting or creating an object URL', async () => {
    const objectUrlSpy = vi.spyOn(URL, 'createObjectURL')
    const { apiGet, apiPostForm } = await import('@/lib/api')
    const before = await apiGet<Record<string, unknown>>('/api/productos/14')
    const form = new FormData()
    form.set('imagen', new File(['demo'], 'producto.png', { type: 'image/png' }))

    const uploaded = await apiPostForm<Record<string, unknown>>('/api/admin/productos/14/imagen', form)

    expect(uploaded).toMatchObject({
      id: 14,
      imagen_archivo_id: expect.any(Number),
      imagen_nombre_original: 'producto.png',
      imagen_mime_type: 'image/png',
      imagen_tamanio_bytes: 4,
      imagen_url: expect.stringMatching(/^\/products\/\d+\.png$/),
    })
    expect(objectUrlSpy).not.toHaveBeenCalled()
    await expect(apiGet('/api/productos/14')).resolves.toEqual(before)
  })

  it('strictly validates product image upload FormData', async () => {
    const { apiPostForm } = await import('@/lib/api')
    const missing = new FormData()
    const extra = new FormData()
    extra.set('imagen', new File(['demo'], 'producto.png', { type: 'image/png' }))
    extra.set('extra', 'no')

    await expect(apiPostForm('/api/admin/productos/1/imagen', missing)).rejects.toMatchObject({ status: 400 })
    await expect(apiPostForm('/api/admin/productos/1/imagen', extra)).rejects.toMatchObject({ status: 400 })
  })

  it('deletes all five product image fields without persisting', async () => {
    const { apiDelete, apiGet } = await import('@/lib/api')
    const before = await apiGet<Record<string, unknown>>('/api/productos/1')
    const deleted = await apiDelete<Record<string, unknown>>('/api/admin/productos/1/imagen')

    expect(deleted).toMatchObject({
      id: 1,
      imagen_archivo_id: null,
      imagen_nombre_original: null,
      imagen_mime_type: null,
      imagen_tamanio_bytes: null,
      imagen_url: null,
    })
    await expect(apiGet('/api/productos/1')).resolves.toEqual(before)
    const { mockApiRequest } = await import('@/lib/mocks/adapter')
    await expect(mockApiRequest('DELETE', '/api/admin/productos/1/imagen', undefined, {}))
      .rejects.toMatchObject({ status: 400 })
  })

  it.each([
    ['PUT', '/api/admin/pedidos/1/estado', { estado_pedido: 'listo' }],
    ['POST', '/api/admin/pedidos/1/pago', { estado_pago: 'pagado' }],
    ['PUT', '/api/admin/pedidos/1/cancelar', {}],
    ['POST', '/api/admin/pedidos/3/comprobante/aprobar', {}],
    ['PUT', '/api/admin/cocina/pedidos/1/estado', { estado_pedido: 'listo' }],
    ['PUT', '/api/admin/productos/1/imagen', new FormData()],
    ['POST', '/api/admin/productos/1/imagen/extra', new FormData()],
    ['PATCH', '/api/admin/pedidos/1/estado/extra', { estado_pedido: 'listo' }],
  ])('does not route %s %s through the generic mutation fallback', async (method, path, body) => {
    const { mockApiRequest } = await import('@/lib/mocks/adapter')
    await expect(mockApiRequest(method, path, undefined, body)).rejects.toMatchObject({ status: 404 })
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
        current.total_recaudado += Number(item.subtotal)
        ranking.set(item.producto_id, current)
      }
    }
    const expectedRanking = [...ranking.values()].sort((a, b) =>
      b.cantidad - a.cantidad || a.producto_id - b.producto_id)
    const reportes = await apiGet<Record<string, unknown>>('/api/admin/reportes')

    expect(reportes).toMatchObject({
      total_recaudado: paid.reduce((sum, pedido) => sum + Number(pedido.total), 0),
      total_efectivo: paid.filter((pedido) => pedido.metodo_pago === 'efectivo').reduce((sum, pedido) => sum + Number(pedido.total), 0),
      total_transferencia: paid.filter((pedido) => pedido.metodo_pago === 'transferencia').reduce((sum, pedido) => sum + Number(pedido.total), 0),
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
