'use client'

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
} from 'lucide-react'
import { PRODUCTS, formatPrice, type Product } from '@/lib/products'
import { ProductIconGlyph } from '@/components/menu/product-visual'
import { AdminHeader } from './admin-header'
import { Badge } from './admin-ui'

type CajaFilter = 'todos' | 'merienda' | 'cena' | 'bebida' | 'promo'
type PayMethod = 'efectivo' | 'transferencia'

type Line = { product: Product; qty: number }

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
  const [cartOpenMobile, setCartOpenMobile] = useState(false)
  const [confirmed, setConfirmed] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return PRODUCTS.filter((p) => {
      const matchesFilter =
        filter === 'todos'
          ? true
          : filter === 'bebida'
            ? p.type === 'bebida'
            : filter === 'promo'
              ? p.type === 'promo'
              : p.meals.includes(filter)
      const matchesQuery =
        query.trim() === '' ||
        p.name.toLowerCase().includes(query.trim().toLowerCase())
      return matchesFilter && matchesQuery
    })
  }, [filter, query])

  const count = lines.reduce((acc, l) => acc + l.qty, 0)
  const total = lines.reduce((acc, l) => acc + l.product.price * l.qty, 0)

  function addProduct(product: Product) {
    if (product.stock === 'agotado') return
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

  function changeQty(id: string, delta: number) {
    setLines((prev) =>
      prev
        .map((l) =>
          l.product.id === id ? { ...l, qty: l.qty + delta } : l,
        )
        .filter((l) => l.qty > 0),
    )
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.product.id !== id))
  }

  function clearOrder() {
    setLines([])
    setCustomer('')
    setPhone('')
    setTable('')
    setMethod('efectivo')
  }

  function confirmSale() {
    if (lines.length === 0) return
    const code = `KMG-${Math.floor(1000 + Math.random() * 9000)}`
    setConfirmed(code)
    clearOrder()
    setCartOpenMobile(false)
  }

  return (
    <div className="min-h-screen bg-[#EEF5FF]">
      <AdminHeader
        section="Caja rápida"
        backHref="/admin/dashboard"
        backLabel="Volver al panel"
        status={{ label: 'Caja abierta', tone: 'success' }}
      />

      <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[1fr_380px] lg:gap-5 lg:px-4 lg:py-5">
        {/* Catálogo */}
        <main className="px-4 py-4 lg:px-0 lg:py-0">
          {/* Buscador */}
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#75AADB]" />
            <input
              type="text"
              inputMode="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto…"
              className="w-full rounded-2xl border border-[#75AADB]/40 bg-white py-3.5 pl-11 pr-4 text-base font-medium text-[#003B73] placeholder:text-[#9CA3AF] focus:border-[#003B73] focus:outline-none focus:ring-2 focus:ring-[#003B73]/15"
            />
          </div>

          {/* Filtros */}
          <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
            {FILTERS.map((f) => {
              const active = filter === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                    active
                      ? 'bg-[#003B73] text-white shadow-sm'
                      : 'border border-[#75AADB]/40 bg-white text-[#003B73] hover:bg-[#EEF5FF]'
                  }`}
                >
                  {f.label}
                </button>
              )
            })}
          </div>

          {/* Botones grandes de productos */}
          <div className="grid grid-cols-2 gap-3 pb-28 sm:grid-cols-3 lg:pb-0">
            {filtered.map((product) => {
              const soldOut = product.stock === 'agotado'
              const low = product.stock === 'bajo'
              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={soldOut}
                  onClick={() => addProduct(product)}
                  className={`group relative flex flex-col items-start gap-2 rounded-2xl border p-3.5 text-left transition-all ${
                    soldOut
                      ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
                      : 'border-[#75AADB]/25 bg-white hover:-translate-y-0.5 hover:border-[#003B73] hover:shadow-md active:scale-[0.98]'
                  }`}
                >
                  <div className="flex w-full items-start justify-between">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                        soldOut ? 'bg-slate-200 text-slate-400' : 'bg-[#EEF5FF] text-[#003B73]'
                      }`}
                    >
                      <ProductIconGlyph icon={product.icon} className="h-6 w-6" strokeWidth={2} />
                    </div>
                    {soldOut && <Badge tone="danger">Agotado</Badge>}
                    {low && <Badge tone="warning">Stock bajo</Badge>}
                  </div>
                  <span className="text-sm font-bold leading-tight text-[#003B73]">
                    {product.name}
                  </span>
                  <span className="mt-auto text-base font-extrabold text-[#003B73]">
                    {formatPrice(product.price)}
                  </span>
                  {!soldOut && (
                    <span className="absolute right-3 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#F6B21A] text-[#003B73] opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                      <Plus className="h-5 w-5" strokeWidth={2.6} />
                    </span>
                  )}
                </button>
              )
            })}
            {filtered.length === 0 && (
              <p className="col-span-full py-10 text-center text-sm font-medium text-[#75AADB]">
                No hay productos para este filtro.
              </p>
            )}
          </div>
        </main>

        {/* Pedido actual — panel derecho en desktop */}
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
              onMethod={setMethod}
              onCustomer={setCustomer}
              onPhone={setPhone}
              onTable={setTable}
              onChangeQty={changeQty}
              onRemove={removeLine}
              onClear={clearOrder}
              onConfirm={confirmSale}
            />
          </div>
        </aside>
      </div>

      {/* Barra inferior mobile */}
      {count > 0 && !cartOpenMobile && (
        <button
          type="button"
          onClick={() => setCartOpenMobile(true)}
          className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-[#003B73]/10 bg-[#003B73] px-4 py-3.5 text-white shadow-2xl lg:hidden"
        >
          <span className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
              <ShoppingCart className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <span className="text-sm font-bold">
              {count} {count === 1 ? 'ítem' : 'ítems'}
            </span>
          </span>
          <span className="flex items-center gap-2 rounded-xl bg-[#F6B21A] px-4 py-2 text-base font-extrabold text-[#003B73]">
            {formatPrice(total)}
            <span className="text-sm font-bold">Cobrar</span>
          </span>
        </button>
      )}

      {/* Hoja del pedido en mobile */}
      {cartOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-[#003B73]/40"
            onClick={() => setCartOpenMobile(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-[#EEF5FF] pb-4 shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-[#75AADB]/20 bg-[#EEF5FF] px-4 py-3">
              <h2 className="text-base font-extrabold text-[#003B73]">Pedido actual</h2>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setCartOpenMobile(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#003B73]"
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
                onMethod={setMethod}
                onCustomer={setCustomer}
                onPhone={setPhone}
                onTable={setTable}
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

      {/* Confirmación de venta */}
      {confirmed && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
          <div
            className="absolute inset-0 bg-[#003B73]/50"
            onClick={() => setConfirmed(null)}
          />
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-9 w-9 text-emerald-600" strokeWidth={2.2} />
            </div>
            <h2 className="text-xl font-extrabold text-[#003B73]">Venta registrada</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Pedido <span className="font-mono font-bold text-[#003B73]">{confirmed}</span> cargado en caja.
            </p>
            <button
              type="button"
              onClick={() => setConfirmed(null)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#F6B21A] py-3.5 text-base font-extrabold text-[#003B73] transition-colors hover:bg-[#ffbe2e]"
            >
              <Receipt className="h-5 w-5" strokeWidth={2.4} />
              Nueva venta
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Panel del pedido (reutilizado en desktop y mobile) ---

function OrderPanel({
  lines,
  count,
  total,
  method,
  customer,
  phone,
  table,
  onMethod,
  onCustomer,
  onPhone,
  onTable,
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
  onMethod: (m: PayMethod) => void
  onCustomer: (v: string) => void
  onPhone: (v: string) => void
  onTable: (v: string) => void
  onChangeQty: (id: string, delta: number) => void
  onRemove: (id: string) => void
  onClear: () => void
  onConfirm: () => void
  embedded?: boolean
}) {
  const empty = lines.length === 0

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-[#75AADB]/25 bg-white shadow-sm ${
        embedded ? '' : 'max-h-[calc(100vh-7rem)]'
      }`}
    >
      {!embedded && (
        <div className="flex items-center justify-between border-b border-[#75AADB]/15 bg-[#003B73] px-4 py-3 text-white">
          <span className="flex items-center gap-2 text-sm font-bold">
            <ShoppingCart className="h-5 w-5" strokeWidth={2.2} /> Pedido actual
          </span>
          {count > 0 && (
            <span className="rounded-full bg-[#F6B21A] px-2.5 py-0.5 text-xs font-extrabold text-[#003B73]">
              {count} {count === 1 ? 'ítem' : 'ítems'}
            </span>
          )}
        </div>
      )}

      {/* Líneas */}
      <div className={`flex-1 overflow-y-auto ${empty ? '' : 'divide-y divide-[#75AADB]/10'}`}>
        {empty ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF5FF]">
              <ShoppingCart className="h-6 w-6 text-[#75AADB]" strokeWidth={2} />
            </div>
            <p className="text-sm font-medium text-[#75AADB]">
              Tocá un producto para agregarlo.
            </p>
          </div>
        ) : (
          lines.map((l) => (
            <div key={l.product.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EEF5FF] text-[#003B73]">
                <ProductIconGlyph icon={l.product.icon} className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#003B73]">{l.product.name}</p>
                <p className="text-xs font-medium text-slate-400">
                  {formatPrice(l.product.price)} c/u
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Restar"
                  onClick={() => onChangeQty(l.product.id, -1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#75AADB]/40 text-[#003B73] transition-colors hover:bg-[#EEF5FF]"
                >
                  <Minus className="h-4 w-4" strokeWidth={2.6} />
                </button>
                <span className="w-6 text-center text-sm font-extrabold text-[#003B73]">
                  {l.qty}
                </span>
                <button
                  type="button"
                  aria-label="Sumar"
                  onClick={() => onChangeQty(l.product.id, 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#75AADB]/40 text-[#003B73] transition-colors hover:bg-[#EEF5FF]"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.6} />
                </button>
              </div>
              <button
                type="button"
                aria-label="Quitar"
                onClick={() => onRemove(l.product.id)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" strokeWidth={2.2} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Datos + total + acciones */}
      <div className="space-y-3 border-t border-[#75AADB]/15 bg-[#EEF5FF]/40 p-4">
        {/* Método de pago */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onMethod('efectivo')}
            className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-bold transition-colors ${
              method === 'efectivo'
                ? 'border-[#003B73] bg-[#003B73] text-white'
                : 'border-[#75AADB]/40 bg-white text-[#003B73] hover:bg-[#EEF5FF]'
            }`}
          >
            <Banknote className="h-4 w-4" strokeWidth={2.2} /> Efectivo
          </button>
          <button
            type="button"
            onClick={() => onMethod('transferencia')}
            className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-bold transition-colors ${
              method === 'transferencia'
                ? 'border-[#003B73] bg-[#003B73] text-white'
                : 'border-[#75AADB]/40 bg-white text-[#003B73] hover:bg-[#EEF5FF]'
            }`}
          >
            <ArrowRightLeft className="h-4 w-4" strokeWidth={2.2} /> Transfer.
          </button>
        </div>

        {/* Datos opcionales */}
        <input
          type="text"
          value={customer}
          onChange={(e) => onCustomer(e.target.value)}
          placeholder="Nombre del cliente (opcional)"
          className="w-full rounded-xl border border-[#75AADB]/40 bg-white px-3.5 py-2.5 text-sm font-medium text-[#003B73] placeholder:text-[#9CA3AF] focus:border-[#003B73] focus:outline-none focus:ring-2 focus:ring-[#003B73]/15"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => onPhone(e.target.value)}
            placeholder="Teléfono"
            className="w-full rounded-xl border border-[#75AADB]/40 bg-white px-3.5 py-2.5 text-sm font-medium text-[#003B73] placeholder:text-[#9CA3AF] focus:border-[#003B73] focus:outline-none focus:ring-2 focus:ring-[#003B73]/15"
          />
          <input
            type="text"
            inputMode="numeric"
            value={table}
            onChange={(e) => onTable(e.target.value)}
            placeholder="Mesa"
            className="w-full rounded-xl border border-[#75AADB]/40 bg-white px-3.5 py-2.5 text-sm font-medium text-[#003B73] placeholder:text-[#9CA3AF] focus:border-[#003B73] focus:outline-none focus:ring-2 focus:ring-[#003B73]/15"
          />
        </div>

        {/* Total grande */}
        <div className="flex items-end justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
          <span className="text-sm font-bold uppercase tracking-wide text-[#003B73]/55">
            Total
          </span>
          <span className="text-3xl font-extrabold leading-none text-[#003B73]">
            {formatPrice(total)}
          </span>
        </div>

        {/* Acciones */}
        <button
          type="button"
          onClick={onConfirm}
          disabled={empty}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-extrabold transition-all ${
            empty
              ? 'cursor-not-allowed bg-[#E2E8F0] text-[#94A3B8]'
              : 'bg-[#F6B21A] text-[#003B73] shadow-lg shadow-[#F6B21A]/30 hover:bg-[#ffbe2e] active:scale-[0.99]'
          }`}
        >
          <CheckCircle2 className="h-5 w-5" strokeWidth={2.4} />
          Confirmar venta
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={empty}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl border py-2.5 text-sm font-bold transition-colors ${
            empty
              ? 'cursor-not-allowed border-slate-200 text-slate-300'
              : 'border-[#75AADB]/40 bg-white text-[#003B73] hover:bg-white/60'
          }`}
        >
          <Trash2 className="h-4 w-4" strokeWidth={2.2} />
          Limpiar pedido
        </button>
      </div>
    </div>
  )
}
