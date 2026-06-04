import type { LucideIcon } from 'lucide-react'

/* ---------------------------------------------------------------------------
 * Primitivas de UI compartidas del panel admin de Kermingo.
 * Mantienen consistencia visual con las páginas públicas:
 * fondo #EEF5FF, azul #003B73, celeste #75AADB y dorado #F6B21A.
 * ------------------------------------------------------------------------- */

export type BadgeTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'gold'

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  info: 'bg-sky-100 text-sky-700 border-sky-200',
  success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  danger: 'bg-red-100 text-red-700 border-red-200',
  gold: 'bg-[#F6B21A]/15 text-[#9A6B00] border-[#F6B21A]/30',
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        BADGE_TONES[tone]
      } ${uppercase ? 'uppercase tracking-wide text-[10px]' : ''} ${className}`}
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
    blue: 'bg-[#003B73] text-[#F6B21A]',
    gold: 'bg-[#F6B21A] text-[#003B73]',
    slate: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    sky: 'bg-sky-50 text-sky-600',
    red: 'bg-red-50 text-red-600',
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
        Kermingo Admin · Grupo Scout San Patricio
      </p>
    </footer>
  )
}
