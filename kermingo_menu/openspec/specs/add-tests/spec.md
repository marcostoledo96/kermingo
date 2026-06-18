# Spec: add-tests (delta)

## ADDED Requirements

### REQ-TEST-001 — Test runner setup
The frontend MUST have `pnpm test` and `pnpm test:watch` scripts defined in `frontend/package.json`. The `pnpm test` script MUST run all tests in single-run mode and exit 0 on success, 1 on failure.

### REQ-TEST-002 — Vitest configuration
A `vitest.config.ts` file MUST exist in `frontend/` that configures:
- `environment: 'jsdom'` for DOM-mocking tests
- `globals: true` so test files don't need to import `describe`/`it`/`expect`
- `resolve.alias` for the `@/` path to map to the project root
- `setupFiles` to import the global test setup

### REQ-TEST-003 — Mappers tests
`test/mappers.test.ts` MUST test the pure functions in `lib/mappers.ts`:
- `pickProductIcon`: at least 5 test cases covering different product types (pizza, sandwich, soda, default fallback)
- `deriveStockStatus`: at least 4 test cases (ilimitado, agotado, bajo, disponible)
- `parseCategorias`: at least 4 test cases (single categoria, multiple, none, null, mixed case)
- `mapProducto`: at least 3 test cases (full product, missing fields, with categorias)
- `mapPedido`: at least 2 test cases (with items, empty items)

### REQ-TEST-004 — Admin adapter tests
`test/admin.test.ts` MUST test the pure functions in `lib/admin.ts`:
- `apiToAdminProduct`: at least 3 test cases (string precio, number precio, null stock_actual)
- `adminToApiPayload`: at least 3 test cases (stock limited, stock unlimited, with all fields)
- `apiToOrder`: at least 3 test cases (with items, without items, with comprobante_archivo_id)
- `orderStatusToApi`: at least 5 test cases (one per OrderStatus)
- `apiToCocinaOrder`: at least 2 test cases (with items, without items)
- `apiToCajaProduct`: at least 2 test cases (with image, without)
- `isCajaSoldOut`: at least 3 test cases (limited+0, limited+5, unlimited+0)
- `isCajaLowStock`: at least 3 test cases (limited+0, limited+below, limited+above)
- `mapOrderStatus`: at least 5 test cases (one per backend estado_pedido)

### REQ-TEST-005 — useLocalStorageState hook tests
`test/use-local-storage.test.ts` MUST test the `useLocalStorageState` hook using `@testing-library/react`'s `renderHook`:
- Initial value matches `defaultValue` when localStorage is empty
- Initial value matches stored value when localStorage has the key
- Setter writes to localStorage
- Functional update receives the current value
- Custom `parse` and `serialize` are used
- Setting the same value doesn't trigger an infinite loop
- Two components reading the same key stay in sync (via custom event)

### REQ-TEST-006 — useApiResource hook tests
`test/use-api-resource.test.ts` MUST test the `useApiResource` hook:
- Initial load fetches and populates `data`
- Error from fetcher populates `error` and sets `data` to null
- `refetch()` re-fetches and updates `data`
- `refetch({ silent: true })` does NOT toggle `loading`
- `setData(updater)` updates the data
- Functional update via `setData(prev => ...)` works
- Custom fetcher re-runs when its identity changes

### REQ-TEST-007 — CI includes test step
The CI workflow at `.github/workflows/frontend-ci.yml` MUST include a `pnpm test` step that runs after the lint step and before the build step. If any test fails, the CI job MUST fail.

## MODIFIED Requirements
None.

## Type updates
None.

## Testing strategy
- **Pre-apply** (verify no tests exist): `grep -r "describe\|it(" frontend/lib` returns nothing relevant.
- **Apply**: install vitest + deps, create config + tests.
- **Post-apply**:
  - `pnpm test` exits 0 with all tests passing
  - `pnpm lint` still exits 0
  - `pnpm build` still passes
  - `pnpm test:watch` works in dev (manual smoke)
  - CI workflow includes the test step (verify by reading the YAML)

## Out of scope
- Component tests with RTL `render` + `screen` (separate change)
- E2E tests with Playwright (separate change)
- Coverage reports (separate change)
- Mocking the network with MSW (separate change)
- Testing `DashboardScreen` (separate change — fix the pre-existing `tones` issue first)
- Testing `AuthProvider` (separate change — needs a router mock)
- Testing `CartProvider` (separate change — needs React Testing Library + localStorage mock)

## Estimated test count
- mappers.test.ts: ~18 test cases
- admin.test.ts: ~26 test cases
- use-local-storage.test.ts: ~8 test cases
- use-api-resource.test.ts: ~7 test cases
- **Total**: ~59 test cases
