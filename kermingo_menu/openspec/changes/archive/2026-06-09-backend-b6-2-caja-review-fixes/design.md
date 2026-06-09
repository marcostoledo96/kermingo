# Design: Backend B6.2 caja review fixes

## Technical Approach

Seis fixes retroactivos sobre la rama `feature/backend-b6-2-caja` (PR1 B6.2). Ningún cambio afecta contratos de API ni schema de DB. Los fixes son de implementación, tests y mensajes de error.

1. Corregir acentos en mensaje de error de `cambiarPago`.
2. Cambiar `validatePaymentTransition(from, to)` para que `from === to` retorne `false` (idempotencia → 400).
3. Reutilizar `cancelWithTransaction` en cleanup de tests para restaurar stock antes de DELETE.
4. Agregar `afterAll(pool.end())` a `caja.test.js`.
5. Crear fixtures propios con `nombre_cliente` único para los 3 tests del filtro `solo_pagos_pendientes`.
6. Agregar validación post-PATCH de stock en test de pago (invariante: PATCH /pago no modifica stock).

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Idempotencia de PATCH pago | `from === to` retorna `false` en `validatePaymentTransition` | A) Dejar `true` y manejar `affectedRows === 0` como caso especial en controller. B) Usar `CLIENT_FOUND_ROWS` para que mysql2 devuelva `affectedRows > 0` en no-op. | A requiere tocar controller + modelo. B cambia comportamiento global del pool. Retornar `false` es consistente con fix de cocina y semánticamente correcto: "mismo estado no es transición". |
| Cleanup de tests | `cancelWithTransaction(pool, id)` antes de DELETE | A) Queries UPDATE manuales de stock. B) Nuevo helper de cleanup. | Reutiliza flujo transaccional existente que maneja productos + combos. No duplica lógica de reposición. |
| Tests deterministas de filtro | Fixtures con `nombre_cliente` único | A) Reset de DB completo entre tests. B) ID hardcodeado. | Nombre único es simple, no requiere infra extra, y permite verificar la respuesta filtrada por nombre sin depender de estado global. |
| Validación de stock post-PATCH | SELECT a `producto.stock_actual` después del PATCH | A) No validar. B) Validar indirectamente por conteo de rows. | Es una invariante clave del dominio: caja nunca toca stock. Verificarla explícitamente cierra una brecha de cobertura señalada en review. |

## Data Flow

```
PATCH /api/admin/pedidos/:id/pago
      │
      ▼
  cambiarPago(controller)
      │
      ├──→ updateEstadoPago(pool, id, estado_pago)
      │       │
      │       ├──→ findById(pool, id) → 404 si no existe
      │       │
      │       ├──→ validatePaymentTransition(from, to)
      │       │       ├── from === to ? → false (idempotencia FIX)
      │       │       └── to ∈ PAGO_TRANSITIONS[from] ? → true/false
      │       │
      │       └──→ UPDATE pedido SET estado_pago = ? → retorna affectedRows
      │
      ├──→ result === 0  → 404 NotFoundError
      ├──→ result === -1 → 400 ValidationError('Transición... no válida')
      │
      └──→ findById(pool, id) → 200 respuestaExitosa
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `kermingo_menu/backend/src/api/models/pedido.model.js` | Modify | `validatePaymentTransition`: `from === to` retorna `false`. |
| `kermingo_menu/backend/src/api/controllers/pedido.controller.js` | Modify | Línea 145: mensaje `'Transición de estado de pago no válida'`. |
| `kermingo_menu/backend/tests/caja.test.js` | Modify | Cleanup con `cancelWithTransaction`; `afterAll(pool.end())`; fixtures únicos para filtro; test de stock post-PATCH. |

## Interfaces / Contracts

```js
// pedido.model.js
export function validatePaymentTransition(from, to) {
  if (from === to) return false;        // FIX: idempotencia → false
  return PAGO_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function updateEstadoPago(pool, id, nuevoEstado) {
  // ...findById → validatePaymentTransition → UPDATE...
  // retorna affectedRows (≥1) o -1 (transición inválida)
}
```

**Mensaje de error unificado** (consistente con cocina):
- `Transición de estado de pago no válida` (400, `ValidationError`)

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `validatePaymentTransition` incluyendo `from === to` | 10 assertions en describe existente; actualizar `'same state is always valid'` a `false`. |
| Auth boundary | Sin cookie, estado fuera de enum | 5 assertions existentes; sin cambio. |
| Integration (DB) | PATCH transiciones válidas e inválidas, idempotencia | Usar fixtures TEST-*. PATCH pendiente→pagado + SELECT post-PATCH a `producto.stock_actual` para validar invariante. |
| Integration (DB) | Filtro `solo_pagos_pendientes` | Crear 3 fixtures (`TEST-FILTER-PENDIENTE`, `TEST-FILTER-PAGADO`, `TEST-FILTER-CANCELADO`) en `beforeAll`; verificar que solo `PENDIENTE` aparece. |
| Integration (DB) | Cleanup restaura stock | Ejecutar test suite 2 veces consecutivas; verificar que segunda run no falla por stock degradado. |

## Migration / Rollout

No migration required. No se toca schema, seed ni contratos de API.

Rollback: `git checkout --` de los 3 archivos modificados.

## Open Questions

- [ ] ¿Se desea propagar `afterAll(pool.end())` a `cocina.test.js` en un fix posterior? (out of scope para este change, pero es patrón general.)
- [ ] ¿El entorno de CI tiene la tienda en estado `'abierta'` para que los tests de integración pasen? (Nota: el seed deja `'cerrada'` por diseño; los tests requieren setup manual o DB de test pre-configurada.)
