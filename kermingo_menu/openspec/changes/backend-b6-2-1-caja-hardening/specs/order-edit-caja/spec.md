# Delta for Order Edit Caja — Coherence and Error Mapping

## MODIFIED Requirements

### Requirement: Admin Pedidos — Editar datos cliente

The system **MUST** maintain coherence between `metodo_pago` and `estado_pago` when editing a pedido. If `metodo_pago` changes, `estado_pago` **SHALL** be adjusted to a valid state for the new payment method.

#### Scenario: Admin edits client data in caja

- GIVEN existing pedido
- WHEN `PUT /api/admin/pedidos/:id` with new nombre_cliente
- THEN status 200, data reflects change
- AND created_at and stock remain unaltered

#### Scenario: Edit cancelled or delivered pedido

- GIVEN pedido with `estado_pedido = cancelado` or `entregado`
- WHEN `PUT /api/admin/pedidos/:id`
- THEN status 409, error "No se puede editar un pedido cancelado o entregado"

#### Scenario: Change metodo_pago from transferencia to efectivo resets invalid estado_pago (NEW)

- GIVEN pedido with `metodo_pago = transferencia` and `estado_pago = comprobante_subido`
- WHEN `PUT /api/admin/pedidos/:id` with `{ metodo_pago: "efectivo" }`
- THEN `estado_pago` is automatically set to `pendiente`
- AND status 200, both fields are coherent

#### Scenario: Change metodo_pago from efectivo to transferencia keeps valid estado_pago (NEW)

- GIVEN pedido with `metodo_pago = efectivo` and `estado_pago = pendiente`
- WHEN `PUT /api/admin/pedidos/:id` with `{ metodo_pago: "transferencia" }`
- THEN `estado_pago` remains `pendiente` (valid for both methods)
- AND status 200

#### Scenario: Change metodo_pago from efectivo to transferencia when pagado (NEW)

- GIVEN pedido with `metodo_pago = efectivo` and `estado_pago = pagado`
- WHEN `PUT /api/admin/pedidos/:id` with `{ metodo_pago: "transferencia" }`
- THEN `estado_pago` remains `pagado` (valid for both methods)
- AND status 200

#### Scenario: Change metodo_pago from transferencia rechazado to efectivo (NEW)

- GIVEN pedido with `metodo_pago = transferencia` and `estado_pago = rechazado`
- WHEN `PUT /api/admin/pedidos/:id` with `{ metodo_pago: "efectivo" }`
- THEN `estado_pago` is automatically set to `pendiente`
- AND status 200

(Previously: Changing `metodo_pago` did not adjust `estado_pago`, allowing invalid combinations like `efectivo + comprobante_subido`.)

### Requirement: Edit Error Mapping

The controller **MUST** map known model errors to appropriate HTTP status codes instead of returning 500.

#### Scenario: Product not found or inactive returns 400

- GIVEN an edit request referencing a non-existent or inactive product
- WHEN the model throws "no encontrado" or "inactivo"
- THEN the controller returns 400 with the error message

#### Scenario: Promo without components returns 400

- GIVEN an edit request with a promo item
- WHEN the model throws "no tiene componentes"
- THEN the controller returns 400 with the error message

#### Scenario: Insufficient stock returns 409

- GIVEN an edit request exceeding available stock
- WHEN the model throws "Stock insuficiente"
- THEN the controller returns 409 via `InsufficientStockError`

#### Scenario: Product not found (non-inactive) returns 400

- GIVEN an edit request referencing a product that does not exist
- WHEN the model throws "Producto X no encontrado"
- THEN the controller returns 400 with the error message

(Previously: Only "Stock insuficiente" was mapped to 409; other model errors fell through to 500.)
