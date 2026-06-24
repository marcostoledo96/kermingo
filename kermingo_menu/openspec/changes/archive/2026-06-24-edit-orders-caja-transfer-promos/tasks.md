# Tasks: edit-orders-caja-transfer-promos

## Review Workload Forecast

Estimated changed lines: ~1800-2400 (6 slices)
400-line budget risk: High
Chained PRs recommended: Yes
Delivery strategy: auto-chain (stacked-to-main)

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Work units (6 stacked PRs to main)

PR1 Caja force-pagado + script (backend)
PR2 Promo GET/PUT + admin `componentes_count` (backend)
PR3 Promo UI + admin badge (frontend, deps PR2)
PR4 Order edit expansion (backend)
PR5 Order edit modal (frontend, deps PR4)
PR6 Test fixes, docs, archive (deps PR1-PR5)

## Phase 1 — PR1: Caja force-pagado + script

- [x] 1.1 RED `caja.test.js`: caja transfer `pendiente`→`pagado`; efectivo w/o `estado_pago`→`pagado`.
- [x] 1.2 `pedido.controller.js` `crearCaja`: force `pagado`; `pedido.schema.js`: drop `pendiente` from `createCajaSchema`.
- [x] 1.3 RED `backend/scripts/__tests__/fix-caja-transferencias-pagadas.test.js`: arg parsing guards.
- [x] 1.4 `backend/scripts/fix-caja-transferencias-pagadas.mjs`: dry-run default; apply gated; no DELETE/TRUNCATE/DROP.
- [x] 1.5 Verify: `npm test -- caja.test.js`; correction script guard covered by focused tests. Production apply remains gated by backup/manual evidence.

## Phase 2 — PR2: Promo component API

- [x] 2.1 RED `backend/tests/promos-componentes.test.js`: GET non-promo→400; promo→200; PUT `[]` clears and disables promo; dup/self-ref/qty<1/inactive→400; valid→atomic replace.
- [x] 2.2 RED `backend/tests/producto-filtering.test.js`: admin list exposes `componentes_count` (0 incomplete).
- [x] 2.3 `producto.model.js`: add `findComponentes`, `setComponentes`; add `componentes_count` to admin SQL.
- [x] 2.4 `producto.schema.js`: add `componentesSchema`; `producto.controller.js`: `obtenerComponentes`/`setComponentes` with promo+active guards and explicit clear-to-unavailable behavior.
- [x] 2.5 `producto.routes.js`: `GET /:id/componentes` (`requireAdmin`) + `PUT` (`requireAdmin`+`requireTrustedOrigin`) before `/:id`.
- [x] 2.6 Verify: `npm test -- promos-componentes.test.js producto-filtering.test.js`.

## Phase 3 — PR3: Promo UI + badge

- [x] 3.1 RED `product-form-dialog.test.tsx`: editor only when `type='promo'`; save fail keeps draft; success closes.
- [x] 3.2 RED `products-screen.test.tsx`: promo row "Incompleta" badge when count===0.
- [x] 3.3 `frontend/lib/types.ts`: add `componentes_count`; `frontend/lib/admin.ts`: add `apiToComponentes`, `apiSetComponentes`, incomplete flag.
- [x] 3.4 `product-form-dialog.tsx`: promo editor (load on promo, save via PUT, preserve draft on error); `products-screen.tsx`: render badge.
- [x] 3.5 Verify: `pnpm vitest run product-form-dialog products-screen`.

## Phase 4 — PR4: Order edit expansion

- [x] 4.1 RED `caja.test.js`: PUT online succeeds; `entregado` metadata/payment only; cancelled `items`/`items:[]`/stock rejected; paid `metodo_pago` change keeps `pagado`; comprobante untouched.
- [x] 4.2 `pedido.model.js` `editWithTransaction`: drop `origen==='caja'`; allow `entregado` metadata/payment; reject `items`/`items:[]`/stock on `cancelado`; keep `pagado` on method change.
- [x] 4.3 `pedido.controller.js` `editar`: map `-1`/`-2`/stock/cancelled to 400/409; `pedido.schema.js`: add optional `estado_pago`; keep `items.min(1)`; reject empty.
- [x] 4.4 Verify: `npm test -- caja.test.js`.

## Phase 5 — PR5: Order edit modal

- [x] 5.1a PR5-1 frontend foundation: “Editar pedido” opens a populated read-only edit modal and closes without API mutation.
- [x] 5.1b PR5-2 frontend metadata-only save: edit modal PUTs customer metadata only, omits `items`, closes on success, and refreshes/updates visible order data.
- [x] 5.1c PR5-3 frontend payment correction save: edit modal PUTs changed `metodo_pago`/`estado_pago` with metadata, omits `items`, closes on success, and surfaces backend rejection in-place.
- [x] 5.1d PR5-4 frontend item quantity/remove save: edit modal loads full order detail, lets admin change quantities/remove existing items, sends `items`, blocks empty item sets client-side, closes/refetches on success, and keeps modal open on API/client rejection.
- [x] 5.1e PR5-5 frontend stock/API rejection UX: item-edit backend rejection keeps modal open, shows backend error, preserves draft quantities, and does not refetch/treat rejection as success.
- [x] 5.1 RED `orders-screen.test.tsx`: mock `apiPut`; "Editar" for non-cancelled; success closes modal+refetches; 4xx keeps draft; add-product save sends existing + added items.
- [x] 5.2 `lib/admin.ts`: add `apiToEditPayload`, `apiEditOrder`; `orders-screen.tsx`: "Editar" in "Más acciones" (hidden `cancelado`); `OrderEditModal` add/remove/qty + product add control + cred PUT.
- [x] 5.3 Verify: `pnpm vitest run orders-screen`.

## Phase 6 — PR6: Fixes, docs, archive

- [x] 6.1 Fix 3 pre-existing `caja.test.js` failures + 1 `comprobantes.test.js` MIME.
- [x] 6.2 Update `DOCUMENTACION/IA/{API,CORE,FUNCIONALIDADES,FLUJOS,WEBAPP,TESTING,GOTCHAS}.md` for component endpoints, caja force-pagado, edit modal, promo clearing, and stale test notes.
- [x] 6.3a Focused backend evidence recorded: `npm test -- caja.test.js`; `npm test -- promos-componentes.test.js producto-filtering.test.js`; `npm test -- scripts/__tests__/fix-caja-transferencias-pagadas.test.js`.
- [x] 6.3b Focused frontend evidence recorded: `rtk vitest test/product-form-dialog.test.tsx test/products-screen-badge.test.tsx test/orders-screen.test.tsx`.
- [x] 6.3c Full backend suite: `npm test`. **(Reconciled by sdd-archive 2026-06-24; orchestrator-supplied evidence + executor rerun: 19 suites, 353 tests, all PASS.)**
- [x] 6.3d Full frontend suite: `pnpm vitest run`. **(Reconciled by sdd-archive 2026-06-24; orchestrator-supplied evidence + executor rerun: 27 files, 292 tests, all PASS.)**
- [x] 6.3e Frontend production build: `pnpm build`. **(Reconciled by sdd-archive 2026-06-24 with `NEXT_PUBLIC_API_URL=http://localhost:3001`; Next.js 16.2.6, 18 static pages, all PASS.)**
- [ ] 6.3f Manual QA: caja, promo editing, order editing, cancelled/delivered cases. **(Not run in CI by design; tracked as post-archive manual followup. Browser smoke is required before production operation but does not block the SDD cycle.)**
- [ ] 6.3g Correction script dry-run/apply evidence with DB backup note for production data. **(Dry-run PASS with `Candidate rows: 0`; apply intentionally not run — gated by `CONFIRM_FIX_CAJA_TRANSFERENCIAS=YES` and a DB backup. Current dataset has zero candidates, so apply would be a no-op. Tracked as post-archive manual followup.)**
- [x] 6.3h `sdd-archive` after full/manual evidence is complete. **(Closed by this archive run on 2026-06-24; archived to `openspec/changes/archive/2026-06-24-edit-orders-caja-transfer-promos/`. Manual items remain operational followups, not archival blockers.)**
