'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Shield } from 'lucide-react'

type Crest = {
  src: string
  label: string
}

export function CrestRow({ crests }: { crests: Crest[] }) {
  return (
    <div className="flex items-start justify-center gap-5">
      {crests.map((crest) => (
        <CrestItem key={crest.src} {...crest} />
      ))}
    </div>
  )
}

function CrestItem({ src, label }: Crest) {
  const [failed, setFailed] = useState(false)

  return (
    <div className="flex w-20 flex-col items-center gap-2 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
        {failed ? (
          <Shield className="h-6 w-6 text-[#75AADB]" strokeWidth={2} />
        ) : (
          <Image
            src={src || '/placeholder.svg'}
            alt={label}
            width={56}
            height={56}
            onError={() => setFailed(true)}
            className="h-12 w-12 object-contain"
          />
        )}
      </div>
      <span className="text-[11px] font-medium leading-tight text-white/70 text-pretty">
        {label}
      </span>
    </div>
  )
}
