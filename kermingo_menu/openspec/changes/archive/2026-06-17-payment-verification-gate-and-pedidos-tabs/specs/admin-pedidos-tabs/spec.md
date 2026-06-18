# Admin Pedidos Tabs Specification

## Purpose

Make `/admin/pedidos` an audit and operations screen with explicit state tabs and a payment-confirmation gate.

## Requirements

### Requirement: Pedidos tabs filter by estado_pedido

The admin pedidos screen MUST expose four primary tabs: pending confirmation (`recibido`), `en_preparacion`, `listo`, and `entregado`. Each tab MUST fetch or filter orders by its `estado_pedido` and render a table/list with order number, client, total, payment state/method, origin, and allowed actions.

#### Scenario: Pending confirmation tab lists received orders

- GIVEN an authenticated admin session
- WHEN admin opens the pending confirmation tab
- THEN the UI requests `GET /api/admin/pedidos?estado_pedido=recibido&limit=24`
- AND only `recibido` orders are shown.

#### Scenario: Delivered audit tab lists delivered orders

- GIVEN delivered orders exist
- WHEN admin opens the delivered tab
- THEN the UI requests `GET /api/admin/pedidos?estado_pedido=entregado&limit=24`
- AND delivered orders are visible for audit/detail review.

### Requirement: Pending confirmation can approve payment and release to kitchen

For orders in `recibido`, the UI MUST provide a confirm-payment action when the existing payment transition permits `estado_pago='pagado'`. On success, it MUST move the order to `en_preparacion` via `PATCH /api/admin/pedidos/:id/estado`.

#### Scenario: Transfer comprobante approved then sent to preparation

- GIVEN a `recibido` transfer order with `estado_pago='comprobante_subido'`
- WHEN admin clicks “Confirmar pago”
- THEN the frontend calls `PATCH /api/admin/pedidos/:id/pago` with `{ "estado_pago": "pagado" }`
- AND after 200, calls `PATCH /api/admin/pedidos/:id/estado` with `{ "estado_pedido": "en_preparacion" }`.

#### Scenario: Payment confirmation failure does not advance state

- GIVEN the payment PATCH returns 400
- WHEN admin confirms payment
- THEN the UI shows the error
- AND MUST NOT call the state PATCH.

### Requirement: Backward state movement remains transition-gated

Audit tabs MAY expose backward actions only when `TRANSICIONES_VALIDAS` permits them. The delivered tab MUST NOT offer backward movement because `entregado` is terminal.

#### Scenario: Delivered order is read-only for state changes

- GIVEN an order with `estado_pedido='entregado'`
- WHEN it is shown in the delivered tab
- THEN no action to move it backward is shown
- AND any attempted backend state change from `entregado` returns 400.
