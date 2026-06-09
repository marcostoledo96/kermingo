# Spec: Cashier Operations — Caja Pagos y Filtro

## Purpose

Módulo de caja admin: gestión de estados de pago con state machine forward-safe y filtro de pagos pendientes. PATCH `/api/admin/pedidos/:id/pago` con transiciones validadas. GET `/api/admin/pedidos` con filtro `solo_pagos_pendientes=true` que excluye `pagado` y `cancelado`. PATCH no modifica stock.

Este spec documenta los **fixes retroactivos** sobre la implementación original del PR #3 (B6.2 caja).

## Files

| Path | Impact | Description |
|------|--------|-------------|
| `backend/src/api/models/pedido.model.js` | Modified | Agrega `PAGO_TRANSITIONS`, `validatePaymentTransition`, `updateEstadoPago` con state machine. Filtra `solo_pagos_pendientes` en `findAllAdmin`. **FIX retroactivo**: `validatePaymentTransition` retorna `false` para `from === to` (antes retornaba `true`). |
| `backend/src/api/controllers/pedido.controller.js` | Modified | Handler `cambiarPago` con manejo de `-1` (transición inválida). **FIX retroactivo**: mensaje unificado con acentos correctos. |
| `backend/src/api/schemas/pedido.schema.js` | Modified | `updateEstadoPagoSchema` con 4 valores enum (`pendiente`, `comprobante_subido`, `pagado`, `rechazado`). `pedidoQuerySchema` con `solo_pagos_pendientes` validado como boolean string. |
| `backend/tests/caja.test.js` | New | Tests con fixtures propios, cleanup con `cancelWithTransaction`, `afterAll(pool.end())`. |

## Payment State Machine

```
pendiente → comprobante_subido | pagado
comprobante_subido → pagado | rechazado
rechazado → pendiente
pagado → (terminal)
```

`PAGO_TRANSITIONS` exportado desde `pedido.model.js`:

```js
export const PAGO_TRANSITIONS = {
  pendiente: ['comprobante_subido', 'pagado'],
  comprobante_subido: ['pagado', 'rechazado'],
  rechazado: ['pendiente'],
  pagado: [],
};
```

`validatePaymentTransition(from, to)`:
- Si `from === to` → retorna `false`. **FIX retroactivo**: antes retornaba `true`, causando que `updateEstadoPago` ejecutara un UPDATE no-op con `affectedRows = 0`, interpretado como 404 por el controller.
- En otro caso, retorna `true` si `to` está en `PAGO_TRANSITIONS[from]`.

## Handler: `cambiarPago`

1. `updateEstadoPago(pool, id, estado_pago)` con validación interna de transición.
2. Si `result === 0` → 404 `NotFoundError('Pedido no encontrado')`.
3. Si `result === -1` → 400 `ValidationError('Transición de estado de pago no válida')`. **FIX retroactivo**: acentos correctos en mensaje (antes: `'Transicion de estado de pago no valida'`).
4. Re-fetch con `findById`, responder 200 con `respuestaExitosa`.

**Idempotencia (FIX retroactivo)**: cuando admin envía mismo estado actual (ej. `pagado` sobre pedido ya `pagado`), `validatePaymentTransition` retorna `false`, `updateEstadoPago` retorna `-1`, controller responde 400. Semánticamente correcto: "mismo estado no es una transición válida".

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
| 9 ⭐ | `pendiente → pendiente` | `false` (FIX retroactivo; antes `true`) |

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
| Payment state machine idempotente=false ⭐ FIX | 1 | 9 |
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
