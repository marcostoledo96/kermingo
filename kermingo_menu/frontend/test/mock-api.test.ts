import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('mock API mode', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('NEXT_PUBLIC_MOCK_API', 'true')
    if (typeof localStorage !== 'undefined') {
      localStorage.clear()
    }
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

  it('rejects public checkout while store is closed in demo', async () => {
    const { apiPostForm } = await import('@/lib/api')
    await expect(apiPostForm('/api/pedidos', new FormData())).rejects.toMatchObject({
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
