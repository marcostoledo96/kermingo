# Productos API — SDD Change Specification

## Summary

REST API CRUD for Kermingo event products. Public endpoints expose the catalog for customers; admin endpoints allow managers to create, update, deactivate, and adjust stock. All admin operations are currently guarded by a placeholder middleware that logs a warning and passes through — real JWT auth is deferred to Etapa B4.

## Endpoints

### GET /api/productos

**Purpose**: Public catalog — all active products.

**Auth**: None.

**Query parameters** (all optional):

| Parameter  | Type   | Description                           |
|-------------|--------|---------------------------------------|
| `tipo`      | string | Filter by `comida`, `bebida`, or `promo` |
| `categoria` | string | Filter by category name (exact match, case-insensitive via SQL) |
| `buscar`    | string | Free-text search on product name (LIKE `%buscar%`) |

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Productos obtenidos correctamente",
  "data": [
    {
      "id": 1,
      "nombre": "Pizza muzza",
      "descripcion": "Pizza grande",
      "precio": 4500,
      "tipo": "comida",
      "stock_limitado": 1,
      "stock_actual": 30,
      "stock_minimo_alerta": 5,
      "activo": 1,
      "categorias": "Pizza, Italiana"
    }
  ]
}
```

**Business rules**:
- Only returns products with `activo = 1`.
- JOINs with `producto_categoria` and `categoria` to include comma-separated `categorias` field.
- Results ordered by `tipo`, then `nombre`.
- Returns all matching products (no pagination on public list).

---

### GET /api/productos/:id

**Purpose**: Public detail view of a single active product.

**Auth**: None.

**Params**:

| Field | Type   | Validation                          |
|-------|--------|-------------------------------------|
| `id`  | number | Zod coercion, integer, min(1)        |

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Producto encontrado",
  "data": {
    "id": 1,
    "nombre": "Pizza muzza",
    "descripcion": "Pizza grande",
    "precio": 4500,
    "tipo": "comida",
    "stock_limitado": 1,
    "stock_actual": 30,
    "stock_minimo_alerta": 5,
    "activo": 1,
    "categorias": "Pizza, Italiana"
  }
}
```

**Error responses**:
- `404 Not Found`: Product does not exist OR is inactive (`activo = 0`).

---

### GET /api/admin/productos

**Purpose**: Admin listing with pagination and filters.

**Auth**: `requireAdmin` placeholder (logs warning, passes through). Real auth in B4.

**Query parameters**:

| Parameter | Type    | Default | Description                                |
|-----------|---------|---------|--------------------------------------------|
| `page`    | integer | 1       | Page number (coerced from string)          |
| `limit`   | integer | 24      | Items per page (max 100, min 1)             |
| `estado`  | string  | —       | `activo` or `inactivo` filter               |
| `tipo`    | string  | —       | `comida`, `bebida`, or `promo`              |

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Productos obtenidos correctamente",
  "data": {
    "productos": [...],
    "paginacion": {
      "total": 25,
      "page": 1,
      "limit": 24,
      "totalPages": 2
    }
  }
}
```

**Business rules**:
- Returns ALL products (active and inactive) unless filtered by `estado`.
- Two queries executed: one for count, one for data with `LIMIT ? OFFSET ?`.
- `page` and `limit` are coerced via Zod (`z.coerce.number().int().min(1)`).
- `limit` capped at 100.

---

### POST /api/admin/productos

**Purpose**: Create a new product.

**Auth**: `requireAdmin` placeholder.

**Request body** (all via Zod `createProductoSchema`):

| Field               | Type    | Required | Validation                                          |
|---------------------|---------|----------|-----------------------------------------------------|
| `nombre`            | string  | Yes      | min(1), max(120)                                    |
| `descripcion`       | string  | No       | max(500)                                            |
| `precio`            | number  | Yes      | coerced, min(0)                                      |
| `tipo`              | string  | Yes      | enum: `comida`, `bebida`, `promo`                   |
| `stock_limitado`    | number  | Yes      | coerced, must be 0 or 1                              |
| `stock_actual`      | number  | No       | coerced, int, min(0)                                |
| `stock_minimo_alerta` | number | No    | coerced, int, min(0), default(5)                    |
| `activo`            | number  | No       | must be 0 or 1, default(1)                          |

**Response** `201 Created`:
```json
{
  "success": true,
  "message": "Producto creado correctamente",
  "data": { ...producto created... }
}
```

**Error responses**:
- `400 Bad Request`: Validation error with field-level details.

**Business rules**:
- `INSERT INTO producto SET ?` — MySQL auto-generates `id`, `fecha_creacion`, `fecha_actualizacion`.
- After insert, fetches the created product via `findByIdPublic` to return the full record.

---

### PUT /api/admin/productos/:id

**Purpose**: Full or partial update of an existing product.

**Auth**: `requireAdmin` placeholder.

**Params**: `id` (integer, min(1)).

**Request body**: All fields optional (Zod `updateProductoSchema` = `createProductoSchema.partial()`).

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Producto actualizado correctamente",
  "data": { ...updated producto... }
}
```

**Error responses**:
- `404 Not Found`: No product with that id.

**Business rules**:
- `UPDATE producto SET ? WHERE id = ?` with `[data, id]`.
- Checks `affectedRows === 0` to throw `NotFoundError`.
- Returns the updated product (via `findByIdPublic`).

---

### PATCH /api/admin/productos/:id/desactivar

**Purpose**: Soft-delete a product.

**Auth**: `requireAdmin` placeholder.

**Params**: `id` (integer, min(1)).

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Producto desactivado correctamente",
  "data": { "id": 5, "activo": 0 }
}
```

**Error responses**:
- `404 Not Found`: No product with that id.

**Business rules**:
- Sets `activo = 0`. Does NOT physically delete the row.
- Checks `affectedRows === 0` for `NotFoundError`.

---

### PATCH /api/admin/productos/:id/recuperar

**Purpose**: Restore a soft-deleted product.

**Auth**: `requireAdmin` placeholder.

**Params**: `id` (integer, min(1)).

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Producto recuperado correctamente",
  "data": { "id": 5, "activo": 1 }
}
```

**Error responses**:
- `404 Not Found`: No product with that id.

**Business rules**:
- Sets `activo = 1`. Reverses a prior deactivation.
- Checks `affectedRows === 0` for `NotFoundError`.

---

### PATCH /api/admin/productos/:id/stock

**Purpose**: Adjust the current stock of a product (for manual corrections or receiving inventory).

**Auth**: `requireAdmin` placeholder.

**Params**: `id` (integer, min(1)).

**Request body**:

| Field         | Type   | Required | Validation              |
|---------------|--------|----------|-------------------------|
| `stock_actual`| number | Yes      | coerced, int, min(0)    |

**Response** `200 OK`:
```json
{
  "success": true,
  "message": "Stock actualizado correctamente",
  "data": { "id": 3, "stock_actual": 50 }
}
```

**Error responses**:
- `400 Bad Request`: Missing or invalid `stock_actual`.
- `404 Not Found`: No product with that id.

**Business rules**:
- Directly sets `stock_actual` to the provided value (absolute, not delta).
- Use `actualizarStock` endpoint for delta adjustments in the future.

---

## Architecture

### MVC Structure

```
producto.routes.js  →  producto.controller.js  →  producto.model.js
                          ↓                         ↓
                    validate.middleware.js    db.js (mysql2/pool)
                    admin.middleware.js
```

### Middlewares

**`validate.middleware.js`** — Generic Zod validation:
- `validateBody(schema)` — parses and validates `req.body`; returns 400 with field errors on failure.
- `validateQuery(schema)` — same for `req.query`.
- `validateParams(schema)` — same for `req.params`.

**`admin.middleware.js`** — `requireAdmin` placeholder:
- Currently logs `⚠️ Admin auth middleware called` and passes `next()`.
- Real implementation in B4: verify JWT cookie, check admin role, return 401 if unauthorized.

### Schemas (`producto.schema.js`)

| Schema                | Used for                          |
|-----------------------|------------------------------------|
| `productoQuerySchema`  | GET /api/productos query params    |
| `adminProductoQuerySchema` | GET /api/admin/productos query |
| `createProductoSchema`| POST /api/admin/productos body     |
| `updateProductoSchema`| PUT /api/admin/productos body (partial) |
| `stockAdjustmentSchema` | PATCH .../stock body            |
| `idParamSchema`       | All routes with `:id` param        |

### Responses

All responses use `respuestaExitosa` / `respuestaError` from `backend/src/api/utils/respuesta.utils.js`, ensuring a uniform envelope:
```json
{
  "success": true|false,
  "message": "string",
  "data": ...
}
```

### Error handling

Controllers wrap all model calls in `try/catch` and pass to `next(err)`. Global error handler middleware (expected in a later stage) formats errors consistently.

---

## Files

| File | Role |
|------|------|
| `backend/src/api/middlewares/validate.middleware.js` | Generic Zod validation middleware factory |
| `backend/src/api/middlewares/admin.middleware.js` | Placeholder `requireAdmin` (logs, passes) |
| `backend/src/api/schemas/producto.schema.js` | 6 Zod schemas |
| `backend/src/api/models/producto.model.js` | 8 MySQL query functions |
| `backend/src/api/controllers/producto.controller.js` | 8 handler functions |
| `backend/src/api/routes/producto.routes.js` | 2 Routers (publicRouter, adminRouter), 8 routes |
| `backend/src/api/routes/index.routes.js` | Mounts producto routes at `/productos` and `/admin/productos` |
| `backend/package.json` | Added `zod` dependency (v4) |

---

## Deferred items

- **Real admin auth** — `requireAdmin` is a placeholder. JWT cookie verification and role checking will be implemented in **Etapa B4 (Auth admin)**.
- **Google Drive image URLs** — Product images are stored in the DB as plain URLs or paths. Full Drive upload integration deferred to **Etapa B6**.

---

## Verification

All 11 curl tests passed:
- Public list (25 products returned)
- Filter `?tipo=comida` (15 items)
- Detail view (Pizza muzza id=1)
- 404 for nonexistent product
- Admin pagination (total=25, paginacion metadata correct)
- Create (201, product returned)
- Validation error (400, field-level details)
- Deactivate (activo=0 returned)
- Restore (activo=1 returned)
- Stock adjustment (updated value returned)

---

## Next step

**Etapa B4 — Auth admin**: Login, JWT in httpOnly cookie, logout, `/admin/me`, CORS credentials, bcrypt password hashing.