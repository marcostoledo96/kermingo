# Exploración: B6.1 cocina review fixes

## Estado verificado por archivo

### `backend/src/api/models/pedido.model.js` (actual en main)
- **Comentario Copilot ~190-197 (`findKitchenPedidos` + GROUP BY)**: ❌ **DESACTUALIZADO** — La función `findKitchenPedidos()` **no existe** en `main`. El archivo actual solo define `findByToken`, `findById`, `findAllAdmin`, `updateEstadoPedido`, `updateEstadoPago` y `cancelWithTransaction`. No hay GROUP BY que analizar. Líneas actuales: 1–~285.
- **Comentario Copilot `TRANSICIONES_VALIDAS`**: ⚠️ **PARCIAL** — Sí existe `TRANSICIONES_VALIDAS` (líneas ~30-33 del archivo actual), pero define el flujo completo `recibido → en_preparacion → listo → entregado` y se usa tanto en `updateEstadoPedido` como en `cancelWithTransaction`. Esto es correcto y no duplicado.

### `backend/src/api/controllers/cocina.controller.js` (actual en main)
- **Este archivo NO EXISTE** en `main`.
- **Comentario Copilot ~40-49 (`TRANSICIONES_COCINA` duplicado)**: ❌ **DESACTUALIZADO** — No hay archivo cocina.controller.js en `main`.
- **Comentario Copilot línea ~72-74 (mensaje duplicado)**: ❌ **DESACTUALIZADO** — No hay archivo cocina.controller.js en `main`.
- **Comentario Copilot sobre "...para cocina"**: ❌ **DESACTUALIZADO**.

### `backend/tests/cocina.test.js` (actual en main)
- **Este archivo NO EXISTE** en `main`.
- **Comentario Copilot sobre dotenv path**: ❌ **DESACTUALIZADO** — No hay archivo de test de cocina.
- **Comentario Copilot sobre coverage 401**: ❌ **DESACTUALIZADO** — El único test existente en `main` es `backend/tests/health.test.js` (2 assertions, no cocina).

### `openspec/changes/backend-b6-1-cocina-configuracion/tasks.md`
- **Este directorio NO EXISTE** en `main`.
- **Comentario Copilot Phase 5.1 `[x]`**: ❌ **DESACTUALIZADO** — El path no existe en HEAD.

### `openspec/changes/backend-b6-1-cocina-configuracion/verify-report.md`
- **Este directorio NO EXISTE** en `main`.
- **Comentario Copilot sobre verify-report.md**: ❌ **DESACTUALIZADO**.

---

## Hallazgo crítico: PR #1 (B6.1 cocina) NO está mergeado en `main`

### Evidencia
- **HEAD de `main` local**: `bfe574c` — `feat(backend): B5.2 + B5.2.1 — alineación schema/seed/promo/stock + remediación post-subagente`
- **HEAD de `origin/main`**: `bfe574c` — idéntico al local.
- **Commit del PR#1 cocina**: `8c53380` — `feat(backend): B6.1 PR1 — cocina admin workflow`
- **Merge commit del PR#1**: `bf040a0` — `Merge pull request #1...`
- **`git branch -a --contains bf040a0`**: solo `origin/feature/backend-b6` (y `origin/feature/backend-b6-1-cocina` para `8c53380`).
- **Lista de archivos en `main` que Copilot mencionó**: Ninguno existe.

### Consecuencia
El merge del PR #1 parece haber ocurrido sobre una rama feature (`feature/backend-b6-1-cocina`) que **no se integró a `main`**. El commit `bf040a0` existe en el repo pero no aparece en el histórico first-parent de `main`. Esto puede deberse a que:
1. El PR se mergeó a una rama intermedia (`feature/backend-b6`) pero esa rama no se mergeó a `main`.
2. El merge fue `--no-ff` en una rama que luego no se integró.
3. `main` está en estado B5.2.1 y nunca recibió B6.

---

## Comentarios válidos para actuar

Ninguno de los comentarios de Copilot sobre B6.1 cocina son aplicables a `main` hoy porque **el código que criticaron no existe en `main`**.

| # | Comentario de Copilot | Estado en main | Razón |
|---|----------------------|----------------|-------|
| 1 | `findKitchenPedidos()` GROUP BY sin ONLY_FULL_GROUP_BY | DESACTUALIZADO | Función no existe en `main` |
| 2 | `TRANSICIONES_COCINA` duplica `TRANSICIONES_VALIDAS` | DESACTUALIZADO | Controller no existe en `main` |
| 3 | Mensaje duplicado "Transición de estado no válida...para cocina" | DESACTUALIZADO | Controller no existe en `main` |
| 4 | `tasks.md` Phase 5.1 `[x]` con código duplicado | DESACTUALIZADO | Archivo no existe en `main` |
| 5 | dotenv path redundante en `cocina.test.js` | DESACTUALIZADO | Archivo no existe en `main` |
| 6 | Coverage de cocina.test.js solo 401 | DESACTUALIZADO | Archivo no existe en `main` |

---

## Comentarios desactualizados

**Todos los 6 comentarios son desactualizados** porque el PR #1 (B6.1 cocina) **no está mergeado en `main`**. El código que Copilot revisó solo existe en:
- `feature/backend-b6-1-cocina` (commit `8c53380`)
- `origin/feature/backend-b6` (contiene merge commit `bf040a0`)
- Posiblemente en un subdirectorio de commit histórico (`kermingo_menu/`)

---

## Hallazgos extra

1. **Transiciones de estado centralizadas**: En `main`, `pedido.model.js` define `TRANSICIONES_VALIDAS` como única fuente de verdad. `pedido.controller.js` usa `updateEstadoPedido()` directamente sin duplicar reglas.

2. **MySQL modos inspeccionados**: No se encontró ninguna configuración de `ONLY_FULL_GROUP_BY` en `backend/src/config/*` ni en pool config. El modo por defecto de MySQL 8+ sí lo incluye, pero actualmente no hay queries con GROUP BY incompleto en `main` que puedan explotarlo.

3. **Tests actuales extremadamente escasos**: Solo `health.test.js` (1 test suite, 1 test). No hay tests de pedido, cocina, auth, ni producto en `main`. Esto es un riesgo mayor que el GROUP BY de cocina.

4. **`producto.model.js` GROUP BY**: Sí agrupa por **todas** las columnas seleccionadas (`p.id, p.nombre, p.descripcion, p.precio, p.tipo, p.stock_limitado, p.stock_actual, p.stock_minimo_alerta, p.activo`). Esto es correcto y compatible con ONLY_FULL_GROUP_BY. (Líneas ~30-33 del modelo).

5. **Pedido listado en admin (`findAllAdmin`)**: Usa `SELECT p.*` con paginación, no GROUP BY. No hay riesgo de ONLY_FULL_GROUP_BY.

---

## Cobertura de tests actual

- **`backend/tests/health.test.js`**: 1 suite, 1 test — cobertura de endpoint `/api/health`.
- **`backend/tests/cocina.test.js`**: **No existe** en `main`.
- **Tests de pedido**: No existen.
- **Tests de auth**: No existen.
- **Tests de producto**: No existen.

El proyecto tiene **coverage de test de aproximadamente ~5%**: solo valida que el servidor responde un health check 200.

---

## Áreas afectadas

Si se decide integrar B6.1 a `main`, los archivos que **deberían existir** (según PR #1) son:
- `backend/src/api/controllers/cocina.controller.js` — si tiene los problemas que Copilot reportó, requieren fix antes de mergear.
- `backend/src/api/models/pedido.model.js` — requeriría `findKitchenPedidos()` con GROUP BY bien escrita.
- `backend/src/api/routes/cocina.routes.js` — montaje de endpoints.
- `backend/src/api/schemas/cocina.schema.js` — schemas Zod.
- `backend/src/api/routes/index.routes.js` — montaje del router.
- `backend/tests/cocina.test.js` — tests mínimos (solo 401 hoy).
- `openspec/*` — artifacts del cambio.

---

## Recomendación de approach

### Opciones para resolver:

| Opción | Descripción | Pros | Cons |
|--------|-------------|------|------|
| **A** | Mergear el PR #1 (feature/backend-b6-1-cocina) a `main` tal cual | Cocina disponible rápido | Trae los bugs que Copilot encontró (GROUP BY, duplicación de transiciones) |
| **B** | Cherry-pick/fix primero, luego mergear a `main` | Evita bugs en main | Necesita un PR de fix antes de merge |
| **C** | Dejar `main` como está (sin cocina) y re-trabajar B6.1 desde cero | Limpio, evita deuda | Re-trabajo, retraso funcional |

### Recomendación técnica:

**Opción B** (cherry-pick con fixes previos) antes de mergear a `main`:
1. Asegurar `MySQL ONLY_FULL_GROUP_BY` con `findKitchenPedidos()`: agrupar por **todas** las columnas seleccionadas, no solo `p.id`.
2. Eliminar `TRANSICIONES_COCINA` duplicado en `cocina.controller.js`; importar `transicionEstadoValida` desde `pedido.model.js` (requiere exportarlo).
3. Revisar mensajes duplicados en `cambiarEstadoCocina` — unificar a un solo `ValidationError`.
4. Agregar tests reales (listado, detail, transición válida/inválida) a `cocina.test.js` — no solo 401.
5. Limpiar `openspec` actual si B6.1 se va a re-hacer desde `main`.

---

## Listo para propuesta

**No** — Se requiere decisión del orquestador antes de avanzar:

1. **¿Se quiere mergear B6.1 cocina a `main`?** Si sí, hay que decidir si cherry-pick/fix primero o mergear tal cual y fix después.
2. **Actualmente `main` está en B5.2.1 y NO tiene cocina**. Todos los comentarios de Copilot sobre B6.1 son sobre código inexistente en `main`.
3. Los comentarios de Copilot **fueron reales sobre el PR#1**, pero **no aplican al estado actual** (`main`) porque ese PR nunca llegó a `main`.
4. **Riesgo de prioridad**: la falta de tests generales (solo health) es más urgente que el GROUP BY de cocina.

---

*Exploración realizada sobre `main` (HEAD bfe574c) y comparada contra PR#1 (commit bf040a0 / 8c53380).*
