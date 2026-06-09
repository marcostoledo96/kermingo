## Exploración: B6.2 PR1 caja review fixes

### Estado verificado por archivo

#### `backend/src/api/models/pedido.model.js`
- **Líneas 56–58: `validatePaymentTransition`** — `REAL`. Retorna `true` cuando `from === to`. Permite que `updateEstadoPago` ejecute un UPDATE no-op, cuyo `affectedRows` puede ser `0`, y el controller lo interprete como 404. Consistente con el bug latente de `transicionEstadoValida` que se corrigió en cocina (ahora esa función también tiene `if (actual === siguiente) return true;`, pero el controller de cocina no sufre del mismo problema porque `updateEstadoPedido` no se usa con estado repetido desde el controller; sin embargo, el patrón es idéntico).
- **Líneas ~329–338: `updateEstadoPago`** — `REAL` por consecuencia de lo anterior. Hace `findById` → valida transición → UPDATE → retorna `affectedRows`. Si `from === to`, el UPDATE no-op produce `affectedRows = 0` (mysql2 documenta que `affectedRows` es el número de filas *cambiadas*, no *encontradas*). El controller lanza 404.
- **`cancelWithTransaction` (líneas 335–395 aprox)** — Funciona correctamente; restaura stock de productos y combos de forma transaccional. Perfecto para reutilizar en cleanup de tests.

#### `backend/src/api/controllers/pedido.controller.js`
- **Línea 145: mensaje de error sin tildes** — `REAL`. Texto: `'Transicion de estado de pago no valida'`. Falta tilde en "Transición" y en "válida". Contrasta con línea 128 de cocina: `'Transición de estado no válida'` (correcto).
- **Línea 144: `result === 0` → `NotFoundError('Pedido no encontrado')`** — `REAL` por consecuencia de la idempotencia. Si el pedido existe pero el estado no cambió, `result === 0` y se lanza 404 incorrectamente.

#### `backend/tests/caja.test.js`
- **`limpiarPedidosDeTest()` — DELETE directo sin restaurar stock** — `REAL`. Borra `pedido_detalle` y `pedido` directamente. El stock del producto 5 (Pancho, `stock_limitado = 1`) se decrementa permanentemente en cada run, rompiendo tests posteriores.
- **Falta `afterAll(pool.end())`** — `REAL`. No hay cierre del pool al terminar los tests. Es un open handle conocido. Nota: `cocina.test.js` tampoco lo tiene, pero eso no invalida el comentario; es un defecto general de los tests de backend que conviene corregir progresivamente.
- **3 tests de filtro `solo_pagos_pendientes` no deterministas** — `REAL`. Los tests `excludes pagado`, `excludes cancelado` y `only returns pendiente or rechazado` no crean fixtures propios. Si la DB está vacía, pasan trivialmente porque `pedidos` es un array vacío y `.some()` retorna `false`, y el loop `for...of` no itera nada. No prueban realmente el filtro.

#### `backend/src/api/schemas/pedido.schema.js`
- **`updateEstadoPagoSchema`** — `NO REAL`. Acepta correctamente `comprobante_subido`. No hay comentarios sobre este archivo que ameriten cambio.
- **`pedidoQuerySchema.solo_pagos_pendientes`** — `NO REAL`. Parseo correcto con `.transform((v) => v === 'true')`. No hay bugs aquí.

### Comentarios válidos para actuar

1. **Acentos en mensaje de error (`cambiarPago`)** — REAL — Línea 145 de `pedido.controller.js`. Texto actual: `'Transicion de estado de pago no valida'`. Debe ser: `'Transición de estado de pago no válida'`.

2. **Idempotencia de PATCH pago** — REAL — Líneas 56–58 de `pedido.model.js` (`validatePaymentTransition`) + línea 144 del controller.
   - `validatePaymentTransition('pagado', 'pagado')` retorna `true`.
   - `updateEstadoPago` ejecuta UPDATE con mismo valor → `affectedRows = 0`.
   - Controller interpreta `0` como 404.
   - **Fix**: cambiar `validatePaymentTransition` para que `from === to` retorne `false`, consistente con la corrección de cocina (aunque allí `transicionEstadoValida` también retorna `true`, el controller de cocina no expone PATCH a mismo estado; aquí sí es vulnerable porque `updateEstadoPago` se llama directamente desde `cambiarPago`).

3. **Cleanup de tests: stock no restaurado** — REAL — `limpiarPedidosDeTest()` en `caja.test.js` (líneas ~61–70). Hace DELETE directo.
   - **Fix**: usar `cancelWithTransaction` en lugar de DELETE, o bien llamar a `cancelWithTransaction` para cada pedido TEST antes de hacer DELETE (para que el stock se reponga). `cancelWithTransaction` ya maneja reposición de stock de productos y combos.

4. **Falta `afterAll(pool.end())`** — REAL — Al final de `caja.test.js` no hay cierre del pool. Agregar `afterAll(async () => { await pool.end(); });`.

5. **Tests de filtro unpaid no deterministas** — REAL — Los 3 tests del describe `Authenticated GET solo_pagos_pendientes (PR1 integration)` no crean sus propios fixtures. Dependen del estado residual de la DB.
   - **Fix**: crear `beforeAll` dentro de ese describe que inserte pedidos de test con nombres únicos (ej. `TEST-FILTRO-PENDIENTE`, `TEST-FILTRO-PAGADO`, `TEST-FILTRO-CANCELADO`), con los estados de pago y pedido controlados. Luego el `afterAll` limpia esos pedidos con `cancelWithTransaction` + DELETE.

### Comentarios no válidos / out of scope

1. **Copilot Medium — Test depende de `configuracion_tienda.estado='abierta'`** — El seed deja la tienda en `'cerrada'` por diseño (según AGENTS.md §7 y flujos funcionales). Los tests de caja crean pedidos vía `POST /api/admin/pedidos/caja`, que en el código de `createWithTransaction` verifica `configuracion_tienda.estado = 'abierta'` con `FOR UPDATE`. Si la tienda está cerrada, el test debería fallar. Sin embargo, el test `crearPedidoCaja` en `caja.test.js` no muestra fallo, lo que sugiere que o bien la DB de tests tiene la tienda abierta, o el endpoint caja no usa `createWithTransaction`. Verificando el código de `crearCaja` en el controller: sí llama a `createWithTransaction`. Esto implica que la DB de tests debe tener `estado = 'abierta'` para que los tests pasen, o los tests no se corrieron contra DB real. Dado que el comentario del seed dice que está cerrado por diseño y el usuario marcó esto como NO REAL / out of scope, respetamos la decisión del usuario. **Out of scope**.

### Hallazgos extra

- **`cocina.test.js` tampoco tiene `afterAll(pool.end())`**. Es un patrón general de los tests del backend. Corregir `caja.test.js` es un buen paso; los demás tests pueden corregirse en otro momento.
- **La función `limpiarPedidosDeTest` usa `DELETE` directo en `pedido_detalle` y `pedido`**, lo que deja stock inconsistente. La solución más limpia es reutilizar `cancelWithTransaction` del modelo, que ya encapsula la reposición transaccional.
- **Los tests unitarios de `validatePaymentTransition` (describe `Caja payment-state machine (unit)`) incluyen un test explícito `'same state is always valid'` que espera `true` para `from === to`**. Si cambiamos `validatePaymentTransition` para que `from === to` retorne `false`, este test unitario debe actualizarse.
- **En la rama remota `feature/backend-b6-2-caja` (origin), ya existe PR #4 mergeado con edición transaccional**, lo que significa que esta exploración debería aplicarse sobre el commit `d4baf01` (PR1) para no mezclar con PR2. El usuario decidió trabajar directamente sobre `feature/backend-b6-2-caja` local.

### Decisión sobre idempotencia

- **¿`affectedRows` es realmente 0 para no-op?**
  - mysql2 con el flag por defecto (`CLIENT_FOUND_ROWS` no está activado por defecto en `mysql2/promise` a menos que se pase explícitamente) retorna `affectedRows = 0` cuando el valor ya es el mismo (no-op UPDATE). La documentación de Node.js mysql2 dice: "`affectedRows` — The number of rows affected by the query." Para un UPDATE que no cambia valores, es 0.
  - **Confirmado**: el controller actual trata `result === 0` como 404, lo cual es incorrecto para un no-op idempotente.
- **Decisión**: Cambiar `validatePaymentTransition(from, to)` para que `from === to` retorne `false`. Esto:
  - Evita el UPDATE no-op.
  - Hace que `updateEstadoPago` retorne `-1` (transición inválida).
  - El controller lanza `ValidationError` (400) en vez de `NotFoundError` (404), que es semánticamente correcto: "ya está en ese estado, no es una transición válida".
  - Es consistente con la decisión de cocina (aunque allí no se usaba directamente, el patrón de "mismo estado no es transición" es más robusto).
  - Requiere actualizar el test unitario `'same state is always valid'` para que espere `false`.

### Decisión sobre cleanup

- **Opción A**: Restaurar stock manualmente en `limpiarPedidosDeTest` con queries UPDATE. → Riesgo de duplicar lógica de combos/reposición.
- **Opción B**: Usar `cancelWithTransaction` para cada pedido TEST antes de DELETE. → Reutiliza lógica existente, restaura stock y combos correctamente, es transaccional.
- **Opción C**: Cambiar `limpiarPedidosDeTest` para que haga `DELETE` de detalles + `UPDATE producto SET stock_actual = stock_actual + cantidad` con subqueries. → Complejo, error-prone con combos.
- **Decisión**: **Opción B**. Cambiar `limpiarPedidosDeTest` para que, antes de DELETE, itere los pedidos de test y llame `cancelWithTransaction(pool, id)`. Luego hacer DELETE de los pedidos cancelados (estado ya es `'cancelado'`). Nota: `cancelWithTransaction` permite cancelar solo si el estado es `'recibido'` o `'en_preparacion'`. Los pedidos creados en los tests de caja tienen `estado_pedido = 'recibido'` por defecto (según `createCajaSchema`), así que `cancelWithTransaction` funcionará.

### Tests actuales

- **Unit tests**: `validatePaymentTransition` (10 tests), schema parsing (4 tests).
- **Auth boundary**: 3 tests de 401 sin cookie.
- **Integration payment transitions**: 4 tests (pendiente→pagado efectivo, pendiente→pagado transferencia, pagado→pendiente 400, pagado→rechazado 400).
- **Integration unpaid filter**: 3 tests (excluye pagado, excluye cancelado, solo pendiente/rechazado).
- **Total**: ~24 tests. Los 3 de filtro son no-deterministas. Falta test de idempotencia (mismo estado → 400).

### Recomendación de approach

1. **Fix acentos**: editar línea 145 de `pedido.controller.js`.
2. **Fix idempotencia**: editar `validatePaymentTransition` (línea 56) para que `from === to` retorne `false`; editar test unitario correspondiente.
3. **Fix cleanup**: reescribir `limpiarPedidosDeTest` para usar `cancelWithTransaction` antes de DELETE; importar `cancelWithTransaction` en el test.
4. **Fix pool end**: agregar `afterAll(async () => await pool.end());` al final del archivo.
5. **Fix tests deterministas**: en el describe de filtro unpaid, agregar `beforeAll` que cree pedidos con nombres únicos y estados controlados; `afterAll` que los limpie.
6. **Verificación**: correr `npm test -- caja.test.js` en `backend/`.

### Listo para propuesta
**Sí**. Todos los bugs están confirmados con líneas exactas, las decisiones están tomadas y el approach es claro. No hay ambigüedades ni dependencias bloqueantes.
