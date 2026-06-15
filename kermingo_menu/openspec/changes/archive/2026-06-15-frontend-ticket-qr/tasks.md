# Tasks: frontend-ticket-qr

## Phase 1 — Scaffold

| # | Task | Files | Done |
|---|------|-------|------|
| 1.1 | Add `qrcode.react` to `frontend/package.json` deps, run `pnpm install` | `frontend/package.json` | [x] |
| 1.2 | Wrap `<TrackingScreen />` in `<Suspense>` inside `app/seguimiento/page.tsx` | `frontend/app/seguimiento/page.tsx` | [x] |

## Phase 2 — Ticket QR

| # | Task | Files | Spec | Done |
|---|------|-------|------|------|
| 2.1 | Replace `<FauxQR>` with `<QRCodeSVG>` from `qrcode.react`. Value = `${window.location.origin}/seguimiento?token=${order.token}`. Use `typeof window !== 'undefined'` guard. Remove `FauxQR` function. | `frontend/components/menu/ticket-screen.tsx` | S1, S2 | [x] |
| 2.2 | Write test `test/ticket-screen.test.tsx`: render `TicketScreen` with mock `LastOrder` in localStorage, assert `<QRCodeSVG>` value matches expected URL and contains no personal data. | `frontend/test/ticket-screen.test.tsx` | S1, S2 | [x] |

## Phase 3 — Tracking URL Token

| # | Task | Files | Spec | Done |
|---|------|-------|------|------|
| 3.1 | Import `useSearchParams` in `TrackingScreen`. On mount, read `token` param from URL. If present, use it (over localStorage) for initial `fetchByToken`. Update localStorage with URL token. | `frontend/components/menu/tracking-screen.tsx` | S5, S6, S7 | [x] |
| 3.2 | Write test `test/tracking-screen-token.test.tsx`: mock `useSearchParams` returning `?token=abc`, verify `fetchByToken('abc')` called on mount. Test missing token shows input. Test URL token overrides localStorage. | `frontend/test/tracking-screen-token.test.tsx` | S5, S6, S7 | [x] |

## Phase 4 — Verify

| # | Task | Spec | Done |
|---|------|------|------|
| 4.1 | **Contract check**: QR URL param `token` must match `useSearchParams` key `token` in tracking screen. | S1 ↔ S5 | [x] |
| 4.2 | Run `pnpm build`, `pnpm lint`, `pnpm test` — all pass. | S3 | [x] |
| 4.3 | Manual: open `/confirmado`, `window.print()`, verify QR legible at 168px. | S4 | [ ] |

## Remediation — Post-verify Fixes

| # | Issue | Root Cause | Fix | Files | Done |
|---|-------|------------|-----|-------|------|
| R.1 | `/confirmado` runtime crash with React error #185 (Maximum update depth exceeded) | `useLocalStorageState`'s `getSnapshot` called `JSON.parse()` on every invocation, creating new object references each time. `useSyncExternalStore` detected the changing references as state changes, causing infinite re-renders. | Added `useRef`-based cache in `getSnapshot`: when raw localStorage string hasn't changed, return the same parsed object reference. Invalidate cache on localStorage changes or errors. | `frontend/lib/use-local-storage.ts` | [x] |
| R.2 | Backend Jest open handle: `TCPWRAP` from `comprobantes.drive-mock.test.js:41` | `pool` (mysql2 connection) imported but never closed in the test file's `afterAll` hooks. Other test files properly call `pool.end()` in their final `afterAll`. | Added `pool.end()` in a final `afterAll` block at the end of the test file, matching the pattern in `caja.test.js`. | `backend/tests/comprobantes.drive-mock.test.js` | [x] |
| R.3 | QR SVG size 144px below spec minimum of 168px | Design said "144px QR inside 168px container", but spec requires QR at minimum 168×168 CSS pixels. | Changed `QRCodeSVG size={144}` to `size={168}` and updated test assertion from `'144'` to `'168'`. | `frontend/components/menu/ticket-screen.tsx`, `frontend/test/ticket-screen.test.tsx` | [x] |

## Regression Tests Added

| Test | File | Catches |
|------|------|---------|
| `useLocalStorageState` referential stability for objects | `frontend/test/use-local-storage.test.ts` | Infinite re-render loop (React #185) when localStorage has an object value |
| `useLocalStorageState` cache invalidation on value change | `frontend/test/use-local-storage.test.ts` | Stale cache when localStorage is updated |
| TicketScreen renders with order data (mocked hook) | `frontend/test/ticket-screen.test.tsx` | Regression: TicketScreen fails to render ticket view |

## Traceability

| Scenario | Test | Assertion |
|----------|------|-----------|
| S1: QR encodes correct URL | `ticket-screen.test.tsx` | `QRCodeSVG` value === `${origin}/seguimiento?token=abc123` |
| S2: No private data in QR | `ticket-screen.test.tsx` | value contains only `token` param |
| S3: No hydration mismatch | build + test + runtime | `pnpm build` passes, runtime browser test with localStorage shows no React #185 |
| S4: QR readable on print | manual | Visual check of `window.print()` — QR is now 168px per spec |
| S5: QR scan auto-loads | `tracking-screen-token.test.tsx` | `fetchByToken` called with URL token on mount |
| S6: Missing token shows form | `tracking-screen-token.test.tsx` | No auto-fetch when `?token` absent |
| S7: URL token over localStorage | `tracking-screen-token.test.tsx` | URL token used, not localStorage |

## Review Workload Forecast

| Gate | Lines | Files | Complexity |
|------|-------|-------|------------|
| Phase 1 | ~5 | 2 | trivial |
| Phase 2 | ~30 | 2 | low |
| Phase 3 | ~25 | 1 | medium |
| Phase 4 | ~80 (tests) | 2 | medium |
| **Total** | **~140** | **5** | **low-medium** |

**Guard lines**: If `qrcode.react` incompatible with React 19 / Next.js 16, fall back to `qrcode` (pure JS) with a thin wrapper. Decision needed before Phase 2.

## User Decision Needed

**No** — self-contained, no new API, no migration. Proceed to `sdd-apply`.

## Implementation Order

Phase 1 → Phase 2 (partial verify after 2.2) → Phase 3 (partial verify after 3.2) → Phase 4 (full integration verify).

## Readiness for sdd-apply

**Ready.** All tasks concrete, file-pathed, independently verifiable. Partial verify after each phase.