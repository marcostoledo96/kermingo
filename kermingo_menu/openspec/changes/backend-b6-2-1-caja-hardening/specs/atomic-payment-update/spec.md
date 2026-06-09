# Delta for Atomic Payment Update

## ADDED Requirements

### Requirement: Atomic Payment State Change

The system **MUST** execute payment state changes within a database transaction using `SELECT ... FOR UPDATE` to prevent concurrent writes from violating terminal states.

#### Scenario: Concurrent requests cannot overwrite pagado state

- GIVEN a pedido with `estado_pago = pendiente`
- WHEN two concurrent requests attempt to change payment state simultaneously (one to `pagado`, one to `comprobante_subido`)
- THEN only one request succeeds
- AND the other request fails with a transition error or deadlock retry
- AND `pagado` remains terminal once set

#### Scenario: Same-state payment PATCH is rejected

- GIVEN a pedido with `estado_pago = pagado`
- WHEN `PATCH /api/admin/pedidos/:id/pago` is called with `{ estado_pago: "pagado" }` (same state)
- THEN the system returns 400 with transition error
- AND no database modification occurs
- AND the explicit payment change endpoint rejects idempotent same-state requests (use GET to verify state instead)

#### Scenario: Transaction rolls back on validation failure

- GIVEN a pedido with `estado_pago = pagado`
- WHEN a request attempts to change to `pendiente`
- THEN the transaction rolls back
- AND no database modification occurs
- AND the connection is released to the pool

#### Scenario: Not found returns 0 without transaction commit

- GIVEN a non-existent pedido id
- WHEN `updateEstadoPago` is called
- THEN the function returns 0
- AND the transaction is rolled back
- AND no error is thrown

### Requirement: Cancelled Pedido Payment Block

The system **MUST** reject payment state changes when `estado_pedido = cancelado`.

#### Scenario: Payment change blocked on cancelled pedido

- GIVEN a pedido with `estado_pedido = cancelado` and `estado_pago = pendiente`
- WHEN `PATCH /api/admin/pedidos/:id/pago` is called with `{ estado_pago: "pagado" }`
- THEN the system returns 400 with error "No se puede modificar el pago de un pedido cancelado"
- AND no database modification occurs

(Previously: Payment changes were allowed on cancelled pedidos because `estado_pedido` was not checked in `updateEstadoPago`)
