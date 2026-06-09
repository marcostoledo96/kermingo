# Spec: Kitchen Operations — Cocina Admin Workflow

## Overview

Módulo de cocina para administración de pedidos operativos. Permite listar pedidos activos (excluye cancelado y entregado), ver detalle con cantidad de ítems, y avanzar el estado del pedido por la ruta `recibido → en_preparacion → listo → entregado`.

## Files

- `backend/src/api/schemas/cocina.schema.js` — 2 Zod schemas
- `backend/src/api/controllers/cocina.controller.js` — 3 handlers (`listarCocina`, `obtenerCocina`, `cambiarEstadoCocina`)
- `backend/src/api/models/pedido.model.js` — agrega `findKitchenPedidos()`; exporta `TRANSICIONES_VALIDAS` y `transicionEstadoValida` (FIX retroactivo)
- `backend/src/api/routes/cocina.routes.js` — Router con 3 endpoints
- `backend/src/api/routes/index.routes.js` — monta `/admin/cocina` con `cocinaRouter`
- `backend/tests/cocina.test.js` — tests con supertest

## Endpoints

| Método | Ruta | Auth | Handler | Schema |
|--------|------|------|---------|--------|
| GET | /api/admin/cocina/pedidos | admin | `listarCocina` | — |
| GET | /api/admin/cocina/pedidos/:id | admin | `obtenerCocina` | `idParamSchema` |
| PATCH | /api/admin/cocina/pedidos/:id/estado | admin + trusted origin | `cambiarEstadoCocina` | `idParamSchema` + `updateEstadoPedidoCocinaSchema` |

## Zod Schemas

### idParamSchema
- `id`: coerce int min 1

### updateEstadoPedidoCocinaSchema
- `estado_pedido`: enum `recibido` | `en_preparacion` | `listo` | `entregado` (strict)

## State Machine

```
recibido → en_preparacion → listo → entregado
```

Source of truth: `TRANSICIONES_VALIDAS` exportado desde `pedido.model.js`. No debe existir copia local en `cocina.controller.js` (FIX retroactivo: eliminar `TRANSICIONES_COCINA` duplicado).

### Reglas de transición

`transicionEstadoValida(actual, siguiente)`:
- Si `actual === siguiente` retorna `false` (FIX retroactivo: antes retornaba `true`, permitiendo transición nula).
- En otro caso, retorna `true` si `siguiente` está en `TRANSICIONES_VALIDAS[actual]`.
- Solo permite avanzar un paso en la cadena lineal; no hay saltos ni retrocesos.

## Query SQL: `findKitchenPedidos(pool)`

```sql
SELECT p.id, p.numero, p.nombre_cliente, p.mesa, p.estado_pedido,
       p.estado_pago, p.observaciones, p.created_at, p.total,
       COUNT(pd.id) AS cantidad_items
FROM pedido p
LEFT JOIN pedido_detalle pd ON pd.pedido_id = p.id
WHERE p.estado_pedido IN ('recibido', 'en_preparacion', 'listo')
GROUP BY p.id, p.numero, p.nombre_cliente, p.mesa, p.estado_pedido,
         p.estado_pago, p.observaciones, p.created_at, p.total
ORDER BY FIELD(p.estado_pedido, 'recibido', 'en_preparacion', 'listo'), p.created_at ASC
```

FIX retroactivo: `GROUP BY` lista todas las columnas seleccionadas para compatibilidad con `ONLY_FULL_GROUP_BY` (default MySQL 8).

## Handler Behavior: `cambiarEstadoCocina`

1. `findById(pool, id)` — si `null`, throw `NotFoundError('Pedido no encontrado')` (404).
2. `actual = pedido.estado_pedido`, `siguiente = req.body.estado_pedido`.
3. Validar con `transicionEstadoValida(actual, siguiente)`. Si inválida, throw `ValidationError('Transición de estado no válida para cocina')` (400).
4. `updateEstadoPedido(pool, id, siguiente)` — si retorna `-1`, throw `ValidationError('Transición de estado no válida para cocina')` (mismo mensaje, FIX retroactivo que unifica el mensaje duplicado).
5. Re-fetch con `findById`, responder 200 con `respuestaExitosa`.

## Testing Evidence

### Auth gating
1. GET /api/admin/cocina/pedidos sin cookie → 401
2. GET /api/admin/cocina/pedidos/:id sin cookie → 401
3. PATCH /api/admin/cocina/pedidos/:id/estado sin cookie → 401

### List endpoint
4. GET /api/admin/cocina/pedidos con admin → 200, retorna array
5. La lista NO incluye pedidos con `estado_pedido = 'cancelado'`
6. La lista NO incluye pedidos con `estado_pedido = 'entregado'`
7. Orden: primero `recibido`, luego `en_preparacion`, luego `listo`; dentro de cada grupo por `created_at` ascendente

### Detail endpoint
8. GET /api/admin/cocina/pedidos/:id con admin, id existente → 200, retorna pedido con `items`
9. GET /api/admin/cocina/pedidos/:id con admin, id inexistente → 404
10. GET /api/admin/cocina/pedidos/abc con admin, id no numérico → 400 (validación Zod)

### PATCH estado endpoint
11. PATCH /:id/estado `en_preparacion` sobre pedido en `recibido` con admin → 200
12. PATCH /:id/estado `listo` sobre pedido en `en_preparacion` con admin → 200
13. PATCH /:id/estado `entregado` sobre pedido en `listo` con admin → 200
14. PATCH /:id/estado `recibido` sobre pedido en `listo` con admin → 400 (salto inválido hacia atrás)
15. PATCH /:id/estado `recibido` sobre pedido en `recibido` con admin → 400 (FIX retroactivo: transición nula ahora es 400)
16. PATCH /:id/estado con estado fuera del enum → 400 (validación Zod)
17. PATCH /:id/estado con id inexistente → 404
18. PATCH /:id/estado con origen no confiable → 403 (`requireTrustedOrigin`)

### SQL / DB real
19. `findKitchenPedidos()` ejecuta sin error en MySQL 8 con `ONLY_FULL_GROUP_BY` activo (FIX retroactivo)
20. `findKitchenPedidos()` retorna `cantidad_items` correcto (LEFT JOIN con COUNT)

## Out of Scope

- No crear `cocina.model.js` separado.
- No rehacer estructura del proyecto.
- No tocar `main` directamente.
- No tocar PRs #2/#4/#5.

## Requirements Summary

| Requirement | Scenario Count | Cobertura |
|---|---|---|
| Auth gating (admin required) | 3 | 1, 2, 3 |
| Listado cocina excluye cancelado/entregado | 2 | 5, 6 |
| Listado cocina ordenado por estado y antigüedad | 1 | 7 |
| Detalle cocina retorna pedido con items | 1 | 8 |
| Detalle cocina 404 si no existe | 1 | 9 |
| PATCH transición válida avanza estado | 3 | 11, 12, 13 |
| PATCH transición inválida 400 | 1 | 14 |
| PATCH transición nula 400 (FIX retroactivo) | 1 | 15 |
| PATCH estado fuera de enum 400 (Zod) | 1 | 16 |
| PATCH id inexistente 404 | 1 | 17 |
| PATCH origen no confiable 403 | 1 | 18 |
| SQL compatible con ONLY_FULL_GROUP_BY (FIX retroactivo) | 1 | 19 |
| `findKitchenPedidos` retorna cantidad_items correcto | 1 | 20 |
| Estado centralizado en `TRANSICIONES_VALIDAS` (FIX retroactivo) | covered by 11-15 | derivable |
| Mensaje de error único en `cambiarEstadoCocina` (FIX retroactivo) | covered by 14-15 | derivable |
