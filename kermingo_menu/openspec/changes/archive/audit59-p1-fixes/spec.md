# Spec: Kermingo audit59 P1 fixes

## P1-1 — Caja filters Merienda/Cena by real product categories

### Scenario: Caja filter uses category, not name
**Given** product "Helados palito" belongs to categories `Merienda, Cena`
**When** caja filter chip "Merienda" is selected
**Then** product appears even if its name does not contain the word "merienda"

### Scenario: Caja filter "Cena" excludes pure-merienda products
**Given** product "Medialunas" belongs only to `Merienda`
**When** caja filter chip "Cena" is selected
**Then** product is hidden

### Requirements
- `CajaProduct` type must include `meals: MealCategory[]`.
- `apiToCajaProduct` must parse `categorias` string via existing `parseCategorias` utility.
- `caja-screen.tsx` filter logic must replace `p.name.toLowerCase().includes(filter)` with `p.meals.includes(filter)` for `merienda` / `cena`.

## P1-2 — Create requires categorias; update may omit but cannot send empty

### Scenario: Create product without categorias rejected
**Given** admin POST `/api/admin/productos` with body missing `categorias`
**Then** response is 400 with validation error

### Scenario: Create product with empty categorias rejected
**Given** admin POST `/api/admin/productos` with `categorias: []`
**Then** response is 400 with validation error

### Scenario: Update product omitting categorias accepted
**Given** admin PUT `/api/admin/productos/:id` with body not containing `categorias`
**Then** response is 200 and existing categories remain untouched

### Scenario: Update product with empty categorias rejected
**Given** admin PUT `/api/admin/productos/:id` with `categorias: []`
**Then** response is 400 with validation error

### Requirements
- `createProductoSchema.categorias` must be `z.array(...).min(1)` (non-optional).
- `updateProductoSchema.categorias` must be `z.array(...).min(1).optional()` so omission is allowed but empty array is rejected.

## P1-3 — Update avoids default overwrites and supports categorias-only PUT

### Scenario: PUT partial body preserves stock_minimo_alerta and activo
**Given** product has `stock_minimo_alerta = 2` and `activo = 0`
**When** admin PUT only `nombre` and `precio`
**Then** `stock_minimo_alerta` remains 2 and `activo` remains 0

### Scenario: PUT only categorias succeeds
**Given** existing product with any stock/activo values
**When** admin PUT body `{ categorias: ['Cena'] }` only
**Then** response is 200, categories are updated, and all other fields remain unchanged

### Requirements
- `updateProductoSchema` must be a separate schema without `.default()` on `stock_minimo_alerta` or `activo`.
- `producto.controller.js` `actualizar` must skip `update(conn, id, productoData)` when `productoData` has no keys (empty object), but still verify product exists and process `categorias` if present.

## P1-4 — Document caja edit-flow debt

### Scenario: No code change
**Given** caja UI lacks an edit flow for existing pedidos
**When** viewed from product perspective
**Then** this is documented as known debt in spec/tests

### Requirements
- Add a comment or test-note in `caja.test.js` marking the absent edit UI as intentional debt.
- No functional changes.

## Verification Commands
```bash
# Backend tests
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/backend
npm test -- --testPathPattern=productos-categorias
npm test -- --testPathPattern=caja

# Frontend tests
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/frontend
pnpm test

# Build checks
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/backend
npm run build   # or equivalent lint/type check

cd /home/marcos/Escritorio/Kermingo/kermingo_menu/frontend
pnpm build
```
