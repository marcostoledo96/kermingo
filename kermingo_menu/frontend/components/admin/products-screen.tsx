'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus,
  Search,
  Pencil,
  Power,
  RotateCcw,
  Boxes,
  Minus,
  X,
  PackageX,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  MoreHorizontal,
  Infinity as InfinityIcon,
  GripVertical,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { formatPrice, type MealCategory, type ProductType } from '@/lib/products'
import { ProductIconGlyph } from '@/components/menu/product-visual'
import { AdminShell } from './admin-shell'
import { EstadoBadge, type EstadoVisual } from './admin-ui'
import { ProductFormDialog } from './product-form-dialog'
import { apiGet, apiPatch, apiPost, apiPut, ApiError } from '@/lib/api'
import {
  type AdminProduct,
  adminToApiPayload,
  apiToAdminProduct,
  isPromoIncomplete,
} from '@/lib/admin'
import { useApiResource } from '@/lib/use-api-resource'
import type { ApiProducto, ApiProductoPaginada } from '@/lib/types'

type ProductState = 'activo' | 'desactivado' | 'agotado' | 'no_disponible'

function getState(p: AdminProduct): ProductState {
  if (!p.active) return 'desactivado'
  if (!p.available) return 'no_disponible'
  if (p.stockLimited && p.stockCurrent <= 0) return 'agotado'
  return 'activo'
}

/** Map product state to EstadoVisual for Kermingo tokens */
function stateToEstado(s: ProductState): EstadoVisual {
  switch (s) {
    case 'activo': return 'activo'
    case 'agotado': return 'agotado'
    case 'no_disponible': return 'recibido' // amber/pending tone
    case 'desactivado': return 'entregado' // muted/closed tone
  }
}

const TYPE_LABEL: Record<ProductType, string> = {
  comida: 'Comida',
  bebida: 'Bebida',
  promo: 'Promo',
}

const MEAL_LABEL: Record<string, string> = {
  merienda: 'Merienda',
  cena: 'Cena',
}

type MealFilter = 'todas' | MealCategory
type TypeFilter = 'todos' | ProductType
type StateFilter = 'todos' | ProductState

/** Group products by their meal categories. Products in multiple categories appear in each. */
function groupByMealCategory(products: AdminProduct[]): Array<{ key: string; label: string; products: AdminProduct[] }> {
  const groups = new Map<string, AdminProduct[]>()

  for (const p of products) {
    if (p.meals.length === 0) {
      const key = '_sin_categoria'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(p)
    } else {
      for (const m of p.meals) {
        if (!groups.has(m)) groups.set(m, [])
        groups.get(m)!.push(p)
      }
    }
  }

  const result: Array<{ key: string; label: string; products: AdminProduct[] }> = []
  // Deterministic order: merienda first, cena, then uncategorized
  for (const key of ['merienda', 'cena', '_sin_categoria']) {
    const prods = groups.get(key)
    if (prods && prods.length > 0) {
      result.push({
        key,
        label: key === '_sin_categoria' ? 'Sin categoría' : MEAL_LABEL[key] ?? key,
        products: prods.sort((a, b) => a.order - b.order || Number(a.id) - Number(b.id)),
      })
    }
  }
  return result
}

export function ProductsScreen() {
  const [search, setSearch] = useState('')
  const [mealFilter, setMealFilter] = useState<MealFilter>('todas')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todos')
  const [stateFilter, setStateFilter] = useState<StateFilter>('activo')

  const [editing, setEditing] = useState<AdminProduct | null>(null)
  const [creating, setCreating] = useState(false)
  const [adjusting, setAdjusting] = useState<AdminProduct | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    data: products,
    loading,
    refreshing,
    error: loadError,
    refetch,
    setData: setProducts,
  } = useApiResource<AdminProduct[]>(async () => {
    const estadoParam = stateFilter === 'no_disponible' ? 'todavia_no_disponible' : stateFilter
    const data = await apiGet<ApiProductoPaginada>('/api/admin/productos', { estado: estadoParam === 'todos' ? undefined : estadoParam, limit: 100 })
    return data.productos.map(apiToAdminProduct)
  })

  // Refetch when stateFilter changes (server-side filtering)
  useEffect(() => {
    refetch({ silent: true })
  }, [stateFilter, refetch])

  const filtered = useMemo(() => {
    if (!products) return []
    return products.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      if (mealFilter !== 'todas' && !p.meals.includes(mealFilter)) return false
      if (typeFilter !== 'todos' && p.type !== typeFilter) return false
      // stateFilter is now applied server-side; no client-side filtering needed
      return true
    })
  }, [products, search, mealFilter, typeFilter])

  // Group filtered products by category for display
  const grouped = useMemo(() => groupByMealCategory(filtered), [filtered])

  // Only allow reorder when viewing "activo" or "todos" and not searching
  const canReorder = (stateFilter === 'activo' || stateFilter === 'todos') && !search

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setProducts((prev) => {
      if (!prev) return prev
      const oldIndex = prev.findIndex((p) => p.id === active.id)
      const newIndex = prev.findIndex((p) => p.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return prev
      return arrayMove(prev, oldIndex, newIndex).map((p, i) => ({ ...p, order: i }))
    })

    // Persist order change
    const currentList = products ?? []
    const oldIdx = currentList.findIndex((p) => p.id === active.id)
    const newIdx = currentList.findIndex((p) => p.id === over.id)
    if (oldIdx === -1 || newIdx === -1) return

    const reordered = arrayMove([...currentList], oldIdx, newIdx)
    const ordenes = reordered.map((p, i) => ({ id: Number(p.id), orden: i }))

    setSavingOrder(true)
    try {
      await apiPatch('/api/admin/productos/orden', { ordenes })
    } catch {
      // Revert on failure
      refetch({ silent: true })
    } finally {
      setSavingOrder(false)
    }
  }, [products, setProducts, refetch])

  const moveItem = useCallback(async (id: string, direction: 'up' | 'down') => {
    if (!products) return
    const idx = products.findIndex((p) => p.id === id)
    if (idx === -1) return
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= products.length) return

    const reordered = arrayMove([...products], idx, targetIdx)
    const ordenes = reordered.map((p, i) => ({ id: Number(p.id), orden: i }))

    setProducts(reordered.map((p, i) => ({ ...p, order: i })))
    setSavingOrder(true)
    try {
      await apiPatch('/api/admin/productos/orden', { ordenes })
    } catch {
      refetch({ silent: true })
    } finally {
      setSavingOrder(false)
    }
  }, [products, setProducts, refetch])

  const handleSave = async (product: AdminProduct): Promise<AdminProduct> => {
    setSubmitting(true)
    setSubmitError(null)
    const payload = adminToApiPayload(product)
    try {
      if (product.id && !product.id.startsWith('prod-')) {
        const updated = await apiPut<ApiProducto>(`/api/admin/productos/${product.id}`, payload)
        const mapped = apiToAdminProduct(updated)
        setProducts((prev) => {
          const list = prev ?? []
          const idx = list.findIndex((p) => p.id === mapped.id)
          if (idx === -1) return [mapped, ...list]
          return list.map((p, i) => (i === idx ? mapped : p))
        })
        return mapped
      } else {
        const created = await apiPost<ApiProducto>('/api/admin/productos', payload)
        const mapped = apiToAdminProduct(created)
        setProducts((prev) => [mapped, ...(prev ?? [])])
        return mapped
      }
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'No se pudo guardar el producto')
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  const handleProductUpdated = (product: AdminProduct) => {
    setProducts((prev) => {
      const list = prev ?? []
      const idx = list.findIndex((p) => p.id === product.id)
      if (idx === -1) return [product, ...list]
      return list.map((p) => (p.id === product.id ? product : p))
    })
  }

  const closeDialog = () => {
    setEditing(null)
    setCreating(false)
    setSubmitError(null)
  }

  const toggleActive = async (id: string) => {
    const product = products?.find((p) => p.id === id)
    if (!product) return
    // Prevent enabling an incomplete promo (backend rejects, but better UX)
    if (!product.active && product.type === 'promo' && isPromoIncomplete(product)) {
      window.alert('Esta promo no tiene componentes configurados. Agregá componentes antes de habilitarla.')
      return
    }
    const willBeActive = !product.active
    // Optimistic update
    setProducts((prev) => (prev ?? []).map((p) => (p.id === id ? { ...p, active: willBeActive } : p)))
    const path = willBeActive
      ? `/api/admin/productos/${id}/recuperar`
      : `/api/admin/productos/${id}/desactivar`
    try {
      await apiPatch(path, {})
    } catch (err) {
      // Revert
      setProducts((prev) => (prev ?? []).map((p) => (p.id === id ? { ...p, active: product.active } : p)))
      window.alert(err instanceof ApiError ? err.message : 'No se pudo cambiar el estado del producto')
    }
  }

  const handleAdjustStock = async (id: string, current: number) => {
    const product = products?.find((p) => p.id === id)
    if (!product) return
    try {
      await apiPatch(`/api/admin/productos/${id}/stock`, { stock_actual: current })
      setProducts((prev) =>
        (prev ?? []).map((p) => (p.id === id ? { ...p, stockCurrent: Math.max(0, current) } : p)),
      )
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'No se pudo ajustar el stock')
    }
  }

  // Flat sorted list for dnd-kit — only show when reorderable (no category grouping needed for drag)
  const sortedIds = useMemo(() => filtered.map((p) => p.id), [filtered])

  return (
    <AdminShell section="Productos">
        {/* Encabezado + nuevo producto */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-[#003B73]">Inventario</h2>
            <p className="text-sm text-[#003B73]/50 km-tabular">
              {filtered.length} de {products?.length ?? 0} productos
              {savingOrder && <span className="ml-2 text-[#F6B21A]">Guardando orden…</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch({ silent: true })}
              disabled={refreshing}
              title="Refrescar"
              aria-label="Refrescar"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--km-linea)] bg-white text-[#003B73] transition-colors hover:bg-[var(--km-fondo)] disabled:opacity-50 km-focus"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={2.2} />
            </button>
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 rounded-xl bg-[#F6B21A] px-4 py-2.5 text-sm font-extrabold text-[#003B73] shadow-lg shadow-[#F6B21A]/30 transition-all hover:bg-[#ffbe2e] active:scale-[0.98] km-focus"
            >
              <Plus className="h-4 w-4" strokeWidth={2.6} />
              <span className="hidden sm:inline">Nuevo producto</span>
              <span className="sm:hidden">Nuevo</span>
            </button>
          </div>
        </div>

        {loadError && (
          <div className="flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--km-peligro-bg)', background: 'var(--km-peligro-bg)', color: 'var(--km-peligro-text)' }}>
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2.2} />
            <span className="flex-1 font-medium">{loadError}</span>
            <button
              onClick={() => refetch()}
              className="rounded-lg border bg-white px-2.5 py-1 text-xs font-bold transition-colors hover:bg-[var(--km-peligro-bg)]"
              style={{ borderColor: 'var(--km-peligro-bg)', color: 'var(--km-peligro-text)' }}
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Filtros */}
        <div className="space-y-3 km-panel p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#75AADB]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre..."
              aria-label="Buscar producto por nombre"
              className="w-full rounded-xl border border-[#75AADB]/30 bg-[#EEF5FF]/30 py-2.5 pl-10 pr-3 text-sm font-medium text-[#003B73] placeholder:text-[#75AADB]/70 focus:border-[#003B73] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <FilterGroup label="Momento">
              <Chip active={mealFilter === 'todas'} onClick={() => setMealFilter('todas')}>Todas</Chip>
              <Chip active={mealFilter === 'merienda'} onClick={() => setMealFilter('merienda')}>Merienda</Chip>
              <Chip active={mealFilter === 'cena'} onClick={() => setMealFilter('cena')}>Cena</Chip>
            </FilterGroup>

            <FilterGroup label="Tipo">
              <Chip active={typeFilter === 'todos'} onClick={() => setTypeFilter('todos')}>Todos</Chip>
              <Chip active={typeFilter === 'comida'} onClick={() => setTypeFilter('comida')}>Comida</Chip>
              <Chip active={typeFilter === 'bebida'} onClick={() => setTypeFilter('bebida')}>Bebida</Chip>
              <Chip active={typeFilter === 'promo'} onClick={() => setTypeFilter('promo')}>Promo</Chip>
            </FilterGroup>

            <FilterGroup label="Estado">
              <Chip active={stateFilter === 'todos'} onClick={() => setStateFilter('todos')}>Todos</Chip>
              <Chip active={stateFilter === 'activo'} onClick={() => setStateFilter('activo')}>Activo</Chip>
              <Chip active={stateFilter === 'desactivado'} onClick={() => setStateFilter('desactivado')}>Desactivado</Chip>
              <Chip active={stateFilter === 'agotado'} onClick={() => setStateFilter('agotado')}>Agotado</Chip>
              <Chip active={stateFilter === 'no_disponible'} onClick={() => setStateFilter('no_disponible')}>No disponible</Chip>
            </FilterGroup>
          </div>
        </div>

        {/* Listado */}
        {loading ? (
          <div className="km-panel p-10 text-center text-sm font-medium text-[#003B73]/50">
            Cargando inventario…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 km-panel px-6 py-16 text-center">
            <PackageX className="h-12 w-12 text-[#75AADB]" strokeWidth={1.6} />
            <p className="font-bold text-[#003B73]">No hay productos con esos filtros</p>
            <p className="text-sm text-[#003B73]/50">Probá ajustar la búsqueda o los filtros.</p>
          </div>
        ) : (
          <>
            {/* Desktop: inventory table with category groups and drag/drop */}
            <div className="hidden lg:block">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={canReorder ? handleDragEnd : undefined}>
                <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
                  {grouped.length > 1 && canReorder ? (
                    // Grouped view with headers
                    grouped.map((group) => (
                      <div key={group.key} className="mb-4">
                        <div className="flex items-center gap-2 mb-2 px-2">
                          <h3 className="text-sm font-bold text-[#003B73]/70">{group.label}</h3>
                          <span className="text-xs text-[#003B73]/40">({group.products.length})</span>
                        </div>
                        <div className="rounded-xl border border-[var(--km-linea)] km-panel p-0">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-[var(--km-linea)] bg-[var(--km-fondo)]/60 text-left text-[11px] font-semibold tracking-wide text-[#003B73]/55">
                                {canReorder && <th className="w-8 px-2 py-3"></th>}
                                <th className="px-4 py-3">Producto</th>
                                <th className="px-4 py-3">Tipo</th>
                                <th className="px-4 py-3 text-right">Precio</th>
                                <th className="px-4 py-3 text-center">Stock</th>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--km-linea)]">
                              {group.products.map((p) => (
                                <SortableProductRow key={p.id} product={p} canReorder={canReorder} onEdit={() => setEditing(p)} onToggle={() => { toggleActive(p.id) }} onAdjust={() => setAdjusting(p)} onMoveUp={canReorder ? () => moveItem(p.id, 'up') : undefined} onMoveDown={canReorder ? () => moveItem(p.id, 'down') : undefined} />
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))
                  ) : (
                    // Flat table (no grouping when filtering by type/meal or viewing non-activo)
                    <div className="km-panel">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[var(--km-linea)] bg-[var(--km-fondo)]/60 text-left text-[11px] font-semibold tracking-wide text-[#003B73]/55">
                              {canReorder && <th className="w-8 px-2 py-3"></th>}
                              <th className="px-4 py-3">Producto</th>
                              <th className="px-4 py-3">Tipo</th>
                              <th className="px-4 py-3">Momento</th>
                              <th className="px-4 py-3 text-right">Precio</th>
                              <th className="px-4 py-3 text-center">Stock</th>
                              <th className="px-4 py-3">Estado</th>
                              <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--km-linea)]">
                            {filtered.map((p) => (
                                <SortableProductRow key={p.id} product={p} canReorder={canReorder} onToggle={() => { toggleActive(p.id) }} onEdit={() => setEditing(p)} onAdjust={() => setAdjusting(p)} onMoveUp={canReorder ? () => moveItem(p.id, 'up') : undefined} onMoveDown={canReorder ? () => moveItem(p.id, 'down') : undefined} />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </SortableContext>
              </DndContext>
            </div>

            {/* Mobile/tablet: compact inventory rows (no dnd on mobile) */}
            <div className="grid gap-2 sm:grid-cols-2 lg:hidden">
              {grouped.length > 1 ? (
                grouped.map((group) => (
                  <div key={group.key} className="col-span-full">
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <h3 className="text-sm font-bold text-[#003B73]/70">{group.label}</h3>
                      <span className="text-xs text-[#003B73]/40">({group.products.length})</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {group.products.map((p) => {
                        const state = getState(p)
                        const low = p.stockLimited && p.stockCurrent > 0 && p.stockCurrent <= p.stockMin
                        return (
                          <MobileProductCard
                            key={p.id}
                            product={p}
                            state={state}
                            low={low}
                            onEdit={() => setEditing(p)}
                            onToggle={() => toggleActive(p.id)}
                            onAdjust={() => setAdjusting(p)}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))
              ) : (
                filtered.map((p) => {
                  const state = getState(p)
                  const low = p.stockLimited && p.stockCurrent > 0 && p.stockCurrent <= p.stockMin
                  return (
                    <MobileProductCard
                      key={p.id}
                      product={p}
                      state={state}
                      low={low}
                      onEdit={() => setEditing(p)}
                      onToggle={() => toggleActive(p.id)}
                      onAdjust={() => setAdjusting(p)}
                    />
                  )
                })
              )}
            </div>
          </>
        )}

      {/* Diálogo crear/editar */}
      {(creating || editing) && (
        <ProductFormDialog
          initial={editing}
          allProducts={products ?? []}
          submitting={submitting}
          error={submitError}
          onSave={handleSave}
          onProductUpdated={handleProductUpdated}
          onClose={closeDialog}
        />
      )}

      {/* Modal ajustar stock */}
      {adjusting && (
        <StockAdjustModal
          product={adjusting}
          onClose={() => setAdjusting(null)}
          onSave={(value) => {
            handleAdjustStock(adjusting.id, value)
            setAdjusting(null)
          }}
        />
      )}
    </AdminShell>
  )
}

/* --- Sortable Row Component (Desktop) --- */

function SortableProductRow({
  product,
  canReorder,
  onEdit,
  onToggle,
  onAdjust,
  onMoveUp,
  onMoveDown,
}: {
  product: AdminProduct
  canReorder: boolean
  onEdit: () => void
  onToggle: () => void
  onAdjust: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}) {
  const state = getState(product)
  const low = product.stockLimited && product.stockCurrent > 0 && product.stockCurrent <= product.stockMin
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <tr ref={canReorder ? setNodeRef : undefined} style={canReorder ? style : undefined} className={`transition-colors ${isDragging ? 'bg-[var(--km-fondo)] z-10' : 'hover:bg-[var(--km-fondo)]/50'}`}>
      {canReorder && (
        <td className="px-1 py-3 text-center">
          <div className="flex flex-col items-center gap-0.5">
            <button
              onClick={onMoveUp}
              aria-label="Mover arriba"
              className="flex h-5 w-5 items-center justify-center rounded text-[#003B73]/40 hover:text-[#003B73] hover:bg-[var(--km-fondo)] transition-colors"
            >
              <ChevronUp className="h-3.5 w-3.5" strokeWidth={2.2} />
            </button>
            <button
              {...(canReorder ? listeners : {})}
              {...(canReorder ? attributes : {})}
              aria-label="Arrastrar para reordenar"
              className="cursor-grab active:cursor-grabbing text-[#003B73]/30 hover:text-[#003B73]/60 transition-colors"
            >
              <GripVertical className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              onClick={onMoveDown}
              aria-label="Mover abajo"
              className="flex h-5 w-5 items-center justify-center rounded text-[#003B73]/40 hover:text-[#003B73] hover:bg-[var(--km-fondo)] transition-colors"
            >
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.2} />
            </button>
          </div>
        </td>
      )}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <ProductThumb product={product} />
          <div className="min-w-0">
            <p className="line-clamp-1 font-bold text-[#003B73]">{product.name}</p>
            {product.description && (
              <p className="max-w-[220px] truncate text-xs text-[#003B73]/40">{product.description}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-[#003B73]/60">{TYPE_LABEL[product.type]}</td>
      <td className="px-4 py-3 text-right font-bold km-tabular text-[#003B73]">{formatPrice(product.price)}</td>
      <td className="px-4 py-3 text-center">
        <StockCell product={product} />
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col items-start gap-1">
          <EstadoBadge estado={stateToEstado(state)}>
            {state === 'activo' ? 'Activo' : state === 'agotado' ? 'Agotado' : state === 'no_disponible' ? 'No disponible' : 'Desactivado'}
          </EstadoBadge>
          {low && <EstadoBadge estado="stockBajo">Stock bajo</EstadoBadge>}
          {isPromoIncomplete(product) && <EstadoBadge estado="pendiente">Incompleta</EstadoBadge>}
        </div>
      </td>
      <td className="px-4 py-3">
        <RowActions product={product} state={state} onEdit={onEdit} onToggle={onToggle} onAdjust={onAdjust} />
      </td>
    </tr>
  )
}

/* --- Row Actions (separate from drag/drag) --- */

function RowActions({
  product,
  state,
  onEdit,
  onToggle,
  onAdjust,
}: {
  product: AdminProduct
  state: ProductState
  onEdit: () => void
  onToggle: () => void
  onAdjust: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={onEdit}
        title="Editar"
        aria-label="Editar producto"
        className="flex items-center gap-1.5 rounded-lg border border-[var(--km-linea)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#003B73] transition-colors hover:bg-[var(--km-fondo)] km-focus"
      >
        <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
        <span>Editar</span>
      </button>
      {product.stockLimited && (
        <button
          onClick={onAdjust}
          title="Ajustar stock"
          aria-label="Ajustar stock"
          className="flex items-center gap-1.5 rounded-lg border border-[var(--km-linea)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#003B73] transition-colors hover:bg-[var(--km-fondo)] km-focus"
        >
          <Boxes className="h-3.5 w-3.5" strokeWidth={2.2} />
          <span>Stock</span>
        </button>
      )}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          aria-label="Más acciones"
          aria-expanded={open}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-[var(--km-linea)] bg-white text-[#003B73]/50 transition-colors hover:bg-[var(--km-fondo)] km-focus"
        >
          <MoreHorizontal className="h-4 w-4" strokeWidth={2.2} />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute bottom-full right-0 z-20 mb-1 min-w-[160px] rounded-xl border border-[var(--km-linea)] bg-white py-1.5 shadow-lg">
              {state === 'desactivado' ? (
                <button
                  onClick={() => { onToggle(); setOpen(false) }}
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--km-listo-bg)]"
                  style={{ color: 'var(--km-listo-text)' }}
                >
                  <RotateCcw className="h-4 w-4" strokeWidth={2} />
                  Recuperar
                </button>
              ) : (
                <button
                  onClick={() => { onToggle(); setOpen(false) }}
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--km-peligro-bg)]"
                  style={{ color: 'var(--km-peligro-text)' }}
                >
                  <Power className="h-4 w-4" strokeWidth={2} />
                  Desactivar
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* --- Subcomponentes (unchanged from original) --- */

function StockCell({ product }: { product: AdminProduct }) {
  const low = product.stockLimited && product.stockCurrent > 0 && product.stockCurrent <= product.stockMin
  if (!product.stockLimited) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#003B73]/40">
        <InfinityIcon className="h-3.5 w-3.5" strokeWidth={2} />
        Ilimitado
      </span>
    )
  }
  if (product.stockCurrent <= 0) {
    return (
      <span className="inline-flex items-center gap-1 font-bold km-tabular text-[var(--km-peligro-text)]">
        0
        <span className="text-[10px] font-medium lowercase">u</span>
      </span>
    )
  }
  if (low) {
    return (
      <span className="inline-flex items-center gap-1 font-bold km-tabular text-[var(--km-alerta-text)]">
        {product.stockCurrent}
        <span className="text-[10px] font-medium lowercase">u</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 font-bold km-tabular text-[var(--km-listo-text)]">
      {product.stockCurrent}
      <span className="text-[10px] font-medium lowercase">u</span>
    </span>
  )
}

function ProductThumb({ product, large }: { product: AdminProduct; large?: boolean }) {
  const size = large ? 'h-12 w-12' : 'h-10 w-10'
  return (
    <div className={`flex flex-shrink-0 items-center justify-center rounded-lg bg-[var(--km-fondo)] text-[#003B73] ${size}`}>
      {product.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.image || "/placeholder.svg"} alt="" className={`rounded-lg object-cover ${size}`} />
      ) : (
        <ProductIconGlyph icon={product.icon} className={large ? 'h-6 w-6' : 'h-4.5 w-4.5'} strokeWidth={1.8} />
      )}
    </div>
  )
}

function MobileProductCard({
  product,
  state,
  low,
  onEdit,
  onToggle,
  onAdjust,
}: {
  product: AdminProduct
  state: ProductState
  low: boolean
  onEdit: () => void
  onToggle: () => void
  onAdjust: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      className={`km-panel p-3 ${
        state === 'agotado' ? 'border-l-[3px] border-l-[var(--km-peligro-text)]' :
        state === 'desactivado' ? 'border-l-[3px] border-l-[var(--km-entregado-text)] opacity-70' :
        state === 'no_disponible' ? 'border-l-[3px] border-l-[var(--km-recibido-text)]' :
        low ? 'border-l-[3px] border-l-[var(--km-alerta-text)]' :
        ''
      }`}
    >
      <div className="flex items-center gap-2.5">
        <ProductThumb product={product} large />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="line-clamp-1 text-sm font-bold text-[#003B73]">{product.name}</p>
            <span className="flex-shrink-0 text-sm font-bold km-tabular text-[#003B73]">{formatPrice(product.price)}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <EstadoBadge estado={stateToEstado(state)}>
              {state === 'activo' ? 'Activo' : state === 'agotado' ? 'Agotado' : state === 'no_disponible' ? 'No disponible' : 'Desactivado'}
            </EstadoBadge>
            {low && <EstadoBadge estado="stockBajo">Stock bajo</EstadoBadge>}
            {isPromoIncomplete(product) && <EstadoBadge estado="pendiente">Incompleta</EstadoBadge>}
            <span className="rounded-md bg-[var(--km-fondo)] px-1.5 py-0.5 text-[11px] font-semibold text-[#003B73]">
              {TYPE_LABEL[product.type]}
            </span>
            <StockInline product={product} />
          </div>
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 border-t border-[var(--km-linea)] pt-2.5">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-[var(--km-linea)] bg-white py-2 text-xs font-semibold text-[#003B73] transition-colors hover:bg-[var(--km-fondo)] km-focus"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
          Editar
        </button>
        {product.stockLimited && (
          <button
            onClick={onAdjust}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-[var(--km-linea)] bg-white py-2 text-xs font-semibold text-[#003B73] transition-colors hover:bg-[var(--km-fondo)] km-focus"
          >
            <Boxes className="h-3.5 w-3.5" strokeWidth={2.2} />
            Stock
          </button>
        )}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Más acciones"
            aria-expanded={menuOpen}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-[var(--km-linea)] bg-white text-[#003B73]/50 transition-colors hover:bg-[var(--km-fondo)] km-focus"
          >
            <MoreHorizontal className="h-4 w-4" strokeWidth={2.2} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute bottom-full right-0 z-20 mb-1 min-w-[150px] rounded-xl border border-[var(--km-linea)] bg-white py-1.5 shadow-lg">
                {state === 'desactivado' ? (
                  <button
                    onClick={() => { onToggle(); setMenuOpen(false) }}
                    className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--km-listo-bg)]"
                    style={{ color: 'var(--km-listo-text)' }}
                  >
                    <RotateCcw className="h-4 w-4" strokeWidth={2} />
                    Recuperar
                  </button>
                ) : (
                  <button
                    onClick={() => { onToggle(); setMenuOpen(false) }}
                    className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm font-semibold transition-colors hover:bg-[var(--km-peligro-bg)]"
                    style={{ color: 'var(--km-peligro-text)' }}
                  >
                    <Power className="h-4 w-4" strokeWidth={2} />
                    Desactivar
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function StockInline({ product }: { product: AdminProduct }) {
  const low = product.stockLimited && product.stockCurrent > 0 && product.stockCurrent <= product.stockMin
  if (!product.stockLimited) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[#003B73]/40">
        <InfinityIcon className="h-3 w-3" strokeWidth={2} />
      </span>
    )
  }
  if (product.stockCurrent <= 0) {
    return (
      <span className="text-[11px] font-bold km-tabular" style={{ color: 'var(--km-peligro-text)' }}>
        0 u
      </span>
    )
  }
  if (low) {
    return (
      <span className="text-[11px] font-bold km-tabular" style={{ color: 'var(--km-alerta-text)' }}>
        {product.stockCurrent} u
      </span>
    )
  }
  return (
    <span className="text-[11px] font-bold km-tabular" style={{ color: 'var(--km-listo-text)' }}>
      {product.stockCurrent} u
    </span>
  )
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-[11px] font-semibold tracking-wide text-[#003B73]/45 sm:inline">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all km-focus ${
        active
          ? 'border-[#003B73] bg-[#003B73] text-white'
          : 'border-[var(--km-linea)] bg-white text-[#003B73] hover:border-[#75AADB]'
      }`}
    >
      {children}
    </button>
  )
}

function StockAdjustModal({
  product,
  onClose,
  onSave,
}: {
  product: AdminProduct
  onClose: () => void
  onSave: (value: number) => void
}) {
  const [value, setValue] = useState(product.stockCurrent)
  const low = product.stockLimited && value > 0 && value <= product.stockMin
  const isEmpty = value <= 0

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <button aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-[#003B73]/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-xs km-panel-operativo overflow-hidden p-0">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#003B73] px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <Boxes className="h-5 w-5" strokeWidth={2.2} />
            <h3 className="text-lg font-extrabold">Ajustar stock</h3>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Product info */}
        <div className="border-b border-[var(--km-linea)] px-5 py-3">
          <div className="flex items-center gap-3">
            <ProductThumb product={product} large />
            <div className="min-w-0">
              <p className="font-bold text-[#003B73] line-clamp-1">{product.name}</p>
              <p className="text-xs text-[#003B73]/50">{product.stockLimited ? `Stock mínimo: ${product.stockMin} u` : 'Stock ilimitado'}</p>
            </div>
          </div>
        </div>

        {/* Counter */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-center gap-5">
            <button
              onClick={() => setValue((v) => Math.max(0, v - 1))}
              aria-label="Restar 1"
              className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-[var(--km-linea)] text-[#003B73] transition-colors hover:bg-[var(--km-fondo)] active:scale-95 km-focus"
            >
              <Minus className="h-6 w-6" strokeWidth={2.6} />
            </button>
            <div className="flex flex-col items-center">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={value}
                onChange={(e) => setValue(Math.max(0, Number(e.target.value)))}
                aria-label="Cantidad de stock"
                className="w-24 rounded-xl border-2 border-[#75AADB]/30 bg-[var(--km-fondo)]/50 py-3 text-center text-3xl font-extrabold km-tabular text-[#003B73] focus:border-[#003B73] focus:outline-none"
              />
              <span className="mt-1 text-xs font-medium text-[#003B73]/50">unidades</span>
            </div>
            <button
              onClick={() => setValue((v) => v + 1)}
              aria-label="Sumar 1"
              className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-[var(--km-linea)] text-[#003B73] transition-colors hover:bg-[var(--km-fondo)] active:scale-95 km-focus"
            >
              <Plus className="h-6 w-6" strokeWidth={2.6} />
            </button>
          </div>

          {/* Stock status feedback */}
          {isEmpty && (
            <div className="mt-3 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold" style={{ background: 'var(--km-peligro-bg)', color: 'var(--km-peligro-text)' }}>
              <PackageX className="h-4 w-4" strokeWidth={2.2} />
              Producto agotado
            </div>
          )}
          {low && !isEmpty && (
            <div className="mt-3 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold" style={{ background: 'var(--km-alerta-bg)', color: 'var(--km-alerta-text)' }}>
              <AlertTriangle className="h-4 w-4" strokeWidth={2.2} />
              Stock bajo — mínimo: {product.stockMin} u
            </div>
          )}
          {!low && !isEmpty && (
            <div className="mt-3 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold" style={{ background: 'var(--km-listo-bg)', color: 'var(--km-listo-text)' }}>
              Stock suficiente
            </div>
          )}
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={() => onSave(value)}
            className="w-full rounded-xl bg-[#F6B21A] py-3.5 text-sm font-extrabold text-[#003B73] shadow-lg shadow-[#F6B21A]/30 transition-all hover:bg-[#ffbe2e] active:scale-[0.99] km-focus"
          >
            Guardar stock
          </button>
        </div>
      </div>
    </div>
  )
}
