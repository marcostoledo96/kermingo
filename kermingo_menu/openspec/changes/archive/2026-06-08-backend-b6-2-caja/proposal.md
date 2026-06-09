# Proposal: backend-b6-2-caja

## Intent

Close the cashier/payment-admin gaps left after B5 so caja can correct orders, enforce safe payment-state transitions, and operate transfer/cash flows intentionally instead of relying on permissive backend behavior.

## Scope

### In Scope
- Add the admin caja edit flow for `PUT /api/admin/pedidos/:id` with stock re-reconciliation and total recalculation.
- Enforce a payment-state machine for `PATCH /api/admin/pedidos/:id/pago`, including caja-allowed `pendiente -> pagado` for verified transfer or cash sales.
- Add caja-focused pending/unpaid filtering needed for payment follow-up.

### Out of Scope
- Comprobante upload, Drive storage, file proxying, and approval UX/API beyond payment-state compatibility.
- Cocina reads, report exports, frontend/admin UI changes, or schema redesign.

## Capabilities

### New Capabilities
- `cashier-operations`: cashier sale correction, payment administration, and caja-specific payment views.

### Modified Capabilities
- None.

## Approach

Default to **one B6.2 PR** because the slice is cohesive and forecasted to fit the 400-line review budget. Make the split gate explicit: **only split** if the edit-flow stock reconciliation (`PUT /:id`) grows beyond forecast and pushes the change out of budget or risks an unsafe transaction diff; in that case ship payment-state/caja-filter work first and defer edit reconciliation to a chained follow-up.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/api/routes/pedido.routes.js` | Modified | Add admin `PUT /:id` route |
| `backend/src/api/controllers/pedido.controller.js` | Modified | Add edit handler; tighten pago transitions |
| `backend/src/api/models/pedido.model.js` | Modified | Transactional edit + payment transition rules |
| `backend/src/api/schemas/pedido.schema.js` | Modified | Add edit payload validation |
| `backend/tests/caja.test.js` | New | Caja/payment integration coverage |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Stock drift during pedido edit | High | Reuse transactional stock-locking pattern with `SELECT ... FOR UPDATE` |
| Breaking existing loose pago updates | Med | Encode explicit allowed transitions and test caja/admin paths |
| Oversized review due to edit complexity | Med | Trigger chained split only on forecast breach |

## Rollback Plan

Revert B6.2 route/controller/model/schema changes together; if split was used, rollback the edit-flow slice independently and keep the safer payment-state slice intact.

## Dependencies

- Existing B5 pedido/stock transaction behavior.
- B6.3 must consume the same payment-state machine for `comprobante_subido` transitions; Drive/upload work stays deferred to B6.3.

## Success Criteria

- [ ] Caja admins can edit eligible pedidos without corrupting stock or totals.
- [ ] Invalid pago regressions (for example `pagado -> pendiente`) are rejected.
- [ ] B6.3 can add comprobante upload/Drive flows without redefining B6.2 payment rules.
