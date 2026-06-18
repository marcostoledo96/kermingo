# Design: Kermingo audit59 P1 fixes

## P1-1 — Caja category filter wiring

### Files
- `frontend/lib/admin.ts`
- `frontend/components/admin/caja-screen.tsx`

### Design
1. Extend `CajaProduct` with `meals: MealCategory[]`.
2. In `apiToCajaProduct`, call `parseCategorias(p.categorias)` to populate `meals`.
3. In `caja-screen.tsx`, change the filter branch for non-bebida/non-promo from `p.name.toLowerCase().includes(filter)` to `p.meals.includes(filter)`.

### Edge cases
- `p.categorias` can be `null` → `parseCategorias` returns `[]`, so product is excluded from Merienda/Cena filters. This is correct.
- `p.categorias` can contain both → product appears in both filters.

## P1-2 — Schema split for create vs update

### Files
- `backend/src/api/schemas/producto.schema.js`

### Design
1. Keep `createProductoSchema` as the source of truth for product creation, but change `categorias` from `z.array(z.enum(['Merienda','Cena'])).min(1).optional()` to `z.array(z.enum(['Merienda','Cena'])).min(1)` (required, non-empty).
2. Define `updateProductoSchema` explicitly as a separate schema (not `createProductoSchema.partial()`). Each field is optional (`z.optional()`), and `categorias` is `z.array(z.enum(['Merienda','Cena'])).min(1).optional()`. **No `.default()` on `stock_minimo_alerta` or `activo` in this schema.**

### Why not `.partial()`
- `createProductoSchema.partial()` preserves `.default()` calls, which can cause silent overwrites when the frontend omits a field that has a default. Explicit optional fields without defaults avoid this.

## P1-3 — Safe PUT with empty product data

### Files
- `backend/src/api/controllers/producto.controller.js`

### Design
1. In `actualizar`, after destructuring `categorias`, check if `Object.keys(productoData).length === 0`.
2. If empty, skip `update(conn, id, productoData)` call to avoid `UPDATE producto SET` with no columns.
3. Still verify product existence by calling `findByIdAdmin(pool, id)` before commit. If not found, throw `NotFoundError`.
4. If `categorias` key is present (even if `undefined` or array), proceed with `setProductoCategorias` as before.

### Transaction flow
```
beginTransaction
if (productoData has keys) {
  affectedRows = update(conn, id, productoData)
  if (affectedRows === 0) throw NotFoundError
}
if (req.body has own property 'categorias') {
  setProductoCategorias(conn, id, categorias)
}
commit
return findByIdAdmin(pool, id)
```

## P1-4 — Debt comment

### Files
- `backend/tests/caja.test.js`

### Design
- Add a top-level comment block inside the test file or a skipped `describe` noting that caja UI has no edit flow for existing pedidos, and therefore the backend does not expose a dedicated caja edit endpoint beyond the generic admin PUT.

## Test plan
- Add frontend test in `test/mappers.test.ts` or `test/caja.test.ts` asserting `apiToCajaProduct` parses `categorias` into `meals`.
- Add backend test in `tests/productos-categorias.test.js` for:
  - PUT with only `categorias` returns 200 and preserves other fields.
  - PUT with partial body does not change `stock_minimo_alerta` / `activo`.
  - PUT with `categorias: []` returns 400.

## Workload estimate
- Changed files: 5
- Estimated changed lines: 60–90
- 400-line budget risk: **Low**
- Chained PRs: **No** — single commit sufficient.

## Change log
- 2026-06-17: archived from openspec/changes/audit59-p1-fixes
