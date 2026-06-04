import { Gift } from 'lucide-react'

function BingoGrid() {
  const numbers = [7, 23, 45, 61, 12, 34, 56, 78, 3, 47, 19, 88]
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {numbers.map((num, i) => (
        <div
          key={i}
          className={`w-7 h-7 rounded-lg text-[11px] font-extrabold flex items-center justify-center ${
            i % 4 === 1
              ? 'bg-[#F6B21A] text-[#003B73] shadow-sm'
              : 'bg-white/15 text-white border border-white/20'
          }`}
        >
          {num}
        </div>
      ))}
    </div>
  )
}

export function BingoTeaser() {
  return (
    <section className="px-4 mt-6 max-w-md mx-auto">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#003B73] to-[#075196] shadow-lg shadow-[#003B73]/20">
        {/* franja superior tipo bandera */}
        <div className="h-1.5 w-full flex">
          <div className="flex-1 bg-[#75AADB]" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-[#75AADB]" />
        </div>

        <div className="p-5 flex items-center gap-5">
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 bg-[#F6B21A] text-[#003B73] text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full mb-3">
              <Gift className="w-3 h-3" />
              Premios
            </div>
            <h3 className="text-white font-extrabold text-xl leading-tight mb-1.5">
              Gran Bingo Kermingo
            </h3>
            <p className="text-white/70 text-sm leading-relaxed">
              Cartones con premios increíbles. ¡No te pierdas la chance de cantar línea y bingo!
            </p>
          </div>
          <div className="flex-shrink-0">
            <BingoGrid />
          </div>
        </div>
      </div>
    </section>
  )
}
