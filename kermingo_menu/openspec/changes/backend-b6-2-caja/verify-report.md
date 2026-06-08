## Verification Report

**Change**: backend-b6-2-caja  
**Scope**: PR 2 / Work Unit 2 — admin pedido edit endpoint, transactional stock reconciliation, and PR1 regression checks  
**Mode**: Standard  
**Date**: 2026-06-08

### Completeness
| Metric | Value |
|--------|-------|
| Scoped PR2 tasks reviewed | 10 |
| Scoped PR2 tasks evidenced in code/tests/runtime | 10 |
| Scoped PR2 tasks incomplete in implementation | 0 |
| Artifact drift found | 2 local SDD artifacts (`tasks`, `apply-progress`) |

Notes:
- Runtime code and tests show PR2 is implemented.
- Local `sdd/backend-b6-2-caja/tasks` and `apply-progress` still describe PR2 as deferred/remaining, so artifact state is stale even though implementation is present.

### Build & Tests Execution
**Build**: ➖ Not applicable (backend has no separate build step)

**Tests**: ✅ Passed with warnings
```text
Command: npm test -- --runInBand --runTestsByPath tests/caja.test.js -t "Authenticated PUT edit correction (PR2 integration)" --forceExit
Result: PASS (9/9 scoped PR2 tests)

Command: npm test -- --runInBand --forceExit
Result: PASS (44/44 full backend suite)

Command: npm test -- --runInBand --runTestsByPath tests/caja.test.js --detectOpenHandles -t "Authenticated PUT edit correction (PR2 integration)"
Result: PASS (9/9), but Jest reported one open handle (TCPWRAP) originating from the shared MySQL pool used by tests.
```

### Focused Runtime Evidence
**Runtime local API evidence**: ✅ Passed
```text
Local server: node src/server.js
Auth: POST /api/auth/login -> 200

Payment regression checks:
- POST /api/admin/pedidos/caja (transferencia pendiente) -> 201
- PATCH /api/admin/pedidos/:id/pago -> pagado -> 200
- Same pedido PATCH back to pendiente -> 400
- Product 5 stock before payment PATCH: 39; after PATCH: 39 (unchanged)
- GET /api/admin/pedidos?solo_pagos_pendientes=true&origen=caja&buscar=VERIFY-B62 -> returned only unpaid fixture(s), excluded paid fixture

PR2 edit checks:
- POST /api/admin/pedidos/caja (edit fixture) -> 201
- PUT /api/admin/pedidos/:id with [{6 x2}, {9 x3}] -> 200
- Response total -> 9000.00
- Persisted detalle after edit -> producto 6 x2, producto 9 x3
- Persisted stock after success -> producto 6 = 18, producto 9 = 27
- PUT /api/admin/pedidos/:id with impossible quantity ({9 x9999}) -> 409
- Error message preserved transactional intent: stock insuficiente with restored-stock availability shown
```

### Spec Compliance Matrix
| Requirement | Scenario | Evidence | Result |
|-------------|----------|----------|--------|
| Caja pedido correction with stock reconciliation | Edit caja pedido successfully | Focused Jest PR2 integration + runtime PUT success with persisted detalle/total/stock evidence | ✅ COMPLIANT |
| Caja pedido correction with stock reconciliation | Edit fails for insufficient stock | Focused Jest PR2 integration + runtime PUT 409 with no post-failure mutation relative to successful state | ✅ COMPLIANT |
| Admin payment-state machine for caja follow-up | Invalid backward payment transition | Existing PR1 integration test + runtime PATCH `pagado -> pendiente` returned 400 | ✅ COMPLIANT |
| Caja manual mark-paid behavior | Caja verified transfer marked paid without comprobante | Existing PR1 integration test + runtime PATCH `pendiente -> pagado` on transferencia returned 200 | ✅ COMPLIANT |
| Pending-payment visibility for caja | Filter unpaid pedidos for caja | Existing PR1 integration test + runtime filtered GET excluded paid fixture | ✅ COMPLIANT |

**Compliance summary**: 5/5 scoped scenarios compliant

### Correctness (Static + Runtime Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| `PUT /api/admin/pedidos/:id` route is wired and validated | ✅ Implemented | Route, params, origin guard, and body schema are present in `pedido.routes.js` / `pedido.schema.js`. |
| Edit flow is transaction-based and locks pedido/product rows | ✅ Implemented | `editWithTransaction()` uses explicit transaction plus `FOR UPDATE` locking on pedido and affected products. |
| Old reservations are restored before validating new stock | ✅ Implemented | Validation uses `stock_actual + restore` per affected product. |
| Failed edit leaves persisted state unchanged | ✅ Runtime verified | After 409 attempt, persisted detalle remained at the successful replacement set and stock stayed at post-success values. |
| PR1 payment/filter behavior remains intact | ✅ Verified | Focused PR1 tests still pass inside `caja.test.js`, and runtime PATCH/filter regression checks passed. |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| Reuse existing admin pedido surface for correction | ✅ Yes | Edit behavior is exposed through `PUT /api/admin/pedidos/:id`. |
| Keep payment changes stock-neutral | ✅ Yes | Runtime stock before/after payment PATCH was unchanged. |
| Make reconciliation atomic | ✅ Yes | Transaction restores prior reservations, validates, rewrites detail, updates total, then commits. |
| Preserve PR1 slice while adding PR2 logic | ✅ Yes | Payment/filter scenarios still pass after PR2 implementation. |

### Issues Found
**CRITICAL**
- None.

**WARNING**
- `backend/package.json` still points `npm test` at Jest without `--forceExit`, and `--detectOpenHandles` shows an open MySQL TCP handle from the shared pool. The suite passes, but the default command does not terminate cleanly in local verification.
- `backend/tests/caja.test.js` is not concurrency-safe: it mutates shared stock and cleans fixtures by broad `LIKE 'TEST-B6-2%'` prefixes, so parallel verification runs can delete each other’s pedidos and produce false 404/stock failures.
- Local SDD artifacts are stale: `sdd/backend-b6-2-caja/tasks` and `apply-progress` still mark PR2 as deferred even though code/tests are present. That reduces artifact trustworthiness for downstream phases.

**SUGGESTION**
- Add explicit pool teardown or test lifecycle cleanup so plain `npm test` exits cleanly without verify-only flags.
- Isolate DB-backed test fixtures with per-run unique prefixes or transaction/seed reset helpers so concurrent runs cannot interfere.
- Sync local SDD `tasks` and `apply-progress` with the implemented PR2 state before archive.

### Verdict
PASS WITH WARNINGS

PR 2 / Work Unit 2 is behaviorally correct and ready for commit/PR: edit reconciliation works, rollback-on-409 holds, and PR1 payment/filter behavior remains intact. The remaining concerns are test-harness quality and stale local SDD bookkeeping, not a functional blocker for this slice.
