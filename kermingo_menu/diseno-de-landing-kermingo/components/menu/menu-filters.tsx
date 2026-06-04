'use client'

import { Sun, Moon } from 'lucide-react'
import type { MealCategory } from '@/lib/products'

export type SecondaryFilter = 'todos' | 'comidas' | 'bebidas' | 'promos' | 'agotados'

const SECONDARY: { id: SecondaryFilter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'comidas', label: 'Comidas' },
  { id: 'bebidas', label: 'Bebidas' },
  { id: 'promos', label: 'Promos' },
  { id: 'agotados', label: 'Agotados' },
]

export function MealTabs({
  value,
  onChange,
}: {
  value: MealCategory
  onChange: (v: MealCategory) => void
}) {
  return (
    <div className="flex gap-2 rounded-full bg-white p-1.5 shadow-sm ring-1 ring-[#75AADB]/20">
      {(['merienda', 'cena'] as MealCategory[]).map((meal) => {
        const active = value === meal
        const Icon = meal === 'merienda' ? Sun : Moon
        return (
          <button
            key={meal}
            onClick={() => onChange(meal)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-extrabold capitalize transition-all ${
              active
                ? 'bg-[#003B73] text-white shadow-md'
                : 'text-[#003B73]/60 hover:text-[#003B73]'
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={2.4} />
            {meal}
          </button>
        )
      })}
    </div>
  )
}

export function SecondaryFilters({
  value,
  onChange,
}: {
  value: SecondaryFilter
  onChange: (v: SecondaryFilter) => void
}) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {SECONDARY.map((f) => {
        const active = value === f.id
        return (
          <button
            key={f.id}
            onClick={() => onChange(f.id)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition-all ${
              active
                ? 'bg-[#F6B21A] text-[#003B73] shadow-sm'
                : 'bg-white text-[#003B73]/70 ring-1 ring-[#75AADB]/25 hover:bg-[#EEF5FF]'
            }`}
          >
            {f.label}
          </button>
        )
      })}
    </div>
  )
}
