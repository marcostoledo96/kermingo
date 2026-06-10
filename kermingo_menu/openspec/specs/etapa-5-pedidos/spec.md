# Public Order Creation Specification

## Purpose

Endpoint público de creación de pedidos (`POST /api/pedidos`). Acepta JSON para efectivo y multipart/form-data para transferencia con comprobante. Valida tienda abierta, stock, y método de pago.

## Requirements

### Requirement: POST /api/pedidos must accept JSON for efectivo orders

The system MUST accept `application/json` requests for `POST /api/pedidos` when `metodo_pago === 'efectivo'`. The request body MUST conform to `createPedidoSchema` (Zod): `nombre_cliente`, `items[]`, `metodo_pago`, with optional `mesa`, `telefono_cliente`, `observaciones`.

#### Scenario: Efectivo order creates pedido with estado_pago=pendiente

- GIVEN the store is open
- AND a valid JSON body with `metodo_pago='efectivo'` and at least one item
- WHEN `POST /api/pedidos` is called with `Content-Type: application/json`
- THEN a pedido is created with `origen='online'`, `estado_pago='pendiente'`, `estado_pedido='recibido'`
- AND stock is discounted within a transaction
- AND the response returns 201 with the pedido data including `token_seguimiento`

#### Scenario: Efectivo order with file attachment is rejected

- GIVEN a multipart request with `metodo_pago='efectivo'` and a file attached as `comprobante`
- WHEN `POST /api/pedidos` is called
- THEN the server responds 400 rejecting comprobante for efectivo orders

### Requirement: POST /api/pedidos must accept multipart for transfer orders

The system MUST accept `multipart/form-data` requests for `POST /api/pedidos` when `metodo_pago === 'transferencia'`. The multipart request MUST include a file field named `comprobante` and form fields matching `createPedidoSchema` (excluding the file).

#### Scenario: Transfer order with comprobante creates pedido with comprobante_subido

- GIVEN the store is open
- AND a valid multipart request with order fields, `metodo_pago='transferencia'`, and a valid `comprobante` file
- WHEN `POST /api/pedidos` is called
- THEN the file is uploaded to Google Drive
- AND a row is inserted in `archivo_drive` with `tipo='comprobante'`
- AND the pedido is created with `estado_pago='comprobante_subido'` and `comprobante_archivo_id` populated
- AND the response returns 201 with the pedido data

#### Scenario: Transfer order without comprobante is rejected with 400

- GIVEN a request with `metodo_pago='transferencia'`
- AND no file attached
- WHEN `POST /api/pedidos` is called
- THEN the server responds 400 with message: `'Transferencia online requiere comprobante. Usá efectivo o contactá al vendedor.'`

### Requirement: Order creation must validate store status, stock, and items

The system MUST verify `configuracion_tienda.estado = 'abierta'` before creating any order. Stock MUST be checked and discounted within a database transaction. Insufficient stock MUST result in an error with no partial state.

#### Scenario: Store closed rejects order

- GIVEN `configuracion_tienda.estado = 'cerrada'`
- WHEN `POST /api/pedidos` is called (any method)
- THEN the server responds 400 with `'La tienda no está abierta para pedidos en este momento'`

#### Scenario: Insufficient stock rejects order

- GIVEN a product with `stock_limitado=1` and `stock_actual=0`
- WHEN `POST /api/pedidos` includes that product with `cantidad >= 1`
- THEN the server responds 400 with `'Stock insuficiente de "<nombre>". Necesario: N, disponible: 0'`
- AND no pedido row is created

#### Scenario: Promo (combo) expands and checks component stock

- GIVEN a promo product with `tipo='promo'` composed of component products via `combo_producto`
- WHEN `POST /api/pedidos` includes the promo with `cantidad=N`
- THEN stock requirements are calculated as `componente.cantidad * N` for each component
- AND each component's stock is checked
- AND stock is discounted for each component, not the promo itself

### Requirement: Order creation must generate tracking token and sequential number

The system MUST generate a unique `token_seguimiento` (UUID or random string) and a sequential `numero` (format `KMG-XXXX`) for every order.

#### Scenario: Token and number are generated

- GIVEN a valid order creation request
- WHEN the order is created
- THEN `token_seguimiento` is a unique non-null string
- AND `numero` follows the format `KMG-XXXX` where XXXX is a zero-padded sequential number
- AND both are returned in the 201 response
