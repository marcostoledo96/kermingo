# Proposal: Admin order editing, caja transfer force-pagado, promo components

## Intent

Admins cannot fix generated orders, caja transfers record as unpaid, and promo components lack an admin UI. Add safe order editing, force caja transfers to `pagado`, and expose promo configuration.

## Scope

### In Scope
- Expand order editing to origins and delivered orders; block item edits on cancelled; reject empty item sets.
- Force `estado_pago='pagado'` for caja sales; add correction script.
- Add GET/PUT promo component endpoints and admin UI; badge/block incomplete promos.
- Ensure configured promos reconcile on stock/cancel/edit.
- Update tests/docs.

### Out of Scope
- New payment methods, roles/permissions, audit log, refunds, public order editing.

### Business Rules
- Cancelled orders block item edits.
- Caja sales are paid immediately.
- Incomplete promos cannot be enabled or sold.
- Stock deltas use current `combo_producto` composition.

## Capabilities

### New Capabilities
- `admin-order-edit`: Edit generated orders (all origins, delivered) with items/qty/metadata/payment and transactional reconciliation.
- `promo-component-admin-api`: GET/PUT endpoints for promo components via `combo_producto`.
- `promo-component-admin-ui`: Product form component editor and incomplete badge.

### Modified Capabilities
- `cashier-operations`: Force `estado_pago='pagado'` for caja `efectivo` and `transferencia`; drop pending behavior.
- `admin-pedidos-tabs`: Add edit affordance and modal.

## Approach

TDD hotfix via stacked PRs to `main`, each under 400 lines. Backend slices land before dependent frontend slices.

1. **Backend:** Force caja `pagado` + dry-run/apply correction script.
2. **Backend:** Promo component GET/PUT endpoints.
3. **Frontend:** Promo component UI.
4. **Backend:** Expand order editing to all origins/delivered, block cancelled item edits, prevent empty orders.
5. **Frontend:** Order edit modal in OrdersScreen.
6. **Tests/docs:** Fix pre-existing failures and add coverage.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| Pedido backend | Modified | Edit scope, guards, force-pagado. |
| Producto backend | Modified | Component endpoints. |
| Frontend admin | Modified | Order edit modal; promo UI. |
| Tests/docs | Modified | Fixes, coverage, docs. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Stock corruption on edit | High | `FOR UPDATE` locks, reconciliation tests, dry-run mode. |
| Promo component snapshot drift | Medium | Document in `GOTCHAS.md`. |
| Pre-existing test failures hide regressions | Medium | Fix or isolate before adding tests. |

## Rollback Plan

Revert PRs in reverse slice order. Correction script defaults to `--dry-run`; apply runs in a transaction and requires a DB backup first.

## Dependencies

- Existing `combo_producto` table, JWT admin auth, and v0 design system.
- Slice 3 depends on Slice 2; Slice 5 depends on Slice 4; Slice 6 depends on all.

## Success Criteria

- [ ] Caja orders create with `estado_pago='pagado'`; existing caja transfer `pendiente` records corrected.
- [ ] Admin can edit order items, quantities, metadata, and payment state; cancelled orders block item edits.
- [ ] Incomplete promos cannot be enabled and are hidden from menu/caja.
- [ ] Backend and frontend test suites pass after pre-existing failures fixed.
