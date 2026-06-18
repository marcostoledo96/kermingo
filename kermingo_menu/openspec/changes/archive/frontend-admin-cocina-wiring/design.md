# Design: admin-cocina-wiring

## 1. Architecture
- **No backend changes**. The cocina endpoints already exist.
- **One new helper** in `lib/admin.ts`: `apiToCocinaOrder(header, items)` mapping.
- **One file rewritten**: `frontend/components/admin/cocina-screen.tsx`.

## 2. Polling strategy
- `useEffect` on mount sets up `setInterval(fetchCocina, 10000)`.
- Cleanup clears the interval on unmount.
- A second `useEffect` listens to `document.visibilitychange` and pauses/resumes polling.
- A `useRef<boolean>` tracks `isPolling` to skip a tick if a PATCH is in flight.
- After a successful PATCH, the affected card's items are refetched (not the full list) to avoid a 10s delay.

## 3. Module additions in `lib/admin.ts`

```ts
export type CocinaPedido = {
  id: string
  code: string
  customer: string
  table?: string
  method: PayMethod   // cash | transfer
  payStatus: PayStatus
  status: OrderStatus
  time: string        // hh:mm
  observations?: string
  lines: { name: string; icon: ProductIcon; qty: number; price: number }[]
}

export function apiToCocinaOrder(
  header: ApiCocinaPedido,
  items: ApiItem[] | undefined,
): CocinaPedido {
  return {
    id: String(header.id),
    code: header.numero,
    customer: header.nombre_cliente,
    table: header.mesa ?? undefined,
    method: 'efectivo',  // cocina list no expone metodo; default. UI lo muestra pero sin sobre-relevancia
    payStatus: header.estado_pago === 'pagado' ? 'pagado' : 'pendiente',
    status: mapOrderStatus(header.estado_pedido),
    time: formatTime(header.created_at),
    observations: header.observaciones ?? undefined,
    lines: (items ?? []).map((it) => ({
      name: it.nombre_producto,
      icon: inferIcon(it.nombre_producto, 'comida'),
      qty: it.cantidad,
      price: typeof it.precio_unitario === 'string' ? parseFloat(it.precio_unitario) : it.precio_unitario,
    })),
  }
}
```

**Caveat**: the cocina list endpoint does NOT return `metodo_pago`. The kitchen doesn't care about payment method, but the current UI shows it. Decision: default to `'efectivo'` and gray out the method row. **OR** hide the method row. Decision: hide it. The card is dense; payment method is irrelevant for the cook.

## 4. Component refactor

### 4.1 cocina-screen.tsx
- Replace `INITIAL_ORDERS` with `useState<CocinaPedido[]>([])`.
- Add `useEffect` for initial fetch + polling.
- Add `useEffect` for `visibilitychange`.
- Add `useState` for `loading`, `refreshing`, `error`, `actingId`.
- Tabs: drop "Entregados", add "Todos". Update `TABS` array.
- Each card's "Cancelar" calls the same endpoint as advance state with `estado_pedido: 'cancelado'`. After PATCH succeeds, the card disappears (filter on `estado_pedido !== 'cancelado'`).
- After PATCH, refetch the affected pedido's detail (in case items changed) — actually items don't change, so we just update the local state and let the next polling tick sync.
- Add a small "live" spinner badge in the header.

### 4.2 Card layout
- Drop the "Efectivo / Transfer." row.
- Keep the rest (numero, cliente, mesa, time, badges, items, buttons).

## 5. Polling tick handler

```ts
const isActivelyMutating = useRef(false)

const fetchCocina = useCallback(async (silent = false) => {
  if (isActivelyMutating.current) return
  if (silent) setRefreshing(true)
  else setLoading(true)
  setError(null)
  try {
    const headers = await apiGet<ApiCocinaPedido[]>('/api/admin/cocina/pedidos')
    const details = await Promise.all(
      headers.map((h) =>
        apiGet<ApiPedido>(`/api/admin/cocina/pedidos/${h.id}`)
          .then((full) => apiToCocinaOrder(full, full.items))
          .catch(() => apiToCocinaOrder(h, []))  // graceful degradation
      ),
    )
    setOrders(details)
  } catch (err) {
    setError(...)
  } finally {
    setLoading(false)
    setRefreshing(false)
  }
}, [])
```

## 6. Visibility + cleanup

```ts
useEffect(() => {
  let interval: ReturnType<typeof setInterval> | null = null
  const start = () => {
    if (interval) return
    interval = setInterval(() => fetchCocina(true), 10_000)
  }
  const stop = () => {
    if (interval) { clearInterval(interval); interval = null }
  }
  const onVis = () => (document.visibilityState === 'visible' ? start() : stop())
  start()
  document.addEventListener('visibilitychange', onVis)
  return () => {
    stop()
    document.removeEventListener('visibilitychange', onVis)
  }
}, [fetchCocina])
```

## 7. State advancement

```ts
async function advance(id: string, next: 'en_preparacion' | 'listo' | 'entregado' | 'cancelado') {
  if (next === 'cancelado' && !window.confirm('¿Cancelar el pedido?')) return
  isActivelyMutating.current = true
  setActingId(id)
  setActionError(null)
  try {
    await apiPost(`/api/admin/cocina/pedidos/${id}/estado`, { estado_pedido: next })
    // Optimistic: drop cancelled orders, mark others
    if (next === 'cancelado') {
      setOrders((prev) => prev.filter((o) => o.id !== id))
    } else {
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: orderStatusFromApi(next) } : o)),
      )
    }
  } catch (err) {
    setActionError(...)
  } finally {
    isActivelyMutating.current = false
    setActingId(null)
  }
}
```

Wait, I need an `orderStatusFromApi` inverse. The existing `orderStatusToApi` takes `OrderStatus` → backend string. I need the inverse: backend string → `OrderStatus`. The existing `mapOrderStatus` in lib/admin.ts does this. I'll export it.

## 8. Decision log
- **Polling, not SSE**: simpler, no backend change, acceptable latency for a 5h event.
- **N+1 items fetch**: 24 parallel GETs is fine for backend; if perf becomes an issue, add `?include=items` to backend later.
- **Hide method_pago in cocina card**: irrelevant for cooks; reduces visual noise.
- **Drop "Entregados" tab**: cocina endpoint excludes `entregado`. Could add separate `?incluir_entregados=true` query in a future change.
- **Graceful degradation**: if items fetch fails for one pedido, render with empty lines and continue.
- **Cancel via same PATCH endpoint**: backend's `cocina.cambiarEstadoCocina` checks `transicionEstadoValida`; need to confirm `cancelado` is a valid next state from any of `recibido/en_preparacion/listo`. Let me verify.

(Will verify in apply step. If cancel is rejected by cocina endpoint, fall back to `PATCH /api/admin/pedidos/:id/cancelar` which we know works.)

## 9. Why a single PR
- 1 screen, 1 adapter extension, no backend changes.
- ~250 lines of changes, all isolated.
- Test plan: open /admin/cocina, see real orders, click advance state, see the card move.
