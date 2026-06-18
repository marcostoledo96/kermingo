'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  Banknote,
  BarChart3,
  Clock3,
  CreditCard,
  FileDown,
  Landmark,
  Loader2,
  Package,
  RefreshCcw,
  type LucideIcon,
  Trophy,
  TriangleAlert,
  CircleDollarSign,
  ArrowDownWideNarrow,
} from 'lucide-react'
import { formatPrice } from '@/lib/products'
import { useApiResource } from '@/lib/use-api-resource'
import { obtenerReportesAdmin } from '@/lib/admin'
import type { AdminReportes, AdminReporteProducto } from '@/lib/admin'
import { AdminShell } from './admin-shell'
import { Badge, SectionTitle, AdminCard, IconBox } from './admin-ui'

const FALLBACK_REPORTES: AdminReportes = {
  totalRecaudado: 0,
  totalEfectivo: 0,
  totalTransferencia: 0,
  pedidosPagados: 0,
  productosVendidos: 0,
  pedidosPendientesPago: 0,
  montoPendientePago: 0,
  productoTop: null,
  rankingProductos: [],
  actualizadoEn: new Date().toISOString(),
}

type RankingSort = 'cantidad' | 'recaudacion'

function toCsvCell(value: string | number | null | undefined): string {
  const safe = value === null || value === undefined ? '' : String(value)
  const escaped = safe.replace(/"/g, '""').replace(/\r?\n/g, ' ')
  return `"${escaped}"`
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>): void {
  if (typeof window === 'undefined') return

  const content = rows.map((row) => row.map((cell) => toCsvCell(cell)).join(',')).join('\n')
  const blob = new Blob([`\ufeff${content}`], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function formatUpdateDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin registrar'
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function downloadResumenCsv(reportes: AdminReportes): void {
  const rows = [
    ['Indicador', 'Valor'],
    ['Recaudación total', reportes.totalRecaudado],
    ['Total efectivo', reportes.totalEfectivo],
    ['Total transferencia', reportes.totalTransferencia],
    ['Pedidos pagados', reportes.pedidosPagados],
    ['Productos vendidos', reportes.productosVendidos],
    ['Pedidos pendientes de pago', reportes.pedidosPendientesPago],
    ['Monto pendiente de pago', reportes.montoPendientePago],
    ['Actualizado en', formatUpdateDate(reportes.actualizadoEn)],
  ]

  if (reportes.productoTop) {
    rows.push([
      'Producto más vendido',
      `${reportes.productoTop.nombre} (${reportes.productoTop.cantidad} uds. · ${formatPrice(reportes.productoTop.totalRecaudado)})`,
    ])
  }

  downloadCsv('reporte-resumen-kermingo.csv', rows)
}

function downloadRankingCsv(items: AdminReporteProducto[]): void {
  const rows = [
    ['Posición', 'Producto ID', 'Nombre', 'Cantidad vendida', 'Recaudación'],
    ...items.map((item, index) => [index + 1, item.productoId, item.nombre, item.cantidad, item.totalRecaudado]),
  ]
  downloadCsv('reporte-ranking-productos.csv', rows)
}

function sortRankingProductos(items: AdminReporteProducto[], sortBy: RankingSort): AdminReporteProducto[] {
  return [...items].sort((a, b) => {
    if (sortBy === 'recaudacion') {
      return b.totalRecaudado - a.totalRecaudado || b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre)
    }
    return b.cantidad - a.cantidad || b.totalRecaudado - a.totalRecaudado || a.nombre.localeCompare(b.nombre)
  })
}

type MetricConfig = {
  label: string
  value: string
  icon: LucideIcon
  tone: 'blue' | 'gold' | 'celeste' | 'emerald' | 'amber' | 'red'
}

function buildMetricCards(reportes: AdminReportes): MetricConfig[] {
  return [
    {
      label: 'Recaudación total',
      value: formatPrice(reportes.totalRecaudado),
      icon: CircleDollarSign,
      tone: 'gold',
    },
    {
      label: 'Total efectivo',
      value: formatPrice(reportes.totalEfectivo),
      icon: Banknote,
      tone: 'blue',
    },
    {
      label: 'Total transferencia',
      value: formatPrice(reportes.totalTransferencia),
      icon: Landmark,
      tone: 'emerald',
    },
    {
      label: 'Pedidos pagados',
      value: String(reportes.pedidosPagados),
      icon: CreditCard,
      tone: 'celeste',
    },
    {
      label: 'Productos vendidos',
      value: String(reportes.productosVendidos),
      icon: Package,
      tone: 'gold',
    },
    {
      label: 'Pedidos pendientes',
      value: String(reportes.pedidosPendientesPago),
      icon: Clock3,
      tone: 'amber',
    },
  ]
}

export function ReportesScreen() {
  const [rankingSort, setRankingSort] = useState<RankingSort>('cantidad')
  const {
    data,
    loading,
    error,
    refetch,
    refreshing,
  } = useApiResource<AdminReportes>(obtenerReportesAdmin)

  const reportes = data ?? FALLBACK_REPORTES
  const metrics = buildMetricCards(reportes)
  const rankingProductosOrdenados = useMemo(
    () => sortRankingProductos(reportes.rankingProductos, rankingSort),
    [reportes.rankingProductos, rankingSort]
  )

  if (loading) {
    return (
      <AdminShell section="Reportes" subtitle="Resumen de ventas y pagos">
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-[#75AADB]/20 bg-white p-8 text-[#003B73]">
          <div className="flex items-center gap-2 text-sm font-medium text-[#3A5675]">
            <Loader2 className="h-5 w-5 animate-spin text-[#003B73]" />
            Cargando reportes...
          </div>
        </div>
      </AdminShell>
    )
  }

  if (error) {
    return (
      <AdminShell section="Reportes" subtitle="Resumen de ventas y pagos">
        <div className="rounded-2xl border border-red-300 bg-[#FBE9E7] p-6 text-[#A63329]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <p className="font-semibold">No se pudieron cargar los reportes: {error}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 rounded-lg border border-[#A63329]/40 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#A63329]"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Reintentar
            </button>
          </div>
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell section="Reportes" subtitle="Resumen de ventas y pagos" lastUpdate={formatUpdateDate(reportes.actualizadoEn)} actions={
      <>
        <button
          type="button"
          onClick={() => refetch({ silent: true })}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-[#75AADB]/35 bg-white px-3 py-2 text-xs font-bold text-[#003B73] transition hover:bg-[#EEF5FF] disabled:opacity-50"
          disabled={refreshing}
          title="Actualizar"
        >
          {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
          <span className="ml-2 hidden sm:inline">Actualizar</span>
        </button>
      </>
    }>
      <div className="space-y-4">
        {reportes.pedidosPendientesPago > 0 ? (
          <AdminCard className="border-[#F6B21A]/50 bg-[#F6B21A]/8">
            <div className="flex flex-col gap-3 p-4 text-[#8A5A00] sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-sm font-bold">
                    Hay {reportes.pedidosPendientesPago} pago(s) pendiente(s) de confirmación
                  </p>
                  <p className="text-xs opacity-75">
                    Monto pendiente: <span className="font-bold">{formatPrice(reportes.montoPendientePago)}</span>
                  </p>
                </div>
              </div>
              <Link
                href="/admin/pedidos"
                className="rounded-lg bg-[#8A5A00] px-3 py-2 text-xs font-bold uppercase tracking-wide text-white"
              >
                Ir a Pedidos
              </Link>
            </div>
          </AdminCard>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => {
            const Icon = metric.icon
            return (
              <AdminCard key={metric.label} className="p-4">
                <div className="flex items-center gap-3">
                  <IconBox icon={Icon} tone={metric.tone} className="h-11 w-11" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-[#003B73]/40">{metric.label}</p>
                    <p className="truncate text-lg font-extrabold text-[#003B73]">{metric.value}</p>
                  </div>
                </div>
              </AdminCard>
            )
          })}
        </section>

        <section>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <SectionTitle>Producto estrella</SectionTitle>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => downloadResumenCsv(reportes)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#75AADB]/35 bg-white px-3 py-2 text-xs font-bold text-[#003B73]"
              >
                <FileDown className="h-3.5 w-3.5" />
                CSV resumen
              </button>
            </div>
          </div>
          <AdminCard className="overflow-hidden">
            <div className="flex min-h-[110px] items-center gap-4 p-5">
              <IconBox icon={reportes.productoTop ? Trophy : BarChart3} tone="gold" className="h-12 w-12" />
              <div className="min-w-0">
                {reportes.productoTop ? (
                  <>
                    <p className="text-lg font-extrabold text-[#003B73]">{reportes.productoTop.nombre}</p>
                    <p className="text-sm text-[#003B73]/70">
                      {reportes.productoTop.cantidad} unidades vendidas · {formatPrice(reportes.productoTop.totalRecaudado)} recaudados
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-extrabold text-[#003B73]">Sin producto top aún</p>
                    <p className="text-sm text-[#003B73]/70">Aún no hay ventas para mostrar.</p>
                  </>
                )}
              </div>
            </div>
          </AdminCard>
        </section>

        <section>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <SectionTitle>Productos vendidos y recaudación</SectionTitle>
              <p className="mt-1 text-xs font-medium text-[#003B73]/55">
                Cantidad vendida y fondos recaudados por cada producto.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-[#75AADB]/35 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setRankingSort('cantidad')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition ${rankingSort === 'cantidad' ? 'bg-[#003B73] text-white' : 'text-[#003B73] hover:bg-[#EEF5FF]'}`}
                >
                  <ArrowDownWideNarrow className="h-3.5 w-3.5" />
                  Más vendidos
                </button>
                <button
                  type="button"
                  onClick={() => setRankingSort('recaudacion')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition ${rankingSort === 'recaudacion' ? 'bg-[#003B73] text-white' : 'text-[#003B73] hover:bg-[#EEF5FF]'}`}
                >
                  <CircleDollarSign className="h-3.5 w-3.5" />
                  Más recaudaron
                </button>
              </div>
              <button
                type="button"
                onClick={() => downloadRankingCsv(rankingProductosOrdenados)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#75AADB]/35 bg-white px-3 py-2 text-xs font-bold text-[#003B73]"
              >
                <FileDown className="h-3.5 w-3.5" />
                CSV ranking
              </button>
            </div>
          </div>

          <AdminCard className="overflow-hidden">
            {rankingProductosOrdenados.length > 0 ? (
              <ul className="divide-y divide-[#75AADB]/20">
                {rankingProductosOrdenados.map((producto, index) => (
                  <li key={producto.productoId} className="grid grid-cols-[auto_1fr] items-center gap-3 px-4 py-3 sm:grid-cols-[auto_1fr_auto_auto]">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EEF5FF] text-xs font-extrabold text-[#003B73]">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#003B73]">{producto.nombre}</p>
                      <p className="text-xs text-[#5f758e]">ID #{producto.productoId}</p>
                    </div>
                    <Badge tone="neutral" className="justify-self-start sm:justify-self-end">
                      {producto.cantidad} uds.
                    </Badge>
                    <p className="justify-self-start text-sm font-extrabold text-[#003B73] sm:justify-self-end">
                      {formatPrice(producto.totalRecaudado)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-5 py-10 text-center text-sm text-[#003B73]/65">No hay ranking cargado todavía.</div>
            )}
          </AdminCard>
        </section>
      </div>
    </AdminShell>
  )
}
