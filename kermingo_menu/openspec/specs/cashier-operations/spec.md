# Spec: Cashier Operations — Caja Pagos y Filtro

## Purpose

Módulo de caja admin: gestión de estados de pago con state machine forward-safe y filtro de pagos pendientes. PATCH `/api/admin/pedidos/:id/pago` con transiciones validadas. GET `/api/admin/pedidos` con filtro `solo_pagos_pendientes=true` que excluye `pagado` y `cancelado`. PATCH no modifica stock.

Este spec documenta la implementación del PR #3 (B6.2 caja) con los cambios posteriores al merge.

## Files

| Path | Impact | Description |
|------|--------|-------------|
| `backend/src/api/models/pedido.model.js` | Modified | Agrega `PAGO_TRANSITIONS`, `transitionsByMethod`, `validatePaymentTransition`, `updateEstadoPago` con state machine method-aware. Filtra `solo_pagos_pendientes` en `findAllAdmin`. `editWithTransaction` para edición transaccional de caja. `validatePaymentTransition` retorna `true` para `from === to`; el rechazo de no-cambio está en `updateEstadoPago`. |
| `backend/src/api/controllers/pedido.controller.js` | Modified | Handler `cambiarPago` con manejo de `-1` y `-2` (transición inválida y cancelado). Handler `editar` para PUT. Nota: el mensaje de error en `cambiarPago` sigue sin acentos: `'Transicion de estado de pago no valida'`. |
| `backend/src/api/schemas/pedido.schema.js` | Modified | `updateEstadoPagoSchema` con 4 valores enum (`pendiente`, `comprobante_subido`, `pagado`, `rechazado`). `pedidoQuerySchema` con `solo_pagos_pendientes` validado como boolean string. `editPedidoSchema` para edición de caja. |
| `backend/tests/caja.test.js` | New | Tests con fixtures propios, cleanup con `cancelWithTransaction`, `afterAll(pool.end())`. |

## Payment State Machine

La máquina de estados de pago es **method-aware**: transiciones distintas según `metodo_pago`.

```
efectivo:
  pendiente → pagado          (directo, pago en mano)
  pagado → (terminal)

transferencia:
  pendiente → pagado | comprobante_subido
  comprobante_subido → pagado | rechazado
  rechazado → pendiente | comprobante_subido
  pagado → (terminal)
```

### `transitionsByMethod` (method-aware, la state machine real)

```js
export const transitionsByMethod = {
  efectivo: {
    pendiente: ['pagado'],
    pagado: [], // terminal
  },
  transferencia: {
    pendiente: ['pagado', 'comprobante_subido'],
    comprobante_subido: ['pagado', 'rechazado'],
    rechazado: ['pendiente', 'comprobante_subido'],
    pagado: [], // terminal
  },
};
```

### `PAGO_TRANSITIONS` (backward-compatible, merge genérico)

Usado por tests para key enumeration. Merge de todos los métodos:

```js
export const PAGO_TRANSITIONS = {
  pendiente: ['pagado', 'comprobante_subido'],
  comprobante_subido: ['pagado', 'rechazado'],
  rechazado: ['pendiente', 'comprobante_subido'],
  pagado: [],
};
```

### `validatePaymentTransition(from, to, metodoPago?)`

- Si `from === to` → retorna `true`. La función de validación considera mismo-estado como válido (idempotente). **El rechazo de no-cambio ocurre en `updateEstadoPago`** (línea 368-371 de `pedido.model.js`), que retorna `-1`.
- Si `metodoPago` se provee y existe en `transitionsByMethod`, valida contra la state machine de ese método.
- Si no se provee `metodoPago`, valida contra `PAGO_TRANSITIONS` (merge genérico, backward-compatible).

### `updateEstadoPago` (en `pedido.model.js`)

- Retorna `0` → pedido no encontrado (404).
- Retorna `-1` → transición inválida o mismo estado (400). Rechaza `from === to` explícitamente (líneas 368-371).
- Retorna `-2` → pedido cancelado (400, distinto mensaje).
- Retorna `affectedRows` en éxito.

## Handler: `cambiarPago`

1. `updateEstadoPago(pool, id, estado_pago)` con validación interna de transición (method-aware).
2. Si `result === 0` → 404 `NotFoundError('Pedido no encontrado')`.
3. Si `result === -1` → 400 `ValidationError('Transicion de estado de pago no valida')`. Nota: el mensaje no tiene acentos.
4. Si `result === -2` → 400 `ValidationError('No se puede modificar el pago de un pedido cancelado')`.
5. Re-fetch con `findById`, responder 200 con `respuestaExitosa`.

**Idempotencia:** cuando admin envía mismo estado actual (ej. `pagado` sobre pedido ya `pagado`), `validatePaymentTransition` retorna `true` pero `updateEstadoPago` rechaza con `-1` (explicítamente bloqueado en líneas 368-371), controller responde 400. Semánticamente correcto: "mismo estado no es una transición permitida en el handler".

## Filter: `solo_pagos_pendientes=true`

Query en `findAllAdmin` agrega cuando `solo_pagos_pendientes === true`:
- `estado_pago IN ('pendiente', 'rechazado')`
- `estado_pedido != 'cancelado'`

Override del filtro `estado_pago` individual si está presente (el filtro de pagos pendientes tiene prioridad).

## Testing Evidence

### Payment state machine (unit)
| # | Scenario | Expected |
|---|----------|----------|
| 1 | `pendiente → pagado` | `true` |
| 2 | `pendiente → comprobante_subido` | `true` |
| 3 | `comprobante_subido → pagado` | `true` |
| 4 | `comprobante_subido → rechazado` | `true` |
| 5 | `rechazado → pendiente` | `true` |
| 6 | `pendiente → rechazado` | `false` (salto no permitido) |
| 7 | `pagado → pendiente` | `false` (terminal) |
| 8 | `pagado → rechazado` | `false` (terminal) |
| 9 ⭐ | `pendiente → pendiente` | Controller returns 400 (rejected by `updateEstadoPago`, not `validatePaymentTransition`) |

### Auth boundary (sin DB)
| # | Scenario | Expected |
|---|----------|----------|
| 10 | PATCH `/:id/pago` sin cookie | 401 |
| 11 | PATCH `/:id/pago` con estado fuera de enum | 400 (Zod) |
| 12 | PATCH `/:id/pago` con id inexistente | 404 |
| 13 | GET `/admin/pedidos` sin cookie | 401 |
| 14 | GET `/admin/pedidos` con `solo_pagos_pendientes=invalid` sin cookie | 401 (auth antes de Zod) |

### Integration (con DB real, requiere `configuracion_tienda='abierta'`)
| # | Scenario | Expected |
|---|----------|----------|
| 15 | PATCH `pendiente → pagado` (efectivo) | 200, `estado_pago='pagado'`, `estado_pedido='recibido'`, **stock no cambia** ⭐ FIX retroactivo (nueva cobertura) |
| 16 | PATCH `pendiente → pagado` (transferencia, sin comprobante) | 200 |
| 17 | PATCH `pagado → pendiente` | 400 (backward forbidden) |
| 18 | PATCH `pagado → rechazado` | 400 (terminal) |
| 19 ⭐ | PATCH `pagado → pagado` (idempotente) | 400 (FIX retroactivo) |

### Filter (con DB real, fixtures propios)
| # | Scenario | Expected |
|---|----------|----------|
| 20 | `solo_pagos_pendientes=true` excluye `pagado` | Fixture `TEST-FILTER-PAGADO` (pagado) NO aparece |
| 21 | `solo_pagos_pendientes=true` excluye `cancelado` | Fixture `TEST-FILTER-CANCELADO` (cancelado) NO aparece |
| 22 | `solo_pagos_pendientes=true` solo retorna `pendiente` o `rechazado` | Fixture `TEST-FILTER-PENDIENTE` aparece, `TEST-FILTER-PAGADO` no |
| 23 | Filtros deterministas | `nombre_cliente` único por fixture, sin dependencia de estado global |

### Cleanup (con DB real)
| # | Scenario | Expected |
|---|----------|----------|
| 24 ⭐ | `limpiarPedidosDeTest` restaura stock | Usa `cancelWithTransaction` antes de DELETE (FIX retroactivo) |

## Requirements Summary

| Requirement | Scenario Count | Cobertura |
|---|---|---|
| Payment state machine forward-safe | 5 | 1, 2, 3, 4, 5 |
| Payment state machine terminal | 2 | 7, 8 |
| Payment state machine sin saltos | 1 | 6 |
| Payment state machine idempotente=400 via updateEstadoPago ⭐ | 1 | 9 |
| Auth gating | 2 | 10, 13 |
| Validación Zod en PATCH | 1 | 11 |
| PATCH id inexistente 404 | 1 | 12 |
| PATCH transición válida persiste 200 | 2 | 15, 16 |
| PATCH stock no cambia ⭐ FIX (nueva cobertura) | derivable | 15 |
| PATCH backward forbidden 400 | 1 | 17 |
| PATCH terminal violation 400 | 1 | 18 |
| PATCH idempotente 400 ⭐ FIX | 1 | 19 |
| Filter excluye pagado | 1 | 20 |
| Filter excluye cancelado | 1 | 21 |
| Filter solo pendiente/rechazado | 1 | 22 |
| Filter determinista con fixtures propios | 1 | 23 |
| Cleanup restaura stock ⭐ FIX | 1 | 24 |

## Out of Scope

- No crear DB de test automatizada.
- No tocar el seed de `configuracion_tienda`.
- No tocar `main`.
- No tocar otros PRs ni `cocina.test.js`.
