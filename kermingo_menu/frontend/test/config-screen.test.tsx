import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ConfigScreen } from '@/components/admin/config-screen'
import type { ApiConfiguracion } from '@/lib/types'

const mockExpireSession = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/config',
}))

vi.mock('@/components/admin/admin-session', () => ({
  useAdminSession: () => ({ expireSession: mockExpireSession }),
}))

vi.mock('@/components/admin/admin-shell', () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const mockApiGet = vi.fn<(url: string) => Promise<ApiConfiguracion>>()
const mockApiPut = vi.fn<(url: string, body: unknown) => Promise<ApiConfiguracion>>()

vi.mock('@/lib/api', () => ({
  apiGet: (...args: Parameters<typeof mockApiGet>) => mockApiGet(...args),
  apiPut: (...args: Parameters<typeof mockApiPut>) => mockApiPut(...args),
  ApiError: class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
}))

describe('ConfigScreen', () => {
  const baseConfig: ApiConfiguracion = {
    id: 1,
    estado: 'abierta',
    mensaje_publico: 'Bienvenidos',
    cena_habilitada_desde: '20:30:00',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('muestra el valor actual de cena_habilitada_desde', async () => {
    mockApiGet.mockResolvedValue(baseConfig)

    render(<ConfigScreen />)

    const input = (await screen.findByLabelText('Hora desde la que se habilita la cena en menú')) as HTMLInputElement
    expect(input.value).toBe('20:30:00')
  })

  it('guarda solo cena_habilitada_desde en el endpoint admin', async () => {
    mockApiGet.mockResolvedValue(baseConfig)
    mockApiPut.mockImplementation(async (url: string, body: unknown) => {
      expect(url).toBe('/api/admin/configuracion-tienda')
      expect(body).toEqual({ cena_habilitada_desde: '21:45:30' })

      return {
        ...baseConfig,
        cena_habilitada_desde: '21:45:30',
      }
    })

    render(<ConfigScreen />)

    const input = (await screen.findByLabelText('Hora desde la que se habilita la cena en menú')) as HTMLInputElement
    fireEvent.change(input, { target: { value: '21:45:30' } })

    const saveButton = screen.getByRole('button', { name: /guardar hora de cena/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledTimes(1)
      expect(screen.getByText('Hora de cena actualizada')).toBeTruthy()
    })
  })

  it('normaliza HH:MM a HH:MM:SS al guardar', async () => {
    mockApiGet.mockResolvedValue({
      ...baseConfig,
      cena_habilitada_desde: null,
    })

    const response: ApiConfiguracion = {
      ...baseConfig,
      cena_habilitada_desde: '20:00:00',
    }

    mockApiPut.mockResolvedValue(response)

    render(<ConfigScreen />)

    const input = (await screen.findByLabelText('Hora desde la que se habilita la cena en menú')) as HTMLInputElement
    fireEvent.change(input, { target: { value: '20:00' } })

    const saveButton = screen.getByRole('button', { name: /guardar hora de cena/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith('/api/admin/configuracion-tienda', {
        cena_habilitada_desde: '20:00:00',
      })
    })
  })
})
