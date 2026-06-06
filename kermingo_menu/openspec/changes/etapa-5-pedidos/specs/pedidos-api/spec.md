# Spec: Pedidos API — Etapa 5

## Overview

Módulo de pedidos con stock transaccional, combos, caja rápida y seguimiento por token.

## Files

- `backend/src/api/schemas/pedido.schema.js` — 6 Zod schemas
- `backend/src/api/models/pedido.model.js` — 7 functions
- `backend/src/api/controllers/pedido.controller.js` — 9 handlers
- `backend/src/api/routes/pedido.routes.js` — public + admin routers
- `backend/src/api/utils/errors.js` — InsufficientStockError added
- `backend/src/api/routes/index.routes.js` — pedido routers mounted

## Endpoints

| Método | Ruta | Auth | Handler | Schema |
|--------|------|------|---------|--------|
| POST | /api/pedidos | público | `crear` | `createPedidoSchema` |
| GET | /api/pedidos/seguimiento/:token | público | `seguimiento` | — |
| POST | /api/admin/pedidos/caja | admin | `crearCaja` | `createCajaSchema` |
| GET | /api/admin/pedidos | admin | `listarAdmin` | `pedidoQuerySchema` |
| GET | /api/admin/pedidos/:id | admin | `obtenerAdmin` | `idParamSchema` |
| PATCH | /api/admin/pedidos/:id/estado | admin | `cambiarEstado` | `idParamSchema` + `updateEstadoPedidoSchema` |
| PATCH | /api/admin/pedidos/:id/pago | admin | `cambiarPago` | `idParamSchema` + `updateEstadoPagoSchema` |
| PATCH | /api/admin/pedidos/:id/cancelar | admin | `cancelar` | `idParamSchema` |

## Zod Schemas

### createPedidoSchema
- `nombre_cliente`: string 1-150
- `mesa`: string max 20, optional
- `telefono_cliente`: string max 40, optional
- `observaciones`: string max 500, optional
- `metodo_pago`: enum `transferencia` | `efectivo`
- `items`: array min 1 of `{ producto_id: int, cantidad: int }`

### createCajaSchema
Extends `createPedidoSchema`:
- `estado_pago`: enum `pendiente` | `pagado` (default `pendiente`)
- `estado_pedido`: enum `recibido` | `en_preparacion` | `listo` | `entregado` (default `recibido`)

### pedidoQuerySchema
- `page`, `limit` (default 24, max 100)
- `estado_pedido`, `estado_pago`, `metodo_pago`, `origen`, `buscar` — all optional

### updateEstadoPedidoSchema
- `estado_pedido`: enum `recibido` | `en_preparacion` | `listo` | `entregado`

### updateEstadoPagoSchema
- `estado_pago`: enum `pendiente` | `pagado` | `rechazado`

### idParamSchema
- `id`: coerce int min 1

## Transaction Logic (`createWithTransaction`)

1. `BEGIN`
2. For each item: `SELECT ... FROM producto WHERE id = ? FOR UPDATE`
3. If promo: `SELECT ... FROM combo_producto JOIN producto ... FOR UPDATE`, validate component stock
4. If normal product: validate `stock_actual >= cantidad`
5. Snapshot prices/names into item metadata
6. `INSERT INTO pedido` (token, origen, cliente, total)
7. `UPDATE pedido SET numero = ?` (post-insert KMG-XXXX)
8. `INSERT INTO pedido_detalle` for each item (snapshot)
9. Deduct stock: combos deduct components, normal products deduct themselves
10. `COMMIT` / `ROLLBACK` on error

## Cancel Logic (`cancelWithTransaction`)

1. `BEGIN`
2. `SELECT estado_pedido FROM pedido WHERE id = ? FOR UPDATE`
3. Validate state is `recibido` or `en_preparacion`
4. Read `pedido_detalle` joined with `producto` for types
5. Restore stock: combos restore components, normal products restore themselves
6. `UPDATE pedido SET estado_pedido = 'cancelado'`
7. `COMMIT` / `ROLLBACK` on error

## State Machine

```
recibido → en_preparacion → listo → entregado
```

Cancelable states: `recibido`, `en_preparacion`

## KMG Numbering

Post-insert pattern: `KMG-${insertId.padStart(4, '0')}`

## Testing Evidence

13/13 curl tests passed:
1. Crear pedido simple → KMG-0002, $5000
2. Crear pedido con combo → KMG-0003, $7000
3. Seguimiento por token → 200, estado=recibido
4. Token inexistente → 404
5. Stock insuficiente → 409
6. Stock repuesto post-cancel → verified
7. Admin listar pedidos → pagination works
8. Admin cambiar estado → transition valid
9. Admin cancelar → cancelado, stock repuesto
10. Admin sin cookie → 401
11. Caja rápida → KMG-0004, pago=pagado
12. Validación items vacíos → 400
13. Validación método pago → 400
