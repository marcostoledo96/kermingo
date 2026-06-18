# Archived: frontend-admin-api-wiring

**Date:** 2026-06-14
**Status:** ARCHIVED — verdict PASS

## Summary
- Created: `openspec/specs/admin-api-wiring/spec.md` (durable capability for real-API admin screens)
- Replaced MOCK data in 3 admin views (productos, caja, pedidos) with real API calls
- 1 new module: `frontend/lib/admin.ts` (adapter: ApiProducto → AdminProduct, ApiPedido → Order)
- 5 frontend files modified, 1 new
- `pnpm build` 14/14 static pages
- All 10 admin API ops smoke-tested with real backend: 200 OK

## Verified E2E operations
1. GET /api/admin/productos → 200, 24 products
2. GET /api/productos → 200, 24 active products
3. GET /api/admin/pedidos → 200, 8 pedidos
4. POST /api/admin/pedidos/caja → 200, created KMG-1581, KMG-1582
5. PATCH /api/admin/pedidos/:id/estado → 200
6. PATCH /api/admin/pedidos/:id/pago → 200
7. GET /api/admin/pedidos/:id → 200, 1 item
8. PATCH /api/admin/productos/:id/desactivar → 200, activo=0
9. PATCH /api/admin/productos/:id/recuperar → 200, activo=1
10. PATCH /api/admin/productos/:id/stock → 200, stock_actual=42
11. GET /api/admin/pedidos?estado_pedido=en_preparacion → 200, filter works

## Out of Scope (next changes)
- Cocina admin (needs SSE/polling)
- Image upload for productos (still stub button)
- Comprobante viewer in detail modal (placeholder, real wiring needs Drive stream)
- Auto-refresh / polling
- Edit pedido (PUT /api/admin/pedidos/:id) — modal exists but "Editar pedido" is no-op
