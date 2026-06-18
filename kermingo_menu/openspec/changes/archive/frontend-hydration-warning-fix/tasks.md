# Tasks: hydration-warning-fix

> Single-PR implementation. 1 new module + 4 refactors.

## Phase 1 — Hook
- [ ] T1. Create `frontend/lib/use-local-storage.ts` with `useLocalStorageState` (uses `useSyncExternalStore`)

## Phase 2 — Refactor
- [ ] T2. Refactor `lib/auth.tsx`: switch `session` to `useLocalStorageState`, remove `writeSession` helper
- [ ] T3. Refactor `components/menu/cart-context.tsx`: switch `items` to `useLocalStorageState`, remove the persist-on-change `useEffect`
- [ ] T4. Refactor `components/menu/ticket-screen.tsx`: switch `order` to `useLocalStorageState`
- [ ] T5. Refactor `components/menu/tracking-screen.tsx`: switch `token` to `useLocalStorageState`

## Phase 3 — Verify
- [ ] T6. `pnpm lint` exits 0 with 0 warnings
- [ ] T7. `pnpm build` exits 0
- [ ] T8. Dev server: HTTP 200 on all pages
- [ ] T9. **No React hydration warning** in dev console when navigating the 4 screens
- [ ] T10. Functional smoke: cart persists on reload, auth persists, ticket reads, tracking token reads

## Phase 4 — Archive
- [ ] T11. Move change to archive, copy spec, write ARCHIVED.md

## Traceability

| Spec scenario | Tasks |
|---|---|
| REQ-HYDR-001 | T1 |
| REQ-HYDR-002 | T2–T5 |
| REQ-HYDR-003 | T2–T5 |
| REQ-HYDR-004 | T6–T10 (verified at runtime) |
