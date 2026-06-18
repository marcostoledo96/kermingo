'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  X,
  ShoppingCart,
  Banknote,
  ArrowRightLeft,
  CheckCircle2,
  Receipt,
  RefreshCw,
  AlertCircle,
  Clock,
  ChevronUp,
} from 'lucide-react'
import { formatPrice } from '@/lib/products'
import { ProductIconGlyph } from '@/components/menu/product-visual'
import { AdminShell } from './admin-shell'
import { apiGet, apiPost, ApiError } from '@/lib/api'
import { useApiResource } from '@/lib/use-api-resource'
import {
  type CajaProduct,
  type CajaFilter,
  apiToCajaProduct,
  isCajaLowStock,
  isCajaSoldOut,
} from '@/lib/admin'
import type { MealCategory } from '@/lib/products'
import type { ApiProducto } from '@/lib/types'

type PayMethod = 'efectivo' | 'transferencia'

type Line = { product: CajaProduct; qty: number }

const FILTERS: { id: CajaFilter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'merienda', label: 'Merienda' },
  { id: 'cena', label: 'Cena' },
  { id: 'bebida', label: 'Bebidas' },
  { id: 'promo', label: 'Promos' },
]

export function CajaScreen() {
  const [filter, setFilter] = useState<CajaFilter>('todos')
  const [query, setQuery] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [method, setMethod] = useState<PayMethod>('efectivo')
  const [customer, setCustomer] = useState('')
  const [phone, setPhone] = useState('')
  const [table, setTable] = useState('')
  const [notes, setNotes] = useState('')
  const [cartOpenMobile, setCartOpenMobile] = useState(false)
  const [confirmed, setConfirmed] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    data: products,
    loading,
    refreshing,
    error: loadError,
    refetch,
  } = useApiResource<CajaProduct[]>(async () => {
    const data = await apiGet<ApiProducto[]>('/api/productos', { limit: 100 })
    return data.map(apiToCajaProduct)
  })

  const filtered = useMemo(() => {
    if (!products) return []
    return products.filter((p) => {
      const matchesFilter =
        filter === 'todos'
          ? true
          : filter === 'bebida'
            ? p.type === 'bebida'
            : filter === 'promo'
              ? p.type === 'promo'
              : p.type !== 'bebida' && p.type !== 'promo' && p.meals.includes(filter as MealCategory)
      const matchesQuery =
        query.trim() === '' ||
        p.name.toLowerCase().includes(query.trim().toLowerCase())
      return matchesFilter && matchesQuery
    })
  }, [filter, query, products])

  const count = lines.reduce((acc, l) => acc + l.qty, 0)
  const total = lines.reduce((acc, l) => acc + l.product.price * l.qty, 0)

  /** Quick lookup: how many of this product are already in the sale */
  const qtyMap = useMemo(() => {
    const m = new Map<number, number>()
    for (const l of lines) m.set(l.product.id, l.qty)
    return m
  }, [lines])

  function addProduct(product: CajaProduct) {
    if (isCajaSoldOut(product)) return
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id)
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l,
        )
      }
      return [...prev, { product, qty: 1 }]
    })
  }

  function changeQty(id: number, delta: number) {
    setLines((prev) =>
      prev
        .map((l) =>
          l.product.id === id ? { ...l, qty: l.qty + delta } : l,
        )
        .filter((l) => l.qty > 0),
    )
  }

  function removeLine(id: number) {
    setLines((prev) => prev.filter((l) => l.product.id !== id))
  }

  function clearOrder() {
    setLines([])
    setCustomer('')
    setPhone('')
    setTable('')
    setNotes('')
    setMethod('efectivo')
    setSubmitError(null)
  }

  async function confirmSale() {
    if (lines.length === 0 || submitting) return
    setSubmitting(true)
    setSubmitError(null)

    const items = lines.map((l) => ({ producto_id: l.product.id, cantidad: l.qty }))
    const payload = {
      nombre_cliente: customer.trim() || 'Caja',
      mesa: table.trim() || undefined,
      telefono_cliente: phone.trim() || undefined,
      observaciones: notes.trim() || undefined,
      metodo_pago: method,
      estado_pago: method === 'efectivo' ? ('pagado' as const) : ('pendiente' as const),
      estado_pedido: 'en_preparacion' as const,
      items,
    }

    try {
      const created = await apiPost<{ numero: string; id: number }>('/api/admin/pedidos/caja', payload)
      setConfirmed(created.numero)
      clearOrder()
      setCartOpenMobile(false)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'No se pudo registrar la venta')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AdminShell
      section="Caja rápida"
      status={{ label: 'Caja abierta', tone: 'success' }}
      bleed
    >

      <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-[1fr_380px] lg:gap-5 lg:px-6 lg:py-5">
        {/* ── Catálogo ────────────────────────────────────────── */}
        <main className="px-4 py-4 lg:px-0 lg:py-0">
          {/* Refresh + status */}
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-[var(--km-tinta-suave)]">
              {products?.length ?? '–'} productos
            </p>
            <button
              onClick={() => refetch({ silent: true })}
              disabled={refreshing}
              title="Refrescar catálogo"
              aria-label="Refrescar catálogo"
              className="km-focus flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--km-linea)] bg-[var(--km-papel)] text-[var(--km-azul)] transition-colors hover:bg-[var(--km-fondo)] disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={2.2} />
            </button>
          </div>

          {loadError && (
            <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-[var(--km-peligro-bg)] bg-[var(--km-peligro-bg)] px-3.5 py-3 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--km-peligro-text)]" strokeWidth={2.2} />
              <span className="flex-1 font-medium text-[var(--km-peligro-text)]">{loadError}</span>
              <button
                onClick={() => refetch()}
                className="rounded-lg border border-[var(--km-peligro-bg)] bg-[var(--km-papel)] px-2.5 py-1 text-xs font-bold text-[var(--km-peligro-text)] hover:bg-[var(--km-peligro-bg)]"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Buscador */}
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--km-celeste)]" />
            <input
              type="text"
              inputMode="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto…"
              aria-label="Buscar producto"
              className="km-focus w-full rounded-2xl border border-[var(--km-celeste)]/40 bg-[var(--km-papel)] py-3.5 pl-11 pr-4 text-base font-medium text-[var(--km-azul)] placeholder:text-[#9CA3AF]"
            />
          </div>

          {/* Filtros */}
          <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 pt-1 lg:mx-0 lg:flex-wrap lg:px-0">
            {FILTERS.map((f) => {
              const active = filter === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`km-focus shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                    active
                      ? 'bg-[var(--km-azul)] text-[var(--km-papel)] shadow-sm'
                      : 'border border-[var(--km-celeste)]/40 bg-[var(--km-papel)] text-[var(--km-azul)] hover:bg-[var(--km-fondo)]'
                  }`}
                >
                  {f.label}
                </button>
              )
            })}
          </div>

          {/* ── Grilla de productos — cards con icon glyph ──────── */}
          {loading ? (
            <div className="rounded-2xl border border-[var(--km-linea)] bg-[var(--km-papel)] p-10 text-center text-sm font-medium text-[var(--km-tinta-suave)]">
              Cargando catálogo…
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pb-28 sm:grid-cols-3 lg:pb-0">
              {filtered.map((product) => {
                const soldOut = isCajaSoldOut(product)
                const low = isCajaLowStock(product)
                const inCart = qtyMap.get(product.id) ?? 0
                return (
                  <button
                    key={product.id}
                    type="button"
                    disabled={soldOut}
                    onClick={() => addProduct(product)}
                    className={`km-focus group relative flex flex-col items-start gap-2 rounded-2xl border p-3.5 text-left transition-all ${
                      soldOut
                        ? 'cursor-not-allowed border-[var(--km-celeste)]/20 bg-[var(--km-fondo)]/60 opacity-60'
                        : inCart > 0
                          ? 'border-[var(--km-dorado)]/50 bg-[var(--km-dorado)]/8 hover:-translate-y-0.5 hover:border-[var(--km-dorado)] hover:shadow-md active:scale-[0.98]'
                          : 'border-[var(--km-celeste)]/25 bg-[var(--km-papel)] hover:-translate-y-0.5 hover:border-[var(--km-azul)] hover:shadow-md active:scale-[0.98]'
                    }`}
                  >
                    {/* Image or Icon glyph + status */}
                    <div className="flex w-full items-start justify-between">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          width={44}
                          height={44}
                          className={`h-11 w-11 rounded-xl object-cover ${soldOut ? 'opacity-60 grayscale' : ''}`}
                          unoptimized
                        />
                      ) : (
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                            soldOut ? 'bg-[var(--km-entregado-bg)] text-[var(--km-entregado-text)]' : 'bg-[var(--km-fondo)] text-[var(--km-azul)]'
                          }`}
                        >
                          <ProductIconGlyph icon={product.icon} className="h-6 w-6" strokeWidth={2} />
                        </div>
                      )}
                      {soldOut && (
                        <span className="shrink-0 text-[10px] font-bold text-[var(--km-peligro-text)]">
                          Agotado
                        </span>
                      )}
                      {low && !soldOut && (
                        <span className="shrink-0 text-[10px] font-bold text-[var(--km-alerta-text)]">
                          Bajo
                        </span>
                      )}
                    </div>

                    {/* Name */}
                    <span className={`text-sm font-bold leading-tight ${soldOut ? 'text-[var(--km-entregado-text)]' : 'text-[var(--km-azul)]'}`}>
                      {product.name}
                    </span>

                    {/* Price + stock */}
                    <div className="mt-auto flex w-full items-baseline justify-between gap-1">
                      <span className={`km-tabular text-base font-extrabold ${soldOut ? 'text-[var(--km-entregado-text)]' : 'text-[var(--km-azul)]'}`}>
                        {formatPrice(product.price)}
                      </span>
                      {product.stockLimited && !soldOut && (
                        <span className="km-tabular text-[10px] font-semibold text-[var(--km-tinta-suave)]">
                          {product.stockActual} u
                        </span>
                      )}
                    </div>

                    {/* Quantity badge if already in cart */}
                    {inCart > 0 && !soldOut && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--km-dorado)] px-1 text-[10px] font-extrabold text-[var(--km-azul)] shadow-sm">
                        {inCart}
                      </span>
                    )}

                    {/* Hover Plus affordance */}
                    {!soldOut && (
                      <span className="absolute right-3 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--km-dorado)] text-[var(--km-azul)] opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                        <Plus className="h-5 w-5" strokeWidth={2.6} />
                      </span>
                    )}
                  </button>
                )
              })}
              {filtered.length === 0 && !loading && (
                <p className="col-span-full py-10 text-center text-sm font-medium text-[var(--km-tinta-suave)]">
                  No hay productos para este filtro.
                </p>
              )}
            </div>
          )}
        </main>

        {/* ── Panel lateral desktop ──────────────────────────── */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
              <OrderPanel
                lines={lines}
                count={count}
                total={total}
                method={method}
                customer={customer}
                phone={phone}
                table={table}
                notes={notes}
                submitting={submitting}
                submitError={submitError}
                onMethod={setMethod}
                onCustomer={setCustomer}
                onPhone={setPhone}
                onTable={setTable}
                onNotes={setNotes}
                onChangeQty={changeQty}
                onRemove={removeLine}
                onClear={clearOrder}
                onConfirm={confirmSale}
              />
          </div>
        </aside>
      </div>

      {/* ── Barra inferior mobile: "Cobrar · $total" ──────────── */}
      {count > 0 && !cartOpenMobile && (
        <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden km-safe-bottom">
          <button
            type="button"
            onClick={() => setCartOpenMobile(true)}
            className="flex w-full items-center justify-between border-t border-[var(--km-azul)]/10 bg-[var(--km-azul)] px-4 py-3.5 text-[var(--km-papel)] shadow-2xl"
          >
            <span className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--km-papel)]/15">
                <ShoppingCart className="h-5 w-5" strokeWidth={2.2} />
              </span>
              <span className="text-sm font-bold">
                {count} {count === 1 ? 'ítem' : 'ítems'}
              </span>
            </span>
            <span className="flex items-center gap-2 rounded-xl bg-[var(--km-dorado)] px-4 py-2 text-base font-extrabold text-[var(--km-azul)]">
              {formatPrice(total)}
              <span className="text-sm font-bold">Cobrar</span>
              <ChevronUp className="h-4 w-4" strokeWidth={2.6} />
            </span>
          </button>
        </div>
      )}

      {/* ── Hoja del pedido en mobile ────────────────────────── */}
      {cartOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[var(--km-azul)]/40"
            onClick={() => setCartOpenMobile(false)}
            aria-hidden="true"
          />
          {/* Sheet */}
          <div className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-[var(--km-fondo)] pb-4 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--km-celeste)]/20 bg-[var(--km-fondo)] px-4 py-3">
              <h2 className="text-base font-extrabold text-[var(--km-azul)]">Pedido actual</h2>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setCartOpenMobile(false)}
                className="km-focus flex h-9 w-9 items-center justify-center rounded-full bg-[var(--km-papel)] text-[var(--km-azul)]"
              >
                <X className="h-5 w-5" strokeWidth={2.4} />
              </button>
            </div>
            <div className="p-4">
              <OrderPanel
                lines={lines}
                count={count}
                total={total}
                method={method}
                customer={customer}
                phone={phone}
                table={table}
                notes={notes}
                submitting={submitting}
                submitError={submitError}
                onMethod={setMethod}
                onCustomer={setCustomer}
                onPhone={setPhone}
                onTable={setTable}
                onNotes={setNotes}
                onChangeQty={changeQty}
                onRemove={removeLine}
                onClear={clearOrder}
                onConfirm={confirmSale}
                embedded
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmación de venta ──────────────────────────── */}
      {confirmed && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
          <div
            className="absolute inset-0 bg-[var(--km-azul)]/50"
            onClick={() => setConfirmed(null)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-sm rounded-3xl bg-[var(--km-papel)] p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--km-listo-bg)]">
              <CheckCircle2 className="h-9 w-9 text-[var(--km-listo-text)]" strokeWidth={2.2} />
            </div>
            <h2 className="text-xl font-extrabold text-[var(--km-azul)]">Venta registrada</h2>
            <p className="mt-1 text-sm font-medium text-[var(--km-tinta-suave)]">
              Pedido <span className="font-mono font-bold text-[var(--km-azul)]">{confirmed}</span> cargado en caja.
            </p>
            <button
              type="button"
              onClick={() => setConfirmed(null)}
              className="km-focus mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--km-dorado)] py-3.5 text-base font-extrabold text-[var(--km-azul)] transition-colors hover:bg-[#ffbe2e] active:scale-[0.99]"
            >
              <Receipt className="h-5 w-5" strokeWidth={2.4} />
              Nueva venta
            </button>
          </div>
        </div>
      )}
    </AdminShell>
  )
}

// ─── Panel del pedido (reutilizado en desktop y mobile) ────────────────────

function OrderPanel({
  lines,
  count,
  total,
  method,
  customer,
  phone,
  table,
  notes,
  submitting = false,
  submitError = null,
  onMethod,
  onCustomer,
  onPhone,
  onTable,
  onNotes,
  onChangeQty,
  onRemove,
  onClear,
  onConfirm,
  embedded = false,
}: {
  lines: Line[]
  count: number
  total: number
  method: PayMethod
  customer: string
  phone: string
  table: string
  notes: string
  submitting?: boolean
  submitError?: string | null
  onMethod: (m: PayMethod) => void
  onCustomer: (v: string) => void
  onPhone: (v: string) => void
  onTable: (v: string) => void
  onNotes: (v: string) => void
  onChangeQty: (id: number, delta: number) => void
  onRemove: (id: number) => void
  onClear: () => void
  onConfirm: () => void
  embedded?: boolean
}) {
  const empty = lines.length === 0

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-[var(--km-celeste)]/25 bg-[var(--km-papel)] shadow-sm ${
        embedded ? '' : 'max-h-[calc(100vh-7rem)]'
      }`}
    >
      {/* Header — desktop only */}
      {!embedded && (
        <div className="flex items-center justify-between border-b border-[var(--km-celeste)]/15 bg-[var(--km-azul)] px-4 py-3 text-[var(--km-papel)]">
          <span className="flex items-center gap-2 text-sm font-bold">
            <ShoppingCart className="h-5 w-5" strokeWidth={2.2} /> Pedido actual
          </span>
          {count > 0 && (
            <span className="km-tabular rounded-full bg-[var(--km-dorado)] px-2.5 py-0.5 text-xs font-extrabold text-[var(--km-azul)]">
              {count} {count === 1 ? 'ítem' : 'ítems'}
            </span>
          )}
        </div>
      )}

      {/* Líneas */}
      <div className={`flex-1 overflow-y-auto ${empty ? '' : 'divide-y divide-[var(--km-celeste)]/10'}`}>
        {empty ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--km-fondo)]">
              <ShoppingCart className="h-6 w-6 text-[var(--km-celeste)]" strokeWidth={2} />
            </div>
            <p className="text-sm font-medium text-[var(--km-celeste)]">
              Tocá un producto para agregarlo.
            </p>
          </div>
        ) : (
          lines.map((l) => (
            <div key={l.product.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--km-fondo)] text-[var(--km-azul)]">
                <ProductIconGlyph icon={l.product.icon} className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[var(--km-azul)]">{l.product.name}</p>
                <p className="text-xs font-medium text-[var(--km-tinta-suave)]">
                  {formatPrice(l.product.price)} c/u
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Restar"
                  onClick={() => onChangeQty(l.product.id, -1)}
                  className="km-focus flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--km-celeste)]/40 text-[var(--km-azul)] transition-colors hover:bg-[var(--km-fondo)]"
                >
                  <Minus className="h-4 w-4" strokeWidth={2.6} />
                </button>
                <span className="km-tabular w-6 text-center font-mono text-sm font-extrabold text-[var(--km-azul)]">
                  {l.qty}
                </span>
                <button
                  type="button"
                  aria-label="Sumar"
                  onClick={() => onChangeQty(l.product.id, 1)}
                  className="km-focus flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--km-celeste)]/40 text-[var(--km-azul)] transition-colors hover:bg-[var(--km-fondo)]"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.6} />
                </button>
              </div>
              <button
                type="button"
                aria-label="Quitar"
                onClick={() => onRemove(l.product.id)}
                className="km-focus flex h-8 w-8 items-center justify-center rounded-lg text-[var(--km-entregado-text)] transition-colors hover:bg-[var(--km-peligro-bg)] hover:text-[var(--km-peligro-text)]"
              >
                <Trash2 className="h-4 w-4" strokeWidth={2.2} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* ── Datos + pago + total + acciones ────────────────── */}
      <div className="space-y-3 border-t border-[var(--km-celeste)]/15 bg-[var(--km-fondo)]/40 p-4">
        {submitError && (
          <div className="rounded-lg border border-[var(--km-peligro-bg)] bg-[var(--km-peligro-bg)] px-3 py-2 text-[11px] font-medium text-[var(--km-peligro-text)]">
            {submitError}
          </div>
        )}

        {/* Método de pago — Efectivo default/destacado */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onMethod('efectivo')}
            className={`km-focus flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-bold transition-colors ${
              method === 'efectivo'
                ? 'border-[var(--km-listo-text)] bg-[var(--km-listo-bg)] text-[var(--km-listo-text)] shadow-sm'
                : 'border-[var(--km-celeste)]/40 bg-[var(--km-papel)] text-[var(--km-azul)] hover:bg-[var(--km-fondo)]'
            }`}
          >
            <Banknote className="h-4 w-4" strokeWidth={2.2} /> Efectivo
          </button>
          <button
            type="button"
            onClick={() => onMethod('transferencia')}
            className={`km-focus flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-bold transition-colors ${
              method === 'transferencia'
                ? 'border-[var(--km-azul)] bg-[var(--km-azul)] text-[var(--km-papel)]'
                : 'border-[var(--km-celeste)]/40 bg-[var(--km-papel)] text-[var(--km-azul)] hover:bg-[var(--km-fondo)]'
            }`}
          >
            <ArrowRightLeft className="h-4 w-4" strokeWidth={2.2} /> Transfer.
          </button>
        </div>

        {/* Transferencia pendiente aviso */}
        {method === 'transferencia' && (
          <div className="flex items-center gap-2 rounded-lg bg-[var(--km-preparando-bg)] px-3 py-2 text-[11px] font-medium text-[var(--km-preparando-text)]">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2.2} />
            Pago pendiente de verificación
          </div>
        )}

        {/* Efectivo confirmación */}
        {method === 'efectivo' && !empty && (
          <div className="flex items-center gap-2 rounded-lg bg-[var(--km-listo-bg)] px-3 py-2 text-[11px] font-medium text-[var(--km-listo-text)]">
            <Banknote className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2.2} />
            Se registra como pagado al confirmar
          </div>
        )}

        {/* Datos opcionales — v0-like rounded-xl inputs */}
        <input
          type="text"
          value={customer}
          onChange={(e) => onCustomer(e.target.value)}
          placeholder="Nombre del cliente (opcional)"
          aria-label="Nombre del cliente"
          className="km-focus w-full rounded-xl border border-[var(--km-celeste)]/40 bg-[var(--km-papel)] px-3.5 py-2.5 text-sm font-medium text-[var(--km-azul)] placeholder:text-[#9CA3AF]"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => onPhone(e.target.value)}
            placeholder="Teléfono"
            aria-label="Teléfono del cliente"
            className="km-focus w-full rounded-xl border border-[var(--km-celeste)]/40 bg-[var(--km-papel)] px-3.5 py-2.5 text-sm font-medium text-[var(--km-azul)] placeholder:text-[#9CA3AF]"
          />
          <input
            type="text"
            inputMode="numeric"
            value={table}
            onChange={(e) => onTable(e.target.value)}
            placeholder="Mesa"
            aria-label="Mesa"
            className="km-focus w-full rounded-xl border border-[var(--km-celeste)]/40 bg-[var(--km-papel)] px-3.5 py-2.5 text-sm font-medium text-[var(--km-azul)] placeholder:text-[#9CA3AF]"
          />
        </div>

        <textarea
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
          placeholder="Nota (opcional)"
          aria-label="Nota opcional"
          rows={2}
          className="km-focus w-full rounded-xl border border-[var(--km-celeste)]/40 bg-[var(--km-papel)] px-3.5 py-2.5 text-sm font-medium text-[var(--km-azul)] placeholder:text-[#9CA3AF]"
        />

        {/* Total grande — v0-like rounded-2xl */}
        <div className="flex items-end justify-between rounded-2xl bg-[var(--km-papel)] px-4 py-3 shadow-sm">
          <span className="text-sm font-bold uppercase tracking-wide text-[var(--km-azul)]/55">
            Total
          </span>
          <span className="km-tabular text-3xl font-extrabold leading-none text-[var(--km-azul)]">
            {formatPrice(total)}
          </span>
        </div>

        {/* Confirmar venta — v0-like golden primary with shadow */}
        <button
          type="button"
          onClick={onConfirm}
          disabled={empty || submitting}
          className={`km-focus flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-extrabold transition-all ${
            empty || submitting
              ? 'cursor-not-allowed bg-[var(--km-entregado-bg)] text-[var(--km-entregado-text)]'
              : 'bg-[var(--km-dorado)] text-[var(--km-azul)] shadow-lg shadow-[var(--km-dorado)]/30 hover:brightness-110 active:scale-[0.99]'
          }`}
        >
          <CheckCircle2 className="h-5 w-5" strokeWidth={2.4} />
          {submitting ? 'Registrando…' : 'Confirmar venta'}
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={empty || submitting}
          className={`km-focus flex w-full items-center justify-center gap-2 rounded-2xl border py-2.5 text-sm font-bold transition-colors ${
            empty || submitting
              ? 'cursor-not-allowed border-[var(--km-linea)] text-[var(--km-entregado-text)]'
              : 'border-[var(--km-celeste)]/40 bg-[var(--km-papel)] text-[var(--km-azul)] hover:bg-[var(--km-fondo)]'
          }`}
        >
          <Trash2 className="h-4 w-4" strokeWidth={2.2} />
          Limpiar pedido
        </button>
      </div>
    </div>
  )
}
