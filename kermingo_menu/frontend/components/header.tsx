'use client'

import Link from 'next/link'
import { ArgentinaStripe } from './argentina-stripe'
import { KermingoLogo } from './kermingo-logo'

export function Header() {
  return (
    <header className="sticky top-0 z-50">
      <div className="bg-[#003B73]/95 backdrop-blur-md shadow-lg shadow-[#003B73]/10">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <KermingoLogo className="h-10 w-10" />
            <div className="leading-none">
              <span className="block font-display text-xl font-extrabold text-white">
                Kermingo
              </span>
              <span className="mt-0.5 block text-[11px] font-medium text-[#75AADB]">
                Grupo Scout San Patricio
              </span>
            </div>
          </div>

          <Link
            href="/menu"
            className="rounded-full bg-[#F6B21A] px-4 py-2 text-xs font-bold text-[#003B73] transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#003B73]"
          >
            Ver menú
          </Link>
        </div>
      </div>
      <ArgentinaStripe />
    </header>
  )
}
