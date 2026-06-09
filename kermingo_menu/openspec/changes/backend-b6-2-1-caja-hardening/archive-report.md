# Archive Report: backend-b6-2-1-caja-hardening

## Status

Archived with manual fallback because the `sdd-archive` subagent failed with `ProviderModelNotFoundError`.

## Summary

B6.2.1 executed the external ChatGPT audit verdict for B6.2 Caja.

Implemented and verified:
- Atomic/transacted `updateEstadoPago` using `SELECT ... FOR UPDATE`.
- Method-aware payment transitions for `efectivo` and `transferencia`.
- Payment changes blocked for cancelled pedidos.
- Same-state payment PATCH rejected at API/model mutation level to protect `pagado` as terminal under competing requests.
- Partial `PUT /api/admin/pedidos/:id` without `items` allowed when at least one editable field is provided.
- `metodo_pago` edits keep `estado_pago` coherent.
- Known edit errors mapped to 400/404/409 instead of accidental 500s.
- Caja test hygiene improved with unique run IDs, safer cleanup, and pool teardown.
- `PUT /api/admin/configuracion-tienda` protected with `requireTrustedOrigin` and untrusted origin returns 403.

## Verification

Formal re-verify result: PASS.

Evidence from `sdd-verify`:
- `npm test` passed.
- Focused caja/config tests passed.
- Local server/curl checks confirmed:
  - config admin PUT with untrusted origin -> 403
  - same-state `pagado -> pagado` payment PATCH -> 400

## Artifacts

- `openspec/changes/backend-b6-2-1-caja-hardening/explore.md`
- `openspec/changes/backend-b6-2-1-caja-hardening/proposal.md`
- `openspec/changes/backend-b6-2-1-caja-hardening/design.md`
- `openspec/changes/backend-b6-2-1-caja-hardening/tasks.md`
- `openspec/changes/backend-b6-2-1-caja-hardening/verify-report.md`
- `docs/planificacion/35-AUDITORIA_B6_2_CAJA_CHATGPT_VEREDICTO.md`

## Next

B6.3 Comprobantes / Google Drive can proceed after the B6.2.1 hardening PR is reviewed and merged into the existing feature-branch chain.

## Risks

- `sdd-archive` subagent provider configuration still needs follow-up outside this code change.
- Backend still has no lint/coverage scripts, so verification evidence remains test/runtime-based.
