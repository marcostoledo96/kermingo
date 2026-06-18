# Archived: frontend-admin-cocina-wiring

**Date:** 2026-06-14
**Status:** ARCHIVED — verdict PASS

## Summary
- Created: `openspec/specs/admin-cocina-wiring/spec.md` (durable capability for cocina with real API + polling)
- Replaced MOCK data in cocina admin view with real API
- Added 10s polling loop with visibility-aware pause/resume
- 1 frontend file rewritten (cocina-screen.tsx), 1 file extended (lib/admin.ts, lib/types.ts)
- `pnpm build` 14/14 static pages
- E2E smoke tested: list 9 pedidos, advance 1 from recibido → en_preparacion → listo, all 200 OK
- Cancelled pedido 1 not in cocina list (cancel button hidden for `listo` state)

## Verified E2E operations
1. GET /api/admin/cocina/pedidos → 200, 9 pedidos
2. GET /api/admin/cocina/pedidos/:id → 200, 1 item
3. PATCH .../:id/estado {en_preparacion} → 200
4. PATCH .../:id/estado {listo} → 200
5. Cancelled pedido NOT in cocina list (verified)

## Bug found and fixed during apply
- Cocina endpoint schema rejects `estado_pedido: 'cancelado'` — only allows recibido/en_preparacion/listo/entregado
- Decision: hide Cancel button when state is `listo`; use `PATCH /api/admin/pedidos/:id/cancelar` (admin pedidos endpoint, which works) for the cancel action

## Out of Scope (next changes)
- SSE/WebSockets (polling 10s is enough for 5h event)
- Sound notification when new pedido arrives
- Drag-and-drop between columns
- Real-time multi-cocinero presence
