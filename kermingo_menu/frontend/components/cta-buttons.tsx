import { UtensilsCrossed, Search, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function CTAButtons() {
  return (
    <div id="menu" className="px-4 -mt-8 relative z-30 space-y-3 max-w-md mx-auto">
      {/* Botón principal - Ver menú */}
      <Link
        href="/menu"
        className="group block w-full bg-[#F6B21A] hover:bg-[#ffbe2e] active:scale-[0.98] transition-all rounded-3xl shadow-xl shadow-[#F6B21A]/40 p-1.5"
      >
        <div className="flex items-center gap-4 rounded-[1.3rem] p-3.5">
          <div className="w-14 h-14 rounded-2xl bg-[#003B73] flex items-center justify-center flex-shrink-0 group-hover:rotate-[-6deg] transition-transform">
            <UtensilsCrossed className="w-7 h-7 text-white" strokeWidth={2.2} />
          </div>
          <div className="text-left flex-1">
            <span className="block text-[#003B73] font-extrabold text-xl leading-tight">Ver menú</span>
            <span className="block text-[#003B73]/70 text-sm font-medium">Comidas y bebidas del evento</span>
          </div>
          <ArrowRight className="w-5 h-5 text-[#003B73] group-hover:translate-x-1 transition-transform" />
        </div>
      </Link>

      {/* Botón secundario - Seguir mi pedido */}
      <Link
        href="/seguimiento"
        className="group w-full bg-white hover:bg-[#EEF5FF] active:scale-[0.98] transition-all rounded-2xl border border-[#75AADB]/40 p-4 flex items-center justify-center gap-2.5 shadow-sm"
      >
        <Search className="w-5 h-5 text-[#003B73] group-hover:scale-110 transition-transform" />
        <span className="text-[#003B73] font-bold">Seguir mi pedido</span>
      </Link>
    </div>
  )
}
