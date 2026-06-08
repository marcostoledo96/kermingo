# Tasks: backend-b6-1-cocina-configuracion

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~550–650 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Delivery strategy | auto-chain |
| Decision needed before apply | Resolved |
| Chain strategy | feature-branch-chain |

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Cocina module + pedido.model change + test + mount | PR 1 | main base; kitchen list, detail, estado transition |
| 2 | Configuracion module + test + mount | PR 2 | main after PR 1; independent domain, shares index mount |

## Phase 1: Cocina Module Foundation

- [x] 1.1 Create `backend/src/api/schemas/cocina.schema.js` — Zod param/body schemas for kitchen endpoints.
- [x] 1.2 Create `backend/src/api/controllers/cocina.controller.js` — List, detail, PATCH estado handlers; reuse pedido model.
- [x] 1.3 Create `backend/src/api/routes/cocina.routes.js` — Mount GET /pedidos, GET /pedidos/:id, PATCH /pedidos/:id/estado under requireAdmin.
- [x] 1.4 Modify `backend/src/api/models/pedido.model.js` — Add `findKitchenPedidos()` filtering `estado_pedido IN ('recibido','en_preparacion','listo')`.

## Phase 2: Configuracion Module Core

- [ ] 2.1 Create `backend/src/api/schemas/configuracion.schema.js` — Zod for `estado`, `mensaje_publico`, `cena_habilitada_desde`.
- [ ] 2.2 Create `backend/src/api/models/configuracion.model.js` — `findPublic` / `findAdmin` / `updateMinimal` on row `id=1`.
- [ ] 2.3 Create `backend/src/api/controllers/configuracion.controller.js` — Public GET, admin GET/PUT handlers.
- [ ] 2.4 Create `backend/src/api/routes/configuracion.routes.js` — Public GET and admin GET/PUT with requireAdmin.

## Phase 3: Integration

- [x] 3.1 (partial) Modify `backend/src/api/routes/index.routes.js` — Mount `/admin/cocina` completed; `/configuracion-tienda`, `/admin/configuracion-tienda` to be added in PR 2.

## Phase 4: Testing & Verification

- [x] 4.1 (partial) Auth/gate tests created at `backend/tests/cocina.test.js`; full integration tests need DB harness or controller mocks.
- [ ] 4.2 Manual test — curl progression `recibido` -> `en_preparacion` -> `listo` -> `entregado`; invalid jump returns 400; public config read; admin update; invalid `estado` 400.

## Phase 5: Cleanup

- [x] 5.1 Verify no duplicated transition rules in cocina.controller (reuses pedido model state machine).
- [ ] 5.2 Confirm `configuracion_tienda.id=1` exists in seed/docs.
