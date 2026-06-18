'use client'

import { useCallback, useRef, useSyncExternalStore } from 'react'

/**
 * Custom event for same-tab localStorage updates. The native `storage` event
 * only fires in OTHER tabs/windows, so we need our own event for the
 * common case of updating localStorage in the same tab and wanting the
 * hook to re-read it.
 */
const STORAGE_EVENT = 'kermingo:local-storage-change'

function subscribe(callback: () => void) {
  // Cross-tab updates: native 'storage' event fires in other tabs.
  const onStorage = () => callback()
  // Same-tab updates: our custom event.
  const onCustom = () => callback()
  window.addEventListener('storage', onStorage)
  window.addEventListener(STORAGE_EVENT, onCustom)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(STORAGE_EVENT, onCustom)
  }
}

function notifyChange() {
  window.dispatchEvent(new Event(STORAGE_EVENT))
}

export type UseLocalStorageStateOptions<T> = {
  /** Value to return when the key is missing or parsing fails. */
  defaultValue: T
  /** Custom deserializer. Defaults to JSON.parse with null on failure. */
  parse?: (raw: string) => T | null
  /** Custom serializer. Defaults to JSON.stringify. */
  serialize?: (value: T) => string
}

const defaultParse = <T,>(raw: string): T | null => {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}
const defaultSerialize = JSON.stringify

/**
 * Read and write a value in `localStorage` from a React component, in a way
 * that does NOT trigger React 19's hydration mismatch warning.
 *
 * Uses `useSyncExternalStore` so that the server render uses the
 * `defaultValue` and the client first render reads from `localStorage`.
 * React knows the values can legitimately differ and suppresses the warning.
 *
 * **Important**: The `getSnapshot` callback returns referentially stable
 * values by caching the parsed result. Without caching, `JSON.parse` creates
 * a new object reference on every call, causing React to see the value as
 * changed and trigger an infinite re-render loop (error #185).
 *
 * The setter persists to `localStorage` and dispatches a custom event so
 * the hook re-reads (the native `storage` event only fires in other tabs).
 *
 * @example
 * ```tsx
 * const [items, setItems] = useLocalStorageState<CartItem[]>('cart', { defaultValue: [] })
 * setItems([...items, { id: 'p1', qty: 2 }])  // also persists
 * setItems(prev => [...prev, { id: 'p2', qty: 1 }])  // functional update
 * ```
 */
export function useLocalStorageState<T>(
  key: string,
  options: UseLocalStorageStateOptions<T>,
): [T, (next: T | ((prev: T) => T)) => void] {
  const parse = options.parse ?? (defaultParse as (raw: string) => T | null)
  const serialize = options.serialize ?? defaultSerialize

  // Cache the last parsed value so getSnapshot returns the same reference
  // when the raw localStorage string hasn't changed. Without this,
  // JSON.parse creates a new object on every call, causing React to see
  // the value as changed and re-render infinitely (error #185).
  const cachedRef = useRef<{ raw: string | null; parsed: T } | null>(null)

  const getSnapshot = useCallback((): T => {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw === null) {
        // Return defaultValue directly — no caching needed for null case
        // since defaultValue is typically a stable reference or primitive.
        // But if the cache was populated before and localStorage was cleared,
        // we must invalidate.
        cachedRef.current = null
        return options.defaultValue
      }
      // Return cached value if the raw string hasn't changed
      if (cachedRef.current !== null && cachedRef.current.raw === raw) {
        return cachedRef.current.parsed
      }
      const parsed = parse(raw) ?? options.defaultValue
      cachedRef.current = { raw, parsed }
      return parsed
    } catch {
      cachedRef.current = null
      return options.defaultValue
    }
  }, [key, parse, options.defaultValue])

  const getServerSnapshot = useCallback((): T => options.defaultValue, [options.defaultValue])

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      try {
        let newValue: T
        if (typeof next === 'function') {
          // Read freshest value (not the rendered `value` which may be stale).
          const current = getSnapshot()
          newValue = (next as (p: T) => T)(current)
        } else {
          newValue = next
        }
        window.localStorage.setItem(key, serialize(newValue))
        notifyChange()
      } catch {
        // localStorage no disponible (modo privado, etc.)
      }
    },
    [key, serialize, getSnapshot],
  )

  return [value, setValue]
}
