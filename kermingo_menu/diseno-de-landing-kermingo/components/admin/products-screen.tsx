'use client'

import { useMemo, useState } from 'react'
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
} from 'lucide-react'
import { PRODUCTS, formatPrice, type MealCategory, type ProductType } from '@/lib/products'
import { ProductIconGlyph } from '@/components/menu/product-visual'
import { AdminHeader } from './admin-header'
import { Badge, type BadgeTone, AdminCard, AdminFooter } from './admin-ui'
import { ProductFormDialog, type AdminProduct } from './product-form-dialog'

/* --- Datos demo: derivamos productos admin desde el catálogo público --- */
function seedProducts(): AdminProduct[] {
  return PRODUCTS.map((p) => {
    const limited = p.stock !== 'ilimitado'
    let current = 25
    if (p.stock === 'agotado') current = 0
    else if (p.stock === 'bajo') current = 4
    else if (p.stock === 'ilimitado') current = 0
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      type: p.type,
      meals: p.meals,
      icon: p.icon,
      active: p.stock !== 'agotado' ? true : true, // todos activos por defecto
      stockLimited: limited,
      stockCurrent: current,
      stockMin: 5,
    }
  })
}

type ProductState = 'activo' | 'desactivado' | 'agotado'

function getState(p: AdminProduct): ProductState {
  if (!p.active) return 'desactivado'
  if (p.stockLimited && p.stockCurrent <= 0) return 'agotado'
  return 'activo'
}

const STATE_BADGE: Record<ProductState, { label: string; tone: BadgeTone }> = {
  activo: { label: 'Activo', tone: 'success' },
  desactivado: { label: 'Desactivado', tone: 'neutral' },
  agotado: { label: 'Agotado', tone: 'danger' },
}

const TYPE_LABEL: Record<ProductType, string> = {
  comida: 'Comida',
  bebida: 'Bebida',
  promo: 'Promo',
}

type MealFilter = 'todas' | MealCategory
type TypeFilter = 'todos' | ProductType
type StateFilter = 'todos' | ProductState

export function ProductsScreen() {
  const [products, setProducts] = useState<AdminProduct[]>(seedProducts)
  const [search, setSearch] = useState('')
  const [mealFilter, setMealFilter] = useState<MealFilter>('todas')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todos')
  const [stateFilter, setStateFilter] = useState<StateFilter>('todos')

  const [editing, setEditing] = useState<AdminProduct | null>(null)
  const [creating, setCreating] = useState(false)
  const [adjusting, setAdjusting] = useState<AdminProduct | null>(null)

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      if (mealFilter !== 'todas' && !p.meals.includes(mealFilter)) return false
      if (typeFilter !== 'todos' && p.type !== typeFilter) return false
      if (stateFilter !== 'todos' && getState(p) !== stateFilter) return false
      return true
    })
  }, [products, search, mealFilter, typeFilter, stateFilter])

  const handleSave = (product: AdminProduct) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id)
      return exists ? prev.map((p) => (p.id === product.id ? product : p)) : [product, ...prev]
    })
    setEditing(null)
    setCreating(false)
  }

  const toggleActive = (id: string) =>
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)))

  const handleAdjustStock = (id: string, current: number) =>
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stockCurrent: Math.max(0, current) } : p)),
    )

  return (
    <div className="min-h-screen bg-[#EEF5FF]">
      <AdminHeader section="Productos" backHref="/admin/dashboard" />

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        {/* Encabezado + nuevo producto */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-[#003B73]">Catálogo</h2>
            <p className="text-sm text-slate-500">
              {filtered.length} de {products.length} productos
            </p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-2xl bg-[#F6B21A] px-4 py-3 text-sm font-extrabold text-[#003B73] shadow-lg shadow-[#F6B21A]/30 transition-all hover:bg-[#ffbe2e] active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" strokeWidth={2.6} />
            <span className="hidden sm:inline">Nuevo producto</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        </div>

        {/* Filtros */}
        <AdminCard className="space-y-3 p-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#75AADB]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre..."
              className="kermingo-input pl-10"
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
            </FilterGroup>
          </div>
        </AdminCard>

        {/* Listado */}
        {filtered.length === 0 ? (
          <AdminCard className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <PackageX className="h-12 w-12 text-[#75AADB]" strokeWidth={1.6} />
            <p className="font-bold text-[#003B73]">No hay productos con esos filtros</p>
            <p className="text-sm text-slate-500">Probá ajustar la búsqueda o los filtros.</p>
          </AdminCard>
        ) : (
          <>
            {/* Desktop: tabla */}
            <AdminCard className="hidden overflow-hidden lg:block">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#75AADB]/15 bg-[#EEF5FF]/60 text-left text-[11px] font-bold uppercase tracking-wide text-[#003B73]/55">
                      <th className="px-4 py-3">Producto</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Momento</th>
                      <th className="px-4 py-3 text-right">Precio</th>
                      <th className="px-4 py-3 text-center">Stock</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#75AADB]/10">
                    {filtered.map((p) => {
                      const state = getState(p)
                      const low = p.stockLimited && p.stockCurrent > 0 && p.stockCurrent <= p.stockMin
                      return (
                        <tr key={p.id} className="transition-colors hover:bg-[#EEF5FF]/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <ProductThumb product={p} />
                              <div>
                                <p className="font-bold text-[#003B73]">{p.name}</p>
                                <p className="max-w-[220px] truncate text-xs text-slate-400">{p.description}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{TYPE_LABEL[p.type]}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {p.meals.map((m) => (
                                <span key={m} className="rounded-md bg-[#EEF5FF] px-1.5 py-0.5 text-[11px] font-semibold capitalize text-[#003B73]">
                                  {m}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-700">{formatPrice(p.price)}</td>
                          <td className="px-4 py-3 text-center">
                            {!p.stockLimited ? (
                              <span className="text-xs font-medium text-slate-400">Ilimitado</span>
                            ) : (
                              <span className={`font-bold ${low ? 'text-amber-600' : p.stockCurrent <= 0 ? 'text-red-500' : 'text-slate-700'}`}>
                                {p.stockCurrent}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col items-start gap-1">
                              <Badge tone={STATE_BADGE[state].tone}>{STATE_BADGE[state].label}</Badge>
                              {low && <Badge tone="warning">Stock bajo</Badge>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <RowActions
                              product={p}
                              state={state}
                              onEdit={() => setEditing(p)}
                              onToggle={() => toggleActive(p.id)}
                              onAdjust={() => setAdjusting(p)}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </AdminCard>

            {/* Mobile/tablet: cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
              {filtered.map((p) => {
                const state = getState(p)
                const low = p.stockLimited && p.stockCurrent > 0 && p.stockCurrent <= p.stockMin
                return (
                  <AdminCard key={p.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <ProductThumb product={p} large />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-[#003B73]">{p.name}</p>
                          <span className="flex-shrink-0 font-bold text-slate-700">{formatPrice(p.price)}</span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{p.description}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <Badge tone={STATE_BADGE[state].tone}>{STATE_BADGE[state].label}</Badge>
                          {low && <Badge tone="warning">Stock bajo</Badge>}
                          <span className="rounded-md bg-[#EEF5FF] px-1.5 py-0.5 text-[11px] font-semibold text-[#003B73]">
                            {TYPE_LABEL[p.type]}
                          </span>
                          <span className="text-[11px] font-medium text-slate-400">
                            {p.stockLimited ? `Stock: ${p.stockCurrent}` : 'Ilimitado'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 border-t border-[#75AADB]/15 pt-3">
                      <RowActions
                        product={p}
                        state={state}
                        onEdit={() => setEditing(p)}
                        onToggle={() => toggleActive(p.id)}
                        onAdjust={() => setAdjusting(p)}
                        full
                      />
                    </div>
                  </AdminCard>
                )
              })}
            </div>
          </>
        )}

        <AdminFooter />
      </main>

      {/* Diálogo crear/editar */}
      {(creating || editing) && (
        <ProductFormDialog
          initial={editing}
          onSave={handleSave}
          onClose={() => {
            setEditing(null)
            setCreating(false)
          }}
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
    </div>
  )
}

/* --- Subcomponentes --- */

function ProductThumb({ product, large }: { product: AdminProduct; large?: boolean }) {
  const size = large ? 'h-14 w-14' : 'h-11 w-11'
  return (
    <div className={`flex flex-shrink-0 items-center justify-center rounded-xl bg-[#EEF5FF] text-[#003B73] ${size}`}>
      {product.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.image || "/placeholder.svg"} alt="" className={`rounded-xl object-cover ${size}`} />
      ) : (
        <ProductIconGlyph icon={product.icon} className={large ? 'h-7 w-7' : 'h-5 w-5'} strokeWidth={1.9} />
      )}
    </div>
  )
}

function RowActions({
  product,
  state,
  onEdit,
  onToggle,
  onAdjust,
  full,
}: {
  product: AdminProduct
  state: ProductState
  onEdit: () => void
  onToggle: () => void
  onAdjust: () => void
  full?: boolean
}) {
  const base = full ? 'flex-1 justify-center' : ''
  return (
    <div className={`flex items-center gap-1.5 ${full ? 'w-full' : 'justify-end'}`}>
      <ActionButton label="Editar" icon={Pencil} onClick={onEdit} className={base} />
      {product.stockLimited && (
        <ActionButton label="Stock" icon={Boxes} onClick={onAdjust} className={base} />
      )}
      {state === 'desactivado' ? (
        <ActionButton label="Recuperar" icon={RotateCcw} onClick={onToggle} tone="success" className={base} />
      ) : (
        <ActionButton label="Desactivar" icon={Power} onClick={onToggle} tone="danger" className={base} />
      )}
    </div>
  )
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  tone = 'neutral',
  className = '',
}: {
  label: string
  icon: typeof Pencil
  onClick: () => void
  tone?: 'neutral' | 'success' | 'danger'
  className?: string
}) {
  const tones = {
    neutral: 'border-[#75AADB]/30 text-[#003B73] hover:bg-[#EEF5FF]',
    success: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
    danger: 'border-red-200 text-red-600 hover:bg-red-50',
  }
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1.5 rounded-lg border bg-white px-2.5 py-2 text-xs font-semibold transition-colors ${tones[tone]} ${className}`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
      <span className="hidden sm:inline lg:inline">{label}</span>
    </button>
  )
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-[11px] font-bold uppercase tracking-wide text-[#003B73]/45 sm:inline">
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
      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
        active
          ? 'border-[#003B73] bg-[#003B73] text-white'
          : 'border-[#75AADB]/30 bg-white text-[#003B73] hover:border-[#75AADB]'
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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <button aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-[#003B73]/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-xs rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-[#003B73]">Ajustar stock</h3>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-500">{product.name}</p>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setValue((v) => Math.max(0, v - 1))}
            aria-label="Restar"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#75AADB]/40 text-[#003B73] transition-colors hover:bg-[#EEF5FF]"
          >
            <Minus className="h-5 w-5" strokeWidth={2.6} />
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={value}
            onChange={(e) => setValue(Math.max(0, Number(e.target.value)))}
            className="w-20 rounded-2xl border border-[#75AADB]/40 bg-[#EEF5FF]/50 py-3 text-center text-2xl font-extrabold text-[#003B73] focus:border-[#003B73] focus:outline-none"
          />
          <button
            onClick={() => setValue((v) => v + 1)}
            aria-label="Sumar"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#75AADB]/40 text-[#003B73] transition-colors hover:bg-[#EEF5FF]"
          >
            <Plus className="h-5 w-5" strokeWidth={2.6} />
          </button>
        </div>

        <button
          onClick={() => onSave(value)}
          className="mt-6 w-full rounded-2xl bg-[#F6B21A] py-3.5 text-sm font-extrabold text-[#003B73] shadow-lg shadow-[#F6B21A]/30 transition-all hover:bg-[#ffbe2e] active:scale-[0.99]"
        >
          Guardar stock
        </button>
      </div>
    </div>
  )
}
