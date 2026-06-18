'use client'

import { useMemo, useState } from 'react'
import { AlertCircle, RefreshCw, Store, Lock } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { API_BASE } from '@/lib/config'
import { useApiResource } from '@/lib/use-api-resource'
import { mapProducto } from '@/lib/mappers'
import type { ApiProducto, ApiConfiguracion } from '@/lib/types'
import type { MealCategory, Product } from '@/lib/products'
import type { SecondaryFilter } from '@/components/menu/menu-filters'
import { MealTabs, SecondaryFilters } from '@/components/menu/menu-filters'
import { ProductCard } from '@/components/menu/product-card'
import { FloatingCartBar } from '@/components/menu/floating-cart'
import { MenuHeader } from '@/components/menu/menu-header'

type LoadState = 'loading' | 'ready' | 'error'

function sortBySoldOut(a: Product, b: Product): number {
  const aUnavailable = a.stock === 'agotado' || a.stock === 'no_disponible'
  const bUnavailable = b.stock === 'agotado' || b.stock === 'no_disponible'
  if (aUnavailable && !bUnavailable) return 1
  if (bUnavailable && !aUnavailable) return -1
  return 0
}

function matchesFilter(
  p: Product,
  meal: MealCategory,
  filter: SecondaryFilter,
): boolean {
  if (!p.meals.includes(meal)) return false
  const isSoldOut = p.stock === 'agotado'
  const isNotAvailable = p.stock === 'no_disponible'
  switch (filter) {
    case 'comidas':
      return p.type === 'comida' && !isSoldOut
    case 'bebidas':
      return p.type === 'bebida' && !isSoldOut
    case 'promos':
      return p.type === 'promo' && !isSoldOut
    case 'agotados':
      return isSoldOut || isNotAvailable
    default:
      return true
  }
}

function MenuLoadingSkeleton() {
  return (
    <div className="mt-5 space-y-4" aria-hidden="true">
      <div className="rounded-[1.75rem] border border-[#75AADB]/25 bg-white/75 p-3 shadow-sm">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#EEF5FF] p-1">
          <div className="h-11 animate-pulse rounded-xl bg-[#003B73]/85" />
          <div className="h-11 animate-pulse rounded-xl bg-white ring-1 ring-[#75AADB]/25" />
        </div>
        <div className="mt-3 flex gap-2 overflow-hidden">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className={`h-9 flex-shrink-0 animate-pulse rounded-full ${
                item === 0 ? 'w-20 bg-[#F6B21A]/70' : 'w-24 bg-[#75AADB]/20'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="relative overflow-hidden rounded-3xl border border-[#75AADB]/25 bg-white p-3 shadow-sm"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#75AADB] via-white to-[#F6B21A] opacity-70" />
            <div className="flex gap-3.5">
              <div className="relative h-24 w-24 flex-shrink-0 animate-pulse rounded-2xl bg-[#EEF5FF] ring-1 ring-[#75AADB]/25">
                <div className="absolute left-2 top-2 h-4 w-12 rounded-full bg-white/90" />
                <div className="absolute inset-0 m-auto h-10 w-10 rounded-2xl bg-[#75AADB]/25" />
              </div>

              <div className="min-w-0 flex-1 py-1">
                <div className="h-4 w-3/4 animate-pulse rounded-full bg-[#003B73]/20" />
                <div className="mt-2 h-3 w-full animate-pulse rounded-full bg-[#75AADB]/20" />
                <div className="mt-1.5 h-3 w-2/3 animate-pulse rounded-full bg-[#75AADB]/15" />
                <div className="mt-3 h-5 w-24 animate-pulse rounded-full bg-[#F6B21A]/35" />

                <div className="mt-5 flex items-end justify-between gap-3">
                  <div className="h-7 w-20 animate-pulse rounded-full bg-[#003B73]/18" />
                  <div className="h-10 w-28 animate-pulse rounded-2xl bg-[#F6B21A]/70" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MenuScreen() {
  const [meal, setMeal] = useState<MealCategory>('merienda')
  const [filter, setFilter] = useState<SecondaryFilter>('todos')
  const [defaultTabApplied, setDefaultTabApplied] = useState(false)

  const {
    data: products,
    loading,
    error,
    refetch,
  } = useApiResource<Product[]>(async () => {
    const data = await apiGet<ApiProducto[]>('/api/productos')
    return data.map(mapProducto)
  })

  const {
    data: storeConfig,
    loading: storeConfigLoading,
    error: storeConfigError,
    refetch: refetchConfig,
  } = useApiResource<ApiConfiguracion>(async () => {
    return apiGet<ApiConfiguracion>('/api/configuracion-tienda')
  })

  const isStoreConfigPending = storeConfigLoading || Boolean(storeConfigError)
  const isStoreClosed = storeConfig?.estado === 'cerrada'
  const isStoreDemo = storeConfig?.estado === 'demo'
  const isStoreDisabled = isStoreConfigPending || isStoreClosed || isStoreDemo
  const disabledMessage =
    storeConfig?.mensaje_publico?.trim() ??
    (isStoreClosed ? 'La tienda está cerrada. No se aceptan nuevos pedidos por ahora.' : '')
  const productDisabledMessage = isStoreClosed ? 'Próximamente' : disabledMessage

  // Apply default category tab from config (only once)
  if (!defaultTabApplied && storeConfig?.categoria_default) {
    setDefaultTabApplied(true)
    if (storeConfig.categoria_default === 'cena') {
      setMeal('cena')
    }
  }

  const state: LoadState = loading ? 'loading' : error ? 'error' : 'ready'

  const visible = useMemo(() => {
    if (!products) return []
    return products
      .filter((p) => matchesFilter(p, meal, filter))
      .sort(sortBySoldOut)
  }, [products, meal, filter])

  const otherMeal: MealCategory = meal === 'merienda' ? 'cena' : 'merienda'

  const switchToOtherMeal = () => {
    setMeal(otherMeal)
    setFilter('todos')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
          {state === 'ready' && storeConfig && (isStoreClosed || isStoreDemo) && (
            <div className="mt-2 rounded-2xl border border-[#003B73]/25 bg-amber-50 px-4 py-3 text-sm text-[#003B73]">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 flex-shrink-0 text-[#003B73]" strokeWidth={2.2} />
                <p className="font-bold">
                  {isStoreClosed ? 'La tienda está cerrada' : 'Modo demo activo'}
                </p>
              </div>
              <p className="mt-1 text-[#3A5675]">
                {disabledMessage || (isStoreClosed ? 'No se aceptan nuevos pedidos por ahora.' : 'Podés ver el catálogo para practicar o compartir.')}
              </p>
            </div>
          )}

          {isStoreConfigPending && (
            <div
              role="status"
              aria-live="polite"
              className="mt-2 mb-4 flex flex-col items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              <span>
                {storeConfigError
                  ? 'No pudimos verificar si la tienda está abierta. Reintentá.'
                  : 'Verificando si la tienda está abierta…'}
              </span>
              {storeConfigError && (
                <button
                  type="button"
                  onClick={() => refetchConfig()}
                  className="rounded bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700"
                >
                  Reintentar
                </button>
              )}
            </div>
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
          <MenuLoadingSkeleton />
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
              <ProductCard key={p.id} product={p} disabled={isStoreDisabled} disabledReason={productDisabledMessage} />
            ))}
            <button
              type="button"
              onClick={switchToOtherMeal}
              className="km-focus mt-2 flex w-full items-center justify-center rounded-2xl border border-[#75AADB]/35 bg-white px-5 py-3 text-sm font-extrabold text-[#003B73] shadow-sm transition-colors hover:bg-[#EEF5FF]"
            >
              Ver {otherMeal}
            </button>
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

      {state === 'ready' && (
        <FloatingCartBar
          disabled={isStoreDisabled}
          disabledReason={
            isStoreDisabled
              ? disabledMessage || 'No se aceptan nuevos pedidos por ahora.'
              : (storeConfig?.mensaje_publico ?? undefined)
          }
        />
      )}
    </div>
  )
}
