# Design: Edit Orders, Caja Transfer Paid State, Promo Components

## Technical Approach

Implement the change as stacked, backend-first slices. Reuse existing MVC patterns, Zod schemas, `requireAdmin + requireTrustedOrigin`, `apiGet/apiPut`, and the current `editWithTransaction` stock reconciliation instead of introducing new abstractions. The risky stock path stays in `backend/src/api/models/pedido.model.js`; UI changes stay inside existing admin screens/modals.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Caja paid state | Force `estado_pago='pagado'` in `crearCaja` for `efectivo` and `transferencia` | Trust frontend payload | Caja is in-person confirmed intake; backend must be authoritative. |
| Promo components | Add `GET/PUT /api/admin/productos/:id/componentes` backed by `combo_producto` | Embed components in product PUT | Smaller contract; preserves product fields if component save fails. |
| Order edit | Expand existing `editWithTransaction` | New edit service | Existing code already restores/deducts stock with ordered locks; changing one shared path is safer. |
| Promo stock | Continue using current `combo_producto` composition on edit/cancel | Add snapshot table now | Spec requires current composition; snapshot is larger schema work and out of scope. Document rollback risk. |
| Delivery | Stacked PRs to `main` | Monolithic PR | Scope exceeds 400-line review budget. |

## Data Flow

```text
Admin UI ──apiPut──> routes/schema ──> controller ──> model transaction
   │                                                     │
   └── refetch affected list <──── response pedido/producto <──── commit

Order edit transaction:
lock pedido FOR UPDATE → expand old details/current combos → expand new items/current combos
→ lock product IDs ORDER BY id FOR UPDATE → validate net stock → update stock/details/pedido → commit
```

## File Changes

| File | Action | Description |
|---|---|---|
| `backend/src/api/controllers/pedido.controller.js` | Modify | Force caja paid; map edit errors for cancelled/item/stock cases. |
| `backend/src/api/models/pedido.model.js` | Modify | Allow online/delivered corrections, block cancelled item edits, preserve payment/comprobante data, reject empty replacement. |
| `backend/src/api/schemas/pedido.schema.js` | Modify | Add optional `estado_pago`; keep `items.min(1)` when present. |
| `backend/src/api/models/producto.model.js` | Modify | Add `findComponentes` and transactional `setComponentes`. |
| `backend/src/api/controllers/producto.controller.js` | Modify | Add component GET/PUT; validate promo target and atomic replace. |
| `backend/src/api/routes/producto.routes.js` | Modify | Register component routes before `/:id`. |
| `backend/src/api/schemas/producto.schema.js` | Modify | Add `componentesSchema`. |
| `backend/scripts/fix-caja-transferencias-pagadas.mjs` | Create | Dry-run default; apply requires `CONFIRM_FIX_CAJA_TRANSFERENCIAS=YES` and runs candidates in one transaction. |
| `frontend/lib/types.ts`, `frontend/lib/admin.ts` | Modify | Add component/order-edit API types and service helpers. |
| `frontend/components/admin/product-form-dialog.tsx` | Modify | Promo-only component editor, incomplete warning, preserve draft on failure. |
| `frontend/components/admin/orders-screen.tsx` | Modify | Add edit affordance and modal/sheet with item/metadata/payment draft. |
| `backend/tests/caja.test.js`, `frontend/test/orders-screen.test.tsx`, `frontend/test/product-form-dialog.test.tsx` | Modify | Add behavior tests; first isolate known failures. |

## Interfaces / Contracts

```ts
GET /api/admin/productos/:id/componentes
// -> { producto_id, nombre, cantidad, activo, disponible, stock_limitado, stock_actual }[]

PUT /api/admin/productos/:id/componentes
// body: { componentes: [{ producto_id: number, cantidad: number >= 1 }] }
// 400: non-promo, self-reference, duplicate, inactive/missing component
// componentes: [] clears composition and sets the promo unavailable

PUT /api/admin/pedidos/:id
// body: { nombre_cliente?, mesa?, telefono_cliente?, observaciones?, metodo_pago?, estado_pago?, items? }
// items omitted = metadata/payment only; items: [] rejected; cancelled rejects items/payment/stock-affecting changes.
```

Script contract: `node backend/scripts/fix-caja-transferencias-pagadas.mjs` lists candidate caja-transfer pending IDs/count only by default. `CONFIRM_FIX_CAJA_TRANSFERENCIAS=YES node scripts/fix-caja-transferencias-pagadas.mjs --apply` wraps `UPDATE pedido SET estado_pago='pagado' WHERE origen='caja' AND metodo_pago='transferencia' AND estado_pago <> 'pagado'` in one transaction. Without the env confirmation, `--apply` exits before DB mutation.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Backend unit/schema | Component payload, edit payment payload, empty items | Zod tests. |
| Backend integration | Caja force-paid, script dry-run/apply, promo PUT rollback, order edit stock reconciliation/current combo composition, cancelled/delivered rules | Supertest + MySQL; fix or mark pre-existing `caja.test.js`/MIME failures before relying on full suite. |
| Frontend component | Promo editor draft preservation, order modal submit/reject/refetch | RTL with mocked `apiGet/apiPut`. |
| Manual | Caja sale, promo enable block, online/caja delivered edit, cancelled read-only, script backup note | Browser + DB backup checklist. |

## Migration / Rollout

No schema migration. Data correction is opt-in script with dry-run default and backup confirmation. Roll back code by reverting PRs in reverse order; roll back applied data only by restoring DB backup.

## Chained PR Boundaries

1. Caja force-paid + correction script. 2. Promo component API. 3. Promo UI. 4. Backend order edit expansion. 5. Order edit modal. 6. Tests/docs cleanup. Each slice keeps tests/docs with its code and targets `main`, under 400 changed lines where practical.

## Open Questions

- [ ] None blocking; accepted MVP debt: promo edit/cancel uses current `combo_producto` composition, not sale-time snapshots.
