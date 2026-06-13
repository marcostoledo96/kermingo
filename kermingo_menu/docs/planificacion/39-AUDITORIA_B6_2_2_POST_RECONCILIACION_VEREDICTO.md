# 39 — Auditoría B6.2.2 post-reconciliación — Veredicto ChatGPT

## Contexto

Auditoría realizada sobre el ZIP:

```txt
kermingo_contexto_auditoria_b6_2_2.zip
```

Y tomando como guía el documento:

```txt
38-PROMPT_AUDITORIA_CHATGPT_B6_2_2_POST_RECONCILIACION.md
```

## Objetivo de esta auditoría

Corroborar si la reconciliación B6.2.2 dejó alineados:

```txt
código real
tests
OpenSpec
documentación IA
reglas funcionales
```

Especialmente en:

- caja
- pagos
- filtro `solo_pagos_pendientes`
- edición transaccional
- cancelación
- cocina
- configuración de tienda
- seguridad por `requireTrustedOrigin`
- tests de caja

## Limitación

La revisión fue **estática**. Se leyó el código fuente y los tests, pero no se ejecutó `npm test` porque el entorno de auditoría no tiene la base MySQL activa ni `node_modules`.

---

# 1. Resumen ejecutivo

Esta vez el ZIP **sí contiene el código real** que faltaba en la auditoría anterior.

Las piezas principales que antes no estaban ahora sí aparecen:

```txt
PAGO_TRANSITIONS
transitionsByMethod
validatePaymentTransition
updateEstadoPago transaccional
solo_pagos_pendientes
PUT /api/admin/pedidos/:id
editWithTransaction
backend/tests/caja.test.js
documentación actualizada
OpenSpec de caja
```

La reconciliación B6.2.2 está **mucho mejor** que el ZIP anterior. La implementación de caja, pagos y edición transaccional está mayormente alineada con lo documentado.

Sin embargo, todavía encontré algunos puntos que conviene corregir antes de avanzar a B6.3. El más importante es de seguridad: `requireTrustedOrigin` valida `Referer` con `startsWith`, lo que puede aceptar dominios maliciosos con prefijo parecido. También detecté problemas de robustez en tests y una deuda técnica pendiente en `updateEstadoPedido`.

## Tabla de veredicto

| Punto evaluado | Estado |
|---|---|
| Código real coincide con documentación | **SÍ, con observaciones menores** |
| State machine de pago method-aware | **SÍ** |
| `updateEstadoPago` atómico/transaccional | **SÍ** |
| Filtro `solo_pagos_pendientes` | **SÍ, con mejora recomendada** |
| `editWithTransaction` | **SÍ, bien implementado** |
| Tests cubren edge cases principales | **SÍ, pero cleanup necesita ajuste** |
| Documentación consistente | **SÍ, con detalles menores** |
| Listo para B6.3 | **NO directo** |
| Veredicto general | **B6.2.2 está bien reconciliada, pero recomiendo una B6.2.3 corta de hardening antes de B6.3** |

## Veredicto corto

```txt
B6.2.2 reconciliación: correcta en lo central.
Pagos/caja/edición: ahora sí están en el código.
No avanzar directo a B6.3 sin corregir seguridad de Referer y cleanup de tests.
Siguiente paso recomendado: B6.2.3 — hardening final pre-B6.3.
```

---

# 2. Hallazgos críticos

## CRIT-1 — `requireTrustedOrigin` valida `Referer` con `startsWith`

### Archivo

```txt
backend/src/api/middlewares/origin.middleware.js
```

### Código observado

```js
if (!origin && referer && referer.startsWith(environments.frontendUrl)) {
  return next();
}
```

### Descripción del problema

El chequeo por `startsWith` puede aceptar dominios maliciosos que empiecen igual que el dominio confiable.

Ejemplo conceptual:

```txt
FRONTEND_URL=https://kermingo.vercel.app
Referer=https://kermingo.vercel.app.evil.com/form
```

Ese `Referer` empieza con:

```txt
https://kermingo.vercel.app
```

pero pertenece a otro dominio.

### Impacto

`requireTrustedOrigin` es la defensa CSRF mínima para rutas admin mutantes. Si se acepta un `Referer` falso con prefijo similar, se debilita la protección.

### Severidad

```txt
CRÍTICA / ALTA
```

No necesariamente explota en todos los navegadores porque muchos requests mutantes envían `Origin`, pero como fallback de seguridad no debería usar comparación por prefijo.

### Fix requerido

Parsear el `Referer` como URL y comparar el `origin` real.

Ejemplo:

```js
function getOriginFromReferer(referer) {
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function requireTrustedOrigin(req, _res, next) {
  if (!UNSAFE_METHODS.includes(req.method)) {
    return next();
  }

  const origin = req.get('origin');
  const referer = req.get('referer');
  const trustedOrigin = environments.frontendUrl;

  if (origin && origin === trustedOrigin) {
    return next();
  }

  const refererOrigin = referer ? getOriginFromReferer(referer) : null;

  if (!origin && refererOrigin === trustedOrigin) {
    return next();
  }

  return next(new ForbiddenError('Origen no permitido'));
}
```

### Tests recomendados

Agregar en `configuracion.csrf.test.js` o test equivalente:

```txt
Referer trusted exacto → permite
Referer https://frontend.evil.com → 403
Referer inválido → 403
Sin Origin y sin Referer → 403
Origin válido → permite
Origin inválido aunque Referer válido → 403 o se prioriza Origin inválido
```

---

# 3. Hallazgos importantes

## IMP-1 — Cleanup de `caja.test.js` usa prefijo amplio `TEST-%`, no el `RUN_ID`

### Archivo

```txt
backend/tests/caja.test.js
```

### Código observado

```js
const RUN_ID = `TEST-B6-2-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

async function limpiarPedidosDeTest() {
  const [rows] = await pool.query(
    "SELECT id FROM pedido WHERE nombre_cliente LIKE 'TEST-%'"
  );
  ...
}
```

### Problema

Se generó un `RUN_ID` único, pero el cleanup no lo usa. Sigue limpiando cualquier pedido cuyo nombre empiece con:

```txt
TEST-
```

Esto puede afectar:

- otras suites,
- corridas concurrentes,
- datos manuales de prueba,
- fixtures de otra etapa.

### Severidad

```txt
IMPORTANTE
```

### Fix recomendado

Usar el `RUN_ID` real:

```js
async function limpiarPedidosDeTest() {
  const [rows] = await pool.query(
    'SELECT id FROM pedido WHERE nombre_cliente LIKE ?',
    [`${RUN_ID}%`]
  );

  for (const { id } of rows) {
    try {
      await cancelWithTransaction(pool, id);
    } catch (err) {
      // ver IMP-2 para manejo robusto
    }
  }

  const [remaining] = await pool.query(
    'SELECT id FROM pedido WHERE nombre_cliente LIKE ?',
    [`${RUN_ID}%`]
  );

  const ids = remaining.map((r) => r.id);

  if (ids.length > 0) {
    const ph = ids.map(() => '?').join(',');
    await pool.query(`DELETE FROM pedido_detalle WHERE pedido_id IN (${ph})`, ids);
    await pool.query(`DELETE FROM pedido WHERE id IN (${ph})`, ids);
  }
}
```

---

## IMP-2 — Cleanup de tests puede borrar pedidos no cancelables sin reponer stock

### Archivo

```txt
backend/tests/caja.test.js
```

### Código observado

```js
for (const { id } of rows) {
  try {
    await cancelWithTransaction(pool, id);
  } catch (err) {
    // cancelWithTransaction falla si el pedido está en estado terminal.
    // En ese caso seguimos con DELETE directo.
  }
}

const [remaining] = await pool.query(...);
...
await pool.query(`DELETE FROM pedido_detalle WHERE pedido_id IN (${ph})`, ids);
await pool.query(`DELETE FROM pedido WHERE id IN (${ph})`, ids);
```

### Problema

`cancelWithTransaction` solo repone stock si el pedido está en estados cancelables. Si un pedido de test queda en:

```txt
listo
entregado
cancelado
```

la función puede no reponer stock. Luego el cleanup borra directo el detalle y el pedido.

Eso puede dejar stock alterado después de los tests.

### Severidad

```txt
IMPORTANTE
```

### Fix recomendado

Opción segura para tests:

1. Seleccionar solo pedidos del `RUN_ID`.
2. Para cada pedido:
   - si está `recibido` o `en_preparacion`, usar `cancelWithTransaction`.
   - si está `listo` o `entregado`, hacer reposición manual controlada antes del delete, o no permitir que tests de caja dejen pedidos en esos estados.
   - si está `cancelado`, no reponer de nuevo.
3. Recién después borrar.

Ejemplo simple:

```js
const [rows] = await pool.query(
  `SELECT id, estado_pedido
   FROM pedido
   WHERE nombre_cliente LIKE ?`,
  [`${RUN_ID}%`]
);

for (const pedido of rows) {
  if (['recibido', 'en_preparacion'].includes(pedido.estado_pedido)) {
    await cancelWithTransaction(pool, pedido.id);
  }
}
```

Si los tests actuales nunca dejan pedidos `listo` o `entregado`, documentarlo y agregar una aserción para que el cleanup falle si encuentra estados no manejados.

---

## IMP-3 — `caja.test.js` cierra el pool dos veces

### Archivo

```txt
backend/tests/caja.test.js
```

### Código observado

Hay un `afterAll`:

```js
afterAll(async () => {
  await pool.end();
});
```

y luego otro:

```js
afterAll(async () => {
  try { await pool.end(); } catch (_) { /* pool ya cerrado por otra suite */ }
});
```

### Problema

No es funcionalmente grave porque el segundo atrapa el error, pero es ruido y puede confundir futuras auditorías o agentes.

### Severidad

```txt
BAJA-MEDIA
```

### Fix recomendado

Dejar un solo cierre del pool:

```js
afterAll(async () => {
  await pool.end();
});
```

Si varios test files comparten `pool`, conviene mover el cierre a un teardown global de Jest.

---

## IMP-4 — `updateEstadoPedido` sigue sin ser atómico

### Archivo

```txt
backend/src/api/models/pedido.model.js
```

### Código observado

```js
export async function updateEstadoPedido(pool, id, nuevoEstado) {
  const pedido = await findById(pool, id);
  if (!pedido) return 0;
  if (!transicionEstadoValida(pedido.estado_pedido, nuevoEstado)) return -1;

  const [result] = await pool.query(
    'UPDATE pedido SET estado_pedido = ? WHERE id = ?',
    [nuevoEstado, id]
  );
  return result.affectedRows;
}
```

### Problema

Sigue el patrón:

```txt
SELECT → validar en memoria → UPDATE
```

sin `FOR UPDATE` ni `WHERE estado_pedido = estadoAnterior`.

### Impacto

En cocina, dos operadores podrían pisarse:

```txt
Request A lee recibido → quiere en_preparacion
Request B lee recibido → quiere en_preparacion
```

O podría haber condiciones de carrera si se intenta avanzar estado mientras otro request cancela.

### Severidad

```txt
IMPORTANTE
```

No bloquea específicamente B6.3 de comprobantes, pero sí conviene corregirlo antes de producción o antes de trabajar frontend de cocina.

### Fix recomendado

Opción transaccional:

```js
export async function updateEstadoPedido(pool, id, nuevoEstado) {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT id, estado_pedido FROM pedido WHERE id = ? FOR UPDATE',
      [id]
    );

    const pedido = rows[0];

    if (!pedido) {
      await conn.rollback();
      return 0;
    }

    if (!transicionEstadoValida(pedido.estado_pedido, nuevoEstado)) {
      await conn.rollback();
      return -1;
    }

    const [result] = await conn.query(
      'UPDATE pedido SET estado_pedido = ? WHERE id = ?',
      [nuevoEstado, id]
    );

    await conn.commit();
    return result.affectedRows;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
```

Opción atómica simple:

```sql
UPDATE pedido
SET estado_pedido = ?
WHERE id = ?
  AND estado_pedido = ?
```

---

## IMP-5 — `pedidoQuerySchema` no usa `.strict()`

### Archivo

```txt
backend/src/api/schemas/pedido.schema.js
```

### Código observado

```js
export const pedidoQuerySchema = z.object({
  ...
  solo_pagos_pendientes: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});
```

### Problema

Los schemas críticos de body están en `.strict()`, pero este query schema no. Como `validateQuery` asigna `req.query = schema.parse(req.query)`, Zod va a limpiar extras por defecto, pero por consistencia y claridad conviene cerrarlo explícitamente.

### Severidad

```txt
BAJA-MEDIA
```

### Fix recomendado

```js
export const pedidoQuerySchema = z.object({
  ...
}).strict();
```

---

## IMP-6 — `findAllAdmin` usa truthiness para `solo_pagos_pendientes`

### Archivo

```txt
backend/src/api/models/pedido.model.js
```

### Código observado

```js
if (filters.solo_pagos_pendientes) {
  conditions.push("AND p.estado_pago IN ('pendiente','rechazado')");
  conditions.push("AND p.estado_pedido != 'cancelado'");
} else if (filters.estado_pago) {
  ...
}
```

### Problema

Por la ruta HTTP validada está bien, porque Zod transforma `'true'` y `'false'` a boolean.

Pero si en algún momento se llama `findAllAdmin(pool, { solo_pagos_pendientes: 'false' })` desde tests, scripts o código interno, el string `'false'` es truthy y aplicaría el filtro por error.

### Severidad

```txt
BAJA-MEDIA
```

### Fix recomendado

```js
if (filters.solo_pagos_pendientes === true) {
  conditions.push("AND p.estado_pago IN ('pendiente','rechazado')");
  conditions.push("AND p.estado_pedido != 'cancelado'");
} else if (filters.estado_pago) {
  conditions.push('AND p.estado_pago = ?');
  values.push(filters.estado_pago);
}
```

---

## IMP-7 — Cancelación/edición de promos depende de la definición actual de `combo_producto`

### Archivo

```txt
backend/src/api/models/pedido.model.js
```

### Problema

Cuando se cancela o edita un pedido con una promo, el backend mira los componentes actuales en:

```txt
combo_producto
```

Eso funciona mientras los componentes de la promo no cambien después de vender.

Pero si en una futura etapa de ABM productos se permite modificar la composición de una promo ya vendida, la cancelación o edición puede reponer componentes equivocados.

### Ejemplo

Venta original:

```txt
Promo cena = pancho + coca
```

Luego admin cambia promo a:

```txt
Promo cena = pancho + pizza + coca
```

Si se cancela un pedido viejo, el sistema puede reponer pizza aunque la venta original no la había descontado.

### Severidad

```txt
IMPORTANTE FUTURO / NO BLOQUEA B6.3
```

### Fix recomendado

Antes de permitir editar componentes de promos en admin, elegir una estrategia:

Opción A — No permitir modificar componentes de promos con ventas asociadas.

Opción B — Guardar snapshot de componentes consumidos por pedido:

```txt
pedido_detalle_componente
```

con:

```txt
pedido_detalle_id
producto_componente_id
cantidad
```

Opción C — Al vender una promo, expandir componentes en una tabla de movimientos de stock.

Para el MVP sin ABM avanzado de combos, puede quedar como deuda documentada.

---

# 4. Cosas bien aplicadas

## OK-1 — State machine de pago method-aware está implementada

### Archivo

```txt
backend/src/api/models/pedido.model.js
```

### Evidencia

Existe:

```js
export const transitionsByMethod = {
  efectivo: {
    pendiente: ['pagado'],
    pagado: [],
  },
  transferencia: {
    pendiente: ['pagado', 'comprobante_subido'],
    comprobante_subido: ['pagado', 'rechazado'],
    rechazado: ['pendiente', 'comprobante_subido'],
    pagado: [],
  },
};
```

### Veredicto

```txt
BIEN APLICADO
```

Efectivo no permite `comprobante_subido` ni `rechazado`. Transferencia contempla los estados necesarios para B6.3.

---

## OK-2 — `validatePaymentTransition` usa método cuando corresponde

### Archivo

```txt
backend/src/api/models/pedido.model.js
```

### Evidencia

```js
export function validatePaymentTransition(from, to, metodoPago) {
  if (from === to) return true;
  if (metodoPago && transitionsByMethod[metodoPago]) {
    return (transitionsByMethod[metodoPago][from] || []).includes(to);
  }
  return (PAGO_TRANSITIONS[from] || []).includes(to);
}
```

### Veredicto

```txt
BIEN APLICADO, CON NOTA
```

La función retorna `true` para mismo estado, pero `updateEstadoPago` rechaza explícitamente la transición nula. Está documentado y testeado. No lo considero bug.

---

## OK-3 — `updateEstadoPago` es transaccional

### Archivo

```txt
backend/src/api/models/pedido.model.js
```

### Evidencia

Usa:

```txt
pool.getConnection()
beginTransaction()
SELECT ... FOR UPDATE
rollback()
commit()
conn.release()
```

También bloquea cancelados y transición nula.

### Veredicto

```txt
BIEN APLICADO
```

Esto corrige la race condition crítica detectada en B6.2.

---

## OK-4 — Controller `cambiarPago` maneja resultados especiales

### Archivo

```txt
backend/src/api/controllers/pedido.controller.js
```

### Evidencia

```js
if (result === 0) throw new NotFoundError('Pedido no encontrado');
if (result === -1) throw new ValidationError('Transicion de estado de pago no valida');
if (result === -2) throw new ValidationError('No se puede modificar el pago de un pedido cancelado');
```

### Veredicto

```txt
BIEN APLICADO
```

Nota menor: el mensaje no tiene tildes. No es funcional.

---

## OK-5 — `updateEstadoPagoSchema` permite los 4 estados

### Archivo

```txt
backend/src/api/schemas/pedido.schema.js
```

### Evidencia

```js
estado_pago: z.enum(['pendiente', 'comprobante_subido', 'pagado', 'rechazado'])
```

### Veredicto

```txt
BIEN APLICADO
```

---

## OK-6 — Filtro `solo_pagos_pendientes` existe

### Archivos

```txt
backend/src/api/schemas/pedido.schema.js
backend/src/api/models/pedido.model.js
```

### Evidencia

Schema:

```js
solo_pagos_pendientes: z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional(),
```

Modelo:

```js
if (filters.solo_pagos_pendientes) {
  conditions.push("AND p.estado_pago IN ('pendiente','rechazado')");
  conditions.push("AND p.estado_pedido != 'cancelado'");
}
```

### Veredicto

```txt
BIEN APLICADO, CON MEJORA MENOR
```

Funciona por ruta validada. Recomiendo `=== true` por robustez.

---

## OK-7 — Ruta `PUT /api/admin/pedidos/:id` existe y está protegida

### Archivo

```txt
backend/src/api/routes/pedido.routes.js
```

### Evidencia

```js
adminRouter.put(
  '/:id',
  requireAdmin,
  requireTrustedOrigin,
  validateParams(idParamSchema),
  validateBody(editPedidoSchema),
  editar
);
```

### Veredicto

```txt
BIEN APLICADO
```

---

## OK-8 — `editPedidoSchema` permite edición parcial

### Archivo

```txt
backend/src/api/schemas/pedido.schema.js
```

### Evidencia

`items` es opcional y hay refine para exigir al menos un campo.

```js
items: z.array(...).min(1).optional()
...
.refine(
  (data) => data.items !== undefined || data.nombre_cliente !== undefined || ...
)
```

### Veredicto

```txt
BIEN APLICADO
```

---

## OK-9 — `editWithTransaction` reconcilia stock correctamente en lo central

### Archivo

```txt
backend/src/api/models/pedido.model.js
```

### Evidencia

La función:

- bloquea pedido con `FOR UPDATE`,
- rechaza online con `return -2`,
- rechaza cancelados/entregados con `return -1`,
- permite edición metadata-only sin tocar stock,
- calcula reposiciones,
- calcula nuevos requerimientos,
- soporta promos,
- valida stock con reposición aplicada,
- bloquea productos con `ORDER BY id FOR UPDATE`,
- omite ilimitados,
- aplica delta neto,
- borra y reescribe detalle,
- recalcula total.

### Veredicto

```txt
BIEN APLICADO
```

La lógica principal está correcta para el MVP.

---

## OK-10 — Cancelación transaccional está bien implementada

### Archivo

```txt
backend/src/api/models/pedido.model.js
```

### Evidencia

`cancelWithTransaction`:

- usa `SELECT ... FOR UPDATE`,
- solo permite cancelar desde `recibido` o `en_preparacion`,
- repone stock de productos normales,
- repone componentes de promos,
- ordena IDs con `ORDER BY id FOR UPDATE`,
- omite productos ilimitados,
- setea `estado_pedido = 'cancelado'`.

### Veredicto

```txt
BIEN APLICADO
```

---

## OK-11 — Configuración admin tiene `requireTrustedOrigin`

### Archivo

```txt
backend/src/api/routes/configuracion.routes.js
```

### Evidencia

```js
adminRouter.put('/', requireAdmin, requireTrustedOrigin, validateBody(updateConfiguracionSchema), actualizarAdmin);
```

### Veredicto

```txt
BIEN APLICADO
```

---

## OK-12 — `origin.middleware.js` usa `ForbiddenError`

### Archivo

```txt
backend/src/api/middlewares/origin.middleware.js
backend/src/api/utils/errors.js
```

### Evidencia

```js
return next(new ForbiddenError('Origen no permitido'));
```

y `ForbiddenError` responde 403.

### Veredicto

```txt
BIEN APLICADO, salvo por el bug de `Referer.startsWith`
```

---

## OK-13 — Tests de caja existen y son amplios

### Archivo

```txt
backend/tests/caja.test.js
```

### Evidencia

El archivo tiene 850 líneas y cubre:

- state machine genérica,
- state machine method-aware,
- schema de pago,
- `solo_pagos_pendientes`,
- auth boundaries,
- PATCH pago,
- PUT edit,
- rollback por stock insuficiente,
- producto ilimitado,
- promo combo,
- edición parcial,
- coherencia método/pago,
- pedido cancelado.

### Veredicto

```txt
BIEN APLICADO, pero cleanup necesita corrección
```

---

## OK-14 — Documentación IA y OpenSpec ahora coinciden bastante con el código

### Archivos

```txt
DOCUMENTACION/IA/API.md
DOCUMENTACION/IA/CORE.md
DOCUMENTACION/IA/TESTING.md
DOCUMENTACION/IA/GOTCHAS.md
openspec/specs/cashier-operations/spec.md
```

### Veredicto

```txt
BIEN APLICADO
```

A diferencia de la auditoría 37, ahora la documentación ya no describe una funcionalidad inexistente. Las piezas principales están en el código real.

---

# 5. Respuestas a preguntas específicas del prompt

## 5.1 — ¿Está la state machine de pago correctamente implementada?

```txt
Sí.
```

- `efectivo` solo permite `pendiente → pagado`.
- `transferencia` permite `pendiente → pagado | comprobante_subido`.
- `comprobante_subido → pagado | rechazado`.
- `rechazado → pendiente | comprobante_subido`.
- `pagado` es terminal.
- La transición nula es aceptada por `validatePaymentTransition`, pero rechazada por `updateEstadoPago`. Esto es una decisión rara pero está documentada y testeada, por lo que no la considero bug.

## 5.2 — ¿`updateEstadoPago` es verdaderamente atómico?

```txt
Sí, para el nivel requerido.
```

Usa:

```txt
transacción
SELECT ... FOR UPDATE
validación bajo lock
UPDATE
commit/rollback
release
```

Eso elimina la carrera crítica donde `pagado` podía ser sobrescrito.

## 5.3 — ¿El filtro `solo_pagos_pendientes` funciona correctamente?

```txt
Sí, para la ruta HTTP validada.
```

Filtra:

```txt
estado_pago IN ('pendiente','rechazado')
estado_pedido != 'cancelado'
```

No filtra por `origen = caja`, lo cual está bien porque caja puede cobrar pedidos online.

Mejora recomendada:

```js
if (filters.solo_pagos_pendientes === true)
```

en vez de truthiness.

## 5.4 — ¿`editWithTransaction` reconcilia stock correctamente?

```txt
Sí, para el MVP actual.
```

La lógica de delta neto está bien:

```txt
disponible = stock_actual + restore
net = restore - deduct
```

Soporta:

```txt
productos limitados
productos ilimitados
promos por componentes
metadata-only edit
rollback por stock insuficiente
```

Deuda futura: si se editan componentes de promos después de ventas, se necesita snapshot de componentes o bloquear edición de promos con ventas.

## 5.5 — ¿Los tests cubren edge cases?

```txt
Sí, bastante mejor que etapas anteriores.
```

Cubren los casos principales. Faltan o conviene corregir:

- cleanup con `RUN_ID`, no `TEST-%`,
- no cerrar pool dos veces,
- test específico para `Referer` malicioso con prefijo,
- test para `updateEstadoPedido` atómico si se corrige.

## 5.6 — ¿La documentación coincide con el código?

```txt
Sí, en lo principal.
```

API, CORE, TESTING, GOTCHAS y OpenSpec ahora están alineados con el código real de caja.

---

# 6. Checklist de corrección recomendado

Antes de B6.3:

```txt
[ ] Corregir requireTrustedOrigin para parsear Referer y comparar origin exacto.
[ ] Agregar tests contra Referer malicioso con prefijo parecido.
[ ] Cambiar cleanup de caja.test.js para usar RUN_ID en vez de TEST-%.
[ ] Evitar borrar pedidos no cancelables sin restaurar stock o documentar que no quedan en esos estados.
[ ] Dejar un solo afterAll(pool.end()) en caja.test.js o mover a teardown global.
[ ] Hacer updateEstadoPedido atómico o crear tarea explícita antes de producción.
[ ] Agregar .strict() a pedidoQuerySchema.
[ ] Cambiar findAllAdmin a solo_pagos_pendientes === true.
[ ] Documentar deuda futura sobre snapshot de componentes de promos.
```

---

# 7. Plan de remediación sugerido

## Fix 1 — Corregir `requireTrustedOrigin`

### Archivos

```txt
backend/src/api/middlewares/origin.middleware.js
backend/tests/configuracion.csrf.test.js
```

### Cambio recomendado

```js
function safeOriginFromUrl(value) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function requireTrustedOrigin(req, _res, next) {
  if (!UNSAFE_METHODS.includes(req.method)) {
    return next();
  }

  const origin = req.get('origin');
  const referer = req.get('referer');
  const trustedOrigin = environments.frontendUrl;

  if (origin && origin === trustedOrigin) {
    return next();
  }

  const refererOrigin = referer ? safeOriginFromUrl(referer) : null;

  if (!origin && refererOrigin === trustedOrigin) {
    return next();
  }

  return next(new ForbiddenError('Origen no permitido'));
}
```

### Verificación

```txt
Origin confiable → no 403
Origin hostil → 403
Referer confiable exacto → no 403
Referer con prefijo malicioso → 403
Referer inválido → 403
```

---

## Fix 2 — Corregir cleanup de `caja.test.js`

### Archivo

```txt
backend/tests/caja.test.js
```

### Cambio recomendado

Usar `RUN_ID`:

```js
const TEST_PREFIX = `${RUN_ID}%`;

const [rows] = await pool.query(
  'SELECT id, estado_pedido FROM pedido WHERE nombre_cliente LIKE ?',
  [TEST_PREFIX]
);
```

Evitar reposición doble o eliminación sin restaurar.

Si los tests no deberían dejar pedidos terminales, hacer que el cleanup falle al encontrarlos:

```js
if (['listo', 'entregado'].includes(pedido.estado_pedido)) {
  throw new Error(`Cleanup no puede borrar pedido terminal sin reposición segura: ${pedido.id}`);
}
```

---

## Fix 3 — Dejar un solo cierre del pool en `caja.test.js`

### Archivo

```txt
backend/tests/caja.test.js
```

### Cambio recomendado

Eliminar uno de los dos bloques:

```js
afterAll(async () => {
  await pool.end();
});
```

Preferencia:

```js
afterAll(async () => {
  try {
    await pool.end();
  } catch (_) {
    // pool ya cerrado
  }
});
```

aunque lo ideal sería un teardown global si varias suites DB-backed usan el mismo pool.

---

## Fix 4 — Hacer `updateEstadoPedido` atómico

### Archivo

```txt
backend/src/api/models/pedido.model.js
```

### Cambio recomendado

```js
export async function updateEstadoPedido(pool, id, nuevoEstado) {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT id, estado_pedido FROM pedido WHERE id = ? FOR UPDATE',
      [id]
    );

    const pedido = rows[0];

    if (!pedido) {
      await conn.rollback();
      return 0;
    }

    if (!transicionEstadoValida(pedido.estado_pedido, nuevoEstado)) {
      await conn.rollback();
      return -1;
    }

    const [result] = await conn.query(
      'UPDATE pedido SET estado_pedido = ? WHERE id = ?',
      [nuevoEstado, id]
    );

    await conn.commit();
    return result.affectedRows;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
```

---

## Fix 5 — Endurecer query schema y filtro

### Archivo

```txt
backend/src/api/schemas/pedido.schema.js
backend/src/api/models/pedido.model.js
```

### Cambios recomendados

En schema:

```js
export const pedidoQuerySchema = z.object({
  ...
}).strict();
```

En modelo:

```js
if (filters.solo_pagos_pendientes === true) {
  conditions.push("AND p.estado_pago IN ('pendiente','rechazado')");
  conditions.push("AND p.estado_pedido != 'cancelado'");
}
```

---

## Fix 6 — Documentar deuda de promos

### Archivo sugerido

```txt
DOCUMENTACION/IA/GOTCHAS.md
```

### Contenido sugerido

```txt
Las promos se descuentan usando la composición actual de combo_producto.
Mientras no exista ABM de composición de promos, esto es aceptable.
Antes de permitir editar componentes de promos con ventas existentes, se debe:
- bloquear edición de promos con ventas asociadas, o
- guardar snapshot de componentes por pedido.
```

---

# 8. Orden de aplicación recomendado

1. **Fix 1 — Seguridad `Referer`**  
   Es el más importante antes de seguir con más endpoints admin y comprobantes.

2. **Fix 2 y Fix 3 — Limpieza de tests**  
   Evita contaminación de stock y falsos verdes.

3. **Fix 5 — Schema/filtro robusto**  
   Cambio chico y seguro.

4. **Fix 4 — `updateEstadoPedido` atómico**  
   No bloquea B6.3 estrictamente, pero conviene antes de producción/cocina frontend.

5. **Fix 6 — Documentar deuda de promos**  
   Deuda futura para ABM productos/promos.

6. **Ejecutar `npm test` y generar nuevo ZIP.**

---

# 9. Prompt para OpenCode — B6.2.3

Copiar desde la raíz del proyecto.

```txt
Continuemos con Kermingo. La auditoría B6.2.2 post-reconciliación confirmó que caja/pagos/edición ya están integrados, pero detectó algunos ajustes antes de avanzar a B6.3.

# Etapa B6.2.3 — Hardening final pre-B6.3

Trabajá bajo metodología SDD usando Gentle AI.

No implementar comprobantes, Google Drive, frontend ni deploy.

## Objetivo

Aplicar fixes cortos antes de B6.3:

1. Corregir requireTrustedOrigin para no usar referer.startsWith().
2. Comparar el origin real del Referer con FRONTEND_URL usando new URL(referer).origin.
3. Agregar tests contra Referer malicioso con prefijo similar.
4. Cambiar cleanup de caja.test.js para usar RUN_ID y no TEST-%.
5. Evitar que cleanup borre pedidos no cancelables sin restaurar stock.
6. Dejar un solo afterAll(pool.end()) en caja.test.js o mover a teardown global.
7. Agregar .strict() a pedidoQuerySchema.
8. Cambiar findAllAdmin a solo_pagos_pendientes === true.
9. Evaluar y, si es viable, hacer updateEstadoPedido transaccional con SELECT ... FOR UPDATE.
10. Documentar deuda futura de promos/componentes en GOTCHAS.md.

## Leer antes

- AGENTS.md
- docs/planificacion/39-AUDITORIA_B6_2_2_POST_RECONCILIACION_VEREDICTO.md
- backend/src/api/middlewares/origin.middleware.js
- backend/tests/configuracion.csrf.test.js
- backend/tests/caja.test.js
- backend/src/api/models/pedido.model.js
- backend/src/api/schemas/pedido.schema.js
- DOCUMENTACION/IA/GOTCHAS.md
- openspec/specs/cashier-operations/spec.md

## Reglas

- No tocar frontend/.
- No tocar diseno-de-landing-kermingo/.
- No implementar B6.3 todavía.
- No romper state machine de pago.
- No romper edición transaccional.
- No cambiar reglas funcionales sin consultar.

## Verificación

Ejecutar:

```bash
cd backend
npm test
npm run dev
curl http://localhost:3001/api/health
```

Agregar/verificar tests:

```txt
- Origin confiable permitido.
- Origin hostil rechazado.
- Referer confiable permitido si no hay Origin.
- Referer con prefijo malicioso rechazado.
- caja.test cleanup usa RUN_ID.
- npm test sin open handles.
- solo_pagos_pendientes sigue funcionando.
- updateEstadoPedido sigue rechazando transición nula.
```

## Resultado esperado

Responder con:

```txt
## Resultado B6.2.3 — Hardening final pre-B6.3

Pipeline SDD ejecutado:
- explore:
- propose:
- spec:
- design:
- tasks:
- apply:
- verify:
- archive:

Archivos modificados:
-

Cambios en seguridad Origin/Referer:
-

Cambios en tests:
-

Cambios en pedido.model.js:
-

Cambios en schemas:
-

Cambios documentación:
-

Resultados npm test:
-

Pendientes:
-

Auditoría con ChatGPT recomendada:
si

Bloquea avance a B6.3:
si/no

Veredicto:
-
```

No avances a B6.3 hasta que Marcos revise.
```

---

# 10. Veredicto final

```txt
¿El código real coincide con la documentación post-reconciliación?
SÍ, con observaciones menores.

¿B6.2 caja/pagos está correctamente implementado?
SÍ.

¿B6.2.1 hardening está correctamente implementado?
SÍ en lo central.

¿La reconciliación B6.2.2 está completa?
CASI. Falta hardening menor/medio antes de B6.3.

¿Se puede avanzar a B6.3?
NO directo. Recomiendo B6.2.3 corta.
```

## Siguiente paso recomendado

```txt
B6.2.3 — Hardening final pre-B6.3
```

Después de B6.2.3, si:

```txt
npm test pasa
Origin/Referer queda seguro
cleanup de tests queda acotado al RUN_ID
updateEstadoPedido queda atómico o documentado
OpenSpec sigue alineado
```

entonces sí se puede avanzar a:

```txt
B6.3 — Comprobantes / Google Drive
```
