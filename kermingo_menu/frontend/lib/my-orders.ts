/**
 * Lista de pedidos del usuario actual, persistida en localStorage.
 *
 * El evento Kermingo es mobile-first: la gente compra y sigue sus pedidos
 * desde el mismo celular. No hay login, no hay forma de "recordar" los
 * pedidos entre sesiones en el backend, así que el dispositivo es la
 * única memoria.
 *
 * Cada vez que un pedido se confirma en /confirmar, su token se agrega
 * a esta lista (sin duplicados, más recientes al final). El listado
 * nunca crece más de MAX_ENTRIES para no acumular basura.
 *
 * Keys legacy (single-token) mantenidas por compat:
 *   - kermingo:lastToken → un solo token (sigue funcionando como fallback)
 *   - kermingo:lastOrder → ticket completo del último pedido (para /confirmado)
 */
import { useCallback } from 'react'
import { useLocalStorageState } from './use-local-storage'

const MY_ORDERS_KEY = 'kermingo:myOrders'
const LEGACY_LAST_TOKEN_KEY = 'kermingo:lastToken'
const MAX_ENTRIES = 30

export type MyOrderEntry = {
  /** Token de seguimiento (PK del pedido en backend) */
  token: string
  /** ISO timestamp de cuando se confirmó */
  createdAt: string
  /** Número visible (KMG-0001) para mostrar en la lista sin fetch */
  numero: string
}

function readRaw(): MyOrderEntry[] {
  try {
    const raw = window.localStorage.getItem(MY_ORDERS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is MyOrderEntry =>
        e != null &&
        typeof e === 'object' &&
        typeof e.token === 'string' &&
        typeof e.createdAt === 'string' &&
        typeof e.numero === 'string',
    )
  } catch {
    return []
  }
}

function writeRaw(entries: MyOrderEntry[]): void {
  try {
    window.localStorage.setItem(MY_ORDERS_KEY, JSON.stringify(entries))
  } catch {
    // Modo privado / sin cuota
  }
}

/** Lee la lista de pedidos del dispositivo. SSR-safe (devuelve [] en server). */
export function getMyOrders(): MyOrderEntry[] {
  if (typeof window === 'undefined') return []
  return readRaw()
}

/** Lee un solo token legacy (compat con versiones anteriores). */
export function getLegacyLastToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(LEGACY_LAST_TOKEN_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return typeof parsed === 'string' && parsed.length > 0 ? parsed : null
  } catch {
    return null
  }
}

/**
 * Agrega un pedido a la lista. Si ya existe el token, lo mueve al final
 * (más reciente) y actualiza numero/createdAt. Trunca a MAX_ENTRIES.
 */
export function addMyOrder(entry: MyOrderEntry): void {
  if (typeof window === 'undefined') return
  const existing = readRaw()
  const filtered = existing.filter((e) => e.token !== entry.token)
  const next = [...filtered, entry].slice(-MAX_ENTRIES)
  writeRaw(next)
  try {
    window.localStorage.setItem(LEGACY_LAST_TOKEN_KEY, JSON.stringify(entry.token))
  } catch {
    // noop
  }
}

/** Quita un pedido de la lista (útil si el backend lo reporta inválido). */
export function removeMyOrder(token: string): void {
  if (typeof window === 'undefined') return
  const filtered = readRaw().filter((e) => e.token !== token)
  writeRaw(filtered)
  const legacy = getLegacyLastToken()
  if (legacy === token) {
    try {
      window.localStorage.removeItem(LEGACY_LAST_TOKEN_KEY)
    } catch {
      // noop
    }
  }
}

/** Hook que devuelve la lista reactiva + add/remove. */
export function useMyOrders(): {
  orders: MyOrderEntry[]
  add: (entry: MyOrderEntry) => void
  remove: (token: string) => void
} {
  const [orders, setOrders] = useLocalStorageState<MyOrderEntry[]>(MY_ORDERS_KEY, {
    defaultValue: [],
    parse: (raw) => {
      try {
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return null
        return parsed.filter(
          (e): e is MyOrderEntry =>
            e != null &&
            typeof e === 'object' &&
            typeof e.token === 'string' &&
            typeof e.createdAt === 'string' &&
            typeof e.numero === 'string',
        )
      } catch {
        return null
      }
    },
  })

  const add = useCallback((entry: MyOrderEntry) => {
    setOrders((prev) => {
      const filtered = prev.filter((e) => e.token !== entry.token)
      return [...filtered, entry].slice(-MAX_ENTRIES)
    })
    addMyOrder(entry)
  }, [setOrders])

  const remove = useCallback((token: string) => {
    setOrders((prev) => prev.filter((e) => e.token !== token))
    removeMyOrder(token)
  }, [setOrders])

  return { orders, add, remove }
}
