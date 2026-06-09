# Delta for Payment State Machine — Method Aware

## ADDED Requirements

### Requirement: Method-Aware Payment Transitions

The system **MUST** validate payment state transitions based on `metodo_pago`. The `validatePaymentTransition` function **SHALL** accept `metodoPago` as a third parameter and enforce method-specific rules.

#### Scenario: Efectivo allows pendiente → pagado

- GIVEN a pedido with `metodo_pago = efectivo` and `estado_pago = pendiente`
- WHEN transition to `pagado` is requested
- THEN the transition is allowed

#### Scenario: Efectivo blocks pendiente → comprobante_subido

- GIVEN a pedido with `metodo_pago = efectivo` and `estado_pago = pendiente`
- WHEN transition to `comprobante_subido` is requested
- THEN the transition is rejected

#### Scenario: Efectivo blocks pendiente → rechazado

- GIVEN a pedido with `metodo_pago = efectivo` and `estado_pago = pendiente`
- WHEN transition to `rechazado` is requested
- THEN the transition is rejected

#### Scenario: Transferencia allows pendiente → comprobante_subido

- GIVEN a pedido with `metodo_pago = transferencia` and `estado_pago = pendiente`
- WHEN transition to `comprobante_subido` is requested
- THEN the transition is allowed

#### Scenario: Transferencia allows comprobante_subido → rechazado

- GIVEN a pedido with `metodo_pago = transferencia` and `estado_pago = comprobante_subido`
- WHEN transition to `rechazado` is requested
- THEN the transition is allowed

#### Scenario: Transferencia allows rechazado → comprobante_subido

- GIVEN a pedido with `metodo_pago = transferencia` and `estado_pago = rechazado`
- WHEN transition to `comprobante_subido` is requested
- THEN the transition is allowed

#### Scenario: Pagado is terminal for all methods

- GIVEN a pedido with `estado_pago = pagado` (any `metodo_pago`)
- WHEN any transition away from `pagado` is requested
- THEN the transition is rejected

#### Scenario: Same-state transition is a no-op

- GIVEN a pedido with any `estado_pago`
- WHEN transition to the same state is requested
- THEN the transition is allowed (returns true)

## MODIFIED Requirements

### Requirement: Admin Pedidos — Cambiar estado de pago

The system **MUST** expose `PATCH /api/admin/pedidos/:id/pago` protected by admin cookie, validating transitions against both current state and `metodo_pago`.

#### Scenario: Marcar pagado desde pendiente (efectivo)

- GIVEN pedido efectivo with `estado_pago = pendiente`
- WHEN `PATCH` with `{ estado_pago: "pagado" }`
- THEN status 200, `data.estado_pago = pagado`

#### Scenario: Marcar pagado desde comprobante_subido (transferencia)

- GIVEN pedido transferencia with `estado_pago = comprobante_subido`
- WHEN `PATCH` with `{ estado_pago: "pagado" }`
- THEN status 200, `data.estado_pago = pagado`

#### Scenario: Rechazar comprobante (transferencia)

- GIVEN pedido with `estado_pago = comprobante_subido`
- WHEN `PATCH` with `{ estado_pago: "rechazado" }`
- THEN status 200, `data.estado_pago = rechazado`
- AND `estado_pedido` remains unchanged

#### Scenario: Efectivo cannot transition to comprobante_subido (NEW)

- GIVEN pedido efectivo with `estado_pago = pendiente`
- WHEN `PATCH` with `{ estado_pago: "comprobante_subido" }`
- THEN status 400, error "Transición de pago no válida para método de pago efectivo"

#### Scenario: Cancelled pedido rejects payment change (NEW)

- GIVEN pedido with `estado_pedido = cancelado`
- WHEN `PATCH /api/admin/pedidos/:id/pago` with any `estado_pago`
- THEN status 400, error "No se puede modificar el pago de un pedido cancelado"

(Previously: Transitions were validated only by `estado_pago`, ignoring `metodo_pago`. Cancelled pedidos were not blocked from payment changes.)
