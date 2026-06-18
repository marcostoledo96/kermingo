import { UtensilsCrossed, Search, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function CTAButtons() {
  return (
    <div id="menu" className="px-4 -mt-7 relative z-30 space-y-3 max-w-xl mx-auto">
      {/* Botón principal - Ver menú */}
      <Link
        href="/menu"
        className="group block w-full rounded-3xl bg-[#F6B21A] p-1.5 shadow-xl shadow-[#F6B21A]/40 transition-all duration-150 hover:bg-[#ffbe2e] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003B73] focus-visible:ring-offset-2 focus-visible:ring-offset-[#EEF5FF]"
      >
        <div className="flex items-center gap-4 rounded-[1.3rem] p-3.5">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-[#003B73] transition-transform duration-150 group-hover:rotate-[-6deg]">
            <UtensilsCrossed className="h-7 w-7 text-white" strokeWidth={2.2} />
          </div>
          <div className="flex-1 text-left">
            <span className="block font-display text-xl font-extrabold leading-tight text-[#003B73]">
              Ver menú
            </span>
            <span className="block text-sm font-medium text-[#003B73]/75">
              Comidas y bebidas del evento
            </span>
          </div>
          <ArrowRight className="h-5 w-5 text-[#003B73] transition-transform duration-150 group-hover:translate-x-1" />
        </div>
      </Link>

      {/* Botón secundario - Seguir mi pedido */}
      <Link
        href="/seguimiento"
        className="group flex w-full items-center justify-center gap-2.5 rounded-2xl border border-[#003B73]/15 bg-white p-3.5 shadow-sm transition-all duration-150 hover:border-[#003B73]/30 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003B73] focus-visible:ring-offset-2 focus-visible:ring-offset-[#EEF5FF]"
      >
        <Search className="h-5 w-5 text-[#003B73]" />
        <span className="font-bold text-[#003B73]">Seguir mi pedido</span>
      </Link>
    </div>
  )
}
