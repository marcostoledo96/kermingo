# Proposal: backend-b6.1-cocina-review-fixes

## Intent
Fix retroactivo del PR #1 (B6.1 cocina) ya mergeado sobre `feature/backend-b6-1-cocina`. Resuelve 4 comentarios de review + 1 bug latente de transición nula antes de que la rama se integre a `main`.

## Scope

### In Scope
- Fix `GROUP BY` en `findKitchenPedidos()` (agrupar por todas las columnas seleccionadas).
- Eliminar `TRANSICIONES_COCINA` y `transicionCocinaValida` duplicados en `cocina.controller.js`.
- Exportar `TRANSICIONES_VALIDAS` y `transicionEstadoValida` desde `pedido.model.js`.
- Unificar mensajes de `ValidationError` en `cambiarEstadoCocina`.
- Corregir bug latente: `transicionEstadoValida(actual, actual)` retorna `true`, debe retornar `false`.
- Agregar tests reales de cocina: list 200, detail 200/404, PATCH transición válida 200, inválida 400, mismo estado 400, pedido inexistente 404.
- Corregir `tasks.md` Phase 5.1 para reflejar estado real.
- Limpiar ítem desactualizado de `verify-report.md` (dotenv).

### Out of Scope
- No crear `cocina.model.js` separado.
- No rehacer estructura del proyecto.
- No tocar `main` (está en B5.2.1).
- No tocar PR #2/#4/#5.
- No agregar `cocina.routes.js` a `index.routes.js` (ya está en PR original).

## Capabilities

### New Capabilities
- `kitchen-operations`: cocina admin workflow — listado, detalle y transición de pedidos. No existe en `openspec/specs/`.

### Modified Capabilities
- None.

## Approach

Trabajar sobre `feature/backend-b6-1-cocina`. Ajustar modelo + controller + tests. Exportar helpers de transición. Unificar mensajes. Escribir tests con supertest+jest+DB seed.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/api/models/pedido.model.js` | Modified | Fix GROUP BY; exportar helpers |
| `backend/src/api/controllers/cocina.controller.js` | Modified | Eliminar duplicados; importar helpers; unificar errores |
| `backend/tests/cocina.test.js` | Modified | Tests reales con DB seed |
| `openspec/changes/backend-b6-1-cocina-configuracion/tasks.md` | Modified | Phase 5.1 |
| `openspec/changes/backend-b6-1-cocina-configuracion/verify-report.md` | Modified | Limpiar ítem desactualizado |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `ONLY_FULL_GROUP_BY` en MYSQL 8 | Med | Agrupar por todas las columnas seleccionadas |
| Transición nula (mismo estado) ahora 400 | Med | Es bug real; documentar en changelog |
| Seed de DB inconsistente | Low | Reutilizar seeds existentes del proyecto |

## Rollback Plan

Revertir commits individuales sobre `feature/backend-b6-1-cocina` vía `git revert` o reset a merge commit anterior.

## Dependencies

- Rama `feature/backend-b6-1-cocina` (HEAD `8c53380` + `bf040a0`).
- MySQL con `mysql2/promise`.

## Success Criteria

- [ ] `findKitchenPedidos()` agrupa por todas las columnas seleccionadas.
- [ ] `cocina.controller.js` importa `transicionEstadoValida` desde `pedido.model.js`.
- [ ] `ValidationError` en `cambiarEstadoCocina` con mensaje único.
- [ ] `transicionEstadoValida(actual, actual)` retorna `false`.
- [ ] Tests cubren list 200, detail 200/404, PATCH válida 200, inválida 400, mismo estado 400, pedido 404.
- [ ] `tasks.md` Phase 5.1 refleja estado real.
