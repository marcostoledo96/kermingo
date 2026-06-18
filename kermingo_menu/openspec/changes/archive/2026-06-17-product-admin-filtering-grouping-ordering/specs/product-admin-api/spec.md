# product-admin-api Specification

## Purpose
Admin product API contract for listing, filtering, updating, and reordering products.

## Requirements

### Requirement: Admin product listing must support estado filters
`GET /api/admin/productos` MUST accept `estado=activo|todos|desactivado|agotado|todavia_no_disponible`, defaulting to `activo`.

SQL semantics:
- `todos`: no state WHERE clause.
- `activo`: `activo=1 AND disponible=1 AND (stock_limitado=0 OR stock_actual IS NULL OR stock_actual > 0)`.
- `desactivado`: `activo=0`.
- `agotado`: `activo=1 AND disponible=1 AND stock_limitado=1 AND stock_actual=0`.
- `todavia_no_disponible`: `activo=1 AND disponible=0`.

#### Scenario: Default filter is active
- GIVEN products in all states
- WHEN admin calls `GET /api/admin/productos`
- THEN only products matching `estado=activo` are returned

#### Scenario: Explicit filters return matching SQL state
- GIVEN products in all states
- WHEN admin calls each supported `estado`
- THEN the response MUST contain only rows matching that filter semantics

### Requirement: Admin product ordering must be stable
Admin product lists MUST sort by `producto.orden ASC`, then a stable fallback (`id ASC` or equivalent deterministic key).

#### Scenario: Stable ordering
- GIVEN two products share the same `orden`
- WHEN admin lists products
- THEN their relative order is deterministic by fallback

### Requirement: Admin can update and reorder products
Admin create/update endpoints MUST accept `orden` and `disponible`. A protected reorder endpoint MUST update product order without changing unrelated fields.

#### Scenario: Reorder product
- GIVEN an authenticated admin and product `A`
- WHEN admin sends a valid reorder request
- THEN product `A.orden` is persisted
- AND subsequent admin and public listings reflect the new order

#### Scenario: Invalid availability state is rejected
- GIVEN an authenticated admin
- WHEN admin sends non-boolean `disponible` or invalid `estado` query
- THEN the API responds 400 with a validation error

## Expected Tests
- Backend integration tests for every `estado` filter, default filter, stable order, update `disponible`, and reorder persistence.
