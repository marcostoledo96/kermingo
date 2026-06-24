# Spec: edit-orders-caja-transfer-promos

## ADDED Requirements

### Requirement: Caja sales are always paid and correction is reversible-by-backup

`POST /api/admin/pedidos/caja` MUST persist `estado_pago='pagado'` for `efectivo` and `transferencia`, ignoring stale frontend `pendiente`. A correction script MUST support dry-run by default and apply mode inside a transaction. It MUST NOT contain production-destructive SQL such as unconditional DELETE/TRUNCATE/DROP.

#### Scenario: Caja transfer ignores pending payload
- GIVEN an authenticated admin submits a valid caja transfer sale with `estado_pago='pendiente'`
- WHEN the sale is created
- THEN the order is stored with `origen='caja'`, `metodo_pago='transferencia'`, `estado_pago='pagado'`, and `estado_pedido='en_preparacion'`.

#### Scenario: Correction script preserves data by default
- GIVEN existing caja transfer orders with `estado_pago='pendiente'`
- WHEN the correction script runs without apply flag
- THEN it reports candidate IDs/counts only
- AND no rows are modified.

### Requirement: Promo component API manages valid composition

Admin product API MUST expose protected GET/PUT component endpoints backed by `combo_producto`. PUT MUST replace components atomically, reject non-promo targets, self-references, duplicates, invalid quantities, inactive/missing components, and SQL partial writes. Explicit `componentes: []` is allowed as a clear action and MUST set the promo unavailable so an empty available promo is not enabled or sold.

#### Scenario: Admin reads promo components
- GIVEN a promo has component rows
- WHEN admin calls `GET /api/admin/productos/:id/componentes`
- THEN the API returns component product IDs, names, quantities, stock flags, and current availability data.

#### Scenario: Invalid component update rolls back
- GIVEN a promo has existing components
- WHEN admin PUTs a payload with a duplicate component or `cantidad < 1`
- THEN the API returns 400
- AND previous `combo_producto` rows remain unchanged.

#### Scenario: Clearing components disables promo availability
- GIVEN a promo has existing components and is available
- WHEN admin PUTs `{ "componentes": [] }`
- THEN the API clears `combo_producto` rows for that promo
- AND sets the promo `disponible=0`
- AND the promo cannot be sold until components are added and it is enabled again.

### Requirement: Promo availability excludes incomplete promos

Incomplete promos MUST NOT be enabled or sold. Public menu, caja product lists, and order creation MUST exclude or reject promos without components; admin lists SHOULD show an incomplete badge so the issue can be fixed. Explicitly clearing a promo's components is allowed only as a maintenance action that also disables availability.

#### Scenario: Incomplete promo cannot be enabled
- GIVEN a promo has no components
- WHEN admin attempts to set `disponible=true`
- THEN the API returns 400
- AND the promo remains unavailable.

### Requirement: Promo component UI is explicit and data-preserving

The admin product form MUST provide a component editor only for `tipo='promo'`, load/save through the component API, prevent enabling incomplete promos, and preserve unrelated product fields when components fail to save.

#### Scenario: Component save failure keeps form data
- GIVEN admin edits a promo name, price, categories, and components
- WHEN component save fails after product save succeeds
- THEN the UI shows an error and does not clear entered form state
- AND the product fields already saved remain visible after refetch.

### Requirement: Admin order editing supports generated orders safely

`PUT /api/admin/pedidos/:id` MUST allow authenticated admins to edit metadata, payment method/state, and item sets for online and caja orders, including delivered orders. Item edits MUST reconcile stock transactionally using current `combo_producto` composition. Cancelled orders MUST reject item edits; empty item replacement MUST be rejected. Metadata-only edits on cancelled orders MAY be allowed only if they do not affect stock, totals, payment, or state.

#### Scenario: Online order item edit recalculates stock and total
- GIVEN an online order with existing items and available replacement stock
- WHEN admin replaces quantities/items
- THEN old stock is restored, new stock is deducted, detail snapshots and total are replaced atomically
- AND metadata not included in the payload is preserved.

#### Scenario: Stock failure preserves order
- GIVEN an order edit requires more stock than available
- WHEN admin submits the edit
- THEN the API returns 409 or 400
- AND stock, pedido total, payment fields, and pedido_detalle remain unchanged.

#### Scenario: Cancelled restrictions are enforced
- GIVEN a cancelled order
- WHEN admin sends an item replacement or empty `items: []`
- THEN the API rejects the request
- AND no stock or detail rows change.

#### Scenario: Delivered order metadata/payment can be corrected
- GIVEN an order in `entregado`
- WHEN admin updates customer metadata or valid payment fields
- THEN the API persists the correction without changing `estado_pedido` or stock.

### Requirement: Payment changes during edits obey method rules

Order editing MUST preserve payment data unless explicitly changed. Valid explicit payment changes MUST follow method-aware transitions; changing payment method MUST not silently lose a terminal `pagado` state. Transfer/cash changes MUST NOT create or delete comprobante files.

#### Scenario: Paid state is preserved across method correction
- GIVEN a paid order
- WHEN admin changes `metodo_pago`
- THEN `estado_pago='pagado'` remains pagado
- AND existing comprobante metadata, if any, is preserved.

### Requirement: Admin orders UI provides an edit modal

`/admin/pedidos` MUST expose an edit affordance for non-cancelled orders and a modal/sheet that edits customer metadata, payment, and items with add/remove/quantity controls. The UI MUST show loading/error states, prevent empty item sets client-side, submit via admin services with `credentials: include`, and refetch affected lists after success.

#### Scenario: Successful modal edit refreshes order card
- GIVEN admin edits an order in the modal
- WHEN the API returns success
- THEN the modal closes, a success message appears, and the visible order shows updated total/items/payment.

#### Scenario: API rejection keeps draft open
- GIVEN admin submits an edit that backend rejects
- WHEN the response is 400/409
- THEN the modal stays open with the draft intact and an actionable error message.

### Requirement: Docs, QA, and manual backup are mandatory

Implementation MUST update API/CORE/WEBAPP/GOTCHAS or equivalent docs, add backend and frontend behavior tests, and include manual QA for caja, promo editing, order editing, cancelled/delivered cases, and correction script dry-run/apply. Production apply MUST require a database backup note before running.

#### Scenario: QA evidence blocks closure
- GIVEN the change is ready for verification
- WHEN tests/docs/manual checklist are incomplete
- THEN the change MUST be marked partial/needs-verify, not done.

## MODIFIED Requirements

### Requirement: Caja rápida orders enter preparation immediately

`POST /api/admin/pedidos/caja` MUST create caja-origin orders with `estado_pedido='en_preparacion'` and `estado_pago='pagado'` for both `efectivo` and `transferencia`, regardless of frontend payment payload. This endpoint represents in-person confirmed intake and bypasses online payment verification.
(Previously: transfer caja sales could remain `pendiente` based on frontend payload/defaults.)

#### Scenario: Cash caja sale starts paid in preparation
- GIVEN an authenticated admin and a valid caja cash payload
- WHEN creation succeeds
- THEN the order has `origen='caja'`, `estado_pago='pagado'`, and `estado_pedido='en_preparacion'`.

#### Scenario: Transfer caja sale starts paid in preparation
- GIVEN an authenticated admin and a valid caja transfer payload
- WHEN creation succeeds
- THEN the order has `origen='caja'`, `estado_pago='pagado'`, and `estado_pedido='en_preparacion'`.

### Requirement: Pedidos tabs include editing without weakening state gates

The admin pedidos screen MUST retain state tabs, payment-confirmation sequencing, and terminal delivered state movement rules while adding edit actions. Edit actions MUST NOT offer state rollback from `entregado` and MUST NOT expose item edits for `cancelado`.
(Previously: tabs supported payment/state/detail/cancel actions only, with no edit affordance.)

#### Scenario: Delivered remains terminal for state movement
- GIVEN a delivered order is shown
- WHEN admin opens edit controls
- THEN state rollback is unavailable
- AND only allowed correction fields are offered.

#### Scenario: Cancelled order is historical
- GIVEN a cancelled order is shown
- WHEN admin opens detail/actions
- THEN item editing is unavailable
- AND the UI communicates it is historical/read-only for stock-affecting changes.
