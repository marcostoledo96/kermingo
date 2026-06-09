# Exploration: backend-b6-2-1-caja-hardening

## Current State

B6.2 (caja payments + edit correction) is implemented across PRs #3 and #4 targeting branch `feature/backend-b6-2-caja-edicion`. The implementation is solid on:

- Transactional stock reconciliation in `editWithTransaction`
- `PAGO_TRANSITIONS` + `validatePaymentTransition` centralize payment state machine
- `solo_pagos_pendientes` filter excludes `pagado` and `cancelado`
- `cancelWithTransaction` restores stock atomically

However, ChatGPT external audit identified payment atomicity, method-aware transitions, and test hygiene gaps that must close before advancing to B6.3 (comprobantes/Drive).

## Affected Areas

| File | Why affected | Estimated lines changed |
|------|-------------|------------------------|
| `backend/src/api/models/pedido.model.js` | `updateEstadoPago` must become atomic (`SELECT ... FOR UPDATE` + transaction). `validatePaymentTransition` needs `metodo_pago` param. `editWithTransaction` must validate `metodo_pago` + `estado_pago` coherence and skip stock reconciliation when `items` absent. | ~80 |
| `backend/src/api/controllers/pedido.controller.js` | `cambiarPago` must map new model return codes (`-2` for cancelled). `editar` must map additional error strings (`no encontrado`, `inactivo`, `no tiene componentes`) to 400 instead of 500. | ~25 |
| `backend/src/api/schemas/pedido.schema.js` | `editPedidoSchema` must make `items` optional with `.min(1).optional()` and add `.refine(...)` requiring at least one field. `updateEstadoPagoSchema` must remove `comprobante_subido` from enum if `metodo_pago=efectivo` — **actually** validation should stay in model, schema can remain permissive because the model will reject invalid transitions. | ~15 |
| `backend/src/api/routes/configuracion.routes.js` | Missing `requireTrustedOrigin` on admin PUT. | ~1 |
| `backend/tests/caja.test.js` | Add `RUN_ID` unique prefix per run. Cleanup must read `estado_pedido` and skip cancelled. Add `pool.end()` in `afterAll`. Add tests for: method-aware transitions, cancelled payment edit blocked, partial metadata edit. | ~85 |

**Total estimated changed lines: ~206** (well under 400-line budget).

## Approaches

### Approach A — Single PR with all fixes
- **Description**: Apply all audit fixes in one branch `feature/backend-b6-2-1-caja-hardening`, targeting `feature/backend-b6-2-caja-edicion`.
- **Pros**: Atomic, no intermediate inconsistent states, single review cycle, fast.
- **Cons**: None at ~206 lines.
- **Effort**: Low

### Approach B — Split into two chained PRs
- **Description**: PR A = payment atomicity + method-aware transitions + cancelled block. PR B = edit coherence + partial edit + test fixes + config route security.
- **Pros**: Smaller review units.
- **Cons**: Overhead for ~206 lines; model changes in PR A and PR B both touch `pedido.model.js`, creating merge risk.
- **Effort**: Medium

### Recommendation
**Approach A — single PR**. The 400-line budget is not at risk, all changes are tightly coupled (they all revolve around payment state consistency), and a single atomic merge avoids leaving the branch in a partially-hardened state.

## Critical vs Important vs Optional

| Severity | Item | File | Fix |
|----------|------|------|-----|
| **CRITICAL** | CRIT-1 `updateEstadoPago` race condition | `pedido.model.js` | Wrap in transaction with `SELECT ... FOR UPDATE` |
| **CRITICAL** | CRIT-2 transitions ignore `metodo_pago` | `pedido.model.js` | Add `metodo_pago` to `validatePaymentTransition` |
| **CRITICAL** | CRIT-3 cancelled pedido payment editable | `pedido.model.js` | Reject if `estado_pedido === 'cancelado'` |
| **IMPORTANT** | IMP-1 edit leaves incoherent `metodo_pago`/`estado_pago` | `pedido.model.js` | Reset `estado_pago` to valid state on method change |
| **IMPORTANT** | IMP-2 edit requires `items` always | `pedido.schema.js` | Make `items` optional; reconcile only if present |
| **IMPORTANT** | IMP-3 edit errors become 500 | `pedido.controller.js` | Map strings to `ValidationError` 400 |
| **IMPORTANT** | IMP-5 test cleanup over-restores cancelled stock | `caja.test.js` | Skip cancelled in cleanup |
| **IMPORTANT** | IMP-6 test prefix not unique | `caja.test.js` | Add `RUN_ID` per run |
| **IMPORTANT** | IMP-7 open MySQL handles | `caja.test.js` | `pool.end()` in `afterAll` |
| **IMPORTANT** | IMP-8 config route missing `requireTrustedOrigin` | `configuracion.routes.js` | Add middleware |
| **OPTIONAL** | SUG-1 tests for method-aware transitions | `caja.test.js` | Add cases |
| **OPTIONAL** | SUG-2 test that `pagado` cannot be overwritten | `caja.test.js` | Add or extend case |
| **OPTIONAL** | SUG-3 metadata-only edit tests | `caja.test.js` | Add cases if IMP-2 implemented |
| **OPTIONAL** | SUG-4 consolidate duplicate items | `pedido.model.js` | Merge duplicate `producto_id` lines |
| **OPTIONAL** | SUG-5 typed domain errors | `pedido.model.js` / `errors.js` | Create `DomainValidationError`, `StockError` |

## Risks

1. **Test flakiness from shared pool**: `--detectOpenHandles` currently flags open MySQL TCP handle. Adding `pool.end()` may cause other test files to fail if they also share the pool. Mitigation: only end pool in `caja.test.js` `afterAll`, or move teardown to a global `jest.setup.js` in a later hygiene PR.
2. **Method-aware transitions may break existing tests**: Current unit tests call `validatePaymentTransition('pendiente', 'comprobante_subido')` without `metodo_pago`. After signature change, all callers must be updated, including `caja.test.js`.
3. **Edit partial without `items` changes response contract**: Frontend/admin currently may always send `items`. If we make it optional, verify no frontend regression (though AGENTS.md says do NOT touch frontend; just ensure backend contract remains backward-compatible when `items` is sent).
4. **Config route adding `requireTrustedOrigin` may break existing admin clients** if origin header is missing in some manual curl tests. Mitigation: only affects PUT; GET remains open.

## Verification Requirements

- `npm test` passes (all existing + new tests)
- `npm run dev` + `curl http://localhost:3001/api/health`
- Specific new tests must cover:
  - `efectivo` `pendiente -> comprobante_subido` returns 400
  - `efectivo` `pendiente -> rechazado` returns 400
  - `transferencia` `rechazado -> comprobante_subido` returns 200 (if adopted)
  - `cancelado` -> payment change returns 400
  - `PUT` with only metadata (no `items`) returns 200
  - `PUT` changing `metodo_pago` leaves coherent `estado_pago`

## Next Recommended Phase

**propose** → **spec** → **design** → **tasks** → **apply** → **verify** → **archive**

Because the audit prompt already provides detailed requirements, we can move quickly through propose/spec/design. The apply phase should be a single work unit given the small line count.

## Ready for Proposal

Yes. The audit verdict provides clear requirements; the codebase has been read; risks are identified and mitigable. Proceed to `sdd-propose`.
