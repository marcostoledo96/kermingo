import { Dices, Tent, Trophy, Sparkles } from 'lucide-react'

export function Activities() {
  const activities = [
    {
      icon: Dices,
      label: 'Bingo',
      desc: 'Cartones con grandes premios',
      iconBg: 'bg-[#003B73]',
      iconColor: 'text-white',
      cardBg: 'bg-white',
    },
    {
      icon: Tent,
      label: 'Kermesse',
      desc: 'Juegos y puestos para toda la familia',
      iconBg: 'bg-[#F6B21A]',
      iconColor: 'text-[#003B73]',
      cardBg: 'bg-white',
    },
    {
      icon: Sparkles,
      label: 'Tradeo de figuritas',
      desc: 'Completá tu álbum del Mundial',
      iconBg: 'bg-[#75AADB]',
      iconColor: 'text-white',
      cardBg: 'bg-white',
    },
    {
      icon: Trophy,
      label: 'Concurso de disfraces',
      desc: 'Temática Argentina y Mundial',
      iconBg: 'bg-[#003B73]',
      iconColor: 'text-white',
      cardBg: 'bg-white',
    },
  ]

  return (
    <section className="px-4 mt-10 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-px flex-1 bg-[#75AADB]/30" />
        <h2 className="text-[#003B73] text-sm font-extrabold uppercase tracking-[0.14em] whitespace-nowrap">
          También vas a encontrar
        </h2>
        <div className="h-px flex-1 bg-[#75AADB]/30" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {activities.map((activity) => (
          <div
            key={activity.label}
            className={`${activity.cardBg} rounded-3xl p-4 border border-[#75AADB]/15 shadow-sm shadow-[#003B73]/5 hover:shadow-md hover:-translate-y-0.5 transition-all`}
          >
            <div className={`w-12 h-12 rounded-2xl ${activity.iconBg} flex items-center justify-center mb-3 shadow-sm`}>
              <activity.icon className={`w-6 h-6 ${activity.iconColor}`} strokeWidth={2.2} />
            </div>
            <h3 className="font-extrabold text-[#003B73] text-[15px] leading-tight text-balance">
              {activity.label}
            </h3>
            <p className="text-[#6B7280] text-xs mt-1 leading-relaxed">
              {activity.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
