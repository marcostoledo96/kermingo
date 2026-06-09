# Tasks: backend-b6-2-caja-review-fixes

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: feature-branch-chain
400-line budget risk: Low

## Phase 1: Setup

- [x] 1.1 Verificar que HEAD está en `feature/backend-b6-2-caja`. Si no, `git checkout feature/backend-b6-2-caja`.
- [x] 2.1 `backend/src/api/controllers/pedido.controller.js:145` — cambiar `'Transicion de estado de pago no valida'` → `'Transición de estado de pago no válida'`.
- [x] 3.1 `backend/src/api/models/pedido.model.js:56` — cambiar `if (from === to) return true;` → `if (from === to) return false;` en `validatePaymentTransition`.
- [x] 3.2 `backend/tests/caja.test.js` — actualizar test unitario `'same state is always valid'` para esperar `false` en vez de `true`.
- [x] 3.3 `backend/tests/caja.test.js` — agregar test de integración `PATCH pagado → pagado (idempotente) → 400`.
- [x] 4.1 `backend/tests/caja.test.js` — reescribir `limpiarPedidosDeTest()` para iterar pedidos test, llamar `cancelWithTransaction(pool, id)` antes del DELETE.
- [x] 4.2 `backend/tests/caja.test.js` — agregar `afterAll(async () => { await pool.end(); })` al final del archivo.
- [x] 5.1 `backend/tests/caja.test.js` — crear fixtures con `nombre_cliente` único: `TEST-FILTER-PENDIENTE`, `TEST-FILTER-PAGADO`, `TEST-FILTER-CANCELADO`.
- [x] 5.2 `backend/tests/caja.test.js` — filtrar respuestas por `nombre_cliente` que contenga `TEST-FILTER-`, validando contra fixtures propios.
- [x] 5.3 `backend/tests/caja.test.js` — agregar SELECT post-PATCH a `producto.stock_actual` para producto 5 (Pancho), verificar invariante.
- [x] 6.1 `npm test` — 25/25 caja tests pasan.
- [x] 6.2 `tasks.md` actualizado.

## Estimación de líneas cambiadas

| Archivo | Líneas |
|---------|--------|
| `pedido.controller.js` | ~1 |
| `pedido.model.js` | ~1 |
| `caja.test.js` | ~50 |
| `tasks.md` | ~5 |
| **Total** | **~60** |

Dentro del budget de 400. Sin chained PRs. Un solo commit sobre `feature/backend-b6-2-caja`.