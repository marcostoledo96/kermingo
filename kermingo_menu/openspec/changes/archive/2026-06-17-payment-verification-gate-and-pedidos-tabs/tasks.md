# Tasks: Payment Verification Gate & Admin Pedidos Tabs

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 500–700 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: backend state machine + tests; PR 2: frontend tabs + tracking + caja images; PR 3: docs/archive |
| Delivery strategy | auto-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend state machine, defaults, filters, tests | PR 1 | `main` base; no frontend dependency |
| 2 | Frontend tabs, tracking, caja images, tests | PR 2 | `main` base; merges after PR 1 |
| 3 | Documentation + archive sync | PR 3 | `main` base; merges after PR 2 |

## Phase 1: Backend State Machine & Defaults

- [x] 1.1 `backend/src/api/models/pedido.model.js`: Add `recibido: ['en_preparacion','listo']` to `TRANSICIONES_VALIDAS`; add `en_preparacion → recibido` for kitchen backward. Update `createWithTransaction` to default `estado_pedido='recibido'` when `origen='online'` and `estado_pedido='en_preparacion'` when `origen='caja'`. Allow `cancelWithTransaction` to accept `recibido`.
- [x] 1.2 `backend/src/api/schemas/pedido.schema.js`: Add `recibido` to `pedidoQuerySchema.estado_pedido`, `updateEstadoPedidoSchema.estado_pedido`, and `createCajaSchema.estado_pedido` enum.
- [x] 1.3 `backend/src/api/controllers/pedido.controller.js`: Keep `crear` rejecting online `efectivo` (transfer-only per decision). Ensure `crear` passes `origen='online'` so model defaults to `recibido`. Verify `crearCaja` passes `origen='caja'` so model defaults to `en_preparacion`.
- [x] 1.4 `backend/tests/cocina.unit.test.js`: Update `TRANSICIONES_VALIDAS` assertions to include `recibido` transitions; test `recibido → en_preparacion` and `en_preparacion → recibido`.
- [x] 1.5 `backend/tests/cocina.test.js`: Update `findKitchenPedidos` test to assert `recibido` orders are excluded; test backward transition `en_preparacion → recibido` removes order from KDS.
- [x] 1.6 `backend/tests/comprobantes.test.js`: Update transfer tests to assert `estado_pedido='recibido'` on creation. Keep `efectivo` rejection tests unchanged.
- [x] 1.7 `backend/tests/caja.test.js`: Assert caja efectivo/transferencia creates with `estado_pedido='en_preparacion'` and `origen='caja'`.
- [x] 1.8 Run `npm test` (backend) and verify all suites pass.

## Phase 2: Frontend Tabs, Tracking, Caja Images

- [x] 2.1 `frontend/components/admin/orders-screen.tsx`: Replace `necesitan-accion/todos` with 4 tabs: `recibido`, `preparacion`, `listo`, `entregado`. Each tab fetches `GET /api/admin/pedidos?estado_pedido={state}&limit=24`. Badge counts from parallel `limit=1` calls or response totals. Add "Confirmar pago" action in `recibido` tab: call `PATCH /pago {pagado}`, then on 200 call `PATCH /estado {en_preparacion}`. On payment failure, do NOT call state PATCH.
- [x] 2.2 `frontend/components/admin/caja-screen.tsx`: In product card, render `<img>` with `CajaProduct.image` (absolute URL) when present; fallback to `ProductIconGlyph`. Add `alt` text from product name.
- [x] 2.3 `frontend/components/menu/tracking-screen.tsx`: Update `STATUS_CONFIG.recibido.message` to "Estamos comprobando tu pago" when `estado_pago!='pagado'`. Preserve existing UI changes.
- [x] 2.4 `frontend/test/orders-screen.test.tsx`: Test tab switching fetches correct `estado_pedido` param; test confirm-payment sequence mocks payment 200 then state 200; test payment 400 blocks state call.
- [x] 2.5 `frontend/test/caja-screen.test.tsx`: Test product card renders `img` when `imagen_url` exists; test fallback icon when absent.
- [x] 2.6 `frontend/test/tracking-screen-token.test.tsx`: Test `recibido` + `comprobante_subido` shows "Estamos comprobando tu pago".
- [x] 2.7 Run `pnpm test`, `pnpm lint`, `pnpm build` (frontend). Verify pass.

## Phase 3: Contract Verification

- [ ] 3.1 Backend/frontend contract: `GET /api/admin/pedidos?estado_pedido=recibido` returns valid `ApiPedidoListItem[]` with `recibido` in `estado_pedido` enum.
- [ ] 3.2 Contract: `PATCH /api/admin/pedidos/:id/pago {estado_pago:'pagado'}` from `recibido` order returns 200; subsequent `PATCH /estado {en_preparacion}` returns 200.
- [ ] 3.3 Contract: `POST /api/pedidos` (transfer+comprobante) returns `estado_pedido='recibido'` and `estado_pago='comprobante_subido'`.
- [ ] 3.4 Contract: `POST /api/admin/pedidos/caja` returns `estado_pedido='en_preparacion'` for both efectivo and transferencia.
- [x] 3.5 Partial verify (backend slice): Run backend tests alone after Phase 1; confirm state machine and endpoints before touching frontend.
- [x] 3.6 Partial verify (frontend slice): Run frontend tests after Phase 2; confirm build passes before docs.

## Phase 4: Documentation & Archive

- [x] 4.1 Update `DOCUMENTACION/IA/API.md`: Document `recibido` default for online, `en_preparacion` for caja, `estado_pedido` filter on admin list, sequential release caveat.
- [x] 4.2 Update `DOCUMENTACION/IA/CORE.md`: State machine changes, `TRANSICIONES_VALIDAS`, cancel eligibility for `recibido`.
- [x] 4.3 Update `DOCUMENTACION/IA/WEBAPP.md`: Admin pedidos tabs, caja product images, tracking copy.
- [x] 4.4 Update `DOCUMENTACION/IA/FLUJOS.md`: Online flow now enters `recibido` → payment confirmation → `en_preparacion`.
- [x] 4.5 Update `DOCUMENTACION/IA/FUNCIONALIDADES.md`: Pending confirmation tab capability, caja rápida bypass.
- [x] 4.6 Update `DOCUMENTACION/IA/TESTING.md`: New backend/frontend test files and scenarios.
- [x] 4.7 Update `DOCUMENTACION/IA/GOTCHAS.md`: Sequential release non-atomic risk, `recibido`+`pagado` manual recovery, kitchen backward transition caveat.
- [x] 4.8 `openspec/changes/payment-verification-gate-and-pedidos-tabs/tasks.md`: Mark all tasks complete.
- [x] 4.9 Create `DOCUMENTACION/IA/DECISIONES.md` with key architectural decisions.
- [x] 4.10 Update `DOCUMENTACION/IA/INDEX.md` to include DECISIONES.md.
- [x] 4.11 Merge delta specs → main specs (3 new, 3 modified).
- [x] 4.12 Archive change folder to `openspec/changes/archive/`.
