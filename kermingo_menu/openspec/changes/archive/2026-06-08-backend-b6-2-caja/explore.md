## Exploration: backend-b6-2-caja — Cashier/Payment Admin Flows

### Current State

The backend already has foundational caja/payment wiring from B5 (pedidos, stock, combos):

1. **`POST /api/admin/pedidos/caja`** — caja rápida sale endpoint exists in `pedido.routes.js:32` → `pedido.controller.js:crearCaja`. Accepts `estado_pago: 'pagado'` for cash sales. Works with stock transaction and KMG numbering.

2. **`PATCH /api/admin/pedidos/:id/pago`** — changes payment state via `pedido.controller.js:cambiarPago` → `pedido.model.js:updateEstadoPago`. **Critical gap: there is NO state machine validation** — any `estado_pago` enum value (`pendiente`, `comprobante_subido`, `pagado`, `rechazado`) is accepted from any current state, meaning a `pagado` order can be set back to `pendiente`, or a `pendiente` can skip `comprobante_subido` and go to `rechazado`.

3. **`PATCH /api/admin/pedidos/:id/estado`** — works via `pedido.model.js:updateEstadoPedido` with a proper transition map.

4. **`PATCH /api/admin/pedidos/:id/cancelar`** — cancel with stock reposition, works correctly.

5. **`PUT /api/admin/pedidos/:id`** — **documented in spec (06-ENDPOINTS_API.md:164 "Edita pedido si cliente lo solicita en caja") but NOT implemented**. No route, controller, or schema exists for editing a pedido after creation.

6. **Payment-by-transfer rule** — "caja rápida can mark transfer as paid manually without comprobante if vendor verified" (AGENTS.md §7, 13-FLUJOS_FUNCIONALES.md:57). This currently works silently because `updateEstadoPago` has no guard — but it's accidental correctness, not enforced design.

### Gap Analysis: What B6.2 Must Deliver

| # | Gap | Type | Priority | Lines Est. |
|---|-----|------|----------|------------|
| G1 | `PUT /api/admin/pedidos/:id` — edit pedido items for caja corrections | New endpoint | P0 | ~150 |
| G2 | `updateEstadoPago` state machine validation | Fix existing | P0 | ~30 |
| G3 | Cashier marking transfer as paid without comprobante — explicit guard | Validation rule | P1 | ~20 |
| G4 | Caja-specific list query — filter by unpaid/pending payments | Query enhancement | P1 | ~25 |
| G5 | `comprobante_subido` → `pagado` / `rechazado` transition flow | State machine | P0 | ~15 |

### Affected Areas

- `backend/src/api/models/pedido.model.js` — modify `updateEstadoPago` to add transition map; add `editPedidoWithTransaction` for G1
- `backend/src/api/controllers/pedido.controller.js` — add `editar` handler; fix `cambiarPago` for state machine
- `backend/src/api/schemas/pedido.schema.js` — add `editPedidoSchema` for item edits
- `backend/src/api/routes/pedido.routes.js` — add `PUT /:id` admin route
- `backend/src/api/routes/index.routes.js` — no change needed (caja is already under `/admin/pedidos`)
- `backend/tests/caja.test.js` — new test file for cashier integration tests

### Approaches

1. **Focused B6.2 single PR** — Implement G1 + G2 + G3 + G4 + G5 as one cohesive cashier slice.
   - Pros: single review cycle, logically coherent (caja = payment + edit), low external deps
   - Cons: estimated ~240-320 new/changed lines; may need careful scope to stay under 400-line budget including tests
   - Effort: Medium

2. **Sub-split: G2+G5 (pago state machine) vs G1 (edit) vs G3+G4 (caja views/guards)**
   - Pros: each PR is ~100-150 lines, very safe reviews
   - Cons: 3 small PRs for tightly related changes; more branch management overhead
   - Effort: Low per slice, but higher orchestration cost

3. **Minimal B6.2 (G2 + G5 only) + defer G1 edit to later**
   - Pros: smallest diff, lowest risk, G1 edit is complex (stock re-reconciliation)
   - Cons: leaves known doc gap (`PUT /:id` documented but missing); Marcos may want edit in caja for the event
   - Effort: Low

### Recommendation

**Approach 1 — focused single PR.** B6.2 is a logically cohesive cashier slice. The estimated 240-320 lines (including ~80 lines of tests) fits within the 400-line budget. Splitting would add branch overhead without reducing risk meaningfully since all changes touch the same files.

**However**, G1 (`PUT /:id` edit) is significantly more complex than the others because it requires:
- Stock reconciliation (remove old items → add new items → adjust delta)
- Re-pricing and total recalculation
- Combo expansion for the delta
- Transaction safety for concurrent stock operations

If G1's complexity pushes the total past 350 lines of production code (adding ~200 lines to the model alone), I'd recommend **defer G1 to a separate B6.2b PR** and ship G2+G3+G4+G5 first as the safe "payment state machine + cashier views" slice. The spec should be written to allow this split if task sizing confirms the concern.

### Payment State Machine (G2 + G5)

Current `estado_pago` enum values: `pendiente`, `comprobante_subido`, `pagado`, `rechazado`

Proposed transition map:

```
pendiente ──→ comprobante_subido  (transferencia: upload comprobante, B6.3)
pendiente ──→ pagado             (efectivo: caja marks paid; transferencia: caja verifies manually)
comprobante_subido ──→ pagado     (admin approves comprobante, B6.3 + caja)
comprobante_subido ──→ rechazado (admin rejects comprobante, B6.3 + caja)
rechazado ──→ pendiente          (client re-submits or caja resets)
pagado ──→ (terminal state)     (no backward transitions)
```

Special caja rule: `pendiente → pagado` is **always valid** for `efectivo` and also valid for `transferencia` when the vendor confirms (AGENTS.md §7). The state machine should allow this forward jump for caja origin.

### Stock Implications

- **G1 (edit)**: Requires stock re-reconciliation in a transaction:
  1. Re-lock all affected products with SELECT FOR UPDATE
  2. Revert original item stock deductions
  3. Compute new item requirements
  4. Validate new stock availability
  5. Apply new deductions
  6. Update pedido_detalle (delete old, insert new)
  7. Recalculate and update total

- **G2/G5 (pago state)**: No stock implications — payment state is independent of stock.

- **G3 (caja transfer→paid)**: No stock implications — stock was already deducted at creation.

### Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| G1 edit race condition: concurrent stock operations during edit | High | SELECT FOR UPDATE + atomic transaction, same pattern as `createWithTransaction` |
| G2 payment state regression: existing admin flows that rely on free-form state changes may break | Medium | Audit all callers of `cambiarPago`; ensure cocina and comprobantes flows are compatible |
| G1 edit with cancelled pedido | Medium | Reject edit on cancelled pedidos at controller level |
| Over-bloating B6.2 if G1 is too complex | Medium | Define G1 deferral criteria in tasks phase; split if forecast exceeds 350 prod lines |
| Missing PUT /:id now means admin UI can't correct items in caja | Low | Defer to B6.2b if needed; manual workaround is cancel + recreate |

### Manual Tests Required

Per `27-CHECKPOINTS_TESTING_AUDITORIA.md` §9 (Etapa 9 — Caja y cocina):
- Manual testing required: **yes**
- Auditoría con ChatGPT recomendada: **yes** (touches pagos/stock)
- Bloquea avance: **yes**

Specific manual test scenarios for B6.2:
1. Create caja sale (efectivo) → validate pago=pagado immediately
2. Create caja sale (transferencia) → validate pago=pendiente
3. Mark transferencia as pagado from caja → validate allowed without comprobante
4. Attempt invalid payment state transition (e.g., pagado→pendiente) → validate 400
5. Attempt valid transition chain: pendiente→comprobante_subido→pagado
6. Attempt valid transition chain: pendiente→comprobante_subido→rechazado→pendiente
7. If G1 included: Edit pedido items → validate stock adjusted, total recalculated
8. If G1 included: Edit with insufficient stock for new items → validate 409
9. Filter caja pedidos by pending payments → validate correct results

### ChatGPT Audit Trigger

**Yes, mandatory.** Per checkpoint rules: "si se cambia estado de pedido/pago, se toca stock, se toca upload de comprobantes." B6.2 touches payment state transitions and potentially stock reconciliation. Use the stock/pedidos audit prompt from `29-PROMPT_AUDITORIA_CHATGPT.md`.

### Ready for Proposal

**Yes.** The exploration identifies clear gaps, a concrete payment state machine design, and a recommended single-PR approach with an optional G1 deferral gate. The orchestrator should proceed to `sdd-propose`.

### Checkpoint Notes

- Checkpoint automatico: pendiente (exploration only, no code)
- Testing manual requerido: si (after implementation)
- Auditoria con ChatGPT recomendada: si (touches pagos/stock)
- Bloquea avance a siguiente etapa: no (exploration phase)