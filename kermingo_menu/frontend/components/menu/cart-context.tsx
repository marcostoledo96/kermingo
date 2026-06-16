'use client'

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import type { Product } from '@/lib/products'
import { useLocalStorageState } from '@/lib/use-local-storage'

export type CartItem = {
  product: Product
  qty: number
}

const STORAGE_KEY = 'kermingo:cart'

type CartContextValue = {
  items: CartItem[]
  count: number
  total: number
  add: (product: Product) => void
  increment: (id: string) => void
  decrement: (id: string) => void
  remove: (id: string) => void
  clear: () => void
  qtyOf: (id: string) => number
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  // `useSyncExternalStore` handles the server/client snapshot difference so
  // React 19 doesn't emit a hydration mismatch warning.
  // The hook persists on every setter call, so no separate `useEffect` is needed.
  const [items, setItems] = useLocalStorageState<CartItem[]>(STORAGE_KEY, {
    defaultValue: [],
  })

  const value = useMemo<CartContextValue>(() => {
    const add = (product: Product) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.product.id === product.id)
        if (existing) {
          return prev.map((i) =>
            i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i,
          )
        }
        return [...prev, { product, qty: 1 }]
      })
    }

    const increment = (id: string) =>
      setItems((prev) =>
        prev.map((i) => (i.product.id === id ? { ...i, qty: i.qty + 1 } : i)),
      )

    const decrement = (id: string) =>
      setItems((prev) =>
        prev
          .map((i) => (i.product.id === id ? { ...i, qty: i.qty - 1 } : i))
          .filter((i) => i.qty > 0),
      )

    const remove = (id: string) =>
      setItems((prev) => prev.filter((i) => i.product.id !== id))

    const clear = () => setItems([])

    const count = items.reduce((sum, i) => sum + i.qty, 0)
    const total = items.reduce((sum, i) => sum + i.qty * i.product.price, 0)
    const qtyOf = (id: string) =>
      items.find((i) => i.product.id === id)?.qty ?? 0

    return { items, count, total, add, increment, decrement, remove, clear, qtyOf }
  }, [items, setItems])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>')
  return ctx
}
