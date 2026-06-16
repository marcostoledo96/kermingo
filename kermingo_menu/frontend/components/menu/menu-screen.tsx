'use client'

import { useMemo, useState } from 'react'
import { AlertCircle, RefreshCw, Store } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { API_BASE } from '@/lib/config'
import { useApiResource } from '@/lib/use-api-resource'
import { mapProducto } from '@/lib/mappers'
import type { ApiProducto } from '@/lib/types'
import type { MealCategory, Product, StockStatus } from '@/lib/products'
import type { SecondaryFilter } from '@/components/menu/menu-filters'
import { MealTabs, SecondaryFilters } from '@/components/menu/menu-filters'
import { ProductCard } from '@/components/menu/product-card'
import { FloatingCartBar } from '@/components/menu/floating-cart'
import { MenuHeader } from '@/components/menu/menu-header'

type LoadState = 'loading' | 'ready' | 'error'

function sortBySoldOut(a: Product, b: Product): number {
  const aOut = a.stock === 'agotado'
  const bOut = b.stock === 'agotado'
  if (aOut && !bOut) return 1
  if (bOut && !aOut) return -1
  return 0
}

function matchesFilter(
  p: Product,
  meal: MealCategory,
  filter: SecondaryFilter,
): boolean {
  if (!p.meals.includes(meal)) return false
  const notSoldOut = p.stock !== 'agotado'
  switch (filter) {
    case 'comidas':
      return p.type === 'comida' && notSoldOut
    case 'bebidas':
      return p.type === 'bebida' && notSoldOut
    case 'promos':
      return p.type === 'promo' && notSoldOut
    case 'agotados':
      return p.stock === 'agotado'
    default:
      return true
  }
}

function stockSummary(products: Product[]): Record<StockStatus, number> {
  const acc: Record<StockStatus, number> = {
    disponible: 0,
    bajo: 0,
    agotado: 0,
    ilimitado: 0,
  }
  for (const p of products) acc[p.stock] += 1
  return acc
}

export function MenuScreen() {
  const [meal, setMeal] = useState<MealCategory>('merienda')
  const [filter, setFilter] = useState<SecondaryFilter>('todos')

  const {
    data: products,
    loading,
    error,
    refetch,
  } = useApiResource<Product[]>(async () => {
    const data = await apiGet<ApiProducto[]>('/api/productos')
    return data.map(mapProducto)
  })

  const state: LoadState = loading ? 'loading' : error ? 'error' : 'ready'

  const visible = useMemo(() => {
    if (!products) return []
    return products
      .filter((p) => matchesFilter(p, meal, filter))
      .sort(sortBySoldOut)
  }, [products, meal, filter])

  const summary = useMemo(() => stockSummary(products ?? []), [products])

  return (
    <div className="min-h-screen bg-[#EEF5FF] pb-28">
      <MenuHeader backHref="/" backLabel="Volver al inicio" />

      <main className="mx-auto max-w-xl px-4">
        {/* Bloque superior */}
        <section className="pt-6">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#003B73] text-balance">
            Elegí tu pedido
          </h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm leading-relaxed text-[#3A5675] text-pretty">
            <Store className="h-4 w-4 flex-shrink-0 text-[#75AADB]" strokeWidth={2.2} />
            Pedís acá y retirás en el mostrador de Kermingo.
          </p>
          {state === 'ready' && (
            <p className="mt-1 text-[11px] font-medium text-[#3A5675]/80">
              {products?.length ?? 0} productos · {summary.disponible} disponibles ·{' '}
              {summary.bajo} con stock bajo · {summary.agotado} agotados
            </p>
          )}
        </section>

        {/* Tabs + filtros sticky con fondo opaco para tapar contenido al scrollear */}
        {state === 'ready' && (
          <div className="sticky top-[71px] z-30 -mx-4 border-b border-[#75AADB]/20 bg-[#EEF5FF] px-4 pb-3 pt-4 shadow-[0_4px_8px_-4px_rgba(0,59,115,0.08)]">
            <MealTabs value={meal} onChange={setMeal} />
            <div className="mt-3">
              <SecondaryFilters value={filter} onChange={setFilter} />
            </div>
          </div>
        )}

        {/* Estado: loading */}
        {state === 'loading' && (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-3xl bg-white/70 shadow-sm"
              />
            ))}
          </div>
        )}

        {/* Estado: error */}
        {state === 'error' && (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl border border-rose-200 bg-rose-50 px-6 py-8 text-center">
            <AlertCircle className="h-9 w-9 text-rose-500" strokeWidth={2} />
            <div>
              <p className="font-bold text-rose-700">No pudimos cargar el menú</p>
              <p className="mt-1 text-sm text-rose-600/80">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-1 inline-flex items-center gap-1.5 rounded-2xl bg-rose-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-rose-700"
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </button>
            <p className="text-xs text-rose-600/60">
              ¿Está el backend corriendo en {API_BASE}?
            </p>
          </div>
        )}

        {/* Estado: ready con productos visibles */}
        {state === 'ready' && visible.length > 0 && (
          <div className="space-y-3 pt-4">
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {/* Estado: ready pero sin resultados */}
        {state === 'ready' && visible.length === 0 && (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-[#75AADB]/40 bg-white/60 px-6 py-12 text-center">
            <Store className="h-9 w-9 text-[#75AADB]" strokeWidth={1.8} />
            <div>
              <p className="font-display text-lg font-bold text-[#003B73]">
                Todavía no hay nada acá
              </p>
              <p className="mt-1 text-sm text-[#3A5675]">
                En {meal} no encontramos productos con ese filtro.
              </p>
            </div>
            {filter !== 'todos' && (
              <button
                type="button"
                onClick={() => setFilter('todos')}
                className="rounded-full bg-[#003B73] px-5 py-2.5 text-sm font-bold text-white transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003B73] focus-visible:ring-offset-2"
              >
                Ver todo el menú
              </button>
            )}
          </div>
        )}
      </main>

      <FloatingCartBar />
    </div>
  )
}
