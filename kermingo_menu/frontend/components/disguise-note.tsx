import { Megaphone } from 'lucide-react'

export function DisguiseNote() {
  return (
    <section className="px-4 mt-6 max-w-md mx-auto">
      <div className="relative overflow-hidden rounded-3xl bg-[#003B73] p-5 shadow-lg shadow-[#003B73]/20">
        {/* destello decorativo */}
        <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-[#F6B21A]/20 blur-2xl" aria-hidden="true" />
        <div className="relative flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-[#F6B21A] flex items-center justify-center flex-shrink-0 shadow-md">
            <Megaphone className="w-5 h-5 text-[#003B73]" strokeWidth={2.4} />
          </div>
          <div>
            <p className="text-[#F6B21A] text-[11px] font-bold uppercase tracking-[0.12em] mb-1">
              ¡Atención!
            </p>
            <p className="text-white text-sm leading-relaxed text-pretty">
              El concurso de disfraces tiene temática{' '}
              <strong className="text-[#F6B21A]">Argentina y Mundial</strong>. Vení caracterizado y participá por el gran premio.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
