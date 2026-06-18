# Delta for Cashier Operations

## ADDED Requirements

### Requirement: Caja rápida orders enter preparation immediately

`POST /api/admin/pedidos/caja` MUST create caja-origin orders with `estado_pedido='en_preparacion'` for both `metodo_pago='efectivo'` and `metodo_pago='transferencia'`, unless a future explicit admin override is separately specified. This endpoint represents in-person confirmed intake and bypasses the online `recibido` verification gate.

#### Scenario: Cash caja sale starts in preparation

- GIVEN an authenticated admin and a valid caja payload with `metodo_pago='efectivo'`
- WHEN `POST /api/admin/pedidos/caja` succeeds
- THEN the order has `origen='caja'`, `estado_pago='pagado'`, and `estado_pedido='en_preparacion'`.

#### Scenario: Transfer caja sale starts in preparation

- GIVEN an authenticated admin and a valid caja payload with `metodo_pago='transferencia'`
- WHEN `POST /api/admin/pedidos/caja` succeeds
- THEN the order has `origen='caja'` and `estado_pedido='en_preparacion'`
- AND the payment state follows the caja payload/default payment rules.
