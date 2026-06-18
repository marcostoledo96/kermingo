import { Gift } from 'lucide-react'

function BingoCard() {
  // Cartón de bingo de marca: B-I-N-G-O con casillas, el centro "libre" en dorado
  const cols = [
    [3, 19, 41],
    [12, 27, 58],
    [34, 'free', 61],
    [7, 45, 72],
    [23, 56, 88],
  ]
  return (
    <div className="rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15 backdrop-blur-sm">
      <div className="mb-1.5 grid grid-cols-5 gap-1">
        {['B', 'I', 'N', 'G', 'O'].map((l) => (
          <div
            key={l}
            className="flex h-5 items-center justify-center font-display text-xs font-extrabold text-[#F6B21A]"
          >
            {l}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1">
        {cols.flat().map((n, i) => (
          <div
            key={i}
            className={`flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-bold ${
              n === 'free'
                ? 'bg-[#F6B21A] text-[#003B73]'
                : 'bg-white/15 text-white'
            }`}
          >
            {n === 'free' ? '★' : n}
          </div>
        ))}
      </div>
    </div>
  )
}

export function BingoTeaser() {
  return (
    <section className="mt-12 px-4 sm:mt-14">
      <div className="mx-auto max-w-xl overflow-hidden rounded-3xl bg-[#003B73] shadow-lg shadow-[#003B73]/20">
        {/* franja patria superior */}
        <div className="flex h-1.5 w-full">
          <div className="flex-1 bg-[#75AADB]" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-[#75AADB]" />
        </div>

        <div className="flex flex-col items-center gap-5 p-6 sm:flex-row sm:items-center sm:gap-5">
          <div className="flex w-full flex-col items-center text-center sm:flex-1 sm:items-start sm:text-left">
            <span className="inline-flex items-center gap-1.5 self-center rounded-full bg-[#F6B21A] px-2.5 py-1 text-[11px] font-bold text-[#003B73] sm:self-start">
              <Gift className="h-3 w-3" strokeWidth={2.6} />
              La gran atracción
            </span>
            <h2 className="mt-3 font-display text-2xl font-black leading-[0.95] text-white text-balance sm:text-3xl">
              Gran Bingo Kermingo
            </h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/85 text-pretty">
              Cartones con grandes premios. Cantá línea y bingo con toda la familia.
            </p>
          </div>
          <div className="flex-shrink-0">
            <BingoCard />
          </div>
        </div>
      </div>
    </section>
  )
}
