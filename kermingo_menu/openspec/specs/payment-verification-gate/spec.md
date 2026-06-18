# Payment Verification Gate Specification

## Purpose

Separate online payment verification from kitchen work. Online orders enter a received gate; caja rápida enters operational preparation.

## Requirements

### Requirement: Online orders start as received

`POST /api/pedidos` MUST create non-caja orders with `origen='online'` and `estado_pedido='recibido'` unless an explicit admin caja endpoint is used. Transfer orders with a valid comprobante MUST keep `estado_pago='comprobante_subido'` and MUST NOT be auto-marked `pagado` or `en_preparacion`.

#### Scenario: Online cash order starts at received

- GIVEN the store is open and a valid JSON body with `metodo_pago='efectivo'`
- WHEN `POST /api/pedidos` succeeds
- THEN the response includes `origen='online'`, `estado_pago='pendiente'`, and `estado_pedido='recibido'`
- AND the order is not returned by cocina/KDS lists.

#### Scenario: Online transfer with comprobante waits for verification

- GIVEN the store is open and a valid multipart transfer order with field `comprobante`
- WHEN `POST /api/pedidos` succeeds
- THEN the comprobante is linked and the response includes `estado_pago='comprobante_subido'`
- AND `estado_pedido='recibido'`.

### Requirement: Public tracking explains payment review

The public tracking UI MUST show “Estamos comprobando tu pago” or equivalent when `estado_pedido='recibido'` and `estado_pago!='pagado'`.

#### Scenario: Received unpaid order tracking

- GIVEN tracking returns an order with `estado_pedido='recibido'` and `estado_pago='comprobante_subido'`
- WHEN the visitor opens `/seguimiento?token=<token>`
- THEN the status copy communicates that payment is being checked.
