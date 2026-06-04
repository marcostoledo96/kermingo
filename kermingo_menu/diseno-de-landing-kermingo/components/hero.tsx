import Image from 'next/image'
import { Banderines } from './banderines'

export function SolDeMayo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {[...Array(16)].map((_, i) => {
        const angle = (i * 22.5) * Math.PI / 180
        const isLong = i % 2 === 0
        const length = isLong ? 46 : 36
        const x1 = 50 + Math.cos(angle) * 21
        const y1 = 50 + Math.sin(angle) * 21
        const x2 = 50 + Math.cos(angle) * length
        const y2 = 50 + Math.sin(angle) * length
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#F6B21A"
            strokeWidth={isLong ? "3" : "2"}
            strokeLinecap="round"
          />
        )
      })}
      <circle cx="50" cy="50" r="19" fill="#F6B21A" />
      <circle cx="50" cy="50" r="19" fill="none" stroke="#003B73" strokeWidth="1.5" strokeOpacity="0.3" />
      <ellipse cx="44" cy="47" rx="2.5" ry="3.2" fill="#003B73" />
      <ellipse cx="56" cy="47" rx="2.5" ry="3.2" fill="#003B73" />
      <path d="M 42 54 Q 50 62 58 54" fill="none" stroke="#003B73" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function Hero() {
  return (
    <section className="relative w-full">
      <div className="relative w-full min-h-[440px] overflow-hidden">
        {/* Imagen de fondo */}
        <Image
          src="/images/kermingo-hero.png"
          alt="Kermesse scout al atardecer con luces y banderines"
          fill
          priority
          className="object-cover"
        />
        {/* Overlay para legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#003B73]/55 via-[#003B73]/45 to-[#003B73]/90" />

        {/* Banderines colgando arriba */}
        <Banderines className="absolute top-0 left-0 right-0 z-10" />

        {/* Contenido */}
        <div className="relative z-20 flex flex-col items-center justify-center text-center px-6 pt-16 pb-14 min-h-[440px]">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#F6B21A] text-[#003B73] text-xs font-bold px-4 py-2 rounded-full mb-6 shadow-lg shadow-black/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#003B73] animate-pulse" />
            20 de Junio · Día de la Bandera
          </div>

          {/* Sol + título */}
          <SolDeMayo className="w-16 h-16 mb-4 drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]" />

          <h1 className="text-6xl font-black text-white tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.4)] text-balance">
            Kermingo
          </h1>

          <p className="mt-4 text-white/90 text-base font-medium max-w-xs text-pretty leading-relaxed">
            La gran kermesse scout para juntar fondos del campamento de verano.
          </p>

          {/* Mini chips de actividades */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {['Bingo', 'Kermesse', 'Mundial'].map((t) => (
              <span
                key={t}
                className="rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-3 py-1 text-xs font-semibold text-white"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
