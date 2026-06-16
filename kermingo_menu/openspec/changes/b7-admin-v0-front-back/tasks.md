# Tasks: b7-admin-v0-front-back

## 1. Backend payment rule and B6.4.1 verification

- [x] 1.1 Verify current B6.4.1 product image hardening against doc 55; avoid code changes if already aligned.
- [x] 1.2 Update public order controller to reject `metodo_pago=efectivo` for `POST /api/pedidos`.
- [x] 1.3 Update backend tests: public cash returns 400; transfer without receipt returns 400; transfer with receipt returns 201.
- [x] 1.4 Add/verify caja tests: cash returns 201 and transfer returns 201 through `POST /api/admin/pedidos/caja`.
- [x] 1.5 Run backend test suite or the narrow backend tests first, then full `npm test` when stable.

## 2. Public checkout transfer-only UI

- [x] 2.1 Remove the cash option from public checkout UI.
- [x] 2.2 Keep transfer receipt upload required and error states visible.
- [ ] 2.3 Update frontend tests covering checkout/payment if present.

## 3. Admin auth/session foundation

- [x] 3.1 Add/adapt `frontend/components/admin/admin-session.tsx` from v0 reference.
- [x] 3.2 Update admin layout to use `AdminSessionProvider`.
- [x] 3.3 Update login screen to use the new session provider.
- [x] 3.4 Remove fake Bearer-token injection from API helpers; keep `credentials: include`.
- [ ] 3.5 Verify `/api/auth/me`, logout, and 401-expire behavior.

## 4. Admin shell foundation

- [x] 4.1 Add/adapt `frontend/components/admin/admin-shell.tsx` from v0 reference.
- [x] 4.2 Preserve existing `admin-ui.tsx`; only adjust exports/imports if needed.
- [x] 4.3 Add navigation entries for dashboard, caja, pedidos, cocina, comprobantes, productos, config, reportes.
- [x] 4.4 Verify desktop sidebar and mobile drawer compile.

## 5. Existing admin screen migration

- [x] 5.1 Migrate dashboard to `AdminShell`; keep honest real/mock data labels.
- [x] 5.2 Migrate caja to `AdminShell`; preserve real product loading and real caja order creation.
- [x] 5.3 Migrate pedidos to `AdminShell`; preserve filters/actions/detail behavior.
- [x] 5.4 Migrate cocina/entrega to `AdminShell`; preserve state transitions.
- [x] 5.5 Migrate productos and product image UI to `AdminShell`; preserve upload/remove behavior.

## 6. New admin screens/routes

- [x] 6.1 Add `/admin/comprobantes` route and screen connected to receipt review endpoints where available.
- [x] 6.2 Add `/admin/config` route and screen connected to configuration endpoint where available.
- [x] 6.3 Add `/admin/reportes` route and honest pending-integration screen if no report endpoint exists.

## 7. Verification

- [x] 7.1 Run backend tests from `backend/`.
- [ ] 7.2 Run frontend lint from `frontend/`.
- [ ] 7.3 Run frontend build from `frontend/`.
- [ ] 7.4 Manual smoke: admin login; navigate all admin pages; caja sale; public transfer checkout; receipt review; product image upload/remove.
- [x] 7.5 Confirm `diseno-de-landing-kermingo/` has no modifications.

## 8. Archive/documentation

- [ ] 8.1 Update `DOCUMENTACION/IA/API.md` for public transfer-only and caja exception.
- [ ] 8.2 Update `DOCUMENTACION/IA/FLUJOS.md`, `CORE.md`, `FUNCIONALIDADES.md` for online vs caja payment flows.
- [ ] 8.3 Update `DOCUMENTACION/IA/AUTENTICACION.md` for admin cookie session provider.
- [ ] 8.4 Update `DOCUMENTACION/IA/WEBAPP.md` for admin shell/routes and checkout behavior.
- [ ] 8.5 Add gotcha/decision entries if verification reveals non-obvious behavior.