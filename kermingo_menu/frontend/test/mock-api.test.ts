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

  it('hides a deactivated ephemeral product from the public catalog', async () => {
    const { apiGet, apiPatch, apiPost } = await import('@/lib/api')
    const created = await apiPost<{ id: number }>('/api/admin/productos', {
      nombre: 'Producto temporal', precio: 1000, tipo: 'comida', categorias: ['Merienda'],
      stock_limitado: 0,
    })

    await apiPatch(`/api/admin/productos/${created.id}/desactivar`, {})
    const productos = await apiGet<Array<{ id: number }>>('/api/productos')

    expect(productos).not.toContainEqual(expect.objectContaining({ id: created.id }))
  })

  it('persists seeded product mutations across refetches and checkout', async () => {
    const { apiDelete, apiGet, apiPatch, apiPostForm, apiPut } = await import('@/lib/api')

    await apiPut('/api/admin/productos/1', { nombre: 'Pizza demo editada', precio: 4100 })
    await apiPatch('/api/admin/productos/1/stock', { stock_actual: 1 })
    const image = new FormData()
    image.set('imagen', new File(['demo'], 'pizza-demo.png', { type: 'image/png' }))
    await apiPostForm('/api/admin/productos/1/imagen', image)

    await expect(apiGet('/api/productos/1')).resolves.toMatchObject({
      nombre: 'Pizza demo editada', precio: 4100, stock_actual: 1,
      imagen_nombre_original: 'pizza-demo.png',
    })
    await expect(apiGet<{ productos: Array<Record<string, unknown>> }>('/api/admin/productos', { estado: 'todos' }))
      .resolves.toMatchObject({ productos: expect.arrayContaining([
        expect.objectContaining({ id: 1, nombre: 'Pizza demo editada', stock_actual: 1 }),
      ]) })

    const checkout = new FormData()
    checkout.set('items', JSON.stringify([{ producto_id: 1, cantidad: 2 }]))
    await expect(apiPostForm('/api/pedidos', checkout)).rejects.toMatchObject({ status: 409 })

    await apiPatch('/api/admin/productos/1/desactivar', {})
    expect(await apiGet<Array<{ id: number }>>('/api/productos'))
      .not.toContainEqual(expect.objectContaining({ id: 1 }))
    await expect(apiGet('/api/productos/1')).rejects.toMatchObject({ status: 404 })
    await expect(apiGet<{ productos: Array<Record<string, unknown>> }>('/api/admin/productos', { estado: 'desactivado' }))
      .resolves.toMatchObject({ productos: expect.arrayContaining([expect.objectContaining({ id: 1, activo: 0 })]) })

    await apiPatch('/api/admin/productos/1/recuperar', {})
    await apiDelete('/api/admin/productos/1/imagen')
    await expect(apiGet('/api/productos/1')).resolves.toMatchObject({ activo: 1, imagen_url: null })
  })

  it('hides an ephemeral promo until it has components', async () => {
    const { apiGet, apiPost, apiPut } = await import('@/lib/api')
    const created = await apiPost<{ id: number }>('/api/admin/productos', {
      nombre: 'Promo temporal', precio: 4200, tipo: 'promo', categorias: ['Merienda'],
      stock_limitado: 0,
    })

    expect(await apiGet<Array<{ id: number }>>('/api/productos'))
      .not.toContainEqual(expect.objectContaining({ id: created.id }))

    await apiPut(`/api/admin/productos/${created.id}/componentes`, {
      componentes: [{ producto_id: 10, cantidad: 2 }],
    })
    expect(await apiGet<Array<{ id: number }>>('/api/productos'))
      .toContainEqual(expect.objectContaining({ id: created.id }))
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
    await expect(apiGet(`/api/productos/${id}`)).rejects.toMatchObject({ status: 404 })

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

  it('keeps an edited order in detail and list refetches', async () => {
    const { apiGet, apiPut } = await import('@/lib/api')
    const edited = await apiPut<Record<string, unknown>>('/api/admin/pedidos/1', {
      nombre_cliente: 'Cliente corregido', mesa: '', telefono_cliente: '', observaciones: '',
      items: [{ producto_id: 5, cantidad: 2 }],
    })

    expect(edited).toEqual(expect.objectContaining({
      id: 1, nombre_cliente: 'Cliente corregido', mesa: null, telefono_cliente: null,
      observaciones: null, total: 5000,
      items: [expect.objectContaining({ producto_id: 5, nombre_producto: 'Pancho', cantidad: 2, subtotal: 5000 })],
    }))
    await expect(apiGet('/api/admin/pedidos/1')).resolves.toEqual(edited)
    await expect(apiGet('/api/admin/pedidos', { buscar: 'Cliente corregido' })).resolves.toMatchObject({
      pedidos: [expect.objectContaining({ id: 1, nombre_cliente: 'Cliente corregido', total: 5000 })],
      paginacion: { total: 1 },
    })
    await expect(apiPut('/api/admin/pedidos/1', { total: 1 })).rejects.toMatchObject({ status: 400 })
    await expect(apiPut('/api/admin/pedidos/1', { items: [{ producto_id: 999, cantidad: 1 }] })).rejects.toMatchObject({ status: 400 })
  })

  it('rejects changing a receipt-bearing transfer order to cash without mutating it', async () => {
    const { apiGet, apiPut } = await import('@/lib/api')
    const before = await apiGet('/api/admin/pedidos/3')

    await expect(apiPut('/api/admin/pedidos/3', { metodo_pago: 'efectivo' }))
      .rejects.toMatchObject({
        name: 'ApiError',
        status: 400,
        message: 'No se puede cambiar a efectivo un pedido con comprobante adjunto',
      })
    await expect(apiGet('/api/admin/pedidos/3')).resolves.toEqual(before)
  })

  it('rejects a paid-order payment regression without changing order or reports', async () => {
    const { apiGet, apiPut } = await import('@/lib/api')
    const beforeOrder = await apiGet('/api/admin/pedidos/2')
    const { actualizado_en: _beforeTimestamp, ...beforeReports } = await apiGet<Record<string, unknown>>('/api/admin/reportes')

    await expect(apiPut('/api/admin/pedidos/2', { estado_pago: 'pendiente' }))
      .rejects.toMatchObject({ name: 'ApiError', status: 400 })
    await expect(apiPut('/api/admin/pedidos/2', {
      metodo_pago: 'transferencia', estado_pago: 'rechazado',
    })).rejects.toMatchObject({ name: 'ApiError', status: 400 })

    await expect(apiGet('/api/admin/pedidos/2')).resolves.toEqual(beforeOrder)
    const { actualizado_en: _afterTimestamp, ...afterReports } = await apiGet<Record<string, unknown>>('/api/admin/reportes')
    expect(afterReports).toEqual(beforeReports)
  })

  it('rejects an oversized promo edit after aggregating components and leaves the order unchanged', async () => {
    const { apiGet, apiPut } = await import('@/lib/api')
    const before = await apiGet('/api/admin/pedidos/3')

    await expect(apiPut('/api/admin/pedidos/3', {
      items: [
        { producto_id: 23, cantidad: 5 },
        { producto_id: 23, cantidad: 5 },
      ],
    })).rejects.toMatchObject({ name: 'ApiError', status: 409, message: 'Stock insuficiente' })
    await expect(apiGet('/api/admin/pedidos/3')).resolves.toEqual(before)
  })

  it('keeps the requested admin state across refetch', async () => {
    const { apiGet, apiPatch } = await import('@/lib/api')
    const updated = await apiPatch<Record<string, unknown>>('/api/admin/pedidos/1/estado', {
      estado_pedido: 'listo',
    })

    expect(updated).toMatchObject({ id: 1, estado_pedido: 'listo' })
    await expect(apiGet('/api/admin/pedidos/1')).resolves.toEqual(updated)
    await expect(apiGet('/api/admin/cocina/pedidos')).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 1, estado_pedido: 'listo' })]),
    )
    await expect(apiGet('/api/pedidos/seguimiento/demodemo000000000000000000000001'))
      .resolves.toMatchObject({ id: 1, estado_pedido: 'listo' })
  })

  it('keeps payment updates across refetch and removes them from the pending filter', async () => {
    const { apiGet, apiPatch } = await import('@/lib/api')

    await expect(apiPatch('/api/admin/pedidos/3/pago', { estado_pago: 'pagado' }))
      .resolves.toMatchObject({ id: 3, estado_pago: 'pagado' })
    await expect(apiGet('/api/admin/pedidos/3')).resolves.toMatchObject({ id: 3, estado_pago: 'pagado' })
    await expect(apiGet('/api/admin/pedidos', { estado_pago: 'comprobante_subido' }))
      .resolves.toMatchObject({ pedidos: [], paginacion: { total: 0 } })
    await expect(apiPatch('/api/admin/pedidos/3/pago', {
      estado_pago: 'pagado', extra: true,
    })).rejects.toMatchObject({ status: 400 })
    await expect(apiPatch('/api/admin/pedidos/3/pago', {
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

    await expect(apiPatch('/api/admin/pedidos/4/cancelar', {}))
      .resolves.toMatchObject({ id: 4, estado_pedido: 'cancelado' })
    await expect(apiPatch('/api/admin/pedidos/3/comprobante/aprobar', {}))
      .resolves.toMatchObject({ id: 3, estado_pago: 'pagado', estado_pedido: 'en_preparacion' })
    await expect(apiPatch('/api/admin/pedidos/4/cancelar', { extra: true }))
      .rejects.toMatchObject({ status: 400 })
    await expect(apiPatch('/api/admin/pedidos/3/comprobante/aprobar', { extra: true }))
      .rejects.toMatchObject({ status: 400 })
  })

  it('rejects cancelling a ready order and leaves its detail unchanged', async () => {
    const { apiGet, apiPatch } = await import('@/lib/api')
    const before = await apiGet('/api/admin/pedidos/5')

    await expect(apiPatch('/api/admin/pedidos/5/cancelar', {})).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Solo se puede cancelar pedidos en estado en preparación',
    })
    await expect(apiGet('/api/admin/pedidos/5')).resolves.toEqual(before)
  })

  it('returns a nonpersistent kitchen order with the requested state', async () => {
    const { apiPatch } = await import('@/lib/api')

    await expect(apiPatch('/api/admin/cocina/pedidos/1/estado', { estado_pedido: 'listo' }))
      .resolves.toMatchObject({ id: 1, estado_pedido: 'listo' })
  })

  it('does not mutate checkout state when existing demo order storage is malformed', async () => {
    const { apiGet, apiPatch, apiPostForm } = await import('@/lib/api')
    await apiPatch('/api/admin/productos/1/stock', { stock_actual: 4 })
    await apiPatch('/api/admin/productos/5/stock', { stock_actual: 3 })
    await apiPatch('/api/admin/productos/15/stock', { stock_actual: 2 })

    const before = {
      stocks: await Promise.all([1, 5, 15].map((id) => apiGet(`/api/productos/${id}`))),
      publicProducts: await apiGet('/api/productos'),
      adminProducts: await apiGet('/api/admin/productos', { estado: 'todos' }),
      orders: await apiGet('/api/admin/pedidos', { buscar: 'storage malformed' }),
      reports: await apiGet<Record<string, unknown>>('/api/admin/reportes'),
    }
    const { actualizado_en: _beforeUpdatedAt, ...beforeReports } = before.reports
    sessionStorage.setItem('kermingo:demoOrders', '{malformed')
    const form = new FormData()
    form.set('nombre_cliente', 'storage malformed')
    form.set('items', JSON.stringify([
      { producto_id: 1, cantidad: 1 },
      { producto_id: 24, cantidad: 1 },
    ]))

    await expect(apiPostForm('/api/pedidos', form)).rejects.toMatchObject({ status: 400 })

    expect(sessionStorage.getItem('kermingo:demoOrders')).toBe('{malformed')
    await expect(Promise.all([1, 5, 15].map((id) => apiGet(`/api/productos/${id}`))))
      .resolves.toEqual(before.stocks)
    await expect(apiGet('/api/productos')).resolves.toEqual(before.publicProducts)
    await expect(apiGet('/api/admin/productos', { estado: 'todos' })).resolves.toEqual(before.adminProducts)
    await expect(apiGet('/api/admin/pedidos', { buscar: 'storage malformed' })).resolves.toEqual(before.orders)
    const { actualizado_en: _afterUpdatedAt, ...afterReports } = await apiGet<Record<string, unknown>>('/api/admin/reportes')
    expect(afterReports).toEqual(beforeReports)
  })

  it('does not mutate checkout state when demo order storage cannot be written', async () => {
    const { apiGet, apiPatch, apiPostForm } = await import('@/lib/api')
    await apiPatch('/api/admin/productos/1/stock', { stock_actual: 4 })
    await apiPatch('/api/admin/productos/5/stock', { stock_actual: 3 })
    await apiPatch('/api/admin/productos/15/stock', { stock_actual: 2 })

    const before = {
      stocks: await Promise.all([1, 5, 15].map((id) => apiGet(`/api/productos/${id}`))),
      publicProducts: await apiGet('/api/productos'),
      adminProducts: await apiGet('/api/admin/productos', { estado: 'todos' }),
      orders: await apiGet('/api/admin/pedidos', { buscar: 'storage quota' }),
      reports: await apiGet<Record<string, unknown>>('/api/admin/reportes'),
    }
    const { actualizado_en: _beforeUpdatedAt, ...beforeReports } = before.reports
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })
    const form = new FormData()
    form.set('nombre_cliente', 'storage quota')
    form.set('items', JSON.stringify([
      { producto_id: 1, cantidad: 1 },
      { producto_id: 24, cantidad: 1 },
    ]))

    try {
      await expect(apiPostForm('/api/pedidos', form)).rejects.toMatchObject({ name: 'QuotaExceededError' })
    } finally {
      setItem.mockRestore()
    }

    await expect(Promise.all([1, 5, 15].map((id) => apiGet(`/api/productos/${id}`))))
      .resolves.toEqual(before.stocks)
    await expect(apiGet('/api/productos')).resolves.toEqual(before.publicProducts)
    await expect(apiGet('/api/admin/productos', { estado: 'todos' })).resolves.toEqual(before.adminProducts)
    await expect(apiGet('/api/admin/pedidos', { buscar: 'storage quota' })).resolves.toEqual(before.orders)
    const { actualizado_en: _afterUpdatedAt, ...afterReports } = await apiGet<Record<string, unknown>>('/api/admin/reportes')
    expect(afterReports).toEqual(beforeReports)
  })

  it('rejects inactive promo components atomically and preserves the working promo checkout', async () => {
    const { apiGet, apiPatch, apiPostForm, apiPut } = await import('@/lib/api')
    const beforeComponents = await apiGet('/api/admin/productos/23/componentes')
    const beforePromo = (await apiGet<Array<{ id: number }>>('/api/productos/23'))
    await apiPatch('/api/admin/productos/11/desactivar', {})

    await expect(apiPut('/api/admin/productos/23/componentes', {
      componentes: [{ producto_id: 11, cantidad: 1 }],
    })).rejects.toMatchObject({ status: 400, message: 'Uno o más componentes están desactivados' })

    await expect(apiGet('/api/admin/productos/23/componentes')).resolves.toEqual(beforeComponents)
    await expect(apiGet('/api/productos/23')).resolves.toEqual(beforePromo)

    const form = new FormData()
    form.set('nombre_cliente', 'promo remains valid')
    form.set('items', JSON.stringify([{ producto_id: 23, cantidad: 1 }]))
    await expect(apiPostForm('/api/pedidos', form)).resolves.toMatchObject({
      items: [expect.objectContaining({ producto_id: 23, cantidad: 1 })],
    })
  })

  it('uploads and persists a seeded product image without creating an object URL', async () => {
    const objectUrlSpy = vi.spyOn(URL, 'createObjectURL')
    const { apiGet, apiPostForm } = await import('@/lib/api')
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
    await expect(apiGet('/api/productos/14')).resolves.toEqual(uploaded)
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

  it('deletes and persists all five seeded product image fields', async () => {
    const { apiDelete, apiGet } = await import('@/lib/api')
    const deleted = await apiDelete<Record<string, unknown>>('/api/admin/productos/1/imagen')

    expect(deleted).toMatchObject({
      id: 1,
      imagen_archivo_id: null,
      imagen_nombre_original: null,
      imagen_mime_type: null,
      imagen_tamanio_bytes: null,
      imagen_url: null,
    })
    await expect(apiGet('/api/productos/1')).resolves.toEqual(deleted)
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

  it('updates reports after payment and excludes a cancelled paid order', async () => {
    const { apiGet, apiPatch } = await import('@/lib/api')
    const before = await apiGet<{
      total_recaudado: number
      pedidos_pagados: number
      productos_vendidos: number
      ranking_productos: Array<{ producto_id: number; cantidad: number }>
    }>('/api/admin/reportes')

    await apiPatch('/api/admin/pedidos/3/pago', { estado_pago: 'pagado' })
    const afterPayment = await apiGet<typeof before>('/api/admin/reportes')
    expect(afterPayment).toMatchObject({
      total_recaudado: before.total_recaudado + 3500,
      pedidos_pagados: before.pedidos_pagados + 1,
      productos_vendidos: before.productos_vendidos + 1,
    })
    expect(afterPayment.ranking_productos).toContainEqual(
      expect.objectContaining({ producto_id: 23, cantidad: 1 }),
    )

    await apiPatch('/api/admin/pedidos/4/cancelar', {})
    const afterCancellation = await apiGet<typeof before>('/api/admin/reportes')
    expect(afterCancellation).toMatchObject({
      total_recaudado: afterPayment.total_recaudado - 6500,
      pedidos_pagados: afterPayment.pedidos_pagados - 1,
      productos_vendidos: afterPayment.productos_vendidos - 1,
    })
    expect(afterCancellation.ranking_productos)
      .not.toContainEqual(expect.objectContaining({ producto_id: 24 }))
  })

  it('creates a caja order visible downstream and decrements direct and promo stock', async () => {
    const { apiGet, apiPost } = await import('@/lib/api')
    const beforePizza = await apiGet<{ stock_actual: number }>('/api/productos/1')
    const beforePancho = await apiGet<{ stock_actual: number }>('/api/productos/5')
    const beforeCoca = await apiGet<{ stock_actual: number }>('/api/productos/15')
    const beforeReports = await apiGet<{ total_efectivo: number; pedidos_pagados: number }>('/api/admin/reportes')

    const created = await apiPost<{
      id: number; numero: string; origen: string; estado_pedido: string; estado_pago: string
      metodo_pago: string; total: number; items: Array<{ producto_id: number; cantidad: number; subtotal: number }>
    }>('/api/admin/pedidos/caja', {
      nombre_cliente: 'Caja TDD', metodo_pago: 'efectivo', estado_pago: 'pendiente',
      estado_pedido: 'recibido',
      items: [{ producto_id: 1, cantidad: 2 }, { producto_id: 24, cantidad: 1 }],
    })

    expect(created).toMatchObject({
      id: expect.any(Number), numero: expect.stringMatching(/^KMG-DEMO-/), origen: 'caja',
      estado_pedido: 'en_preparacion', estado_pago: 'pagado', metodo_pago: 'efectivo', total: 13500,
      items: [
        { producto_id: 1, cantidad: 2, subtotal: 7000 },
        { producto_id: 24, cantidad: 1, subtotal: 6500 },
      ],
    })
    await expect(apiGet('/api/admin/pedidos', { buscar: 'Caja TDD' })).resolves.toMatchObject({
      pedidos: [expect.objectContaining({ id: created.id, total: 13500 })], paginacion: { total: 1 },
    })
    await expect(apiGet('/api/admin/cocina/pedidos')).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.id, estado_pedido: 'en_preparacion' })]),
    )
    await expect(apiGet('/api/admin/reportes')).resolves.toMatchObject({
      total_efectivo: beforeReports.total_efectivo + 13500,
      pedidos_pagados: beforeReports.pedidos_pagados + 1,
    })
    await expect(apiGet('/api/productos/1')).resolves.toMatchObject({ stock_actual: beforePizza.stock_actual - 3 })
    await expect(apiGet('/api/productos/5')).resolves.toMatchObject({ stock_actual: beforePancho.stock_actual - 1 })
    await expect(apiGet('/api/productos/15')).resolves.toMatchObject({ stock_actual: beforeCoca.stock_actual - 1 })
  })

  it('decrements direct and promo-component stock across online checkouts atomically', async () => {
    const { apiGet, apiPatch, apiPostForm } = await import('@/lib/api')
    await apiPatch('/api/admin/productos/1/stock', { stock_actual: 2 })
    await apiPatch('/api/admin/productos/5/stock', { stock_actual: 1 })
    await apiPatch('/api/admin/productos/15/stock', { stock_actual: 1 })

    const form = (nombre_cliente: string, producto_id: number, cantidad: number) => {
      const value = new FormData()
      value.set('nombre_cliente', nombre_cliente)
      value.set('items', JSON.stringify([{ producto_id, cantidad }]))
      return value
    }

    await expect(apiPostForm('/api/pedidos', form('Online atómico 1', 1, 1)))
      .resolves.toMatchObject({ origen: 'online', items: [{ producto_id: 1, cantidad: 1 }] })
    await expect(apiPostForm('/api/pedidos', form('Online atómico 2', 24, 1)))
      .resolves.toMatchObject({ origen: 'online', items: [{ producto_id: 24, cantidad: 1 }] })

    await expect(apiGet('/api/productos/1')).resolves.toMatchObject({ stock_actual: 0 })
    await expect(apiGet('/api/productos/5')).resolves.toMatchObject({ stock_actual: 0 })
    await expect(apiGet('/api/productos/15')).resolves.toMatchObject({ stock_actual: 0 })
    const beforeFailedCheckout = {
      products: await Promise.all([1, 5, 15].map((id) => apiGet(`/api/productos/${id}`))),
      adminProducts: await apiGet('/api/admin/productos', { estado: 'todos' }),
      orders: await apiGet('/api/admin/pedidos', { buscar: 'Online atómico' }),
      reports: await apiGet<Record<string, unknown>>('/api/admin/reportes'),
    }
    expect(beforeFailedCheckout.adminProducts.productos).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 1, stock_actual: 0 }),
      expect.objectContaining({ id: 5, stock_actual: 0 }),
      expect.objectContaining({ id: 15, stock_actual: 0 }),
    ]))

    await expect(apiPostForm('/api/pedidos', form('Online atómico fallido', 1, 1)))
      .rejects.toMatchObject({ status: 409 })

    await expect(Promise.all([1, 5, 15].map((id) => apiGet(`/api/productos/${id}`))))
      .resolves.toEqual(beforeFailedCheckout.products)
    await expect(apiGet('/api/admin/pedidos', { buscar: 'Online atómico' }))
      .resolves.toEqual(beforeFailedCheckout.orders)
    await expect(apiGet('/api/admin/productos', { estado: 'todos' }))
      .resolves.toEqual(beforeFailedCheckout.adminProducts)
    const afterFailedReports = await apiGet<Record<string, unknown>>('/api/admin/reportes')
    expect({ ...afterFailedReports, actualizado_en: beforeFailedCheckout.reports.actualizado_en })
      .toEqual({ ...beforeFailedCheckout.reports, actualizado_en: beforeFailedCheckout.reports.actualizado_en })
    await expect(apiGet('/api/admin/pedidos', { buscar: 'Online atómico fallido' }))
      .resolves.toMatchObject({ pedidos: [], paginacion: { total: 0 } })
  })

  it('persists a valid product reorder and rejects invalid batches atomically', async () => {
    const { apiGet, apiPatch } = await import('@/lib/api')
    const expectedOrder = [
      { id: 2, orden: 0 }, { id: 3, orden: 1 }, { id: 1, orden: 2 },
    ]
    const reordered = await apiPatch<Array<{ id: number; orden: number }>>('/api/admin/productos/orden', {
      ordenes: [{ id: 1, orden: 2 }, { id: 2, orden: 0 }, { id: 3, orden: 1 }],
    })
    expect(reordered.slice(0, 3).map(({ id, orden }) => ({ id, orden }))).toEqual(expectedOrder)

    const publicProducts = await apiGet<Array<{ id: number; orden: number }>>('/api/productos')
    const adminProducts = await apiGet<{ productos: Array<{ id: number; orden: number }> }>(
      '/api/admin/productos', { estado: 'todos' },
    )
    expect(publicProducts.slice(0, 3).map(({ id, orden }) => ({ id, orden }))).toEqual(expectedOrder)
    expect(adminProducts.productos.slice(0, 3).map(({ id, orden }) => ({ id, orden }))).toEqual(expectedOrder)

    const beforeInvalidBatch = {
      publicProducts: await apiGet('/api/productos'),
      adminProducts: await apiGet('/api/admin/productos', { estado: 'todos' }),
    }
    for (const body of [
      { ordenes: [{ id: 0, orden: 1 }] },
      { ordenes: [{ id: 1, orden: -1 }] },
      { ordenes: [{ id: 1, orden: 1 }, { id: 1, orden: 2 }] },
      { ordenes: [{ id: 999, orden: 1 }] },
      { ordenes: [{ id: '1', orden: 1 }] },
    ]) {
      await expect(apiPatch('/api/admin/productos/orden', body)).rejects.toMatchObject({
        name: 'ApiError',
      })
      await expect(apiGet('/api/productos')).resolves.toEqual(beforeInvalidBatch.publicProducts)
      await expect(apiGet('/api/admin/productos', { estado: 'todos' }))
        .resolves.toEqual(beforeInvalidBatch.adminProducts)
    }
  })

  it('rejects malformed and insufficient caja sales atomically', async () => {
    const { apiGet, apiPatch, apiPost } = await import('@/lib/api')
    await apiPatch('/api/admin/productos/1/stock', { stock_actual: 1 })
    const beforeProduct = await apiGet('/api/productos/1')
    const beforeOrders = await apiGet('/api/admin/pedidos', { buscar: 'Caja atómica' })
    const beforeReports = await apiGet<Record<string, unknown>>('/api/admin/reportes')

    await expect(apiPost('/api/admin/pedidos/caja', {
      nombre_cliente: 'Caja atómica', metodo_pago: 'efectivo',
      items: [{ producto_id: 1, cantidad: 2 }],
    })).rejects.toMatchObject({ status: 409 })
    await expect(apiPost('/api/admin/pedidos/caja', {
      nombre_cliente: 'Caja atómica', metodo_pago: 'efectivo', items: [],
    })).rejects.toMatchObject({ status: 400 })

    await expect(apiGet('/api/productos/1')).resolves.toEqual(beforeProduct)
    await expect(apiGet('/api/admin/pedidos', { buscar: 'Caja atómica' })).resolves.toEqual(beforeOrders)
    const afterReports = await apiGet<Record<string, unknown>>('/api/admin/reportes')
    expect({ ...afterReports, actualizado_en: beforeReports.actualizado_en }).toEqual(beforeReports)
  })

  it('restores direct and promo-component stock exactly once on cancellation', async () => {
    const { apiGet, apiPatch, apiPost } = await import('@/lib/api')
    const initial = await Promise.all([1, 5, 15].map((id) =>
      apiGet<{ stock_actual: number }>(`/api/productos/${id}`)))
    const created = await apiPost<{ id: number }>('/api/admin/pedidos/caja', {
      nombre_cliente: 'Caja cancelar', metodo_pago: 'transferencia',
      items: [{ producto_id: 1, cantidad: 2 }, { producto_id: 24, cantidad: 1 }],
    })

    await expect(apiPatch(`/api/admin/pedidos/${created.id}/cancelar`, {}))
      .resolves.toMatchObject({ id: created.id, estado_pedido: 'cancelado' })
    for (const [index, id] of [1, 5, 15].entries()) {
      await expect(apiGet(`/api/productos/${id}`)).resolves.toMatchObject({
        stock_actual: initial[index].stock_actual,
      })
    }

    await expect(apiPatch(`/api/admin/pedidos/${created.id}/cancelar`, {}))
      .rejects.toMatchObject({ status: 400 })
    await expect(apiPatch('/api/admin/pedidos/5/cancelar', {})).rejects.toMatchObject({ status: 400 })
    for (const [index, id] of [1, 5, 15].entries()) {
      await expect(apiGet(`/api/productos/${id}`)).resolves.toMatchObject({
        stock_actual: initial[index].stock_actual,
      })
    }
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

  it.each([
    ['desactivado', { activo: 0, stock_limitado: 0 }, 1, 400],
    ['no disponible', { disponible: 0, stock_limitado: 0 }, 1, 400],
    ['agotado', { stock_limitado: 1, stock_actual: 0 }, 1, 409],
    ['cantidad mayor al stock', { stock_limitado: 1, stock_actual: 1 }, 2, 409],
  ])('rejects a stale cart product that is %s at checkout', async (_case, overrides, cantidad, status) => {
    const { apiPost, apiPostForm } = await import('@/lib/api')
    const product = await apiPost<{ id: number }>('/api/admin/productos', {
      nombre: `Producto ${_case}`, precio: 1000, tipo: 'comida', categorias: ['Merienda'],
      activo: 1, disponible: 1, ...overrides,
    })
    const form = new FormData()
    form.set('items', JSON.stringify([{ producto_id: product.id, cantidad }]))

    await expect(apiPostForm('/api/pedidos', form)).rejects.toMatchObject({ status })
  })

  it('rejects incomplete promos and promos whose component stock cannot cover the requested quantity', async () => {
    const { apiPost, apiPostForm, apiPut } = await import('@/lib/api')
    const promo = await apiPost<{ id: number }>('/api/admin/productos', {
      nombre: 'Promo stale', precio: 3000, tipo: 'promo', categorias: ['Merienda'], stock_limitado: 0,
    })
    const form = new FormData()
    form.set('items', JSON.stringify([{ producto_id: promo.id, cantidad: 1 }]))
    await expect(apiPostForm('/api/pedidos', form)).rejects.toMatchObject({ status: 400 })

    await apiPut(`/api/admin/productos/${promo.id}/componentes`, {
      componentes: [{ producto_id: 4, cantidad: 1 }],
    })
    await expect(apiPostForm('/api/pedidos', form)).rejects.toMatchObject({ status: 409 })
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
