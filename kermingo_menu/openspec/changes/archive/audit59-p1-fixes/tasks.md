# Tasks: Kermingo audit59 P1 fixes

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 60–90 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Schema + backend controller + tests | PR 1 | Backend only; includes producto schema, controller, categorias tests |
| 2 | Frontend caja filter wiring | PR 1 | Same PR; frontend admin.ts + caja-screen.tsx + mappers test |

## Phase 1: Schema & Controller

- [x] 1.1 In `backend/src/api/schemas/producto.schema.js`, remove `.optional()` from `categorias` in `createProductoSchema`.
- [x] 1.2 In same file, replace `updateProductoSchema = createProductoSchema.partial().strict()` with an explicit schema where every field is optional and **no `.default()` on `stock_minimo_alerta` or `activo`.
- [x] 1.3 In `backend/src/api/controllers/producto.controller.js`, guard `update(conn, id, productoData)` so it is skipped when `Object.keys(productoData).length === 0`.
- [x] 1.4 In same controller, add explicit existence check (e.g., `findByIdAdmin`) before commit when `update` is skipped, to still return 404 for missing products.

## Phase 2: Frontend Caja Filter

- [x] 2.1 In `frontend/lib/admin.ts`, add `meals: MealCategory[]` to `CajaProduct` type.
- [x] 2.2 In `apiToCajaProduct`, populate `meals` via `parseCategorias(p.categorias)`.
- [x] 2.3 In `frontend/components/admin/caja-screen.tsx`, replace `p.name.toLowerCase().includes(filter)` with `p.meals.includes(filter)` for the `merienda` / `cena` filter branch.

## Phase 3: Testing

- [x] 3.1 In `backend/tests/productos-categorias.test.js`, add test: `PUT /api/admin/productos/:id` with only `categorias` returns 200 and leaves `stock_minimo_alerta` / `activo` unchanged.
- [x] 3.2 In same file, add test: `PUT /api/admin/productos/:id` with `categorias: []` returns 400.
- [x] 3.3 In `frontend/test/admin.test.ts`, add test asserting `apiToCajaProduct` parses `categorias` into `meals`.

## Phase 4: Debt Documentation

- [x] 4.1 In `backend/tests/caja.test.js`, add a comment block near the top describing the absent caja UI edit flow as intentional debt (P1-4).

## Verification

```bash
# Backend
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/backend
npm test -- --testPathPattern=productos-categorias
npm test -- --testPathPattern=caja

# Frontend
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/frontend
pnpm test
pnpm build
```

## Next Step
Ready for sdd-apply (single PR, single commit).
