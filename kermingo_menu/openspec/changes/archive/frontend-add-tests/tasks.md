# Tasks: add-tests

> Single-PR implementation. 6 new files, 2 modified, ~50-60 test cases.

## Phase 1 — Install deps
- [ ] T1. Install `vitest`, `@testing-library/react`, `jsdom`, `@testing-library/dom` as devDependencies
- [ ] T2. Verify `pnpm install` succeeds and packages resolve

## Phase 2 — Config + setup
- [ ] T3. Create `frontend/vitest.config.ts` with jsdom env, globals, `@/` alias, setup file
- [ ] T4. Create `frontend/test/setup.ts` with afterEach cleanup + localStorage.clear

## Phase 3 — Adapter tests
- [ ] T5. Create `frontend/test/mappers.test.ts` with ~18 test cases for `pickProductIcon`, `deriveStockStatus`, `parseCategorias`, `mapProducto`, `mapPedido`
- [ ] T6. Create `frontend/test/admin.test.ts` with ~26 test cases for `apiToAdminProduct`, `adminToApiPayload`, `apiToOrder`, `orderStatusToApi`, `apiToCocinaOrder`, `apiToCajaProduct`, `isCajaSoldOut`, `isCajaLowStock`, `mapOrderStatus`

## Phase 4 — Hook tests
- [ ] T7. Create `frontend/test/use-local-storage.test.ts` with ~8 test cases for `useLocalStorageState`
- [ ] T8. Create `frontend/test/use-api-resource.test.ts` with ~7 test cases for `useApiResource`

## Phase 5 — Package + CI
- [ ] T9. Add `test` and `test:watch` scripts to `frontend/package.json`
- [ ] T10. Add `pnpm test` step to `.github/workflows/frontend-ci.yml`

## Phase 6 — Verify
- [ ] T11. `pnpm test` runs and exits 0 with all tests passing
- [ ] T12. `pnpm lint` still exits 0
- [ ] T13. `pnpm build` still passes
- [ ] T14. `pnpm test:watch` works (manual smoke)

## Phase 7 — Archive
- [ ] T15. Move change to archive, copy spec, write ARCHIVED.md

## Traceability

| Spec scenario | Tasks |
|---|---|
| REQ-TEST-001 | T9 |
| REQ-TEST-002 | T3, T4 |
| REQ-TEST-003 | T5 |
| REQ-TEST-004 | T6 |
| REQ-TEST-005 | T7 |
| REQ-TEST-006 | T8 |
| REQ-TEST-007 | T10 |
