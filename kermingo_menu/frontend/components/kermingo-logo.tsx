'use client'

import { useState } from 'react'
import Image from 'next/image'
import { SolDeMayo } from './sol-de-mayo'

export function KermingoLogo({
  className = 'w-12 h-12',
  priority = false,
}: {
  className?: string
  priority?: boolean
}) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    // Fallback de marca: el Sol de Mayo sobre disco celeste
    return (
      <div
        className={`${className} relative flex items-center justify-center rounded-full bg-[#75AADB]/20`}
        aria-hidden="true"
      >
        <SolDeMayo className="h-[78%] w-[78%]" />
      </div>
    )
  }

  return (
    <Image
      src="/branding/kermingo-logo.png"
      alt="Logo de Kermingo: pelota con Sol de Mayo"
      width={256}
      height={256}
      priority={priority}
      onError={() => setFailed(true)}
      className={`${className} object-contain`}
    />
  )
}
