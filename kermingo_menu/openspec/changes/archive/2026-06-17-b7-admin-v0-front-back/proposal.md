# Change: b7-admin-v0-front-back

## Intent

Integrate the new v0-generated admin reference into the real Kermingo app while closing the B7 front/back contract changes from `docs/planificacion/55-INSTRUCCIONES_OPENCODE_ADMIN_B7_FRONT_BACK.md`.

The admin must become an operational tool for the event: notebook-first, tablet-friendly, with persistent navigation, real backend data where endpoints exist, and honest placeholders where they do not. The public customer flow must become transfer-only; cash remains available only from Caja rápida.

The visual reference is read-only:

```txt
diseno-de-landing-kermingo/
```

All real frontend work happens in:

```txt
frontend/
```

## Scope

### In Scope

1. **Backend B6.4.1 verification** — verify the product image hardening already present in code and tighten only if tests reveal a gap.
2. **Online payment rule** — public `POST /api/pedidos` rejects `metodo_pago=efectivo`; online orders require transfer receipt.
3. **Caja payment rule** — `POST /api/admin/pedidos/caja` continues accepting `efectivo` and `transferencia`.
4. **Public checkout UI** — remove cash as a public checkout option; show transfer/receipt only.
5. **Admin session model** — cookie httpOnly, `credentials: include`, `/api/auth/me` validation, no JWT truth in `localStorage`, no `Authorization: Bearer` for cookie auth.
6. **Admin shell** — import/adapt the v0 `AdminShell` pattern with sidebar, mobile drawer, topbar, active section, logout, and admin footer.
7. **Admin screens** — migrate dashboard, caja, pedidos, cocina/entrega, productos to the shell without losing their real API wiring.
8. **New admin areas** — add comprobantes, configuración, reportes routes/screens; reports may be an honest pending-integration screen.
9. **Product images** — preserve/verify existing upload/remove image wiring.
10. **Documentation** — archive updates to IA docs for API, flows, auth, webapp, decisions/gotchas as needed.

### Out of Scope

- Modifying `diseno-de-landing-kermingo/`.
- Replacing the whole frontend with the v0 ZIP.
- Copying v0 mocks as production truth.
- Changing package versions, lockfiles, or `next.config` from the reference.
- Adding new backend report endpoints unless already present.
- Changing roles/permissions beyond the existing single admin model.

## Capabilities

### New Capabilities

- `admin-session-cookie-shell`: session provider and admin shell for real cookie auth and persistent admin navigation.
- `admin-comprobantes`: review uploaded transfer receipts from the admin.
- `admin-config-reportes`: configuration screen connected where possible and reports placeholder when no endpoint exists.
- `public-transfer-only-checkout`: customer checkout restricted to transfer payment.

### Modified Capabilities

- `pedidos-publicos`: public order creation rejects cash.
- `caja-rapida`: remains the only cash/transfer point of sale.
- `admin-dashboard`, `admin-caja`, `admin-pedidos`, `admin-cocina`, `admin-productos`: use the new shell while preserving real API behavior.
- `product-image-upload`: verify current hardening and tests.

## Approach

1. **Protect current work** — the repo has many pre-existing uncommitted changes. Touch only files required by this change.
2. **Backend first** — add the public cash rejection in `pedido.controller.js`; update tests that currently expect public cash to succeed; add/verify caja tests.
3. **Public checkout** — remove the cash option from `checkout-screen.tsx` and keep receipt upload mandatory for transfer.
4. **Admin auth foundation** — introduce/adapt `admin-session.tsx`, remove fake Bearer injection from the API helper, and validate sessions through `/api/auth/me`.
5. **Admin shell foundation** — adapt v0 `admin-shell.tsx` but preserve the existing richer `frontend/components/admin/admin-ui.tsx` primitives.
6. **Screen migration** — move existing real admin screens to `AdminShell` in small slices.
7. **New screens** — add comprobantes/config/reportes. Do not display fake report data as real.
8. **Verify** — run backend tests, frontend lint/build, and targeted runtime/manual checks.
9. **Archive** — update documentation after behavior is proven.

## Affected Areas

| Area | Impact | Notes |
|------|--------|-------|
| `backend/src/api/controllers/pedido.controller.js` | Modified | Reject public cash orders. |
| `backend/tests/comprobantes.test.js` | Modified | Flip public cash expectation to 400; preserve transfer receipt tests. |
| `backend/tests/caja*.test.js` | Modified/verified | Caja accepts cash and transfer. |
| `backend/tests/producto-imagen.test.js` | Verified/optional | Ensure product image cleanup is isolated. |
| `frontend/components/menu/checkout-screen.tsx` | Modified | Public transfer-only UI. |
| `frontend/lib/api.ts` and/or `frontend/lib/api/*` | Modified | `credentials: include`, no fake Bearer token. |
| `frontend/components/admin/admin-session.tsx` | New | Cookie session provider. |
| `frontend/components/admin/admin-shell.tsx` | New | Sidebar/drawer/topbar shell. |
| `frontend/app/admin/layout.tsx` | Modified | Wrap with admin session provider. |
| `frontend/components/admin/login-screen.tsx` | Modified | Use admin session. |
| `frontend/components/admin/*-screen.tsx` | Modified/New | Shell migration + new screens. |
| `frontend/app/admin/{comprobantes,config,reportes}/page.tsx` | New | Admin routes. |
| `DOCUMENTACION/IA/*.md` | Modified | Archive behavior and decisions. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Auth migration breaks admin navigation | High | Implement provider/shell first, then migrate screens; verify `/api/auth/me`, login, logout and 401 paths. |
| v0 mocks leak into production UI | Medium | Keep real API wiring; mark placeholders clearly. Do not copy `lib/products.ts`. |
| Existing richer `admin-ui.tsx` is overwritten by simpler v0 primitives | Medium | Preserve current `admin-ui.tsx`; adapt shell imports to it. |
| Tests fail due changed public cash rule | High | Update contradictory comprobantes test in the same backend slice. |
| Reports endpoint does not exist | Medium | Use honest pending-integration screen. |
| Uncommitted unrelated changes are overwritten | Medium | Apply minimal patches and inspect diffs before verification. |

## Rollback Plan

Revert this change's touched files. Backend rollback restores public cash orders; frontend rollback restores previous admin header/session and checkout cash option. No schema migration is expected.

## Success Criteria

- [ ] Backend tests pass.
- [ ] `POST /api/pedidos` with `metodo_pago=efectivo` returns 400.
- [ ] `POST /api/pedidos` with transfer without receipt returns 400.
- [ ] `POST /api/pedidos` with transfer plus receipt returns 201.
- [ ] `POST /api/admin/pedidos/caja` accepts cash and transfer.
- [ ] Public checkout only shows transfer/receipt flow.
- [ ] Admin login validates cookie session via `/api/auth/me` and does not rely on JWT in `localStorage`.
- [ ] Admin navigation persists across dashboard, caja, pedidos, cocina, comprobantes, productos, configuración, reportes.
- [ ] Dashboard does not show unmarked fake metrics.
- [ ] Caja creates real orders and clears the cart only after success.
- [ ] Comprobantes can approve/reject uploaded transfer receipts where API supports it.
- [ ] Product image upload/remove still works.
- [ ] Frontend lint/build pass.
- [ ] Reference folder remains unmodified.

## Single-PR Decision

Single change, staged implementation. The backend payment rule, public checkout, admin auth model, and admin screens are coupled by B7's operational flow. Work should still be applied in small slices with partial verification.
