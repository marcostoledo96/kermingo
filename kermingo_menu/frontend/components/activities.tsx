import { Tent, Sparkles, Shirt } from 'lucide-react'

export function Activities() {
  return (
    <section className="mt-12 px-4 sm:mt-14">
      <div className="mx-auto max-w-xl">
        <h2 className="font-display text-xl font-extrabold text-[#003B73]">
          Toda la tarde, en familia
        </h2>

        {/* Kermesse: bloque acompañante */}
        <div className="mt-4 flex items-center gap-4 rounded-3xl bg-white p-5 ring-1 ring-[#75AADB]/20">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-[#F6B21A]">
            <Tent className="h-7 w-7 text-[#003B73]" strokeWidth={2.2} />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold leading-tight text-[#003B73]">
              Kermesse
            </h3>
            <p className="mt-0.5 text-sm leading-relaxed text-[#3A5675] text-pretty">
              Juegos y puestos para todas las edades durante toda la jornada.
            </p>
          </div>
        </div>

        {/* Menciones secundarias compactas */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2.5 rounded-2xl bg-[#75AADB]/12 px-3.5 py-3">
            <Sparkles className="h-5 w-5 flex-shrink-0 text-[#003B73]" strokeWidth={2.2} />
            <span className="text-sm font-semibold leading-tight text-[#003B73]">
              Tradeo de figuritas
            </span>
          </div>
          <div className="flex items-center gap-2.5 rounded-2xl bg-[#75AADB]/12 px-3.5 py-3">
            <Shirt className="h-5 w-5 flex-shrink-0 text-[#003B73]" strokeWidth={2.2} />
            <span className="text-sm font-semibold leading-tight text-[#003B73]">
              Concurso de disfraces
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
