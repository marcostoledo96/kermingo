# product-availability-states Specification

## Purpose
Define purchasability and visibility for active, inactive, sold-out, and not-yet-available products.

## Requirements

### Requirement: Product visibility and purchase rules must be state-based
Public menu MUST hide `desactivado` products. It MUST show `agotado` and `todavia_no_disponible` products disabled. Only `activo=1 AND disponible=1` products with available stock MUST be purchasable.

#### Scenario: Disabled public states
- GIVEN one sold-out product and one not-yet-available product
- WHEN public menu renders them
- THEN both are visible but cannot be added to cart
- AND copy clearly says `Agotado` or `Todavía no disponible`

#### Scenario: Desactivado hidden
- GIVEN a product with `activo=0`
- WHEN public menu loads
- THEN the product is not displayed

### Requirement: Backend order creation must reject unavailable products
Order creation MUST reject products where `activo=0` or `disponible=0`, even if the frontend is bypassed. Existing stock validation MUST still reject sold-out products.

#### Scenario: Bypassed frontend cannot order unavailable product
- GIVEN a product has `activo=1`, `disponible=0`, and stock
- WHEN `POST /api/pedidos` includes that product
- THEN the API responds 400
- AND no pedido or stock mutation is committed

#### Scenario: Active available product can be ordered
- GIVEN the store is open and a product is active, available, and in stock
- WHEN `POST /api/pedidos` includes that product
- THEN the pedido is created using existing payment rules

## Expected Tests
- Backend order tests for `disponible=0`, `activo=0`, sold-out, and purchasable products.
- Frontend tests for disabled buttons/copy in menu cards.
