# Tasks: lint-warnings-fix

> Single-PR implementation. 10+ files, ~300 lines.

## Phase 1 — Trivial fixes (3 files)
- [ ] T1. `components/admin/admin-header.tsx`: remove unused `isDashboard` line 30
- [ ] T2. `components/admin/cocina-screen.tsx`: remove unused `apiPost` import
- [ ] T3. `components/admin/orders-screen.tsx`: remove unused `useMemo` import

## Phase 2 — New hook
- [ ] T4. `lib/use-api-resource.ts` (NEW): create `useApiResource` hook with `// eslint-disable-next-line react-hooks/set-state-in-effect` on the effect line

## Phase 3 — localStorage lazy useState (4 files)
- [ ] T5. `lib/auth.tsx`: switch `session` to lazy useState, remove `hydrated` state, simplify redirect effect
- [ ] T6. `components/menu/cart-context.tsx`: switch `items` to lazy useState
- [ ] T7. `components/menu/ticket-screen.tsx`: switch `order` to lazy useState
- [ ] T8. `components/menu/tracking-screen.tsx`: switch `token` to lazy useState, drop `setToken` from useEffect

## Phase 4 — Refactor screens to use the hook (5 files)
- [ ] T9. `components/admin/products-screen.tsx`: use `useApiResource`
- [ ] T10. `components/admin/caja-screen.tsx`: use `useApiResource`
- [ ] T11. `components/admin/orders-screen.tsx`: use `useApiResource` (keep search debounce)
- [ ] T12. `components/admin/cocina-screen.tsx`: use `useApiResource` (keep polling)
- [ ] T13. `components/menu/menu-screen.tsx`: use `useApiResource`

## Phase 5 — Verify
- [ ] T14. `pnpm lint` exits 0 with **0 warnings**
- [ ] T15. `pnpm build` exits 0
- [ ] T16. Dev server: HTTP 200 on all admin + public pages
- [ ] T17. Manual smoke: login flow, navigate admin, complete public menu flow

## Phase 6 — Archive
- [ ] T18. Move change to archive, copy spec, write ARCHIVED.md

## Traceability

| Spec scenario | Tasks |
|---|---|
| REQ-LINTW-001 | T1–T17 (all together) |
| REQ-LINTW-002 | T5–T8 |
| REQ-LINTW-003 | T4 |
| REQ-LINTW-004 | T9–T13 |
