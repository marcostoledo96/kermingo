# Tasks: B6.2.1 — Hardening de pagos, edición y tests de caja

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~160-190 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Scenario → Test → Task Traceability

| Scenario (from Spec) | Domain | Task(s) | Test File / Assert |
|----------------------|--------|---------|-------------------|
| `updateEstadoPago` transactional with `SELECT ... FOR UPDATE` | atomic-payment-update | 1.1, 1.2 | `caja.test.js` — concurrency block test |
| Returns -2 for cancelled pedidos | atomic-payment-update | 1.2 | Controller maps -2 → 400 in `cambiarPago` |
| `validatePaymentTransition(from, to, metodoPago)` | payment-state-machine-method-aware | 1.3 | `caja.test.js` — method-aware assertions |
| Same-state no-op returns true | payment-state-machine-method-aware | 1.3 | Unit test: same-state → true |
| `efectivo` rejects `comprobante_subido` | payment-state-machine-method-aware | 1.3 | Unit test: efectivo pendiente → comprobante_subido → false |
| `transferencia` allows `rechazado → comprobante_subido` | payment-state-machine-method-aware | 1.3 | Unit test: transferencia rechazado → comprobante_subido → true |
| editPedidoSchema items optional + refine at-least-one-field | partial-order-edit | 2.1 | Schema test: no items + no metadata → reject; metadata-only → accept |
| editWithTransaction skips stock when !data.items | partial-order-edit | 2.2 | Integration: PUT nombre_cliente only → 200, stock unchanged |
| metodo_pago change coerces estado_pago to pendiente | order-edit-caja | 2.3 | Integration: PUT transferencia→efectivo with comprobante_subido → estado_pago pendiente |
| pagado stays pagado on metodo_pago change | order-edit-caja | 2.3 | Integration: PUT cambio metodo_pago on pagado → pagado unchanged |
| Model string errors → ValidationError/InsufficientStockError | order-edit-caja | 2.4 | Controller error mapping: "no encontrado" → 400, "Stock insuficiente" → 409 |
| RUN_ID per test run, skip cancelado in cleanup, pool.end() | caja-test-hygiene | 3.1 | `caja.test.js` structure |
| New test cases: transitions by method, partial edits, cancelled payment block | caja-test-hygiene | 3.2 | `caja.test.js` new describe blocks |
| `requireTrustedOrigin` on `PUT /api/admin/configuracion-tienda` | admin-config-security | 2.5 | Security middleware integration |

## Phase 1: Model — State machine & atomic transactions

- [x] 1.1 Refactor `PAGO_TRANSITIONS` → `transitionsByMethod` dictionary keyed by `efectivo`/`transferencia`. Each method has its own valid transition map. Keep `validatePaymentTransition` as a pure function that reads from `transitionsByMethod`.
- [x] 1.2 Wrap `updateEstadoPago` in a `conn.getConnection()` transaction with `SELECT id, estado_pedido, estado_pago FROM pedido WHERE id = ? FOR UPDATE`. Return -2 if `estado_pedido = 'cancelado'`. Pass `metodo_pago` to `validatePaymentTransition`. Rollback on validation failure.
- [x] 1.3 In `editWithTransaction`: guard stock reconciliation loop with `if (data.items)`. When `metodo_pago` changes and `estado_pago` is invalid for new method, coerce to `pendiente`. Keep `pagado` terminal across method changes.

## Phase 2: Controller / Schema / Route wiring

- [x] 2.1 Make `items` optional in `editPedidoSchema` via `.optional()` chaining. Add `.refine()` that requires at least one field across `items`, `nombre_cliente`, `mesa`, `telefono_cliente`, `observaciones`, `metodo_pago`.
- [x] 2.2 In `editar` controller: catch model errors (`no encontrado o inactivo`, `no tiene componentes`, `Stock insuficiente`) and map to `ValidationError` (400) or `InsufficientStockError` (409) via `next()`.
- [x] 2.3 In `cambiarPago` controller: map `result === -2` (cancelled pedido) to `ValidationError('No se puede modificar pago de un pedido cancelado')`.
- [x] 2.4 In `editWithTransaction`: throw specific string errors for "no encontrado o inactivo", "no tiene componentes", and "Stock insuficiente" so the controller can distinguish them from generic 500s.
- [x] 2.5 Add `requireTrustedOrigin` import and middleware to `PUT /api/admin/configuracion-tienda` in `configuracion.routes.js`.

## Phase 3: Test hygiene & new test coverage

- [x] 3.1 Add `const RUN_ID = 'TEST-B6-2-${Date.now()}-${Math.random().toString(36).slice(2,6)}'` at top of `caja.test.js`. Refactor `limpiarPedidosDeTest` to check `estado_pedido` and skip `cancelado` orders in stock restoration. Add `afterAll(async () => pool.end())`.
- [x] 3.2 Add new test describe blocks:
  - `Caja payment-state-machine method-aware (unit)`: verify method-specific transitions (`efectivo` rejects `comprobante_subido`; `transferencia` allows `rechazado → comprobante_subido`; same-state no-op)
  - `Caja partial edit (integration)`: create pedido, PUT only `{nombre_cliente: "nuevo"}`, assert 200 and stock unchanged
  - `Caja edit metodo_pago coherence (integration)`: create transferencia pedido with `comprobante_subido`, PUT to `efectivo`, assert `estado_pago → pendiente`
  - `Caja cancelled payment block (integration)`: create pedido, cancel via PATCH cancelar, then PATCH pago, assert 400

## Phase 4: Verification

- [x] 4.1 Run `npm test` from `backend/` — all existing tests pass, new tests pass.
- [x] 4.2 Run `npm run lint` from `backend/` — no new lint errors.
- [ ] 4.3 Manual checklist (from specs): curl-based verification of payment transitions, partial edit, cancelled block, config route origin guard. Partial remediation: 403 fix tested via automated test; concurrent same-state rejection tested via automated test. Remaining items: concurrent curl race test (server must be running).