# Spec: hydration-warning-fix (delta)

## ADDED Requirements

### REQ-HYDR-001 — `useLocalStorageState` hook
A new hook `useLocalStorageState<T>(key, options)` MUST be created in `frontend/lib/use-local-storage.ts`. The hook MUST:
- Be implemented with `useSyncExternalStore`
- Read from `localStorage` on the client via `getSnapshot`
- Return the `defaultValue` on the server via `getServerSnapshot`
- Provide a setter that writes to `localStorage` and triggers a re-render via a custom event
- Subscribe to both `storage` (cross-tab) and the custom `kermingo:local-storage-change` (same-tab) events
- Support a `parse` function for deserializing the stored value (default: `JSON.parse`)
- Support a `serialize` function for serializing (default: `JSON.stringify`)
- Return a `[value, setter]` tuple, where `setter` accepts a value or a `(prev) => value` functional updater

### REQ-HYDR-002 — All localStorage sites use the hook
The 4 files that currently use `useState(() => readFromLocalStorage())` MUST be refactored to use `useLocalStorageState`:
- `lib/auth.tsx` — `session`
- `components/menu/cart-context.tsx` — `items`
- `components/menu/ticket-screen.tsx` — `order`
- `components/menu/tracking-screen.tsx` — `token`

After the refactor, none of these files MUST contain the pattern `useState<T>(() => { ... localStorage ... })`.

### REQ-HYDR-003 — Persistence continues to work
Refactored components MUST still persist their state to `localStorage` so:
- Auth: a logged-in user remains logged in on page reload
- Cart: items added to the cart survive a page reload
- Ticket: a confirmed order ticket is readable on page reload
- Tracking: the last tracking token is read on page reload

### REQ-HYDR-004 — No hydration warning
After the refactor, navigating between the 4 screens (or reloading any of them) MUST NOT emit a React 19 hydration mismatch warning in the dev console. This is verified by:
- No "Hydration failed because the initial UI does not match what was rendered on the server" messages
- No "Text content does not match server-rendered HTML" messages
- No "An error occurred during hydration" errors

## MODIFIED Requirements
None.

## Type updates
```ts
// frontend/lib/use-local-storage.ts
export type UseLocalStorageStateOptions<T> = {
  defaultValue: T
  parse?: (raw: string) => T | null
  serialize?: (value: T) => string
}

export function useLocalStorageState<T>(
  key: string,
  options: UseLocalStorageStateOptions<T>,
): [T, (next: T | ((prev: T) => T)) => void]
```

## Testing strategy
- **Backend smoke** (pre-apply): not applicable
- **Apply**: create hook, refactor 4 files
- **Post-apply smoke**:
  - `pnpm lint` exits 0 with 0 warnings
  - `pnpm build` exits 0
  - Dev server: HTTP 200 on all pages
  - **Visual check**: navigate to /, /menu, /admin (login as admin), /admin/dashboard, /admin/pedidos, /seguimiento. No hydration warnings in console.
  - **Functional check**:
    - Add 2 items to cart on /menu → reload → cart still has 2 items
    - Login as admin → reload → still logged in
    - Submit a tracking token → reload → token still pre-filled

## Out of scope
- Other potential hydration mismatches (none observed in the codebase, but the dashboard uses `Date.now()` for the "last sync" which is computed on the client)
- Migration to RSC
- Adding a third-party state management library
