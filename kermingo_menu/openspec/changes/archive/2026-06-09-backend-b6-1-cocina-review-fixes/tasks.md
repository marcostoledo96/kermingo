# Tasks: backend-b6-1-cocina-review-fixes

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 130–150 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: feature-branch-chain
400-line budget risk: Low

## Phase 1: Setup rama de fix

- [x] 1.1 Crear rama `feature/backend-b6-1-cocina-review-fixes` desde `feature/backend-b6-1-cocina` (HEAD `bf040a0`)

## Phase 2: Model fixes — `pedido.model.js`

- [x] 2.1 Agregar `export const TRANSICIONES_VALIDAS` antes del `export` del objeto
- [x] 2.2 Agregar `export function transicionEstadoValida(actual, siguiente)` (la función ya existe, solo exportarla)
- [x] 2.3 Fix bug transición nula: línea `if (actual === siguiente) return true` → `return false`
- [x] 2.4 Reescribir `findKitchenPedidos` GROUP BY listando todas las columnas seleccionadas (p.id, p.numero, p.nombre_cliente, p.mesa, p.estado_pedido, p.estado_pago, p.observaciones, p.created_at, p.total)

## Phase 3: Controller fixes — `cocina.controller.js`

- [x] 3.1 Eliminar bloque `TRANSICIONES_COCINA` y `transicionCocinaValida` (~líneas 35-43)
- [x] 3.2 Agregar `import { transicionEstadoValida } from '../models/pedido.model.js'`
- [x] 3.3 Unificar mensajes: ambos `throw ValidationError` en `cambiarEstadoCocina` usan `'Transición de estado no válida para cocina'`

## Phase 4: Tests — cocina (3 archivos)

- [x] 4.1 Mantener 3 tests de 401 sin auth en `cocina.test.js` (no requieren DB mock)
- [x] 4.2 Crear `cocina.controller.test.js` con `jest.unstable_mockModule` (ESM-compatible):
  - GET /pedidos → 200 con array
  - GET /pedidos/:id existente → 200
  - GET /pedidos/:id inexistente → 404
  - PATCH transición válida → 200
  - PATCH salto inválido → 400
  - PATCH mismo estado → 400 (FIX retroactivo)
  - PATCH id inexistente → 404
  - PATCH estado fuera de enum → 400 (Zod)
  - PATCH id no numérico → 400 (Zod)
- [x] 4.3 Crear `cocina.unit.test.js` con tests unitarios sin HTTP:
  - recibido→en_preparacion: true
  - en_preparacion→listo: true
  - listo→entregado: true
  - recibido→listo: false (salto)
  - listo→recibido: false (retroceso)
  - recibido→recibido: false (FIX retroactivo)

Nota: la separación en 3 archivos (en lugar del único `cocina.test.js` del design) es necesaria porque `jest.unstable_mockModule` tiene scope de archivo: el archivo con mocks no puede importar la implementación real. 23 tests pasan.

## Phase 5: Verify & docs

- [x] 5.1 Correr `npm test` en backend y verificar que todos los tests pasan (5 suites, 23 tests, 0 failures)
- [x] 5.2 Modificar `openspec/changes/backend-b6-1-cocina-configuracion/tasks.md` Phase 5.1: cambiar `[x]` → `[ ]` y agregar `[ ] 5.3 Apply retroactivo del review fix`
- [x] 5.3 Modificar `openspec/changes/backend-b6-1-cocina-configuracion/verify-report.md`: remover bullet dotenv; agregar bullet reconociendo los 4 fixes retroactivos