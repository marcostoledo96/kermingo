# Design: Product Admin Filtering, Grouping, Ordering, and Menu Default Tab

## Technical Approach

Use the existing MVC pattern and hybrid OpenSpec flow. Add durable product ordering and availability fields, keep public/caja order flows intact, and make UI state derive from backend contracts. Public menu remains switchable; `categoria_default` only selects the initial tab.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|---|---|---|---|
| Availability field | `producto.disponible TINYINT(1) NOT NULL DEFAULT 1` | `estado_disponibilidad ENUM(...)` | Consistent with existing Spanish boolean `activo`; `todavia_no_disponible` is a derived state from `activo=1 AND disponible=0`, while `activo=0` still means hidden. |
| Ordering | Global `producto.orden INT NOT NULL DEFAULT 0`, `ORDER BY orden ASC, id ASC` | Per-category order in `producto_categoria` | Matches scope; one product can appear in both tabs with stable relative order. |
| Reorder endpoint | `PATCH /api/admin/productos/orden` with `{ ordenes: [{ id, orden }] }` | `PATCH /:id/orden` only | Batch update is atomic for drag/drop and up/down fallback; it still only changes order and avoids partially reordered lists. |
| Drag/drop | Add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | Custom pointer handlers / pangea DnD | Modern, accessible, React 19-friendly. Mobile uses buttons/edit-order fallback. |

## Data Flow

```txt
Admin Productos -> GET /api/admin/productos?estado=activo -> grouped UI
DnD/up-down -> PATCH /api/admin/productos/orden -> producto.orden
Public Menu -> GET config + productos -> initial tab from categoria_default -> render API order
Checkout/Caja -> pedido.model.createWithTransaction -> rejects activo=0/disponible=0 under transaction
```

## File Changes

| File | Action | Description |
|---|---|---|
| `backend/src/api/database/schema.sql` | Modify | Add `producto.orden`, `producto.disponible`, `configuracion_tienda.categoria_default`. |
| `backend/src/api/database/indexes.sql` | Modify | Add `idx_producto_orden` and preferably `idx_producto_estado_orden(activo, disponible, orden)`. |
| `backend/src/api/database/seed.sql` | Modify | Seed `orden=id`, `disponible=1`, `categoria_default='merienda'`. |
| `backend/src/api/database/migrations/manual/2026-06-17-product-admin-filtering-grouping-ordering.sql` | Create | Manual ALTER/backfill/index migration. |
| `backend/src/api/models/producto.model.js` | Modify | Select/group new columns, admin estado SQL, ordered public/admin lists, `updateOrdenes`. |
| `backend/src/api/models/pedido.model.js` | Modify | Include `disponible` in product locks and reject unavailable direct products and promo components. |
| `backend/src/api/{routes,controllers,schemas}/producto.*.js` | Modify | Add filters, fields, reorder route/schema/controller. |
| `backend/src/api/{models,schemas}/configuracion.*.js` | Modify | Public/admin read and update `categoria_default`. |
| `frontend/lib/{types,admin,mappers,products}.ts` | Modify | Add `orden`, `disponible`, `categoria_default`, `no_disponible` stock/state mapping. |
| `frontend/components/admin/products-screen.tsx` | Modify | Default `estado=activo`, server refetch filters, grouped categories, DnD + up/down fallback. |
| `frontend/components/admin/product-form-dialog.tsx` | Modify | Control for “Todavía no disponible” independent from active. |
| `frontend/components/menu/{menu-screen,product-card}.tsx` | Modify | Config-driven initial tab, preserve switching, disabled copy for agotado/no disponible. |
| `frontend/components/admin/config-screen.tsx` | Modify | Add Merienda/Cena default selector. |
| `frontend/package.json` | Modify | Add dnd-kit dependencies. |

## Interfaces / Contracts

- `GET /api/admin/productos`: `estado=activo|todos|desactivado|agotado|todavia_no_disponible`, default `activo`; optional `tipo`, `page`, `limit` remain.
- `PATCH /api/admin/productos/orden`: protected + trusted origin; body `{ ordenes: z.array({ id: number, orden: number.int().min(0) }).min(1) }`; transaction updates only `orden`.
- Product payload/response includes `orden` and `disponible` (`0|1`). Config response/update includes `categoria_default: 'merienda'|'cena'`.
- Public product list hides `activo=0`, includes `disponible=0`, sorted by `orden,id`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| DB | Columns, defaults, backfill, indexes | Apply manual migration to seeded DB; `SHOW COLUMNS/INDEX`, row assertions. |
| API | Admin filters, order, reorder, config enum, unavailable rejection | Jest/Supertest in `backend/tests/productos-categorias.test.js`, `configuracion.test.js`, caja/online order tests. |
| Frontend | Product filters/grouping/reorder fallback; config selector; menu default tab/disabled states | Vitest RTL: `products-screen*`, `config-screen.test.tsx`, `menu-screen*.test.tsx`, `product-form-dialog.test.tsx`. |
| Runtime | Public online/caja flows still work | Manual/Playwright smoke: menu→checkout transfer, admin caja, admin pedidos gate unchanged. |

## Migration / Rollout

Manual migration order: add nullable/default columns, backfill `UPDATE producto SET orden=id, disponible=1 WHERE ...`, set config default, alter to `NOT NULL`, create indexes. Deploy DB first, then backend, then frontend. Rollback drops new indexes/columns after reverting code; no existing order/pedido data is removed.

## Documentation Updates

Archive must update `API.md`, `INFRA.md`, `CORE.md`, `WEBAPP.md`, `FUNCIONALIDADES.md`, `FLUJOS.md`, `TESTING.md`, `DEPLOY.md`, `GOTCHAS.md`, `DECISIONES.md`, and `INDEX.md` if new migration doc path is listed.

## Open Questions

- [ ] None blocking.
