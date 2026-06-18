import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ApiConfiguracion } from '@/lib/types'
import type { Product } from '@/lib/products'
import { CheckoutScreen } from '@/components/menu/checkout-screen'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

const mockUseCart = {
  items: [
    {
      product: {
        id: '1',
        name: 'Pancho',
        description: 'Pancho test',
        price: 1200,
        meals: ['merienda'],
        type: 'comida',
        stock: 'disponible',
        icon: 'sandwich',
      } as Product,
      qty: 1,
    },
  ],
  count: 1,
  total: 1200,
  clear: vi.fn(),
}

vi.mock('@/components/menu/cart-context', () => ({
  useCart: () => mockUseCart,
}))

const mockApiGet = vi.fn<
  (url: string) => Promise<ApiConfiguracion>
>()
const mockApiPostForm = vi.fn()

vi.mock('@/lib/api', () => ({
  apiGet: (...args: Parameters<typeof mockApiGet>) => mockApiGet(...args),
  apiPostForm: (...args: Parameters<typeof mockApiPostForm>) =>
    mockApiPostForm(...args),
  ApiError: class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('@/components/menu/menu-header', () => ({
  MenuHeader: () => <div data-testid="menu-header" />,
}))

vi.mock('@/components/menu/product-visual', () => ({
  ProductIconGlyph: () => <div data-testid="product-icon" />,
}))

const tiendaCerrada: ApiConfiguracion = {
  id: 1,
  estado: 'cerrada',
  mensaje_publico: 'Cerrada por mantenimiento',
}

const tiendaDemo: ApiConfiguracion = {
  id: 1,
  estado: 'demo',
  mensaje_publico: 'Modo demo activo',
}

beforeEach(() => {
  mockPush.mockReset()
  mockApiGet.mockReset()
  mockApiPostForm.mockReset()
  mockUseCart.clear()
})

describe('CheckoutScreen — tienda cerrada o demo', () => {
  it('bloquea confirmar y muestra mensaje cuando tienda está cerrada', async () => {
    mockApiGet.mockResolvedValue(tiendaCerrada)

    render(<CheckoutScreen />)

    expect(await screen.findByText('Cerrada por mantenimiento')).toBeTruthy()

    const nameInput = screen.getByPlaceholderText('Cómo te buscamos al entregar')
    fireEvent.change(nameInput, { target: { value: 'Juan Perez' } })

    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toBeTruthy()
    const file = new File(['ok'], 'comprobante.png', { type: 'image/png' })
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] as unknown as FileList } })
    }

    const confirmButton = await screen.findByRole('button', { name: /confirmar pedido/i })
    expect((confirmButton as HTMLButtonElement).disabled).toBe(true)
    expect(mockApiPostForm).not.toHaveBeenCalled()
    fireEvent.click(confirmButton)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('bloquea confirmar y muestra mensaje cuando tienda está en demo', async () => {
    mockApiGet.mockResolvedValue(tiendaDemo)

    render(<CheckoutScreen />)

    expect(await screen.findByText('Modo demo activo')).toBeTruthy()

    const nameInput = screen.getByPlaceholderText('Cómo te buscamos al entregar')
    fireEvent.change(nameInput, { target: { value: 'Juan Perez' } })

    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toBeTruthy()
    const file = new File(['ok'], 'comprobante.png', { type: 'image/png' })
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] as unknown as FileList } })
    }

    const confirmButton = await screen.findByRole('button', { name: /confirmar pedido/i })
    expect((confirmButton as HTMLButtonElement).disabled).toBe(true)
    expect(mockApiPostForm).not.toHaveBeenCalled()
  })

  it('mantiene el botón deshabilitado mientras carga la configuración de la tienda', async () => {
    mockApiGet.mockImplementation(() => new Promise<ApiConfiguracion>(() => {}))

    render(<CheckoutScreen />)

    expect(screen.getByText('Verificando estado de la tienda…')).toBeTruthy()

    const nameInput = screen.getByPlaceholderText('Cómo te buscamos al entregar')
    fireEvent.change(nameInput, { target: { value: 'Juan Perez' } })

    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toBeTruthy()
    const file = new File(['ok'], 'comprobante.png', { type: 'image/png' })
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] as unknown as FileList } })
    }

    const confirmButton = screen.getByRole('button', { name: /confirmar pedido/i })
    expect((confirmButton as HTMLButtonElement).disabled).toBe(true)
    expect(mockApiPostForm).not.toHaveBeenCalled()
  })

  it('bloquea confirmar y muestra error si no se pudo cargar la configuración', async () => {
    mockApiGet.mockRejectedValue(new Error('timeout'))

    render(<CheckoutScreen />)

    expect(await screen.findByText('No se pudo verificar el estado de la tienda. Volvé a intentarlo.')).toBeTruthy()

    const nameInput = screen.getByPlaceholderText('Cómo te buscamos al entregar')
    fireEvent.change(nameInput, { target: { value: 'Juan Perez' } })

    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toBeTruthy()
    const file = new File(['ok'], 'comprobante.png', { type: 'image/png' })
    if (fileInput) {
      fireEvent.change(fileInput, { target: { files: [file] as unknown as FileList } })
    }

    const confirmButton = await screen.findByRole('button', { name: /confirmar pedido/i })
    expect((confirmButton as HTMLButtonElement).disabled).toBe(true)
    expect(mockApiPostForm).not.toHaveBeenCalled()
  })
})
