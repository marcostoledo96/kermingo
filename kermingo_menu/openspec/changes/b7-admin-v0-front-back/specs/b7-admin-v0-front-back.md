# Spec: b7-admin-v0-front-back (delta)

## ADDED Requirements

### REQ-B7-PAY-001 — Public online orders are transfer-only

`POST /api/pedidos` MUST reject orders with `metodo_pago = 'efectivo'` with HTTP 400. The error message SHOULD explain that cash payment is only available at caja.

**Scenario**: Public customer attempts cash checkout
- Given a public checkout request with `metodo_pago = 'efectivo'`
- When the request is submitted to `POST /api/pedidos`
- Then the API responds with HTTP 400
- And no order is created

### REQ-B7-PAY-002 — Public transfer orders require receipt

`POST /api/pedidos` MUST reject transfer orders without a receipt and MUST accept valid transfer orders with a receipt.

**Scenario**: Public transfer without receipt
- Given a public checkout request with `metodo_pago = 'transferencia'`
- And no receipt file
- When the request is submitted
- Then the API responds with HTTP 400

**Scenario**: Public transfer with receipt
- Given a public checkout request with `metodo_pago = 'transferencia'`
- And a valid receipt file
- When the request is submitted
- Then the API responds with HTTP 201
- And the order payment state is `comprobante_subido`

### REQ-B7-PAY-003 — Caja accepts cash and transfer

`POST /api/admin/pedidos/caja` MUST continue accepting `efectivo` and `transferencia` for authenticated admins.

**Scenario**: Admin creates cash caja sale
- Given a valid admin session
- And a caja request with `metodo_pago = 'efectivo'`
- When submitted to `POST /api/admin/pedidos/caja`
- Then the API responds with HTTP 201

**Scenario**: Admin creates transfer caja sale
- Given a valid admin session
- And a caja request with `metodo_pago = 'transferencia'`
- When submitted to `POST /api/admin/pedidos/caja`
- Then the API responds with HTTP 201

### REQ-B7-CHECKOUT-001 — Public checkout only shows transfer payment

The public checkout UI MUST NOT render cash as a selectable payment method. It MUST show transfer instructions and receipt upload.

**Scenario**: Customer opens checkout
- Given the customer has items in cart
- When the checkout screen renders
- Then only transfer payment is visible
- And no cash payment button/option is rendered
- And receipt upload remains available and required

### REQ-B7-AUTH-001 — Admin session validates cookie auth

The admin frontend MUST validate session state with `/api/auth/me` using `credentials: 'include'`. It MUST NOT treat a localStorage token as proof of authentication.

**Scenario**: Admin opens a protected page with valid cookie
- Given the browser has a valid admin cookie
- When `/admin/dashboard` loads
- Then the frontend requests `/api/auth/me` with credentials included
- And the admin page renders after a valid response

**Scenario**: Admin opens a protected page without valid cookie
- Given the browser has no valid admin cookie
- When `/admin/dashboard` loads
- Then the frontend requests `/api/auth/me`
- And redirects or returns to `/admin` after a 401

### REQ-B7-AUTH-002 — Admin requests use cookie credentials only

Admin frontend API helpers MUST include `credentials: 'include'` and MUST NOT add `Authorization: Bearer` from cached localStorage data.

**Scenario**: Admin performs a mutating request
- Given a valid admin session cookie
- When the frontend calls an admin POST/PATCH/PUT/DELETE endpoint
- Then the request includes cookies
- And it does not include a fake Bearer token derived from localStorage

### REQ-B7-SHELL-001 — Admin shell provides persistent navigation

Admin pages MUST use a shared shell with persistent navigation for dashboard, caja, pedidos, cocina/entrega, comprobantes, productos, configuración, and reportes.

**Scenario**: Admin navigates between admin pages
- Given a valid admin session
- When the admin opens any supported admin route
- Then the sidebar or mobile drawer shows all admin sections
- And the current section is visually active
- And logout remains available

### REQ-B7-DASH-001 — Dashboard data is honest

The admin dashboard MUST NOT present fake metrics as real data. If a real summary endpoint is missing, demo/mock values MUST be clearly labeled or replaced with loading/error/pending states.

**Scenario**: Summary endpoint is unavailable or missing
- Given the dashboard cannot load real summary data
- When the dashboard renders
- Then it clearly marks the summary as pending/demo/unavailable
- And does not imply the numbers are live production data

### REQ-B7-CAJA-001 — Caja creates real orders

Caja rápida MUST load real products from the backend and create real orders through the caja endpoint. It MUST clear the cart only after a successful backend response.

**Scenario**: Admin registers caja sale
- Given a valid admin session
- And the caja cart has products loaded from the backend
- When the admin registers the sale
- Then the frontend calls `POST /api/admin/pedidos/caja`
- And on success shows the new order number
- And clears the cart only after success

### REQ-B7-COMP-001 — Admin can review transfer receipts

The comprobantes admin screen MUST show transfer orders that need receipt review and allow supported payment-state actions.

**Scenario**: Admin approves receipt
- Given a transfer order with `estado_pago = 'comprobante_subido'`
- When admin marks it as paid
- Then the frontend calls the payment update endpoint
- And the order updates to `pagado` after success

### REQ-B7-PRODIMG-001 — Product image upload/remove remains functional

Product image upload MUST send the image file as `FormData` field `imagen`; remove image MUST call the delete endpoint. Existing hardening MUST keep receipts and product images in their intended Drive folders.

**Scenario**: Admin uploads product image
- Given a valid admin session and an image file
- When admin uploads it for a product
- Then the frontend sends `FormData` with field `imagen`
- And the product shows the returned `imagen_url` after success

### REQ-B7-REPORTS-001 — Reports screen is honest when not integrated

If real report endpoints are not available, `/admin/reportes` MUST render a clear pending-integration state instead of fake report values.

**Scenario**: Admin opens reports before endpoint exists
- Given no real report endpoint is integrated
- When `/admin/reportes` renders
- Then it shows an explicit pending-integration message
- And it does not display fake totals as live data

## MODIFIED Requirements

### REQ-WEBAPP-ADMIN-001 — Admin visual reference

Admin UI changes MUST use `diseno-de-landing-kermingo/` as visual/component reference but MUST modify only files under the active `frontend/` app.

### REQ-BACKEND-IMG-001 — Product image hardening verification

The B6.4.1 image hardening items from doc 55 are considered required behavior and MUST be verified as part of B7 even if no code changes are needed.

## Testing Strategy

- Backend tests for public payment rule and caja exceptions.
- Frontend tests for checkout transfer-only and admin/session helpers where existing test setup supports it.
- Frontend lint/build.
- Manual smoke for admin navigation, caja sale, receipt review, and product image upload/remove.
