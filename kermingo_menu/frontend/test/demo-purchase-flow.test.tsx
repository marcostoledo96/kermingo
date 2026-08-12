import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Product } from '@/lib/products'

const mockPush = vi.fn()
const mockGet = vi.fn(() => null)
const mockClear = vi.fn()
const demoProduct: Product = {
  id: '1',
  name: 'Pizza muzza',
  description: 'Demo',
  price: 3500,
  meals: ['cena'],
  type: 'comida',
  stock: 'disponible',
  icon: 'pizza',
  order: 1,
  available: true,
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: mockGet }),
}))

vi.mock('@/components/menu/cart-context', () => ({
  useCart: () => ({
    items: [{ product: demoProduct, qty: 2 }],
    count: 2,
    total: 7000,
    clear: mockClear,
  }),
}))

import { CheckoutScreen } from '@/components/menu/checkout-screen'
import { TrackingScreen } from '@/components/menu/tracking-screen'

describe('demo purchase flow', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_MOCK_API', 'true')
    localStorage.clear()
    sessionStorage.clear()
    mockPush.mockClear()
    mockClear.mockClear()
    mockGet.mockReturnValue(null)
  })

  it('checks out and shows the same session order as in preparation', async () => {
    const checkout = render(<CheckoutScreen />)
    fireEvent.change(screen.getByPlaceholderText('Cómo te buscamos al entregar'), {
      target: { value: 'Ana Demo' },
    })
    const receipt = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(receipt, {
      target: { files: [new File(['demo'], 'comprobante.pdf', { type: 'application/pdf' })] },
    })

    const confirm = await screen.findByRole('button', { name: /confirmar pedido/i })
    await waitFor(() => expect((confirm as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(confirm)

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/confirmado'))
    const token = localStorage.getItem('kermingo:lastToken')
    expect(token).toBeTruthy()
    expect(localStorage.getItem('kermingo:myOrders')).toContain(token)
    expect(mockClear).toHaveBeenCalled()

    checkout.unmount()
    render(<TrackingScreen />)

    expect(await screen.findByText('Está en preparación')).toBeTruthy()
    expect(screen.getByText('En curso ahora')).toBeTruthy()
  })
})
