# Tasks: B6.2 Backend — Caja Payment, Filter & Correction Flow

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 500–650 (additions + deletions) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Payment machine + Unpaid filter) → PR 2 (Edit correction with stock reconciliation) |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Payment state machine enforcement + unpaid caja filter | PR 1 | Targets `feature/b6-2-caja`; self-contained; no stock reconciliation needed |
| 2 | PUT correction with atomic stock reconciliation | PR 2 | Targets PR 1 branch; heavier transactional logic; includes rollback tests |

## Phase 1: Schema & Route Foundation

- [x] 1.1 In `backend/src/api/schemas/pedido.schema.js`, extend `updateEstadoPagoSchema` to accept `comprobante_subido` and add `solo_pagos_pendientes` query flag.
- [ ] 1.2 In same file, add `editPedidoSchema` validating `items: [{ producto_id, cantidad }]` plus optional metadatos.
- [ ] 1.3 In `backend/src/api/routes/pedido.routes.js`, wire admin `PATCH /:id/pago` and `PUT /:id` under existing admin router.

## Phase 2: Core Implementation — Payment Machine & Filter (PR 1)

- [x] 2.1 In `backend/src/api/models/pedido.model.js`, add `PAGO_TRANSITIONS` map with forward-safe transitions; `pagado` is terminal.
- [x] 2.2 Add `validatePaymentTransition(from, to)` helper returning boolean or throwing `ValidationError`.
- [x] 2.3 In `backend/src/api/controllers/pedido.controller.js`, implement `cambiarPago`: validate transition via model helper, call `model.updateEstadoPago`, return updated pedido; stock must remain untouched.
- [x] 2.4 In `backend/src/api/models/pedido.model.js`, add unpaid-filter branch to list query: when `solo_pagos_pendientes=true`, apply `WHERE estado_pago IN ('pendiente','rechazado')`.
- [x] 2.5 In controller, map `GET /api/admin/pedidos` query to pass `solo_pagos_pendientes` to model.

**PR 1 verification (trace to spec scenarios):**
- [x] Scenario: Valid admin payment progression → assert `cambiarPago` returns 200 and stock unchanged.
- [x] Scenario: Invalid backward payment transition → assert `cambiarPago` returns 400.
- [x] Scenario: Caja cash sale marked paid → assert `PATCH` succeeds `pendiente -> pagado` for `efectivo`.
- [x] Scenario: Caja verified transfer marked paid without comprobante → assert `PATCH` succeeds `pendiente -> pagado` for `transferencia`.
- [x] Scenario: Filter unpaid pedidos for caja → assert `GET` with `solo_pagos_pendientes=true` excludes `pagado`.

## Phase 3: Core Implementation — Edit Correction (PR 2)

- [ ] 3.1 In `backend/src/api/models/pedido.model.js`, implement `editWithTransaction(id, payload)` using explicit transaction.
- [ ] 3.2 Inside transaction: lock pedido `FOR UPDATE`; reject if `estado_pedido = 'cancelado'` or `'entregado'`.
- [ ] 3.3 Read old `pedido_detalle`; compute stock reposition values (restore prior reservations).
- [ ] 3.4 Lock affected `producto` rows `ORDER BY id FOR UPDATE`; validate new `items` against restored-stock view; if any item exceeds available stock, throw `InsufficientStockError` (handled as 409).
- [ ] 3.5 Apply stock delta (restore old + deduct new) atomically; rewrite `pedido_detalle`; recalculate `total`; persist.
- [ ] 3.6 In `backend/src/api/controllers/pedido.controller.js`, implement `editar` wrapping `editWithTransaction`; map model errors to HTTP 409 / 400 / 500.

**PR 2 verification (trace to spec scenarios):**
- Scenario: Edit caja pedido successfully → assert total, detalle, and stock reflect replacement set.
- Scenario: Edit fails for insufficient stock → assert 409 and no mutation in pedido, detalle, or stock.

## Phase 4: Testing & Verification

- [x] 4.1 Create `backend/tests/caja.test.js`; seed via Supertest + mocked auth seam; cover all PR 1 scenarios.
- [ ] 4.2 In same test file, cover PR 2 edit success and rollback under 409.
- [x] 4.3 Add manual test checklist comments at bottom of `caja.test.js` referencing curl commands from spec.

## Phase 5: Cleanup & Contract Docs

- [ ] 5.1 Update inline JSDoc for `PAGO_TRANSITIONS`, `validatePaymentTransition`, and `editWithTransaction`.
- [ ] 5.2 Document `solo_pagos_pendientes` contract in controller-level route comments.
- [ ] 5.3 Verify no stray `console.log` or temporary SQL remains in modified files.
