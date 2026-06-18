import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ApiConfiguracion, ApiPedido } from '@/lib/types'
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

const mockApiGet = vi.fn<(url: string) => Promise<ApiConfiguracion>>()
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

const tiendaAbierta: ApiConfiguracion = {
  id: 1,
  estado: 'abierta',
  mensaje_publico: null,
}

const pedidoResponse: ApiPedido = {
  id: 1,
  numero: 'A-1',
  token_seguimiento: 't-1',
  origen: 'online',
  nombre_cliente: 'Juan Perez',
  mesa: null,
  telefono_cliente: null,
  telefono_whatsapp: null,
  estado_pedido: 'recibido',
  estado_pago: 'pendiente',
  metodo_pago: 'transferencia',
  total: 1200,
  observaciones: null,
  comprobante_archivo_id: null,
  created_at: '2026-06-17T00:00:00.000Z',
  updated_at: '2026-06-17T00:00:00.000Z',
  items: [
    {
      producto_id: 1,
      nombre_producto: 'Pancho',
      precio_unitario: 1200,
      cantidad: 1,
      subtotal: 1200,
    },
  ],
}

const getFileInput = () => {
  const fileInput = document.querySelector('input[type="file"]')
  expect(fileInput).not.toBeNull()
  return fileInput as HTMLInputElement
}

const attachFile = (input: HTMLInputElement, file: File) => {
  fireEvent.change(input, {
    target: {
      files: [file] as unknown as FileList,
    },
  })
}

beforeEach(() => {
  mockPush.mockReset()
  mockApiGet.mockReset()
  mockApiPostForm.mockReset()
  mockUseCart.clear.mockReset()
  mockApiGet.mockResolvedValue(tiendaAbierta)
})

describe('CheckoutScreen — validación de comprobante', () => {
  it('bloquea HEIC y no intenta enviar el pedido', async () => {
    render(<CheckoutScreen />)

    const nameInput = screen.getByPlaceholderText('Cómo te buscamos al entregar')
    fireEvent.change(nameInput, { target: { value: 'Juan Perez' } })

    attachFile(
      getFileInput(),
      new File([new Uint8Array([1])], 'comprobante.heic', {
        type: 'image/heic',
      }),
    )

    const alert = await screen.findByRole('alert')
    expect(alert).not.toBeNull()
    expect(alert.textContent).toMatch(/Formato de comprobante no válido/i)

    const confirmButton = await screen.findByRole('button', { name: /confirmar pedido/i })
    expect((confirmButton as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(confirmButton)

    expect(mockApiPostForm).not.toHaveBeenCalled()
  })

  it('bloquea archivos mayores a 5 MB y no intenta enviar el pedido', async () => {
    render(<CheckoutScreen />)

    const nameInput = screen.getByPlaceholderText('Cómo te buscamos al entregar')
    fireEvent.change(nameInput, { target: { value: 'Juan Perez' } })

    attachFile(
      getFileInput(),
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'comprobante.png', {
        type: 'image/png',
      }),
    )

    const alert = await screen.findByRole('alert')
    expect(alert).not.toBeNull()
    expect(alert.textContent).toMatch(/máximo 5 MB/i)

    const confirmButton = await screen.findByRole('button', { name: /confirmar pedido/i })
    expect((confirmButton as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(confirmButton)

    expect(mockApiPostForm).not.toHaveBeenCalled()
  })

  it('bloquea archivos con extensión permitida pero MIME no permitido', async () => {
    render(<CheckoutScreen />)

    const nameInput = screen.getByPlaceholderText('Cómo te buscamos al entregar')
    fireEvent.change(nameInput, { target: { value: 'Juan Perez' } })

    attachFile(
      getFileInput(),
      new File([new Uint8Array([1])], 'comprobante.jpg', {
        type: 'image/heif',
      }),
    )

    const alert = await screen.findByRole('alert')
    expect(alert).not.toBeNull()
    expect(alert.textContent).toMatch(/Formato de comprobante no válido/i)

    const confirmButton = await screen.findByRole('button', { name: /confirmar pedido/i })
    expect((confirmButton as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(confirmButton)

    expect(mockApiPostForm).not.toHaveBeenCalled()
  })

  it.each([
    ['comprobante.jpg', 'image/jpeg'],
    ['comprobante.png', 'image/png'],
    ['comprobante.webp', 'image/webp'],
    ['comprobante.pdf', 'application/pdf'],
  ])('acepta tipo permitido %s (%s)', async (name, type) => {
    mockApiPostForm.mockResolvedValue(pedidoResponse)
    render(<CheckoutScreen />)

    const nameInput = screen.getByPlaceholderText('Cómo te buscamos al entregar')
    fireEvent.change(nameInput, { target: { value: 'Juan Perez' } })

    const file = new File(['ok'], name, { type })
    attachFile(getFileInput(), file)

    await waitFor(() => {
      expect(screen.queryByRole('alert')).toBeNull()
    })

    const confirmButton = await screen.findByRole('button', { name: /confirmar pedido/i })
    await waitFor(() => expect((confirmButton as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(confirmButton)

    await waitFor(() => expect(mockApiPostForm).toHaveBeenCalledTimes(1))

    const [url, formData] = mockApiPostForm.mock.calls[0] as [string, FormData]
    expect(url).toBe('/api/pedidos')
    expect(formData.get('comprobante')).toBe(file)
    expect(mockPush).toHaveBeenCalledWith('/confirmado')
  })
})
