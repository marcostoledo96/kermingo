# Tasks: admin-api-wiring

> Single-PR implementation. Tasks are sequenced for minimal risk.

## Phase 1 — Adapter + types
- [ ] T1. Extend `frontend/lib/types.ts` with `ApiPedidoPaginada`, `ApiProductoPaginada`, `ApiPedidoListItem`. Update `ApiPedido` to include `telefono_whatsapp`, `comprobante_archivo_id`.
- [ ] T2. Create `frontend/lib/admin.ts` with `apiToAdminProduct`, `adminToApiPayload`, `apiToOrder`, `parseCategorias`, `inferIcon`, `mapOrderStatus`, `mapPayStatus`, `formatTime`.

## Phase 2 — Productos screen
- [ ] T3. Refactor `products-screen.tsx`:
  - Replace `seedProducts()` with `useState<AdminProduct[]>([])`.
  - Add `useEffect` on mount to fetch `GET /api/admin/productos?limit=24`.
  - Add `loading`, `error`, `submitting` state.
  - Add a refresh button to the header.
- [ ] T4. Wire `handleSave` to `POST` (create) or `PUT` (edit) `/api/admin/productos/:id`. On success update list. On error show inline banner.
- [ ] T5. Wire `toggleActive` to `PATCH /api/admin/productos/:id/desactivar|recuperar`. Optimistic update with revert on error.
- [ ] T6. Wire `handleAdjustStock` to `PATCH /api/admin/productos/:id/stock` with `{ stock_actual }`. Pessimistic update.
- [ ] T7. Refactor `product-form-dialog.tsx`:
  - Add `submitting: boolean`, `error: string | null` props.
  - Disable submit while submitting.
  - Show error banner if any.

## Phase 3 — Caja screen
- [ ] T8. Refactor `caja-screen.tsx`:
  - Replace static `PRODUCTS` import with `useState<ApiProducto[]>([])`.
  - Add `useEffect` on mount to fetch `GET /api/productos?activo=1`.
  - Map `ApiProducto` to a local `CajaProducto` shape (subset of `Product`).
  - Derive `soldOut` (`stock_limitado=1 && stock_actual=0`) and `low` (`stock_actual <= stock_minimo_alerta`).
  - Add refresh button.
- [ ] T9. Wire `confirmSale`:
  - Build `createCajaSchema` payload.
  - `estado_pago: 'pagado'` for efectivo, `'pendiente'` for transferencia.
  - `estado_pedido: 'recibido'`.
  - POST `/api/admin/pedidos/caja`.
  - On success, show modal with `numero`.
  - On error, show inline banner above the confirm button.
- [ ] T10. Disable the confirm button while submitting.

## Phase 4 — Pedidos screen
- [ ] T11. Refactor `orders-screen.tsx`:
  - Replace `INITIAL_ORDERS` with empty array.
  - Add `useEffect` on mount to fetch `GET /api/admin/pedidos?limit=24`.
  - Add `loading`, `error`, `submitting` state.
  - Add refresh button.
- [ ] T12. Map filter changes to query params:
  - `statusFilter` → `?estado_pedido=` (use `mapOrderStatus` inverse, `preparacion` → `en_preparacion`).
  - `payFilter` → `?estado_pago=`.
  - `methodFilter` → `?metodo_pago=`.
  - `search` → `?buscar=`.
  - On any filter change, refetch (debounce search 300ms).
- [ ] T13. Wire detail modal:
  - On open, fetch `GET /api/admin/pedidos/:id` (the list does not include items).
  - Show full pedido with items.
- [ ] T14. Wire `setStatus`:
  - PATCH `/api/admin/pedidos/:id/estado` with `{ estado_pedido: <mapped> }`.
  - Optimistic update with revert on error.
- [ ] T15. Wire `markPaid`:
  - PATCH `/api/admin/pedidos/:id/pago` with `{ estado_pago: 'pagado' }`.
  - Optimistic update with revert on error.
- [ ] T16. Wire `cancel`:
  - `window.confirm('¿Cancelar el pedido?')`.
  - PATCH `/api/admin/pedidos/:id/cancelar`.
  - Update state to `cancelado`.
- [ ] T17. Show an "Origen" badge (online / caja) in the row and detail modal.

## Phase 5 — Verification
- [ ] T18. Smoke test: `pnpm build` passes.
- [ ] T19. Smoke test: dev server, login, navigate to /admin/productos, /admin/caja, /admin/pedidos. No 401/403, no console errors.
- [ ] T20. End-to-end manual smoke: create product, edit, toggle active, stock adjust, sale in caja, list pedidos, detail, advance state, mark paid, cancel.
- [ ] T21. Mobile check: 360px viewport on all 3 screens. No horizontal overflow.
- [ ] T22. Verify CORS: POST from frontend dev port (3000) hits backend (3001) with `Origin: http://localhost:3000` and the backend accepts it (already verified in prior change).

## Phase 6 — Archive
- [ ] T23. Move `openspec/changes/frontend-admin-api-wiring/` to `openspec/changes/archive/`.
- [ ] T24. Copy `specs/admin-api-wiring.md` to `openspec/specs/admin-api-wiring/spec.md`.
- [ ] T25. Write `ARCHIVED.md` with the change summary.

## Traceability

| Spec scenario | Tasks |
|---|---|
| REQ-WIRE-PROD-001 | T3 |
| REQ-WIRE-PROD-002 | T4, T7 |
| REQ-WIRE-PROD-003 | T4, T7 |
| REQ-WIRE-PROD-004 | T5 |
| REQ-WIRE-PROD-005 | T6 |
| REQ-WIRE-CAJ-001 | T8 |
| REQ-WIRE-CAJ-002 | T9, T10 |
| REQ-WIRE-PED-001 | T11 |
| REQ-WIRE-PED-002 | T13 |
| REQ-WIRE-PED-003 | T14 |
| REQ-WIRE-PED-004 | T15 |
| REQ-WIRE-PED-005 | T16 |
| REQ-WIRE-AUTH-001 | (covered automatically by fetch; not implemented) |
| REQ-ADMIN-HEADER-001 (modified) | T3, T8, T11 |
