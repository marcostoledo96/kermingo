# Verification Report: edit-orders-caja-transfer-promos

status: PASS

## Executive Summary

Full automated verification rerun on 2026-06-24 PASSES. Backend `npm test` reports 19 suites / 353 tests, frontend `pnpm exec vitest run` reports 27 files / 292 tests, frontend production build succeeds under `NEXT_PUBLIC_API_URL=http://localhost:3001` (Next.js 16.2.6, 18 static pages), and `git diff --check` is clean. The correction script dry-run reports zero candidate rows, so production apply remains an opt-in, backup-gated operation. Pre-existing `caja.test.js` and `comprobantes.test.js` failures are remediated — the prior 18/19 backend suites status and the reportes.test.js fixture pollution are gone. Manual browser smoke and the production apply of the correction script are the only remaining operational steps and are tracked as manual followups, not blockers for archive.

## Critical

None.

## Warnings

- Frontend `pnpm lint` reports 8 `react-hooks/set-state-in-effect` warnings (0 errors). The warnings are concentrated in `admin-session.tsx`, `admin-shell.tsx`, `comprobantes-screen.tsx`, `config-screen.tsx` and pre-existing paths in `orders-screen.tsx` and `product-form-dialog.tsx`. They follow a pattern present before this change and are not blocking the SDD cycle.
- Correction script apply mode was intentionally not run; it requires `CONFIRM_FIX_CAJA_TRANSFERENCIAS=YES`, a database backup, and an operator decision (currently zero candidates, so apply is a no-op on the current dataset anyway).
- Browser manual QA for caja, promo editing, order editing, cancelled/delivered cases is not part of CI and remains a manual followup before production operation.

## Commands Run

| Command | Result |
|---|---|
| `npm test` from `backend/` | PASS — 19 suites passed; 353 tests passed |
| `npm test -- caja.test.js` from `backend/` | PASS — 76/76 |
| `npm test -- promos-componentes.test.js producto-filtering.test.js` from `backend/` | PASS — 48/48 |
| `npm test -- scripts/__tests__/fix-caja-transferencias-pagadas.test.js` from `backend/` | PASS — 14/14 |
| `node scripts/fix-caja-transferencias-pagadas.mjs` from `backend/` | PASS dry-run — `Candidate rows: 0`; no DB mutation |
| `pnpm exec vitest run` from `frontend/` | PASS — 27 files; 292 tests |
| `NEXT_PUBLIC_API_URL=http://localhost:3001 pnpm build` from `frontend/` | PASS — Next.js 16.2.6; 18 static pages prerendered |
| `pnpm lint` from `frontend/` | 8 warnings, 0 errors (pre-existing pattern) |
| `git diff --check` from repo root | PASS — no whitespace errors |

## Source-of-Truth Sync (DOCUMENTACION/IA)

Updated during this change and verified on archive:

| Doc | Coverage |
|---|---|
| `API.md` | `GET /api/admin/productos/:id/componentes`, `PUT /api/admin/productos/:id/componentes`, `componentesSchema`, caja force-pagado, `editWithTransaction` contract |
| `CORE.md` | `editWithTransaction` rules (origen/delivered/cancelled/empty), promo component editing, `combo_producto` semantics |
| `FLUJOS.md` | Stock restoration rules; "Editar pedido" admin flow |
| `FUNCIONALIDADES.md` | Caja force-pagado, edit pedido, promo CRUD scope |
| `GOTCHAS.md` | Gotcha #11 updated for `componentes: []` semantics and the "current composition" caveat |
| `TESTING.md` | PR6 slice note: pre-existing `caja.test.js`/`comprobantes.test.js` failures are remediated, not ignored |
| `WEBAPP.md` | `/admin/pedidos` edit affordance, promo editor wiring, component API hooks |
| `INDEX.md` | No change required — the change reuses existing doc map, did not introduce a new doc |

## Manual Items Remaining (post-archive)

These are operational gates for production use, not for archive. The SDD cycle is closed; the work is not.

1. Browser manual smoke (recommended before production operation):
   - Compra efectivo online.
   - Compra transferencia con comprobante.
   - Login admin.
   - Caja rápida (efectivo + transferencia, force-pagado).
   - Cocina (advance from `en_preparacion` to `listo` to `entregado`).
   - Cancelación con reposición de stock.
2. Browser manual edit coverage:
   - `Editar pedido` metadata-only on a `entregado` order.
   - `Editar pedido` with item quantity change on a non-cancelled order.
   - `Editar pedido` with item removal on a non-cancelled order.
   - `Editar pedido` adding a new active product.
   - `Editar pedido` API rejection (400/409) keeps modal open with draft intact.
   - `Editar pedido` is hidden on a `cancelado` order; metadata is read-only.
3. Promo editor:
   - Save promo components, observe `disponible=0` after explicit `componentes: []`.
   - Incomplete-promo badge shows in admin list when `componentes_count=0`.
   - Attempting to enable an incomplete promo returns 400 and leaves it disabled.
4. Correction script (only if production data still has caja-transfer `pendiente` rows):
   - Take a database backup first: `mysqldump --single-transaction ... > backup_before_fix.sql`.
   - Re-run `node scripts/fix-caja-transferencias-pagadas.mjs` (dry-run must report zero candidates before apply).
   - `CONFIRM_FIX_CAJA_TRANSFERENCIAS=YES node scripts/fix-caja-transferencias-pagadas.mjs --apply` in a maintenance window.

## Generated Artifacts / Status Changes

- Updated this `verify-report.md` (this file) with fresh evidence.
- Added `archive-report.md` to the change folder for OpenSpec trace.
- Persisted Engram observation `sdd/edit-orders-caja-transfer-promos/archive-report` (type: `architecture`, `capture_prompt: false`).
- Working tree: docs/backend/frontend/tests modified; no commit was made.
- No `.next/` production build artifact is committed; build was used for verification only.

## Next Recommended

- Operate the change in production behind a small browser manual QA pass.
- Revisit the "current `combo_producto` composition" debt if/when promo composition starts to be edited after sales (GOTCHAS.md #11).
- Next SDD change can be initiated from `main` or the active development branch.
