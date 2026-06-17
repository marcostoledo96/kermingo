# Design: b7-admin-v0-front-back

## Overview

B7 combines a small backend contract change with a larger admin frontend integration. The design keeps the backend as the source of truth, treats `diseno-de-landing-kermingo/` as read-only visual reference, and migrates the active `frontend/` admin to a real cookie-session shell.

## Backend Design

### Public orders

`POST /api/pedidos` is the public online channel. It must reject `metodo_pago = 'efectivo'` before creating the order.

Order of validation in the controller:

1. Normalize/inspect `metodo_pago` from the validated body.
2. If `efectivo`, throw `ValidationError` with a user-facing message that cash is only available at caja.
3. If `transferencia` and no receipt file, throw `ValidationError`.
4. Continue existing create-with-transaction path.

This remains controller-level because caja uses a separate admin endpoint with different business rules.

### Caja orders

`POST /api/admin/pedidos/caja` keeps accepting `efectivo` and `transferencia`. Tests must prove this did not regress.

### Product images

Exploration found B6.4.1 mostly already applied:

- `uploadFile()` fallback uses the general Drive folder unless `options.folderId` is passed.
- product image uploads pass the product folder explicitly.
- sharp errors are mapped to `ValidationError`.
- `.env.example` includes `GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID`.

Implementation should avoid churn here unless verification fails.

## Frontend Design

### API client/session

Admin auth is cookie-based:

- All admin requests use `credentials: 'include'`.
- Login/logout use `credentials: 'include'`.
- Session boot checks `/api/auth/me`.
- `localStorage` may cache display user data only; it is not auth truth.
- Do not send `Authorization: Bearer` based on localStorage.

The session provider exposes:

```ts
type AdminSession = {
  user: AdminUser | null
  status: 'checking' | 'authenticated' | 'unauthenticated'
  login(email: string, password: string): Promise<void>
  logout(): Promise<void>
  refresh(): Promise<void>
  expireSession(): void
}
```

401 handling should clear cached user and redirect to `/admin` from admin pages.

### Admin shell

Adapt v0 `AdminShell` into `frontend/components/admin/admin-shell.tsx`.

Navigation sections:

- Panel general → `/admin/dashboard`
- Caja rápida → `/admin/caja`
- Pedidos → `/admin/pedidos`
- Cocina / Entrega → `/admin/cocina`
- Comprobantes → `/admin/comprobantes`
- Productos → `/admin/productos`
- Configuración → `/admin/config`
- Reportes → `/admin/reportes`

Desktop/tablet use sidebar; mobile uses drawer. The shell owns logout and admin footer. Screens pass active section/title/optional actions.

Preserve `frontend/components/admin/admin-ui.tsx` because it has richer Kermingo-specific state tones than the v0 reference.

### Existing admin screens

Existing screens already have substantial real API wiring. Migration should focus on layout/session:

- Replace `AdminHeader` wrappers with `AdminShell`.
- Preserve loading/error/empty states.
- Preserve data mappers and endpoint calls.
- Do not replace real data with v0 mock data.

### New admin screens

#### Comprobantes

List transfer orders needing receipt review using available pedidos filters. Allow viewing receipt and patching payment state to `pagado` or `rechazado` where endpoints exist.

#### Configuración

Connect to store configuration endpoint if present. Otherwise show honest error/pending state, not fake toggles.

#### Reportes

If report endpoints do not exist, render a clear pending-integration screen with no fake revenue/order data.

### Public checkout

The public checkout payment section only displays transfer. Receipt upload remains required. Any internal `PaymentMethod` state can remain `'transferencia'` only or be simplified.

## Verification Design

### Automated

- Backend: `npm test` from `backend/`.
- Frontend: lint and build from `frontend/` using the project's available scripts.
- Targeted tests updated/added for public transfer-only and caja payment methods.

### Manual/runtime

- Admin login.
- Navigate all admin pages without token errors.
- Create caja sale.
- Create public transfer order.
- Review receipt.
- Upload/remove product image.
- Confirm reference folder has no modifications.
