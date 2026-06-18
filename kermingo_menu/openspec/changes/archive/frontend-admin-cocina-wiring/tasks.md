# Tasks: admin-cocina-wiring

> Single-PR implementation. Tasks are sequenced for minimal risk.

## Phase 1 — Types + adapter
- [ ] T1. Verify backend allows `estado_pedido: 'cancelado'` transition from `recibido/en_preparacion/listo` via cocina endpoint. If not, fall back to `PATCH /api/admin/pedidos/:id/cancelar`.
- [ ] T2. Extend `frontend/lib/types.ts` with `ApiCocinaPedido`.
- [ ] T3. Extend `frontend/lib/admin.ts` with `CocinaPedido` type and `apiToCocinaOrder(header, items)` mapping. Export `mapOrderStatus` (currently private).

## Phase 2 — Cocina screen
- [ ] T4. Refactor `cocina-screen.tsx`:
  - Replace `INITIAL_ORDERS` with `useState<CocinaPedido[]>([])`.
  - Add `useEffect` for initial fetch + polling (10s).
  - Add `useEffect` for `document.visibilitychange`.
  - Add `loading`, `refreshing`, `error`, `actingId` state.
- [ ] T5. Wire `fetchCocina` to `GET /api/admin/cocina/pedidos` + parallel `GET .../:id` for items.
- [ ] T6. Wire `advance(id, next)` to `POST /api/admin/cocina/pedidos/:id/estado`. Optimistic update; revert on error.
- [ ] T7. Drop "Entregados" tab. New TABS: Recibidos, En preparación, Listos, Todos.
- [ ] T8. Hide `metodo_pago` row in the card (irrelevant for cooks).
- [ ] T9. Add a small "En vivo · {time}" badge in the header to indicate polling.
- [ ] T10. Add a manual refresh button next to the header.

## Phase 3 — Verification
- [ ] T11. Smoke test: `pnpm build` passes.
- [ ] T12. Smoke test: dev server, login, navigate to /admin/cocina. No 401/403, no console errors.
- [ ] T13. End-to-end manual smoke: list shows real orders, click "En preparación" → card moves to next tab. Cancel → card disappears. Wait 10s → list refreshes.
- [ ] T14. Mobile check: 360px viewport. No horizontal overflow.

## Phase 4 — Archive
- [ ] T15. Move `openspec/changes/frontend-admin-cocina-wiring/` to `openspec/changes/archive/`.
- [ ] T16. Copy `specs/admin-cocina-wiring.md` to `openspec/specs/admin-cocina-wiring/spec.md`.
- [ ] T17. Write `ARCHIVED.md` with the change summary.

## Traceability

| Spec scenario | Tasks |
|---|---|
| REQ-WIRE-COC-001 | T4, T5 |
| REQ-WIRE-COC-002 | T6 |
| REQ-WIRE-COC-003 | T6 |
| REQ-WIRE-COC-004 | T4 |
| REQ-WIRE-COC-005 | T10 |
| REQ-WIRE-COC-006 | T4 (existing logic) |
| REQ-WIRE-COC-007 | T7 |
