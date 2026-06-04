import { Tent, Heart, MapPin, Send } from 'lucide-react'
import { SolDeMayo } from './hero'
import { Banderines } from './banderines'

export function Footer() {
  return (
    <footer className="mt-12 relative overflow-hidden bg-[#003B73]">
      {/* Banderines decorativos arriba */}
      <Banderines className="opacity-90" />

      {/* destello sol */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-[#75AADB]/15 blur-3xl" aria-hidden="true" />

      <div className="relative px-6 pt-8 pb-10 max-w-md mx-auto">
        {/* Marca */}
        <div className="flex flex-col items-center text-center">
          <SolDeMayo className="w-12 h-12 mb-3" />
          <h2 className="text-white font-black text-3xl tracking-tight">Kermingo</h2>
          <p className="text-[#75AADB] text-sm font-medium mt-1">
            Día de la Bandera · 20 de junio de 2026
          </p>
        </div>

        {/* Organizadores */}
        <div className="mt-7 rounded-2xl bg-white/5 border border-white/10 p-4">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#75AADB] font-bold mb-2 flex items-center gap-1.5">
            <Tent className="w-3.5 h-3.5" />
            Organizan
          </p>
          <div className="space-y-1 text-white/85 text-sm">
            <p className="font-semibold text-white">Grupo Scout San Patricio</p>
            <p>Tropa Raider &quot;Compañía de Jesús&quot;</p>
            <p>Comunidad Raider &quot;Fortaleza de María&quot;</p>
          </div>
        </div>

        {/* Ubicación */}
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="w-9 h-9 rounded-xl bg-[#F6B21A] flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4.5 h-4.5 text-[#003B73]" strokeWidth={2.4} />
          </div>
          <p className="text-white/85 text-sm">
            Echeverría 3920 · Sede del Grupo Scout
          </p>
        </div>

        {/* Links */}
        <nav className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-medium text-white/70">
          <a href="#" className="hover:text-[#F6B21A] transition-colors">Cronograma</a>
          <a href="#" className="hover:text-[#F6B21A] transition-colors">Reglamento del Bingo</a>
          <a href="#" className="hover:text-[#F6B21A] transition-colors">Contacto</a>
        </nav>

        {/* Social */}
        <div className="mt-5 flex justify-center">
          <a
            href="#"
            aria-label="Seguinos"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#F6B21A] hover:text-[#003B73] text-white transition-colors flex items-center justify-center"
          >
            <Send className="w-5 h-5" />
          </a>
        </div>

        {/* Cierre */}
        <p className="mt-7 text-white/50 text-xs flex items-center justify-center gap-1.5 text-center">
          Hecho con <Heart className="w-3.5 h-3.5 text-[#F6B21A] fill-current" /> para el campamento de verano
        </p>
      </div>
    </footer>
  )
}
