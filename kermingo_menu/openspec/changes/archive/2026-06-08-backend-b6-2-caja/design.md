# Design: backend-b6-2-caja

## Technical Approach

Reuse the existing `pedido` route/controller/model stack and keep B6.2 inside that module. The slice has three parts: (1) enforce a payment-state machine in `PATCH /api/admin/pedidos/:id/pago`, (2) extend `GET /api/admin/pedidos` with a caja unpaid filter, and (3) add a bounded correction-only `PUT /api/admin/pedidos/:id` that re-reconciles stock atomically if it still fits the review budget.

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|---|---|---|---|
| Payment transition enforcement | free-form enum update / explicit map | explicit map in `pedido.model.js` | B5 already enforces pedido-state transitions this way; B6.3 needs `comprobante_subido` kept as a first-class state. |
| Unpaid caja listing | new `/admin/caja/pagos-pendientes` route / reuse admin pedidos list | reuse `GET /api/admin/pedidos` with query flag | Keeps apply narrow, no new controller tree, and works with existing pagination/search. |
| Edit scope | any pedido / correction-only subset | correction-only: `origen='caja'`, reject `cancelado` and `entregado` | Avoids rewriting historical online/closed orders while still covering caja mistakes. |
| Budget gate | force PUT into B6.2 / explicit deferral | explicit deferral gate | If transactional edit grows past forecast, ship payment/filter safely first and chain edit next. |

## Data Flow

Payment update:

`route -> controller.cambiarPago -> model.updateEstadoPago -> findById -> response`

Edit flow:

`route -> controller.editar -> model.editWithTransaction`
`pedido FOR UPDATE -> read old detalle -> compute reposicion + nuevo requerimiento`
`-> lock union(productos) ORDER BY id FOR UPDATE`
`-> validate on restored stock view -> apply stock delta`
`-> rewrite pedido_detalle + total -> commit`

The edit algorithm restores previous reservations logically before validating new ones, so a failed edit rolls back pedido, detalle, and stock together.

## File Changes

| File | Action | Description |
|---|---|---|
| `backend/src/api/schemas/pedido.schema.js` | Modify | Add `editPedidoSchema`; extend `updateEstadoPagoSchema` with `comprobante_subido`; add `solo_pagos_pendientes` query flag. |
| `backend/src/api/routes/pedido.routes.js` | Modify | Add admin `PUT /:id`; keep filters on existing list route. |
| `backend/src/api/controllers/pedido.controller.js` | Modify | Add `editar`; map invalid pago/edit cases to `ValidationError`/`InsufficientStockError`. |
| `backend/src/api/models/pedido.model.js` | Modify | Add payment transition map, unpaid-filter query handling, and transactional edit helper plus shared stock-reconciliation helpers. |
| `backend/tests/caja.test.js` | Create | Focused coverage for pago transitions, unpaid filter, and edit rollback behavior. |

## Interfaces / Contracts

```js
// GET /api/admin/pedidos
{
  origen?: 'online' | 'caja',
  estado_pago?: 'pendiente' | 'comprobante_subido' | 'pagado' | 'rechazado',
  solo_pagos_pendientes?: boolean // true => estado_pago IN ('pendiente','rechazado')
}

// PATCH /api/admin/pedidos/:id/pago
{ estado_pago: 'pendiente' | 'comprobante_subido' | 'pagado' | 'rechazado' }

// PUT /api/admin/pedidos/:id
{ nombre_cliente?, mesa?, telefono_cliente?, observaciones?, metodo_pago?, items: [{ producto_id, cantidad }] }
```

Allowed pago transitions: `pendiente -> pagado|comprobante_subido`, `comprobante_subido -> pagado|rechazado`, `rechazado -> pendiente`, `pagado` terminal. `pendiente -> pagado` stays admin-allowed without requiring comprobante so caja cash, caja verified transfer, and pickup cash remain compatible.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit/model | payment map, unpaid filter builder, edit delta math | Jest with mocked pool/connection objects. |
| Integration/API | `PATCH /:id/pago`, `GET /admin/pedidos?solo_pagos_pendientes=true`, `PUT /:id` success + 409 rollback | `backend/tests/caja.test.js` using Supertest and mocked DB/auth seams already used by backend tests. |
| Manual | curl scenarios from spec, especially stock unchanged after pago changes and edit rollback | Local DB seeded per spec checklist. |

## Migration / Rollout

No migration required.

Apply gate: implement payment-state machine + unpaid filter first. Include `PUT /:id` only if the production diff remains comfortably within the 400-line review budget; otherwise defer the edit slice to a chained follow-up while keeping this design contract unchanged.

## Open Questions

- [ ] Confirm whether `solo_pagos_pendientes=true` should default `origen=caja` in apply, or stay generic and let callers pass `origen=caja` explicitly.
- [ ] If review sizing is tight, confirm the chained follow-up name for the deferred edit slice before apply.
