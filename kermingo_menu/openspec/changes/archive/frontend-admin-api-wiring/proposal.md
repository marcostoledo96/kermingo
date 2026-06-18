# Change: frontend-admin-api-wiring

## Why
After `frontend-admin-ui-redesign`, the admin area still uses MOCK data in 3 of 4 views (caja, pedidos, productos). The login flow is real. This change wires those views to the real backend so the admin can manage the actual event.

## What changes
- **`productos`**: list from `GET /api/admin/productos`, edit (PUT), toggle active (PATCH `desactivar`/`recuperar`), adjust stock (PATCH `stock`), create (POST).
- **`caja`**: list active products from `GET /api/productos`, create pedido via `POST /api/admin/pedidos/caja` (admin caja schema).
- **`pedidos`**: list from `GET /api/admin/pedidos` with filters; on detail open, fetch `GET /api/admin/pedidos/:id` for full pedido with items; advance state (PATCH `estado`), mark paid (PATCH `pago`), cancel (PATCH `cancelar`).
- **Types**: extend `ApiProducto`, `ApiPedido`; add a `CajaProducto` mapping in the caja screen; align local `OrderStatus` enum with backend (`en_preparacion`).
- **Refresh model**: manual refresh button on each list; no SSE/polling in this change.

## Impact
- Affected files (frontend only):
  - `frontend/components/admin/products-screen.tsx`
  - `frontend/components/admin/product-form-dialog.tsx`
  - `frontend/components/admin/caja-screen.tsx`
  - `frontend/components/admin/orders-screen.tsx`
  - `frontend/lib/types.ts` (extend ApiProducto, ApiPedido, ApiItem)
  - `frontend/lib/admin.ts` (NEW — adapter: ApiProducto → AdminProduct, ApiPedido → Order)
- No backend changes.
- No database changes.
- No public-facing pages change.

## Out of scope
- Cocina (admin/cocina) — needs SSE/polling, separate change
- Comprobante viewer in detail modal (UI placeholder, real wiring needs Drive stream)
- Image upload for productos (the "Subir foto" button stays as a stub)
- Auto-refresh / SSE / polling
- Reportes / metricas
- Configuracion de tienda

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Backend endpoint shape diverges from frontend mapping | Med | Smoke test all endpoints before apply; defensive null checks in adapter |
| OrderStatus enum mismatch (`preparacion` vs `en_preparacion`) | High | Update frontend enum to backend canonical |
| CORS / cookie failure when calling admin endpoints | Low | `credentials: 'include'` is set in apiGet/apiPost etc.; verified in prior change |
| PATCH/POST requires trusted origin header | High | Add `Origin: ${FRONTEND_URL}` header explicitly when sending mutations |
| Stock limited products in DB may have null `stock_actual` | Med | Treat `null` as `0` for display; backend rejects 0 stock for stock-limited purchases |
| `categorias` is a string label, not an array | High | Parse "Merienda" / "Cena" substrings to MealCategory |
| Long product names overflow table on mobile | Med | Truncate with `line-clamp-1` on long names; tested at 360px |
| Image upload endpoint not wired in this change | Low | "Subir foto" button stays as no-op; icon heuristic fallback |

## Rollback
Revert this change. Backend untouched. Login + public menu continue to work.

## Dependencies
- All backend endpoints already deployed and tested.
- `frontend/lib/api.ts` already has `apiGet/apiPost/apiPut/apiPatch` with `credentials: 'include'`.
- `useAuth` in `frontend/lib/auth.tsx` provides admin session.
- `requireTrustedOrigin` middleware requires `Origin: ${FRONTEND_URL}` for POST/PUT/PATCH/DELETE.

## Success criteria
- [ ] `Productos` list shows real products from `/api/admin/productos` with stock, price, estado, categorías
- [ ] `Productos` create / edit / toggle active / stock adjust all hit real API and update UI optimistically
- [ ] `Caja` lists active products from `/api/productos` and POSTs to `/api/admin/pedidos/caja`
- [ ] `Pedidos` list shows real pedidos from `/api/admin/pedidos` with filters working
- [ ] `Pedidos` detail modal opens with full pedido (items, cliente, totales) from `/api/admin/pedidos/:id`
- [ ] `Pedidos` advance state / mark paid / cancel all hit real API
- [ ] `pnpm build` passes
- [ ] No overflow at 360px
- [ ] No console errors when navigating all 3 screens
- [ ] No 401/403 in network tab for admin endpoints

## Single-PR decision
Single PR. 4 admin views touched, but they are isolated (no shared state) and the changes are mostly mechanical (replace mock with real fetch). Splitting would multiply review effort without reducing risk.
