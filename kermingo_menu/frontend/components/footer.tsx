import { MapPin } from 'lucide-react'
import { KermingoLogo } from './kermingo-logo'
import { Banderines } from './banderines'
import { CrestRow } from './crest-row'
import { EVENTO } from '@/lib/evento'

export function Footer() {
  return (
    <footer className="relative mt-12 overflow-hidden bg-[#003B73]">
      {/* Banderines decorativos arriba */}
      <Banderines className="opacity-90" />

      <div className="relative mx-auto max-w-xl px-6 pb-10 pt-8">
        {/* Marca */}
        <div className="flex flex-col items-center text-center">
          <KermingoLogo className="mb-3 h-16 w-16" />
          <h2 className="font-display text-3xl font-black text-white">{EVENTO.nombre}</h2>
          <p className="mt-1 text-sm font-medium text-[#75AADB]">
            {EVENTO.fecha} · {EVENTO.horario}
          </p>
        </div>

        {/* Escudos institucionales */}
        <div className="mt-8">
          <CrestRow
            crests={[
              {
                src: '/branding/escudo-san-patricio.png',
                label: EVENTO.organizador,
              },
              {
                src: '/branding/escudo-tropa-raider.png',
                label: `Tropa Raider "${EVENTO.raider.tropa}"`,
              },
              {
                src: '/branding/escudo-comunidad-raider.png',
                label: `Comunidad Raider "${EVENTO.raider.comunidad}"`,
              },
            ]}
          />
        </div>

        {/* Ubicación */}
        <div className="mt-8 flex items-center justify-center gap-2.5 border-t border-white/10 pt-6">
          <MapPin className="h-4 w-4 flex-shrink-0 text-[#F6B21A]" strokeWidth={2.4} />
          <p className="text-sm text-white/85">{EVENTO.direccion}</p>
        </div>

        {/* Cierre */}
        <p className="mt-6 text-center text-xs text-white/55 text-pretty">
          {EVENTO.descripcion}
        </p>
      </div>
    </footer>
  )
}
