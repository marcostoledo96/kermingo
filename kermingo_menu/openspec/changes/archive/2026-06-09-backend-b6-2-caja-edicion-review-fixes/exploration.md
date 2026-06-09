## Exploration: backend-b6-2-caja-edicion-review-fixes

### Current State
PR #4 (B6.2 — edición transaccional de pedidos) mergeado en `feature/backend-b6-2-caja-edicion` (HEAD `819dcb8`).
Agrega PUT /api/admin/pedidos/:id con reconciliación de stock transaccional vía `editWithTransaction` en `pedido.model.js` y `editar` en `pedido.controller.js`.

### Affected Areas
- `backend/tests/caja.test.js` — tests de integración para caja, incluye cleanup
- `backend/src/api/models/pedido.model.js` — `editWithTransaction`
- `backend/src/api/controllers/pedido.controller.js` — `editar`

---

## Triage de Comentarios de Review

### 1. Copilot High — Doble reposición en `limpiarPedidosDeTest()`
**REAL** ✅

`limpiarPedidosDeTest` (líneas ~42-85) lee TODOS los pedidos `nombre_cliente LIKE 'TEST-B6-2%'` y repone stock manualmente antes de hacer DELETE físico. Esto incluye pedidos que ya fueron cancelados (por `cancelWithTransaction`), que ya repusieron stock en su momento. Al deletear un pedido cancelado, `limpiarPedidosDeTest` vuelve a sumar el stock, **doble repón**.

Código confirmado:
```js
async function limpiarPedidosDeTest() {
  // ... selecciona TODOS los TEST-B6-2%
  // ... restaura stock (sin filtrar estado_pedido)
  // ... DELETE FROM pedido_detalle y pedido
}
```

### 2. Copilot Medium — Falta `afterAll(pool.end())`
**REAL** ✅

El archivo `caja.test.js` tiene `afterAll` en los describe individuales (llaman a `limpiarPedidosDeTest`) pero **NO tiene un `afterAll` global** que cierre `pool.end()`. Esto deja conexiones abiertas al finalizar el test suite.

Archivos verificados (`caja.test.js`, `health.test.js`): ninguno cierra el pool globalmente.

### 3. ChatGPT P2 — Doble stock (mismo que #1)
**REAL** ✅

Confirmado. Issue idéntico a #1. `limpiarPedidosDeTest` no filtra `estado_pedido`; al borrar un pedido ya cancelado, repone stock que `cancelWithTransaction` ya repuso.

### 4. ChatGPT P2 — Error `"Producto X no encontrado o inactivo"` no mapeado a 400
**REAL** ✅

`editWithTransaction` en `pedido.model.js` (línea aprox ~475-477):
```js
if (!producto) throw new Error(`Producto ${item.producto_id} no encontrado o inactivo`);
```

El controller `editar` (`pedido.controller.js`) solo atrapa `err.message?.includes('Stock insuficiente')`, dejando que el error `"no encontrado o inactivo"` vaya al `next(err)` default → **HTTP 500**.

Código confirmado:
```js
try {
  const result = await editWithTransaction(pool, req.params.id, req.body);
  // ...
} catch (err) {
  if (err.message?.includes('Stock insuficiente')) {
    return next(new InsufficientStockError(err.message));
  }
  next(err); // <-- "no encontrado o inactivo" cae acá → 500
}
```

---

## Summary

| # | Comentario | Estado |
|---|---|---|
| 1 | Copilot High — doble reposición en `limpiarPedidosDeTest` | **REAL** |
| 2 | Copilot Medium — falta `afterAll(pool.end())` | **REAL** |
| 3 | ChatGPT P2 — doble stock (duplicate de #1) | **REAL** |
| 4 | ChatGPT P2 — error `"Producto X no encontrado o inactivo"` da 500 | **REAL** |

### Risks
- Doble reposición de stock en CI/CD puede hacer que tests de stock sean no deterministas.
- Falta de cierre de pool puede dejar handles abiertos y fallas en runners CI.
- Error no mapeado expone stack trace en producción (500).

### Ready for Proposal
**Yes** — los 4 findings son reales, requieren fixes en:
- `caja.test.js` (limpiarPedidosDeTest filtrar por estado, afterAll pool.end)
- `pedido.controller.js` (mapear error de producto inactivo a ValidationError 400)
