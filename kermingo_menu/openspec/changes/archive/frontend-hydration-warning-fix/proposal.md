# Change: frontend-hydration-warning-fix

## Why
After `frontend-lint-warnings-fix`, we accepted a React 19 hydration mismatch warning in dev console as a trade-off for using lazy `useState` to read `localStorage`. SSR renders with the default value (e.g., `null` for cart items, `''` for the tracking token), but the client's first render reads `localStorage` and may return a different value. React 19 detects this and warns.

The warning is dev-only (no user impact), but it's noise that masks real issues. The proper fix is `useSyncExternalStore` with a `getServerSnapshot` — this tells React "the value may legitimately differ between server and client; don't warn".

## What changes
- **NEW** `lib/use-local-storage.ts` — wraps `useSyncExternalStore` with a typed `useLocalStorageState` hook.
- Refactor 4 files that use the lazy `useState` + localStorage pattern:
  - `lib/auth.tsx` — session
  - `components/menu/cart-context.tsx` — items
  - `components/menu/ticket-screen.tsx` — order
  - `components/menu/tracking-screen.tsx` — token
- Each refactored file uses `useLocalStorageState(key, { defaultValue })` instead of `useState(() => readFromLocalStorage())`.
- No behavior changes for the user. No backend changes. No new dependencies.

## The new hook

```ts
// frontend/lib/use-local-storage.ts
export function useLocalStorageState<T>(
  key: string,
  options: { defaultValue: T; parse?: (raw: string) => T | null; serialize?: (value: T) => string },
): [T, (next: T | ((prev: T) => T)) => void]
```

How it works:
- `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`
- `subscribe(callback)`: listens for cross-tab `storage` events and a custom `kermingo:local-storage-change` event for same-tab updates
- `getSnapshot()`: reads `localStorage.getItem(key)` and parses it
- `getServerSnapshot()`: returns `defaultValue` (so SSR has a stable value)
- The setter writes to `localStorage` and dispatches the custom event to trigger a re-read in the same tab

React 19 knows that `useSyncExternalStore`-managed state can legitimately differ between server and client, so it does NOT emit a hydration mismatch warning.

## Why this is the right fix
- `useSyncExternalStore` is React 18+ official API for reading from external sources that may differ between server and client.
- It's stable, well-documented, and supported by React 19.
- It works with Next.js SSR (RSC + client components).
- It handles the same-tab and cross-tab update case via a custom event.
- It centralizes the pattern in one hook, so we don't repeat the subscription logic in 4 files.

## Impact
- 5 frontend files modified (1 new, 4 refactored).
- No source code changes outside the localStorage hydration.
- No behavior changes visible to the user.
- No backend changes.

## Out of scope
- Migrating to React Server Components (RSC) for these screens — they need client-side state.
- Using a third-party state management library (Zustand, Jotai) — overkill for our needs.
- Restoring the lazy useState for backwards compat — the new hook replaces it.
- Other hydration warnings (e.g., from the admin dashboard, from components that compute time-based UI).

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `useSyncExternalStore` behavior change in future React versions | Low | API is stable since React 18, well-supported in React 19 |
| Cross-tab sync via `storage` event has browser quirks (Safari) | Low | We're not relying on it for any feature; it's a nice-to-have |
| Functional update setter reads localStorage twice (once in getSnapshot, once when persisting) | Low | The double read is in microseconds; no user impact |
| A component reads `localStorage` in a render (not via the hook) and creates its own mismatch | Low | We use the hook in all 4 localStorage sites |

## Rollback
Revert the changes. Lint still passes, build still passes. The hydration warning returns but no functional regression.

## Dependencies
- React 19 (already installed, supports `useSyncExternalStore`)
- No new packages

## Success criteria
- [ ] `pnpm lint` exits 0 with 0 warnings
- [ ] `pnpm build` still passes
- [ ] `pnpm dev` still serves all pages
- [ ] **No React hydration mismatch warning** in dev console when navigating between any of the 4 screens
- [ ] All 4 localStorage-backed state slots still work (login persists, cart persists, ticket reads, tracking token reads)

## Single-PR decision
Single PR. 1 new module, 4 refactors. Tight scope.
