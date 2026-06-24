## Exploration: edit-orders-caja-transfer-promos

### Current State

**Order editing (`editWithTransaction`)**
- `backend/src/api/models/pedido.model.js` → `editWithTransaction` currently:
  - Restricts edits to `origen = 'caja'` only (returns `-2` for online orders).
  - Blocks edits on `cancelado` and `entregado` (returns `-1`).
  - If `data.items` is absent, performs metadata-only edits (nombre, mesa, telefono, observaciones, metodo_pago) without touching stock.
  - If `data.items` is present, performs full transactional reconciliation:
    - Reads existing `pedido_detalle`, expands promos via `combo_producto` to compute stock to restore.
    - Expands new items (including promos) to compute stock to deduct.
    - Locks products with `SELECT ... FOR UPDATE` in deterministic ID order.
    - Validates `stock_actual + restore - deduct >= 0` for each limited product.
    - Applies net delta, recalculates total, deletes old details, inserts new snapshots.
  - Coerces `estado_pago` when `metodo_pago` changes: if new method doesn't allow current state (except `pagado` which is terminal), resets to `pendiente`.
  - Normalizes `telefono_whatsapp` when `telefono_cliente` is updated.
  - Does NOT validate store-open on edit (only on create).
  - Schema (`editPedidoSchema`) requires `items` min(1) if present, and at least one field overall.

**Payment updates (`updateEstadoPago`)**
- Blocks payment changes on `cancelado` (returns `-2`).
- Rejects same-state transitions (returns `-1`).
- Validates method-aware transitions via `validatePaymentTransition`.
- Does NOT touch stock.

**Caja creation (`crearCaja`)**
- `pedido.controller.js` → `crearCaja`:
  - Only forces `estado_pago = 'pagado'` for `efectivo` when `estado_pago === undefined`.
  - For `transferencia`, relies on frontend payload or defaults to `pendiente` inside `createWithTransaction`.
- Frontend `caja-screen.tsx` explicitly sends:
  - `estado_pago: 'pagado'` for efectivo.
  - `estado_pago: 'pendiente'` for transferencia.
- This means caja transfer sales currently arrive as `pendiente`, not `pagado`.

**Product / promo model**
- `combo_producto` table exists (`combo_id`, `producto_id`, `cantidad`).
- `producto.model.js` has `promoTieneComponentes(conn, productoId, tipo)`.
- `producto.controller.js` has safe promo guards:
  - New promos with `disponible=1` are coerced to `0` on create.
  - Update refuses `disponible=1` if promo has no components.
- Public product list (`findAllPublic`) excludes incomplete promos: `AND (p.tipo <> 'promo' OR EXISTS (SELECT 1 FROM combo_producto cp WHERE cp.combo_id = p.id))`.
- **No endpoints exist** for GET/PUT of promo components.
- **No frontend UI** exists for configuring promo components (`product-form-dialog.tsx` has type selector but no component management).

**OrdersScreen UI**
- `/admin/pedidos` (`orders-screen.tsx`) has tabs by estado, detail modal, status advance, mark paid, confirm payment (two-step), cancel, view comprobante.
- **No edit affordance exists**: there is no "Editar pedido" button, no item quantity editor, no add/remove product flow.

**Test infrastructure**
- Backend: Jest + Supertest, ESM with `--experimental-vm-modules`, `--runInBand`.
- 4 known pre-existing failures: 3 in `caja.test.js` (PUT edit reconciliation), 1 in `comprobantes.test.js` (MIME message mismatch).
- Frontend: Vitest + React Testing Library, 238+ tests.
- TDD-ready: unit tests with `jest.unstable_mockModule`, integration tests with real MySQL DB.

### Affected Areas

- `backend/src/api/models/pedido.model.js` — `editWithTransaction` origin restriction, delivered restriction, empty-order guard, promo reconciliation logic (already exists but needs expansion).
- `backend/src/api/controllers/pedido.controller.js` — `crearCaja` force-pagado for transfer; `editar` error mapping.
- `backend/src/api/schemas/pedido.schema.js` — `editPedidoSchema` may need `items` min(1) enforcement and empty-order guard.
- `backend/src/api/models/producto.model.js` — needs `findComponentes`, `setComponentes` helpers for promo CRUD.
- `backend/src/api/controllers/producto.controller.js` — needs GET/PUT component endpoints.
- `backend/src/api/routes/producto.routes.js` — register new component routes.
- `backend/src/api/schemas/producto.schema.js` — schema for component payload.
- `frontend/components/admin/orders-screen.tsx` — add edit modal/flow for orders (items, quantities, metadata, payment state).
- `frontend/components/admin/product-form-dialog.tsx` — add promo component configuration UI.
- `frontend/lib/admin.ts` — new mappers for order editing payload, promo components.
- `frontend/lib/api.ts` — already has `apiPut`, no changes needed.
- `backend/tests/caja.test.js` — fix pre-existing failures + add new tests.
- `backend/tests/comprobantes-aprobar-cocina.test.js` — pre-existing MIME mismatch.
- `frontend/test/orders-screen.test.tsx` — add edit flow tests.
- `DOCUMENTACION/IA/API.md`, `CORE.md`, `WEBAPP.md`, `GOTCHAS.md` — update docs.

### Approaches

1. **Monolithic PR (all at once)**
   - Pros: Single review cycle, no intermediate inconsistencies.
   - Cons: Far exceeds 400-line budget. High risk of merge conflicts, review fatigue, missed edge cases. Chained PR not possible because slices depend on each other (backend endpoints must exist before frontend UI).
   - Effort: High

2. **Sliced implementation (recommended)**
   - Slice 1 — Backend: Force `estado_pago='pagado'` for all caja sales (efectivo + transferencia) regardless of frontend payload. Add dry-run/apply correction script. (~100–150 lines)
   - Slice 2 — Backend: Promo component endpoints (`GET /admin/productos/:id/componentes`, `PUT /admin/productos/:id/componentes`) with validation. (~150–250 lines)
   - Slice 3 — Frontend: Promo component UI in product form, badge for incomplete promos, prevent enabling incomplete promos. (~200–300 lines)
   - Slice 4 — Backend: Expand `editWithTransaction` to allow editing all orders (not just caja), allow payment state changes on delivered, block item edits on cancelled, prevent empty orders. (~250–350 lines)
   - Slice 5 — Frontend: Order edit UI in OrdersScreen (edit metadata, add/remove/change quantities, payment state toggle). (~300–400 lines)
   - Slice 6 — Tests & docs: Update all affected tests and documentation. (~200–400 lines)
   - Pros: Each slice fits review budget, testable independently, lower risk.
   - Cons: Requires orchestrator to sequence slices (backend before frontend).
   - Effort: Medium per slice, High total

3. **Minimal backend-only hotfix (skip frontend promo UI, skip order edit UI)**
   - Only do Slice 1 + Slice 4 backend + dry-run script. Leave frontend edits for later.
   - Pros: Fastest, lowest risk, addresses the most critical data integrity issues (caja transfer not paid, admin can't fix orders).
   - Cons: Admin still has no UI to edit orders or configure promos — requires direct API usage or DB scripts.
   - Effort: Medium

### Recommendation

**Choose Approach 2 (Sliced), but accept that chained PRs are mandatory.**

The scope is too large for a single PR under the 400-line budget. The orchestrator should plan 5–6 sequential slices, each with its own SDD pipeline (explore already done → propose → spec → design → tasks → apply → verify → archive). Slices 1 and 2 can be parallelized because they touch different domains (caja payment vs product components). Slice 3 depends on Slice 2. Slice 5 depends on Slice 4.

If time pressure is extreme, fallback to Approach 3 (backend-only) first, then follow with frontend slices.

### Risks

- **Stock corruption on order edit**: Expanding `editWithTransaction` to all origins and delivered orders increases blast radius. Any bug in reconciliation affects live inventory. Must add defensive tests for promo component changes during edit.
- **Promo component snapshot drift**: `GOTCHAS.md` #11 documents that cancel/edit uses current `combo_producto` composition. If admin changes a promo's components after sales, cancel/edit will restore/deduct wrong amounts. This is accepted MVP debt, but the new promo component UI makes it more likely.
- **Pre-existing test failures**: 3 caja.test.js failures and 1 comprobantes.test.js failure will confuse verification. Fix or clearly separate these before adding new tests.
- **Caja transfer force-pagado may break existing unpaid-follow-up flows**: The `solo_pagos_pendientes` filter and caja UI assume caja transfer can be `pendiente`. Forcing `pagado` removes that state. Verify that caja transfer "pendiente de verificación" flow is intentionally removed per user request.
- **Empty order prevention**: Both backend schema and frontend UI must enforce at least one item. Backend currently allows metadata-only edits (no items) which is correct for partial edits, but a full replace with empty items must be rejected.
- **Frontend OrdersScreen complexity**: Adding inline edit to the existing orders screen is high-touch. Consider a dedicated "Editar pedido" modal/sheet to avoid destabilizing the existing tab/card layout.

### Ready for Proposal

**Yes**, with the condition that the orchestrator acknowledges **chained PRs are required** and selects either:
- **Full sliced plan** (6 slices, sequential backend→frontend), or
- **Backend-only emergency slice** (Slices 1+4) first, then frontend follow-up.

The next step is for the orchestrator to confirm the slicing strategy so `sdd-propose` can generate per-slice proposals.
