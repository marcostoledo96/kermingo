# Proposal: backend-b6-1-configuracion-review-fixes

## Intent

Fix retroactivos del PR #2 (configuración tienda) sobre la rama `feature/backend-b6-1-cocina-review-fixes`. Los comentarios de review identifican bugs de seguridad (CSRF), lógica (`affectedRows`), schema (nullables) y tests engañosos.

## Scope

### In Scope
- Agregar `requireTrustedOrigin` al PUT admin de `configuracion.routes.js` (P1).
- Corregir `actualizarAdmin` para no lanzar 404 cuando `affectedRows === 0` (HIGH).
- Permitir `null` en `mensaje_publico` y `cena_habilitada_desde` en schema Zod (MEDIUM).
- Renombrar test engañoso "estado inválido -> 400" a "sin cookie devuelve 401", y corregir comentario confuso (MEDIUM/LOW).
- Tests reales de configuración con mocks (patrón cocina del change anterior).
- Corregir `tasks.md` del change original si está desactualizado.

### Out of Scope
- No tocar `main`.
- No tocar PRs #1 (cocina), #4/#5 (caja).
- No rehacer estructura.
- No agregar DB de test.

## Capabilities

### New Capabilities
None — cambio puramente de fix y robustecimiento, sin comportamiento nuevo.

### Modified Capabilities
- `store-configuration`: cambian requisitos de seguridad (`requireTrustedOrigin`), validación (campos nullable permiten `null`), y comportamiento del controlador (no considerar UPDATE no-op como 404).

## Approach

- Insertar `requireTrustedOrigin` como primer middleware tras `requireAdmin` en el `adminRouter.put('/')` de `configuracion.routes.js`, siguiendo patrón de `cocina.routes.js`, `pedido.routes.js` y `producto.routes.js`.
- En `configuracion.controller.js`, remover el guard `affected === 0 → 404`. Después de `updateMinimal`, ejecutar `findAdmin`; si devuelve `null` lanzar 404, si no devolver 200. Esto cubre el caso real (seed borrado) sin false positive en no-op.
- En `configuracion.schema.js`, cambiar `.optional()` a `.nullable().optional()` (o `.nullable()`) en `mensaje_publico` y `cena_habilitada_desde` para que Zod acepte explícitamente `null` como "limpiar".
- En `configuracion.test.js`, renombrar el test misleading y corregir comentario sobre "404 si no hay DB". Agregar tests autenticados con `jest.unstable_mockModule` de cookie (patrón del change anterior) para cubrir: PUT confiable → 200, PUT mismos datos → 200, PUT con `null` → 200.
- Actualizar `openspec/changes/backend-b6-1-cocina-configuracion/tasks.md` marcando items completados o desactualizados para reflejar estado real.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/api/routes/configuracion.routes.js` | Modified | Insertar `requireTrustedOrigin` en PUT admin. |
| `backend/src/api/controllers/configuracion.controller.js` | Modified | Remover `affected === 0` falso-positivo; buscar post-update. |
| `backend/src/api/schemas/configuracion.schema.js` | Modified | Permitir `null` en campos DB-nullable. |
| `backend/tests/configuracion.test.js` | Modified | Fix nombre/assert engañoso; agregar tests mocked. |
| `openspec/changes/backend-b6-1-cocina-configuracion/tasks.md` | Modified | Corregir estado de items desactualizados. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `affected === 0` removal oculta error real de DB | Low | `findAdmin` post-update sigue detectando seed faltante; cualquier error de pool propaga como 500. |
| `nullable()` en Zod causa modelo reciba `null` cuando campo ausente | Low | Modelo checkea `!== undefined`; `null` fluye a SQL `NULL` correctamente (verificado en explotación). |

## Rollback Plan

Revertir commit del fix sobre `feature/backend-b6-1-cocina-review-fixes`. El código previo sigue funcional (aunque con bugs conocidos). No toca `main`.

## Dependencies

- Rama `feature/backend-b6-1-cocina-review-fixes` (base ya contiene cocina-fix + configuración).
- Patrón de mocks `jest.unstable_mockModule` validado en `backend-b6-1-cocina-review-fixes`.

## Success Criteria

- [ ] `PUT /api/admin/configuracion-tienda` con origin hostil → 403/401 por `requireTrustedOrigin`.
- [ ] `PUT` admin con mismos datos devuelve 200 (no 404).
- [ ] `PUT` con `{"mensaje_publico": null}` o `{"cena_habilitada_desde": null}` → 200.
- [ ] Suite de tests pasa (`npm test` en backend).
- [ ] `tasks.md` original actualizado y consistente.
