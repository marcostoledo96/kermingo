# Spec: lint-warnings-fix (delta)

## ADDED Requirements

### REQ-LINTW-001 — Zero lint warnings
After this change, `pnpm lint` MUST exit 0 with 0 warnings (and 0 errors). The previously-hidden 11 warnings MUST all be addressed.

**Scenario**: Developer runs `pnpm lint`
- Given the project is at the state after this change is applied
- When the developer runs `pnpm lint`
- Then the command exits 0
- And the output contains "0 problems" (or equivalent)

### REQ-LINTW-002 — localStorage hydration uses lazy useState
Components that hydrate state from `localStorage` MUST use a lazy `useState` initializer (`useState(() => readFromLocalStorage())`) instead of `useState(null) + useEffect(() => setState(readFromLocalStorage()))`. This pattern MUST be applied to:
- `lib/auth.tsx` (session)
- `components/menu/cart-context.tsx` (items)
- `components/menu/ticket-screen.tsx` (order)
- `components/menu/tracking-screen.tsx` (token, plus the `fetchByToken(saved)` call)

### REQ-LINTW-003 — `useApiResource` hook
A new custom hook `useApiResource<T>(fetcher: () => Promise<T>, deps?)` MUST be created in `frontend/lib/use-api-resource.ts`. It MUST:
- Return `{ data, loading, error, refetch }`
- Internally call the fetcher on mount and on dep changes
- Use `useState` + `useEffect` (the same pattern as before, but isolated to the hook)
- Have a single targeted `// eslint-disable-next-line react-hooks/set-state-in-effect` comment on the effect line with explanation

### REQ-LINTW-004 — Refactor screens to use the hook
The 6 screens that fetch from the API on mount MUST be refactored to use `useApiResource`:
- `components/admin/products-screen.tsx`
- `components/admin/caja-screen.tsx`
- `components/admin/orders-screen.tsx`
- `components/admin/cocina-screen.tsx`
- `components/menu/menu-screen.tsx`

After the refactor, these screens MUST NOT have any `react-hooks/set-state-in-effect` warnings.

## MODIFIED Requirements
None.

## Type updates
None new. The `useApiResource` hook returns generic `{ data: T | null, loading: boolean, error: string | null, refetch: () => Promise<void> }`.

## Testing strategy
- **Pre-apply** (reproduce warnings): `pnpm lint` shows 11 warnings. Confirmed.
- **Apply**: fix the 3 trivial + 4 localStorage + 6 API fetch cases.
- **Post-apply smoke**:
  - `pnpm lint` exits 0 with 0 warnings
  - `pnpm build` exits 0
  - Dev server: HTTP 200 on all admin pages
  - Login flow: enter admin@kermingo.com / admin123, navigate to /admin/dashboard
  - Public menu: open /menu, products load
  - Cart: add product, refresh, see it persisted

## Out of scope
- Fixing the React 19 hydration mismatch warning (if it appears) — would need `useSyncExternalStore` or `<div suppressHydrationWarning>`. Defer until user reports.
- Refactoring to use a data fetching library (React Query, SWR) — out of scope; would be a separate change
- Adding tests for `useApiResource` — defer; the hook is simple enough that lint + smoke is enough
