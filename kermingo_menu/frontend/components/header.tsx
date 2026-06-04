'use client'

import Link from 'next/link'
import { Tent } from 'lucide-react'
import { ArgentinaStripe } from './argentina-stripe'

export function Header() {
  return (
    <header className="sticky top-0 z-50">
      <div className="bg-[#003B73]/95 backdrop-blur-md shadow-lg shadow-[#003B73]/10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-[#F6B21A] flex items-center justify-center shadow-md shadow-[#F6B21A]/30">
                <Tent className="w-5 h-5 text-[#003B73]" strokeWidth={2.5} />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#75AADB] border-2 border-[#003B73]" />
            </div>
            <div className="leading-none">
              <span className="block font-extrabold text-xl text-white tracking-tight">
                Kermingo
              </span>
              <span className="block text-[10px] uppercase tracking-[0.15em] text-[#75AADB] font-semibold mt-0.5">
                Scout San Patricio
              </span>
            </div>
          </div>

          <Link
            href="/menu"
            className="rounded-full bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 text-xs font-bold text-white uppercase tracking-wide"
          >
            Ver menú
          </Link>
        </div>
      </div>
      <ArgentinaStripe />
    </header>
  )
}
