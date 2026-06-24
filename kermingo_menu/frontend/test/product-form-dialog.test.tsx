import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as api from '@/lib/api'
import * as admin from '@/lib/admin'
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

describe('ProductFormDialog — promo component editor', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://fake')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  })

  const promoProduct: AdminProduct = {
    id: '10',
    name: 'Combo cena',
    description: 'Pancho + gaseosa',
    price: 6500,
    type: 'promo',
    meals: ['cena'],
    icon: 'combo',
    active: true,
    available: false,
    order: 0,
    stockLimited: false,
    stockCurrent: 0,
    stockMin: 0,
    componentesCount: 2,
  }

  const comidaProduct: AdminProduct = {
    id: '5',
    name: 'Pancho',
    description: '',
    price: 2500,
    type: 'comida',
    meals: ['cena'],
    icon: 'sandwich',
    active: true,
    available: true,
    order: 1,
    stockLimited: true,
    stockCurrent: 20,
    stockMin: 5,
  }

  const bebidaProduct: AdminProduct = {
    ...comidaProduct,
    id: '15',
    name: 'Coca Cola',
    type: 'bebida',
    icon: 'soda',
  }

  it('shows component editor when type is promo', async () => {
    const onSave = vi.fn(async (p: AdminProduct) => p)
    const onClose = vi.fn()

    vi.spyOn(admin, 'fetchComponentes').mockResolvedValue([
      { productoId: 5, nombre: 'Pancho', cantidad: 1, activo: true, disponible: true, stockLimited: true, stockActual: 20 },
      { productoId: 15, nombre: 'Coca Cola', cantidad: 1, activo: true, disponible: true, stockLimited: false, stockActual: null },
    ])

    render(
      <ProductFormDialog
        initial={{ ...promoProduct, componentesCount: 0 }}
        onSave={onSave}
        onClose={onClose}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText(/componentes/i)).not.toBeNull()
    })
  })

  it('does not show component editor for comida type', () => {
    const onSave = vi.fn(async (p: AdminProduct) => p)
    const onClose = vi.fn()

    render(
      <ProductFormDialog
        initial={comidaProduct}
        onSave={onSave}
        onClose={onClose}
      />,
    )

    expect(screen.queryByText(/componentes/i)).toBeNull()
  })

  it('does not show component editor for bebida type', () => {
    const onSave = vi.fn(async (p: AdminProduct) => p)
    const onClose = vi.fn()

    render(
      <ProductFormDialog
        initial={bebidaProduct}
        onSave={onSave}
        onClose={onClose}
      />,
    )

    expect(screen.queryByText(/componentes/i)).toBeNull()
  })

  it('adds, updates quantity, and removes a component for a promo before save', async () => {
    const onSave = vi.fn(async (p: AdminProduct) => p)
    const onClose = vi.fn()

    vi.spyOn(admin, 'fetchComponentes').mockResolvedValue([])

    render(
      <ProductFormDialog
        initial={promoProduct}
        allProducts={[comidaProduct]}
        onSave={onSave}
        onClose={onClose}
      />,
    )

    const select = document.querySelector('#component-producto') as HTMLSelectElement
    const addButton = screen.getByRole('button', { name: /agregar/i })
    const qtyInput = screen.getByRole('spinbutton', { name: 'Cantidad' }) as HTMLInputElement
    expect(select).not.toBeNull()

    expect(select).not.toBeNull()
    fireEvent.change(select, { target: { value: comidaProduct.id } })
    fireEvent.change(qtyInput, { target: { value: '2' } })
    await waitFor(() => {
      expect(addButton.hasAttribute('disabled')).toBe(false)
    })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('Pancho', { selector: 'p' })).not.toBeNull()
    })

    const rowQtyInput = document.querySelector('#component-qty-5') as HTMLInputElement
    expect(rowQtyInput).toBeTruthy()
    expect(rowQtyInput.value).toBe('2')

    fireEvent.change(rowQtyInput, { target: { value: '4' } })
    expect(rowQtyInput.value).toBe('4')

    const removeButton = screen.getByRole('button', { name: /quitar/i })
    fireEvent.click(removeButton)

    await waitFor(() => {
      expect(screen.queryByText('Pancho', { selector: 'p' })).toBeNull()
    })
  })

  it('saves promo component payload when saving promo with components', async () => {
    const onSave = vi.fn(async (p: AdminProduct) => ({ ...p, id: '55' }))
    const onClose = vi.fn()

    vi.spyOn(admin, 'fetchComponentes').mockResolvedValue([])
    const saveComponents = vi.spyOn(admin, 'saveComponentes').mockResolvedValue([
      {
        productoId: 5,
        nombre: 'Pancho',
        cantidad: 3,
        activo: true,
        disponible: true,
        stockLimited: true,
        stockActual: 20,
      },
    ])

    render(
      <ProductFormDialog
        initial={promoProduct}
        allProducts={[comidaProduct]}
        onSave={onSave}
        onClose={onClose}
      />,
    )

    const select = document.querySelector('#component-producto') as HTMLSelectElement
    const addButton = screen.getByRole('button', { name: /agregar/i })
    const qtyInput = screen.getByRole('spinbutton', { name: 'Cantidad' }) as HTMLInputElement
    expect(select).not.toBeNull()

    fireEvent.change(select, { target: { value: comidaProduct.id } })
    fireEvent.change(qtyInput, { target: { value: '3' } })
    await waitFor(() => {
      expect(addButton.hasAttribute('disabled')).toBe(false)
    })
    fireEvent.click(addButton)

    const saveButton = screen.getByRole('button', { name: /guardar cambios|crear producto/i })
    await waitFor(() => {
      expect(screen.queryByText('Esta promo no tiene componentes configurados.')).toBeNull()
      expect(screen.getByText('Pancho', { selector: 'p' })).not.toBeNull()
    })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ available: false, type: 'promo' }))
      expect(saveComponents).toHaveBeenCalledWith(55, [{ producto_id: 5, cantidad: 3 }])
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('preserves available=true when creating a promo after components are saved', async () => {
    const onSave = vi
      .fn()
      .mockImplementationOnce(async (p: AdminProduct) => ({ ...p, id: '55', available: false }))
      .mockImplementationOnce(async (p: AdminProduct) => p)
    const onClose = vi.fn()

    vi.spyOn(admin, 'fetchComponentes').mockResolvedValue([])
    vi.spyOn(admin, 'saveComponentes').mockResolvedValue([
      { productoId: 5, nombre: 'Pancho', cantidad: 1, activo: true, disponible: true, stockLimited: true, stockActual: 20 },
    ])

    render(
      <ProductFormDialog
        initial={{ ...promoProduct, id: '', available: true }}
        allProducts={[comidaProduct]}
        onSave={onSave}
        onClose={onClose}
      />,
    )

    const select = document.querySelector('#component-producto') as HTMLSelectElement
    fireEvent.change(select, { target: { value: comidaProduct.id } })
    fireEvent.click(screen.getByRole('button', { name: /agregar/i }))
    fireEvent.click(screen.getByRole('button', { name: /crear producto/i }))

    await waitFor(() => {
      expect(onSave).toHaveBeenNthCalledWith(1, expect.objectContaining({ available: false, type: 'promo' }))
      expect(admin.saveComponentes).toHaveBeenCalledWith(55, [{ producto_id: 5, cantidad: 1 }])
      expect(onSave).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: '55', available: true, type: 'promo' }))
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('allows clearing stock current and typing a clean value', () => {
    const onSave = vi.fn(async (p: AdminProduct) => p)
    const onClose = vi.fn()

    render(
      <ProductFormDialog
        initial={comidaProduct}
        onSave={onSave}
        onClose={onClose}
      />,
    )

    const stockInput = screen.getByLabelText(/stock actual/i) as HTMLInputElement
    fireEvent.change(stockInput, { target: { value: '' } })
    expect(stockInput.value).toBe('')

    fireEvent.change(stockInput, { target: { value: '10' } })
    expect(stockInput.value).toBe('10')
  })

  it('editing existing component quantity sends updated payload', async () => {
    const onSave = vi.fn(async (p: AdminProduct) => ({ ...p, id: '10' }))
    const onClose = vi.fn()

    vi.spyOn(admin, 'fetchComponentes').mockResolvedValue([
      { productoId: 5, nombre: 'Pancho', cantidad: 2, activo: true, disponible: true, stockLimited: true, stockActual: 20 },
    ])
    const saveComponents = vi.spyOn(admin, 'saveComponentes').mockResolvedValue([
      { productoId: 5, nombre: 'Pancho', cantidad: 4, activo: true, disponible: true, stockLimited: true, stockActual: 20 },
    ])

    render(
      <ProductFormDialog
        initial={promoProduct}
        onSave={onSave}
        onClose={onClose}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Pancho', { selector: 'p' })).not.toBeNull()
    })

    const quantityInput = document.querySelector('#component-qty-5') as HTMLInputElement
    expect(quantityInput).not.toBeNull()
    fireEvent.change(quantityInput, { target: { value: '4' } })

    const saveButton = screen.getByRole('button', { name: /guardar cambios/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ available: false, type: 'promo', id: '10' }))
      expect(saveComponents).toHaveBeenCalledWith(10, [{ producto_id: 5, cantidad: 4 }])
    })
  })

  it('removing one existing component sends remaining payload', async () => {
    const onSave = vi.fn(async (p: AdminProduct) => ({ ...p, id: '10' }))
    const onClose = vi.fn()

    vi.spyOn(admin, 'fetchComponentes').mockResolvedValue([
      { productoId: 5, nombre: 'Pancho', cantidad: 2, activo: true, disponible: true, stockLimited: true, stockActual: 20 },
      { productoId: 15, nombre: 'Coca Cola', cantidad: 1, activo: true, disponible: true, stockLimited: false, stockActual: null },
    ])
    const saveComponents = vi.spyOn(admin, 'saveComponentes').mockResolvedValue([
      { productoId: 15, nombre: 'Coca Cola', cantidad: 1, activo: true, disponible: true, stockLimited: false, stockActual: null },
    ])

    render(
      <ProductFormDialog
        initial={promoProduct}
        onSave={onSave}
        onClose={onClose}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Pancho', { selector: 'p' })).not.toBeNull()
      expect(screen.getByText('Coca Cola', { selector: 'p' })).not.toBeNull()
    })

    const panchoRow = screen.getByText('Pancho', { selector: 'p' }).closest('li')
    expect(panchoRow).not.toBeNull()
    const removePancho = panchoRow!.querySelector('button[aria-label="Quitar"]') as HTMLButtonElement
    fireEvent.click(removePancho)

    await waitFor(() => {
      expect(screen.queryByText('Pancho', { selector: 'p' })).toBeNull()
    })

    const saveButton = screen.getByRole('button', { name: /guardar cambios/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(saveComponents).toHaveBeenCalledWith(10, [{ producto_id: 15, cantidad: 1 }])
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('creating a new promo with no components does not call saveComponentes', async () => {
    const onSave = vi.fn(async (p: AdminProduct) => ({ ...p, id: '10' }))
    const onClose = vi.fn()

    vi.spyOn(admin, 'fetchComponentes').mockResolvedValue([])
    const saveComponents = vi.spyOn(admin, 'saveComponentes').mockResolvedValue([])

    render(
      <ProductFormDialog
        initial={{ ...promoProduct, id: '' }}
        onSave={onSave}
        onClose={onClose}
      />,
    )

    const saveButton = screen.getByRole('button', { name: /crear producto/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ available: false, type: 'promo' }))
      expect(saveComponents).not.toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('existing empty promo does not call saveComponentes when components are untouched', async () => {
    const onSave = vi.fn(async (p: AdminProduct) => ({ ...p, id: '10' }))
    const onClose = vi.fn()

    vi.spyOn(admin, 'fetchComponentes').mockResolvedValue([])
    const saveComponents = vi.spyOn(admin, 'saveComponentes').mockResolvedValue([])

    render(
      <ProductFormDialog
        initial={promoProduct}
        onSave={onSave}
        onClose={onClose}
      />,
    )

    const saveButton = screen.getByRole('button', { name: /guardar cambios/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ available: false, type: 'promo', id: '10' }))
      expect(saveComponents).not.toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('removing the last existing component sends empty component payload', async () => {
    const onSave = vi.fn(async (p: AdminProduct) => ({ ...p, id: '10' }))
    const onClose = vi.fn()

    vi.spyOn(admin, 'fetchComponentes').mockResolvedValue([
      { productoId: 5, nombre: 'Pancho', cantidad: 2, activo: true, disponible: true, stockLimited: true, stockActual: 20 },
    ])
    const saveComponents = vi.spyOn(admin, 'saveComponentes').mockResolvedValue([])

    render(
      <ProductFormDialog
        initial={promoProduct}
        onSave={onSave}
        onClose={onClose}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Pancho', { selector: 'p' })).not.toBeNull()
    })

    const removeButton = screen.getByRole('button', { name: /quitar/i })
    fireEvent.click(removeButton)

    await waitFor(() => {
      expect(screen.queryByText('Pancho', { selector: 'p' })).toBeNull()
    })

    const saveButton = screen.getByRole('button', { name: /guardar cambios/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(saveComponents).toHaveBeenCalledWith(10, [])
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('blocks saving a promo marked as available without components', async () => {
    const onSave = vi.fn(async (p: AdminProduct) => ({ ...p, id: '99' }))
    const onClose = vi.fn()

    vi.spyOn(admin, 'fetchComponentes').mockResolvedValue([])

    render(
      <ProductFormDialog
        initial={{ ...promoProduct, available: true, id: '99' }}
        allProducts={[comidaProduct]}
        onSave={onSave}
        onClose={onClose}
      />
    )

    const saveButton = screen.getByRole('button', { name: /guardar cambios/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getAllByText('La promo necesita componentes antes de estar disponible.').length).toBeGreaterThanOrEqual(1)
      expect(onSave).not.toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  it('renders loaded components with product name and quantity', async () => {
    const onSave = vi.fn(async (p: AdminProduct) => p)
    const onClose = vi.fn()

    vi.spyOn(admin, 'fetchComponentes').mockResolvedValue([
      { productoId: 5, nombre: 'Pancho', cantidad: 2, activo: true, disponible: true, stockLimited: true, stockActual: 20 },
      { productoId: 15, nombre: 'Coca Cola', cantidad: 1, activo: true, disponible: true, stockLimited: false, stockActual: null },
    ])

    render(
      <ProductFormDialog
        initial={promoProduct}
        onSave={onSave}
        onClose={onClose}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Pancho', { selector: 'p' })).not.toBeNull()
      expect(screen.getByText('Coca Cola')).not.toBeNull()
    })
  })

  it('removes a component when remove is clicked', async () => {
    const onSave = vi.fn(async (p: AdminProduct) => p)
    const onClose = vi.fn()

    vi.spyOn(admin, 'fetchComponentes').mockResolvedValue([
      { productoId: 5, nombre: 'Pancho', cantidad: 2, activo: true, disponible: true, stockLimited: true, stockActual: 20 },
      { productoId: 15, nombre: 'Coca Cola', cantidad: 1, activo: true, disponible: true, stockLimited: false, stockActual: null },
    ])

    render(
      <ProductFormDialog
        initial={promoProduct}
        onSave={onSave}
        onClose={onClose}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Pancho', { selector: 'p' })).not.toBeNull()
    })

    // Find the remove button next to "Pancho"
    const removeButtons = screen.getAllByRole('button', { name: /quitar/i })
    // Click the first remove button (should be for Pancho since it's first)
    fireEvent.click(removeButtons[0])

    await waitFor(() => {
      expect(screen.queryByText('Pancho', { selector: 'p' })).toBeNull()
    })
  })

  it('keeps draft visible on component save failure', async () => {
    const onSave = vi.fn(async (p: AdminProduct) => p)
    const onClose = vi.fn()

    vi.spyOn(admin, 'fetchComponentes').mockResolvedValue([
      { productoId: 5, nombre: 'Pancho', cantidad: 1, activo: true, disponible: true, stockLimited: true, stockActual: 20 },
    ])
    vi.spyOn(admin, 'saveComponentes').mockRejectedValue(
      new api.ApiError('No se pudieron guardar los componentes', 400),
    )

    render(
      <ProductFormDialog
        initial={promoProduct}
        onSave={onSave}
        onClose={onClose}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Pancho', { selector: 'p' })).not.toBeNull()
    })

    // Click save (Guardar cambios)
    const saveButton = screen.getByRole('button', { name: /guardar cambios/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      // Dialog should stay open and show error about componentes
      expect(onClose).not.toHaveBeenCalled()
      expect(screen.getByText(/no se pudieron guardar los componentes/i)).not.toBeNull()
    })
  })
})
