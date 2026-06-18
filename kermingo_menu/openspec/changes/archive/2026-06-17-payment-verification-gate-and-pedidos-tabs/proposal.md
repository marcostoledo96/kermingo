# Proposal: Payment Verification Gate & Admin Pedidos Tabs

## Intent

Introduce a payment verification gate for online orders before they enter the kitchen workflow. Currently online orders go directly to `en_preparacion`, mixing unverified payments with active kitchen work. We need a clear `recibido` state for online orders so admins can confirm payment before sending to kitchen. This separates financial audit from operational workflow.

## Scope

### In Scope
- Online `POST /api/pedidos` defaults to `estado_pedido='recibido'` (both efectivo and transferencia)
- Public tracking message for `recibido`: "Estamos comprobando tu pago"
- Caja rápida (`POST /api/admin/pedidos/caja`) creates orders in `en_preparacion` (cash and transfer)
- Admin `/admin/pedidos` becomes tabbed view: pending confirmation (`recibido`), en preparación, listos, entregados
- Pending confirmation tab: admin can confirm payment and advance to `en_preparacion`
- Cocina (`/admin/cocina`) keeps only `en_preparacion` + `listo` (no `recibido`)
- `/admin/caja` product cards show product photos when `imagen_url` exists

### Out of Scope
- New email/WhatsApp notifications
- Payment gateway integration (MercadoPago, etc.)
- Automatic payment verification (AI/ML)
- Changes to tracking page beyond the new message
- Bulk actions on the pending confirmation tab

## Capabilities

### New Capabilities
- `payment-verification-gate`: Online order state machine changes, `recibido` as default, tracking message update
- `admin-pedidos-tabs`: Tabbed UI for admin pedidos with filtering by `estado_pedido`
- `caja-product-photos`: Display product images in caja rápida product cards

### Modified Capabilities
- `etapa-5-pedidos`: Requirement change — online orders now create with `estado_pedido='recibido'` instead of `en_preparacion`
- `cashier-operations`: Caja rápida orders now create with `estado_pedido='en_preparacion'` explicitly
- `kitchen-operations`: Confirm that kitchen only sees `en_preparacion` and `listo` (no `recibido`)

## Approach

1. Backend: Update `pedido.controller.js` `crear` to set `estado_pedido='recibido'` for online orders; update caja controller to set `estado_pedido='en_preparacion'`.
2. Backend: Update `pedido.model.js` `findKitchenPedidos` to exclude `recibido` (already does, verify).
3. Backend: Add query param filter `estado_pedido` to `GET /api/admin/pedidos` if not already present.
4. Frontend: Update `/admin/pedidos` page to tabbed layout with 4 tabs, each fetching filtered orders.
5. Frontend: Add "Confirmar pago" action in pending tab that calls existing `PATCH /api/admin/pedidos/:id/pago` to `pagado`, then advances `estado_pedido` to `en_preparacion`.
6. Frontend: Update `/admin/caja` product card to render `<img>` with `imagen_url` fallback.
7. Tracking page: Add message for `recibido` state.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/api/controllers/pedido.controller.js` | Modified | Default `estado_pedido` for online orders |
| `backend/src/api/controllers/caja.controller.js` | Modified | Default `estado_pedido` for caja rápida |
| `backend/src/api/models/pedido.model.js` | Modified | Filter by `estado_pedido` in admin list |
| `frontend/app/admin/pedidos/page.tsx` | Modified | Tabbed layout + state filters |
| `frontend/app/admin/caja/page.tsx` | Modified | Product card with image |
| `frontend/app/seguimiento/page.tsx` | Modified | Message for `recibido` state |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Existing orders in `en_preparacion` with unverified payment | Low | Data migration not needed — this only affects new orders |
| Kitchen UI breaks if `recibido` orders leak in | Low | Verify `findKitchenPedidos` excludes `recibido` |
| Admin confusion on new tabs | Low | Clear tab labels + badge counts |
| Build fails due to new page structure | Low | Run `pnpm build` before commit |

## Rollback Plan

Revert the two controller changes to restore previous `estado_pedido` defaults. Revert frontend tab changes to previous flat list. No DB migration required.

## Dependencies

- Existing `PATCH /api/admin/pedidos/:id/pago` endpoint (already works)
- Existing `PATCH /api/admin/pedidos/:id/estado` endpoint (already works)
- Existing product image upload capability (`product-image-upload`)

## Success Criteria

- [ ] Online order creates with `estado_pedido='recibido'` and tracking shows "Estamos comprobando tu pago"
- [ ] Caja rápida order creates with `estado_pedido='en_preparacion'`
- [ ] Admin `/admin/pedidos` shows 4 tabs with correct counts
- [ ] Pending tab allows confirming payment and advancing to `en_preparacion`
- [ ] Kitchen `/admin/cocina` never shows `recibido` orders
- [ ] Caja product cards show images when `imagen_url` exists
- [ ] `pnpm build` passes
- [ ] Backend tests pass
