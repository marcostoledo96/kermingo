'use client'

import { BarChart3, Construction } from 'lucide-react'
import { AdminShell } from './admin-shell'

export function ReportesScreen() {
  return (
    <AdminShell section="Reportes" subtitle="Estadísticas del evento">
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--km-fondo)] text-[var(--km-celeste)]">
          <Construction className="h-8 w-8" strokeWidth={1.6} />
        </div>
        <h2 className="text-lg font-extrabold text-[var(--km-azul)]">Reportes en desarrollo</h2>
        <p className="max-w-md text-sm text-[var(--km-tinta-suave)]">
          Los reportes con datos reales de recaudación, productos vendidos y tiempos de entrega
          estarán disponibles próximamente. Durante el evento, usá el Panel general y la pantalla
          de Pedidos para seguir la actividad en vivo.
        </p>
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--km-preparando-bg)] bg-[var(--km-preparando-bg)]/40 px-4 py-2">
          <BarChart3 className="h-4 w-4 text-[var(--km-preparando-text)]" strokeWidth={2} />
          <span className="text-xs font-medium text-[var(--km-preparando-text)]">
            Pendiente de integración con endpoints de reportes
          </span>
        </div>
      </div>
    </AdminShell>
  )
}