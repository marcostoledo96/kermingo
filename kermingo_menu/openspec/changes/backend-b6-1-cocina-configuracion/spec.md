# Spec: backend-b6-1-cocina-configuracion

## Scope

- Covers new `kitchen-operations` behavior and the minimum `store-configuration` endpoints required by this slice.
- Depends on existing B5 pedido/auth behavior and current `pedido.estado_pedido` values.
- Out of scope: caja edits/payments, comprobantes/Drive, reportes, and Drive-related config validation from B6.3.

## ADDED Requirements

### Requirement: Admin kitchen pedido listing and view

The system MUST expose authenticated admin kitchen endpoints to list operational pedidos and view one pedido with the data needed for preparation and entrega.

#### Scenario: List operational kitchen pedidos

- GIVEN an authenticated admin requests the kitchen list
- WHEN pedidos exist in `recibido`, `en_preparacion`, or `listo`
- THEN the response MUST include those pedidos ordered for operational use
- AND it MUST exclude `cancelado` pedidos

#### Scenario: View one kitchen pedido

- GIVEN an authenticated admin requests a kitchen pedido by id
- WHEN the pedido exists
- THEN the response MUST include header data, item lines, and current `estado_pedido`

#### Scenario: Kitchen pedido not found

- GIVEN an authenticated admin requests a missing pedido id
- WHEN the lookup runs
- THEN the system MUST return 404

### Requirement: Admin kitchen estado progression

The system MUST allow kitchen-facing estado changes only through `recibido -> en_preparacion -> listo -> entregado`; it MUST reject jumps backward, jumps forward, or transitions to `cancelado` from the kitchen flow.

#### Scenario: Valid next-step transition

- GIVEN a pedido in `en_preparacion`
- WHEN an authenticated admin changes it to `listo`
- THEN the system MUST persist the new estado and return the updated pedido

#### Scenario: Invalid kitchen transition

- GIVEN a pedido in `recibido`
- WHEN an authenticated admin tries to change it directly to `listo`
- THEN the system MUST reject the request with 400

#### Scenario: Unauthorized kitchen transition

- GIVEN a request without valid admin auth
- WHEN it calls a kitchen estado endpoint
- THEN the system MUST return 401

### Requirement: Minimal store configuration read and update

The system MUST expose a public read endpoint for current store status and public message, and it SHOULD expose an authenticated admin update endpoint for the minimal fields needed by this slice: `estado`, `mensaje_publico`, and `cena_habilitada_desde`.

#### Scenario: Public configuration read

- GIVEN a public client requests store configuration
- WHEN the configuration row exists
- THEN the response MUST expose `estado` and `mensaje_publico`
- AND it MAY include `cena_habilitada_desde` if the API already standardizes it

#### Scenario: Admin updates store configuration

- GIVEN an authenticated admin sends valid minimal configuration fields
- WHEN the update succeeds
- THEN the system MUST persist the new values and return the updated configuration

#### Scenario: Invalid store configuration update

- GIVEN an authenticated admin sends an invalid `estado`
- WHEN validation runs
- THEN the system MUST reject the request with 400

## Manual Test Scenarios (local DB + curl)

1. Local DB: ensure `configuracion_tienda.id=1` exists; create/login admin; seed one pedido in each of `recibido`, `en_preparacion`, `listo`, plus one `cancelado`.
2. `curl -b cookie.txt GET /api/admin/cocina/pedidos` → includes active kitchen pedidos, excludes `cancelado`.
3. `curl -b cookie.txt GET /api/admin/cocina/pedidos/:id` → returns one pedido with items and `estado_pedido`; missing id returns 404.
4. `curl -b cookie.txt PATCH /api/admin/cocina/pedidos/:id/estado` with `{"estado_pedido":"en_preparacion"}` then `listo` then `entregado` → all 200; direct `recibido -> listo` returns 400.
5. `curl GET /api/configuracion-tienda` → returns public status/message; `curl -b cookie.txt PUT /api/admin/configuracion-tienda` with valid minimal payload updates values; invalid `estado` returns 400.

## Checkpoint Notes

- Checkpoint automatico: listo
- Checkpoint manual requerido: si
- Auditoria con ChatGPT recomendada: si
- Bloquea avance a siguiente etapa: si
