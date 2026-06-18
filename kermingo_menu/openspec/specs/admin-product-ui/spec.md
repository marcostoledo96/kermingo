# admin-product-ui Specification

## Purpose
Admin `/admin/productos` UI behavior for filters, grouping, and ordering.

## Requirements

### Requirement: Admin products must default to active filter and support all state filters
The UI MUST request `GET /api/admin/productos?estado=activo` by default and provide controls for `todos`, `activo`, `desactivado`, `agotado`, and `todavia_no_disponible`.

#### Scenario: Active filter on load
- GIVEN admin opens `/admin/productos`
- WHEN the screen mounts
- THEN it fetches products with `estado=activo`
- AND the active filter control is selected

#### Scenario: Filter switch refetches
- GIVEN admin is viewing active products
- WHEN admin selects `Agotado`
- THEN the UI refetches with `estado=agotado`
- AND shows the empty state if no products match

### Requirement: Admin products must be grouped by category
The UI MUST group listed products by category (`Merienda`, `Cena`, etc.) while preserving API order within each group.

#### Scenario: Products render under category headings
- GIVEN products belong to multiple categories
- WHEN the admin list renders
- THEN each product appears under its category group
- AND ordering inside each group follows `orden`

### Requirement: Admin must set not-yet-available state
Create/edit controls MUST allow setting `disponible=false` independently from `activo=false`.

#### Scenario: Admin marks product not yet available
- GIVEN admin edits an active product
- WHEN admin sets `Todavía no disponible`
- THEN the update payload persists `disponible=false`
- AND the product appears in that filter afterwards

## Expected Tests
- Component tests for default filter, filter refetch URL, category headings, empty state, and availability control.
