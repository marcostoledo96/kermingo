# 41 — Auditoría B6.2.3 post-hardening — Veredicto ChatGPT

## Contexto

Auditoría realizada sobre el ZIP:

```txt
kermingo_contexto_auditoria_b6_2_3.zip
```

y tomando como guía el prompt:

```txt
40-PROMPT_AUDITORIA_CHATGPT_B6_2_3_POST_HARDENING.md
```

## Objetivo

Corroborar que el hardening B6.2.3 quedó bien aplicado y que están alineados:

```txt
código real
tests
documentación IA
OpenSpec
reglas funcionales
```

Especialmente en:

- `requireTrustedOrigin`
- `safeOriginFromUrl`
- `updateEstadoPedido` atómico
- `pedidoQuerySchema.strict()`
- `solo_pagos_pendientes === true`
- cleanup de `caja.test.js`
- tests CSRF nuevos
- documentación `GOTCHAS.md`, `AUTENTICACION.md`, `TESTING.md`, `CORE.md`

## Limitación

La revisión fue estática. No ejecuté `npm test` porque el entorno de auditoría no tiene una base MySQL activa ni `node_modules`.

Sí revisé el código fuente, tests y documentación incluidos en el ZIP.

---

# 1. Resumen ejecutivo

B6.2.3 está **bien aplicada en el código central**. El fix más importante, el de `Referer.startsWith`, quedó corregido: ahora se parsea el `Referer` con `new URL(referer).origin` y se compara por igualdad estricta contra `FRONTEND_URL`.

También quedaron bien aplicados:

- `updateEstadoPedido` transaccional con `SELECT ... FOR UPDATE`
- `pedidoQuerySchema.strict()`
- `findAllAdmin` usando `solo_pagos_pendientes === true`
- cleanup de caja usando `RUN_ID`
- un solo `pool.end()` en `caja.test.js`
- tests nuevos para `Referer` malicioso y prioridad de `Origin`
- documentación de deuda futura de promos en `GOTCHAS.md`

Sin embargo, todavía encontré **inconsistencias documentales y de tests** que conviene corregir antes de pasar a B6.3. No son problemas graves de lógica de negocio, pero sí afectan la confiabilidad del proyecto para agentes IA y auditorías futuras.

## Tabla de veredicto

| Punto evaluado | Estado |
|---|---|
| CRIT-1 — Referer por origin corregido | **SÍ** |
| IMP-4 — `updateEstadoPedido` atómico | **SÍ** |
| IMP-5 — `pedidoQuerySchema.strict()` | **SÍ** |
| IMP-6 — `solo_pagos_pendientes === true` | **SÍ** |
| IMP-1/2/3 — cleanup de tests | **PARCIAL** |
| IMP-7 — deuda de promos documentada | **SÍ** |
| Tests CSRF nuevos | **SÍ** |
| Documentación consistente con código | **PARCIAL** |
| 126/126 tests pasan | **NO VERIFICABLE EN ESTA AUDITORÍA** |
| Listo para B6.3 | **CASI, pero recomiendo micro-fix documental/test antes** |

## Veredicto corto

```txt
B6.2.3 está bien aplicado en código.
No encontré bloqueantes fuertes en caja/pagos/stock.
Sí encontré inconsistencias de documentación y comentarios de tests.
Recomendación: hacer una micro-etapa B6.2.4 de limpieza documental/test y después avanzar a B6.3.
```

---

# 2. Hallazgos críticos

## Resultado

```txt
No encontré hallazgos críticos nuevos de código.
```

El hallazgo crítico de B6.2.2 sobre `Referer.startsWith` quedó corregido.

---

# 3. Hallazgos importantes

## IMP-1 — `AUTENTICACION.md` quedó desactualizado respecto de `requireTrustedOrigin`

### Archivo

```txt
DOCUMENTACION/IA/AUTENTICACION.md
```

### Evidencia

El documento todavía dice:

```txt
Si origin no está, lee 'referer'
Si referer empieza con FRONTEND_URL → next()
Si no cumple → AuthError (401, 'Origen no permitido')
```

También dice que el fix retroactivo cambió de `ForbiddenError` 403 a `AuthError` 401.

### Problema

El código actual hace otra cosa:

```txt
safeOriginFromUrl(referer)
new URL(referer).origin
comparación estricta con FRONTEND_URL
ForbiddenError 403
```

El documento contradice directamente al código y a `GOTCHAS.md`.

### Severidad

```txt
IMPORTANTE
```

### Impacto

Para un proyecto que trabaja con agentes IA, esto puede hacer que un agente vuelva a implementar el comportamiento viejo e inseguro (`startsWith`) o cambie 403 a 401 por seguir documentación stale.

### Fix requerido

Actualizar `AUTENTICACION.md`:

```txt
requireTrustedOrigin(req, res, next)
  → Si método es GET/HEAD/OPTIONS → next()
  → Lee header Origin
  → Si Origin existe y es exactamente FRONTEND_URL → next()
  → Si Origin existe y no coincide → ForbiddenError 403
  → Si Origin no existe, parsea Referer con new URL(referer).origin
  → Si refererOrigin === FRONTEND_URL → next()
  → Si no cumple → ForbiddenError 403
```

Eliminar referencias a `startsWith` y a `AuthError 401` para CSRF.

---

## IMP-2 — `configuracion.csrf.test.js` tiene comentarios y nombres de tests que siguen diciendo 401

### Archivo

```txt
backend/tests/configuracion.csrf.test.js
```

### Evidencia

Comentarios:

```txt
requireTrustedOrigin lanza AuthError (401)
Tests esperan 401
```

Nombres de tests:

```txt
PUT con Origin http://evil.com → 401
PUT con Referer http://evil.com → 401
PUT sin Origin ni Referer → 401
```

Pero las aserciones esperan correctamente:

```js
expect(res.statusCode).toBe(403);
```

### Problema

El código del test está bien, pero la descripción está mal. Esto no rompe el test, pero confunde y contradice el hardening actual.

### Severidad

```txt
IMPORTANTE BAJA
```

### Fix requerido

Actualizar comentarios y nombres:

```txt
PUT con Origin http://evil.com → 403
PUT con Referer http://evil.com → 403
PUT sin Origin ni Referer → 403
```

Eliminar el bloque de comentario que dice que el middleware lanza `AuthError`.

---

## IMP-3 — `TESTING.md` sigue diciendo 124 tests, pero el ZIP contiene 126 tests estáticos

### Archivo

```txt
DOCUMENTACION/IA/TESTING.md
```

### Evidencia

El documento dice:

```txt
Total: 9 suites, 124 tests
```

Pero el conteo estático del ZIP da:

```txt
caja.test.js: 58
cocina.controller.test.js: 9
cocina.test.js: 3
cocina.unit.test.js: 6
configuracion.controller.test.js: 14
configuracion.csrf.test.js: 8
configuracion.test.js: 7
configuracion.unit.test.js: 20
health.test.js: 1

Total estático: 126
```

### Severidad

```txt
IMPORTANTE BAJA
```

### Fix requerido

Actualizar:

```txt
Total: 9 suites, 126 tests
```

O mejor:

```txt
Total esperado actual: 126 tests.
Para conteo exacto, correr npm test.
```

---

## IMP-4 — `CORE.md` no documenta explícitamente que `updateEstadoPedido` ahora es atómico

### Archivo

```txt
DOCUMENTACION/IA/CORE.md
```

### Problema

El código ya cambió y `updateEstadoPedido` usa transacción + `SELECT ... FOR UPDATE`, pero `CORE.md` solo dice que cocina usa la state machine vía `updateEstadoPedido`.

No explica la parte importante nueva:

```txt
updateEstadoPedido bloquea la fila con SELECT ... FOR UPDATE
valida bajo lock
actualiza dentro de transacción
```

### Severidad

```txt
IMPORTANTE BAJA
```

### Fix requerido

Agregar sección corta en `CORE.md`:

```txt
Cambio de estado de pedido/cocina:
updateEstadoPedido es atómico:
1. Abre transacción.
2. Bloquea pedido con SELECT ... FOR UPDATE.
3. Valida transición bajo lock.
4. Actualiza estado.
5. Commit/rollback.
```

---

## IMP-5 — `limpiarPedidosDeTest` todavía puede borrar pedidos terminales sin reponer stock

### Archivo

```txt
backend/tests/caja.test.js
```

### Evidencia

El cleanup ahora usa `RUN_ID`, lo cual está bien:

```js
SELECT id, estado_pedido FROM pedido WHERE nombre_cliente LIKE ?
[`${RUN_ID}%`]
```

Pero si encuentra pedidos en estado terminal:

```txt
listo
entregado
```

solo hace:

```txt
console.warn
intenta cancelWithTransaction
si falla, sigue
DELETE directo
```

### Problema

Si un test deja un pedido terminal con stock descontado, el `DELETE` directo borra el pedido y sus detalles sin reponer stock.

El prompt 40 dice que se considera aceptable para tests, pero técnicamente sigue siendo un riesgo de contaminación de DB si un test deja un pedido terminal.

### Severidad

```txt
IMPORTANTE MEDIA
```

### Fix recomendado

Opción segura:

```txt
Si el cleanup encuentra un pedido listo/entregado del RUN_ID, debe fallar la suite.
```

Ejemplo:

```js
if (['listo', 'entregado'].includes(pedido.estado_pedido)) {
  throw new Error(
    `Cleanup encontró pedido terminal ${pedido.id}; el test debe limpiarlo explícitamente o reponer stock`
  );
}
```

Opción alternativa:

```txt
Implementar una reposición manual segura para pedidos terminales antes del DELETE.
```

Mi recomendación: **fallar la suite**. Si un test deja terminales, es un bug de test.

---

## IMP-6 — `origin.middleware.js` compara contra `environments.frontendUrl` sin normalizar

### Archivo

```txt
backend/src/api/middlewares/origin.middleware.js
backend/src/api/config/environments.js
```

### Evidencia

El middleware usa:

```js
const trustedOrigin = environments.frontendUrl;
```

Luego compara:

```js
origin === trustedOrigin
refererOrigin === trustedOrigin
```

### Problema

Esto funciona si `FRONTEND_URL` está configurado como origin puro:

```txt
https://kermingo.vercel.app
```

Pero puede fallar si alguien configura:

```txt
https://kermingo.vercel.app/
https://kermingo.vercel.app/admin
```

`new URL(referer).origin` devuelve:

```txt
https://kermingo.vercel.app
```

sin path ni slash final.

### Severidad

```txt
MEDIA / ROBUSTEZ
```

No es una vulnerabilidad directa, pero puede romper producción por configuración levemente distinta.

### Fix recomendado

Normalizar también el trusted origin:

```js
const trustedOrigin = safeOriginFromUrl(environments.frontendUrl) || environments.frontendUrl;
```

Mejor aún, normalizar `FRONTEND_URL` una sola vez en `environments.js`.

Tests recomendados:

```txt
FRONTEND_URL con slash final sigue permitiendo Origin correcto
FRONTEND_URL con path no rompe comparación de origin
```

---

# 4. Cosas bien aplicadas

## OK-1 — `safeOriginFromUrl` está implementado correctamente

### Archivo

```txt
backend/src/api/middlewares/origin.middleware.js
```

### Evidencia

```js
function safeOriginFromUrl(value) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}
```

### Veredicto

```txt
BIEN APLICADO
```

- Un `Referer` como `https://kermingo.vercel.app.evil.com/path` se parsea como origin `https://kermingo.vercel.app.evil.com`.
- No coincide con `https://kermingo.vercel.app`.
- URLs inválidas devuelven `null`.
- `file:` o `data:` no deberían coincidir con `FRONTEND_URL`.

---

## OK-2 — `requireTrustedOrigin` ya no usa `startsWith`

### Archivo

```txt
backend/src/api/middlewares/origin.middleware.js
```

### Evidencia

No hay uso de:

```txt
referer.startsWith(...)
```

El flujo actual es:

```js
if (origin && origin === trustedOrigin) return next();

const refererOrigin = referer ? safeOriginFromUrl(referer) : null;

if (!origin && refererOrigin === trustedOrigin) return next();

return next(new ForbiddenError('Origen no permitido'));
```

### Veredicto

```txt
BIEN APLICADO
```

Además, si `Origin` existe pero es inválido, no se permite salvarlo con `Referer` válido. Esto es correcto.

---

## OK-3 — Los tests CSRF nuevos cubren el bug original

### Archivo

```txt
backend/tests/configuracion.csrf.test.js
```

### Evidencia

Existe test para:

```txt
Referer que empieza igual pero dominio distinto → 403
```

Con patrón:

```js
const maliciousReferer = `${ORIGIN}.evil.com/admin/configuracion-tienda`;
```

También existe test para:

```txt
Origin inválido aunque Referer sea válido → 403
```

### Veredicto

```txt
BIEN APLICADO
```

Estos dos tests cubren exactamente el bug de `startsWith` y la prioridad correcta de `Origin`.

---

## OK-4 — `updateEstadoPedido` ahora es atómico

### Archivo

```txt
backend/src/api/models/pedido.model.js
```

### Evidencia

Usa:

```txt
pool.getConnection()
beginTransaction()
SELECT id, estado_pedido FROM pedido WHERE id = ? FOR UPDATE
validación bajo lock
UPDATE dentro de la transacción
commit
rollback
release en finally
```

### Veredicto

```txt
BIEN APLICADO
```

Esto corrige la carrera de cocina detectada anteriormente.

---

## OK-5 — `pedidoQuerySchema` termina en `.strict()`

### Archivo

```txt
backend/src/api/schemas/pedido.schema.js
```

### Evidencia

```js
export const pedidoQuerySchema = z.object({
  ...
}).strict();
```

### Veredicto

```txt
BIEN APLICADO
```

---

## OK-6 — `findAllAdmin` usa `solo_pagos_pendientes === true`

### Archivo

```txt
backend/src/api/models/pedido.model.js
```

### Evidencia

```js
if (filters.solo_pagos_pendientes === true) {
  conditions.push("AND p.estado_pago IN ('pendiente','rechazado')");
  conditions.push("AND p.estado_pedido != 'cancelado'");
} else if (filters.estado_pago) {
  ...
}
```

### Veredicto

```txt
BIEN APLICADO
```

Esto evita que un string `'false'` active el filtro accidentalmente si el modelo se llama desde otro lugar.

---

## OK-7 — Cleanup de `caja.test.js` ya usa `RUN_ID`

### Archivo

```txt
backend/tests/caja.test.js
```

### Evidencia

```js
const RUN_ID = `TEST-B6-2-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

SELECT id, estado_pedido FROM pedido WHERE nombre_cliente LIKE ?
[`${RUN_ID}%`]
```

### Veredicto

```txt
BIEN APLICADO, con observación
```

Ya no limpia `TEST-%` global, pero todavía hay que mejorar el manejo de pedidos terminales.

---

## OK-8 — Hay un solo `afterAll(pool.end())` en `caja.test.js`

### Archivo

```txt
backend/tests/caja.test.js
```

### Evidencia

Hay un único bloque final:

```js
afterAll(async () => {
  try { await pool.end(); } catch (_) { /* pool ya cerrado por otra suite */ }
});
```

### Veredicto

```txt
BIEN APLICADO
```

Hay varios `afterAll` intermedios para limpieza por suite, pero solo uno cierra el pool. Eso está bien.

---

## OK-9 — Deuda de promos documentada

### Archivo

```txt
DOCUMENTACION/IA/GOTCHAS.md
```

### Evidencia

Existe sección:

```txt
11. Cancelación/edición de promos depende de la composición actual de combo_producto
```

Describe el riesgo y propone opciones:

```txt
No permitir modificar componentes con ventas asociadas
Guardar snapshot de componentes
Tabla de movimientos de stock
```

### Veredicto

```txt
BIEN APLICADO
```

---

# 5. Respuestas a preguntas específicas del prompt 40

## 5.1 — ¿El fix CRIT-1 cierra la vulnerabilidad de Referer con prefijo engañoso?

```txt
Sí, la cierra para el caso auditado.
```

`new URL('https://kermingo.vercel.app.evil.com/path').origin` devuelve:

```txt
https://kermingo.vercel.app.evil.com
```

No devuelve:

```txt
https://kermingo.vercel.app
```

Por lo tanto, ya no pasa por prefijo.

Edge cases:

- `file://...` devuelve origin `"null"` y no coincide.
- `data:` devuelve `"null"` o puede no parsear según caso; no coincide.
- URLs sin protocolo entran al `catch` y devuelven `null`.
- URL con usuario tipo `https://kermingo.vercel.app@evil.com` tiene origin `https://evil.com`, no coincide.

La mejora pendiente es normalizar `FRONTEND_URL` con `new URL(FRONTEND_URL).origin`.

---

## 5.2 — ¿`updateEstadoPedido` es verdaderamente atómico ahora?

```txt
Sí.
```

El patrón:

```txt
beginTransaction
SELECT ... FOR UPDATE
validar bajo lock
UPDATE
commit
rollback en catch
release en finally
```

es correcto.

`conn.release()` después de `rollback()` es seguro: devuelve la conexión al pool. Lo importante es no liberarla antes del rollback/commit, y el código no lo hace.

---

## 5.3 — ¿El cleanup de tests es seguro con `RUN_ID`?

```txt
Parcial.
```

Lo positivo:

- afecta solo pedidos del run actual,
- ya no usa `TEST-%`,
- cierra pool una sola vez.

Lo pendiente:

- si un test deja pedido terminal, el cleanup lo borra sin reponer stock.

El `console.warn` no es suficiente si el objetivo es proteger la DB de test. Debería fallar la suite o reponer stock manualmente antes del delete.

---

## 5.4 — ¿Los nuevos tests CSRF ejercitan los casos correctos?

```txt
Sí.
```

Cubren:

- Referer con prefijo engañoso.
- Origin inválido con Referer válido.
- Origin confiable.
- Origin hostil.
- Referer confiable.
- Referer hostil.
- Sin Origin/Referer.
- GET con Origin hostil.

Mejora opcional:

```txt
FRONTEND_URL con slash final
Referer inválido no parseable
Referer con usuario @evil.com
Referer con puerto diferente
```

---

## 5.5 — ¿`pedidoQuerySchema.strict()` rompe algo existente?

```txt
No debería.
```

El schema incluye:

```txt
page
limit
estado_pedido
estado_pago
metodo_pago
origen
buscar
solo_pagos_pendientes
```

Mientras el frontend use esos campos, no rompe. Si el frontend manda parámetros extra, ahora va a recibir error de validación, lo cual es correcto.

---

## 5.6 — ¿La documentación sigue alineada después del hardening?

```txt
Parcial.
```

Están bien:

- `GOTCHAS.md`
- `API.md`
- gran parte de `CORE.md`
- código y tests de CSRF

Quedan desactualizados:

- `AUTENTICACION.md`
- comentarios/nombres en `configuracion.csrf.test.js`
- conteo en `TESTING.md`
- falta mencionar atomicidad de `updateEstadoPedido` en `CORE.md`

---

## 5.7 — ¿Quedan vulnerabilidades o inconsistencias post-B6.2.3?

Sí, pero no son bloqueantes grandes de lógica de caja:

```txt
- FRONTEND_URL debería normalizarse antes de comparar.
- Cleanup de tests terminales puede dejar stock contaminado.
- AUTENTICACION.md contradice el middleware actual.
- TESTING.md dice 124 tests en vez de 126.
```

---

# 6. Checklist de corrección final

Antes de B6.3 recomiendo cerrar:

```txt
[ ] Actualizar AUTENTICACION.md para safeOriginFromUrl + ForbiddenError 403.
[ ] Actualizar comentarios y nombres de tests CSRF que dicen 401.
[ ] Actualizar TESTING.md de 124 a 126 tests.
[ ] Agregar a CORE.md que updateEstadoPedido es atómico.
[ ] Normalizar trustedOrigin con new URL(environments.frontendUrl).origin.
[ ] Ajustar cleanup de caja.test.js para fallar si quedan pedidos terminales o reponer stock manualmente.
```

---

# 7. Plan de remediación recomendado

## Fix 1 — Actualizar documentación de autenticación

### Archivo

```txt
DOCUMENTACION/IA/AUTENTICACION.md
```

### Cambio

Reemplazar la sección de `requireTrustedOrigin` por:

```txt
requireTrustedOrigin(req, res, next)
  → Si método es GET/HEAD/OPTIONS → next()
  → Lee header Origin
  → Si Origin existe y coincide exactamente con FRONTEND_URL normalizado → next()
  → Si Origin existe y no coincide → ForbiddenError 403
  → Si Origin no existe, lee Referer
  → Parsea Referer con new URL(referer).origin
  → Si refererOrigin coincide con FRONTEND_URL normalizado → next()
  → Si no cumple → ForbiddenError 403
```

---

## Fix 2 — Actualizar nombres/comentarios de tests CSRF

### Archivo

```txt
backend/tests/configuracion.csrf.test.js
```

### Cambio

Cambiar:

```txt
→ 401
AuthError
Tests esperan 401
```

por:

```txt
→ 403
ForbiddenError
Tests esperan 403
```

---

## Fix 3 — Actualizar conteo en `TESTING.md`

### Archivo

```txt
DOCUMENTACION/IA/TESTING.md
```

### Cambio

```txt
Total: 9 suites, 126 tests
```

---

## Fix 4 — Documentar `updateEstadoPedido` atómico

### Archivo

```txt
DOCUMENTACION/IA/CORE.md
```

### Cambio sugerido

```txt
Cambio de estado de pedido/cocina:

updateEstadoPedido es atómico:
1. Abre transacción.
2. Bloquea el pedido con SELECT ... FOR UPDATE.
3. Valida la transición bajo lock.
4. Actualiza el estado dentro de la transacción.
5. Hace commit o rollback.
```

---

## Fix 5 — Normalizar `trustedOrigin`

### Archivo

```txt
backend/src/api/middlewares/origin.middleware.js
```

### Cambio sugerido

```js
const trustedOrigin = safeOriginFromUrl(environments.frontendUrl) || environments.frontendUrl;
```

Esto permite tolerar:

```txt
FRONTEND_URL=https://kermingo.vercel.app/
FRONTEND_URL=https://kermingo.vercel.app/admin
```

sin romper comparación de origin.

---

## Fix 6 — Endurecer cleanup de terminales

### Archivo

```txt
backend/tests/caja.test.js
```

### Cambio recomendado

Opción A — fallar rápido:

```js
if (['listo', 'entregado'].includes(pedido.estado_pedido)) {
  throw new Error(
    `Cleanup encontró pedido terminal ${pedido.id}. El test debe restaurar stock explícitamente.`
  );
}
```

Opción B — reponer stock manualmente antes del DELETE.

Mi recomendación: **Opción A** para obligar a que cada test deje la DB consistente.

---

# 8. Orden de aplicación recomendado

```txt
1. Actualizar AUTENTICACION.md.
2. Actualizar comentarios/nombres en configuracion.csrf.test.js.
3. Actualizar TESTING.md a 126 tests.
4. Agregar bloque en CORE.md sobre updateEstadoPedido atómico.
5. Normalizar trustedOrigin en origin.middleware.js.
6. Endurecer cleanup de terminales en caja.test.js.
7. Ejecutar npm test.
8. Generar ZIP final pre-B6.3.
```

---

# 9. Prompt para OpenCode — B6.2.4 micro-limpieza pre-B6.3

```txt
Continuemos con Kermingo. La auditoría B6.2.3 post-hardening confirmó que los fixes principales están aplicados, pero detectó limpieza documental/test y un ajuste menor de robustez antes de B6.3.

# Etapa B6.2.4 — Micro-limpieza documental/test pre-B6.3

Trabajá bajo metodología SDD usando Gentle AI.

No implementar comprobantes, Google Drive, frontend ni deploy.

## Objetivo

Cerrar inconsistencias menores antes de avanzar a B6.3:

1. Actualizar DOCUMENTACION/IA/AUTENTICACION.md:
   - eliminar referencias a referer.startsWith
   - eliminar referencias a AuthError 401 para CSRF
   - documentar safeOriginFromUrl + ForbiddenError 403

2. Actualizar backend/tests/configuracion.csrf.test.js:
   - comentarios deben decir ForbiddenError/403
   - nombres de tests deben decir 403, no 401

3. Actualizar DOCUMENTACION/IA/TESTING.md:
   - total esperado: 126 tests

4. Actualizar DOCUMENTACION/IA/CORE.md:
   - documentar que updateEstadoPedido es atómico con SELECT ... FOR UPDATE

5. Ajustar origin.middleware.js:
   - normalizar trustedOrigin con safeOriginFromUrl(environments.frontendUrl) || environments.frontendUrl

6. Ajustar backend/tests/caja.test.js:
   - si cleanup encuentra pedidos listo/entregado, debe fallar la suite o reponer stock explícitamente
   - preferencia: fallar la suite para evitar contaminación de stock

## Reglas

- No tocar frontend/.
- No tocar diseno-de-landing-kermingo/.
- No cambiar state machine de pago.
- No cambiar editWithTransaction salvo que sea estrictamente necesario.
- No implementar B6.3 todavía.

## Verificación

Ejecutar:

```bash
cd backend
npm test
npm run dev
curl http://localhost:3001/api/health
```

## Resultado esperado

Responder con:

```txt
## Resultado B6.2.4 — Micro-limpieza pre-B6.3

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

Cambios documentación:
-

Cambios tests:
-

Cambios origin.middleware:
-

Resultados npm test:
-

Pendientes:
-

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
¿CRIT-1 Referer/Origin está correctamente corregido?
SÍ.

¿IMP-4 updateEstadoPedido atómico está correctamente implementado?
SÍ.

¿IMP-5/6 schema/filtro están correctamente aplicados?
SÍ.

¿IMP-1/2/3 test cleanup están corregidos?
PARCIAL. RUN_ID y pool.end están bien; terminales todavía pueden contaminar stock.

¿IMP-7 deuda de promos documentada?
SÍ.

¿B6.2.3 hardening está completo?
CASI. Falta limpieza documental/test y robustez menor.

¿Se puede avanzar a B6.3?
Técnicamente casi, pero recomiendo B6.2.4 micro-limpieza primero.
```

## Recomendación final

No hace falta otra etapa grande. Hacer una micro-etapa:

```txt
B6.2.4 — Micro-limpieza documental/test pre-B6.3
```

Después de eso, si `npm test` pasa, sí avanzaría a:

```txt
B6.3 — Comprobantes / Google Drive
```
