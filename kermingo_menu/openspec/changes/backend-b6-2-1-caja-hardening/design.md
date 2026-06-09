# Design: B6.2.1 Caja Hardening

## Technical Approach

This design hardens the payment state machine and transaction boundaries for Kermingo's point-of-sale ("caja") orders. It ensures that payment states are modified atomically, correctly consider the payment method, and handle partial edits safely, directly addressing the vulnerabilities found in the external audit.

## Architecture Decisions

### Decision: Atomic `updateEstadoPago`

**Choice**: Refactor `updateEstadoPago` to use a MySQL transaction with `SELECT ... FOR UPDATE`.
**Alternatives considered**: Optimistic locking with a `WHERE estado_pago = ?` clause.
**Rationale**: `SELECT ... FOR UPDATE` aligns with the existing concurrency control strategy used in `editWithTransaction` and `createWithTransaction`. It provides safe locking to check terminal states (`pagado`) and prevents concurrent writes from violating the state machine.

### Decision: Payment State Machine depends on `metodo_pago`

**Choice**: Pass `metodo_pago` as a third argument to `validatePaymentTransition` to define valid transitions per method.
**Alternatives considered**: Keep a single generic state machine and validate method manually in the controller.
**Rationale**: Centralizing the logic in `validatePaymentTransition` guarantees that models enforcing the transitions (like `updateEstadoPago`) automatically reject invalid paths (e.g., `efectivo` to `comprobante_subido`).

### Decision: Coherent `estado_pago` on partial edits

**Choice**: If an edit changes `metodo_pago`, the system will automatically coerce `estado_pago` to `pendiente` if the existing state is invalid for the new method.
**Alternatives considered**: Reject the edit request if the resulting state would be invalid.
**Rationale**: Coercion provides a better user experience for admins editing a payment method on the fly (e.g., a customer switching from transfer to cash). 

### Decision: Partial Edits via `editWithTransaction`

**Choice**: Allow `PUT /api/admin/pedidos/:id` to omit `items` if only metadata is being updated.
**Alternatives considered**: Force the client to always send `items`.
**Rationale**: Passing `items` forces an unnecessary and heavy stock reconciliation cycle for simple edits (e.g., fixing a customer's name). Making `items` optional avoids this overhead and simplifies frontend requests.

## Data Flow

    [Admin Client]
         │ 1. PUT /api/admin/pedidos/:id
         ▼
    [Controller] (Maps specific domain errors to 400/409 instead of 500)
         │ 2. editWithTransaction(data)
         ▼
    [Model] 
         │ 3. SELECT ... FOR UPDATE (Lock order)
         │ 4. If data.items is present -> Reconcile Stock 
         │ 5. If data.metodo_pago changes -> Coerce estado_pago
         │ 6. UPDATE pedido
         ▼
    [MySQL Database]

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/api/models/pedido.model.js` | Modify | Update `updateEstadoPago` to be transactional. Update `validatePaymentTransition` to accept `metodo_pago`. Skip stock reconciliation in `editWithTransaction` if `!data.items`. Coerce `estado_pago` if `metodo_pago` changes. |
| `backend/src/api/controllers/pedido.controller.js` | Modify | Catch specific string errors from `editWithTransaction` and map them to `ValidationError` or `InsufficientStockError`. Handle `-2` from `cambiarPago`. |
| `backend/src/api/schemas/pedido.schema.js` | Modify | Make `items` optional in `editPedidoSchema` and add `.refine` to require at least one field. |
| `backend/src/api/routes/configuracion.routes.js` | Modify | Import and apply `requireTrustedOrigin` to `adminRouter.put('/')`. |
| `backend/tests/caja.test.js` | Modify | Add a random `RUN_ID` for isolated tests, skip `cancelado` orders in test cleanup stock restoration, and add `pool.end()` in `afterAll`. |

## Interfaces / Contracts

**`validatePaymentTransition(from, to, metodoPago)`**
Validates state transitions using a dictionary structured by payment method:
```javascript
const transitionsByMethod = {
  efectivo: { pendiente: ['pagado'], pagado: [] },
  transferencia: {
    pendiente: ['pagado', 'comprobante_subido'],
    comprobante_subido: ['pagado', 'rechazado'],
    rechazado: ['pendiente', 'comprobante_subido'],
    pagado: []
  }
};
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Integration | Payment Transitions | Verify `efectivo` rejects `comprobante_subido`. Verify `transferencia` allows `rechazado -> comprobante_subido`. |
| Integration | Concurrent Payment | Not explicitly required by E2E runner, but logically tested by ensuring terminal states are protected. |
| Integration | Cancelled Order | Verify a cancelled order rejects changes to payment states. |
| Integration | Partial Edit | Verify `PUT` can update `nombre_cliente` without sending `items`. |

## Migration / Rollout

No database schema migration is required. 

## Open Questions

- None
