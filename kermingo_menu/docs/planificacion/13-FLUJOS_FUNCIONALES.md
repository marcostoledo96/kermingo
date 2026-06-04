# 13 — Flujos funcionales

## Flujo cliente online

```txt
Landing
↓
Menú
↓
Carrito
↓
Checkout
↓
Pedido creado
↓
Ticket / seguimiento
↓
Retiro en mostrador
```

## Pago transferencia online

1. cliente elige transferencia
2. ve datos de cuenta
3. sube comprobante imagen/PDF
4. backend valida archivo
5. backend crea pedido
6. estado_pago = comprobante_subido
7. estado_pedido = recibido
8. admin valida comprobante
9. estado_pago = pagado

## Pago efectivo online

1. cliente elige efectivo
2. no se muestra upload
3. backend crea pedido sin comprobante
4. estado_pago = pendiente
5. cliente paga al retirar o en caja
6. admin marca pagado

## Caja rápida

1. vendedor abre `/admin/caja`
2. agrega productos
3. ingresa nombre mínimo
4. elige pago
5. confirma venta
6. backend descuenta stock
7. genera pedido
8. manda a cocina
9. muestra número de pedido

Regla:

- efectivo en caja puede quedar directamente `pagado`
- transferencia en caja puede marcarse `pagado` manualmente sin comprobante si el vendedor lo verifica

## Cocina / entrega

1. cocina ve pedidos recibidos
2. cambia a en preparación
3. marca listo
4. cliente retira
5. se marca entregado

## Cancelación

Solo admin/vendedor.

No pide motivo obligatorio.

Al cancelar:

- estado_pedido = cancelado
- se repone stock
- no requiere observación

## Seguimiento público

Cliente accede a:

```txt
/pedido/:token
```

Puede ver:

- número
- estado pedido
- estado pago
- productos
- total
- si está listo para retirar

No puede editar ni cancelar.

## Stock

Al crear pedido:

- backend valida stock real
- descuenta stock en transacción
- si un producto no alcanza, cancela toda la operación

Al cancelar:

- repone stock en transacción

## Combos

Al vender combo:

- se registra combo en pedido_detalle
- se descuenta stock de productos internos definidos en `combo_producto`
