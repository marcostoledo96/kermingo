# Delta for Public Order Creation

## MODIFIED Requirements

### Requirement: POST /api/pedidos must accept JSON for efectivo orders

The system MUST accept `application/json` requests for `POST /api/pedidos` when `metodo_pago === 'efectivo'`. The request body MUST conform to `createPedidoSchema`: `nombre_cliente`, `items[]`, `metodo_pago`, optional `mesa`, `telefono_cliente`, `observaciones`. Online efectivo orders MUST start with `estado_pago='pendiente'` and `estado_pedido='recibido'`.
(Previously: efectivo online already created `recibido`; this makes the payment gate explicit.)

#### Scenario: Efectivo order creates pedido with estado_pago=pendiente

- GIVEN the store is open
- AND a valid JSON body with `metodo_pago='efectivo'` and at least one item
- WHEN `POST /api/pedidos` is called with `Content-Type: application/json`
- THEN a pedido is created with `origen='online'`, `estado_pago='pendiente'`, `estado_pedido='recibido'`
- AND stock is discounted and the 201 response includes `token_seguimiento`.

#### Scenario: Efectivo order with file attachment is rejected

- GIVEN a multipart request with `metodo_pago='efectivo'` and a `comprobante` file
- WHEN `POST /api/pedidos` is called
- THEN the server responds 400 rejecting comprobante for efectivo orders.

### Requirement: POST /api/pedidos must accept multipart for transfer orders

The system MUST accept `multipart/form-data` requests for `POST /api/pedidos` when `metodo_pago === 'transferencia'`. The request MUST include file field `comprobante`; successful orders MUST be `estado_pago='comprobante_subido'` and `estado_pedido='recibido'`.
(Previously: transfer payment state was specified, but the preparation gate was not explicit.)

#### Scenario: Transfer order with comprobante creates pedido with comprobante_subido

- GIVEN the store is open and a valid multipart transfer request with `comprobante`
- WHEN `POST /api/pedidos` is called
- THEN the file is uploaded and linked as `tipo='comprobante'`
- AND the pedido is created with `estado_pago='comprobante_subido'`, `estado_pedido='recibido'`, and `comprobante_archivo_id`.

#### Scenario: Transfer order without comprobante is rejected with 400

- GIVEN a request with `metodo_pago='transferencia'` and no file
- WHEN `POST /api/pedidos` is called
- THEN the server responds 400 with the existing transferencia-required message.
