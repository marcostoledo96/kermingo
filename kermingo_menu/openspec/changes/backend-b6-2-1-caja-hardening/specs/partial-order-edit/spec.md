# Delta for Partial Order Edit

## ADDED Requirements

### Requirement: Partial Order Edit Without Items

The system **MUST** allow `PUT /api/admin/pedidos/:id` to be called without `items` in the request body, enabling metadata-only edits (nombre_cliente, mesa, telefono_cliente, observaciones, metodo_pago).

#### Scenario: Edit only nombre_cliente

- GIVEN a caja pedido with id=42
- WHEN `PUT /api/admin/pedidos/42` with `{ nombre_cliente: "Nuevo nombre" }`
- THEN status 200, data reflects the name change
- AND stock remains unchanged
- AND pedido_detalle remains unchanged

#### Scenario: Edit only metodo_pago

- GIVEN a caja pedido with `metodo_pago = efectivo`
- WHEN `PUT /api/admin/pedidos/42` with `{ metodo_pago: "transferencia" }`
- THEN status 200, data reflects the method change
- AND stock remains unchanged
- AND `estado_pago` is adjusted to a valid state for the new method

#### Scenario: Edit multiple metadata fields without items

- GIVEN a caja pedido
- WHEN `PUT /api/admin/pedidos/42` with `{ nombre_cliente: "X", mesa: "5", telefono_cliente: "11-0000" }`
- THEN status 200, all three fields are updated
- AND items are not touched

#### Scenario: Empty body rejected

- GIVEN any caja pedido
- WHEN `PUT /api/admin/pedidos/42` with `{}` (empty object)
- THEN status 400, error "Debe enviarse al menos un campo para editar"

### Requirement: Schema Allows Optional Items With At-Least-One-Field Constraint

The `editPedidoSchema` **MUST** make `items` optional and enforce that at least one field is present in the request body.

#### Scenario: Schema accepts metadata-only body

- WHEN body contains only `{ observaciones: "nota" }`
- THEN schema validation passes

#### Scenario: Schema rejects empty body

- WHEN body is `{}`
- THEN schema validation fails with "Debe enviarse al least un campo para editar"

#### Scenario: Schema accepts full body with items

- WHEN body contains `{ nombre_cliente: "X", items: [{ producto_id: 1, cantidad: 2 }] }`
- THEN schema validation passes

## MODIFIED Requirements

### Requirement: Admin Pedidos — Editar datos cliente

The system **MUST** expose `PUT /api/admin/pedidos/:id` protected by admin cookie to modify pedido metadata and optionally items. When `items` is not provided, stock reconciliation **SHALL** be skipped entirely.

#### Scenario: Admin edits client data in caja

- GIVEN existing pedido
- WHEN `PUT /api/admin/pedidos/:id` with new nombre_cliente
- THEN status 200, data reflects change
- AND created_at and stock remain unaltered

#### Scenario: Edit cancelled or delivered pedido

- GIVEN pedido with `estado_pedido = cancelado` or `entregado`
- WHEN `PUT /api/admin/pedidos/:id`
- THEN status 409, error "No se puede editar un pedido cancelado o entregado"

#### Scenario: Partial edit without items (NEW)

- GIVEN existing caja pedido with items
- WHEN `PUT /api/admin/pedidos/:id` with only metadata fields (no `items` key)
- THEN status 200, metadata is updated
- AND stock reconciliation is skipped
- AND pedido_detalle remains unchanged

#### Scenario: Full edit with items (unchanged)

- GIVEN existing caja pedido
- WHEN `PUT /api/admin/pedidos/:id` with `items` array
- THEN stock reconciliation runs as before
- AND pedido_detalle is rewritten

(Previously: `items` was mandatory in `editPedidoSchema`, blocking metadata-only edits.)
