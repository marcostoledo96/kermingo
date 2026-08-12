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

  it('keeps public checkout open in demo', async () => {
    const { apiGet } = await import('@/lib/api')
    const config = await apiGet<{ estado: string }>('/api/configuracion-tienda')
    expect(config.estado).toBe('abierta')
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
