'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Clock,
  ChefHat,
  CheckCircle2,
  Truck,
  CreditCard,
  DollarSign,
  AlertTriangle,
  XCircle,
  Zap,
  UtensilsCrossed,
  Package,
  FileText,
  BarChart3,
  Settings,
  ChevronRight,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react'
import { formatPrice } from '@/lib/products'
import { AdminHeader } from './admin-header'
import { Badge, type BadgeTone, SectionTitle, AdminCard, AdminFooter } from './admin-ui'

type OrderStatus = 'pendiente' | 'preparando' | 'listo' | 'entregado'
type PaymentStatus = 'pendiente' | 'verificando' | 'confirmado'

type Order = {
  id: string
  code: string
  customer: string
  method: 'transferencia' | 'efectivo'
  paymentStatus: PaymentStatus
  orderStatus: OrderStatus
  total: number
  time: string
}

const DEMO_ORDERS: Order[] = [
  { id: '1', code: 'KMG-0042', customer: 'Martín G.', method: 'transferencia', paymentStatus: 'confirmado', orderStatus: 'listo', total: 6500, time: '20:45' },
  { id: '2', code: 'KMG-0041', customer: 'Lucía P.', method: 'efectivo', paymentStatus: 'pendiente', orderStatus: 'preparando', total: 3500, time: '20:42' },
  { id: '3', code: 'KMG-0040', customer: 'Federico R.', method: 'transferencia', paymentStatus: 'verificando', orderStatus: 'pendiente', total: 8200, time: '20:38' },
  { id: '4', code: 'KMG-0039', customer: 'Ana M.', method: 'efectivo', paymentStatus: 'confirmado', orderStatus: 'entregado', total: 4800, time: '20:31' },
  { id: '5', code: 'KMG-0038', customer: 'Pablo S.', method: 'transferencia', paymentStatus: 'confirmado', orderStatus: 'entregado', total: 5200, time: '20:25' },
]

const ORDER_STATUS_BADGE: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  pendiente: { label: 'Pendiente', tone: 'neutral' },
  preparando: { label: 'Preparando', tone: 'warning' },
  listo: { label: 'Listo', tone: 'success' },
  entregado: { label: 'Entregado', tone: 'info' },
}

const PAYMENT_STATUS_BADGE: Record<PaymentStatus, { label: string; tone: BadgeTone }> = {
  pendiente: { label: 'Pago pend.', tone: 'danger' },
  verificando: { label: 'Verificando', tone: 'warning' },
  confirmado: { label: 'Pagado', tone: 'success' },
}

export function DashboardScreen() {
  const [storeStatus] = useState<'open' | 'closed' | 'demo'>('demo')

  const storeBadge: Record<typeof storeStatus, { label: string; tone: BadgeTone }> = {
    open: { label: 'Tienda abierta', tone: 'success' },
    closed: { label: 'Tienda cerrada', tone: 'danger' },
    demo: { label: 'Modo demo', tone: 'gold' },
  }

  // Métricas demo
  const metrics = {
    pendientes: 3,
    preparando: 5,
    listos: 2,
    entregados: 28,
    pagosPendientes: 4,
    recaudacion: 187500,
  }

  // Alertas demo
  const alerts = {
    stockBajo: ['Pizza jamón', 'Nuggets veggies', 'Lima limón', 'Medialunas J&Q', 'Churros', 'Combo cena'],
    agotados: ['Pizza sin TACC', 'Helados palito'],
  }

  return (
    <div className="min-h-screen bg-[#EEF5FF]">
      <AdminHeader section="Panel general" status={storeBadge[storeStatus]} />

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-7">
        {/* Resumen de operación */}
        <section>
          <SectionTitle>Resumen en vivo</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MetricCard icon={Clock} label="Pendientes" value={metrics.pendientes} tone="slate" />
            <MetricCard icon={ChefHat} label="Preparando" value={metrics.preparando} tone="amber" />
            <MetricCard icon={CheckCircle2} label="Listos" value={metrics.listos} tone="emerald" />
            <MetricCard icon={Truck} label="Entregados" value={metrics.entregados} tone="sky" />
            <MetricCard icon={CreditCard} label="Pagos pend." value={metrics.pagosPendientes} tone="red" />
            <MetricCard
              icon={DollarSign}
              label="Recaudación"
              value={formatPrice(metrics.recaudacion)}
              tone="blue"
              highlight
            />
          </div>
        </section>

        {/* Alertas */}
        {(alerts.stockBajo.length > 0 || alerts.agotados.length > 0) && (
          <section className="grid gap-3 sm:grid-cols-2">
            {alerts.stockBajo.length > 0 && (
              <AlertCard icon={AlertTriangle} title="Stock bajo" items={alerts.stockBajo} tone="warning" />
            )}
            {alerts.agotados.length > 0 && (
              <AlertCard icon={XCircle} title="Agotados" items={alerts.agotados} tone="danger" />
            )}
          </section>
        )}

        {/* Accesos rápidos */}
        <section>
          <SectionTitle>Accesos rápidos</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <QuickAccessCard href="/admin/caja" icon={Zap} label="Caja rápida" highlight />
            <QuickAccessCard href="/admin/cocina" icon={ChefHat} label="Cocina / Entrega" />
            <QuickAccessCard href="/admin/productos" icon={UtensilsCrossed} label="Productos" />
            <QuickAccessCard href="/admin/pedidos" icon={Package} label="Pedidos" />
            <QuickAccessCard href="/admin/comprobantes" icon={FileText} label="Comprobantes" />
            <QuickAccessCard href="/admin/reportes" icon={BarChart3} label="Reportes" />
            <QuickAccessCard href="/admin/config" icon={Settings} label="Configuración" />
          </div>
        </section>

        {/* Últimos pedidos */}
        <section>
          <SectionTitle
            action={
              <Link
                href="/admin/pedidos"
                className="flex items-center gap-1 text-xs font-bold text-[#003B73] hover:underline"
              >
                Ver todos <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            Últimos pedidos
          </SectionTitle>

          <AdminCard className="overflow-hidden">
            {/* Desktop table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#75AADB]/15 bg-[#EEF5FF]/60 text-left text-[11px] font-bold uppercase tracking-wide text-[#003B73]/55">
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Pago</th>
                    <th className="px-4 py-3">Estado pago</th>
                    <th className="px-4 py-3">Estado pedido</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Hora</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#75AADB]/10">
                  {DEMO_ORDERS.map((order) => (
                    <tr key={order.id} className="transition-colors hover:bg-[#EEF5FF]/50">
                      <td className="px-4 py-3 font-mono font-bold text-[#003B73]">{order.code}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">{order.customer}</td>
                      <td className="px-4 py-3 text-xs capitalize text-slate-500">{order.method}</td>
                      <td className="px-4 py-3">
                        <Badge tone={PAYMENT_STATUS_BADGE[order.paymentStatus].tone}>
                          {PAYMENT_STATUS_BADGE[order.paymentStatus].label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={ORDER_STATUS_BADGE[order.orderStatus].tone}>
                          {ORDER_STATUS_BADGE[order.orderStatus].label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-700">{formatPrice(order.total)}</td>
                      <td className="px-4 py-3 text-right text-slate-400">{order.time}</td>
                      <td className="px-4 py-3">
                        <button
                          aria-label="Acciones"
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-[#EEF5FF] hover:text-[#003B73]"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-[#75AADB]/10 sm:hidden">
              {DEMO_ORDERS.map((order) => (
                <div key={order.id} className="space-y-2 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#003B73]">{order.code}</span>
                    <span className="text-xs text-slate-400">{order.time}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">{order.customer}</span>
                    <span className="font-bold text-slate-700">{formatPrice(order.total)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={PAYMENT_STATUS_BADGE[order.paymentStatus].tone}>
                      {PAYMENT_STATUS_BADGE[order.paymentStatus].label}
                    </Badge>
                    <Badge tone={ORDER_STATUS_BADGE[order.orderStatus].tone}>
                      {ORDER_STATUS_BADGE[order.orderStatus].label}
                    </Badge>
                    <span className="text-xs capitalize text-slate-400">{order.method}</span>
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>
        </section>

        <AdminFooter />
      </main>
    </div>
  )
}

// --- Subcomponentes ---

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
  highlight,
}: {
  icon: LucideIcon
  label: string
  value: string | number
  tone: 'slate' | 'amber' | 'emerald' | 'sky' | 'red' | 'blue'
  highlight?: boolean
}) {
  const tones: Record<string, { bg: string; icon: string }> = {
    slate: { bg: 'bg-slate-100', icon: 'text-slate-500' },
    amber: { bg: 'bg-amber-100', icon: 'text-amber-600' },
    emerald: { bg: 'bg-emerald-100', icon: 'text-emerald-600' },
    sky: { bg: 'bg-sky-100', icon: 'text-sky-600' },
    red: { bg: 'bg-red-100', icon: 'text-red-600' },
    blue: { bg: 'bg-[#F6B21A]', icon: 'text-[#003B73]' },
  }
  const c = tones[tone]

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md ${
        highlight
          ? 'col-span-2 border-[#003B73] bg-[#003B73] text-white sm:col-span-1'
          : 'border-[#75AADB]/20 bg-white shadow-[#003B73]/5'
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.bg}`}>
          <Icon className={`h-4 w-4 ${c.icon}`} strokeWidth={2.2} />
        </div>
        <span className={`text-xs font-semibold ${highlight ? 'text-[#75AADB]' : 'text-slate-500'}`}>
          {label}
        </span>
      </div>
      <p className={`text-2xl font-extrabold ${highlight ? 'text-white' : 'text-[#003B73]'}`}>
        {value}
      </p>
    </div>
  )
}

function AlertCard({
  icon: Icon,
  title,
  items,
  tone,
}: {
  icon: LucideIcon
  title: string
  items: string[]
  tone: 'warning' | 'danger'
}) {
  const tones = {
    warning: { border: 'border-amber-200', bg: 'bg-amber-50', icon: 'text-amber-500', title: 'text-amber-800' },
    danger: { border: 'border-red-200', bg: 'bg-red-50', icon: 'text-red-500', title: 'text-red-800' },
  }
  const c = tones[tone]

  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-4`}>
      <div className="mb-2.5 flex items-center gap-2">
        <Icon className={`h-5 w-5 ${c.icon}`} strokeWidth={2.2} />
        <h3 className={`text-sm font-bold ${c.title}`}>{title}</h3>
        <span className={`ml-auto rounded-full border ${c.border} bg-white px-2 py-0.5 text-xs font-bold ${c.title}`}>
          {items.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-white bg-white/80 px-2.5 py-0.5 text-xs font-medium text-slate-600 shadow-sm"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

function QuickAccessCard({
  href,
  icon: Icon,
  label,
  highlight,
}: {
  href: string
  icon: LucideIcon
  label: string
  highlight?: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-2.5 rounded-2xl border p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] ${
        highlight
          ? 'border-[#F6B21A] bg-[#F6B21A]/10 hover:bg-[#F6B21A]/20'
          : 'border-[#75AADB]/20 bg-white hover:border-[#75AADB]'
      }`}
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
          highlight ? 'bg-[#F6B21A] text-[#003B73]' : 'bg-[#EEF5FF] text-[#003B73]'
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </div>
      <span className="text-xs font-bold leading-tight text-[#003B73]">{label}</span>
    </Link>
  )
}
