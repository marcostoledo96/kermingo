import { Calendar, MapPin, Clock } from 'lucide-react'

export function EventInfo() {
  const items = [
    { icon: Calendar, label: 'Cuándo', value: 'Sábado 20 de junio', sub: '2026 · Día de la Bandera' },
    { icon: Clock, label: 'Horario', value: 'Desde las 18:00', sub: 'Hasta el cierre del bingo' },
    { icon: MapPin, label: 'Dónde', value: 'Echeverría 3920', sub: 'Sede del Grupo Scout' },
  ]

  return (
    <section className="px-4 mt-8 max-w-md mx-auto">
      <div className="bg-white rounded-3xl shadow-md shadow-[#003B73]/5 border border-[#75AADB]/15 overflow-hidden">
        {items.map((item, i) => (
          <div
            key={item.label}
            className={`flex items-center gap-4 p-4 ${i !== items.length - 1 ? 'border-b border-[#EEF5FF]' : ''}`}
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#75AADB]/25 to-[#75AADB]/10 flex items-center justify-center flex-shrink-0">
              <item.icon className="w-6 h-6 text-[#003B73]" strokeWidth={2.2} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[#75AADB] font-bold">{item.label}</p>
              <p className="font-bold text-[#003B73] text-lg leading-tight">{item.value}</p>
              <p className="text-[#6B7280] text-sm">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
