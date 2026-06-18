# public-menu Specification

## Purpose
Public menu behavior for product grouping by category tabs, configured default tab, ordering, and disabled purchase states.

## Requirements

### Requirement: Public menu must use configured default tab
The public menu MUST read `configuracion_tienda.categoria_default` and initially select that tab. Users MUST still be able to switch between `merienda` and `cena` and buy eligible products from either category.

#### Scenario: Default tab comes from config
- GIVEN public config has `categoria_default='cena'`
- WHEN the public menu loads
- THEN the `Cena` tab is initially selected

#### Scenario: User can switch tabs freely
- GIVEN the default tab is `merienda`
- WHEN the user selects `Cena`
- THEN Cena products are shown
- AND purchasable Cena products can be added to cart

### Requirement: Public menu must respect API order and availability
Public menu MUST render products in API order and MUST not enable purchase for sold-out or not-yet-available products.

#### Scenario: Menu respects API order
- GIVEN `/api/productos` returns products sorted by `orden`
- WHEN the menu renders a category
- THEN cards appear in that response order

#### Scenario: Not-yet-available copy is clear
- GIVEN a product has `disponible=0`
- WHEN it appears in the public menu
- THEN the add button is disabled
- AND visible copy says `Todavía no disponible`

## Expected Tests
- Component tests for initial tab from config, tab switching, order rendering, and disabled copy.
