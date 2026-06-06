# Tasks: Sistema de Pedidos — etapa-5-pedidos

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 550 – 600 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Pedidos complete (all 8 endpoints) | PR 1 | size exception; all logically one work unit |

## Phase 1: Foundation

- [ ] 1.1 Add `InsufficientStockError` to `backend/src/api/utils/errors.js` (409)
- [ ] 1.2 Verify no new npm deps needed (multer deferred)

## Phase 2: Core Implementation

- [ ] 2.1 Create `backend/src/api/schemas/pedido.schema.js`: Zod schemas
  - `createPedidoSchema`, `createCajaPedidoSchema`
  - `pedidoQuerySchema`
  - `updatePedidoSchema`
  - `updateEstadoPedidoSchema`, `updateEstadoPagoSchema`
  - `idParamSchema`
- [ ] 2.2 Create `backend/src/api/models/pedido.model.js` (7 functions, all transactions)
  - `createWithTransaction(pool, datos, items)` → validates stock, deducts combos, inserts pedido+detalle, returns { id, numero, token, total }
  - `createCajaWithTransaction(pool, datos, items)` → similar, origen='caja', opcional estado_pago='pagado'
  - `findByToken(pool, token)` → public seguimiento (no internal ids)
  - `findById(pool, id)` → admin detail with detalle[]
  - `findAllAdmin(pool, filtros)` → paginated list with search by nombre/numero
  - `update(pool, id, datos)` → editable fields only (nombre_cliente, telefono, mesa, observaciones)
  - `updateEstadoPedido(pool, id, estado_pedido)` → validates transitions
  - `updateEstadoPago(pool, id, estado_pago)` → validates payment flow
  - `cancelWithTransaction(pool, id)` → validates cancelable states, restores stock (combos included)
- [ ] 2.3 Create `backend/src/api/controllers/pedido.controller.js` (9 handlers)
  - `crear` → POST /api/pedidos (public)
  - `crearCaja` → POST /api/admin/pedidos/caja (admin)
  - `seguimiento` → GET /api/pedidos/seguimiento/:token (public)
  - `listarAdmin` → GET /api/admin/pedidos (admin)
  - `obtenerAdmin` → GET /api/admin/pedidos/:id (admin)
  - `actualizar` → PUT /api/admin/pedidos/:id (admin)
  - `cambiarEstado` → PATCH /api/admin/pedidos/:id/estado (admin)
  - `cambiarPago` → PATCH /api/admin/pedidos/:id/pago (admin)
  - `cancelar` → PATCH /api/admin/pedidos/:id/cancelar (admin)
- [ ] 2.4 Create `backend/src/api/routes/pedido.routes.js` (publicRouter + adminRouter)
- [ ] 2.5 Mount routers in `backend/src/api/routes/index.routes.js`

## Phase 3: Testing / Verification

- [ ] 3.1 Verify build: `npm run dev` starts without errors
- [ ] 3.2 curl POST /api/pedidos → 201 with numero/token/total
- [ ] 3.3 curl POST /api/pedidos with stock overflow → 409 InsufficientStockError
- [ ] 3.4 curl GET /api/pedidos/seguimiento/:token → 200 public view
- [ ] 3.5 curl GET /api/admin/pedidos → 200 paginated list
- [ ] 3.6 curl GET /api/admin/pedidos/:id → 200 full detail
- [ ] 3.7 curl PATCH estado → valid transitions only
- [ ] 3.8 curl PATCH pago → valid payment transitions
- [ ] 3.9 curl PATCH cancelar → restores stock, validates state
- [ ] 3.10 curl POST /api/admin/pedidos/caja → creates with origen='caja'

## Phase 4: Cleanup / Documentation

- [ ] 4.1 Update `docs/planificacion/17-TAREAS_BACKEND_DETALLADAS.md` — mark B5 as WIP/Done
- [ ] 4.2 Add JSDoc comments on model functions explaining transaction boundaries
- [ ] 4.3 Run `npm run lint` if available; ensure no unused imports
