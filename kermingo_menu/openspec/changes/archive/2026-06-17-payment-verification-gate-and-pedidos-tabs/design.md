# Design: Payment Verification Gate & Admin Pedidos Tabs

## Technical Approach

Implement the gate by restoring `recibido` as the online intake state while keeping caja and cocina operationally focused on `en_preparacion`/`listo`. Backend remains the authority for defaults, filters, and transitions; frontend `/admin/pedidos` becomes the payment-release workspace and calls existing PATCH endpoints sequentially. Do not touch `diseno-de-landing-kermingo/`. Preserve the current uncommitted `frontend/components/menu/tracking-screen.tsx` tweak that removed the “quitar de mi lista” button; only add status copy around existing tracking UI.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|---|---|---|---|
| Default state | `createWithTransaction` defaults by `origen`: online → `recibido`, caja → `en_preparacion`; controllers pass explicit values where useful | Only set in controllers | Keeps one backend invariant for all call paths and prevents future controller drift. |
| State machine | Add `recibido: ['en_preparacion','listo']`; add `en_preparacion → recibido` if shared transition permits; keep `entregado` terminal | Keep current no-`recibido` model | Spec requires admin release and possible KDS backward removal. |
| Payment release | Frontend calls payment PATCH, then state PATCH only after success | New combined endpoint | Reuses existing contracts; non-atomic risk is handled by error/refetch. |
| Admin tabs | Active tab fetches `limit=24`; tab totals use parallel `limit=1` filtered calls | Client-only filtering from all orders | Ensures server-filtered tabs without loading entire order history. |

## Data Flow

```txt
POST /api/pedidos ─→ pedido.crear ─→ createWithTransaction(origen=online, estado=recibido)
                                           └─ stock deducted, pago pendiente/comprobante_subido

/admin/pedidos tab recibido ─→ GET /api/admin/pedidos?estado_pedido=recibido&limit=24
Confirmar pago ─→ PATCH /pago {pagado} ─200→ PATCH /estado {en_preparacion} ─→ cocina list
```

## File Changes

| File | Action | Description |
|---|---|---|
| `backend/src/api/models/pedido.model.js` | Modify | Origin-aware default, `TRANSICIONES_VALIDAS`, `cancelWithTransaction` accepts `recibido`, admin list already supports `estado_pedido`. |
| `backend/src/api/controllers/pedido.controller.js` | Modify | Allow online efectivo JSON without comprobante; reject efectivo+file; ensure online `recibido`, caja `en_preparacion`. |
| `backend/src/api/schemas/pedido.schema.js` | Modify | Add `recibido` to `pedidoQuerySchema`, `updateEstadoPedidoSchema`, `createCajaSchema` only if explicit override remains accepted; otherwise force caja default. |
| `backend/src/api/schemas/cocina.schema.js` | Modify | Add `recibido` only if cocina backward endpoint may target it. |
| `frontend/components/admin/orders-screen.tsx` | Modify | Replace “Necesitan acción/Todos” with tabs: `recibido`, `preparacion`, `listo`, `entregado`; add confirm-payment release action. |
| `frontend/components/admin/caja-screen.tsx` | Modify | Render product image when `CajaProduct.image` exists; fallback to `ProductIconGlyph`. |
| `frontend/components/menu/tracking-screen.tsx` | Modify | Change `recibido` unpaid copy to “Estamos comprobando tu pago”; preserve local remove-button deletion. |
| `frontend/lib/admin.ts`, `frontend/lib/types.ts` | Modify | Keep `recibido` mappings; ensure `CajaProduct.image` and API order types cover contracts. |
| `backend/tests/*.test.js`, `frontend/test/*.test.tsx` | Modify/Create | Add coverage listed below. |

## Interfaces / Contracts

- `GET /api/admin/pedidos?estado_pedido=recibido|en_preparacion|listo|entregado&limit=24` must validate all four tab states.
- Online create:
  - JSON efectivo: `estado_pago='pendiente'`, `estado_pedido='recibido'`.
  - Multipart transferencia+`comprobante`: `estado_pago='comprobante_subido'`, `estado_pedido='recibido'`.
- Caja create: `origen='caja'`, `estado_pedido='en_preparacion'`; efectivo defaults `pagado`, transferencia follows payload/default.
- Release sequence is not atomic: if second PATCH fails, UI shows error and refetches; order may remain `recibido`+`pagado` for manual retry.

## Testing Strategy / Verification Matrix

| Layer | Scenarios | Files |
|---|---|---|
| Backend integration | Online efectivo received; transfer received; caja preparation; admin filter `recibido`; cocina excludes `recibido`; delivered rollback 400 | `backend/tests/comprobantes.test.js`, `backend/tests/caja.test.js`, `backend/tests/cocina.test.js` |
| Backend unit | `TRANSICIONES_VALIDAS` includes `recibido → en_preparacion`, terminal delivered, payment transition failure | `backend/tests/cocina.unit.test.js` |
| Frontend unit/component | Orders tabs request correct URLs; confirm-payment does not call state PATCH on payment failure; caja image/fallback; tracking copy | `frontend/test/orders-screen.test.tsx`, `frontend/test/caja-screen.test.tsx`, `frontend/test/tracking-screen-token.test.tsx`, `frontend/test/admin.test.ts` |
| Build | `npm test`, focused backend suites, `pnpm test`, `pnpm lint`, `pnpm build` | backend/frontend commands |

## Migration / Rollout

No DB migration required. Existing `en_preparacion` online orders stay operational. After deploy, only new online orders enter `recibido`.

## Risks

- Spec conflicts with current docs/code that reject public efectivo; archive must update API/CORE/WEBAPP/FLUJOS/FUNCIONALIDADES if efectivo online is truly desired.
- Sequential release can leave `recibido`+`pagado`; mitigate with retry/refetch UI.
- Cocina backward to `recibido` removes order from KDS; needs clear admin recovery in `/admin/pedidos`.

## Documentation Updates Needed

Update `DOCUMENTACION/IA/API.md`, `CORE.md`, `WEBAPP.md`, `FLUJOS.md`, `FUNCIONALIDADES.md`, `TESTING.md`, and `GOTCHAS.md` for state defaults, filters, tabs, tracking copy, caja images, and sequential release caveat.

## Open Questions

- [ ] Confirm whether public online efectivo is intentionally re-enabled; current source and docs say online is transfer-only.
