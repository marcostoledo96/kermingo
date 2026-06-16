import { EVENTO } from '@/lib/evento'
import type { LucideIcon } from 'lucide-react'

/* ---------------------------------------------------------------------------
 * Primitivas de UI compartidas del panel admin de Kermingo.
 * Paleta sobria, conectada con las páginas públicas:
 * fondo #EEF5FF, azul #003B73, celeste #75AADB, dorado #F6B21A.
 * Los acentos verde/rojo se usan con criterio (solo para pago/estado), en
 * versiones apagadas, nunca el verde/rojo puro de Tailwind por defecto.
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
  neutral: 'bg-[#EEF5FF] text-[#3A5675] border-[#75AADB]/35',
  info: 'bg-[#75AADB]/15 text-[#0F4C81] border-[#75AADB]/40',
  success: 'bg-[#E6F2EA] text-[#1F6B43] border-[#1F6B43]/25',
  warning: 'bg-[#FBF0D6] text-[#8A5A00] border-[#F6B21A]/40',
  danger: 'bg-[#FBE9E7] text-[#A63329] border-[#A63329]/25',
  gold: 'bg-[#F6B21A]/15 text-[#8A5A00] border-[#F6B21A]/40',
  preparando: 'bg-[#FBF0D6] text-[#8A5A00] border-[#F6B21A]/40',
  listo: 'bg-[#E6F2EA] text-[#1F6B43] border-[#1F6B43]/25',
  entregado: 'bg-[#EAF0F7] text-[#304C68] border-[#304C68]/25',
  alerta: 'bg-[#FFF1E6] text-[#8A4A00] border-[#8A4A00]/25',
  demo: 'bg-[#F3F0FF] text-[#5B21B6] border-[#5B21B6]/25',
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
  icon: Icon,
}: {
  tone?: BadgeTone
  children: React.ReactNode
  className?: string
  uppercase?: boolean
  dot?: boolean
  icon?: LucideIcon
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${BADGE_TONES[tone]} ${uppercase ? 'text-[10px] uppercase tracking-wide' : ''} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {Icon && <Icon className="h-3 w-3" strokeWidth={2.6} />}
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
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-xs font-bold uppercase tracking-widest text-[#003B73]/55">
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
      className={`rounded-2xl border border-[#75AADB]/20 bg-white shadow-sm shadow-[#003B73]/5 ${className}`}
    >
      {children}
    </div>
  )
}

export type IconBoxTone = 'blue' | 'gold' | 'celeste' | 'ghost' | 'slate' | 'emerald' | 'amber' | 'sky' | 'red'

export function IconBox({
  icon: Icon,
  tone = 'blue',
  className = '',
}: {
  icon: LucideIcon
  tone?: IconBoxTone
  className?: string
}) {
  const tones: Record<IconBoxTone, string> = {
    blue: 'bg-[#003B73] text-[#F6B21A]',
    gold: 'bg-[#F6B21A] text-[#003B73]',
    celeste: 'bg-[#75AADB]/18 text-[#0F4C81]',
    ghost: 'bg-[#EEF5FF] text-[#003B73]',
    slate: 'bg-[#EAF0F7] text-[#304C68]',
    emerald: 'bg-[#E6F2EA] text-[#1F6B43]',
    amber: 'bg-[#FBF0D6] text-[#8A5A00]',
    sky: 'bg-[#E8F3FF] text-[#003B73]',
    red: 'bg-[#FBE9E7] text-[#A63329]',
  }
  return (
    <div
      className={`flex items-center justify-center rounded-xl ${tones[tone]} ${className}`}
    >
      <Icon className="h-5 w-5" strokeWidth={2.2} />
    </div>
  )
}

export function AdminFooter() {
  return (
    <footer className="mt-2 border-t border-[#75AADB]/20 py-5 text-center">
      <p className="text-xs font-medium text-[#75AADB]">
        {EVENTO.nombre} Admin · {EVENTO.fechaCorta}
      </p>
    </footer>
  )
}
