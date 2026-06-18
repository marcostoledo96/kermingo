# Tasks: Product Admin Filtering, Grouping, Ordering, and Menu Default Tab

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 350–550 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (DB+backend) → PR 2 (frontend) → PR 3 (tests+docs) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | DB migration, schema, seed, backend APIs | PR 1 | base=main; includes backend tests |
| 2 | Frontend admin/public UI wiring | PR 2 | depends on PR 1; dnd-kit install |
| 3 | Frontend tests, archive, docs | PR 3 | depends on PR 2 |

> **Uncommitted work present:** `git status` shows modified `pedido.controller.js`, `pedido.model.js`, `pedido.routes.js`, `caja-screen.tsx`, `orders-screen.tsx`, `tracking-screen.tsx`, and related tests/docs from prior feature work. Do NOT commit or push; apply this change on top after confirming no conflicts with `producto`, `configuracion`, `menu`, or `admin` paths.

## Phase 1: Foundation — DB, Schema, Seed, Package

- [x] 1.1 Add `producto.orden INT NOT NULL DEFAULT 0` and `producto.disponible TINYINT(1) NOT NULL DEFAULT 1` to `backend/src/api/database/schema.sql`.
- [x] 1.2 Add `configuracion_tienda.categoria_default ENUM('merienda','cena') NOT NULL DEFAULT 'merienda'` to `schema.sql`.
- [x] 1.3 Add `idx_producto_orden` and `idx_producto_estado_orden(activo,disponible,orden)` to `backend/src/api/database/indexes.sql` with `IF NOT EXISTS` guards.
- [x] 1.4 Create `backend/src/api/database/migrations/manual/2026-06-17-product-admin-filtering-grouping-ordering.sql`: `ALTER TABLE` new columns, backfill `orden=id` and `disponible=1`, set `categoria_default='merienda'`, then `ALTER` to `NOT NULL`.
- [x] 1.5 Update `backend/src/api/database/seed.sql`: set `orden` deterministic per product, `disponible=1`, `categoria_default='merienda'`.
- [x] 1.6 Run `cd frontend && pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` and update `frontend/package.json`.

## Phase 2: Core — Backend APIs & Business Rules

- [x] 2.1 Update `producto.model.js`: select `orden`/`disponible`; add admin `estado` SQL filter (`activo`/`todos`/`desactivado`/`agotado`/`todavia_no_disponible`); order by `orden ASC, id ASC`; add `updateOrdenes(tx, ordenes)`.
- [x] 2.2 Update `configuracion.model.js`: read/write `categoria_default` in public/admin queries.
- [x] 2.3 Update `producto.schema.js`: include `orden` and `disponible` in create/update payloads; add `estado` query enum; add `reordenarSchema` with `z.array({ id, orden })`.
- [x] 2.4 Update `configuracion.schema.js`: add `categoria_default: z.enum(['merienda','cena'])`.
- [x] 2.5 Update `producto.controller.js`: parse `estado` query defaulting to `activo`; expose `reordenar` handler calling model within transaction.
- [x] 2.6 Add `PATCH /api/admin/productos/orden` route in `producto.routes.js`, protected + trusted-origin.
- [x] 2.7 Update `configuracion.controller.js` and `configuracion.routes.js` to accept/return `categoria_default`.
- [x] 2.8 Update `pedido.model.js`: in order creation transaction, reject items where `activo=0` or `disponible=0`, and reject promo components that are unavailable.

## Phase 3: Integration — Frontend UI

- [x] 3.1 Update `frontend/lib/types.ts`: add `orden`, `disponible`, `categoria_default` to relevant types.
- [x] 3.2 Update `frontend/lib/admin.ts` and `frontend/lib/products.ts`: include new fields in fetchers/mappers; add `reordenarProductos(ordenes)` call.
- [x] 3.3 Update `frontend/components/admin/products-screen.tsx`: default `estado=activo` filter tabs, category grouping headers, integrate `@dnd-kit` sortable list with up/down button fallback, call reorder API on change.
- [x] 3.4 Update `frontend/components/admin/product-form-dialog.tsx`: add "Todavía no disponible" checkbox independent from `activo`.
- [x] 3.5 Update `frontend/components/admin/config-screen.tsx`: add Merienda/Cena default tab selector.
- [x] 3.6 Update `frontend/components/menu/menu-screen.tsx`: read config for `categoria_default` as initial active tab; preserve manual switching.
- [x] 3.7 Update `frontend/components/menu/product-card.tsx`: disable add button when `disponible=0`; show "Todavía no disponible" copy.

## Phase 4: Testing & Verification

- [x] 4.1 Backend partial verify: `producto.schema` + `configuracion.schema` unit tests (26 schema tests) + `buildWhereAdmin` SQL conditions (7 tests) = 33 total. File: `backend/tests/producto-filtering.test.js`.
- [x] 4.2 Frontend partial verify: `deriveStockStatus` and `mapProducto` unit tests (20 tests) — no_disponible priority, disponible/orden mapping, activo/agotado alignment with backend SQL. File: `frontend/test/product-availability.test.ts`.
- [x] 4.3 Frontend mock data updated: added `disponible` and `orden` fields to `ApiProducto` mocks in 4 test files.
- [x] 4.4 Fixed `buildWhereAdmin` SQL: `activo` now excludes sold-out (`stock_limitado=1 AND stock_actual<=0`) and unavailable (`disponible=0`); `agotado` now requires `disponible=1`.
- [x] 4.5 Fixed migration idempotency: `orden` backfill uses `WHERE orden IS NULL` instead of `WHERE orden IS NULL OR orden = 0` to avoid overwriting legitimate orden=0 on rerun.
- [x] 4.6 Removed unused `menuOpen` state from `ProductsScreen` desktop component (fixed lint warning).
- [ ] 4.7 Integration tests pending: DB migration must be applied before `caja.test.js`, `cocina.test.js`, `comprobantes.test.js` pass (pre-existing failure, not caused by this change).
- [ ] 4.8 E2E/Playwright tests for reorder DnD: not in scope (manual verification recommended).

## Phase 5: Archive & Documentation

- [x] 5.1 Build & unit tests green: `pnpm build` clean (0 errors, 4 warnings), frontend 238/238 tests pass, backend 74/74 unit tests pass, lint 0 errors.
- [ ] 5.2 Update `DOCUMENTACION/IA/{API.md,INFRA.md,CORE.md,WEBAPP.md,FUNCIONALIDADES.md,TESTING.md,GOTCHAS.md,DECISIONES.md,INDEX.md}` with new fields, endpoints, filters, and migration path.
