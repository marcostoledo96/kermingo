# Change: frontend-add-tests

## Why
We just added CI (`frontend-add-ci`) that runs `pnpm lint` and `pnpm build` on every PR. That's a great safety net, but it doesn't catch **logic regressions** — only syntax and type errors. A new test suite adds confidence that:
- The adapter functions (`apiToAdminProduct`, `apiToOrder`, `apiToCocinaOrder`, `adminToApiPayload`, `mapPedido`, etc.) continue to map the API correctly
- The icon inference from product names keeps matching the expected types
- The stock status derivation handles edge cases
- The new hooks (`useLocalStorageState`, `useApiResource`) behave correctly across renders
- Future refactors (e.g., switching hooks, renaming types) don't silently break business logic

Tests are an investment in refactor confidence. The adapters and hooks are the highest-value targets because:
- They sit at the boundary between the API and the UI
- They are pure functions (easy to test) or well-isolated hooks
- They have been the subject of multiple recent changes
- A bug in them propagates everywhere

## What changes
- **NEW** devDependencies in `frontend/package.json`:
  - `vitest` (the runner)
  - `@vitest/ui` (optional UI, skip)
  - `@testing-library/react` (for hook tests)
  - `jsdom` (for DOM mocking — localStorage, window, etc.)
  - `@testing-library/dom` (peer dep)
  - `vitest-tsconfig-paths` (or similar, for `@/` path resolution — actually we can use vitest's built-in)
- **NEW** `frontend/vitest.config.ts` — Vitest config with jsdom env, `@/` alias, setup file
- **NEW** `frontend/test/setup.ts` — global setup (e.g., `localStorage` polyfill if needed, jest-dom matchers)
- **NEW** `frontend/test/` directory with 4 test files:
  - `test/mappers.test.ts` — `pickProductIcon`, `deriveStockStatus`, `parseCategorias`, `mapProducto`, `mapPedido`
  - `test/admin.test.ts` — `apiToAdminProduct`, `adminToApiPayload`, `apiToOrder`, `orderStatusToApi`, `apiToCocinaOrder`, `apiToCajaProduct`, `isCajaSoldOut`, `isCajaLowStock`, `mapOrderStatus`
  - `test/use-local-storage.test.ts` — `useLocalStorageState` (read, write, default, custom parse, custom serialize, SSR, event listeners)
  - `test/use-api-resource.test.ts` — `useApiResource` (initial load, success, error, refetch, silent refetch, setData)
- **MODIFIED** `frontend/package.json`:
  - Add `test` and `test:watch` scripts
- **MODIFIED** `.github/workflows/frontend-ci.yml`:
  - Add `pnpm test` step after `pnpm lint`

## Why Vitest
- **Faster than Jest** (Vite-style transform, native ESM)
- **Native ESM** — works with our `"type": "module"` setup (well, frontend doesn't have type:module, but vitest handles it)
- **Jest-compatible API** — most of `describe`/`it`/`expect` works
- **Built-in TypeScript support** — no Babel needed
- **Same test pattern** we'd use in any modern project

## Why @testing-library/react for hooks
- Official React hook testing utility
- `renderHook` lets us test custom hooks in isolation
- We don't need a full DOM for most hook tests; jsdom provides one anyway

## Test file structure

```
frontend/
├── vitest.config.ts
├── test/
│   ├── setup.ts
│   ├── mappers.test.ts
│   ├── admin.test.ts
│   ├── use-local-storage.test.ts
│   └── use-api-resource.test.ts
```

## Impact
- 6 new files: 1 config, 1 setup, 4 tests
- 2 modified files: `package.json`, `.github/workflows/frontend-ci.yml`
- New devDependencies: ~4 packages
- CI runtime increase: ~5-10 seconds (vitest is fast)

## Out of scope
- Component tests (using RTL's `render` + `screen`) — separate change. Most components are tied to Next.js router and context providers; testing them requires more setup.
- E2E tests (Playwright) — separate change. The Playwright MCP tools are not currently available in this session.
- Coverage reports — separate change. Easy to add (`vitest --coverage`) but we don't need it now.
- Snapshot tests — never do these. They break on every change and don't catch real bugs.
- Mocking the network (MSW) — not needed. `useApiResource` accepts a fetcher function; we can pass a mock.
- Testing the `DashboardScreen` (which has the pre-existing `tones` issue) — separate change, fix that first.

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Vitest doesn't play well with Next.js 16 / Turbopack | Low | Vitest doesn't use Turbopack; it uses Vite's own transform. They're independent. |
| jsdom doesn't support some `localStorage` APIs we use | Low | jsdom supports all standard `localStorage` APIs |
| Hook tests with `renderHook` need DOM environment | Low | jsdom is the default for vitest with `environment: 'jsdom'` |
| `pnpm test` in CI fails because of a flaky test | Low | Tests are deterministic; no async timing dependencies |
| Path alias `@/` doesn't resolve in vitest | Low | Configure `resolve.alias` in vitest.config.ts |
| Adding ~4 devDeps increases install time | Low | All small packages, install adds <5s |

## Rollback
Delete the 6 new files, revert the 2 modified files. CI reverts to running just lint + build.

## Dependencies
- `vitest` (~MIT license)
- `@testing-library/react` (~MIT license)
- `jsdom` (~MIT license)
- All installable from npm

## Success criteria
- [ ] `pnpm test` runs and exits 0
- [ ] All 4 test files have passing tests (estimated ~40-50 test cases)
- [ ] `pnpm lint` still exits 0
- [ ] `pnpm build` still passes
- [ ] CI workflow includes `pnpm test` and passes
- [ ] `pnpm test:watch` works in dev

## Single-PR decision
Single PR. 6 new files, 2 modified. No source code changes (only test files). ~40-50 test cases.
