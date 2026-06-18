# Delta for store-configuration

## ADDED Requirements

### Requirement: Store configuration must expose default menu category
Public and admin configuration responses MUST include `categoria_default`, constrained to `merienda|cena`. Admin update MUST allow changing it through the existing protected configuration endpoint.

#### Scenario: Public config includes default category
- GIVEN `configuracion_tienda.categoria_default='cena'`
- WHEN public client calls `GET /api/configuracion-tienda`
- THEN the response includes `categoria_default: 'cena'`

#### Scenario: Admin updates default category
- GIVEN an authenticated admin with trusted origin
- WHEN admin updates config with `categoria_default='merienda'`
- THEN the API returns 200
- AND later public menu config reads `merienda`

#### Scenario: Invalid category is rejected
- GIVEN an authenticated admin
- WHEN admin sends `categoria_default='almuerzo'`
- THEN the API returns 400
- AND stored config remains unchanged

## Expected Tests
- Backend config tests for public/admin read, valid update, invalid enum, and no-op update.
- Frontend admin config test for rendering and saving the selector.
