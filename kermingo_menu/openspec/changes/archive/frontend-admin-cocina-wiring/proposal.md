# Change: frontend-admin-cocina-wiring

## Why
After `frontend-admin-api-wiring`, only the cocina admin screen still uses MOCK data. This change wires it to the real backend and adds a polling loop so the kitchen view updates without manual refresh.

## What changes
- **`cocina`**: list from `GET /api/admin/cocina/pedidos` on mount; advance state via `POST /api/admin/cocina/pedidos/:id/estado`. Items are fetched in parallel via `GET /api/admin/cocina/pedidos/:id`.
- **Polling**: `setInterval` every 10s refetches the list. Stops when the component unmounts. Manual refresh button is also available.
- **Type**: add `CocinaPedido` (header) and `CocinaOrder` (header + items) to `lib/admin.ts`. Reuse the existing `OrderStatus` mapping.
- **No backend changes** — the cocina endpoints already return the data we need.

## Impact
- Affected files (frontend only):
  - `frontend/components/admin/cocina-screen.tsx`
  - `frontend/lib/admin.ts` (extend)
  - `frontend/lib/types.ts` (extend with `ApiCocinaPedido`)
- No backend changes.
- No public-facing pages change.
- No database changes.

## Out of scope
- SSE / WebSockets (polling 10s is enough for an event with 5h duration)
- Comprobante viewer
- Edit pedido from cocina
- Real-time sound notifications when a new pedido arrives
- Drag-and-drop between columns

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| N+1 fetches for items on each refresh (24 orders × 1 fetch = 24 parallel GETs) | Med | `Promise.all` so they run in parallel; backend connection pool absorbs the burst |
| Polling keeps firing even when tab is hidden | Low | `document.visibilitychange` pauses polling when tab hidden |
| Polling continues after unmount | Low | `clearInterval` on cleanup; documented in `useEffect` |
| Race condition when polling fires while a PATCH is in flight | Low | Skip polling refetch if `acting !== null` |
| Stale items when advancing state | Low | After PATCH, refetch the affected order to get fresh items |
| **Cocina endpoint doesn't accept `cancelado`** (verified — schema is `recibido\|en_preparacion\|listo\|entregado`) | High | Use `PATCH /api/admin/pedidos/:id/cancelar` for cancel from cocina, not the cocina endpoint |

## Rollback
Revert this change. Backend untouched.

## Dependencies
- `GET /api/admin/cocina/pedidos` (admin auth)
- `GET /api/admin/cocina/pedidos/:id` (admin auth)
- `POST /api/admin/cocina/pedidos/:id/estado` (admin auth + trusted origin)
- `lib/api.ts` already wired
- `useAuth` already provides session
- Polling reuses `useEffect` cleanup pattern

## Success criteria
- [ ] `Cocina` list shows real pedidos from `/api/admin/cocina/pedidos` (excludes `cancelado` and `entregado`)
- [ ] Each card shows the order items (fetched in parallel from detail endpoint)
- [ ] Click "En preparación" / "Listo" / "Entregado" / "Cancelar" hits real API and updates the UI
- [ ] "Productos pendientes" sidebar aggregates real items from `recibido` + `en_preparacion` orders
- [ ] Tab counts reflect real data
- [ ] Auto-refresh every 10s
- [ ] Manual refresh button works
- [ ] Polling pauses when document hidden
- [ ] `pnpm build` passes
- [ ] No console errors / no 401/403

## Single-PR decision
Single PR. 1 screen + 1 adapter extension. ~250 lines of changes total.
