'use client'

import { BarChart3, Construction, TrendingUp, FileSpreadsheet, Clock } from 'lucide-react'
import { AdminShell } from './admin-shell'
import { AdminCard, IconBox } from './admin-ui'

export function ReportesScreen() {
  return (
    <AdminShell section="Reportes" subtitle="Estadísticas del evento">
      <div className="space-y-5">
        {/* Hero placeholder card */}
        <AdminCard className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--km-fondo)]">
            <Construction className="h-8 w-8 text-[var(--km-celeste)]" strokeWidth={1.6} />
          </div>
          <h2 className="text-lg font-extrabold text-[var(--km-azul)]">Reportes en desarrollo</h2>
          <p className="max-w-md text-sm text-[var(--km-tinta-suave)]">
            Los reportes con datos reales de recaudación, productos vendidos y tiempos de entrega
            estarán disponibles próximamente. Durante el evento, usá el Panel general y la pantalla
            de Pedidos para seguir la actividad en vivo.
          </p>
          <div className="mt-2 flex items-center gap-2 rounded-lg border px-4 py-2" style={{ borderColor: 'var(--km-preparando-bg)', background: 'var(--km-preparando-bg)' }}>
            <BarChart3 className="h-4 w-4 text-[var(--km-preparando-text)]" strokeWidth={2} />
            <span className="text-xs font-medium text-[var(--km-preparando-text)]">
              Pendiente de integración con endpoints de reportes
            </span>
          </div>
        </AdminCard>

        {/* Preview cards (placeholder, no real data) */}
        <div className="grid gap-3 sm:grid-cols-3">
          <AdminCard className="p-4">
            <div className="flex items-center gap-3">
              <IconBox icon={TrendingUp} tone="gold" className="h-11 w-11" />
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-[#003B73]/40">Recaudación</p>
                <p className="truncate text-xl font-extrabold text-[#003B73]">—</p>
              </div>
            </div>
          </AdminCard>

          <AdminCard className="p-4">
            <div className="flex items-center gap-3">
              <IconBox icon={FileSpreadsheet} tone="celeste" className="h-11 w-11" />
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-[#003B73]/40">Pedidos</p>
                <p className="truncate text-xl font-extrabold text-[#003B73]">—</p>
              </div>
            </div>
          </AdminCard>

          <AdminCard className="p-4">
            <div className="flex items-center gap-3">
              <IconBox icon={Clock} tone="blue" className="h-11 w-11" />
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-[#003B73]/40">Producto estrella</p>
                <p className="truncate text-xl font-extrabold text-[#003B73]">—</p>
              </div>
            </div>
          </AdminCard>
        </div>
      </div>
    </AdminShell>
  )
}