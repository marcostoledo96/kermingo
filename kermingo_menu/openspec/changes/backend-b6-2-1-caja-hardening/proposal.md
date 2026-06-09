# Proposal: B6.2.1 — Hardening de pagos, edición y tests de caja

## Intent

Corregir fallas de auditoría B6.2 antes de avanzar a B6.3. Los problemas críticos son:

- `updateEstadoPago` no es atómico: lee estado, valida en memoria, actualiza sin condición, permitiendo que `pagado` (terminal) sea sobrescrito por carrera.
- `validatePaymentTransition` ignora `metodo_pago`, permitiendo que un pedido en efectivo pase a `comprobante_subido` o `rechazado`.
- `updateEstadoPago` permite modificar el pago de pedidos `cancelados`.

Errores importantes incluyen coherencia `metodo_pago`/`estado_pago` en edición, edición parcial bloqueada, errores de edición mapeados a 500, e higiene de tests.

## Scope

### In Scope
1. **Pago atómico:** `updateEstadoPago` transaccional con `SELECT ... FOR UPDATE`.
2. **Transiciones por método de pago:** `validatePaymentTransition(from, to, metodoPago)`.
3. **Bloqueo en cancelados:** rechazar cambios de pago si `estado_pedido = cancelado`.
4. **Coherencia en edición:** ajustar `estado_pago` al cambiar `metodo_pago` para que quede válido.
5. **Edición parcial:** `items` opcional en `editPedidoSchema`; reconciliar stock solo si `items` está presente.
6. **Errores de edición mapeados:** `no encontrado/inactivo` → 400, `no tiene componentes` → 400.
7. **Tests:** prefijo único por corrida, cleanup sin reponer cancelados, `pool.end()` en `afterAll`, tests de transiciones y edición parcial.
8. **Seguridad:** `requireTrustedOrigin` en `PUT /api/admin/configuracion-tienda`.

### Out of Scope
- B6.3 (comprobantes, Drive, frontend).
- Creación de errores tipados de dominio (SUG-5).
- Consolidación de items duplicados en `pedido_detalle` (SUG-4).

## Capabilities

### New Capabilities
- `payment-state-machine-method-aware`: validación de transiciones de pago según `metodo_pago`.
- `atomic-payment-update`: cambio de estado de pago bajo transacción con `FOR UPDATE`.
- `partial-order-edit`: edición de pedido de caja sin requerir `items`.

### Modified Capabilities
- `order-edit-caja`: extender requisitos para validar coherencia `metodo_pago`/`estado_pago` y soportar edición parcial.

## Approach

- **Modelo:** envolver `updateEstadoPago` en `getConnection() → beginTransaction → SELECT ... FOR UPDATE → validación → UPDATE → commit`. Agregar `metodo_pago` como tercer parámetro a `validatePaymentTransition` con reglas por método.
- **Edición:** en `editWithTransaction`, si `data.items` no está definido, omitir reconciliación de stock. Si cambia `metodo_pago`, resetear `estado_pago` a estado válido para el nuevo método.
- **Schema:** hacer `items` opcional en `editPedidoSchema` y agregar `.refine(...)` exigiendo al menos un campo.
- **Controller:** en `editar`, mapear strings adicionales a `ValidationError`; en `cambiarPago`, mapear `-2` a "No se puede modificar el pago de un pedido cancelado".
- **Tests:** generar `RUN_ID` único, leer `estado_pedido` en cleanup, agregar `afterAll(pool.end)`, agregar tests de transiciones y edición parcial.
- **Configuración:** agregar `requireTrustedOrigin` al `adminRouter.put` de configuración.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/api/models/pedido.model.js` | Modified | `updateEstadoPago` atómico; `validatePaymentTransition` con `metodo_pago`; `editWithTransaction` parcial y coherente |
| `backend/src/api/controllers/pedido.controller.js` | Modified | Mapear nuevos códigos y errores de edición |
| `backend/src/api/schemas/pedido.schema.js` | Modified | `items` opcional en `editPedidoSchema` |
| `backend/src/api/routes/configuracion.routes.js` | Modified | Agregar `requireTrustedOrigin` |
| `backend/tests/caja.test.js` | Modified | Higiene, nuevos casos de prueba |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Tests existentes fallan tras cambiar firma de `validatePaymentTransition` | Med | Actualizar todos los callers (modelo, controller, tests) en el mismo PR |
| `pool.end()` en `caja.test.js` afecta otros test files si comparten pool | Low | Solo agregar en `caja.test.js` `afterAll`; si falla otro suite, mover a global setup en PR posterior |
| Edición parcial rompe frontend que siempre envía `items` | Low | Backend sigue aceptando `items` cuando viene; contrato 100% backward-compatible |

## Rollback Plan

Revertir el PR de `feature/backend-b6-2-1-caja-hardening`. Ninguna migración de base de datos está involucrada; el rollback restaura exactamente el estado de B6.2.

## Dependencies

- Ninguna externa. Requiere que B6.2 (PRs #3 y #4) esté mergeado en la rama base.

## Success Criteria

- [ ] `npm test` pasa (todos los existentes + nuevos tests de transiciones, edición parcial, cancelado)
- [ ] `npm run dev` + `curl http://localhost:3001/api/health` OK
- [ ] Cobertura de casos: efectivo `pendiente→comprobante_subido` falla 400, transferencia `rechazado→comprobante_subido` OK, cancelado rechaza pago 400, edición metadata-only sin `items` OK, cambio de método de pago deja estado coherente
- [ ] Audit posterior ChatGPT no detecta regresiones críticas

## Single-PR Decision

**Un único PR**, estimado ~206 líneas cambiadas (well under 400-line budget). Todos los fixes son tightly coupled alrededor de la consistencia del estado de pago; dividirlos crearía riesgo de merge en `pedido.model.js` y dejaría la rama en estado parcialmente endurecido.