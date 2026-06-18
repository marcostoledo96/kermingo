# Delta for Kitchen Operations

## MODIFIED Requirements

### Requirement: Kitchen lists only preparation and ready orders

The cocina/KDS list endpoint and UI MUST exclude `recibido` orders. `GET /api/admin/cocina/pedidos` MUST return only `estado_pedido IN ('en_preparacion','listo')`, excluding `recibido`, `cancelado`, and `entregado`. Cocina MAY still move a listed `en_preparacion` order backward to `recibido` if the shared state transition permits it; after that transition the order MUST disappear from KDS.
(Previously: cocina included `recibido`, `en_preparacion`, and `listo`.)

#### Scenario: Received orders do not appear in cocina

- GIVEN one order in `recibido` and one in `en_preparacion`
- WHEN an authenticated admin calls `GET /api/admin/cocina/pedidos`
- THEN the response includes the `en_preparacion` order
- AND excludes the `recibido` order.

#### Scenario: Ready orders remain visible for delivery

- GIVEN an order with `estado_pedido='listo'`
- WHEN cocina/KDS loads
- THEN the order is visible and can be marked `entregado` if the transition is valid.

#### Scenario: Backward transition removes order from KDS

- GIVEN a listed order in `en_preparacion`
- WHEN cocina changes it to `recibido`
- THEN the backend returns 200 if the transition is permitted
- AND the next cocina list no longer includes that order.
