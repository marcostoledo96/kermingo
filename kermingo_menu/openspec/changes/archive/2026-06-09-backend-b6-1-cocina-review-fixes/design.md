# Design: backend-b6-1-cocina-review-fixes

## Technical Approach

Apply retroactive review fixes onto PR #1 (B6.1 cocina) on `feature/backend-b6-1-cocina`.
Fixes are 3 model-level corrections, 1 controller-level deduplication, and 1 test expansion.

- **Model (`pedido.model.js`)**: fix `transicionEstadoValida` null-transition bug; export `TRANSICIONES_VALIDAS` and `transicionEstadoValida`; rewrite `findKitchenPedidos` `GROUP BY` to list all selected columns.
- **Controller (`cocina.controller.js`)**: remove local `TRANSICIONES_COCINA`/`transicionCocinaValida`; import shared helpers from model; unify `PATCH` error messages to a single string.
- **Tests (`cocina.test.js`)**: expand from 3 bare 401 tests into 3 `describe` layers: auth gating (no DB), admin workflow with mocked pool (contract tests), and unit validation of the transition helper.

## Architecture Decisions

| # | Decision | Alternatives | Rationale |
|---|---|---|---|
| 1 | Export `TRANSICIONES_VALIDAS` + `transicionEstadoValida` from `pedido.model.js` | Keep private, duplicate in controller | Single source of truth; controller contained an exact duplicate. |
| 2 | Fix null transition bug: same-state returns `false` | Keep returning `true` for idempotency | Latent bug allowing no-op state changes to succeed silently. |
| 3 | Keep defense-in-depth double check in `cambiarEstadoCocina` | Remove controller pre-check, rely only on `updateEstadoPedido` | Pre-check avoids a DB query for invalid transitions; model check catches races. |
| 4 | Tests: Option C (mixed) — 401 without DB + mocked pool for 200/400 | A) Real DB for everything; B) Mock DB shape only | No test DB infrastructure exists yet; Option C is minimum viable coverage. |
| 5 | No `cocina.model.js` | Create separate model per original proposal | PR #1 shipped without it; `findKitchenPedidos` stays in `pedido.model.js` to avoid scope creep. |
| 6 | Target `feature/backend-b6-1-cocina`, not `main` | Apply fixes directly to `main` | PR #1 is not on `main`; fixes must travel with the feature branch. |

## Data Flow (PATCH /estado)

```
Cliente ──PATCH /api/admin/cocina/pedidos/{id}/estado
         └── Headers: Origin=http://localhost:3000, Cookie=JWT
    │
    ▼
cocina.routes.js ──requireAdmin──requireTrustedOrigin
    │
    ▼
validateParams(idParamSchema)──validateBody(updateEstadoPedidoCocinaSchema)
    │
    ▼
cambiarEstadoCocina
    ├── findById(pool, id) ──► NotFoundError? 404
    ├── transicionEstadoValida(actual, siguiente) ──► false? 400
    ├── updateEstadoPedido(pool, id, siguiente) ──► -1? 400
    └── findById(pool, id) ──► 200 + respuestaExitosa
```

## File Changes

| File | Action | Description |
|---|---|---|
| `kermingo_menu/backend/src/api/models/pedido.model.js` | Modify | Fix `GROUP BY`; export `TRANSICIONES_VALIDAS` and `transicionEstadoValida`; fix null transition bug |
| `kermingo_menu/backend/src/api/controllers/cocina.controller.js` | Modify | Remove `TRANSICIONES_COCINA`/`transicionCocinaValida`; import model helpers; unify error messages |
| `kermingo_menu/backend/tests/cocina.test.js` | Modify | Expand from 3×401 to full matrix (auth + mocked admin flows + unit transitions) |
| `openspec/changes/backend-b6-1-cocina-configuracion/tasks.md` | Modify | Phase 5.1 corrections |
| `openspec/changes/backend-b6-1-cocina-configuracion/verify-report.md` | Modify | Remove stale dotenv item |

## Interfaces / Contracts

**pedido.model.js exports**
```js
export const TRANSICIONES_VALIDAS = { ... };
export function transicionEstadoValida(actual, siguiente) { ... }
export async function findKitchenPedidos(pool) { ... }
```

**cocina.controller.js — PATCH handler contract**
- Input: `req.params.id` (int), `req.body.estado_pedido` (enum)
- Success: `200 { ok: true, data: <pedido>, message: 'Estado actualizado' }`
- Errors:
  - `400 ValidationError('Transición de estado no válida para cocina')`
  - `400` Zod validation fail
  - `403 AuthError('Origen no permitido')`
  - `404 NotFoundError('Pedido no encontrado')`

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Auth gating | 3 endpoints without cookie → 401 | Supertest hitting Express app; no DB |
| Admin workflow (mocked) | List 200, detail 200/404, PATCH valid 200 / invalid 400 / null 400 / not-found 404 | `jest.mock('../src/api/database/db.js')`; inject fake rows. Set `Origin` header. |
| Unit state transitions | `transicionEstadoValida` matrix + null fix | Direct function call; no HTTP, no DB |

*Note:* `findKitchenPedidos` SQL compatibility with `ONLY_FULL_GROUP_BY` is **manual verification** (curl against MySQL 8); no automated test DB exists.

## Migration / Rollout

No migration required. Fixes are retroactive adjustments on the feature branch before it reaches `main`.

## Open Questions

- [ ] Should `findKitchenPedidos` exclude `cancelado` in addition to `entregado`? (spec says yes; current `IN` clause already does.)
- [ ] Is `Origin` header required for non-browser tests, or should `requireTrustedOrigin` be relaxed in test env?
- [ ] Do we add integration tests with a real test DB before merging to `main`, or is mocked coverage sufficient for now?
