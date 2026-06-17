import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as api from '@/lib/api'
import { ProductsScreen } from '@/components/admin/products-screen'
import React from 'react'

const getFileInput = (container: HTMLElement) =>
  container.querySelector('input[type="file"]') as HTMLInputElement

vi.mock('@/components/admin/admin-shell', () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const mockUseApiResource = vi.fn()

vi.mock('@/lib/use-api-resource', () => ({
  useApiResource: (...args: unknown[]) => mockUseApiResource(...args),
}))

describe('ProductsScreen — image upload in product creation', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockUseApiResource.mockReset()
    mockUseApiResource.mockReturnValue({
      data: [],
      loading: false,
      refreshing: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
      setData: vi.fn(),
    })

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://fake-image')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  })

  it('mantiene abierto el diálogo si falla la carga de imagen al crear', async () => {
    vi.spyOn(api, 'apiPost').mockResolvedValue({
      id: 55,
      nombre: 'Pizza',
      descripcion: null,
      precio: 1250,
      tipo: 'comida',
      stock_limitado: 1,
      stock_actual: 10,
      stock_minimo_alerta: 2,
      activo: 1,
      imagen_archivo_id: null,
      imagen_nombre_original: null,
      imagen_mime_type: null,
      imagen_tamanio_bytes: null,
      imagen_url: null,
      categorias: 'Cena',
    })
    vi.spyOn(api, 'apiPostForm').mockRejectedValue(new api.ApiError('sin permiso', 500))

    const { container } = render(<ProductsScreen />)

    fireEvent.click(screen.getByRole('button', { name: /nuevo producto/i }))

    const nameInput = screen.getByPlaceholderText(/Pizza muzza/i)
    const priceInput = screen.getByPlaceholderText('0')
    const createButton = screen.getByRole('button', { name: /crear producto/i })

    fireEvent.change(nameInput, { target: { value: 'Pizza' } })
    fireEvent.change(priceInput, { target: { value: '1250' } })

    const file = new File(['img'], 'pizza.webp', { type: 'image/webp' })
    fireEvent.change(getFileInput(container), {
      target: { files: [file] as unknown as FileList },
    })

    fireEvent.click(createButton)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Nuevo producto/i })).toBeTruthy()
      expect(
        screen.getByText('Producto creado, pero la imagen no se pudo subir: sin permiso'),
      ).toBeTruthy()
      expect(api.apiPost).toHaveBeenCalledTimes(1)
      expect(api.apiPostForm).toHaveBeenCalledTimes(1)
    })
  })
})
