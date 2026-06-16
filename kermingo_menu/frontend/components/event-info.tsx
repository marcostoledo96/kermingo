import { Calendar, Clock, MapPin, Tent } from 'lucide-react'
import { EVENTO } from '@/lib/evento'

export function EventInfo() {
  const items = [
    {
      icon: Calendar,
      label: 'Cuándo',
      value: EVENTO.fecha,
      sub: EVENTO.efemeride,
    },
    {
      icon: Clock,
      label: 'Horario',
      value: EVENTO.horario,
      sub: `Entrada anticipada ${EVENTO.entradaAnticipada} · En puerta ${EVENTO.entradaEnPuerta}`,
    },
    {
      icon: MapPin,
      label: 'Dónde',
      value: EVENTO.direccion,
      sub: `Sede del ${EVENTO.organizador}`,
    },
  ]

  return (
    <section className="mt-12 px-4 sm:mt-14">
      <div className="mx-auto max-w-xl">
        <div className="divide-y divide-[#75AADB]/25 border-y border-[#75AADB]/25">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-4 py-4">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[#75AADB]/15">
                <item.icon className="h-5 w-5 text-[#003B73]" strokeWidth={2.2} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-[#3A5675]">{item.label}</p>
                <p className="font-display text-lg font-bold leading-tight text-[#003B73]">
                  {item.value}
                </p>
                <p className="text-sm text-[#3A5675]">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bloque institucional scout, sutil */}
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-[#003B73] px-4 py-3.5">
          <Tent className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#F6B21A]" strokeWidth={2.4} />
          <p className="text-sm leading-relaxed text-white/90 text-pretty">
            Organizado por la Tropa Raider{' '}
            <span className="font-semibold text-white">&quot;{EVENTO.raider.tropa}&quot;</span> y la
            Comunidad Raider{' '}
            <span className="font-semibold text-white">&quot;{EVENTO.raider.comunidad}&quot;</span>.
          </p>
        </div>
      </div>
    </section>
  )
}
