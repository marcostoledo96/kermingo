# Archived: frontend-add-tests

**Date:** 2026-06-14
**Status:** ARCHIVED — verdict PASS

## Summary
- Created: `openspec/specs/add-tests/spec.md` (durable capability for frontend tests)
- 4 new test files: `test/mappers.test.ts`, `test/admin.test.ts`, `test/use-local-storage.test.ts`, `test/use-api-resource.test.ts`
- 2 new config files: `vitest.config.ts`, `test/setup.ts`
- **78 test cases** all passing
- New devDeps: vitest, @testing-library/react, jsdom, @testing-library/dom
- Added `pnpm test` and `pnpm test:watch` scripts to package.json
- Added `Test` step to CI workflow (between Lint and Build)
- `pnpm test` exits 0 in 2.00s
- `pnpm lint` still 0/0
- `pnpm build` still 14/14

## Test coverage by file
- mappers.test.ts: **27 tests** (pickProductIcon, deriveStockStatus, parseCategorias, mapProducto, mapPedido)
- admin.test.ts: **36 tests** (apiToAdminProduct, adminToApiPayload, apiToOrder, orderStatusToApi, apiToCocinaOrder, apiToCajaProduct, isCajaSoldOut, isCajaLowStock, mapOrderStatus)
- use-local-storage.test.ts: **8 tests** (default, stored, write, functional update, custom parse, custom serialize, parse failure, cross-hook sync)
- use-api-resource.test.ts: **7 tests** (initial load, error, refetch, silent refetch, setData replace, setData functional, fetcher identity change)

## One bug found and fixed during apply
`isCajaSoldOut({ stockLimited: true, stockActual: null })` returns `true` (treating null as sold-out for safety). My initial test expected `false`. Updated the test to assert the actual (correct) behavior.

## Out of Scope (next changes)
- Component tests with RTL render+screen (separate change)
- E2E tests with Playwright (separate change)
- Coverage reports (`pnpm coverage`) — already configured in vitest.config but not enforced
- Testing `AuthProvider`, `CartProvider`, screens (need router + provider mocks)
- Testing `DashboardScreen` (fix the pre-existing `tones` issue first)
