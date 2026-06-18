# Proposal: Kermingo audit59 P1 fixes

## Intent
Fix three backend/frontend integrity gaps discovered in audit59 and document one UI debt item without code changes.

## Scope
- **P1-1**: Caja frontend filters Merienda/Cena by real product categories instead of string-matching product names.
- **P1-2**: Create product requires `categorias` non-empty. Update may omit `categorias`, but cannot send an empty array.
- **P1-3**: Product PUT no longer silently overwrites `stock_minimo_alerta` / `activo` via inherited schema defaults. PUT with only `categorias` is safe.
- **P1-4**: Document caja edit-flow absence as known debt only.

## Affected Areas
- Backend schema validation (`producto.schema.js`)
- Backend product controller (`producto.controller.js`)
- Frontend admin mapping (`lib/admin.ts`)
- Frontend caja screen (`components/admin/caja-screen.tsx`)
- Backend tests (`tests/productos-categorias.test.js`)

## Non-Goals
- No new DB migrations.
- No new API endpoints.
- No UI redesign for caja edit flow.

## Approach
Single small commit touching ≤5 files. Split schema responsibilities (create vs update), guard controller against empty-product update, and wire real category parsing into caja filter.

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Update schema change breaks existing admin product edit | Add test covering PUT with partial body and assert stock/activo unchanged |
| Caja filter change breaks existing product visibility | Add unit-style test for `apiToCajaProduct` + filter logic |

## Acceptance Criteria (overall)
1. `npm test` passes backend suites.
2. `pnpm test` passes frontend suites.
3. `pnpm build` and `npm run build` succeed.
4. Manual: caja chips filter Merienda/Cena correctly even when product name does not contain the word.
