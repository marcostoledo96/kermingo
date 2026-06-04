'use client'

import { useMemo, useState } from 'react'
import {
  ChefHat,
  Clock,
  Banknote,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  Utensils,
  PackageCheck,
  RefreshCw,
  Hash,
  MapPin,
} from 'lucide-react'
import { formatPrice, type ProductIcon } from '@/lib/products'
import { ProductIconGlyph } from '@/components/menu/product-visual'
import { AdminHeader } from './admin-header'
import { Badge, type BadgeTone, SectionTitle, AdminFooter } from './admin-ui'

/* ---------------------------------------------------------------------------
 * Pantalla de Cocina / Entrega — solo frontend con datos demo.
 * Permite ver qué falta preparar y a quién entregar.
 * ------------------------------------------------------------------------- */

type OrderStatus = 'recibido' | 'preparacion' | 'listo' | 'entregado' | 'cancelado'
type PayMethod = 'efectivo' | 'transferencia'
type PayStatus = 'pendiente' | 'pagado'

type OrderLine = {
  name: string
  icon: ProductIcon
  qty: number
  price: number
}

type Order = {
  id: string
  code: string
  customer: string
  table?: string
  method: PayMethod
  payStatus: PayStatus
  status: OrderStatus
  time: string
  lines: OrderLine[]
}

const INITIAL_ORDERS: Order[] = [
  {
    id: 'o1',
    code: 'KMG-1042',
    customer: 'Sofía Pérez',
    table: '7',
    method: 'transferencia',
    payStatus: 'pagado',
    status: 'recibido',
    time: '20:42',
    lines: [
      { name: 'Pizza muzza', icon: 'pizza', qty: 2, price: 3500 },
      { name: 'Coca Cola', icon: 'soda', qty: 2, price: 2000 },
    ],
  },
  {
    id: 'o2',
    code: 'KMG-1043',
    customer: 'Martín Gómez',
    method: 'efectivo',
    payStatus: 'pendiente',
    status: 'recibido',
    time: '20:44',
    lines: [
      { name: 'Panchos', icon: 'sandwich', qty: 3, price: 2500 },
      { name: 'Nuggets', icon: 'drumstick', qty: 1, price: 3000 },
    ],
  },
  {
    id: 'o3',
    code: 'KMG-1039',
    customer: 'Lucía Fernández',
    table: '3',
    method: 'transferencia',
    payStatus: 'pagado',
    status: 'preparacion',
    time: '20:35',
    lines: [
      { name: 'Pizza napolitana', icon: 'pizza', qty: 1, price: 3800 },
      { name: 'Pizza muzza', icon: 'pizza', qty: 1, price: 3500 },
      { name: 'Agua mineral', icon: 'water', qty: 2, price: 1500 },
    ],
  },
  {
    id: 'o4',
    code: 'KMG-1040',
    customer: 'Diego Ramírez',
    table: '12',
    method: 'efectivo',
    payStatus: 'pendiente',
    status: 'preparacion',
    time: '20:37',
    lines: [
      { name: 'Combo cena', icon: 'combo', qty: 2, price: 6500 },
    ],
  },
  {
    id: 'o5',
    code: 'KMG-1036',
    customer: 'Valentina Ruiz',
    method: 'transferencia',
    payStatus: 'pagado',
    status: 'listo',
    time: '20:28',
    lines: [
      { name: 'Chocotorta', icon: 'cake', qty: 2, price: 2500 },
      { name: 'Café', icon: 'coffee', qty: 2, price: 1500 },
    ],
  },
  {
    id: 'o6',
    code: 'KMG-1030',
    customer: 'Tomás Díaz',
    table: '5',
    method: 'efectivo',
    payStatus: 'pagado',
    status: 'entregado',
    time: '20:15',
    lines: [
      { name: 'Medialunas', icon: 'croissant', qty: 4, price: 1600 },
      { name: 'Mate cocido', icon: 'coffee', qty: 2, price: 1200 },
    ],
  },
]

const STATUS_META: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  recibido: { label: 'Recibido', tone: 'info' },
  preparacion: { label: 'En preparación', tone: 'warning' },
  listo: { label: 'Listo', tone: 'success' },
  entregado: { label: 'Entregado', tone: 'neutral' },
  cancelado: { label: 'Cancelado', tone: 'danger' },
}

type TabId = OrderStatus | 'todos'

const TABS: { id: TabId; label: string }[] = [
  { id: 'recibido', label: 'Recibidos' },
  { id: 'preparacion', label: 'En preparación' },
  { id: 'listo', label: 'Listos' },
  { id: 'entregado', label: 'Entregados' },
  { id: 'todos', label: 'Todos' },
]

export function CocinaScreen() {
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS)
  const [tab, setTab] = useState<TabId>('recibido')

  function setStatus(id: string, status: OrderStatus) {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o)),
    )
  }

  const counts = useMemo(() => {
    const c: Record<TabId, number> = {
      recibido: 0,
      preparacion: 0,
      listo: 0,
      entregado: 0,
      cancelado: 0,
      todos: orders.length,
    }
    orders.forEach((o) => {
      c[o.status] += 1
    })
    return c
  }, [orders])

  const visibleOrders = useMemo(() => {
    if (tab === 'todos') return orders
    return orders.filter((o) => o.status === tab)
  }, [orders, tab])

  // Productos pendientes: agrupar líneas de pedidos en cocina (recibidos + en preparación).
  const pending = useMemo(() => {
    const active = orders.filter(
      (o) => o.status === 'recibido' || o.status === 'preparacion',
    )
    const map = new Map<
      string,
      { name: string; icon: ProductIcon; qty: number; orders: string[] }
    >()
    active.forEach((o) => {
      o.lines.forEach((l) => {
        const existing = map.get(l.name)
        if (existing) {
          existing.qty += l.qty
          existing.orders.push(o.code)
        } else {
          map.set(l.name, {
            name: l.name,
            icon: l.icon,
            qty: l.qty,
            orders: [o.code],
          })
        }
      })
    })
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty)
  }, [orders])

  return (
    <div className="min-h-screen bg-[#EEF5FF]">
      <AdminHeader
        section="Cocina / Entrega"
        backHref="/admin/dashboard"
        backLabel="Volver al panel"
        status={{ label: 'En vivo', tone: 'success' }}
      />

      {/* Aviso de actualización */}
      <div className="border-b border-[#75AADB]/20 bg-white/70">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-xs font-medium text-[#003B73]/60">
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.4} />
          Se actualiza cada 10 segundos
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[57px] z-30 border-b border-[#75AADB]/20 bg-[#EEF5FF]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3">
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                  active
                    ? 'bg-[#003B73] text-white shadow-sm'
                    : 'border border-[#75AADB]/40 bg-white text-[#003B73] hover:bg-white'
                }`}
              >
                {t.label}
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-extrabold ${
                    active ? 'bg-[#F6B21A] text-[#003B73]' : 'bg-[#EEF5FF] text-[#003B73]'
                  }`}
                >
                  {counts[t.id]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-5 lg:grid lg:grid-cols-[1fr_320px] lg:gap-6">
        {/* Columna de pedidos */}
        <main>
          {visibleOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#75AADB]/40 bg-white/60 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF5FF]">
                <ChefHat className="h-7 w-7 text-[#75AADB]" strokeWidth={2} />
              </div>
              <p className="text-sm font-semibold text-[#003B73]/60">
                No hay pedidos en este estado.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {visibleOrders.map((order) => (
                <OrderCard key={order.id} order={order} onSetStatus={setStatus} />
              ))}
            </div>
          )}
        </main>

        {/* Productos pendientes */}
        <aside className="mt-8 lg:mt-0">
          <div className="lg:sticky lg:top-40">
            <SectionTitle>Productos pendientes</SectionTitle>
            <div className="overflow-hidden rounded-2xl border border-[#75AADB]/20 bg-white shadow-sm">
              {pending.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <PackageCheck className="h-7 w-7 text-emerald-500" strokeWidth={2} />
                  <p className="text-sm font-medium text-[#003B73]/60">
                    Nada pendiente de preparar.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[#75AADB]/10">
                  {pending.map((p) => (
                    <li key={p.name} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF5FF] text-[#003B73]">
                        <ProductIconGlyph icon={p.icon} className="h-5 w-5" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[#003B73]">
                          {p.name}
                        </p>
                        <p className="truncate text-xs font-medium text-[#003B73]/50">
                          {p.orders.join(' · ')}
                        </p>
                      </div>
                      <span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-[#003B73] px-2 text-base font-extrabold text-[#F6B21A]">
                        {p.qty}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </aside>
      </div>

      <AdminFooter />
    </div>
  )
}

// --- Card individual de pedido ---

function OrderCard({
  order,
  onSetStatus,
}: {
  order: Order
  onSetStatus: (id: string, status: OrderStatus) => void
}) {
  const statusMeta = STATUS_META[order.status]
  const isClosed = order.status === 'entregado' || order.status === 'cancelado'

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border-2 border-[#75AADB]/20 bg-white shadow-sm">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-2 border-b border-[#75AADB]/15 px-4 py-3">
        <div>
          <div className="flex items-center gap-1.5 text-lg font-extrabold leading-none text-[#003B73]">
            <Hash className="h-4 w-4 text-[#75AADB]" strokeWidth={2.6} />
            {order.code.replace('KMG-', '')}
          </div>
          <p className="mt-1 text-sm font-bold text-[#003B73]">{order.customer}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-[#003B73]/55">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" strokeWidth={2.4} />
              {order.time}
            </span>
            {order.table && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" strokeWidth={2.4} />
                Mesa {order.table}
              </span>
            )}
            <span className="flex items-center gap-1">
              {order.method === 'efectivo' ? (
                <Banknote className="h-3.5 w-3.5" strokeWidth={2.4} />
              ) : (
                <ArrowRightLeft className="h-3.5 w-3.5" strokeWidth={2.4} />
              )}
              {order.method === 'efectivo' ? 'Efectivo' : 'Transfer.'}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge tone={statusMeta.tone} uppercase dot>
            {statusMeta.label}
          </Badge>
          <Badge tone={order.payStatus === 'pagado' ? 'success' : 'danger'}>
            {order.payStatus === 'pagado' ? 'Pagado' : 'Pago pendiente'}
          </Badge>
        </div>
      </div>

      {/* Productos */}
      <ul className="flex-1 space-y-1.5 px-4 py-3">
        {order.lines.map((l) => (
          <li key={l.name} className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EEF5FF] text-[#003B73]">
              <ProductIconGlyph icon={l.icon} className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-[#003B73] px-1.5 text-sm font-extrabold text-white">
              {l.qty}
            </span>
            <span className="flex-1 text-sm font-semibold text-[#003B73]">
              {l.name}
            </span>
          </li>
        ))}
      </ul>

      {/* Botones de acción */}
      <div className="border-t border-[#75AADB]/15 bg-[#EEF5FF]/40 p-3">
        {isClosed ? (
          <div className="flex items-center justify-center gap-2 py-1 text-sm font-bold text-[#003B73]/55">
            {order.status === 'entregado' ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" strokeWidth={2.4} />
                Pedido entregado
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-red-500" strokeWidth={2.4} />
                Pedido cancelado
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <ActionButton
              active={order.status === 'preparacion'}
              icon={Utensils}
              label="En preparación"
              onClick={() => onSetStatus(order.id, 'preparacion')}
            />
            <ActionButton
              active={order.status === 'listo'}
              icon={PackageCheck}
              label="Listo"
              onClick={() => onSetStatus(order.id, 'listo')}
            />
            <ActionButton
              icon={CheckCircle2}
              label="Entregado"
              tone="primary"
              onClick={() => onSetStatus(order.id, 'entregado')}
            />
            <ActionButton
              icon={XCircle}
              label="Cancelar"
              tone="danger"
              onClick={() => onSetStatus(order.id, 'cancelado')}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  active = false,
  tone = 'default',
}: {
  icon: typeof Utensils
  label: string
  onClick: () => void
  active?: boolean
  tone?: 'default' | 'primary' | 'danger'
}) {
  const base =
    'flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-colors'
  const styles =
    tone === 'primary'
      ? 'bg-[#F6B21A] text-[#003B73] hover:bg-[#ffbe2e]'
      : tone === 'danger'
        ? 'border border-red-200 bg-white text-red-600 hover:bg-red-50'
        : active
          ? 'border-2 border-[#003B73] bg-[#003B73] text-white'
          : 'border border-[#75AADB]/40 bg-white text-[#003B73] hover:bg-[#EEF5FF]'

  return (
    <button type="button" onClick={onClick} className={`${base} ${styles}`}>
      <Icon className="h-4 w-4" strokeWidth={2.4} />
      {label}
    </button>
  )
}
