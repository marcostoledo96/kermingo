# Tasks: Backend B6.1 Configuración — Review Fixes

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~300 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR sobre `feature/backend-b6-1-cocina-review-fixes` |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: feature-branch-chain
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Todos los fixes + tests | PR único | Base: `feature/backend-b6-1-cocina-review-fixes` |

## Phase 1: Setup

- [x] 1.1 Crear rama `feature/backend-b6-1-configuracion-review-fixes` desde `feature/backend-b6-1-cocina-review-fixes`

## Phase 2: CSRF fix (P1)

- [x] 2.1 `configuracion.routes.js` — agregar `import { requireTrustedOrigin } from '../middlewares/origin.middleware.js'`
- [x] 2.2 Insertar `requireTrustedOrigin` en PUT admin: `requireAdmin, requireTrustedOrigin, validateBody(...), actualizarAdmin`

## Phase 3: affectedRows bug fix (HIGH)

- [x] 3.1 `configuracion.controller.js` — remover `const affected = await updateMinimal(...)` y el `if (affected === 0) throw NotFoundError`. Cambiar a `await updateMinimal(pool, req.body)` directo
- [x] 3.2 Mover `findAdmin(pool)` post-update. Si `null` → `NotFoundError('Configuración no encontrada')`; si no → `respuestaExitosa(res, config, 'Configuración actualizada')`

## Phase 4: Schema Zod nullable (MEDIUM)

- [x] 4.1 `configuracion.schema.js` — `mensaje_publico: z.string().max(500).nullable().optional()`
- [x] 4.2 `cena_habilitada_desde: z.string().regex(...).nullable().optional()`

## Phase 5: Tests

- [x] 5.1 `configuracion.test.js` — renombrar test a "sin cookie devuelve 401". Corregir comentario "404 sin DB" a "500 error pool"
- [x] 5.2 Crear `configuracion.controller.test.js` — mocks `admin.middleware` y `origin.middleware`. Tests: GET público 200, GET admin 200/404, PUT estado válido 200, PUT mismos datos 200, PUT null campos 200, PUT estado inválido 400, PUT mensaje >500 400, PUT props extras 400, PUT sin Origin 403, PUT Origin hostil 403
- [x] 5.3 Crear `configuracion.unit.test.js` — tests schema Zod puro. estado ok/inválido, mensaje string/null/ausente/>500, cena string/null/mal/ausente, strict extras, body vacío
- [x] 5.4 Crear `configuracion.csrf.test.js` — tests CSRF con middleware real (separado porque `jest.unstable_mockModule` no permite toggle). NOTA: `requireTrustedOrigin` retorna 401 (no 403) por usar `AuthError`; semánticamente 403 sería correcto, es un bug pre-existente documentado en verify-report.

## Phase 6: Verify & docs

- [x] 6.1 `npm test` en backend — verificar que todos los tests pasan (8 suites, 63 tests)
- [x] 6.2 Modificar `openspec/changes/backend-b6-1-cocina-configuracion/tasks.md` para documentar remediación retroactiva del PR #2