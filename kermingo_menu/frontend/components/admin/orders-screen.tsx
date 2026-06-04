'use client'

import { useMemo, useState } from 'react'
import {
  Search,
  Eye,
  Pencil,
  XCircle,
  CheckCircle2,
  RefreshCw,
  Hash,
  MapPin,
  Phone,
  Clock,
  Banknote,
  ArrowRightLeft,
  X,
  FilterX,
  Receipt,
  ChevronDown,
  Inbox,
} from 'lucide-react'
import { formatPrice, type ProductIcon } from '@/lib/products'
import { ProductIconGlyph } from '@/components/menu/product-visual'
import { AdminHeader } from './admin-header'
import { Badge, type BadgeTone, AdminCard, AdminFooter } from './admin-ui'

/* ---------------------------------------------------------------------------
 * Gestión de pedidos (admin) — solo frontend con datos demo.
 * Filtros, listado responsive (tabla / cards) y modal de detalle con acciones.
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
  phone?: string
  table?: string
  method: PayMethod
  payStatus: PayStatus
  status: OrderStatus
  time: string
  notes?: string
  hasReceipt: boolean
  lines: OrderLine[]
}

const STATUS_META: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  recibido: { label: 'Recibido', tone: 'info' },
  preparacion: { label: 'En preparación', tone: 'warning' },
  listo: { label: 'Listo', tone: 'success' },
  entregado: { label: 'Entregado', tone: 'neutral' },
  cancelado: { label: 'Cancelado', tone: 'danger' },
}

// Siguiente estado en el flujo de preparación.
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  recibido: 'preparacion',
  preparacion: 'listo',
  listo: 'entregado',
}

function lineTotal(o: Order): number {
  return o.lines.reduce((acc, l) => acc + l.price * l.qty, 0)
}

const INITIAL_ORDERS: Order[] = [
  {
    id: 'o1',
    code: 'KMG-1042',
    customer: 'Sofía Pérez',
    phone: '11 5512-7788',
    table: '7',
    method: 'transferencia',
    payStatus: 'pagado',
    status: 'recibido',
    time: '20:42',
    hasReceipt: true,
    lines: [
      { name: 'Pizza muzza', icon: 'pizza', qty: 2, price: 3500 },
      { name: 'Coca Cola', icon: 'soda', qty: 2, price: 2000 },
    ],
  },
  {
    id: 'o2',
    code: 'KMG-1043',
    customer: 'Martín Gómez',
    phone: '11 6623-1190',
    method: 'efectivo',
    payStatus: 'pendiente',
    status: 'recibido',
    time: '20:44',
    notes: 'Sin cebolla en los panchos.',
    hasReceipt: false,
    lines: [
      { name: 'Panchos', icon: 'sandwich', qty: 3, price: 2500 },
      { name: 'Nuggets', icon: 'drumstick', qty: 1, price: 3000 },
    ],
  },
  {
    id: 'o3',
    code: 'KMG-1039',
    customer: 'Lucía Fernández',
    phone: '11 4478-9921',
    table: '3',
    method: 'transferencia',
    payStatus: 'pagado',
    status: 'preparacion',
    time: '20:35',
    hasReceipt: true,
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
    phone: '11 2231-5567',
    table: '12',
    method: 'efectivo',
    payStatus: 'pendiente',
    status: 'preparacion',
    time: '20:37',
    hasReceipt: false,
    lines: [{ name: 'Combo cena', icon: 'combo', qty: 2, price: 6500 }],
  },
  {
    id: 'o5',
    code: 'KMG-1036',
    customer: 'Valentina Ruiz',
    phone: '11 7789-3344',
    method: 'transferencia',
    payStatus: 'pagado',
    status: 'listo',
    time: '20:28',
    hasReceipt: true,
    lines: [
      { name: 'Chocotorta', icon: 'cake', qty: 2, price: 2500 },
      { name: 'Café', icon: 'coffee', qty: 2, price: 1500 },
    ],
  },
  {
    id: 'o6',
    code: 'KMG-1030',
    customer: 'Tomás Díaz',
    phone: '11 9912-0055',
    table: '5',
    method: 'efectivo',
    payStatus: 'pagado',
    status: 'entregado',
    time: '20:15',
    hasReceipt: false,
    lines: [
      { name: 'Medialunas', icon: 'croissant', qty: 4, price: 1600 },
      { name: 'Mate cocido', icon: 'coffee', qty: 2, price: 1200 },
    ],
  },
  {
    id: 'o7',
    code: 'KMG-1028',
    customer: 'Camila Sosa',
    phone: '11 3345-8821',
    method: 'transferencia',
    payStatus: 'pagado',
    status: 'cancelado',
    time: '20:08',
    hasReceipt: true,
    lines: [{ name: 'Pizza jamón', icon: 'pizza', qty: 1, price: 3900 }],
  },
]

type StatusFilter = 'todos' | OrderStatus
type PayStatusFilter = 'todos' | PayStatus
type MethodFilter = 'todos' | PayMethod

export function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [payFilter, setPayFilter] = useState<PayStatusFilter>('todos')
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('todos')
  const [detail, setDetail] = useState<Order | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter((o) => {
      if (q) {
        const hay =
          o.code.toLowerCase().includes(q) ||
          o.customer.toLowerCase().includes(q) ||
          (o.phone ?? '').toLowerCase().includes(q)
        if (!hay) return false
      }
      if (statusFilter !== 'todos' && o.status !== statusFilter) return false
      if (payFilter !== 'todos' && o.payStatus !== payFilter) return false
      if (methodFilter !== 'todos' && o.method !== methodFilter) return false
      return true
    })
  }, [orders, search, statusFilter, payFilter, methodFilter])

  const hasFilters =
    search !== '' || statusFilter !== 'todos' || payFilter !== 'todos' || methodFilter !== 'todos'

  function clearFilters() {
    setSearch('')
    setStatusFilter('todos')
    setPayFilter('todos')
    setMethodFilter('todos')
  }

  function setStatus(id: string, status: OrderStatus) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)))
    setDetail((d) => (d && d.id === id ? { ...d, status } : d))
  }

  function markPaid(id: string) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, payStatus: 'pagado' } : o)))
    setDetail((d) => (d && d.id === id ? { ...d, payStatus: 'pagado' } : d))
  }

  return (
    <div className="min-h-screen bg-[#EEF5FF]">
      <AdminHeader
        section="Pedidos"
        backHref="/admin/dashboard"
        backLabel="Volver al panel"
        status={{ label: 'En vivo', tone: 'success' }}
      />

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        {/* Encabezado */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-[#003B73]">Gestión de pedidos</h2>
            <p className="text-sm text-slate-500">
              {filtered.length} de {orders.length} pedidos
            </p>
          </div>
        </div>

        {/* Filtros */}
        <AdminCard className="space-y-3 p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#75AADB]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por número, cliente o teléfono..."
              className="kermingo-input pl-10"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
            <FilterGroup label="Estado">
              <Chip active={statusFilter === 'todos'} onClick={() => setStatusFilter('todos')}>
                Todos
              </Chip>
              {(Object.keys(STATUS_META) as OrderStatus[]).map((s) => (
                <Chip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
                  {STATUS_META[s].label}
                </Chip>
              ))}
            </FilterGroup>

            <FilterGroup label="Pago">
              <Chip active={payFilter === 'todos'} onClick={() => setPayFilter('todos')}>
                Todos
              </Chip>
              <Chip active={payFilter === 'pagado'} onClick={() => setPayFilter('pagado')}>
                Pagado
              </Chip>
              <Chip active={payFilter === 'pendiente'} onClick={() => setPayFilter('pendiente')}>
                Pendiente
              </Chip>
            </FilterGroup>

            <FilterGroup label="Método">
              <Chip active={methodFilter === 'todos'} onClick={() => setMethodFilter('todos')}>
                Todos
              </Chip>
              <Chip active={methodFilter === 'efectivo'} onClick={() => setMethodFilter('efectivo')}>
                Efectivo
              </Chip>
              <Chip
                active={methodFilter === 'transferencia'}
                onClick={() => setMethodFilter('transferencia')}
              >
                Transferencia
              </Chip>
            </FilterGroup>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 self-start rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-50"
              >
                <FilterX className="h-3.5 w-3.5" strokeWidth={2.4} />
                Limpiar filtros
              </button>
            )}
          </div>
        </AdminCard>

        {/* Listado */}
        {filtered.length === 0 ? (
          <AdminCard className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Inbox className="h-12 w-12 text-[#75AADB]" strokeWidth={1.6} />
            <p className="font-bold text-[#003B73]">No hay pedidos con esos filtros</p>
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
                      <th className="px-4 py-3">Pedido</th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3">Método</th>
                      <th className="px-4 py-3">Pago</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#75AADB]/10">
                    {filtered.map((o) => (
                      <tr key={o.id} className="transition-colors hover:bg-[#EEF5FF]/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 font-extrabold text-[#003B73]">
                            <Hash className="h-3.5 w-3.5 text-[#75AADB]" strokeWidth={2.6} />
                            {o.code.replace('KMG-', '')}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1 text-xs font-medium text-slate-400">
                            <Clock className="h-3 w-3" strokeWidth={2.4} />
                            {o.time}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-[#003B73]">{o.customer}</p>
                          <p className="text-xs text-slate-400">
                            {o.table ? `Mesa ${o.table}` : 'Sin mesa'}
                            {o.phone ? ` · ${o.phone}` : ''}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-700">
                          {formatPrice(lineTotal(o))}
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 text-slate-600">
                            {o.method === 'efectivo' ? (
                              <Banknote className="h-4 w-4 text-emerald-600" strokeWidth={2.2} />
                            ) : (
                              <ArrowRightLeft className="h-4 w-4 text-sky-600" strokeWidth={2.2} />
                            )}
                            {o.method === 'efectivo' ? 'Efectivo' : 'Transfer.'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={o.payStatus === 'pagado' ? 'success' : 'danger'}>
                            {o.payStatus === 'pagado' ? 'Pagado' : 'Pendiente'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={STATUS_META[o.status].tone} dot>
                            {STATUS_META[o.status].label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <RowActions
                            order={o}
                            onDetail={() => setDetail(o)}
                            onAdvance={() => {
                              const next = NEXT_STATUS[o.status]
                              if (next) setStatus(o.id, next)
                            }}
                            onMarkPaid={() => markPaid(o.id)}
                            onCancel={() => setStatus(o.id, 'cancelado')}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AdminCard>

            {/* Mobile/tablet: cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
              {filtered.map((o) => (
                <AdminCard key={o.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1 text-lg font-extrabold leading-none text-[#003B73]">
                        <Hash className="h-4 w-4 text-[#75AADB]" strokeWidth={2.6} />
                        {o.code.replace('KMG-', '')}
                      </div>
                      <p className="mt-1 font-bold text-[#003B73]">{o.customer}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" strokeWidth={2.4} />
                          {o.time}
                        </span>
                        {o.table && <span>Mesa {o.table}</span>}
                        {o.phone && <span>{o.phone}</span>}
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-lg font-extrabold text-[#003B73]">
                      {formatPrice(lineTotal(o))}
                    </span>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone={STATUS_META[o.status].tone} dot>
                      {STATUS_META[o.status].label}
                    </Badge>
                    <Badge tone={o.payStatus === 'pagado' ? 'success' : 'danger'}>
                      {o.payStatus === 'pagado' ? 'Pagado' : 'Pago pendiente'}
                    </Badge>
                    <span className="flex items-center gap-1 rounded-md bg-[#EEF5FF] px-1.5 py-0.5 text-[11px] font-semibold text-[#003B73]">
                      {o.method === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                    </span>
                  </div>

                  <div className="mt-3 border-t border-[#75AADB]/15 pt-3">
                    <RowActions
                      order={o}
                      full
                      onDetail={() => setDetail(o)}
                      onAdvance={() => {
                        const next = NEXT_STATUS[o.status]
                        if (next) setStatus(o.id, next)
                      }}
                      onMarkPaid={() => markPaid(o.id)}
                      onCancel={() => setStatus(o.id, 'cancelado')}
                    />
                  </div>
                </AdminCard>
              ))}
            </div>
          </>
        )}

        <AdminFooter />
      </main>

      {detail && (
        <OrderDetailModal
          order={detail}
          onClose={() => setDetail(null)}
          onAdvance={() => {
            const next = NEXT_STATUS[detail.status]
            if (next) setStatus(detail.id, next)
          }}
          onMarkPaid={() => markPaid(detail.id)}
          onCancel={() => setStatus(detail.id, 'cancelado')}
        />
      )}
    </div>
  )
}

/* --- Acciones de fila --- */

function RowActions({
  order,
  onDetail,
  onAdvance,
  onMarkPaid,
  onCancel,
  full,
}: {
  order: Order
  onDetail: () => void
  onAdvance: () => void
  onMarkPaid: () => void
  onCancel: () => void
  full?: boolean
}) {
  const closed = order.status === 'entregado' || order.status === 'cancelado'
  const next = NEXT_STATUS[order.status]
  const base = full ? 'flex-1 justify-center' : ''

  return (
    <div className={`flex items-center gap-1.5 ${full ? 'w-full flex-wrap' : 'justify-end'}`}>
      <ActionButton label="Ver" icon={Eye} onClick={onDetail} className={base} />
      {order.payStatus === 'pendiente' && (
        <ActionButton
          label="Marcar pagado"
          icon={CheckCircle2}
          onClick={onMarkPaid}
          tone="success"
          className={base}
        />
      )}
      {!closed && next && (
        <ActionButton
          label={STATUS_META[next].label}
          icon={RefreshCw}
          onClick={onAdvance}
          tone="primary"
          className={base}
        />
      )}
      {!closed && (
        <ActionButton
          label="Cancelar"
          icon={XCircle}
          onClick={onCancel}
          tone="danger"
          className={base}
        />
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
  icon: typeof Eye
  onClick: () => void
  tone?: 'neutral' | 'primary' | 'success' | 'danger'
  className?: string
}) {
  const tones = {
    neutral: 'border-[#75AADB]/30 bg-white text-[#003B73] hover:bg-[#EEF5FF]',
    primary: 'border-[#003B73] bg-[#003B73] text-white hover:bg-[#00305e]',
    success: 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50',
    danger: 'border-red-200 bg-white text-red-600 hover:bg-red-50',
  }
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors ${tones[tone]} ${className}`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
      {label}
    </button>
  )
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-1.5 hidden text-[11px] font-bold uppercase tracking-wide text-[#003B73]/45 sm:inline">
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

/* --- Modal de detalle --- */

function OrderDetailModal({
  order,
  onClose,
  onAdvance,
  onMarkPaid,
  onCancel,
}: {
  order: Order
  onClose: () => void
  onAdvance: () => void
  onMarkPaid: () => void
  onCancel: () => void
}) {
  const closed = order.status === 'entregado' || order.status === 'cancelado'
  const next = NEXT_STATUS[order.status]

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-[#003B73]/40 backdrop-blur-sm"
      />
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        {/* Header */}
        <div className="border-b border-[#75AADB]/15 bg-[#003B73] px-5 py-4 pr-14 text-white">
          <div className="flex items-center gap-1.5 text-2xl font-extrabold leading-none">
            <Hash className="h-5 w-5 text-[#F6B21A]" strokeWidth={2.6} />
            {order.code.replace('KMG-', '')}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-sm text-white/70">
              <Clock className="h-3.5 w-3.5" strokeWidth={2.4} />
              {order.time}
            </span>
            <Badge tone={STATUS_META[order.status].tone} dot>
              {STATUS_META[order.status].label}
            </Badge>
            <Badge tone={order.payStatus === 'pagado' ? 'success' : 'danger'}>
              {order.payStatus === 'pagado' ? 'Pagado' : 'Pago pendiente'}
            </Badge>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 rounded-full p-1 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Cuerpo */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Datos del cliente */}
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[#003B73]/55">
              Datos del cliente
            </h3>
            <div className="space-y-1.5 rounded-2xl bg-[#EEF5FF]/60 p-3.5 text-sm">
              <p className="font-bold text-[#003B73]">{order.customer}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[#003B73]/70">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" strokeWidth={2.2} />
                  {order.table ? `Mesa ${order.table}` : 'Sin mesa'}
                </span>
                {order.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" strokeWidth={2.2} />
                    {order.phone}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  {order.method === 'efectivo' ? (
                    <Banknote className="h-3.5 w-3.5" strokeWidth={2.2} />
                  ) : (
                    <ArrowRightLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
                  )}
                  {order.method === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                </span>
              </div>
              {order.notes && (
                <p className="mt-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700">
                  Nota: {order.notes}
                </p>
              )}
            </div>
          </section>

          {/* Productos */}
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[#003B73]/55">
              Productos
            </h3>
            <ul className="divide-y divide-[#75AADB]/10 overflow-hidden rounded-2xl border border-[#75AADB]/20">
              {order.lines.map((l) => (
                <li key={l.name} className="flex items-center gap-3 px-3.5 py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF5FF] text-[#003B73]">
                    <ProductIconGlyph icon={l.icon} className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-[#003B73] px-1.5 text-sm font-extrabold text-white">
                    {l.qty}
                  </span>
                  <span className="flex-1 text-sm font-semibold text-[#003B73]">{l.name}</span>
                  <span className="text-sm font-bold text-slate-600">
                    {formatPrice(l.price * l.qty)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Comprobante */}
          {order.method === 'transferencia' && (
            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[#003B73]/55">
                Comprobante
              </h3>
              {order.hasReceipt ? (
                <button className="flex w-full items-center gap-3 rounded-2xl border border-[#75AADB]/30 bg-white p-3 text-left transition-colors hover:bg-[#EEF5FF]/60">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Receipt className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-[#003B73]">
                      Comprobante adjunto
                    </span>
                    <span className="block text-xs text-slate-400">Tocá para ver la imagen</span>
                  </span>
                  <ChevronDown className="h-4 w-4 -rotate-90 text-slate-400" />
                </button>
              ) : (
                <p className="rounded-2xl border border-dashed border-red-200 bg-red-50/50 px-3.5 py-3 text-sm font-medium text-red-500">
                  Sin comprobante adjunto.
                </p>
              )}
            </section>
          )}

          {/* Total */}
          <div className="flex items-center justify-between rounded-2xl bg-[#003B73] px-4 py-3.5 text-white">
            <span className="text-sm font-semibold text-white/80">Total del pedido</span>
            <span className="text-2xl font-extrabold text-[#F6B21A]">
              {formatPrice(lineTotal(order))}
            </span>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="space-y-2 border-t border-[#75AADB]/15 bg-[#EEF5FF]/40 p-4">
          <div className="grid grid-cols-2 gap-2">
            {order.payStatus === 'pendiente' && (
              <ActionButton
                label="Marcar pagado"
                icon={CheckCircle2}
                onClick={onMarkPaid}
                tone="success"
                className="justify-center"
              />
            )}
            {!closed && next && (
              <ActionButton
                label={`Pasar a ${STATUS_META[next].label.toLowerCase()}`}
                icon={RefreshCw}
                onClick={onAdvance}
                tone="primary"
                className="justify-center"
              />
            )}
            <ActionButton
              label="Editar pedido"
              icon={Pencil}
              onClick={() => {}}
              className="justify-center"
            />
            {!closed && (
              <ActionButton
                label="Cancelar pedido"
                icon={XCircle}
                onClick={onCancel}
                tone="danger"
                className="justify-center"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
