'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Clock,
  ChefHat,
  CheckCircle2,
  CreditCard,
  AlertTriangle,
  XCircle,
  Zap,
  UtensilsCrossed,
  Package,
  FileText,
  BarChart3,
  Settings,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { formatPrice } from '@/lib/products'
import { EVENTO } from '@/lib/evento'
import { AdminShell } from './admin-shell'
import { EstadoBadge, type BadgeTone, type EstadoVisual } from './admin-ui'
import { useAdminSession } from './admin-session'

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

/* ---------------------------------------------------------------------------
 * Operational status mapping — uses EstadoBadge from admin-ui (Prompt 1)
 * instead of raw Badge with generic tones.
 * ------------------------------------------------------------------------- */
const ORDER_ESTADO: Record<OrderStatus, { label: string; estado: EstadoVisual }> = {
  pendiente: { label: 'Pendiente', estado: 'pendiente' },
  preparando: { label: 'Preparando', estado: 'preparando' },
  listo: { label: 'Listo', estado: 'listo' },
  entregado: { label: 'Entregado', estado: 'entregado' },
}

const PAYMENT_ESTADO: Record<PaymentStatus, { label: string; estado: EstadoVisual }> = {
  pendiente: { label: 'Pago pend.', estado: 'pagoPendiente' },
  verificando: { label: 'Verificando', estado: 'preparando' },
  confirmado: { label: 'Pagado', estado: 'listo' },
}

/* ---------------------------------------------------------------------------
 * Section heading — sentence case, no all-caps mono, calm hierarchy.
 * ------------------------------------------------------------------------- */
function DashSection({
  children,
  action,
}: {
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3">
      <h2 className="text-[13px] font-semibold tracking-tight text-[var(--km-tinta-suave)]">
        {children}
      </h2>
      {action}
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * DashboardScreen — operational event control board
 *
 * Hierarchy:
 *   1. "Ahora en el evento": pendientes, pagos pendientes, listos
 *   2. Acciones de jornada: Caja rápida, Cocina, Pedidos, Productos
 *   3. Alertas de stock
 *   4. Recaudación (secondary)
 *   5. Últimos pedidos
 * ------------------------------------------------------------------------- */
export function DashboardScreen() {
  const [storeStatus] = useState<'open' | 'closed' | 'demo'>('demo')
  const { user } = useAdminSession()

  const storeBadge: Record<typeof storeStatus, { label: string; tone: BadgeTone }> = {
    open: { label: 'Tienda abierta', tone: 'listo' },
    closed: { label: 'Tienda cerrada', tone: 'danger' },
    demo: { label: 'Modo demo', tone: 'demo' },
  }

  const metrics = {
    pendientes: 3,
    preparando: 5,
    listos: 2,
    entregados: 28,
    pagosPendientes: 4,
    recaudacion: 187500,
  }

  const alerts = {
    stockBajo: ['Pizza jamón', 'Nuggets veggies', 'Lima limón', 'Medialunas J&Q', 'Churros', 'Combo cena'],
    agotados: ['Pizza sin TACC', 'Helados palito'],
  }

  return (
    <AdminShell section="Panel general" status={storeBadge[storeStatus]}>

      {/* ---- Greeting + live indicator + event context ---- */}
      <div className="mb-5 flex items-center justify-between gap-3 sm:mb-6">
        <h1 className="font-display text-[20px] font-bold tracking-tight text-[var(--km-azul)] sm:text-[24px]">
          Buenos días{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.
        </h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-[var(--km-linea)] bg-white px-2.5 py-1">
              <span
                className={`h-[6px] w-[6px] rounded-full ${
                  storeStatus === 'open'
                    ? 'bg-[var(--km-listo-text)] shadow-[0_0_6px_rgba(0,91,102,0.4)]'
                    : storeStatus === 'demo'
                      ? 'bg-[var(--km-demo-text)] shadow-[0_0_6px_rgba(91,33,182,0.4)]'
                      : 'bg-[var(--km-peligro-text)] shadow-[0_0_6px_rgba(140,29,45,0.4)]'
                }`}
              />
              <span className="text-[11px] font-medium text-[var(--km-tinta-suave)]">
                {storeStatus === 'open' ? 'En vivo' : storeStatus === 'demo' ? 'Demo' : 'Cerrada'}
              </span>
            </div>
          </div>
        </div>

        {/* Event context bar — compact, informative */}
        <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--km-tinta-suave)] sm:mb-6">
          <span className="font-medium">{EVENTO.fecha}</span>
          <span className="text-[var(--km-linea)]">·</span>
          <span>{EVENTO.horario}</span>
          <span className="text-[var(--km-linea)]">·</span>
          <span>{EVENTO.direccion}</span>
        </div>

        {/* ============================================================
         *  1. AHORA EN EL EVENTO — operational strip, not metric cards
         * ============================================================ */}
        <section className="mb-5 sm:mb-6">
          <DashSection>Ahora en el evento</DashSection>
          <div className="km-panel overflow-hidden">
            {/* Desktop: horizontal strip */}
            <div className="hidden sm:block">
              <div className="flex divide-x divide-[var(--km-linea)]">
                <AhoraItem
                  icon={Clock}
                  label="Pendientes"
                  value={metrics.pendientes}
                  estado="pendiente"
                  href="/admin/pedidos"
                />
                <AhoraItem
                  icon={CreditCard}
                  label="Pagos por revisar"
                  value={metrics.pagosPendientes}
                  estado="pagoPendiente"
                  href="/admin/pedidos"
                />
                <AhoraItem
                  icon={CheckCircle2}
                  label="Listos para entregar"
                  value={metrics.listos}
                  estado="listo"
                  href="/admin/cocina"
                />
                <AhoraItem
                  icon={ChefHat}
                  label="Preparando"
                  value={metrics.preparando}
                  estado="preparando"
                  href="/admin/cocina"
                />
              </div>
            </div>
            {/* Mobile: 2x2 grid */}
            <div className="grid grid-cols-2 divide-y divide-[var(--km-linea)] sm:hidden">
              <div className="border-b border-[var(--km-linea)]">
                <AhoraItem
                  icon={Clock}
                  label="Pendientes"
                  value={metrics.pendientes}
                  estado="pendiente"
                  href="/admin/pedidos"
                />
              </div>
              <div className="border-b border-[var(--km-linea)]">
                <AhoraItem
                  icon={CreditCard}
                  label="Pagos por revisar"
                  value={metrics.pagosPendientes}
                  estado="pagoPendiente"
                  href="/admin/pedidos"
                />
              </div>
              <div className="col-span-1">
                <AhoraItem
                  icon={CheckCircle2}
                  label="Listos"
                  value={metrics.listos}
                  estado="listo"
                  href="/admin/cocina"
                />
              </div>
              <div className="col-span-1">
                <AhoraItem
                  icon={ChefHat}
                  label="Preparando"
                  value={metrics.preparando}
                  estado="preparando"
                  href="/admin/cocina"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
         *  2. ACCIONES DE JORNADA — operational buttons, not SaaS cards
         * ============================================================ */}
        <section className="mb-5 sm:mb-6">
          <DashSection>Acciones de jornada</DashSection>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            <AccionBtn href="/admin/caja" icon={Zap} label="Caja rápida" highlight />
            <AccionBtn href="/admin/cocina" icon={ChefHat} label="Cocina" />
            <AccionBtn href="/admin/pedidos" icon={Package} label="Pedidos" />
            <AccionBtn href="/admin/productos" icon={UtensilsCrossed} label="Productos" />
          </div>
          {/* Disabled / Próximamente row */}
          <div className="mt-2.5 grid grid-cols-3 gap-2.5 sm:mt-3 sm:gap-3">
            <AccionBtnDisabled icon={FileText} label="Comprobantes" />
            <AccionBtnDisabled icon={BarChart3} label="Reportes" />
            <AccionBtnDisabled icon={Settings} label="Configuración" />
          </div>
        </section>

        {/* ============================================================
         *  3. ALERTAS DE STOCK
         * ============================================================ */}
        {(alerts.stockBajo.length > 0 || alerts.agotados.length > 0) && (
          <section className="mb-5 sm:mb-6">
            <DashSection>Alertas de stock</DashSection>
            <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
              {alerts.stockBajo.length > 0 && (
                <StockAlertBlock icon={AlertTriangle} title="Stock bajo" items={alerts.stockBajo} estado="stockBajo" />
              )}
              {alerts.agotados.length > 0 && (
                <StockAlertBlock icon={XCircle} title="Agotados" items={alerts.agotados} estado="agotado" />
              )}
            </div>
          </section>
        )}

        {/* ============================================================
         *  4 & 5. RECAUDACIÓN + ÚLTIMOS PEDIDOS (side by side on desktop)
         * ============================================================ */}
        <div className="grid gap-5 sm:grid-cols-[1fr_2fr] sm:gap-6">
          {/* Recaudación — secondary financial data */}
          <section>
            <DashSection>Recaudación</DashSection>
            <div className="km-panel px-4 py-4 sm:py-5">
              <div className="mb-1 text-[12px] font-medium text-[var(--km-tinta-suave)]">
                Total del evento
              </div>
              <p className="font-display text-[26px] font-bold leading-none tracking-tight text-[var(--km-azul)] km-tabular sm:text-[30px]">
                {formatPrice(metrics.recaudacion)}
              </p>
              <div className="mt-2.5 text-[11px] text-[var(--km-tinta-suave)]/70">
                {metrics.entregados} entregados
              </div>
            </div>
          </section>

          {/* Últimos pedidos */}
          <section>
            <DashSection
              action={
                <Link
                  href="/admin/pedidos"
                  className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-[var(--km-tinta-suave)] transition-colors hover:text-[var(--km-azul)]"
                >
                  Ver todos
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                </Link>
              }
            >
              Últimos pedidos
            </DashSection>

            <div className="km-panel overflow-hidden">
              {/* Desktop table */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--km-linea)] text-left text-[11px] font-semibold text-[var(--km-tinta-suave)]/60">
                      <th className="whitespace-nowrap px-3 py-2.5">Código</th>
                      <th className="whitespace-nowrap px-3 py-2.5">Cliente</th>
                      <th className="whitespace-nowrap px-3 py-2.5">Estado</th>
                      <th className="whitespace-nowrap px-3 py-2.5">Pago</th>
                      <th className="whitespace-nowrap px-3 py-2.5 text-right">Total</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {DEMO_ORDERS.map((order) => (
                      <tr
                        key={order.id}
                        className="group border-b border-[var(--km-fondo)] last:border-0 transition-colors hover:bg-[var(--km-fondo)]"
                      >
                        <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[12px] font-semibold text-[var(--km-azul)] km-tabular">
                          {order.code}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-[12px] font-medium text-[var(--km-tinta-suave)]">
                          {order.customer}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          <EstadoBadge estado={ORDER_ESTADO[order.orderStatus].estado}>
                            {ORDER_ESTADO[order.orderStatus].label}
                          </EstadoBadge>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          <EstadoBadge estado={PAYMENT_ESTADO[order.paymentStatus].estado}>
                            {PAYMENT_ESTADO[order.paymentStatus].label}
                          </EstadoBadge>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-[12px] font-semibold text-[var(--km-tinta)] km-tabular">
                          {formatPrice(order.total)}
                        </td>
                        <td className="px-3 py-2.5">
                          <Link
                            href={`/admin/pedidos?focus=${order.code}`}
                            aria-label={`Ver pedido ${order.code}`}
                            className="inline-flex rounded-md p-1 text-[var(--km-linea)] transition-colors hover:bg-[var(--km-fondo)] hover:text-[var(--km-azul)]"
                          >
                            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile list */}
              <div className="divide-y divide-[var(--km-fondo)] sm:hidden">
                {DEMO_ORDERS.map((order) => (
                  <Link
                    key={order.id}
                    href={`/admin/pedidos?focus=${order.code}`}
                    className="flex items-center gap-2.5 px-3 py-3 transition-colors active:bg-[var(--km-fondo)]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="font-mono text-[12px] font-semibold text-[var(--km-azul)] km-tabular">
                          {order.code}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--km-tinta-suave)]/50 km-tabular">
                          {order.time}
                        </span>
                      </div>
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="truncate text-[12px] font-medium text-[var(--km-tinta-suave)]">
                          {order.customer}
                        </span>
                        <span className="flex-shrink-0 font-mono text-[12px] font-semibold text-[var(--km-azul)] km-tabular">
                          {formatPrice(order.total)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <EstadoBadge estado={ORDER_ESTADO[order.orderStatus].estado}>
                          {ORDER_ESTADO[order.orderStatus].label}
                        </EstadoBadge>
                        <EstadoBadge estado={PAYMENT_ESTADO[order.paymentStatus].estado}>
                          {PAYMENT_ESTADO[order.paymentStatus].label}
                        </EstadoBadge>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-[var(--km-linea)]" strokeWidth={2.5} />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>
      </AdminShell>
  )
}

/* ===========================================================================
 *  AhoraItem — single metric in the "Ahora en el evento" strip.
 *  Uses EstadoBadge colors, km-tabular, links to relevant section.
 *  No shadows, no generic card pattern.
 * ======================================================================== */
function AhoraItem({
  icon: Icon,
  label,
  value,
  estado,
  href,
}: {
  icon: LucideIcon
  label: string
  value: number
  estado: EstadoVisual
  href: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--km-fondo)] sm:flex-1 sm:flex-col sm:items-start sm:gap-2 sm:px-5 sm:py-4"
    >
      <div className="flex items-center gap-2.5 sm:gap-0">
        <Icon
          className={`h-4 w-4 text-[var(--km-tinta-suave)] sm:mb-1.5 sm:h-[18px] sm:w-[18px]`}
          strokeWidth={2}
        />
        <span className={`text-[12px] font-medium text-[var(--km-tinta-suave)] sm:text-[11px] sm:font-normal`}>
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2 sm:gap-0">
        <span className="font-display text-[24px] font-bold leading-none tracking-tight text-[var(--km-azul)] km-tabular sm:text-[32px]">
          {value}
        </span>
        <span className="sm:hidden">
          <EstadoBadge estado={estado} dot>
            {label}
          </EstadoBadge>
        </span>
      </div>
    </Link>
  )
}

/* ===========================================================================
 *  AccionBtn — operational action button (jornada).
 *  Dorado only for highlight (Caja rápida). Others are azul/celeste.
 *  Not a card — it's a large touch-friendly button.
 * ======================================================================== */
function AccionBtn({
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
      className={`group flex items-center gap-3 rounded-lg border px-3.5 py-3 transition-colors sm:flex-col sm:gap-2 sm:px-4 sm:py-5 ${
        highlight
          ? 'border-[var(--km-dorado)]/30 bg-[var(--km-dorado)]/[0.06] hover:border-[var(--km-dorado)]/50 hover:bg-[var(--km-dorado)]/10'
          : 'border-[var(--km-linea)] bg-white hover:border-[var(--km-celeste)]/40 hover:bg-[var(--km-fondo)]'
      }`}
    >
      <span
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg sm:h-11 sm:w-11 ${
          highlight
            ? 'bg-[var(--km-dorado)] text-[var(--km-azul)]'
            : 'bg-[var(--km-fondo)] text-[var(--km-azul)] group-hover:bg-[var(--km-celeste)]/20'
        }`}
      >
        <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 sm:text-center">
        <span className={`text-[13px] font-semibold sm:text-[14px] ${highlight ? 'text-[var(--km-azul)]' : 'text-[var(--km-azul)]'}`}>
          {label}
        </span>
      </div>
    </Link>
  )
}

/* ===========================================================================
 *  AccionBtnDisabled — disabled route with "Próximamente" label.
 *  Visually muted, no link, not interactive.
 * ======================================================================== */
function AccionBtnDisabled({
  icon: Icon,
  label,
}: {
  icon: LucideIcon
  label: string
}) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-lg border border-[var(--km-linea)]/50 bg-white/60 px-3.5 py-2.5 opacity-50 sm:flex-col sm:gap-1.5 sm:px-4 sm:py-4"
      aria-disabled="true"
    >
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-[var(--km-entregado-bg)] text-[var(--km-entregado-text)] sm:h-8 sm:w-8">
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
      <div className="min-w-0 sm:text-center">
        <span className="block text-[11px] font-medium text-[var(--km-entregado-text)] sm:text-[12px]">{label}</span>
        <span className="block text-[10px] font-normal text-[var(--km-tinta-suave)]/50 sm:text-[11px]">Próximamente</span>
      </div>
    </div>
  )
}

/* ===========================================================================
 *  StockAlertBlock — alert panel using Kermingo tokens.
 *  Replaces the old amber/rose Tailwind defaults with km-alerta/km-peligro.
 * ======================================================================== */
function StockAlertBlock({
  icon: Icon,
  title,
  items,
  estado,
}: {
  icon: LucideIcon
  title: string
  items: string[]
  estado: 'stockBajo' | 'agotado'
}) {
  const isAgotado = estado === 'agotado'

  return (
    <div
      className={`rounded-lg border px-3.5 py-3 ${
        isAgotado
          ? 'border-[var(--km-peligro-bg)] bg-[var(--km-peligro-bg)]/40'
          : 'border-[var(--km-alerta-bg)] bg-[var(--km-alerta-bg)]/40'
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <Icon
          className={`h-3.5 w-3.5 ${isAgotado ? 'text-[var(--km-peligro-text)]' : 'text-[var(--km-alerta-text)]'}`}
          strokeWidth={2.2}
        />
        <span className={`text-[12px] font-semibold ${isAgotado ? 'text-[var(--km-peligro-text)]' : 'text-[var(--km-alerta-text)]'}`}>
          {title}
        </span>
        <span
          className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold km-tabular ${
            isAgotado
              ? 'bg-[var(--km-peligro-bg)] text-[var(--km-peligro-text)]'
              : 'bg-[var(--km-alerta-bg)] text-[var(--km-alerta-text)]'
          }`}
        >
          {items.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${
              isAgotado
                ? 'border-[var(--km-peligro-bg)] bg-white text-[var(--km-peligro-text)]'
                : 'border-[var(--km-alerta-bg)] bg-white text-[var(--km-alerta-text)]'
            }`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}