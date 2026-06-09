# Proposal: Backend B6.2 caja review fixes

## Intent
Fix retroactivo de 5 bugs reales encontrados en el PR #3 (B6.2 — caja, pagos y filtro) sobre la rama `feature/backend-b6-2-caja`. No se toca `main`.

## Scope

### In Scope
- Fix acentos en mensaje de error de `cambiarPago`.
- Fix idempotencia de PATCH pago: `from === to` debe retornar 400, no 404.
- Fix cleanup de tests: restaurar stock de productos y combos antes de DELETE.
- Agregar `afterAll(pool.end())` en `caja.test.js`.
- Hacer deterministas los 3 tests del filtro `solo_pagos_pendientes` con fixtures propios.

### Out of Scope
- Seed de `configuracion_tienda` (diseño intencional).
- Refactor de estructura o nuevas features.
- Fixes en otros archivos de test (ej. `cocina.test.js`).

## Capabilities

### New Capabilities
None

### Modified Capabilities
None (cambios puramente de implementación y cobertura de tests; sin cambios en contratos de especificación).

## Approach
1. Editar `pedido.controller.js:145` para corregir tildes.
2. Editar `pedido.model.js:56` para que `from === to` en `validatePaymentTransition` retorne `false`.
3. Actualizar test unitario `'same state is always valid'` para esperar `false`.
4. Reescribir `limpiarPedidosDeTest` en `caja.test.js` para usar `cancelWithTransaction` antes de DELETE.
5. Agregar `afterAll(async () => await pool.end())` al final de `caja.test.js`.
6. En el describe de filtro `solo_pagos_pendientes`, agregar `beforeAll` con fixtures propios (`nombre_cliente` único) y `afterAll` de limpieza.

## Affected Areas

| Path | Impact | Description |
|------|--------|-------------|
| `backend/src/api/controllers/pedido.controller.js` | Modified | Línea 145: mensaje de error con tildes correctas. |
| `backend/src/api/models/pedido.model.js` | Modified | Línea 56: `from === to` retorna `false` en `validatePaymentTransition`. |
| `backend/tests/caja.test.js` | Modified | Cleanup con `cancelWithTransaction`, `afterAll(pool.end)`, fixtures deterministas para filtro unpaid. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Cambio en `validatePaymentTransition` rompe flujo inesperado | Low | Solo afecta PATCH `/:id/pago`; el mismo patrón ya se validó en cocina. Test unitario se actualiza. |
| `cancelWithTransaction` en cleanup falla por estado no cancelable | Low | Pedidos de caja se crean en `recibido`, que es cancelable. Se prueba localmente antes de commit. |
| Tests de filtro aún dependen de estado residual | Low | Fixtures propios con `nombre_cliente` único aíslan el test del resto de la DB. |

## Rollback Plan
`git revert` del commit de fixes o `git checkout --` de los 3 archivos modificados. Los cambios son triviales y no alteran schema ni contratos.

## Dependencies
- Rama `feature/backend-b6-2-caja` (HEAD `d4baf01`).
- Backend corriendo con DB de test accesible.

## Success Criteria

- [ ] `npm test -- caja.test.js` pasa 100%.
- [ ] Todos los tests existentes (~24) continúan pasando.
- [ ] Mensaje de error en `cambiarPago` tiene tildes correctas.
- [ ] PATCH a mismo estado de pago retorna 400 (no 404).
- [ ] Cleanup de tests no deja stock degradado entre runs.
- [ ] Filtro `solo_pagos_pendientes` usa fixtures propios y es determinista.
