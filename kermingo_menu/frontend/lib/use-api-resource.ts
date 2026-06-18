'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from './api'

type UseApiResourceResult<T> = {
  data: T | null
  loading: boolean
  refreshing: boolean
  error: string | null
  refetch: (opts?: { silent?: boolean }) => Promise<void>
  setData: (data: T | null | ((prev: T | null) => T | null)) => void
}

/**
 * Client-side data fetching hook. Wraps the canonical
 * `useState + useEffect` pattern so consumers don't have to write the
 * `set-state-in-effect` boilerplate themselves.
 *
 * **Stability guarantee**: The `refetch` function is referentially stable
 * across renders. It always calls the *latest* `fetcher` via a ref, so
 * inline arrow functions in the consumer don't cause infinite re-fetch
 * loops.
 *
 * @param fetcher - Async function that returns the resource
 * @param options.initialData - Optional initial value (e.g. from SSR)
 *
 * Returns:
 * - `data` — the resource (or null while loading for the first time)
 * - `loading` — true during the initial load; toggles the full-screen spinner
 * - `refreshing` — true during a manual silent refresh; toggles the inline spinner
 * - `error` — last error message, or null
 * - `refetch({ silent })` — trigger a re-fetch. `silent: true` doesn't toggle `loading`
 * - `setData` — manually update the data (e.g. after an optimistic update)
 */
export function useApiResource<T>(
  fetcher: () => Promise<T>,
  options?: { initialData?: T },
): UseApiResourceResult<T> {
  const [data, setData] = useState<T | null>(options?.initialData ?? null)
  // Functional updater is provided so consumers can do setData(prev => …).
  // We wrap React's setState which already supports the (prev: T) => T signature.
  // The extra `| null` in the union is to match the outer type.
  const setDataFn = useCallback(
    (updater: T | null | ((prev: T | null) => T | null)) => {
      if (typeof updater === 'function') {
        setData((prev) => (updater as (p: T | null) => T | null)(prev))
      } else {
        setData(updater)
      }
    },
    [],
  )
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Keep the latest fetcher in a ref so refetch always calls the current
  // version without needing fetcher in its dependency array. This prevents
  // inline arrow functions from causing infinite re-fetch loops.
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const refetch = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (opts?.silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)
      try {
        const result = await fetcherRef.current()
        setData(result)
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Error desconocido'
        setError(message)
        setData(null)
      } finally {
        if (opts?.silent) {
          setRefreshing(false)
        } else {
          setLoading(false)
        }
      }
    },
    [], // stable — fetcherRef.current always holds the latest fetcher
  )

  // Fetch on mount only. `refetch` is referentially stable, so this effect
  // runs exactly once. Manual re-fetches are triggered by calling `refetch()`.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch()
  }, [refetch])

  return { data, loading, refreshing, error, refetch, setData: setDataFn }
}
