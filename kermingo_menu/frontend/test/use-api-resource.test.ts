import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useApiResource } from '@/lib/use-api-resource'

describe('useApiResource', () => {
  it('fetches on mount and populates data', async () => {
    const fetcher = vi.fn().mockResolvedValue([{ id: 1, name: 'test' }])
    const { result } = renderHook(() => useApiResource(fetcher))

    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: 1, name: 'test' }])
    })
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(null)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('sets error when fetcher throws', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() =>
      useApiResource<unknown>(fetcher, { initialData: null }),
    )

    await waitFor(() => {
      expect(result.current.error).toBe('boom')
    })
    expect(result.current.data).toBe(null)
    expect(result.current.loading).toBe(false)
  })

  it('refetch updates data', async () => {
    let count = 0
    const fetcher = vi.fn().mockImplementation(async () => {
      count += 1
      return [{ id: count, name: `item-${count}` }]
    })
    const { result } = renderHook(() => useApiResource(fetcher))

    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: 1, name: 'item-1' }])
    })

    act(() => {
      result.current.refetch()
    })
    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: 2, name: 'item-2' }])
    })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('refetch({ silent: true }) does not toggle loading', async () => {
    let resolveFn: (v: unknown) => void = () => {}
    const fetcher = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFn = resolve
        }),
    )
    const { result } = renderHook(() => useApiResource(fetcher))

    // initial load is in flight
    await waitFor(() => {
      expect(result.current.loading).toBe(true)
    })

    // resolve initial load
    act(() => {
      resolveFn([{ id: 1 }])
    })
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // silent refetch should keep loading=false
    resolveFn = () => {}
    act(() => {
      result.current.refetch({ silent: true })
    })
    expect(result.current.loading).toBe(false)
    expect(result.current.refreshing).toBe(true)

    // resolve silent refetch
    act(() => {
      resolveFn([{ id: 2 }])
    })
    await waitFor(() => {
      expect(result.current.refreshing).toBe(false)
    })
  })

  it('setData replaces data', async () => {
    const fetcher = vi.fn().mockResolvedValue([{ id: 1, name: 'a' }])
    const { result } = renderHook(() => useApiResource(fetcher))

    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: 1, name: 'a' }])
    })

    act(() => {
      result.current.setData([{ id: 99, name: 'manual' }])
    })
    expect(result.current.data).toEqual([{ id: 99, name: 'manual' }])
  })

  it('setData with function receives current data', async () => {
    const fetcher = vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }])
    const { result } = renderHook(() => useApiResource(fetcher))

    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: 1 }, { id: 2 }])
    })

    act(() => {
      result.current.setData((prev: { id: number }[] | null) => [...(prev ?? []), { id: 3 }])
    })
    expect(result.current.data).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
  })

  it('does NOT re-fetch when fetcher identity changes (prevents infinite loops)', async () => {
    // The hook uses a ref to always call the latest fetcher without
    // triggering a new effect. This prevents infinite re-fetch loops
    // when the consumer passes an inline arrow function.
    const fetcher1 = vi.fn().mockResolvedValue([{ id: 1 }])
    const fetcher2 = vi.fn().mockResolvedValue([{ id: 2 }])

    const { result, rerender } = renderHook(
      ({ fetcher }: { fetcher: () => Promise<unknown> }) => useApiResource(fetcher),
      { initialProps: { fetcher: fetcher1 } },
    )

    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: 1 }])
    })
    expect(fetcher1).toHaveBeenCalledTimes(1)

    // Re-rendering with a different fetcher identity should NOT auto-re-fetch
    rerender({ fetcher: fetcher2 })

    // Data remains from the first fetch
    expect(result.current.data).toEqual([{ id: 1 }])
    expect(fetcher2).toHaveBeenCalledTimes(0)

    // Manual refetch should call the NEW fetcher (via ref)
    act(() => {
      result.current.refetch()
    })
    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: 2 }])
    })
    expect(fetcher2).toHaveBeenCalledTimes(1)
  })
})
