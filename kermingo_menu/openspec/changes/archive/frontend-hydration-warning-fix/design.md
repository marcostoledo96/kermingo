# Design: hydration-warning-fix

## 1. The warning

In React 19 (and earlier), when a component renders with different state on the server vs. the client, React 19 emits a hydration mismatch warning:

```
Warning: Text content does not match server-rendered HTML.
Warning: An error occurred during hydration. The server HTML was replaced with client content in <...>.
```

The pattern that triggers this:
- Server renders the component with a "default" value (e.g., empty cart)
- Client first render reads `localStorage` and returns a non-default value (e.g., cart with 2 items)
- React 19 detects the mismatch and warns

## 2. The previous fix (lazy useState)

In `frontend-lint-warnings-fix` we used lazy `useState` initializers:

```ts
const [items, setItems] = useState<CartItem[]>(() => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as CartItem[]
  } catch {
    return []
  }
})
```

This works functionally but causes the hydration warning. The lazy initializer runs:
- On the server: returns `[]` (because `typeof window === 'undefined'`)
- On the client: returns `[]` or the localStorage value

If the two differ, React 19 warns.

## 3. The proper fix: `useSyncExternalStore`

React 18 introduced `useSyncExternalStore` for reading from external stores (like `localStorage`) that may legitimately differ between server and client. The hook takes 3 arguments:

1. `subscribe(callback)`: register a callback that React calls when the store changes
2. `getSnapshot()`: return the current value (called on the client)
3. `getServerSnapshot()`: return the value to use during SSR

Crucially: **React does NOT emit a hydration mismatch warning for state managed by `useSyncExternalStore`**. It uses `getServerSnapshot()` for the first server render, then `getSnapshot()` for the first client render. If they differ, React re-renders with the client value, but no warning is shown.

## 4. The hook design

```ts
// frontend/lib/use-local-storage.ts
'use client'

import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_EVENT = 'kermingo:local-storage-change'

function subscribe(callback: () => void) {
  // Cross-tab updates: native 'storage' event
  const onStorage = () => callback()
  // Same-tab updates: our custom event
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
  defaultValue: T
  parse?: (raw: string) => T | null
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

export function useLocalStorageState<T>(
  key: string,
  options: UseLocalStorageStateOptions<T>,
): [T, (next: T | ((prev: T) => T)) => void] {
  const parse = options.parse ?? (defaultParse as (raw: string) => T | null)
  const serialize = options.serialize ?? defaultSerialize

  const getSnapshot = useCallback((): T => {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw === null) return options.defaultValue
      return parse(raw) ?? options.defaultValue
    } catch {
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
          // Read current value from localStorage (not from `value` which may
          // be stale due to React's batching) to support functional updates.
          const current = getSnapshot()
          newValue = (next as (p: T) => T)(current)
        } else {
          newValue = next
        }
        window.localStorage.setItem(key, serialize(newValue))
        notifyChange()
      } catch {
        // localStorage no disponible
      }
    },
    [key, serialize, getSnapshot],
  )

  return [value, setValue]
}
```

### Why the custom event?

The native `storage` event only fires in OTHER tabs/windows, not in the tab that made the change. So if we want same-tab updates (the most common case) to re-render the hook, we need our own event.

The setter dispatches it. The subscribe listener catches it and calls the React callback. React then re-reads via `getSnapshot()`. Re-render happens.

### Why `useCallback` for `getSnapshot` and `getServerSnapshot`?

`useSyncExternalStore` requires these functions to have stable references across renders. If they change on every render, React will re-subscribe unnecessarily and may warn. `useCallback` gives us the stable reference.

### Why functional update reads via `getSnapshot()`?

React's batching can mean that the `value` returned by `useSyncExternalStore` is stale (e.g., one render behind the latest `localStorage` write). For functional updates, we want the FRESHEST value. Reading via `getSnapshot()` ensures we get the current value, not the rendered value.

## 5. Per-file refactor pattern

For each of the 4 files, the change is the same:

```ts
// Before
const [items, setItems] = useState<CartItem[]>(() => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as CartItem[]
  } catch {
    return []
  }
})

// After
const [items, setItems] = useLocalStorageState<CartItem[]>(STORAGE_KEY, {
  defaultValue: [],
})
```

For files that also have a persistence-on-change `useEffect`, that useEffect can be removed because the hook persists on every setter call.

For auth.tsx, there's a separate `writeSession` helper. That can be removed because the hook handles persistence.

## 6. Why a single PR
- 1 new module + 4 refactors
- Same pattern in all 4 places
- Tight scope
- No backend changes
