import Image from 'next/image'
import { Banderines } from './banderines'
import { KermingoLogo } from './kermingo-logo'

export { SolDeMayo } from './sol-de-mayo'

export function Hero() {
  return (
    <section className="relative w-full overflow-hidden bg-[#003B73]">
      {/* Foto de fondo, tratada como textura de afiche */}
      <Image
        src="/images/kermingo-hero.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-25"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#003B73]/70 via-[#003B73]/80 to-[#003B73]" />

      {/* Banderines colgando arriba */}
      <Banderines className="absolute top-0 left-0 right-0 z-10" />

      <div className="relative z-20 mx-auto max-w-xl px-6 pt-14 pb-12 sm:pt-16 sm:pb-14">
        {/* Logo como pieza central del afiche */}
        <div className="flex justify-center">
          <KermingoLogo className="h-28 w-28 drop-shadow-[0_6px_20px_rgba(0,0,0,0.35)]" priority />
        </div>

        {/* Título */}
        <h1 className="mt-5 text-center font-display text-[3.25rem] font-black leading-[0.92] text-white text-balance sm:text-7xl">
          Kermingo
        </h1>

        {/* Fecha y horario, jerarquía meta */}
        <p className="mt-4 text-center text-sm font-bold uppercase tracking-[0.08em] text-[#F6B21A]">
          Sábado 20 de junio · 17 a 21 hs
        </p>

        {/* Subtexto corto */}
        <p className="mx-auto mt-3 max-w-xs text-center text-base font-medium leading-relaxed text-white/90 text-pretty">
          Bingo, kermesse y menú para colaborar con el campamento.
        </p>
      </div>
    </section>
  )
}
