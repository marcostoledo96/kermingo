# Productos API Specification

## Purpose

Define the complete CRUD API for the `producto` entity in the Kermingo backend, covering public browsing endpoints and admin management endpoints.

## Requirements

### Requirement: Public product list endpoint

The system MUST expose `GET /api/productos` returning only products where `activo = 1` and that are available for purchase.

#### Scenario: Happy path — list active products

- GIVEN the database contains 24 seeded products
- WHEN a client sends `GET /api/productos`
- THEN the response status MUST be `200`
- AND `data` MUST be an array of active products
- AND each product MUST include `id`, `nombre`, `descripcion`, `precio`, `tipo`, `stock_actual`, `activo`, `imagen_url`
- AND products where `activo = 0` MUST NOT appear

#### Scenario: Filter by category

- GIVEN products are linked to categories via `producto_categoria`
- WHEN a client sends `GET /api/productos?categoria=merienda`
- THEN `data` MUST contain only products associated with category "Merienda"

#### Scenario: Filter by type

- GIVEN products have `tipo` in (`comida`, `bebida`, `promo`)
- WHEN a client sends `GET /api/productos?tipo=bebida`
- THEN `data` MUST contain only products with `tipo = 'bebida'`

#### Scenario: Search by name

- GIVEN products exist with names like "Pizza muzza"
- WHEN a client sends `GET /api/productos?buscar=pizza`
- THEN `data` MUST contain products whose `nombre` matches the search term (case-insensitive)

#### Scenario: Combined filters

- GIVEN a product exists with `tipo = 'comida'` and linked to `categoria = 'cena'`
- WHEN a client sends `GET /api/productos?tipo=comida&categoria=cena&buscar=muzza`
- THEN `data` MUST contain only products matching all three criteria

#### Scenario: Promo availability depends on component stock

- GIVEN a promo product has `stock_limitado = 0` and its components have sufficient stock
- WHEN a client requests the promo via `GET /api/productos`
- THEN the promo MUST be included with `disponible: true`
- AND if any component has `stock_actual = 0`, the promo MUST be included with `disponible: false`

### Requirement: Public product detail endpoint

The system MUST expose `GET /api/productos/:id` returning full details of a single active product.

#### Scenario: Happy path — detail active product

- GIVEN product ID `1` (Pizza muzza) exists and `activo = 1`
- WHEN a client sends `GET /api/productos/1`
- THEN the response status MUST be `200`
- AND `data` MUST contain the full product record
- AND if the product is a promo, `data.componentes` MUST list its combo items with quantities

#### Scenario: Inactive product is invisible

- GIVEN product ID `X` has `activo = 0`
- WHEN a client sends `GET /api/productos/X`
- THEN the response status MUST be `404`
- AND `error` MUST be `"Producto no encontrado"`

#### Scenario: Nonexistent product

- GIVEN product ID `9999` does not exist
- WHEN a client sends `GET /api/productos/9999`
- THEN the response status MUST be `404`
- AND `error` MUST be `"Producto no encontrado"`

### Requirement: Admin product list endpoint

The system MUST expose `GET /api/admin/productos` protected by admin authentication, returning all products (active and inactive) with pagination.

#### Scenario: Happy path — admin lists all products

- GIVEN an authenticated admin user
- WHEN sending `GET /api/admin/productos?page=1&limit=24`
- THEN the response status MUST be `200`
- AND `data.productos` MUST contain all 24 seeded products regardless of `activo`
- AND `data.paginacion` MUST include `total`, `page`, `limit`, `totalPages`

#### Scenario: Admin filters by estado

- GIVEN products with mixed `activo` values
- WHEN sending `GET /api/admin/productos?estado=activo`
- THEN `data.productos` MUST contain only products with `activo = 1`

#### Scenario: Admin filters by tipo

- GIVEN products with mixed `tipo` values
- WHEN sending `GET /api/admin/productos?tipo=promo`
- THEN `data.productos` MUST contain only products with `tipo = 'promo'`

#### Scenario: Unauthenticated access is rejected

- GIVEN no valid admin cookie
- WHEN sending `GET /api/admin/productos`
- THEN the response status MUST be `401`
- AND `error` MUST indicate authentication failure

### Requirement: Admin create product endpoint

The system MUST expose `POST /api/admin/productos` protected by admin authentication, allowing creation of new products with optional image upload.

#### Scenario: Happy path — create simple product

- GIVEN an authenticated admin
- WHEN sending `POST /api/admin/productos` with JSON body containing `nombre`, `precio`, `tipo`, `stock_limitado`, `stock_actual`, `stock_minimo_alerta`
- THEN the response status MUST be `201`
- AND `data.id` MUST be the newly created product ID
- AND `data.nombre` MUST match the request

#### Scenario: Create product with image

- GIVEN an authenticated admin
- WHEN sending a multipart request with product fields and an image file
- THEN the image MUST be uploaded to Google Drive
- AND the product MUST be created with `imagen_archivo_id` referencing the uploaded file

#### Scenario: Create promo with components

- GIVEN an authenticated admin
- WHEN sending a request with `tipo = 'promo'`, `stock_limitado = 0`, and `componentes` array like `[{producto_id: 10, cantidad: 3}]`
- THEN the promo product MUST be created
- AND entries MUST be inserted into `combo_producto`

#### Scenario: Validation rejects missing name

- GIVEN an authenticated admin
- WHEN sending `POST /api/admin/productos` without `nombre`
- THEN the response status MUST be `400`
- AND `error` MUST indicate validation failure for `nombre`

#### Scenario: Validation rejects negative price

- GIVEN an authenticated admin
- WHEN sending `POST /api/admin/productos` with `precio = -100`
- THEN the response status MUST be `400`
- AND `error` MUST indicate price must be non-negative

### Requirement: Admin update product endpoint

The system MUST expose `PUT /api/admin/productos/:id` protected by admin authentication, allowing full or partial updates with optional image replacement.

#### Scenario: Happy path — update product fields

- GIVEN an authenticated admin and product ID `1` exists
- WHEN sending `PUT /api/admin/productos/1` with `{precio: 3600, stock_actual: 25}`
- THEN the response status MUST be `200`
- AND `data.precio` MUST be `3600`
- AND `data.stock_actual` MUST be `25`

#### Scenario: Update replaces image

- GIVEN an authenticated admin and product with existing image
- WHEN sending a multipart `PUT` with a new image file
- THEN the old image MAY be kept or replaced
- AND the product MUST reference the new `imagen_archivo_id`

#### Scenario: Update nonexistent product

- GIVEN product ID `9999` does not exist
- WHEN sending `PUT /api/admin/productos/9999`
- THEN the response status MUST be `404`
- AND `error` MUST be `"Producto no encontrado"`

#### Scenario: Changing tipo from promo to comida clears components

- GIVEN a promo product has componentes in `combo_producto`
- WHEN sending `PUT` with `tipo = 'comida'`
- THEN all related `combo_producto` rows MUST be deleted

### Requirement: Admin soft-delete endpoint

The system MUST expose `PATCH /api/admin/productos/:id/desactivar` to set `activo = 0` without deleting the row.

#### Scenario: Happy path — deactivate product

- GIVEN product ID `1` is active
- WHEN an authenticated admin sends `PATCH /api/admin/productos/1/desactivar`
- THEN the response status MUST be `200`
- AND `data.activo` MUST be `0`

#### Scenario: Deactivate already inactive product

- GIVEN product ID `1` already has `activo = 0`
- WHEN sending the deactivate patch
- THEN the response status MUST still be `200`
- OR `404` with a clear message

### Requirement: Admin restore endpoint

The system MUST expose `PATCH /api/admin/productos/:id/recuperar` to set `activo = 1`.

#### Scenario: Happy path — restore product

- GIVEN product ID `1` is inactive
- WHEN an authenticated admin sends `PATCH /api/admin/productos/1/recuperar`
- THEN the response status MUST be `200`
- AND `data.activo` MUST be `1`

### Requirement: Admin stock adjustment endpoint

The system MUST expose `PATCH /api/admin/productos/:id/stock` to update `stock_actual` directly.

#### Scenario: Happy path — adjust stock

- GIVEN product ID `1` has `stock_actual = 30`
- WHEN an authenticated admin sends `PATCH /api/admin/productos/1/stock` with `{stock_actual: 45}`
- THEN the response status MUST be `200`
- AND `data.stock_actual` MUST be `45`

#### Scenario: Validation rejects negative stock

- GIVEN an authenticated admin
- WHEN sending stock patch with `stock_actual = -5`
- THEN the response status MUST be `400`
- AND `error` MUST indicate stock cannot be negative

#### Scenario: Stock adjustment for unlimited-stock product

- GIVEN product with `stock_limitado = 0` and `stock_actual = NULL`
- WHEN sending stock patch
- THEN the response MUST either reject the operation (400) or set `stock_limitado = 1` first

## Validation Rules

| Field | Rule | Error Message Pattern |
|-------|------|----------------------|
| `nombre` | Required, string, 1-120 chars | `"Nombre es obligatorio"` / `"Máximo 120 caracteres"` |
| `descripcion` | Optional, string, max 500 chars | `"Máximo 500 caracteres"` |
| `precio` | Required, number, >= 0 | `"Precio debe ser un número válido"` / `"Precio no puede ser negativo"` |
| `tipo` | Required, enum `comida`/`bebida`/`promo` | `"Tipo debe ser comida, bebida o promo"` |
| `stock_limitado` | Required, boolean/0/1 | `"stock_limitado debe ser 0 o 1"` |
| `stock_actual` | Required if `stock_limitado=1`, integer >= 0 | `"Stock actual es obligatorio para stock limitado"` / `"Stock no puede ser negativo"` |
| `stock_minimo_alerta` | Required, integer >= 0 | `"Stock mínimo de alerta es obligatorio"` |
| `componentes` | Required if `tipo=promo`, array of `{producto_id, cantidad}` | `"Promo debe tener componentes"` |

## Business Rules

1. **Inactive invisibility**: Public endpoints MUST treat `activo = 0` as nonexistent (404).
2. **Promo availability**: Promos with `stock_limitado = 0` MUST compute availability from component stock in `combo_producto`; if any component is out of stock, the promo is `disponible: false`.
3. **Image lifecycle**: On create with image, upload to Drive then link via `imagen_archivo_id`. On update with new image, old reference MAY be orphaned; Drive file cleanup is out of scope.
4. **Combo integrity**: When changing `tipo` away from `promo`, all `combo_producto` rows for that product MUST be deleted.
5. **Stock logic**: Products with `stock_limitado = 0` display `stock_actual: null` and are always considered in stock for availability.
6. **Price authority**: Backend validates and stores `precio`; frontend MUST NOT send prices to the backend for order calculation (orders use product price at time of creation, stored in `pedido_detalle`).
7. **No hard delete**: Products are only soft-deleted via `activo = 0`.
8. **Admin access**: All `/api/admin/*` endpoints MUST reject unauthenticated requests with `401`.

## Scenarios Summary

| # | Scenario | Endpoint | Type |
|---|----------|----------|------|
| 1 | List active products | `GET /api/productos` | Happy |
| 2 | Filter by category | `GET /api/productos?categoria=merienda` | Edge |
| 3 | Filter by type | `GET /api/productos?tipo=bebida` | Edge |
| 4 | Search by name | `GET /api/productos?buscar=pizza` | Edge |
| 5 | Combined filters | `GET /api/productos?tipo=comida&categoria=cena&buscar=muzza` | Edge |
| 6 | Promo availability | `GET /api/productos` | Business |
| 7 | Detail active product | `GET /api/productos/:id` | Happy |
| 8 | Inactive product invisible | `GET /api/productos/:id` | Error |
| 9 | Nonexistent product | `GET /api/productos/:id` | Error |
| 10 | Admin list with pagination | `GET /api/admin/productos` | Happy |
| 11 | Admin filter by estado | `GET /api/admin/productos?estado=activo` | Edge |
| 12 | Admin unauthenticated | `GET /api/admin/productos` | Error |
| 13 | Create simple product | `POST /api/admin/productos` | Happy |
| 14 | Create with image | `POST /api/admin/productos` | Happy |
| 15 | Create promo with components | `POST /api/admin/productos` | Happy |
| 16 | Validation missing name | `POST /api/admin/productos` | Error |
| 17 | Validation negative price | `POST /api/admin/productos` | Error |
| 18 | Update product fields | `PUT /api/admin/productos/:id` | Happy |
| 19 | Update replaces image | `PUT /api/admin/productos/:id` | Happy |
| 20 | Update nonexistent | `PUT /api/admin/productos/:id` | Error |
| 21 | Change tipo clears components | `PUT /api/admin/productos/:id` | Business |
| 22 | Deactivate product | `PATCH /api/admin/productos/:id/desactivar` | Happy |
| 23 | Restore product | `PATCH /api/admin/productos/:id/recuperar` | Happy |
| 24 | Adjust stock | `PATCH /api/admin/productos/:id/stock` | Happy |
| 25 | Reject negative stock | `PATCH /api/admin/productos/:id/stock` | Error |
| 26 | Stock on unlimited product | `PATCH /api/admin/productos/:id/stock` | Edge |

## Testability

- Unit tests for Zod schemas with valid and invalid payloads.
- Integration tests for each endpoint with seeded database.
- Auth middleware tests verifying `401` on all admin endpoints.
- Promo availability tests verifying component stock logic.
- Image upload tests with mock Multer and mock Drive service.
