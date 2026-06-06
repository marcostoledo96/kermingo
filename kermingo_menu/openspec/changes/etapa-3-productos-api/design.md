# Design: Productos API Backend Module

## Technical Approach

Implement 8 endpoints (2 public, 6 admin) for the `producto` entity using MVC layers with Zod validation. Public endpoints filter by `activo=1`; admin endpoints expose full CRUD with pagination. Admin auth enforcement is B4; the admin middleware is a placeholder that logs a warning and calls `next()`.

## Architecture Decisions

| Decision | Option | Tradeoff | Choice |
|----------|--------|----------|--------|
| Validation | Zod (not installed yet) | Clean schemas, ESM-native | Zod — install during apply |
| Route split | Two Routers vs one | Separation keeps concerns clean | `publicRouter` + `adminRouter` in one file |
| Pagination | Offset vs cursor | Offset simpler for admin tables | Offset (`page`, `limit`) |
| Promo availability | Model compute vs raw return | Model compute keeps controller thin | Model returns `disponible` boolean checking `combo_producto` stock |
| Soft delete | `activo` flag vs `deleted_at` | Flag matches existing schema | `activo` with `desactivar`/`recuperar` |
| Stock update | Dedicated PATCH vs full PUT | PATCH safer for concurrent ops | Dedicated `PATCH /:id/stock` |
| Query building | Concatenation vs query builder | No ORM; `?` placeholders are safe | Dynamic WHERE with `?` |

## Data Flow

```
Client → Route → validate.middleware → admin.middleware (placeholder) → Controller → Model → MySQL pool
                                        ↓
                                 error.middleware ← AppError / ValidationError / NotFoundError
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/api/schemas/producto.schema.js` | Create | Zod schemas for query, body, params |
| `backend/src/api/middlewares/validate.middleware.js` | Create | Generic Zod validation wrapper |
| `backend/src/api/middlewares/admin.middleware.js` | Create | Placeholder — logs warning, calls `next()` |
| `backend/src/api/models/producto.model.js` | Create | SQL queries with `mysql2/promise` |
| `backend/src/api/controllers/producto.controller.js` | Create | 8 route handlers |
| `backend/src/api/routes/producto.routes.js` | Create | `publicRouter` + `adminRouter` |
| `backend/src/api/routes/index.routes.js` | Modify | Mount both routers |
| `backend/package.json` | Modify | Add `zod` dependency |

## Interfaces / Contracts

### Zod Schemas (`producto.schema.js`)

```js
const productoQuerySchema = z.object({
  categoria: z.string().optional(),
  tipo: z.enum(['comida', 'bebida', 'promo']).optional(),
  buscar: z.string().max(50).optional(),
});

const adminProductoQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(24),
  estado: z.enum(['activo', 'inactivo']).optional(),
  tipo: z.enum(['comida', 'bebida', 'promo']).optional(),
});

const createProductoSchema = z.object({
  nombre: z.string().min(1).max(120),
  descripcion: z.string().max(500).optional(),
  precio: z.coerce.number().min(0),
  tipo: z.enum(['comida', 'bebida', 'promo']),
  stock_limitado: z.coerce.number().refine(v => v === 0 || v === 1),
  stock_actual: z.coerce.number().min(0).optional(),
  stock_minimo_alerta: z.coerce.number().min(0).default(5),
  imagen_archivo_id: z.coerce.number().optional(),
  componentes: z.array(z.object({
    producto_id: z.coerce.number(),
    cantidad: z.coerce.number().min(1),
  })).optional(),
});

const updateProductoSchema = createProductoSchema.partial();

const stockAdjustmentSchema = z.object({
  stock_actual: z.coerce.number().min(0),
});

const idParamSchema = z.object({
  id: z.coerce.number().min(1),
});
```

### Model Queries (`producto.model.js`)

| Function | SQL | Params | Returns |
|----------|-----|--------|---------|
| `findAllPublic(filters)` | `SELECT p.*, GROUP_CONCAT(c.nombre) as categorias FROM producto p LEFT JOIN producto_categoria pc ON p.id=pc.producto_id LEFT JOIN categoria c ON pc.categoria_id=c.id WHERE p.activo=1 [AND tipo=?] [AND c.nombre=?] [AND p.nombre LIKE ?] GROUP BY p.id ORDER BY p.tipo, p.nombre` | dynamic | `RowDataPacket[]` |
| `findByIdPublic(id)` | Same + `AND p.id=?` | `[id]` | row or null |
| `findAllAdmin({page,limit,estado,tipo})` | `SELECT p.*, GROUP_CONCAT(c.nombre) as categorias FROM producto p LEFT JOIN ... WHERE 1=1 [AND activo=?] [AND tipo=?] GROUP BY p.id ORDER BY p.id DESC LIMIT ? OFFSET ?` | dynamic + `[limit, offset]` | `{productos, total}` |
| `findByIdAdmin(id)` | Same as `findByIdPublic` without `activo=1` | `[id]` | row or null |
| `create(data)` | `INSERT INTO producto SET ?` | `[data]` | `{insertId}` |
| `update(id, data)` | `UPDATE producto SET ? WHERE id=?` | `[data, id]` | affected rows |
| `deactivate(id)` | `UPDATE producto SET activo=0 WHERE id=?` | `[id]` | affected rows |
| `restore(id)` | `UPDATE producto SET activo=1 WHERE id=?` | `[id]` | affected rows |
| `updateStock(id, stock)` | `UPDATE producto SET stock_actual=? WHERE id=?` | `[stock, id]` | affected rows |
| `findComboComponents(comboId)` | `SELECT cp.*, p.stock_actual, p.stock_limitado FROM combo_producto cp JOIN producto p ON cp.producto_id=p.id WHERE cp.combo_id=?` | `[comboId]` | components |
| `createComboComponents(comboId, arr)` | `INSERT INTO combo_producto (combo_id, producto_id, cantidad) VALUES ?` | 2D array | affected rows |
| `deleteComboComponents(comboId)` | `DELETE FROM combo_producto WHERE combo_id=?` | `[comboId]` | affected rows |

### Controller Handlers (`producto.controller.js`)

| Handler | Flow |
|---------|------|
| `listar` | `validate query → model.findAllPublic → respuestaExitosa(res, productos)` |
| `obtener` | `validate params → model.findByIdPublic → if null throw NotFoundError → respuestaExitosa` |
| `listarAdmin` | `validate query → model.findAllAdmin → respuestaExitosa(res, {productos, paginacion})` |
| `crear` | `validate body → if tipo=promo & componentes → create product → create components → respuestaExitosa(res, product, 201)` |
| `actualizar` | `validate params+body → model.findByIdAdmin → if null throw NotFoundError → if tipo changed away from promo → deleteComboComponents → model.update → respuestaExitosa` |
| `desactivar` | `validate params → model.deactivate → if 0 rows throw NotFoundError → respuestaExitosa` |
| `recuperar` | `validate params → model.restore → if 0 rows throw NotFoundError → respuestaExitosa` |
| `ajustarStock` | `validate params+body → model.updateStock → if 0 rows throw NotFoundError → respuestaExitosa` |

## Route Mounting

In `index.routes.js`:
```js
import { publicRouter, adminRouter } from './producto.routes.js';
router.use('/productos', publicRouter);
router.use('/admin/productos', adminRouter);
```

`producto.routes.js` exports both routers. `publicRouter` has no middleware; `adminRouter` chains `validate.middleware` + `admin.middleware` + controller.

## Error Mapping

| Error Type | HTTP Status | Source |
|------------|-------------|--------|
| `ZodError` | `400` | `validate.middleware` transforms to `ValidationError` |
| `ValidationError` | `400` | Explicit throws in controller/model |
| `NotFoundError` | `404` | Model returns null / 0 affected rows |
| `AuthError` | `401` | Admin middleware (B4) — placeholder skips |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | Zod schemas | Jest + valid/invalid payloads |
| Integration | All 8 endpoints | Supertest against seeded DB |
| Integration | Auth rejection | Mock `requireAdmin` to throw `AuthError` |

## Migration / Rollout

No migration required. Database schema and seed already in place.

## Open Questions

- [ ] Should `update` with `tipo=promo` also upsert `combo_producto` rows? (Spec implies yes.)
- [ ] Should `PATCH /stock` automatically set `stock_limitado=1` when `stock_actual` is provided for an unlimited product? (Spec suggests yes or reject.)
