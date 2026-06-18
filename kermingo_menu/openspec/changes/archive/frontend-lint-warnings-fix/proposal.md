# Change: frontend-lint-warnings-fix

## Why
After `frontend-lint-fix`, the new ESLint config exposes 11 pre-existing warnings that were hidden by the previous crash. They're real findings:

- 3 unused imports/vars (trivial)
- 4 `react-hooks/set-state-in-effect` from localStorage hydration
- 4 `react-hooks/set-state-in-effect` from API fetch on mount

We want zero warnings so `pnpm lint` is clean for CI.

## What changes

### Trivial (3 files)
- Remove unused `isDashboard` from `admin-header.tsx`
- Remove unused `apiPost` import from `cocina-screen.tsx`
- Remove unused `useMemo` import from `orders-screen.tsx`

### localStorage hydration (4 files)
Switch from `useState(null) + useEffect(() => setState(read()))` to `useState(() => read())` (lazy initializer) in:
- `lib/auth.tsx` (`session` state, remove `hydrated` state)
- `components/menu/cart-context.tsx` (`items` state)
- `components/menu/ticket-screen.tsx` (`order` state)
- `components/menu/tracking-screen.tsx` (`token` state, fire `fetchByToken(saved)` on first render via lazy init)

**Trade-off**: lazy useState may cause a React 19 hydration mismatch warning (the SSR render returns `null` because `typeof window === 'undefined'`, but the client first render reads localStorage and returns a non-null value). We accept this dev-only console warning because:
- It's dev-only (not shown in production)
- The components re-render on the client with the correct value (React patches the mismatch)
- The lint rule fires as a warning, not an error
- The alternative (useEffect hydration) is exactly what triggers the lint rule

If the user reports the React hydration warning as problematic, we'll address it in a follow-up using `useSyncExternalStore` or `<div suppressHydrationWarning>`.

### API fetch (4 screens + 1 new hook)
Wrap the API fetch pattern (`useState(empty) + useEffect(async () => { ... })`) in a new custom hook `useApiResource<T>(fetcher, deps)`:
- Returns `{ data, loading, error, refetch }`
- Internally uses `useState` + `useEffect` (the same pattern, but isolated)
- The `useEffect` in the hook has a single targeted `// eslint-disable-next-line react-hooks/set-state-in-effect` with a comment explaining why this is acceptable
- Consumers (4 screens) just use the hook — no lint warnings at the call site

The disable comment is the pragmatic choice. The alternative (refactor every screen to use Suspense or a full data-fetching library) is out of scope.

### Affected files
**Trivial (3 files)**
- `frontend/components/admin/admin-header.tsx` — remove `isDashboard` line
- `frontend/components/admin/cocina-screen.tsx` — remove `apiPost` import
- `frontend/components/admin/orders-screen.tsx` — remove `useMemo` import

**localStorage (4 files)**
- `frontend/lib/auth.tsx` — lazy `useState` for session, drop `hydrated`
- `frontend/components/menu/cart-context.tsx` — lazy `useState` for items
- `frontend/components/menu/ticket-screen.tsx` — lazy `useState` for order
- `frontend/components/menu/tracking-screen.tsx` — lazy `useState` for token + `fetchByToken` call

**API fetch (5 files)**
- `frontend/lib/use-api-resource.ts` — **NEW** custom hook
- `frontend/components/admin/products-screen.tsx` — use the hook
- `frontend/components/admin/caja-screen.tsx` — use the hook
- `frontend/components/admin/orders-screen.tsx` — use the hook
- `frontend/components/menu/menu-screen.tsx` — use the hook (this is the public menu, not admin)

**Out of scope (cocina-screen.tsx also fetches from API)**
Wait, cocina does fetch. Let me add it to the list.

- `frontend/components/admin/cocina-screen.tsx` — also uses the hook

So 6 files use the new hook total. Let me update the file list.

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Lazy useState causes React hydration mismatch warning | Med | Acceptable: dev-only, components re-render correctly. Will revisit if user complains. |
| `useApiResource` hook signature doesn't cover all 6 use cases | Med | Each screen keeps its own custom transform logic in the `fetcher` callback |
| The single disable comment in the hook is too broad | Low | Comment explains why; hook is the only place with the disable |
| `useCallback` dependency on `fetcher` causes infinite loop in screens | Med | `useCallback` is used; consumers wrap their fetcher in `useCallback` if needed |

## Rollback
Revert the changes. Lint goes back to 11 warnings, but still works.

## Dependencies
- React 19 (already installed)
- ESLint 9.39.4 (already installed)
- No new packages

## Success criteria
- [ ] `pnpm lint` exits 0 with 0 warnings
- [ ] `pnpm build` still passes
- [ ] `pnpm dev` still serves all pages
- [ ] Manual smoke: login, navigate all admin screens, complete a flow on the public menu
- [ ] No new console errors

## Single-PR decision
Single PR. ~200 lines of changes across 9-10 files. No backend changes.
