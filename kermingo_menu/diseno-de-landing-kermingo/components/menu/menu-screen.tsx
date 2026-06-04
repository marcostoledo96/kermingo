'use client'

import { useMemo, useState } from 'react'
import { Sparkles, UtensilsCrossed } from 'lucide-react'
import { PRODUCTS, type MealCategory } from '@/lib/products'
import { MenuHeader } from './menu-header'
import { MealTabs, SecondaryFilters, type SecondaryFilter } from './menu-filters'
import { ProductCard } from './product-card'
import { FloatingCartBar } from './floating-cart'

export function MenuScreen() {
  const [meal, setMeal] = useState<MealCategory>('merienda')
  const [filter, setFilter] = useState<SecondaryFilter>('todos')

  const products = useMemo(() => {
    return PRODUCTS.filter((p) => {
      // Filtro de momento (un producto puede estar en ambos)
      if (!p.meals.includes(meal)) return false

      switch (filter) {
        case 'comidas':
          return p.type === 'comida' && p.stock !== 'agotado'
        case 'bebidas':
          return p.type === 'bebida' && p.stock !== 'agotado'
        case 'promos':
          return p.type === 'promo' && p.stock !== 'agotado'
        case 'agotados':
          return p.stock === 'agotado'
        default:
          return true
      }
    }).sort((a, b) => {
      // Agotados siempre al final cuando se ven "Todos"
      if (a.stock === 'agotado' && b.stock !== 'agotado') return 1
      if (b.stock === 'agotado' && a.stock !== 'agotado') return -1
      return 0
    })
  }, [meal, filter])

  return (
    <div className="min-h-screen bg-[#EEF5FF] pb-28">
      <MenuHeader backHref="/" backLabel="Volver al inicio" />

      <main className="mx-auto max-w-md px-4">
        {/* Bloque superior */}
        <section className="pt-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#003B73]/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#003B73]">
            <Sparkles className="h-3.5 w-3.5 text-[#F6B21A]" />
            Evento scout recaudatorio
          </span>
          <h1 className="mt-3 flex items-center gap-2 text-3xl font-extrabold tracking-tight text-[#003B73] text-balance">
            <UtensilsCrossed className="h-7 w-7 text-[#F6B21A]" strokeWidth={2.2} />
            Menú Kermingo
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-[#6B7280] text-pretty">
            Elegí tus comidas y bebidas para retirar en el mostrador.
          </p>
        </section>

        {/* Tabs principales */}
        <div className="sticky top-[73px] z-30 -mx-4 bg-[#EEF5FF]/95 px-4 pb-3 pt-4 backdrop-blur-sm">
          <MealTabs value={meal} onChange={setMeal} />
          <div className="mt-3">
            <SecondaryFilters value={filter} onChange={setFilter} />
          </div>
        </div>

        {/* Grilla de productos (lista cómoda en una columna) */}
        {products.length > 0 ? (
          <div className="space-y-3 pt-1">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-[#75AADB]/40 bg-white/50 px-6 py-12 text-center">
            <UtensilsCrossed className="h-9 w-9 text-[#75AADB]" />
            <p className="font-bold text-[#003B73]">No hay productos en este filtro</p>
            <p className="text-sm text-[#6B7280]">
              Probá con otra categoría o cambiá de momento.
            </p>
          </div>
        )}
      </main>

      <FloatingCartBar />
    </div>
  )
}
