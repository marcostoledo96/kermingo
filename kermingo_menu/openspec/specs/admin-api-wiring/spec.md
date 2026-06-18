# Spec: admin-api-wiring (delta)

## ADDED Requirements

### REQ-WIRE-PROD-001 — Productos real list
The admin `/admin/productos` screen MUST list real products from `GET /api/admin/productos` on mount, paginated with `limit=24`. Empty state MUST show the existing empty UI (PackageX icon + "No hay productos con esos filtros").

**Scenario**: Admin opens /admin/productos
- Given a valid admin session
- When the screen mounts
- Then a `GET /api/admin/productos?limit=24` is fired
- And the response data is rendered in the desktop table AND mobile cards
- And each row shows: product thumb, name, description, type, momentos, price, stock count, state badge, action buttons

### REQ-WIRE-PROD-002 — Productos create
Submitting the create form MUST call `POST /api/admin/productos` with the schema fields (nombre, descripcion, precio, tipo, stock_limitado, stock_actual, stock_minimo_alerta, activo). On 2xx, the new product MUST appear at the top of the list. On error, the dialog MUST stay open and the error message MUST be shown.

**Scenario**: Admin creates a new producto
- Given a valid admin session and the create dialog open with name + price filled
- When admin submits the form
- Then `POST /api/admin/productos` is called with the right payload
- And on success, the new product is prepended to the products list
- And the dialog closes
- And on error, the error message is shown and dialog stays open

### REQ-WIRE-PROD-003 — Productos edit
Submitting the edit form for an existing product MUST call `PUT /api/admin/productos/:id`. On 2xx, the row in the list MUST reflect the updated values. On error, dialog stays open and error is shown.

### REQ-WIRE-PROD-004 — Productos toggle active
Clicking the "Desactivar" / "Recuperar" action button MUST call `PATCH /api/admin/productos/:id/desactivar` or `PATCH .../recuperar` respectively. The list MUST update the active flag optimistically. If the API call fails, the change MUST be reverted.

### REQ-WIRE-PROD-005 — Productos stock adjust
Saving the "Ajustar stock" modal MUST call `PATCH /api/admin/productos/:id/stock` with `{ stock_actual: <number> }`. The list MUST update `stockCurrent` and the state badge. If `stock_actual === 0`, the state MUST become `agotado`. If `stock_actual > 0` and the product is active, the state MUST become `activo` (assuming `stockLimited`).

### REQ-WIRE-CAJ-001 — Caja real product list
The admin `/admin/caja` screen MUST list active products from `GET /api/productos?activo=1` on mount. Sold-out products (`stock_limitado=1 AND stock_actual=0`) MUST be disabled and show a "Agotado" badge. Low-stock products (`stock_actual <= stock_minimo_alerta`) MUST show a "Stock bajo" badge.

### REQ-WIRE-CAJ-002 — Caja create pedido
Pressing "Confirmar venta" MUST call `POST /api/admin/pedidos/caja` with the createCajaSchema payload: `{ nombre_cliente, mesa?, telefono_cliente?, metodo_pago, items: [{producto_id, cantidad}], estado_pago, estado_pedido }`. The `estado_pago` MUST default to `'pagado'` for `efectivo` and `'pendiente'` for `transferencia` (per Kermingo rules: cash is marked paid, transfer needs comprobante). The `estado_pedido` MUST default to `'recibido'`. On success, a confirmation modal with the new `numero` MUST appear. On error, an inline error MUST be shown above the confirm button.

**Scenario**: Admin completes a cash sale
- Given a valid cart with 2 products
- When admin presses "Confirmar venta" with method "efectivo"
- Then `POST /api/admin/pedidos/caja` is called with `estado_pago: 'pagado'` and `estado_pedido: 'recibido'`
- And the response `numero` is shown in the confirmation modal

### REQ-WIRE-PED-001 — Pedidos real list
The admin `/admin/pedidos` screen MUST list real pedidos from `GET /api/admin/pedidos?limit=24` on mount. Filters (search, estado_pedido, estado_pago, metodo_pago) MUST trigger a refetch with query params. Empty state MUST show the existing empty UI (Inbox icon + "No hay pedidos con esos filtros").

**Scenario**: Admin filters pedidos by estado_pedido
- Given a valid admin session
- When admin selects "En preparación" chip
- Then `GET /api/admin/pedidos?estado_pedido=en_preparacion&limit=24` is called
- And only pedidos with that state are shown

### REQ-WIRE-PED-002 — Pedidos detail modal
Opening the detail modal MUST call `GET /api/admin/pedidos/:id` (since the list does not include items). The modal MUST show: numero, cliente, mesa, teléfono, método, observaciones, items list, total, comprobante placeholder, action buttons. The `hasReceipt` field MUST be derived from `comprobante_archivo_id != null`.

### REQ-WIRE-PED-003 — Pedidos advance state
Clicking "Pasar a {next}" (RefreshCw button) MUST call `PATCH /api/admin/pedidos/:id/estado` with `{ estado_pedido: <next> }`. The list MUST update the state. If the API call fails (e.g. invalid transition), an inline error MUST be shown and the state MUST be reverted.

### REQ-WIRE-PED-004 — Pedidos mark paid
Clicking "Marcar pagado" MUST call `PATCH /api/admin/pedidos/:id/pago` with `{ estado_pago: 'pagado' }`. The list and detail modal MUST update. If the API rejects (e.g. comprobante required for transferencia), an inline error MUST be shown and the change reverted.

### REQ-WIRE-PED-005 — Pedidos cancel
Clicking "Cancelar pedido" MUST show a confirmation prompt (browser confirm). If confirmed, MUST call `PATCH /api/admin/pedidos/:id/cancelar`. The list and detail modal MUST update.

### REQ-WIRE-AUTH-001 — Trusted Origin header
All admin POST/PUT/PATCH/DELETE requests MUST include an `Origin: ${FRONTEND_URL}` header. The backend's `requireTrustedOrigin` middleware rejects mutating requests without a valid Origin. The `apiPost/apiPut/apiPatch` helpers MUST accept an optional headers override OR the `useAuth` flow MUST inject the Origin automatically.

**Decision**: Use the `headers` field already supported by `fetch`. Create a thin wrapper `adminApiPost` etc. that sets `Origin: process.env.NEXT_PUBLIC_FRONTEND_URL || window.location.origin`. The wrapper delegates to `apiPost` for everything else (credentials, auth token, error parsing).

## MODIFIED Requirements

### REQ-ADMIN-HEADER-001 (from admin-ui-system) — Refresh button
A refresh button MUST be added to the admin header (or per-screen) so the user can refetch the list manually. Without SSE/polling, this is the only way to see new data.

## Type updates
```ts
// frontend/lib/types.ts
export type ApiPedido = {
  id: number
  numero: string
  token_seguimiento: string
  origen: 'online' | 'caja'
  nombre_cliente: string
  mesa: string | null
  telefono_cliente: string | null
  telefono_whatsapp: string | null
  estado_pedido: 'recibido' | 'en_preparacion' | 'listo' | 'entregado' | 'cancelado'
  estado_pago: 'pendiente' | 'comprobante_subido' | 'pagado' | 'rechazado'
  metodo_pago: 'transferencia' | 'efectivo'
  total: string | number
  observaciones: string | null
  comprobante_archivo_id: number | null
  created_at: string
  updated_at: string
  items: ApiItem[]  // only present in detail responses
}

export type ApiPedidoListItem = Omit<ApiPedido, 'items'> & { items?: never }

export type ApiPedidoPaginada = {
  pedidos: ApiPedidoListItem[]
  paginacion: { total: number; page: number; limit: number; totalPages: number }
}

export type ApiProductoPaginada = {
  productos: ApiProducto[]
  paginacion: { total: number; page: number; limit: number; totalPages: number }
}
```

## Testing strategy
- **Backend smoke** (pre-apply): curl login + list + detail with cookie. Confirmed 200 with expected shape.
- **Adapter unit test** (optional): mapping functions. Not required if shape is stable.
- **End-to-end smoke** (post-apply): dev login → /admin/productos → list shows real products → toggle active → list updates → /admin/caja → tap 2 products → confirm → modal shows numero. /admin/pedidos → list shows real pedidos → click "Pasar a en preparación" → state updates.
- **Build**: `pnpm build` with all screens.
- **Visual**: spot-check at 360px and 1024px to confirm no overflow.
