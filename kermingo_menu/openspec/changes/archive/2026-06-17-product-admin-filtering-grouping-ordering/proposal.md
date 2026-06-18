# Proposal: Product Admin Filtering, Grouping, Ordering, and Menu Default Tab

## Intent
Admin product list currently loads everything client-side with no server-side filtering, no grouping, and no ordering control. Public menu hardcodes `merienda` as default tab. We need admin-filtered views, category grouping, drag/drop ordering that controls public menu display order, a configurable default menu tab, and a new "Todavía no disponible" product state for items visible but not yet buyable.

## Scope

### In Scope
- Add `orden` to `producto`, `categoria_default` to `configuracion_tienda`, and `disponible` flag to `producto`
- Server-side admin product filtering by `estado` (activo, desactivado, agotado, todavia_no_disponible)
- Public menu ordering by `orden` with `categoria_default` from config
- Admin `/admin/productos` grouped by category with drag/drop reordering
- Admin `/admin/config` default category selector
- "Todavía no disponible" products visible in public menu but disabled with clear copy

### Out of Scope
- Per-category ordering (global `orden` only)
- Purchase restrictions by tab (users can switch freely)
- Drag/drop on mobile (desktop table only; mobile uses up/down buttons or "edit order" mode)
- Migration framework (manual ALTER TABLE scripts)

## Capabilities

### New Capabilities
- `product-ordering`: Global `orden` column, admin drag/drop reordering, public menu ordered by `orden`
- `product-availability-states`: `disponible` flag for `todavia_no_disponible`, server-side `estado` filtering
- `menu-default-tab`: `categoria_default` in config, consumed by public menu

### Modified Capabilities
- `database-schema`: Add `orden`, `disponible` to `producto`; `categoria_default` to `configuracion_tienda`
- `store-configuration`: Admin read/write includes `categoria_default`
- `product-admin-api`: `findAllAdmin` supports server-side `estado` filter (activo, desactivado, agotado, todavia_no_disponible, todos)
- `public-menu`: Uses `categoria_default` from config, orders by `orden`

## Approach
- **DB**: ALTER TABLE `producto` ADD `orden INT DEFAULT 0`, `disponible TINYINT(1) DEFAULT 1`; ALTER TABLE `configuracion_tienda` ADD `categoria_default ENUM('merienda','cena') DEFAULT 'merienda'`. Update `indexes.sql` with `idx_producto_orden`.
- **Backend**: `findAllAdmin` filters by `estado` server-side using `activo`, `disponible`, and computed `agotado`. `findAllPublic` orders by `orden`. Add `PATCH /admin/productos/:id/orden` for reordering. Update `configuracion` schema and model for `categoria_default`.
- **Frontend**: Install `@dnd-kit/core` + `@dnd-kit/sortable`. Group products by category in admin table. Drag/drop rows update `orden`. Add `estado` filter chips. Add default category selector in `/admin/config`. Update `MenuScreen` to use `categoria_default` from config.
- **Migration**: Default `orden` to `id` initially to preserve approximate current order.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/api/database/schema.sql` | Modified | Add `orden`, `disponible` to `producto`; `categoria_default` to `configuracion_tienda` |
| `backend/src/api/database/indexes.sql` | Modified | Add `idx_producto_orden` |
| `backend/src/api/models/producto.model.js` | Modified | Server-side `estado` filter, `ORDER BY orden` |
| `backend/src/api/models/configuracion.model.js` | Modified | Handle `categoria_default` |
| `backend/src/api/schemas/producto.schema.js` | Modified | `adminProductoQuerySchema` estado enum, `orden` field |
| `backend/src/api/schemas/configuracion.schema.js` | Modified | `categoria_default` enum |
| `backend/src/api/controllers/producto.controller.js` | Modified | `listarAdmin` with estado filter, new reorder endpoint |
| `backend/src/api/controllers/configuracion.controller.js` | Modified | `categoria_default` in responses |
| `frontend/lib/types.ts` | Modified | `orden`, `disponible` in `ApiProducto`; `categoria_default` in `ApiConfiguracion` |
| `frontend/lib/admin.ts` | Modified | `AdminProduct` mappers include `orden`/`disponible` |
| `frontend/components/admin/products-screen.tsx` | Modified | Group by category, drag/drop, estado filter |
| `frontend/components/admin/config-screen.tsx` | Modified | `categoria_default` selector |
| `frontend/components/menu/menu-screen.tsx` | Modified | Use `categoria_default` from config |
| `frontend/package.json` | Modified | Add `@dnd-kit/core`, `@dnd-kit/sortable` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Schema change without migration framework | Med | Provide exact ALTER TABLE scripts; document in DEPLOY.md |
| Mobile drag/drop UX poor | High | Disable drag/drop on mobile; use "Editar orden" mode with up/down buttons |
| `@dnd-kit` + React 19 compatibility | Low | Verify latest version; fallback to `@hello-pangea/dnd` if needed |
| Existing order scrambled by `orden` default | Med | Default `orden` to `id` initially to preserve order |

## Rollback Plan
1. Revert ALTER TABLE (drop `orden`, `disponible`, `categoria_default` columns)
2. Restore previous schema.sql and indexes.sql
3. Revert frontend dependency additions
4. Restore previous producto controller/model queries (ORDER BY tipo, nombre)

## Dependencies
- `@dnd-kit/core` + `@dnd-kit/sortable` (frontend)

## Success Criteria
- [ ] Admin product list shows only active products by default
- [ ] Admin can filter by all 4 states (activo, desactivado, agotado, todavia_no_disponible)
- [ ] Products grouped by category in admin view
- [ ] Drag/drop reordering updates public menu order
- [ ] Public menu uses `categoria_default` from config
- [ ] "Todavía no disponible" products visible in public menu but disabled with clear label
- [ ] Backend tests pass for new estado filters and ordering
- [ ] Frontend build passes
