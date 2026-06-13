# 37 — Auditoría B6 Post-fixes con código real — Kermingo

## Contexto

Auditoría realizada sobre el ZIP:

```txt
kermingo_contexto_auditoria(1).zip
```

Este ZIP sí incluye código real del backend:

```txt
backend/src/
backend/tests/
backend/package.json
backend/.env.example
backend/src/api/database/
openspec/
DOCUMENTACION/IA/
AGENTS.md
docs/planificacion/36-PROMPT_AUDITORIA_CHATGPT_B6_POST_FIXES.md
```

## Alcance auditado

Se auditó especialmente:

- Caja / pagos.
- Cocina.
- Configuración de tienda.
- State machines.
- Seguridad por `requireAdmin` y `requireTrustedOrigin`.
- Base de datos.
- Tests incluidos en el ZIP.
- Consistencia entre documentación, OpenSpec y código real.

## Limitaciones

No ejecuté `npm test` porque el ZIP no incluye `node_modules` ni una base MySQL activa dentro del entorno de auditoría. La revisión es estática, leyendo código, SQL, specs y documentación.

---

# 1. Resumen ejecutivo

El ZIP nuevo mejora respecto al anterior porque ahora sí trae `backend/src/` y tests. Sin embargo, **el código real incluido NO coincide con el estado post-fixes que describe la documentación**.

La documentación afirma que B6.2 y B6.2.1 tienen:

- máquina de estados de pago validada,
- filtro `solo_pagos_pendientes`,
- edición transaccional de pedidos,
- tests de caja,
- hardening de pagos,
- correcciones de caja post-auditoría.

Pero en el código real del ZIP:

- `updateEstadoPago` hace un `UPDATE` directo sin validar transición.
- No existe `PAGO_TRANSITIONS`.
- No existe `validatePaymentTransition`.
- No existe filtro `solo_pagos_pendientes`.
- No existe `PUT /api/admin/pedidos/:id`.
- No existe `editWithTransaction`.
- No existe `backend/tests/caja.test.js`.
- `updateEstadoPagoSchema` ni siquiera permite `comprobante_subido`.
- OpenSpec documenta funcionalidades que el código no tiene.

## Veredicto corto

```txt
Estado documental: avanzado
Estado real del código del ZIP: incompleto respecto a B6.2/B6.2.1
¿Listo para B6.3? NO
¿Conviene avanzar a frontend/deploy? NO
Siguiente paso: integrar/recuperar ramas reales de B6.2/B6.2.1 o corregir el backend actual antes de seguir
```

Este ZIP parece representar una mezcla entre:

```txt
backend base + cocina + configuración
```

pero no contiene la implementación real completa de:

```txt
B6.2 Caja
B6.2 Edición transaccional
B6.2.1 Hardening pagos/caja
```

---

# 2. Hallazgos críticos

## CRIT-1 — El código real no implementa la máquina de estados de pago documentada

### Archivo

```txt
backend/src/api/models/pedido.model.js
```

### Evidencia

La función actual es:

```js
export async function updateEstadoPago(pool, id, nuevoEstado) {
  const [result] = await pool.query(
    'UPDATE pedido SET estado_pago = ? WHERE id = ?',
    [nuevoEstado, id]
  );
  return result.affectedRows;
}
```

### Problema

No valida:

- estado actual,
- transición permitida,
- método de pago,
- pedido cancelado,
- estado terminal `pagado`,
- carrera entre dos requests concurrentes.

La documentación/OpenSpec dice que debería existir:

```txt
PAGO_TRANSITIONS
validatePaymentTransition
state machine forward-safe
pagado terminal
rechazo de transición nula
```

Pero en el código real no aparece.

### Impacto

Un admin podría hacer:

```txt
pagado → pendiente
pagado → rechazado
efectivo → comprobante_subido
cancelado → pagado
```

si el schema lo permite o si se llama el endpoint con valores válidos para el schema.

También puede haber race condition:

```txt
Request A: pendiente → pagado
Request B: pendiente → rechazado
```

Sin bloqueo ni condición atómica, el último UPDATE gana.

### Severidad

```txt
CRÍTICA
```

### Fix requerido

Implementar una función transaccional o atómica.

Ejemplo recomendado:

```js
export const PAGO_TRANSITIONS = {
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

export function validatePaymentTransition(from, to, metodoPago) {
  if (from === to) return false;
  return (PAGO_TRANSITIONS[metodoPago]?.[from] || []).includes(to);
}

export async function updateEstadoPago(pool, id, nuevoEstado) {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT id, estado_pago, estado_pedido, metodo_pago
       FROM pedido
       WHERE id = ?
       FOR UPDATE`,
      [id]
    );

    const pedido = rows[0];

    if (!pedido) {
      await conn.rollback();
      return 0;
    }

    if (pedido.estado_pedido === 'cancelado') {
      await conn.rollback();
      return -2;
    }

    if (!validatePaymentTransition(pedido.estado_pago, nuevoEstado, pedido.metodo_pago)) {
      await conn.rollback();
      return -1;
    }

    const [result] = await conn.query(
      'UPDATE pedido SET estado_pago = ? WHERE id = ?',
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

## CRIT-2 — El controller de pago no maneja transiciones inválidas

### Archivo

```txt
backend/src/api/controllers/pedido.controller.js
```

### Evidencia

La función actual:

```js
export async function cambiarPago(req, res, next) {
  try {
    const pool = getPool();
    const result = await updateEstadoPago(pool, req.params.id, req.body.estado_pago);
    if (result === 0) throw new NotFoundError('Pedido no encontrado');
    const pedido = await findById(pool, req.params.id);
    return respuestaExitosa(res, pedido, 'Estado de pago actualizado correctamente');
  } catch (err) {
    next(err);
  }
}
```

### Problema

No contempla:

```txt
result === -1 → transición inválida
result === -2 → pedido cancelado
```

Si el modelo se corrige para devolver esos valores, el controller debe mapearlos.

### Severidad

```txt
CRÍTICA
```

### Fix requerido

```js
if (result === 0) throw new NotFoundError('Pedido no encontrado');
if (result === -1) throw new ValidationError('Transición de estado de pago no válida');
if (result === -2) throw new ValidationError('No se puede modificar el pago de un pedido cancelado');
```

---

## CRIT-3 — `updateEstadoPagoSchema` no permite `comprobante_subido`

### Archivo

```txt
backend/src/api/schemas/pedido.schema.js
```

### Evidencia

Schema actual:

```js
export const updateEstadoPagoSchema = z.object({
  estado_pago: z.enum(['pendiente', 'pagado', 'rechazado']),
}).strict();
```

### Problema

El enum de la base sí permite:

```txt
pendiente
comprobante_subido
pagado
rechazado
```

La documentación de caja y B6.3 depende de:

```txt
comprobante_subido
```

Pero el endpoint admin no puede setearlo.

### Impacto

El flujo futuro de comprobantes queda bloqueado desde el schema.

### Severidad

```txt
CRÍTICA
```

### Fix requerido

```js
export const updateEstadoPagoSchema = z.object({
  estado_pago: z.enum(['pendiente', 'comprobante_subido', 'pagado', 'rechazado']),
}).strict();
```

Luego la state machine debe decidir cuándo es válido cada valor.

---

## CRIT-4 — No existe filtro `solo_pagos_pendientes`

### Archivos

```txt
backend/src/api/models/pedido.model.js
backend/src/api/schemas/pedido.schema.js
openspec/specs/cashier-operations/spec.md
```

### Evidencia en código real

En `findAllAdmin` se procesan:

```txt
estado_pedido
estado_pago
metodo_pago
origen
buscar
page
limit
```

Pero no aparece:

```txt
solo_pagos_pendientes
```

En `pedidoQuerySchema` tampoco aparece.

### Contradicción documental

OpenSpec documenta:

```txt
GET /api/admin/pedidos?solo_pagos_pendientes=true
```

con reglas:

```txt
estado_pago IN ('pendiente','rechazado')
estado_pedido != 'cancelado'
```

Pero el código real no lo implementa.

### Severidad

```txt
CRÍTICA
```

### Fix requerido

En schema:

```js
solo_pagos_pendientes: z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional(),
```

o con coerción booleana controlada.

En modelo:

```js
if (filters.solo_pagos_pendientes === true) {
  conditions.push("AND p.estado_pago IN ('pendiente', 'rechazado')");
  conditions.push("AND p.estado_pedido != 'cancelado'");
}
```

Decisión funcional recomendada:

```txt
No limitar por origen='caja' por defecto.
El filtro debe mostrar todo pedido accionable para cobro, incluyendo online.
```

---

## CRIT-5 — No existe edición transaccional de pedidos de caja

### Archivos

```txt
backend/src/api/routes/pedido.routes.js
backend/src/api/controllers/pedido.controller.js
backend/src/api/models/pedido.model.js
backend/src/api/schemas/pedido.schema.js
```

### Evidencia

No existe ruta:

```txt
PUT /api/admin/pedidos/:id
```

No existe controller:

```txt
editar
```

No existe modelo:

```txt
editWithTransaction
```

No existe schema:

```txt
editPedidoSchema
```

### Contradicción documental

La documentación afirma que B6.2 PR2 implementó:

```txt
PUT /api/admin/pedidos/:id
edición transaccional
reconciliación de stock
rollback por stock insuficiente
compatibilidad con promos/combos
```

Pero el código real del ZIP no lo tiene.

### Severidad

```txt
CRÍTICA
```

### Fix requerido

Hay dos posibilidades:

1. **El ZIP no corresponde a la rama correcta.**  
   En ese caso, generar un ZIP desde la rama real que tenga PR 4 / edición transaccional.

2. **La feature no está integrada.**  
   En ese caso, implementar/mergear la edición antes de avanzar.

No se puede auditar B6.2 PR2 con este ZIP porque la funcionalidad no está.

---

## CRIT-6 — No existe `backend/tests/caja.test.js`

### Ruta esperada

```txt
backend/tests/caja.test.js
```

### Evidencia

El ZIP contiene tests de:

```txt
configuracion
cocina
health
```

pero no contiene `caja.test.js`.

### Contradicción documental

OpenSpec y el prompt dicen que existe una suite de caja con:

```txt
36 tests
state machine
PATCH pago
filter unpaid
edit integration
cleanup seguro
```

Pero esa suite no está en el ZIP.

### Severidad

```txt
CRÍTICA
```

### Fix requerido

Verificar si el archivo existe en otra rama o quedó sin commitear.

Antes de seguir:

```bash
git status
git branch --show-current
find backend/tests -maxdepth 1 -type f
git log --oneline -- backend/tests/caja.test.js
```

---

## CRIT-7 — OpenSpec y documentación afirman funcionalidades que el código real no tiene

### Archivos

```txt
openspec/specs/cashier-operations/spec.md
DOCUMENTACION/IA/API.md
DOCUMENTACION/IA/TESTING.md
docs/planificacion/36-PROMPT_AUDITORIA_CHATGPT_B6_POST_FIXES.md
```

### Evidencia

OpenSpec dice que `pedido.model.js` agrega:

```txt
PAGO_TRANSITIONS
validatePaymentTransition
solo_pagos_pendientes
```

También dice que existe:

```txt
backend/tests/caja.test.js
```

Pero el código real no tiene esos exports ni ese archivo.

### Severidad

```txt
CRÍTICA
```

### Impacto

Esta es la peor señal para trabajar con IA/agentes: la documentación ya no es fuente confiable porque describe una rama que no coincide con el working tree auditado.

### Fix requerido

Crear una etapa de reconciliación:

```txt
B6.2.2 — Reconciliación real de ramas, specs y código
```

Objetivo:

```txt
- Confirmar rama correcta.
- Integrar PRs reales.
- Asegurar que OpenSpec describe el código real.
- Asegurar que tests citados existen y pasan.
```

---

# 3. Hallazgos importantes

## IMP-1 — `requireTrustedOrigin` devuelve 401, pero la documentación todavía menciona 403/ForbiddenError en algunos lugares

### Archivos

```txt
backend/src/api/middlewares/origin.middleware.js
backend/src/api/utils/errors.js
DOCUMENTACION/IA/GOTCHAS.md
docs/planificacion/36-PROMPT_AUDITORIA_CHATGPT_B6_POST_FIXES.md
```

### Código actual

```js
return next(new AuthError('Origen no permitido'));
```

`AuthError` responde 401.

### Análisis

Esto no es necesariamente incorrecto, porque `GOTCHAS.md` dice que se cambió de `ForbiddenError` a `AuthError` para que el frontend lo trate como error de auth.

Pero la documentación principal del prompt todavía menciona `ForbiddenError`.

### Severidad

```txt
IMPORTANTE BAJA
```

### Fix recomendado

Unificar documentación:

```txt
Origen no confiable → AuthError 401
```

o volver al enfoque más semántico:

```txt
Origen no confiable → ForbiddenError 403
```

Mi recomendación técnica:

```txt
403 Forbidden es más correcto para CSRF/origin rechazado.
401 puede ser aceptable si el frontend lo necesita, pero debe documentarse como decisión explícita.
```

---

## IMP-2 — `pedidoQuerySchema` no es `.strict()`

### Archivo

```txt
backend/src/api/schemas/pedido.schema.js
```

### Problema

`pedidoQuerySchema` no termina en:

```js
.strict()
```

Zod por defecto suele descartar extras, y el middleware asigna `req.query = schema.parse(req.query)`, pero para consistencia con el resto de la API sería mejor dejarlo explícito.

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

## IMP-3 — `createCajaSchema` permite crear pedidos en estado `listo` o `entregado`

### Archivo

```txt
backend/src/api/schemas/pedido.schema.js
```

### Evidencia

```js
estado_pedido: z
  .enum(['recibido', 'en_preparacion', 'listo', 'entregado'])
  .default('recibido'),
```

### Análisis

Como es admin/caja puede ser útil, pero para operación real podría permitir saltar cocina y entrega.

### Severidad

```txt
MEDIA / DECISIÓN FUNCIONAL
```

### Recomendación

Definir explícitamente:

Opción A — Flexible para caja:

```txt
Caja puede crear como recibido, listo o entregado.
```

Opción B — Más seguro:

```txt
Caja solo crea como recibido; cocina avanza el estado.
```

Para el evento, si caja vende productos que se entregan en el momento, puede tener sentido permitir `entregado`, pero debería documentarse.

---

## IMP-4 — `updateEstadoPedido` tampoco es atómico

### Archivo

```txt
backend/src/api/models/pedido.model.js
```

### Evidencia

```js
const pedido = await findById(pool, id);
if (!pedido) return 0;
if (!transicionEstadoValida(pedido.estado_pedido, nuevoEstado)) return -1;

const [result] = await pool.query(
  'UPDATE pedido SET estado_pedido = ? WHERE id = ?',
  [nuevoEstado, id]
);
```

### Problema

Igual que pago, es:

```txt
SELECT → validar en memoria → UPDATE sin condición
```

### Severidad

```txt
MEDIA
```

### Fix recomendado

Usar transacción con `SELECT ... FOR UPDATE`, o `UPDATE` condicional:

```sql
UPDATE pedido
SET estado_pedido = ?
WHERE id = ?
  AND estado_pedido = ?
```

Luego validar `affectedRows`.

---

## IMP-5 — `createWithTransaction` permite que controller admin inyecte `estado_pago` y `estado_pedido`

### Archivo

```txt
backend/src/api/models/pedido.model.js
```

### Evidencia

```js
data.estado_pago || 'pendiente'
data.estado_pedido || 'recibido'
```

### Análisis

Para la ruta pública no es problema porque `createPedidoSchema.strict()` rechaza esos campos.

Para caja sí es intencional porque `createCajaSchema` los permite.

### Severidad

```txt
BAJA / DISEÑO INTENCIONAL
```

### Recomendación

Documentar que `createWithTransaction` no debe llamarse con datos sin validar y que depende de schemas estrictos.

---

## IMP-6 — La documentación de testing infla cobertura respecto al ZIP

### Archivos

```txt
DOCUMENTACION/IA/TESTING.md
docs/planificacion/36-PROMPT_AUDITORIA_CHATGPT_B6_POST_FIXES.md
```

### Problema

La documentación habla de:

```txt
~143 tests
caja.test.js
pedido model ~60
integration API ~55
```

Pero el ZIP actual trae tests de:

```txt
configuracion
cocina
health
```

No trae `caja.test.js`.

### Severidad

```txt
ALTA DOCUMENTAL
```

### Fix requerido

Actualizar documentación o corregir ZIP/rama.

---

# 4. Validación de cosas que sí están bien aplicadas

## OK-1 — Schema SQL recuperó robustez

### Archivo

```txt
backend/src/api/database/schema.sql
```

### Evidencia positiva

Se observan:

```sql
DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

en las tablas.

También aparecen constraints como:

```sql
CHECK (precio >= 0)
CHECK (stock_actual IS NULL OR stock_actual >= 0)
CHECK (stock_minimo_alerta >= 0)
CHECK (cantidad > 0)
CHECK (total >= 0)
CHECK (subtotal >= 0)
```

Además:

```sql
tipo ENUM('comida', 'bebida', 'promo')
numero VARCHAR(20) NULL UNIQUE
CONSTRAINT fk_pedido_comprobante
CONSTRAINT chk_pedido_comprobante_efectivo
```

### Veredicto

```txt
BIEN APLICADO
```

---

## OK-2 — Seed alineado con promos

### Archivo

```txt
backend/src/api/database/seed.sql
```

### Evidencia positiva

```txt
Pizza sin TACC → stock_actual = 0
Helados palito → stock_actual = 0
Combo merienda → tipo = promo, stock_limitado = 0, stock_actual = NULL
Combo cena → tipo = promo, stock_limitado = 0, stock_actual = NULL
```

### Veredicto

```txt
BIEN APLICADO
```

---

## OK-3 — Stock de creación/cancelación tiene mejoras correctas

### Archivo

```txt
backend/src/api/models/pedido.model.js
```

### Evidencia positiva

En creación:

- acumula requerimientos con `Map`,
- valida promos sin componentes,
- bloquea productos con `ORDER BY id FOR UPDATE`,
- omite productos ilimitados,
- usa UPDATE defensivo.

En cancelación:

- repone componentes de promos,
- ordena IDs,
- bloquea con `ORDER BY id FOR UPDATE`,
- omite productos ilimitados.

### Veredicto

```txt
BIEN APLICADO
```

---

## OK-4 — Configuración admin tiene `requireTrustedOrigin`

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

## OK-5 — Cocina tiene state machine centralizada

### Archivos

```txt
backend/src/api/models/pedido.model.js
backend/src/api/controllers/cocina.controller.js
backend/tests/cocina.unit.test.js
backend/tests/cocina.controller.test.js
```

### Evidencia

`TRANSICIONES_VALIDAS` y `transicionEstadoValida` están en `pedido.model.js`.

`cocina.controller.js` reutiliza esa función.

Hay tests unitarios y controller tests para transiciones válidas, saltos, retrocesos y transición nula.

### Veredicto

```txt
BIEN APLICADO
```

---

## OK-6 — Dependencias críticas restauradas

### Archivo

```txt
backend/package.json
```

### Evidencia

```json
"bcrypt": "^6.0.0",
"jsonwebtoken": "^9.0.3",
"zod": "^4.4.3"
```

### Veredicto

```txt
BIEN APLICADO
```

---

# 5. Plan de remediación recomendado

## Fix 1 — Recuperar/integrar implementación real de caja B6.2

### Acción

Verificar si las features están en otra rama o quedaron fuera del ZIP.

### Comandos sugeridos

```bash
git branch --all
git status
git log --oneline -- backend/tests/caja.test.js
git log --oneline -- backend/src/api/models/pedido.model.js
git grep "PAGO_TRANSITIONS"
git grep "solo_pagos_pendientes"
git grep "editWithTransaction"
```

### Resultado esperado

Debe existir una rama o commit que contenga:

```txt
PAGO_TRANSITIONS
validatePaymentTransition
solo_pagos_pendientes
backend/tests/caja.test.js
editWithTransaction
PUT /api/admin/pedidos/:id
```

Si existe, mergear ordenadamente.

Si no existe, implementarlo.

---

## Fix 2 — Implementar state machine de pago método-aware

### Archivos

```txt
backend/src/api/models/pedido.model.js
backend/src/api/controllers/pedido.controller.js
backend/src/api/schemas/pedido.schema.js
backend/tests/caja.test.js
```

### Cambios mínimos

1. Agregar `PAGO_TRANSITIONS`.
2. Agregar `validatePaymentTransition(from, to, metodoPago)`.
3. Hacer `updateEstadoPago` transaccional con `SELECT ... FOR UPDATE`.
4. Bloquear pedidos cancelados.
5. Mapear `-1` y `-2` en controller.
6. Permitir `comprobante_subido` en schema.
7. Agregar tests.

---

## Fix 3 — Implementar filtro `solo_pagos_pendientes`

### Archivos

```txt
backend/src/api/schemas/pedido.schema.js
backend/src/api/models/pedido.model.js
backend/tests/caja.test.js
```

### Cambio en schema

```js
solo_pagos_pendientes: z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional(),
```

### Cambio en modelo

```js
if (filters.solo_pagos_pendientes === true) {
  conditions.push("AND p.estado_pago IN ('pendiente', 'rechazado')");
  conditions.push("AND p.estado_pedido != 'cancelado'");
}
```

---

## Fix 4 — Implementar edición transaccional de caja o confirmar rama correcta

### Archivos esperados

```txt
backend/src/api/models/pedido.model.js
backend/src/api/controllers/pedido.controller.js
backend/src/api/routes/pedido.routes.js
backend/src/api/schemas/pedido.schema.js
backend/tests/caja.test.js
```

### Reglas esperadas

```txt
Solo editable si:
- pedido existe
- origen = caja
- estado_pedido no es cancelado ni entregado
```

La edición debe:

```txt
- correr en transacción
- bloquear pedido con FOR UPDATE
- restaurar stock anterior lógicamente
- calcular requerimientos nuevos
- bloquear productos con ORDER BY id FOR UPDATE
- validar stock con reposición aplicada
- aplicar delta neto
- reescribir pedido_detalle
- recalcular total
```

---

## Fix 5 — Agregar o recuperar `backend/tests/caja.test.js`

### Cobertura mínima

```txt
payment state machine
efectivo no permite comprobante_subido
transferencia permite comprobante_subido
pagado terminal
cancelado no permite cambio de pago
solo_pagos_pendientes
edición transaccional
rollback por stock insuficiente
producto ilimitado
promo/componentes
cleanup seguro
pool.end()
```

---

## Fix 6 — Alinear OpenSpec con código real

### Problema

OpenSpec hoy afirma cosas que el código no tiene.

### Acción

Después de implementar o mergear, revisar:

```txt
openspec/specs/cashier-operations/spec.md
DOCUMENTACION/IA/API.md
DOCUMENTACION/IA/TESTING.md
docs/planificacion/36-PROMPT_AUDITORIA_CHATGPT_B6_POST_FIXES.md
```

### Regla

```txt
OpenSpec debe describir el código real, no una rama imaginada o no integrada.
```

---

# 6. Orden de aplicación sugerido

1. **Verificar rama correcta.**  
   Antes de tocar código, confirmar si el ZIP salió de la rama equivocada.

2. **Buscar commits/ramas con caja real.**  
   Usar `git grep` y `git log`.

3. **Si existe la rama correcta, mergear/integrar.**  
   Evitar reimplementar algo ya hecho.

4. **Si no existe, implementar caja B6.2 completa.**

5. **Agregar tests reales de caja.**

6. **Ejecutar `npm test`.**

7. **Actualizar OpenSpec y documentación.**

8. **Generar nuevo ZIP y auditar de nuevo.**

---

# 7. Prompt recomendado para OpenCode

Copiar y pegar este prompt desde la raíz del proyecto.

```txt
Continuemos con Kermingo. La auditoría del ZIP kermingo_contexto_auditoria(1).zip detectó que la documentación dice que B6.2/B6.2.1 están implementadas, pero el código real incluido NO contiene las piezas principales de caja.

# Etapa B6.2.2 — Reconciliación real de caja, specs y código

Trabajá bajo metodología SDD usando Gentle AI.

No avanzar a B6.3, comprobantes, Google Drive, frontend ni deploy.

## Objetivo

Corregir la desalineación entre documentación/OpenSpec y código real.

El código actual del ZIP NO contiene:

- PAGO_TRANSITIONS
- validatePaymentTransition
- filtro solo_pagos_pendientes
- PUT /api/admin/pedidos/:id
- editWithTransaction
- backend/tests/caja.test.js

Pero OpenSpec/documentación dicen que sí existen.

## Paso 1 — Verificar rama correcta

Ejecutá:

```bash
git branch --show-current
git status
git branch --all
git log --oneline -- backend/tests/caja.test.js
git grep "PAGO_TRANSITIONS"
git grep "validatePaymentTransition"
git grep "solo_pagos_pendientes"
git grep "editWithTransaction"
```

Si esas piezas existen en otra rama, NO reimplementes todavía. Informá la rama/commit y proponé merge ordenado.

## Paso 2 — Si no existen, implementar

Implementar B6.2/B6.2.1 real:

1. State machine de pago método-aware.
2. updateEstadoPago transaccional con SELECT FOR UPDATE.
3. Bloqueo de pago en pedidos cancelados.
4. updateEstadoPagoSchema con comprobante_subido.
5. Controller con manejo -1 y -2.
6. Filtro solo_pagos_pendientes.
7. PUT /api/admin/pedidos/:id.
8. editWithTransaction con reconciliación transaccional.
9. Tests de caja completos.
10. Actualizar OpenSpec para que coincida con código real.

## Reglas de pago esperadas

efectivo:
- pendiente -> pagado
- pagado terminal

transferencia:
- pendiente -> pagado | comprobante_subido
- comprobante_subido -> pagado | rechazado
- rechazado -> pendiente | comprobante_subido
- pagado terminal

Transición nula:
- siempre inválida

Pedido cancelado:
- no permite modificar pago

## Reglas de filtro esperado

GET /api/admin/pedidos?solo_pagos_pendientes=true:

- incluye estado_pago pendiente y rechazado
- excluye pagado
- excluye estado_pedido cancelado
- no necesariamente filtra origen=caja, porque caja puede cobrar pedidos online

## Reglas de edición esperada

PUT /api/admin/pedidos/:id:

Solo editable si:
- pedido existe
- origen = caja
- estado_pedido no es cancelado ni entregado

Debe:
- correr en transacción
- bloquear pedido con FOR UPDATE
- reconciliar stock anterior y nuevo
- soportar productos limitados, ilimitados y promos
- usar ORDER BY id FOR UPDATE
- rollback por stock insuficiente
- recalcular total
- reescribir pedido_detalle
- mantener coherencia metodo_pago/estado_pago

## Tests requeridos

Crear o recuperar backend/tests/caja.test.js con cobertura de:

- state machine pago
- efectivo no permite comprobante_subido/rechazado
- transferencia permite comprobante_subido
- pagado terminal
- cancelado no permite modificar pago
- solo_pagos_pendientes
- editar caja OK
- editar online rechazado
- editar cancelado/entregado rechazado
- rollback por stock insuficiente
- producto ilimitado
- promo/componentes
- cleanup seguro con RUN_ID único
- pool.end()

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
## Resultado B6.2.2 — Reconciliación caja/specs/código

Rama actual:
-

Piezas encontradas en otra rama:
-

Archivos modificados:
-

Implementación de pagos:
-

Implementación de filtro pendientes:
-

Implementación de edición transaccional:
-

Tests agregados:
-

OpenSpec actualizado:
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

No avances a B6.3 hasta que Marcos apruebe.
```

---

# 8. Planning B6.3 y B7

## Condición previa obligatoria

No empezar B6.3 hasta que exista una rama integrada donde:

```txt
- Código real y OpenSpec coinciden.
- Caja B6.2 funciona.
- Edit transaccional existe.
- Tests de caja existen y pasan.
- npm test pasa.
```

## B6.3 — Comprobantes / Drive

Una vez corregido B6.2:

```txt
1. Definir tabla final: archivo_drive.
2. Agregar Drive service.
3. Agregar Multer memoryStorage con límite de tamaño.
4. Validar MIME: jpg/png/webp/pdf.
5. POST /api/pedidos transferencia con comprobante.
6. Guardar metadata en archivo_drive.
7. Setear estado_pago = comprobante_subido.
8. Endpoint admin para ver comprobante.
9. PATCH pago comprobante_subido -> pagado/rechazado.
10. Tests de transferencia con y sin comprobante.
```

## B7 — Frontend

Orden recomendado:

```txt
B7.1 Cliente API + env
B7.2 Menú público desde API
B7.3 Carrito localStorage
B7.4 Checkout efectivo
B7.5 Checkout transferencia con upload
B7.6 Ticket / seguimiento
B7.7 Login admin
B7.8 Caja rápida
B7.9 Cocina
B7.10 Configuración tienda
B7.11 Comprobantes
B7.12 Productos
B7.13 Reportes
```

---

# 9. Veredicto final

```txt
¿El ZIP ahora incluye código real? SÍ.
¿El código real coincide con la documentación post-fixes? NO.
¿B6.2 está realmente integrada en este ZIP? NO.
¿B6.2.1 está realmente integrada en este ZIP? NO.
¿Se puede avanzar a B6.3? NO.
```

## Siguiente paso recomendado

```txt
B6.2.2 — Reconciliación real de caja, specs y código
```

Esta etapa debe primero determinar si las funcionalidades faltantes están en otra rama o quedaron sin integrar. Si están en otra rama, merge ordenado. Si no están, implementación real.

Solo después de eso conviene auditar nuevamente y recién ahí avanzar a:

```txt
B6.3 — Comprobantes / Google Drive
```
