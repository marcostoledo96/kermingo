# Delta for Store Configuration

## MODIFIED Requirements

### Requirement: Store configuration model must provide store-open assertion

The system MUST provide an `assertStoreOpen(pool)` function in the store configuration model that performs a cheap, non-locking `SELECT estado FROM configuracion_tienda WHERE id = 1` query. If `estado !== 'abierta'`, the function MUST throw a `ValidationError` with message `"La tienda esta cerrada"`. This function MUST NOT start a transaction or acquire locks — it is a read-only preflight check.

(Previously: No preflight function existed; store state was only checked during pedido creation within the transaction)

#### Scenario: Store is open — assertion passes

- GIVEN `configuracion_tienda.estado = 'abierta'` for `id = 1`
- WHEN `assertStoreOpen(pool)` is called
- THEN the function returns without throwing
- AND no transaction or lock is acquired

#### Scenario: Store is closed — assertion fails

- GIVEN `configuracion_tienda.estado = 'cerrada'` for `id = 1`
- WHEN `assertStoreOpen(pool)` is called
- THEN the function throws `ValidationError` with message `"La tienda esta cerrada"`
- AND the caller can catch and return HTTP 400

#### Scenario: Store config row missing — assertion fails safely

- GIVEN no row exists in `configuracion_tienda` with `id = 1`
- WHEN `assertStoreOpen(pool)` is called
- THEN the function throws `ValidationError` (treats missing config as closed)

**Traceability**: `backend/src/api/models/pedido.model.js` (or `configuracion.model.js`), `backend/src/api/controllers/pedido.controller.js`, `backend/tests/comprobantes.test.js`
