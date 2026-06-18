# Design: admin-api-wiring

## 1. Architecture
- **No backend changes**. The endpoints already exist; the frontend will adopt them.
- **One new module**: `frontend/lib/admin.ts` — pure mapping functions. No fetch logic; uses `lib/api.ts`.
- **One small helper**: `frontend/lib/admin-fetch.ts` — wraps `apiPost/apiPut/apiPatch` to inject `Origin: ${NEXT_PUBLIC_FRONTEND_URL || window.location.origin}` for mutating admin calls.
- **Three screens rewired**: products, caja, orders. Each keeps the same UI shell (header, filters, table/cards, modals) — only the data source changes.

## 2. Module: `lib/admin.ts`

```ts
import type { ApiProducto, ApiPedidoListItem, ApiPedido, MealCategory, ProductIcon, ProductType } from './types'
import type { AdminProduct } from '@/components/admin/product-form-dialog'
import type { Order, OrderStatus, PayStatus } from '@/components/admin/orders-screen'

// Map a backend ApiProducto to the existing AdminProduct shape used by products-screen.
export function apiToAdminProduct(p: ApiProducto): AdminProduct {
  return {
    id: String(p.id),
    name: p.nombre,
    description: p.descripcion ?? '',
    price: typeof p.precio === 'string' ? parseFloat(p.precio) : p.precio,
    type: p.tipo as ProductType,
    meals: parseCategorias(p.categorias),
    icon: inferIcon(p.nombre, p.tipo),
    image: p.imagen_url ?? undefined,
    active: p.activo === 1,
    stockLimited: p.stock_limitado === 1,
    stockCurrent: p.stock_actual ?? 0,
    stockMin: p.stock_minimo_alerta,
  }
}

// Map AdminProduct back to a create/update payload for the backend.
export function adminToApiPayload(p: AdminProduct): {
  nombre: string
  descripcion?: string
  precio: number
  tipo: 'comida' | 'bebida' | 'promo'
  stock_limitado: 0 | 1
  stock_actual?: number
  stock_minimo_alerta: number
  activo: 0 | 1
} {
  return {
    nombre: p.name.trim(),
    descripcion: p.description.trim() || undefined,
    precio: p.price,
    tipo: p.type,
    stock_limitado: p.stockLimited ? 1 : 0,
    stock_actual: p.stockLimited ? p.stockCurrent : undefined,
    stock_minimo_alerta: p.stockMin,
    activo: p.active ? 1 : 0,
  }
}

function parseCategorias(c: string | null): MealCategory[] {
  if (!c) return []
  const out: MealCategory[] = []
  if (/merienda/i.test(c)) out.push('merienda')
  if (/cena/i.test(c)) out.push('cena')
  return out
}

function inferIcon(name: string, tipo: ProductType): ProductIcon {
  const n = name.toLowerCase()
  if (/(pizza)/.test(n)) return 'pizza'
  if (/(panch|sandwich|hambur)/.test(n)) return 'sandwich'
  if (/(pollo|nugget|alita|pata)/.test(n)) return 'drumstick'
  if (/(empanada|tarta|canasta)/.test(n)) return 'sprout'
  if (/(torta|chocotorta)/.test(n)) return 'cake'
  if (/(gallet|cookie)/.test(n)) return 'cookie'
  if (/(medialuna|croissant)/.test(n)) return 'croissant'
  if (/(donut|dona)/.test(n)) return 'donut'
  if (/(gaseosa|coca|cola|seven|sprite|fanta)/.test(n)) return 'soda'
  if (/(agua)/.test(n)) return 'water'
  if (/(cafe|cafe|mate|te)/.test(n)) return 'coffee'
  if (/(leche)/.test(n)) return 'milk'
  if (/(helado)/.test(n)) return 'icecream'
  if (/(combo)/.test(n)) return 'combo'
  if (tipo === 'bebida') return 'soda'
  if (tipo === 'promo') return 'combo'
  return 'pizza'  // default
}

// Map backend ApiPedido (detail response) to the existing Order shape used by orders-screen.
export function apiToOrder(p: ApiPedido | ApiPedidoListItem): Order {
  return {
    id: String(p.id),
    code: p.numero,
    customer: p.nombre_cliente,
    phone: p.telefono_cliente ?? undefined,
    table: p.mesa ?? undefined,
    method: p.metodo_pago,
    payStatus: mapPayStatus(p.estado_pago),
    status: mapOrderStatus(p.estado_pedido),
    time: formatTime(p.created_at),
    notes: p.observaciones ?? undefined,
    hasReceipt: p.comprobante_archivo_id != null,
    lines: 'items' in p && p.items
      ? p.items.map((it) => ({
          name: it.nombre_producto,
          icon: inferIcon(it.nombre_producto, 'comida'),
          qty: it.cantidad,
          price: typeof it.precio_unitario === 'string' ? parseFloat(it.precio_unitario) : it.precio_unitario,
        }))
      : [],
  }
}

function mapPayStatus(s: string): PayStatus {
  if (s === 'pagado') return 'pagado'
  return 'pendiente'  // pendiente | comprobante_subido | rechazado all show as pendiente for now
}

function mapOrderStatus(s: string): OrderStatus {
  switch (s) {
    case 'recibido': return 'recibido'
    case 'en_preparacion': return 'preparacion'  // legacy alias used in current orders-screen
    case 'listo': return 'listo'
    case 'entregado': return 'entregado'
    case 'cancelado': return 'cancelado'
    default: return 'recibido'
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}
```

### Decision: keep legacy `OrderStatus` enum (`preparacion` instead of `en_preparacion`)
The orders-screen component uses `'preparacion'` as the local type. Renaming it would force changes in many places (STATUS_META, NEXT_STATUS, badges, copy). Mapping at the boundary is cheaper. The `mapOrderStatus` function does the translation; the UI continues to use the short alias. Internal consistency is preserved.

## 3. Module: `lib/admin-fetch.ts`

```ts
import { apiPost as baseApiPost, apiPut as baseApiPut, apiPatch as baseApiPatch, type ApiError } from './api'

function trustedOriginHeaders(): Record<string, string> {
  const origin = process.env.NEXT_PUBLIC_FRONTEND_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  return origin ? { Origin: origin } : {}
}

export function adminApiPost<T>(path: string, body: unknown): Promise<T> {
  return baseApiPost<T>(path, body) // TODO: add headers when api.ts supports it
}
```

**Wait**: `lib/api.ts` does NOT currently accept extra headers. Decision: extend `apiPost/apiPut/apiPatch` to accept an optional 3rd arg `extraHeaders`. Or, less invasive, set `document.referrer` and rely on the browser to send `Origin` automatically. Browser does send `Origin` on `fetch` POSTs by default. Verified: in dev, `fetch('/api/admin/...')` from `localhost:3000` includes `Origin: http://localhost:3000`. **The `requireTrustedOrigin` middleware validates `Origin === FRONTEND_URL` (3000).** So we DON'T need to manually set it; the browser does it for free. **Skip the wrapper module.**

## 4. Wiring per screen

### 4.1 products-screen.tsx
- Replace `useState<AdminProduct[]>(seedProducts)` with `useState<AdminProduct[]>([])`.
- On mount: `useEffect` → `apiGet<ApiProductoPaginada>('/api/admin/productos', { limit: 24 })` → `setProducts(data.productos.map(apiToAdminProduct))`.
- `handleSave`:
  - POST (new) or PUT (edit) → `adminToApiPayload(form)`.
  - On success, update the list.
  - On error, show `ApiError.message` in a toast or inline.
- `toggleActive`:
  - Optimistic: flip `active` immediately.
  - Call `PATCH /api/admin/productos/:id/desactivar` (or `/recuperar`).
  - On error, revert + alert.
- `handleAdjustStock`:
  - PATCH `/api/admin/productos/:id/stock` with `{ stock_actual: value }`.
  - On success, update.
- **Refresh button** in header (small icon-only).

### 4.2 product-form-dialog.tsx
- `handleSubmit` becomes async.
- It now calls `onSave(form)` with a callback that the parent uses to dispatch the API call.
- The form receives new props: `mode: 'create' | 'edit'`, `submitting: boolean`, `error: string | null`.
- The dialog disables the submit button while `submitting` and shows `error` if any.

### 4.3 caja-screen.tsx
- Replace `PRODUCTS` (static import) with state populated from `GET /api/productos?activo=1`.
- Derive `Product` shape from `ApiProducto` (subset).
- `confirmSale` becomes async.
  - Build `items: [{ producto_id, cantidad }]`.
  - `metodo_pago`, `nombre_cliente`, `telefono_cliente?`, `mesa?`, `observaciones?` from form state.
  - `estado_pago`: `'pagado'` if efectivo, else `'pendiente'`.
  - `estado_pedido`: `'recibido'`.
  - POST `/api/admin/pedidos/caja`.
  - On success, show modal with `numero` from response.
  - On error, show inline error above confirm button.
- **Refresh button** in header.

### 4.4 orders-screen.tsx
- Replace `INITIAL_ORDERS` with empty array.
- On mount: `GET /api/admin/pedidos?limit=24` → `setOrders(data.pedidos.map(apiToOrder))`.
- Filters:
  - status: re-fetch with `?estado_pedido=...` (mapped from `preparacion` → `en_preparacion`).
  - payStatus: re-fetch with `?estado_pago=...` (`'pagado'` or `'pendiente'`).
  - method: re-fetch with `?metodo_pago=...`.
  - search: re-fetch with `?buscar=...`.
- Detail modal: on open, `GET /api/admin/pedidos/:id` → setDetail.
- `setStatus`:
  - PATCH `/api/admin/pedidos/:id/estado` with `{ estado_pedido: <mapped back> }`.
- `markPaid`:
  - PATCH `/api/admin/pedidos/:id/pago` with `{ estado_pago: 'pagado' }`.
- `cancel`:
  - Confirm dialog.
  - PATCH `/api/admin/pedidos/:id/cancelar`.
- **Refresh button** in header.

## 5. Error handling strategy
- All API errors raise `ApiError` with a `status` and `message`.
- Show the `message` (Spanish, from backend) in a toast (or inline if in a modal).
- For 401 (token expired): call `useAuth().logout()` and redirect to `/admin`.
- For 403: show "No tenés permisos" toast.
- For 4xx: show the backend message verbatim.
- For 5xx: show "Error del servidor, reintentá".

## 6. State management
- Local `useState` per screen. No global cache, no React Query.
- Refresh model: manual button (no auto-poll).
- Optimistic updates with revert-on-error for low-risk actions (toggle active, mark paid).
- Pessimistic for high-risk actions (cancel, create, edit): show spinner, then update.

## 7. UI additions
- **Refresh button**: small `RotateCcw` icon button next to the section title in each screen. On click, refetches the list.
- **Inline error banner**: thin red-bordered banner above the confirm button or in the dialog, dismissible.
- **Toast**: reuse any existing toast pattern. **Decision**: use a tiny custom toast component in `admin-ui.tsx`. `useToast()` hook + `<Toast />` portal.

Wait, that adds scope. Let me keep it simple:
- For lists, use a top-of-page error banner if initial load fails.
- For mutations, use `alert()` (browser default) on error. Pragmatic, ugly, but ships.
- For cancellation, use `window.confirm()`. Already a baseline.

## 8. Open questions
- Do we need pagination? Backend returns `totalPages`. For MVP, keep `limit=24` and don't paginate UI. Just say "Mostrando 24 de {total}" and that's it.
- Comprobante viewer in detail modal: leave as placeholder button. Out of scope.
- Image upload: leave the "Subir foto" button as a no-op. Out of scope.
- Cocina: out of scope this change.

## 9. Migration safety
- No data migration. Mock data is replaced with real data on next render.
- The `formatPrice` helper continues to work since `precio` and `total` come as strings ("6500.00") and we coerce to number in the adapter.
- If backend returns a pedido with no items (list response), the detail modal handles it gracefully (empty `lines: []`).

## 10. Why a single PR
- 3 screens, all isolated, no shared state.
- The adapter module is the only new file and is local to frontend.
- Splitting into 3 PRs would multiply review effort without reducing risk; each screen change is < 300 lines.
- Test plan: end-to-end smoke takes 5 minutes.
