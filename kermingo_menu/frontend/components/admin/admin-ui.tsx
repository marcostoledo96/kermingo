import { EVENTO } from '@/lib/evento'
import type { LucideIcon } from 'lucide-react'

/* ---------------------------------------------------------------------------
 * Primitivas de UI compartidas del panel admin de Kermingo.
 * Estilo "operativo real" (lineal, denso, sin cards infladas):
 * - Tipografía Bricolage para display, Inter para cuerpo, Mono para códigos.
 * - Bordes sutiles, sin sombras pesadas.
 * - Acento: azul #003B73 y dorado #F6B21A. Paleta sobria.
 *
 * Tokens de estado (doc 28 §3.2):
 *   info → celeste/azul     (recibido, pendiente)
 *   preparando → dorado    (en preparación)
 *   listo → cian/teal       (listo para entregar, pagado)
 *   alerta → naranja       (stock bajo)
 *   peligro → rojo Kermingo (cancelado, agotado, rechazado)
 *   entregado → gris azulado (entregado, cerrado)
 *   demo → violeta suave   (modo demo)
 * ------------------------------------------------------------------------- */

export type BadgeTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'gold'
  | 'preparando'
  | 'listo'
  | 'entregado'
  | 'alerta'
  | 'demo'

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-[var(--km-fondo)] text-[var(--km-tinta-suave)] border-[var(--km-linea)]',
  info: 'bg-[var(--km-info-bg)] text-[var(--km-info-text)] border-[#75AADB]/35',
  success: 'bg-[var(--km-listo-bg)] text-[var(--km-listo-text)] border-[var(--km-listo-bg)]',
  warning: 'bg-[var(--km-preparando-bg)] text-[var(--km-preparando-text)] border-[var(--km-preparando-bg)]',
  danger: 'bg-[var(--km-peligro-bg)] text-[var(--km-peligro-text)] border-[var(--km-peligro-bg)]',
  gold: 'bg-[var(--km-dorado)]/12 text-[#7A5500] border-[var(--km-dorado)]/35',
  preparando: 'bg-[var(--km-preparando-bg)] text-[var(--km-preparando-text)] border-[var(--km-preparando-bg)]',
  listo: 'bg-[var(--km-listo-bg)] text-[var(--km-listo-text)] border-[var(--km-listo-bg)]',
  entregado: 'bg-[var(--km-entregado-bg)] text-[var(--km-entregado-text)] border-[var(--km-entregado-bg)]',
  alerta: 'bg-[var(--km-alerta-bg)] text-[var(--km-alerta-text)] border-[var(--km-alerta-bg)]',
  demo: 'bg-[var(--km-demo-bg)] text-[var(--km-demo-text)] border-[var(--km-demo-bg)]',
}

/**
 * EstadoBadge — badge de estado operativo para admin.
 *
 * Mapea estados de dominio (pedido, pago, stock) a tokens visuales
 * propios de Kermingo en vez de Tailwind defaults.
 * El prop `estado` define el estilo visual; `children` es el texto.
 */
export type EstadoVisual =
  | 'informacion'
  | 'pendiente'
  | 'preparando'
  | 'listo'
  | 'entregado'
  | 'pagoPendiente'
  | 'agotado'
  | 'cancelado'
  | 'demo'
  | 'stockBajo'
  | 'activo'

const ESTADO_TONE_MAP: Record<EstadoVisual, BadgeTone> = {
  informacion: 'info',
  pendiente: 'warning',
  preparando: 'preparando',
  listo: 'listo',
  entregado: 'entregado',
  pagoPendiente: 'warning',
  agotado: 'danger',
  cancelado: 'danger',
  demo: 'demo',
  stockBajo: 'alerta',
  activo: 'listo',
}

export function EstadoBadge({
  estado,
  children,
  className = '',
  dot = false,
}: {
  estado: EstadoVisual
  children: React.ReactNode
  className?: string
  dot?: boolean
}) {
  const tone = ESTADO_TONE_MAP[estado]
  return (
    <Badge tone={tone} dot={dot} className={className}>
      {children}
    </Badge>
  )
}

export function Badge({
  tone = 'neutral',
  children,
  className = '',
  uppercase = false,
  dot = false,
}: {
  tone?: BadgeTone
  children: React.ReactNode
  className?: string
  uppercase?: boolean
  dot?: boolean
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${BADGE_TONES[tone]} ${uppercase ? 'uppercase tracking-wide' : ''} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 border-b border-[#75AADB]/12 pb-2">
      <h2 className="font-mono text-[11px] font-semibold tracking-wide text-[#003B73]/60">
        {children}
      </h2>
      {action}
    </div>
  )
}

export function AdminCard({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-xl border border-[#75AADB]/15 bg-white ${className}`}
    >
      {children}
    </div>
  )
}

export function IconBox({
  icon: Icon,
  tone = 'blue',
  className = '',
}: {
  icon: LucideIcon
  tone?: 'blue' | 'gold' | 'slate' | 'emerald' | 'amber' | 'sky' | 'red'
  className?: string
}) {
  const tones: Record<string, string> = {
    blue: 'bg-[var(--km-azul)] text-[var(--km-dorado)]',
    gold: 'bg-[var(--km-dorado)] text-[var(--km-azul)]',
    slate: 'bg-[var(--km-entregado-bg)] text-[var(--km-entregado-text)]',
    emerald: 'bg-[var(--km-listo-bg)] text-[var(--km-listo-text)]',
    amber: 'bg-[var(--km-preparando-bg)] text-[var(--km-preparando-text)]',
    sky: 'bg-[var(--km-info-bg)] text-[var(--km-info-text)]',
    red: 'bg-[var(--km-peligro-bg)] text-[var(--km-peligro-text)]',
  }
  return (
    <div
      className={`flex items-center justify-center rounded ${tones[tone]} ${className}`}
    >
      <Icon className="h-4 w-4" strokeWidth={2.2} />
    </div>
  )
}

export function AdminFooter() {
  return (
    <footer className="mt-2 border-t border-[#75AADB]/15 py-4 text-center">
      <p className="font-mono text-[11px] tracking-wide text-[#75AADB]/60">
        {EVENTO.nombre} Admin · {EVENTO.fechaCorta}
      </p>
    </footer>
  )
}
