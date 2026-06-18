# product-ordering Specification

## Purpose
Global product order controls the order shown by admin and public product lists.

## Requirements

### Requirement: Public and admin product APIs must order by producto.orden
`GET /api/productos` and `GET /api/admin/productos` MUST sort by `orden ASC` and then a deterministic fallback.

#### Scenario: Public products follow admin order
- GIVEN admin reordered products to `B` before `A`
- WHEN public menu fetches `/api/productos`
- THEN `B` appears before `A` in the response

#### Scenario: Equal order remains stable
- GIVEN products share the same `orden`
- WHEN either product API is called repeatedly
- THEN products are returned in the same fallback order every time

### Requirement: Admin UI must support drag/drop reorder with accessible fallback
`/admin/productos` MUST let desktop admins reorder products with drag/drop and MUST provide a keyboard or button-based fallback (for accessibility and mobile).

#### Scenario: Drag/drop reorder persists
- GIVEN admin is on `/admin/productos`
- WHEN admin drags a product to a new position and confirms or drops
- THEN the UI calls the reorder API
- AND the product order remains after refresh

#### Scenario: Accessible fallback reorder persists
- GIVEN drag/drop is unavailable or user navigates by keyboard
- WHEN admin uses move up/down controls
- THEN the same reorder contract is used
- AND the visible order updates after success

## Expected Tests
- Component tests for visible reorder controls and fallback.
- Backend tests proving API order changes are reflected in public list responses.
