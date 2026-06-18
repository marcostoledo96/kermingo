import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as api from '@/lib/api'
import type { ApiProducto } from '@/lib/types'
import type { AdminProduct } from '@/lib/admin'
import { ProductFormDialog } from '@/components/admin/product-form-dialog'

const getFileInput = (container: HTMLElement) =>
  container.querySelector('input[type="file"]') as HTMLInputElement

const fillMinimumFields = () => {
  const nameInput = screen.getByPlaceholderText(/Pizza muzza/i)
  const priceInput = screen.getByPlaceholderText('0')
  const createButton = screen.getByRole('button', { name: /crear producto/i })

  fireEvent.change(nameInput, { target: { value: 'Pizza' } })
  fireEvent.change(priceInput, { target: { value: '1250' } })

  // default meal includes cena, so it's valid already
  return createButton
}

const attachFile = (input: HTMLInputElement, file: File) => {
  fireEvent.change(input, {
    target: {
      files: [file] as unknown as FileList,
    },
  })
}

const uploadedApiResponse: ApiProducto = {
  id: 55,
  nombre: 'Pizza',
  descripcion: null,
  precio: 1250,
  tipo: 'comida',
  stock_limitado: 1,
  stock_actual: 10,
  stock_minimo_alerta: 2,
  activo: 1,
  disponible: 1,
  orden: 0,
  imagen_archivo_id: 7,
  imagen_nombre_original: 'pizza.webp',
  imagen_mime_type: 'image/webp',
  imagen_tamanio_bytes: 1234,
  imagen_url: '/api/productos/55/imagen?v=7',
  categorias: 'Cena',
}

describe('ProductFormDialog', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://fake')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  })

  it('refreshes created product with uploaded image and closes on success', async () => {
    const onSave = vi.fn(async (product: AdminProduct): Promise<AdminProduct> => ({
      ...product,
      id: '55',
    }))
    const onProductUpdated = vi.fn()
    const onClose = vi.fn()

    vi.spyOn(api, 'apiPostForm').mockResolvedValue(uploadedApiResponse)

    const { container } = render(
      <ProductFormDialog
        onSave={onSave}
        onClose={onClose}
        onProductUpdated={onProductUpdated}
      />,
    )

    const createButton = fillMinimumFields()

    const file = new File(['img'], 'pizza.webp', { type: 'image/webp' })
    attachFile(getFileInput(container), file)

    fireEvent.click(createButton)

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1)
      expect(api.apiPostForm).toHaveBeenCalledTimes(1)
      expect(onProductUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '55',
          image: expect.stringContaining('/api/productos/55/imagen?v=7'),
        }),
      )
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('keeps dialog open and shows warning when image upload fails after create', async () => {
    const onSave = vi.fn(async (product: AdminProduct): Promise<AdminProduct> => ({
      ...product,
      id: '56',
    }))
    const onProductUpdated = vi.fn()
    const onClose = vi.fn()

    vi.spyOn(api, 'apiPostForm').mockRejectedValue(new api.ApiError('sin permiso', 500))

    const { container } = render(
      <ProductFormDialog
        onSave={onSave}
        onClose={onClose}
        onProductUpdated={onProductUpdated}
      />,
    )

    const createButton = fillMinimumFields()

    const file = new File(['img'], 'pizza.jpg', { type: 'image/jpeg' })
    attachFile(getFileInput(container), file)

    fireEvent.click(createButton)

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1)
      expect(api.apiPostForm).toHaveBeenCalledTimes(1)
      expect(onProductUpdated).not.toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()
      expect(
        screen.queryByText('Producto creado, pero la imagen no se pudo subir: sin permiso'),
      ).not.toBeNull()
    })
  })
})
