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
    <div
      role="tablist"
      aria-label="Momento del evento"
      className="flex gap-1.5 rounded-full bg-white p-1.5 shadow-sm ring-1 ring-[#75AADB]/25"
    >
      {(['merienda', 'cena'] as MealCategory[]).map((meal) => {
        const active = value === meal
        const Icon = meal === 'merienda' ? Sun : Moon
        return (
          <button
            key={meal}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(meal)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-extrabold capitalize transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003B73] focus-visible:ring-offset-1 ${
              active
                ? 'bg-[#003B73] text-white shadow-md'
                : 'text-[#3A5675] hover:bg-[#EEF5FF]'
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
    <div
      role="group"
      aria-label="Filtrar productos"
      className="flex flex-wrap gap-2"
    >
      {SECONDARY.map((f) => {
        const active = value === f.id
        return (
          <button
            key={f.id}
            aria-pressed={active}
            onClick={() => onChange(f.id)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003B73] focus-visible:ring-offset-1 ${
              active
                ? 'bg-[#003B73] text-white shadow-sm'
                : 'bg-white text-[#3A5675] ring-1 ring-[#75AADB]/30 hover:bg-[#EEF5FF]'
            }`}
          >
            {f.label}
          </button>
        )
      })}
    </div>
  )
}
