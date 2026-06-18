# Spec: admin-cocina-wiring (delta)

## ADDED Requirements

### REQ-WIRE-COC-001 — Cocina real list
The admin `/admin/cocina` screen MUST list real pedidos from `GET /api/admin/cocina/pedidos` on mount. The endpoint returns only `recibido`, `en_preparacion`, `listo` pedidos (excludes `cancelado` and `entregado`). On mount, the screen MUST also fetch the detail for each pedido in parallel via `GET /api/admin/cocina/pedidos/:id` to obtain the items list. Each pedido card MUST render with its items.

**Scenario**: Kitchen display mounts
- Given a valid admin session
- When admin opens /admin/cocina
- Then a `GET /api/admin/cocina/pedidos` is fired
- And for each pedido in the response, a `GET /api/admin/cocina/pedidos/:id` is fired in parallel
- And each card renders with the pedido header + items

### REQ-WIRE-COC-002 — Cocina advance state
Clicking "En preparación" / "Listo" / "Entregado" on a card MUST call `POST /api/admin/cocina/pedidos/:id/estado` with `{ estado_pedido: <next> }`. The list MUST update the state. If the API call fails (e.g. invalid transition), an inline error MUST be shown and the state MUST be reverted.

### REQ-WIRE-COC-003 — Cocina cancel
Clicking "Cancelar" on a card MUST show a `window.confirm` prompt. If confirmed, MUST call `PATCH /api/admin/pedidos/:id/cancelar` (the cocina endpoint rejects `cancelado` — its schema only allows `recibido/en_preparacion/listo/entregado`). The card MUST disappear from the list (since `cancelado` is excluded from the cocina list).

### REQ-WIRE-COC-004 — Auto-refresh every 10s
The screen MUST auto-refetch the list every 10 seconds while mounted. The auto-refresh MUST:
- Pause when `document.visibilityState === 'hidden'`.
- Pause while a PATCH is in flight.
- Resume after the PATCH completes.
- Stop on unmount.

**Scenario**: New pedido arrives
- Given the cocina screen is open
- When 10 seconds pass
- Then a refetch of `/api/admin/cocina/pedidos` is fired
- And the new pedido appears in the list (if its state is `recibido`, `en_preparacion`, or `listo`)

### REQ-WIRE-COC-005 — Manual refresh button
A `RefreshCw` icon button MUST be in the screen. On click, it MUST refetch the list and show a spinner while loading.

### REQ-WIRE-COC-006 — Productos pendientes aggregation
The right sidebar "Productos pendientes" MUST aggregate items from all pedidos with state `recibido` OR `en_preparacion`, grouped by product name, summed by quantity, and listed in descending order of quantity. Each entry MUST show the list of order codes that include it.

### REQ-WIRE-COC-007 — Tabs and counts
The screen MUST show 4 tabs: Recibidos, En preparación, Listos, Entregados. Wait — the cocina endpoint excludes `entregado`. Decision: drop the "Entregados" tab from the cocina view. Replace with "Todos" (all kitchen-relevant orders). Tab counts MUST reflect the loaded data.

**Adjustment**: To show Entregados too, the cocina screen would need a separate endpoint. Out of scope. The 4 tabs become: Recibidos, En preparación, Listos, Todos.

## MODIFIED Requirements

### REQ-ADMIN-HEADER-001 (from admin-ui-system)
Cocina header MUST show a status badge "En vivo" with a small spinner to indicate polling is active.

## Type updates
```ts
// frontend/lib/types.ts
export type ApiCocinaPedido = {
  id: number
  numero: string
  nombre_cliente: string
  mesa: string | null
  estado_pedido: 'recibido' | 'en_preparacion' | 'listo' | 'entregado' | 'cancelado'
  estado_pago: 'pendiente' | 'comprobante_subido' | 'pagado' | 'rechazado'
  observaciones: string | null
  total: string | number
  created_at: string
  cantidad_items: number
}
```

## Testing strategy
- **Backend smoke** (pre-apply): curl GET /api/admin/cocina/pedidos and GET /api/admin/cocina/pedidos/:id. Confirm both 200 with expected shape.
- **End-to-end smoke** (post-apply): dev login → /admin/cocina → list shows real orders → click "En preparación" → card moves to the next tab.
- **Polling test**: open cocina, wait 10s, see refresh indicator.
- **Build**: `pnpm build` with all screens.
- **Mobile check**: 360px viewport. No horizontal overflow.
