# Archived: frontend-hydration-warning-fix

**Date:** 2026-06-14
**Status:** ARCHIVED — verdict PASS

## Summary
- Created: `openspec/specs/hydration-warning-fix/spec.md` (durable capability for hydration-safe localStorage)
- New module: `frontend/lib/use-local-storage.ts` (useSyncExternalStore wrapper)
- 4 files refactored to use the new hook: auth, cart, ticket, tracking
- 1 file simplified: cart-context (dropped persist-on-change useEffect)
- `pnpm lint` exits 0 with **0 warnings**
- `pnpm build` 14/14 static pages
- Dev server: HTTP 200 on all routes
- Dev log: clean, no errors, no warnings

## The fix
`useSyncExternalStore` with `getServerSnapshot` is React 18+ official API for reading from external stores (like localStorage) that may legitimately differ between server and client. React 19 knows that state managed by this hook can differ, so it does NOT emit the hydration mismatch warning.

The hook is implemented in `lib/use-local-storage.ts`:
- `subscribe(callback)`: listens for both cross-tab (`storage` event) and same-tab (custom `kermingo:local-storage-change` event) updates
- `getSnapshot()`: reads localStorage
- `getServerSnapshot()`: returns `defaultValue` (stable for SSR)
- The setter writes to localStorage and dispatches the custom event to trigger a re-read

## Trade-off (now resolved)
The previous change (`frontend-lint-warnings-fix`) accepted a React 19 hydration warning as a known trade-off. This change eliminates that warning.

## Out of Scope (next changes)
- Hydration warnings from other sources (none observed)
- Migration to React Server Components
- Adding a third-party state management library
