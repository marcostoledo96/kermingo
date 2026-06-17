import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ApiProducto, ApiConfiguracion } from '@/lib/types'
import { MenuScreen } from '@/components/menu/menu-screen'

const mockProducts: ApiProducto[] = [
  {
    id: 1,
    nombre: 'Pizza familiar',
    descripcion: 'Deliciosa',
    precio: 1200,
    tipo: 'comida',
    stock_limitado: 0,
    stock_actual: null,
    stock_minimo_alerta: 0,
    activo: 1,
    imagen_archivo_id: null,
    imagen_nombre_original: null,
    imagen_mime_type: null,
    imagen_tamanio_bytes: null,
    imagen_url: null,
    categorias: 'merienda',
  },
]

const baseConfig: ApiConfiguracion = {
  id: 1,
  estado: 'cerrada',
  mensaje_publico: 'Cerrado por mantenimiento',
}

const sampleConfig: ApiConfiguracion = {
  ...baseConfig,
}

const mockUseCart = {
  count: 2,
  total: 2400,
  qtyOf: vi.fn(() => 0),
  add: vi.fn(),
  increment: vi.fn(),
  decrement: vi.fn(),
}

vi.mock('@/components/menu/cart-context', () => ({
  useCart: () => mockUseCart,
}))

vi.mock('@/lib/config', async () => {
  const actual = await vi.importActual<typeof import('@/lib/config')>('@/lib/config')

  return {
    ...actual,
    API_BASE: 'http://localhost:3001',
  }
})

const mockFetch = vi.fn(async (url: string) => {
  if (url.includes('/api/configuracion-tienda')) {
    return new Response(JSON.stringify({ ok: true, data: sampleConfig }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (url.includes('/api/productos')) {
    return new Response(JSON.stringify({ ok: true, data: mockProducts }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  throw new Error(`Unexpected endpoint: ${url}`)
})

describe('MenuScreen — tienda cerrada', () => {
  beforeEach(() => {
    sampleConfig.id = baseConfig.id
    sampleConfig.estado = baseConfig.estado
    sampleConfig.mensaje_publico = baseConfig.mensaje_publico
    mockFetch.mockClear()
    mockUseCart.qtyOf.mockClear()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('muestra aviso y bloquea agregar desde el menú', async () => {
    render(<MenuScreen />)

    expect(await screen.findByText('La tienda está cerrada')).toBeTruthy()
    expect(screen.getAllByText('Cerrado por mantenimiento').length).toBeGreaterThan(1)
    expect(screen.queryByRole('button', { name: /agregar/i })).toBeNull()
  })

  it('muestra FloatingCart deshabilitado cuando ya hay items en carrito', async () => {
    sampleConfig.estado = 'cerrada'
    sampleConfig.mensaje_publico = 'No recibimos pedidos hoy'

    render(<MenuScreen />)

    const cta = await screen.findByText('Ver carrito')
    expect(cta).toBeTruthy()
    expect(cta.getAttribute('class') ?? '').toContain('bg-[#F6B21A]/60')
    expect(screen.getAllByText('No recibimos pedidos hoy').length).toBeGreaterThan(0)
  })

  it('permite agregar cuando la tienda está abierta', async () => {
    sampleConfig.estado = 'abierta'
    sampleConfig.mensaje_publico = 'Ahora está abierta'

    render(<MenuScreen />)

    expect(await screen.findByText('Pizza familiar')).toBeTruthy()
    expect(screen.queryByText(/tienda está cerrada/i)).toBeNull()
    expect(screen.getByRole('button', { name: /agregar/i })).toBeTruthy()

    const cta = screen.getByText('Ver carrito')
    expect(cta.getAttribute('class') ?? '').toContain('bg-[#F6B21A]')
  })

  it('bloquea agregar cuando la tienda está en demo', async () => {
    sampleConfig.estado = 'demo'
    sampleConfig.mensaje_publico = 'Modo demo activo'

    render(<MenuScreen />)

    expect((await screen.findAllByText('Modo demo activo')).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /agregar/i })).toBeNull()
    const cta = await screen.findByText('Ver carrito')
    expect(cta.getAttribute('class') ?? '').toContain('bg-[#F6B21A]/60')
  })
})
