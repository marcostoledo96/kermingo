# 35 — Auditoría B6.2 Caja — Veredicto ChatGPT

## Contexto

Kermingo es el backend de un evento scout recaudatorio del 20 de junio de 2026.

Stack backend:

```txt
Node.js
Express
MySQL
mysql2/promise
ESM
JWT en cookie httpOnly
bcrypt
Zod
CORS con credentials
Jest + Supertest
```

La etapa auditada es:

```txt
B6.2 — Caja
```

Slices encadenadas auditadas:

```txt
PR 1 — feature/backend-b6-2-caja
Pagos y filtro de pendientes

PR 2 — feature/backend-b6-2-caja-edicion
Edición transaccional de pedidos
```

PRs abiertas:

```txt
PR 3: https://github.com/marcostoledo96/kermingo/pull/3
PR 4: https://github.com/marcostoledo96/kermingo/pull/4
```

Base de la cadena:

```txt
feature/backend-b6-1-configuracion
```

---

# Resumen ejecutivo

B6.2 está **bastante bien implementada** en la parte de stock y edición transaccional. La reconciliación de stock en `PUT /api/admin/pedidos/:id` está razonablemente sólida:

- bloquea pedido
- calcula reposición
- calcula nuevos requerimientos
- bloquea productos con `FOR UPDATE`
- valida stock con reposición aplicada
- aplica delta neto
- reescribe `pedido_detalle`
- recalcula total

Pero **no recomiendo avanzar todavía a B6.3 — Comprobantes/Drive** sin hacer una etapa corta B6.2.1.

El mayor problema está en la máquina de estados de pago y en la consistencia entre:

```txt
metodo_pago
estado_pago
estado_pedido
```

## Veredicto corto

```txt
B6.2 stock/edición: bien encaminado
B6.2 pagos: funcional, pero incompleto para producción
Avanzar a B6.3: NO todavía
Siguiente paso: B6.2.1 — Hardening de pagos/caja/tests
```

---

# Errores críticos

## CRIT-1 — `updateEstadoPago` no es atómico y puede violar el estado terminal `pagado`

### Archivo

```txt
backend/src/api/models/pedido.model.js
```

### Problema

La función actual sigue este patrón:

```txt
SELECT estado actual
↓
validación en memoria
↓
UPDATE sin condición sobre estado anterior
```

Ejemplo conceptual:

```js
export async function updateEstadoPago(pool, id, nuevoEstado) {
  const pedido = await findById(pool, id);
  if (!pedido) return 0;
  if (!validatePaymentTransition(pedido.estado_pago, nuevoEstado)) return -1;

  const [result] = await pool.query(
    'UPDATE pedido SET estado_pago = ? WHERE id = ?',
    [nuevoEstado, id]
  );

  return result.affectedRows;
}
```

### Riesgo

Con dos admins o dos requests simultáneos:

```txt
Request A lee pendiente → quiere pagado
Request B lee pendiente → quiere comprobante_subido
A actualiza a pagado
B actualiza a comprobante_subido
```

Resultado final:

```txt
pagado deja de ser terminal
```

Esto contradice la máquina de estados, donde `pagado` debería ser terminal.

### Severidad

```txt
CRÍTICA
```

### Fix recomendado

Hacer el cambio de estado en una transacción con `SELECT ... FOR UPDATE`.

Ejemplo:

```js
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

## CRIT-2 — La máquina de pago no considera `metodo_pago`

### Archivo

```txt
backend/src/api/models/pedido.model.js
```

### Problema

La máquina actual se basa solo en `estado_pago`.

Ejemplo:

```js
export const PAGO_TRANSITIONS = {
  pendiente: ['pagado', 'comprobante_subido'],
  comprobante_subido: ['pagado', 'rechazado'],
  rechazado: ['pendiente'],
  pagado: [],
};
```

Esto permite que un pedido con:

```txt
metodo_pago = efectivo
```

pase a:

```txt
estado_pago = comprobante_subido
```

o incluso a estados propios de transferencia.

### Riesgo

Un pedido en efectivo no debería pasar a:

```txt
comprobante_subido
rechazado
```

porque esos estados pertenecen al flujo de transferencia.

### Severidad

```txt
CRÍTICA
```

### Fix recomendado

Validar la transición según `metodo_pago`.

Ejemplo:

```js
export function validatePaymentTransition(from, to, metodoPago) {
  if (from === to) return true;

  const transitionsByMethod = {
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

  return (transitionsByMethod[metodoPago]?.[from] || []).includes(to);
}
```

### Nota para B6.3

Conviene permitir:

```txt
rechazado → comprobante_subido
```

porque cuando el cliente sube un nuevo comprobante, tiene más sentido pasar nuevamente a `comprobante_subido` que volver manualmente a `pendiente`.

---

## CRIT-3 — Se puede modificar el pago de pedidos cancelados

### Archivo

```txt
backend/src/api/models/pedido.model.js
```

### Problema

`updateEstadoPago` no valida:

```txt
estado_pedido = cancelado
```

Entonces un pedido cancelado con pago pendiente podría pasar a:

```txt
pagado
```

si se llama directamente al endpoint por ID.

### Riesgo

El filtro `solo_pagos_pendientes` excluye cancelados, pero el endpoint directo puede seguir permitiendo modificaciones indebidas.

### Severidad

```txt
CRÍTICA
```

### Fix recomendado

Dentro de `updateEstadoPago`:

```js
if (pedido.estado_pedido === 'cancelado') {
  await conn.rollback();
  return -2;
}
```

En controller:

```js
if (result === -2) {
  throw new ValidationError('No se puede modificar el pago de un pedido cancelado');
}
```

---

# Errores importantes

## IMP-1 — `PUT /api/admin/pedidos/:id` puede dejar combinaciones inconsistentes de `metodo_pago` y `estado_pago`

### Archivo

```txt
backend/src/api/models/pedido.model.js
```

### Problema

La edición permite cambiar:

```txt
metodo_pago
```

pero no ajusta ni valida coherentemente:

```txt
estado_pago
```

Ejemplo problemático:

```txt
Pedido transferencia con estado_pago = comprobante_subido
↓
PUT cambia metodo_pago = efectivo
↓
queda efectivo + comprobante_subido
```

También podría quedar:

```txt
efectivo + rechazado
```

### Severidad

```txt
IMPORTANTE
```

### Fix recomendado

Definir una regla explícita.

Opción simple:

```txt
Si cambia metodo_pago:
- transferencia → efectivo: estado_pago debe quedar pendiente o pagado
- efectivo → transferencia: estado_pago debe quedar pendiente, salvo que admin indique pagado
```

Ejemplo:

```js
if (data.metodo_pago !== undefined && data.metodo_pago !== pedido.metodo_pago) {
  if (data.metodo_pago === 'efectivo' && !['pendiente', 'pagado'].includes(pedido.estado_pago)) {
    campos.push('estado_pago = ?');
    valores.push('pendiente');
  }

  if (data.metodo_pago === 'transferencia' && pedido.estado_pago === 'rechazado') {
    campos.push('estado_pago = ?');
    valores.push('pendiente');
  }
}
```

Mejor todavía: permitir modificar `estado_pago` en el edit solo si pasa por la misma máquina de estados validada.

---

## IMP-2 — El edit requiere siempre `items`, aunque el schema sugiere edición de metadatos

### Archivo

```txt
backend/src/api/schemas/pedido.schema.js
```

### Problema

`editPedidoSchema` tiene campos opcionales como:

```txt
nombre_cliente
mesa
telefono_cliente
observaciones
metodo_pago
```

pero `items` es obligatorio.

Eso impide hacer una edición simple:

```json
{
  "nombre_cliente": "Cliente corregido"
}
```

### Severidad

```txt
IMPORTANTE
```

### Decisión recomendada

Para caja real, conviene permitir edición parcial.

Schema sugerido:

```js
export const editPedidoSchema = z.object({
  nombre_cliente: z.string().min(1).max(150).optional(),
  mesa: z.string().max(20).optional(),
  telefono_cliente: z.string().max(40).optional(),
  observaciones: z.string().max(500).optional(),
  metodo_pago: z.enum(['transferencia', 'efectivo']).optional(),
  items: z.array(
    z.object({
      producto_id: z.coerce.number().int().positive(),
      cantidad: z.coerce.number().int().positive(),
    }).strict()
  ).min(1).optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  'Debe enviarse al menos un campo para editar'
);
```

En `editWithTransaction`, solo reconciliar stock si `data.items` existe.

---

## IMP-3 — Errores de edición pueden terminar como 500 cuando deberían ser 400/404/409

### Archivo

```txt
backend/src/api/controllers/pedido.controller.js
```

### Problema

El controller solo mapea:

```txt
Stock insuficiente
```

pero `editWithTransaction` puede lanzar errores como:

```txt
Producto X no encontrado o inactivo
La promo "..." no tiene componentes configurados
Producto X no encontrado
```

Esos errores pueden terminar como 500.

### Severidad

```txt
IMPORTANTE
```

### Fix recomendado

Mapear esos errores:

```js
if (err.message?.includes('Stock insuficiente')) {
  return next(new InsufficientStockError(err.message));
}

if (err.message?.includes('no encontrado') || err.message?.includes('inactivo')) {
  return next(new ValidationError(err.message));
}

if (err.message?.includes('no tiene componentes')) {
  return next(new ValidationError(err.message));
}
```

Mejor a futuro: crear errores tipados de dominio para no depender de strings.

---

## IMP-4 — El filtro `solo_pagos_pendientes` no está limitado a caja

### Archivo

```txt
backend/src/api/models/pedido.model.js
```

### Problema

El filtro:

```txt
solo_pagos_pendientes=true
```

incluye pedidos accionables por pago, pero no necesariamente solo pedidos con:

```txt
origen = caja
```

### Severidad

```txt
IMPORTANTE BAJA / DECISIÓN FUNCIONAL
```

### Análisis

Esto puede estar bien si la pantalla de caja actúa como mostrador general de cobro, incluyendo pedidos online en efectivo.

### Recomendación

Mantenerlo general, pero documentar:

```txt
solo_pagos_pendientes=true no significa solo origen=caja.
Significa pedidos accionables para cobro, tanto online como caja.
```

Si se quisiera que sea estrictamente caja rápida, agregar:

```sql
AND p.origen = 'caja'
```

Mi recomendación: **mantenerlo general**.

---

## IMP-5 — El helper de limpieza de tests puede sobre-restaurar stock de pedidos cancelados

### Archivo

```txt
backend/tests/caja.test.js
```

### Problema

El test puede cancelar pedidos, y la cancelación ya repone stock.

Luego el cleanup puede volver a restaurar stock de pedidos `TEST-B6-2%`, incluyendo cancelados.

### Riesgo

Puede inflar stock después de correr tests.

### Fix recomendado

Modificar cleanup para leer `estado_pedido` y no reponer cancelados:

```sql
SELECT id, estado_pedido
FROM pedido
WHERE nombre_cliente LIKE ?
```

Luego:

```js
if (pedido.estado_pedido === 'cancelado') {
  continue;
}
```

---

## IMP-6 — Los tests usan prefijo amplio `TEST-B6-2%`

### Archivo

```txt
backend/tests/caja.test.js
```

### Problema

Los tests limpian por:

```txt
TEST-B6-2%
```

Eso puede cruzarse con otra corrida o datos manuales.

### Fix recomendado

Generar un prefijo único por corrida:

```js
const RUN_ID = `TEST-B6-2-${Date.now()}-${Math.random().toString(16).slice(2)}`;
```

Usarlo en todos los nombres de clientes de la suite.

---

## IMP-7 — Open handles de MySQL en Jest

### Archivos

```txt
backend/src/api/database/db.js
backend/tests/caja.test.js
```

### Problema

El pool MySQL queda abierto después de tests.

### Fix recomendado

Agregar teardown:

```js
afterAll(async () => {
  await limpiarPedidosDeTest();
  await pool.end();
});
```

Si varios test files comparten pool, conviene un `jest.setup.js` o teardown global.

---

## IMP-8 — `PUT /api/admin/configuracion-tienda` sigue sin `requireTrustedOrigin`

### Archivo

```txt
backend/src/api/routes/configuracion.routes.js
```

### Problema

La ruta admin mutante de configuración debería tener la misma protección CSRF mínima que productos y pedidos.

### Fix recomendado

Agregar:

```js
adminRouter.put(
  '/',
  requireAdmin,
  requireTrustedOrigin,
  validateBody(updateConfiguracionSchema),
  actualizarAdmin
);
```

---

# Mejoras recomendadas

## SUG-1 — Agregar tests para transiciones por método de pago

Casos recomendados:

```txt
efectivo pendiente → comprobante_subido debe fallar
efectivo pendiente → rechazado debe fallar
transferencia rechazado → comprobante_subido debería evaluarse
pedido cancelado → cambio de pago debe fallar
```

---

## SUG-2 — Agregar test de carrera o update condicional para pago

No hace falta simular concurrencia real si es complejo, pero sí validar que:

```txt
pagado no puede ser sobrescrito
```

---

## SUG-3 — Agregar tests de edición metadata-only si se permite edición parcial

Casos recomendados:

```txt
PUT solo nombre_cliente
PUT solo mesa
PUT solo telefono
PUT solo metodo_pago
```

---

## SUG-4 — Consolidar items duplicados

El stock se acumula correctamente, pero `pedido_detalle` puede quedar con dos líneas del mismo producto si el request manda duplicados.

No es crítico, pero sería más prolijo consolidar:

```txt
producto_id 5 cantidad 1
producto_id 5 cantidad 2
↓
producto_id 5 cantidad 3
```

---

## SUG-5 — Crear errores tipados de dominio

En vez de lanzar errores genéricos:

```js
new Error('Stock insuficiente...')
```

conviene crear errores de dominio:

```js
DomainValidationError
StockError
InvalidTransitionError
```

Eso evita mapear errores por texto.

---

# Buenas decisiones detectadas

- ✅ `PAGO_TRANSITIONS` existe y centraliza la máquina de estados.
- ✅ `pagado` está modelado como terminal.
- ✅ `pendiente -> pagado` funciona para efectivo.
- ✅ `pendiente -> pagado` funciona para transferencia de caja sin comprobante.
- ✅ `pagado -> pendiente` queda bloqueado.
- ✅ `solo_pagos_pendientes=true` excluye `pagado`.
- ✅ `solo_pagos_pendientes=true` excluye `cancelado`.
- ✅ `PUT /api/admin/pedidos/:id` está protegido con `requireAdmin` y `requireTrustedOrigin`.
- ✅ `PUT /api/admin/pedidos/:id` solo edita pedidos `origen='caja'`.
- ✅ No permite editar pedidos `cancelado` ni `entregado`.
- ✅ La edición corre en transacción.
- ✅ Bloquea pedido con `FOR UPDATE`.
- ✅ Bloquea productos con `ORDER BY id FOR UPDATE`.
- ✅ Calcula stock disponible como `stock_actual + restore`.
- ✅ Omite productos ilimitados correctamente.
- ✅ Las promos editadas descuentan componentes, no stock propio.
- ✅ Si falla por stock insuficiente, hace rollback.
- ✅ Reescribe `pedido_detalle` y recalcula total.
- ✅ Hay cobertura de tests bastante superior a etapas anteriores.

---

# Checklist de corrección

Antes de avanzar a B6.3:

```txt
[ ] Hacer updateEstadoPago transaccional o atómico.
[ ] Bloquear cambios de pago en pedidos cancelados.
[ ] Hacer que validatePaymentTransition considere metodo_pago.
[ ] Impedir efectivo -> comprobante_subido/rechazado.
[ ] Decidir si transferencia rechazado -> comprobante_subido debe ser válido para B6.3.
[ ] Validar metodo_pago + estado_pago al editar pedido.
[ ] Decidir si PUT permite edición parcial sin items.
[ ] Mapear errores de edición a 400/404/409 en vez de 500.
[ ] Corregir cleanup de tests para no reponer stock de cancelados.
[ ] Usar prefijo único por corrida de test.
[ ] Cerrar pool MySQL al terminar tests.
[ ] Agregar requireTrustedOrigin a configuración admin PUT.
```

---

# Riesgos para seguir con B6.3

B6.3 probablemente va a trabajar con:

```txt
comprobantes
Drive
estado_pago = comprobante_subido
estado_pago = rechazado
aprobación/rechazo de pagos
```

Justamente por eso no conviene avanzar sin endurecer la máquina de pagos.

El mayor riesgo es que agregues comprobantes sobre una base donde:

```txt
efectivo puede pasar a comprobante_subido
pagos cancelados pueden modificarse
pagado puede ser sobrescrito por condición de carrera
metodo_pago puede cambiar sin coherencia con estado_pago
```

Eso puede complicar mucho B6.3.

---

# Veredicto final

```txt
¿B6.2 está bien encaminada? SÍ.
¿La edición transaccional de caja está razonablemente sólida? SÍ.
¿La parte de pagos está lista para B6.3? NO.
¿Conviene avanzar directo a B6.3? NO.
```

## Recomendación

Crear una etapa corta:

```txt
B6.2.1 — Hardening de pagos, edición y tests de caja
```

Objetivo:

```txt
- payment update atómico
- transiciones según metodo_pago
- bloquear pagos en cancelados
- coherencia metodo_pago/estado_pago en edit
- cleanup de tests seguro
- cerrar pool en tests
- requireTrustedOrigin en configuración admin
```

Después de esa etapa, si los tests pasan y una mini auditoría no detecta regresiones, sí avanzaría a:

```txt
B6.3 — Comprobantes / Google Drive
```

---

# Prompt para OpenCode — B6.2.1

Copiar este prompt en OpenCode desde la raíz del proyecto.

```txt
Continuemos con Kermingo. La auditoría externa de B6.2 Caja detectó que la edición transaccional está bien encaminada, pero la máquina de pagos y algunos tests necesitan hardening antes de avanzar a B6.3.

# Etapa B6.2.1 — Hardening de pagos, edición y tests de caja

Trabajá bajo metodología SDD usando Gentle AI.

No avanzar a B6.3, comprobantes, Google Drive, frontend ni deploy.

## Objetivo

Corregir los problemas detectados en auditoría:

1. Hacer `updateEstadoPago` transaccional o atómico.
2. Bloquear cambios de pago en pedidos cancelados.
3. Hacer que `validatePaymentTransition` considere `metodo_pago`.
4. Impedir estados de transferencia en pedidos de efectivo.
5. Decidir y aplicar transición para transferencia `rechazado -> comprobante_subido`.
6. Validar coherencia `metodo_pago + estado_pago` al editar pedido.
7. Decidir si `PUT /api/admin/pedidos/:id` permite edición parcial sin `items`.
8. Mapear errores de edición a 400/404/409 en vez de 500.
9. Corregir cleanup de tests para no reponer stock de pedidos cancelados.
10. Usar prefijo único por corrida de test.
11. Cerrar pool MySQL al terminar tests.
12. Agregar `requireTrustedOrigin` a `PUT /api/admin/configuracion-tienda`.

## Leer antes

Leé en este orden:

- AGENTS.md
- docs/planificacion/35-AUDITORIA_B6_2_CAJA_CHATGPT_VEREDICTO.md
- docs/planificacion/27-CHECKPOINTS_TESTING_AUDITORIA.md
- backend/src/api/models/pedido.model.js
- backend/src/api/controllers/pedido.controller.js
- backend/src/api/routes/pedido.routes.js
- backend/src/api/schemas/pedido.schema.js
- backend/src/api/routes/configuracion.routes.js
- backend/tests/caja.test.js
- openspec/changes/backend-b6-2-caja/
- openspec/changes/backend-b6-2-caja-edicion/

## Reglas

- No tocar frontend/.
- No tocar diseno-de-landing-kermingo/.
- No implementar comprobantes ni Drive.
- No avanzar a B6.3.
- Mantener compatibilidad con pagos de caja:
  - efectivo pendiente -> pagado
  - transferencia pendiente -> pagado
  - transferencia pendiente -> comprobante_subido
  - comprobante_subido -> pagado | rechazado
  - rechazado -> pendiente | comprobante_subido
  - pagado terminal

## Cambios requeridos

### A. Pago atómico

Modificar `updateEstadoPago` para usar transacción y `SELECT ... FOR UPDATE`, o un `UPDATE` condicional seguro.

Debe impedir que `pagado` sea sobrescrito por requests concurrentes.

### B. Transiciones según método de pago

Modificar `validatePaymentTransition` para considerar `metodo_pago`.

Reglas sugeridas:

```txt
efectivo:
  pendiente -> pagado
  pagado -> terminal

transferencia:
  pendiente -> pagado | comprobante_subido
  comprobante_subido -> pagado | rechazado
  rechazado -> pendiente | comprobante_subido
  pagado -> terminal
```

### C. Pedido cancelado

`updateEstadoPago` debe rechazar cambios si `estado_pedido = cancelado`.

### D. Edición y coherencia metodo_pago/estado_pago

Si `PUT /api/admin/pedidos/:id` permite cambiar `metodo_pago`, debe dejar `estado_pago` en un estado válido.

Ejemplos:
- transferencia + comprobante_subido → cambia a efectivo → estado_pago debe pasar a pendiente o pagado.
- efectivo → cambia a transferencia → estado_pago debe seguir siendo válido para transferencia.

### E. Edición parcial

Decidir si `PUT /api/admin/pedidos/:id` debe permitir edición parcial sin `items`.

Recomendación: sí.

Si se permite:
- `items` debe ser opcional.
- Solo reconciliar stock si `items` viene presente.
- Debe exigirse al menos un campo a editar.

### F. Errores de edición

Mapear errores conocidos a respuestas 400/404/409 y no 500:

- Stock insuficiente → 409
- Producto no encontrado/inactivo → 400 o 404
- Promo sin componentes → 400

### G. Tests

Corregir `backend/tests/caja.test.js`:

- usar prefijo único por corrida
- cleanup no debe reponer stock de pedidos cancelados
- cerrar pool MySQL al final
- agregar tests de transiciones por metodo_pago
- agregar test de pedido cancelado no editable en pago
- agregar test de edición parcial si se implementa

### H. Seguridad configuración

Agregar `requireTrustedOrigin` a `PUT /api/admin/configuracion-tienda`.

## Verificación mínima

Ejecutar:

```bash
cd backend
npm test
npm run dev
curl http://localhost:3001/api/health
```

Probar o cubrir con tests:

1. efectivo pendiente -> pagado OK
2. efectivo pendiente -> comprobante_subido FAIL
3. transferencia pendiente -> comprobante_subido OK
4. transferencia comprobante_subido -> rechazado OK
5. transferencia rechazado -> comprobante_subido OK si se adopta esa regla
6. pagado -> pendiente FAIL
7. cancelado -> cambio de pago FAIL
8. PUT pedido caja metadata-only OK si se implementa
9. PUT cambio metodo_pago deja estado_pago coherente
10. cleanup no infla stock

## Resultado esperado

Responder con:

```txt
## Resultado B6.2.1 — Hardening pagos/caja

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

Cambios en pagos:
-

Cambios en edición:
-

Cambios en tests:
-

Cambios en seguridad:
-

Verificaciones ejecutadas:
-

Resultados:
-

Pendientes:
-

Testing manual requerido:
si

Auditoría con ChatGPT recomendada:
si

Bloquea avance a B6.3:
si/no

Veredicto:
-
```

No avances a B6.3 hasta que Marcos revise y apruebe.
```

---

# Testing manual posterior sugerido

Después de ejecutar B6.2.1:

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/backend
npm test
npm run dev
curl http://localhost:3001/api/health
```

Probar manualmente o confirmar por tests:

```txt
- efectivo pendiente -> pagado
- efectivo pendiente -> comprobante_subido debe fallar
- transferencia pendiente -> comprobante_subido
- transferencia comprobante_subido -> rechazado
- transferencia rechazado -> comprobante_subido
- pagado -> pendiente debe fallar
- pedido cancelado -> cambio de pago debe fallar
- editar pedido caja solo nombre/mesa/teléfono
- editar método de pago sin dejar estado_pago incoherente
- editar pedido con stock insuficiente hace rollback
- cleanup de tests no infla stock
```

---

# Prompt para auditoría posterior con ChatGPT

Después de aplicar B6.2.1, generar ZIP y usar este prompt:

```txt
Sos arquitecto de software senior y QA técnico estricto. Te paso el ZIP actualizado de Kermingo después de B6.2.1.

Auditá específicamente si quedaron corregidos:

1. updateEstadoPago es transaccional o atómico y no permite sobrescribir pagado por carrera.
2. validatePaymentTransition considera metodo_pago.
3. Efectivo no puede pasar a comprobante_subido ni rechazado.
4. Transferencia tiene transiciones correctas para comprobante_subido/rechazado/pagado.
5. Pedidos cancelados no permiten modificar pago.
6. Editar metodo_pago deja estado_pago coherente.
7. PUT /api/admin/pedidos/:id permite edición parcial o está documentado que requiere pedido completo.
8. Errores de edición se mapean a 400/404/409 y no 500.
9. Tests usan prefijo único por corrida.
10. Cleanup de tests no repone stock de cancelados.
11. Pool MySQL se cierra correctamente en tests.
12. PUT /api/admin/configuracion-tienda tiene requireTrustedOrigin.
13. No se introdujeron regresiones en stock, promos ni edición transaccional.

Decime si ya puedo avanzar a B6.3 — Comprobantes / Google Drive.
```
