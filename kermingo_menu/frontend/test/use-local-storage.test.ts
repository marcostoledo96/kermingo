import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorageState } from '@/lib/use-local-storage'

const KEY = 'kermingo:test-key'

beforeEach(() => {
  window.localStorage.clear()
})

describe('useLocalStorageState', () => {
  it('returns defaultValue when localStorage is empty', () => {
    const { result } = renderHook(() =>
      useLocalStorageState<string>(KEY, { defaultValue: 'fallback' }),
    )
    expect(result.current[0]).toBe('fallback')
  })

  it('returns stored value when localStorage has the key', () => {
    window.localStorage.setItem(KEY, JSON.stringify('stored-value'))
    const { result } = renderHook(() =>
      useLocalStorageState<string>(KEY, { defaultValue: 'fallback' }),
    )
    expect(result.current[0]).toBe('stored-value')
  })

  it('setter writes to localStorage', () => {
    const { result } = renderHook(() =>
      useLocalStorageState<string>(KEY, { defaultValue: '' }),
    )
    act(() => {
      result.current[1]('new-value')
    })
    expect(result.current[0]).toBe('new-value')
    expect(window.localStorage.getItem(KEY)).toBe(JSON.stringify('new-value'))
  })

  it('setter with function receives current value', () => {
    const { result } = renderHook(() =>
      useLocalStorageState<number>(KEY, { defaultValue: 0 }),
    )
    act(() => {
      result.current[1](5)
    })
    act(() => {
      result.current[1]((prev) => prev + 1)
    })
    expect(result.current[0]).toBe(6)
    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toBe(6)
  })

  it('custom parse is used', () => {
    window.localStorage.setItem(KEY, 'upper-case')
    const { result } = renderHook(() =>
      useLocalStorageState<string>(KEY, {
        defaultValue: '',
        parse: (raw) => raw.toUpperCase(),
      }),
    )
    expect(result.current[0]).toBe('UPPER-CASE')
  })

  it('custom serialize is used', () => {
    const { result } = renderHook(() =>
      useLocalStorageState<string>(KEY, {
        defaultValue: '',
        serialize: (v) => v.toLowerCase(),
      }),
    )
    act(() => {
      result.current[1]('Mixed-Case')
    })
    expect(window.localStorage.getItem(KEY)).toBe('mixed-case')
  })

  it('parse failure returns defaultValue', () => {
    // The default parse is JSON.parse, so a non-JSON value should be null
    // (parse returns null), and the hook should fall back to defaultValue.
    window.localStorage.setItem(KEY, 'not-json{')
    const { result } = renderHook(() =>
      useLocalStorageState<{ a: number }>(KEY, { defaultValue: { a: 99 } }),
    )
    expect(result.current[0]).toEqual({ a: 99 })
  })

  it('two hooks with same key stay in sync via custom event', () => {
    const { result: a } = renderHook(() =>
      useLocalStorageState<string>(KEY, { defaultValue: '' }),
    )
    const { result: b } = renderHook(() =>
      useLocalStorageState<string>(KEY, { defaultValue: '' }),
    )
    act(() => {
      a.current[1]('synced')
    })
    // Both hooks should see 'synced' because the setter dispatches the custom event
    expect(a.current[0]).toBe('synced')
    expect(b.current[0]).toBe('synced')
  })

  it('returns referentially stable values for object types (regression: infinite loop / React #185)', () => {
    // Regression test: JSON.parse creates a new object on every call.
    // Without caching, useSyncExternalStore sees a new reference each time,
    // causing infinite re-renders (React error #185).
    window.localStorage.setItem(KEY, JSON.stringify({ name: 'test', count: 5 }))

    const { result, rerender } = renderHook(() =>
      useLocalStorageState<{ name: string; count: number }>(KEY, {
        defaultValue: { name: '', count: 0 },
      }),
    )

    const firstValue = result.current[0]
    // Rerender should return the exact same object reference, not a new parsed copy
    rerender()
    const secondValue = result.current[0]

    expect(firstValue).toBe(secondValue) // Same reference, not just deep-equal
    expect(firstValue).toEqual({ name: 'test', count: 5 })
  })

  it('invalidates cache when localStorage value changes', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ v: 1 }))

    const { result } = renderHook(() =>
      useLocalStorageState<{ v: number }>(KEY, { defaultValue: { v: 0 } }),
    )

    expect(result.current[0]).toEqual({ v: 1 })

    // Update via setter — should dispatch custom event and return new value
    act(() => {
      result.current[1]({ v: 2 })
    })

    expect(result.current[0]).toEqual({ v: 2 })
  })
})
