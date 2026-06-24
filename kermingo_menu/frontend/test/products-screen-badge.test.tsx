import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as api from '@/lib/api'
import * as admin from '@/lib/admin'
import type { ApiProducto } from '@/lib/types'
import { ProductsScreen } from '@/components/admin/products-screen'
import React from 'react'

// Mock AdminShell to avoid layout dependency
vi.mock('@/components/admin/admin-shell', () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock dnd-kit to avoid DOM sensor errors in jsdom
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  closestCenter: {},
  KeyboardSensor: {},
  PointerSensor: {},
  useSensor: () => ({}),
  useSensors: () => [],
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  sortableKeyboardCoordinates: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: {},
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => '' } },
}))

const mockUseApiResource = vi.fn()

vi.mock('@/lib/use-api-resource', () => ({
  useApiResource: (...args: unknown[]) => mockUseApiResource(...args),
}))

const makeProduct = (overrides: Partial<admin.AdminProduct> & { id: string }): admin.AdminProduct => ({
  name: 'Test Product',
  description: '',
  price: 1000,
  type: 'comida',
  meals: ['cena'],
  icon: 'pizza',
  active: true,
  available: true,
  order: 0,
  stockLimited: false,
  stockCurrent: 0,
  stockMin: 0,
  ...overrides,
})

const makeStatefulProductsResource = (initialData: admin.AdminProduct[]) => {
  return () => {
    const [data, setData] = React.useState(initialData)
    return {
      data,
      loading: false,
      refreshing: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
      setData,
    }
  }
}

describe('ProductsScreen — promo incomplete badge', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockUseApiResource.mockReset()
  })

  it('renders "Incompleta" badge for promo with componentes_count === 0', async () => {
    const incompletePromo = makeProduct({
      id: '20',
      name: 'Combo vacío',
      type: 'promo',
      active: true,
      available: false,
      componentesCount: 0,
    })

    mockUseApiResource.mockReturnValue({
      data: [incompletePromo],
      loading: false,
      refreshing: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
      setData: vi.fn(),
    })

    render(<ProductsScreen />)

    // The product should render and show "Incompleta" badge in both mobile and desktop views
    await waitFor(() => {
      const badges = screen.getAllByText('Incompleta')
      expect(badges.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('does not render "Incompleta" badge for promo with components', async () => {
    const completePromo = makeProduct({
      id: '21',
      name: 'Combo completo',
      type: 'promo',
      available: true,
      componentesCount: 3,
    })

    mockUseApiResource.mockReturnValue({
      data: [completePromo],
      loading: false,
      refreshing: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
      setData: vi.fn(),
    })

    render(<ProductsScreen />)

    await waitFor(() => {
      expect(screen.getAllByText('Combo completo').length).toBeGreaterThanOrEqual(1)
    })
    // Should NOT show incomplete badge
    expect(screen.queryByText('Incompleta')).toBeNull()
  })

  it('does not render "Incompleta" badge for non-promo product', async () => {
    const comida = makeProduct({
      id: '5',
      name: 'Pancho',
      type: 'comida',
      componentesCount: 0,
    })

    mockUseApiResource.mockReturnValue({
      data: [comida],
      loading: false,
      refreshing: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
      setData: vi.fn(),
    })

    render(<ProductsScreen />)

    await waitFor(() => {
      expect(screen.getAllByText('Pancho').length).toBeGreaterThanOrEqual(1)
    })
    expect(screen.queryByText('Incompleta')).toBeNull()
  })

  it('does not call apiPatch when trying to recover an incomplete promo', async () => {
    const incompletePromo = makeProduct({
      id: '20',
      name: 'Combo vacío',
      type: 'promo',
      active: false,
      available: false,
      componentesCount: 0,
    })

    const patch = vi.spyOn(api, 'apiPatch').mockResolvedValue({} as never)

    mockUseApiResource.mockReturnValue({
      data: [incompletePromo],
      loading: false,
      refreshing: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
      setData: vi.fn(),
    })

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined)

    render(<ProductsScreen />)

    const toggleMenus = await screen.findAllByRole('button', { name: 'Más acciones' })
    fireEvent.click(toggleMenus[0])

    const recoverButton = await screen.findByRole('button', { name: /recuperar/i })
    fireEvent.click(recoverButton)

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Esta promo no tiene componentes configurados. Agregá componentes antes de habilitarla.',
      )
      expect(patch).not.toHaveBeenCalled()
    })
  })
})

describe('isPromoIncomplete', () => {
  it('returns true for promo with componentes_count === 0', () => {
    const promo = makeProduct({ id: '20', type: 'promo', componentesCount: 0 })
    expect(admin.isPromoIncomplete(promo)).toBe(true)
  })

  it('returns true for promo with undefined componentes_count', () => {
    const promo = makeProduct({ id: '21', type: 'promo' })
    expect(admin.isPromoIncomplete(promo)).toBe(true)
  })

  it('returns false for promo with componentes_count > 0', () => {
    const promo = makeProduct({ id: '22', type: 'promo', componentesCount: 3 })
    expect(admin.isPromoIncomplete(promo)).toBe(false)
  })

  it('returns false for comida regardless of componentes_count', () => {
    const comida = makeProduct({ id: '5', type: 'comida', componentesCount: 0 })
    expect(admin.isPromoIncomplete(comida)).toBe(false)
  })

  it('returns false for bebida regardless of componentes_count', () => {
    const bebida = makeProduct({ id: '15', type: 'bebida', componentesCount: 0 })
    expect(admin.isPromoIncomplete(bebida)).toBe(false)
  })

  it('updates Incompleta badge after promo component save', async () => {
    const incompletePromo = makeProduct({
      id: '20',
      name: 'Combo vacío',
      type: 'promo',
      active: true,
      available: true,
      componentesCount: 0,
    })

    const baseProduct = makeProduct({
      id: '5',
      name: 'Pancho',
      type: 'comida',
      stockLimited: true,
      stockCurrent: 20,
      stockMin: 5,
    })

    mockUseApiResource.mockImplementation(makeStatefulProductsResource([incompletePromo, baseProduct]))

    vi.spyOn(admin, 'fetchComponentes').mockResolvedValue([])
    vi.spyOn(admin, 'saveComponentes').mockResolvedValue([
      {
        productoId: 5,
        nombre: 'Pancho',
        cantidad: 2,
        activo: true,
        disponible: true,
        stockLimited: true,
        stockActual: 20,
      },
    ])

    const updatedApiProduct: ApiProducto = {
      id: 20,
      nombre: incompletePromo.name,
      descripcion: null,
      precio: incompletePromo.price,
      tipo: 'promo',
      stock_limitado: 1,
      stock_actual: incompletePromo.stockCurrent,
      stock_minimo_alerta: incompletePromo.stockMin,
      activo: incompletePromo.active ? 1 : 0,
      disponible: 1,
      orden: incompletePromo.order,
      imagen_archivo_id: null,
      imagen_nombre_original: null,
      imagen_mime_type: null,
      imagen_tamanio_bytes: null,
      imagen_url: null,
      categorias: 'Cena',
      componentes_count: 2,
    }

    vi.spyOn(api, 'apiPut').mockResolvedValue(updatedApiProduct)

    render(<ProductsScreen />)

    await waitFor(() => {
      expect(screen.getAllByText('Incompleta').length).toBeGreaterThanOrEqual(1)
    })

    const editButtons = await screen.findAllByRole('button', { name: /editar producto/i })
    const editButton = editButtons.find((button) =>
      !!(button.closest('tr') || button.closest('div'))?.textContent?.includes(incompletePromo.name),
    )

    if (!editButton) {
      throw new Error('Could not find edit button for incomplete promo in ProductsScreen')
    }

    fireEvent.click(editButton)

    await waitFor(() => {
      expect(screen.getByText('Componentes')).toBeTruthy()
    })
    await waitFor(() => {
      expect(screen.getByText('Esta promo no tiene componentes configurados.')).toBeTruthy()
    })

    const componentSelect = document.querySelector('#component-producto') as HTMLSelectElement
    const componentQtyInput = screen.getByRole('spinbutton', { name: 'Cantidad' }) as HTMLInputElement
    const addButton = screen.getByRole('button', { name: /agregar/i })

    fireEvent.change(componentSelect, { target: { value: baseProduct.id } })
    fireEvent.change(componentQtyInput, { target: { value: '2' } })
    expect(addButton.disabled).toBe(false)
    fireEvent.click(addButton)

    const saveButton = screen.getByRole('button', { name: /guardar cambios/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(admin.saveComponentes).toHaveBeenCalledWith(20, [{ producto_id: 5, cantidad: 2 }])
      expect(screen.queryAllByText('Incompleta')).toHaveLength(0)
    })
  })
})
