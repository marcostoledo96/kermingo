# Prompt de auditoría para ChatGPT 5.5 — Kermingo B6.2.2 post-reconciliación

> Copiá este archivo entero y pegalo en ChatGPT 5.5 (modo GPT-5.5, reasoning alto).
> El objetivo es que **corrobore que la reconciliación B6.2.2 está bien implementada**
> y que **código, tests y documentación son consistentes entre sí**.

---

## 1. Qué es Kermingo

Sistema web para un evento scout recaudatorio del **20 de junio de 2026**.
Organizan: Grupo Scout San Patricio, Tropa Raider "Compañía de Jesús" y Comunidad Raider "Fortaleza de María".

- **Backend**: Express + MySQL + API REST + JWT + MVC
- **Frontend**: Next.js + React + TypeScript + TailwindCSS (activo en `frontend/`)
- **Referencia visual**: `diseno-de-landing-kermingo/` (v0, solo lectura)
- **Hosting**: Railway (backend) + Vercel (frontend)
- **DB**: MySQL con `mysql2/promise`, tablas en español singular

Funcionalidades:
- Venta de comida/bebida online con carrito (localStorage)
- Caja rápida para admin (pedidos en persona)
- Cocina (listado, cambio de estado `recibido → en_preparacion → listo → entregado`)
- Pagos (efectivo y transferencia con comprobante)
- Filtro de pedidos pendientes de pago para caja
- Configuración de tienda (abierta/cerrada/demo, mensaje público, hora de cena)
- Edición de pedidos de caja con reconciliación transaccional de stock
- Cancelación de pedidos con reposición de stock
- Seed con 24 productos, combos (promos con componentes)

---

## 2. Stack completo verificado

| Capa | Tecnología | Versión / Detalle |
|------|-----------|-------------------|
| Runtime | Node.js | — |
| Backend | Express | ESM (`"type": "module"`) |
| DB | MySQL | `mysql2/promise`, placeholders `?` |
| Auth | JWT en cookie httpOnly | `sameSite: 'none'` en prod |
| Validación | Zod | Schemas en `backend/src/api/schemas/` |
| Archivos | Multer memoryStorage + Google Drive API | Comprobantes de transferencia |
| Reportes | ExcelJS | Exportación de ventas |
| Testing | Jest 29 + Supertest | `--experimental-vm-modules` |
| Frontend | Next.js + React + TypeScript + TailwindCSS | En `frontend/` |
| Componentes UI | shadcn-style | Basados en referencia v0 |
| Carrito | localStorage | Persistencia de cliente |
| PDF | jsPDF | Ticket de pedido |

---

## 3. Contexto de esta auditoría

### 3.1 — Qué pasó antes

La auditoría anterior (documento 37) detectó que el ZIP proporcionado **no contenía** las funcionalidades que la documentación afirmaba tener:

- No existía `PAGO_TRANSITIONS`.
- No existía `validatePaymentTransition`.
- No existía filtro `solo_pagos_pendientes`.
- No existía `PUT /api/admin/pedidos/:id`.
- No existía `editWithTransaction`.
- No existía `backend/tests/caja.test.js`.
- `updateEstadoPago` hacía un UPDATE directo sin validar transición.
- `updateEstadoPagoSchema` no permitía `comprobante_subido`.
- OpenSpec documentaba funcionalidades que el código no tenía.

### 3.2 — Qué se hizo después (B6.2.2 reconciliación)

Se mergeó la rama `feature/backend-b6-2-caja-edicion` en `feature/backend-b6-1-cocina-review-fixes`, reconciliando documentación y código. Estado actual:

- **PAGO_TRANSITIONS** y **transitionsByMethod** existen en `pedido.model.js` con state machine method-aware.
- **validatePaymentTransition** existe y distingue efectivo de transferencia.
- **updateEstadoPago** es transaccional con `SELECT ... FOR UPDATE`, bloquea pedidos cancelados (return -2), rechaza transición nula (return -1), valida state machine.
- **solo_pagos_pendientes** existe en schema y modelo.
- **editWithTransaction** existe con reconciliación transaccional de stock, soporte para promos, productos ilimitados y coerción de estado_pago al cambiar método_pago.
- **cancelWithTransaction** existe con reposición de stock y lock `FOR UPDATE`.
- **PUT /api/admin/pedidos/:id** existe en routes con `requireAdmin + requireTrustedOrigin + validateBody(editPedidoSchema)`.
- **editPedidoSchema** existe en `pedido.schema.js` con validación de items y al menos un campo obligatorio.
- **updateEstadoPagoSchema** permite los 4 valores (`pendiente`, `comprobante_subido`, `pagado`, `rechazado`).
- **caja.test.js** existe con **850 líneas** y **124 tests pasan**.
- Controller `cambiarPago` maneja `-1` (transición inválida) y `-2` (pedido cancelado).
- Controller `editar` maneja `-1` (cancelado/entregado), `-2` (no es caja), `InsufficientStockError`, `ValidationError` para producto inactivo.
- Documentación actualizada: API.md, CORE.md, TESTING.md, GOTCHAS.md, OpenSpec.

### 3.3 — Rama actual

```
feature/backend-b6-1-cocina-review-fixes
```

Commits recientes:
- `cb77e9b` docs: B6.2.2 reconciliación documental post-merge caja
- `2832706` fix(backend): reconcilia tests post-merge caja — mock exports, csrf 403, pool.end seguro
- `bf85931` merge: integra B6.2 caja + B6.2.1 hardening desde feature/backend-b6-2-caja-edicion

---

## 4. Arquitectura actual del backend

```
backend/src/
├── app.js                         # Express app con cors, cookieParser, error middleware
├── server.js                      # Entry point
└── api/
    ├── config/
    │   └── environments.js        # Variables de entorno centralizadas
    ├── database/
    │   ├── db.js                  # Pool mysql2/promise
    │   ├── schema.sql             # DDL (9 tablas)
    │   ├── seed.sql               # 24 productos + usuario admin + configuracion
    │   └── indexes.sql            # Índices (7)
    ├── middlewares/
    │   ├── admin.middleware.js     # JWT verify + DB lookup
    │   ├── origin.middleware.js    # CSRF: ForbiddenError (403) para origins no confiables
    │   ├── validate.middleware.js  # Zod validation
    │   └── error.middleware.js     # Global error handler
    ├── routes/
    │   ├── index.routes.js        # Monta /api/auth, /productos, /pedidos, /admin/*, /configuracion-tienda
    │   ├── auth.routes.js
    │   ├── producto.routes.js
    │   ├── pedido.routes.js       # Público + admin (caja, cocina, edicion, cancelar)
    │   ├── cocina.routes.js
    │   └── configuracion.routes.js
    ├── controllers/
    │   ├── auth.controller.js
    │   ├── producto.controller.js
    │   ├── pedido.controller.js   # crear, crearCaja, cambiarEstado, cambiarPago, cancelar, editar
    │   ├── cocina.controller.js   # listarCocina, obtenerCocina, cambiarEstadoCocina
    │   └── configuracion.controller.js
    ├── models/
    │   ├── usuario.model.js
    │   ├── producto.model.js
    │   ├── pedido.model.js        # createWithTransaction, findKitchenPedidos, updateEstadoPedido,
    │   │                           # updateEstadoPago, cancelWithTransaction, editWithTransaction,
    │   │                           # validatePaymentTransition, TRANSICIONES_VALIDAS,
    │   │                           # transitionsByMethod, PAGO_TRANSITIONS, findAllAdmin (con solo_pagos_pendientes)
    │   └── configuracion.model.js # findPublic, findAdmin, updateMinimal
    ├── schemas/
    │   ├── auth.schema.js
    │   ├── producto.schema.js
    │   ├── pedido.schema.js       # createPedido, createCaja, pedidoQuery (con solo_pagos_pendientes),
    │   │                           # updateEstado (4 valores), updatePago (4 valores), edit, idParam
    │   ├── cocina.schema.js
    │   └── configuracion.schema.js
    └── utils/
        ├── errors.js              # AppError, ValidationError, NotFoundError, AuthError, ForbiddenError, InsufficientStockError
        └── respuesta.utils.js     # respuestaExitosa, respuestaError
```

### Endpoints principales

| Método | Ruta | Auth | Handler | Descripción |
|--------|------|------|---------|-------------|
| POST | /api/auth/login | público | login | Login admin, retorna JWT en cookie |
| GET | /api/productos | público | listar | Lista productos activos |
| POST | /api/pedidos | público | crear | Pedido online (efectivo o transferencia) |
| GET | /api/pedidos/seguimiento/:token | público | seguimiento | Estado público del pedido |
| POST | /api/admin/pedidos/caja | admin + trusted | crearCaja | Pedido de caja rápida |
| GET | /api/admin/pedidos | admin | listarAdmin | Lista con filtros y paginación (incluye solo_pagos_pendientes) |
| GET | /api/admin/pedidos/:id | admin | obtenerAdmin | Detalle completo |
| PATCH | /api/admin/pedidos/:id/estado | admin + trusted | cambiarEstado | Avanza estado pedido |
| PATCH | /api/admin/pedidos/:id/pago | admin + trusted | cambiarPago | State machine de pago (method-aware) |
| PATCH | /api/admin/pedidos/:id/cancelar | admin + trusted | cancelar | Cancela y repone stock |
| PUT | /api/admin/pedidos/:id | admin + trusted | editar | Edición con reconciliación transaccional de stock |
| GET | /api/admin/cocina/pedidos | admin | listarCocina | Lista pedidos activos |
| GET | /api/admin/cocina/pedidos/:id | admin | obtenerCocina | Detalle con items |
| PATCH | /api/admin/cocina/pedidos/:id/estado | admin + trusted | cambiarEstadoCocina | Transición cocina |
| GET | /api/configuracion-tienda | público | obtenerPublico | Estado + mensaje público |
| GET | /api/admin/configuracion-tienda | admin | obtenerAdmin | Config completa |
| PUT | /api/admin/configuracion-tienda | admin + trusted | actualizarAdmin | Actualiza estado, mensaje, hora cena |

---

## 5. State machines implementadas

### Estado del pedido
```
recibido → en_preparacion → listo → entregado
```
`TRANSICIONES_VALIDAS` en `pedido.model.js`. Transición nula (mismo estado) = false → 400.
Cancelación: solo desde `recibido` o `en_preparacion` (enforzado en `cancelWithTransaction`).

### Estado del pago (method-aware)
```
efectivo:
  pendiente → pagado
  pagado → (terminal)

transferencia:
  pendiente → pagado | comprobante_subido
  comprobante_subido → pagado | rechazado
  rechazado → pendiente | comprobante_subido
  pagado → (terminal)
```
`transitionsByMethod` en `pedido.model.js` con keys por método.
`PAGO_TRANSITIONS` como merge genérico backward-compatible.
`validatePaymentTransition(from, to, metodoPago?)` — si `metodoPago` se provee usa la state machine de ese método; si no, usa `PAGO_TRANSITIONS`.
Transición nula (`from === to`): `validatePaymentTransition` retorna `true`, PERO `updateEstadoPago` la rechaza explícitamente con return `-1`.

---

## 6. Reglas funcionales (no negociables)

Estas son las reglas de negocio que el código DEBE cumplir:

1. **Pago efectivo**: solo permite `pendiente → pagado`. Pagado es terminal. No permite `comprobante_subido` ni `rechazado`.
2. **Pago transferencia**: permite `pendiente → pagado | comprobante_subido`, `comprobante_subido → pagado | rechazado`, `rechazado → pendiente | comprobante_subido`. Pagado es terminal.
3. **Transición nula de pago** (mismo estado): se rechaza con 400 en el controller (`result === -1`). No es idempotente.
4. **Pedido cancelado**: no permite modificar estado de pago (`result === -2`, ValidationError).
5. **Filtro solo_pagos_pendientes**: muestra pedidos con `estado_pago IN ('pendiente', 'rechazado')` excluyendo `estado_pedido = 'cancelado'`. No filtra por origen (caja puede cobrar pedidos online).
6. **Edición de pedidos**: solo pedidos `origen = 'caja'`, no cancelados ni entregados.
7. **Edición transaccional**: usa `SELECT ... FOR UPDATE`, restaura stock anterior, calcula requerimientos nuevos, valida stock con reposición aplicada, aplica delta neto, reescribe `pedido_detalle`, recalcula total. Rollback por stock insuficiente. Soporta productos limitados, ilimitados y promos.
8. **Cancelación transaccional**: usa `SELECT ... FOR UPDATE`, solo desde `recibido` o `en_preparacion`, repone stock de componentes de promos, omite productos ilimitados.
9. **Si elige transferencia**: comprobante obligatorio (para B6.3).
10. **Si elige efectivo**: no mostrar ni enviar comprobante.
11. **Caja rápida puede marcar efectivo como pagado automáticamente**.
12. **Caja rápida puede marcar transferencia como pagada sin comprobante** si el vendedor verificó.
13. **El teléfono se guarda como VARCHAR**, con campo original y campo normalizado para WhatsApp.
14. **El stock se descuenta al confirmar pedido** y se repone al cancelar.
15. **Los combos son reales y descuentan stock de sus productos internos**.
16. **El filtro solo_pagos_pendientes no filtra por origen=caja** porque caja puede cobrar pedidos online.
17. **requireTrustedOrigin usa ForbiddenError (403)** para rechazar origins no confiables en métodos unsafe (POST, PUT, PATCH, DELETE).
18. **El backend valida todo aunque el frontend ya valide**.

---

## 7. Archivos a auditar

### Código fuente

| Archivo | Qué auditar |
|---------|-------------|
| `backend/src/api/models/pedido.model.js` | `transitionsByMethod`, `PAGO_TRANSITIONS`, `validatePaymentTransition`, `updateEstadoPago` (transaccional, `SELECT ... FOR UPDATE`), `cancelWithTransaction`, `editWithTransaction`, `findAllAdmin` (filtro `solo_pagos_pendientes`), `createWithTransaction` |
| `backend/src/api/controllers/pedido.controller.js` | `cambiarPago` (manejo de -1, -2), `editar` (manejo de 0, -1, -2, InsufficientStockError, ValidationError), `cancelar` (manejo de 0, -1) |
| `backend/src/api/schemas/pedido.schema.js` | `updateEstadoPagoSchema` (4 valores enum), `editPedidoSchema` (items opcional, al menos un campo), `pedidoQuerySchema` (`solo_pagos_pendientes`), `createCajaSchema`, `createPedidoSchema` |
| `backend/src/api/routes/pedido.routes.js` | Ruta PUT con `requireAdmin + requireTrustedOrigin + validateBody(editPedidoSchema)`, PATCH pago con `requireTrustedOrigin`, PATCH cancelar |
| `backend/src/api/middlewares/origin.middleware.js` | ForbiddenError (403) vs AuthError (401) |
| `backend/src/api/utils/errors.js` | `InsufficientStockError`, errores custom |
| `backend/src/api/database/schema.sql` | DDL completo, constraints, checks, enums |

### Tests

| Archivo | Qué auditar |
|---------|-------------|
| `backend/tests/caja.test.js` | State machine pago (method-aware), filtro `solo_pagos_pendientes`, edición transaccional, cancelación, cleanup con RUN_ID único, `afterAll(pool.end())`, determinismo con fixtures propios |

### Documentación

| Archivo | Qué verificar |
|---------|---------------|
| `DOCUMENTACION/IA/API.md` | Endpoints, schemas, PUT editar, filtro solo_pagos_pendientes, state machine pago |
| `DOCUMENTACION/IA/CORE.md` | State machine method-aware, editWithTransaction, cancelWithTransaction, transiciones |
| `DOCUMENTACION/IA/TESTING.md` | caja.test.js, 124 tests, cobertura |
| `DOCUMENTACION/IA/GOTCHAS.md` | ForbiddenError 403, acentos, errores conocidos |
| `openspec/specs/cashier-operations/spec.md` | State machine, filter, scenarios |

---

## 8. Qué verificar específicamente

### 8.1 — State machine de pago method-aware

- [ ] ¿`transitionsByMethod` define correctamente las transiciones para `efectivo` y `transferencia`?
- [ ] ¿`efectivo.pendiente` solo permite `pagado` (no `comprobante_subido`, no `rechazado`)?
- [ ] ¿`pagado` es terminal para ambos métodos (array vacío)?
- [ ] ¿`validatePaymentTransition` usa `transitionsByMethod` cuando se provee `metodoPago`?
- [ ] ¿`validatePaymentTransition` retrocede a `PAGO_TRANSITIONS` cuando no se provee `metodoPago`?
- [ ] ¿`validatePaymentTransition` retorna `true` cuando `from === to`? ¿Es correcto que `updateEstadoPago` bloquee explícitamente la transición nula en lugar de la función de validación?
- [ ] ¿El controller `cambiarPago` maneja `result === -1` (transición inválida) y `result === -2` (pedido cancelado) correctamente?

### 8.2 — updateEstadoPago transaccional

- [ ] ¿Usa `pool.getConnection()`, `beginTransaction()`, `commit()`, `rollback()`, `conn.release()`?
- [ ] ¿Hace `SELECT ... FOR UPDATE` para lockear la fila?
- [ ] ¿Verifica que el pedido no esté cancelado antes de permitir cambio de pago?
- [ ] ¿Rechaza transición nula (`from === to`) con return `-1`?
- [ ] ¿Valida la transición con `validatePaymentTransition` usando `pedido.metodo_pago`?
- [ ] ¿Hace rollback en caso de error?
- [ ] ¿Libera la conexión en `finally`?

### 8.3 — Filtro solo_pagos_pendientes

- [ ] ¿`pedidoQuerySchema` incluye `solo_pagos_pendientes` con validación correcta (`enum['true','false']` + `transform` a boolean)?
- [ ] ¿`findAllAdmin` agrega `estado_pago IN ('pendiente', 'rechazado')` y `estado_pedido != 'cancelado'` cuando el filtro es `true`?
- [ ] ¿No limita por `origen = 'caja'` (para permitir cobrar pedidos online)?

### 8.4 — Edición transaccional (editWithTransaction)

- [ ] ¿Solo permite editar pedidos con `origen = 'caja'`? (return -2 si no)
- [ ] ¿Bloquea edición de cancelados y entregados? (return -1)
- [ ] ¿Usa transacción con `SELECT ... FOR UPDATE`?
- [ ] ¿Restaura stock anterior (reposiciones de items viejos)?
- [ ] ¿Calcula requerimientos nuevos incluyendo componentes de promos?
- [ ] ¿Valida stock con reposición aplicada?
- [ ] ¿Aplica delta neto (restaurar viejo - descontar nuevo)?
- [ ] ¿Omite productos ilimitados (`stock_limitado = 0`)?
- [ ] ¿Borra detalle anterior y reescribe?
- [ ] ¿Recalcula total?
- [ ] ¿Coherce `estado_pago` si cambia `metodo_pago`? (ej: si estaba `comprobante_subido` y se cambia a `efectivo`, cae a `pendiente`)
- [ ] ¿Permite editar solo metadatos (sin items) sin tocar stock?
- [ ] ¿Hace rollback en caso de error? ¿Libera conexión en `finally`?
- [ ] ¿El schema `editPedidoSchema` permite `items` opcional?

### 8.5 — Cancelación transaccional (cancelWithTransaction)

- [ ] ¿Solo permite cancelar desde `recibido` o `en_preparacion`?
- [ ] ¿Usa `SELECT ... FOR UPDATE` para lockear el pedido?
- [ ] ¿Repone stock incluyendo componentes de promos?
- [ ] ¿Omite productos ilimitados?
- [ ] ¿Setea `estado_pedido = 'cancelado'`?

### 8.6 — Seguridad

- [ ] ¿`requireTrustedOrigin` usa `ForbiddenError` (403) para CSRF?
- [ ] ¿Los endpoints admin que mutan (PUT, PATCH, POST) usan `requireAdmin + requireTrustedOrigin`?
- [ ] ¿Los GET admin solo usan `requireAdmin` (sin origin check)?
- [ ] ¿El JWT se verifica contra la DB (no solo decode)?
- [ ] ¿Zod schemas usan `.strict()` donde corresponde?

### 8.7 — Tests (caja.test.js)

- [ ] ¿Hay tests para la state machine de pago method-aware (efectivo y transferencia)?
- [ ] ¿Hay tests para transiciones inválidas (ej: efectivo → comprobante_subido)?
- [ ] ¿Hay tests para `pagado` terminal (no permite más transiciones)?
- [ ] ¿Hay tests para pedido cancelado (no permite cambio de pago)?
- [ ] ¿Hay tests para transición nula de pago (mismo estado)?
- [ ] ¿Hay tests para `solo_pagos_pendientes` con fixtures propios y deterministas?
- [ ] ¿Hay tests para `solo_pagos_pendientes` excluyendo `pagado` y `cancelado`?
- [ ] ¿Hay tests de edición transaccional (éxito, stock insuficiente, pedido online rechazado, pedido cancelado/entregado rechazado)?
- [ ] ¿Hay tests de cancelación con reposición de stock?
- [ ] ¿Los tests hacen cleanup con `cancelWithTransaction` o `DELETE WHERE nombre LIKE '%RUN_ID%'`?
- [ ] ¿Los tests usan `afterAll(pool.end())`?
- [ ] ¿Son 124 tests los que pasan? ¿Hay gaps en cobertura?

### 8.8 — Consistencia documentación vs código

- [ ] ¿`API.md` documenta `PUT /api/admin/pedidos/:id` con `editPedidoSchema`?
- [ ] ¿`API.md` documenta `solo_pagos_pendientes` en query params con reglas correctas?
- [ ] ¿`CORE.md` describe la state machine method-aware con `transitionsByMethod`?
- [ ] ¿`CORE.md` describe `editWithTransaction` y `cancelWithTransaction` correctamente?
- [ ] ¿`TESTING.md` lista `caja.test.js` con cobertura de state machine, filtro, edición?
- [ ] ¿`GOTCHAS.md` documenta `ForbiddenError 403` en origin middleware (no AuthError 401)?
- [ ] ¿`openspec/specs/cashier-operations/spec.md` coincide con el código actual?
- [ ] ¿Los errores HTTP mencionados en documentación coinciden con el código? (403 para Forbidden, 401 para Auth, 404 para NotFound, 400 para Validation, 409 para InsufficientStock)

---

## 9. Preguntas específicas para el auditor

1. **¿Está la state machine de pago correctamente implementada?**
   - ¿`transitionsByMethod` cubre todos los casos?
   - ¿Efectivo no permite `comprobante_subido` ni `rechazado`?
   - ¿`pagado` es realmente terminal?
   - ¿La separación de responsabilidades entre `validatePaymentTransition` (retorna true para same-state) y `updateEstadoPago` (bloquea same-state con -1) es correcta y consistente?

2. **¿`updateEstadoPago` es verdaderamente atómico?**
   - ¿El `SELECT ... FOR UPDATE` evita race conditions?
   - ¿Hay ventana entre el check y el UPDATE donde otro request podría modificar el estado?
   - ¿Es correcto que se use `pool.getConnection()` + transacción manual en vez del pool directo?

3. **¿El filtro `solo_pagos_pendientes` funciona correctamente?**
   - ¿Filtra por `estado_pago IN ('pendiente', 'rechazado')` Y `estado_pedido != 'cancelado'`?
   - ¿No filtra por `origen = 'caja'`?
   - ¿Se valida correctamente como boolean string en Zod?

4. **¿`editWithTransaction` reconcilia stock correctamente?**
   - ¿El delta neto (restaurar viejo - descontar nuevo) es correcto?
   - ¿Soporta promos (componentes de combo)?
   - ¿Soporta productos ilimitados?
   - ¿El rollback por stock insuficiente funciona (la transacción se revierte completa)?
   - ¿La coerción de `estado_pago` al cambiar `metodo_pago` es segura?

5. **¿Los tests cubren los edge cases?**
   - ¿Efectivo: no permite `comprobante_subido`?
   - ¿Transferencia: permite `comprobante_subido → rechazado → pendiente`?
   - ¿Pagado: terminal para ambos métodos?
   - ¿Cancelado: no permite cambio de pago?
   - ¿`solo_pagos_pendientes`: excluye `pagado` y `cancelado`?
   - ¿Edit: rechaza pedidos online, cancelados, entregados?
   - ¿Stock insuficiente: rollback completo?

6. **¿La documentación coincide con el código?**
   - ¿Los 4 estados de pago en schema coinciden con DB y documentación?
   - ¿Los errores HTTP (403Forbidden, 400Validation, 404NotFound, 409InsufficientStock) coinciden?
   - ¿Los endpoints documentados existen todos en las rutas?
   - ¿Las reglas funcionales del AGENTS.md están implementadas?

7. **¿Quedan vulnerabilidades o inconsistencias?**
   - ¿`updateEstadoPedido` (cocina) también debería usar `SELECT ... FOR UPDATE`?
   - ¿`createCajaSchema` debería limitar `estado_pedido` a estados seguros?
   - ¿`pedidoQuerySchema` debería usar `.strict()`?
   - ¿Hay riesgos de seguridad no mitigados?

---

## 10. Formato de respuesta esperado

### 10.1 — Resumen ejecutivo

Tabular con:
- ¿Código real coincide con documentación? (SÍ/PARCIAL/NO)
- ¿State machine de pago bien implementada? (SÍ/PARCIAL/NO)
- ¿`updateEstadoPago` atómico? (SÍ/NO)
- ¿Filtro solo_pagos_pendientes correcto? (SÍ/PARCIAL/NO)
- ¿`editWithTransaction` correcto? (SÍ/PARCIAL/NO)
- ¿Tests cubren edge cases? (SÍ/PARCIAL/NO)
- ¿Documentación consistente? (SÍ/PARCIAL/NO)
- ¿Listo para B6.3? (SÍ/NO)
- ¿Veredicto general?

### 10.2 — Hallazgos críticos (CRIT)

Cada hallazgo con:
- ID (CRIT-N)
- Archivo(s)
- Descripción del problema
- Impacto
- Severidad
- Fix requerido

### 10.3 — Hallazgos importantes (IMP)

Mismo formato que CRIT pero severidad importante.

### 10.4 — Cosas bien aplicadas (OK)

Cada hallazgo positivo con:
- ID (OK-N)
- Archivo(s)
- Evidencia
- Veredicto

### 10.5 — Veredicto final

```txt
¿El código real coincide con la documentación post-reconciliación? SÍ/NO
¿B6.2 (caja pagos) está correctamente implementado? SÍ/NO
¿B6.2.1 (hardening) está correctamente implementado? SÍ/NO
¿La reconciliación B6.2.2 está completa? SÍ/NO
¿Se puede avanzar a B6.3? SÍ/NO
```

Siguiente paso recomendado y riesgos identificados.

---

## 11. Instrucciones para ejecutar la auditoría

1. **Leer** todos los archivos listados en la sección 7.
2. **Verificar** cada item de la sección 8.
3. **Responder** las preguntas de la sección 9.
4. **Evaluar** consistencia documentación vs código (sección 8.8).
5. **Generar** el reporte con el formato de la sección 10.
6. **Incluir** un veredicto final claro y recomendaciones de siguiente paso.

---

## 12. Notas sobre lo que cambió desde la auditoría anterior (37)

La auditoría 37 encontró **7 hallazgos críticos** porque el ZIP no contenía las funcionalidades. Desde entonces:

| Hallazgo CRIT-37 | Estado actual B6.2.2 |
|-----------------|---------------------|
| CRIT-1: `updateEstadoPago` sin state machine | ✅ `updateEstadoPago` ahora es transaccional con `SELECT ... FOR UPDATE`, `transitionsByMethod`, `validatePaymentTransition`, rechaza transición nula, bloquea cancelados |
| CRIT-2: Controller no maneja transiciones inválidas | ✅ `cambiarPago` maneja `-1` y `-2` |
| CRIT-3: `updateEstadoPagoSchema` no permite `comprobante_subido` | ✅ Ahora permite los 4 valores |
| CRIT-4: No existe filtro `solo_pagos_pendientes` | ✅ Existe en schema y modelo |
| CRIT-5: No existe `PUT /api/admin/pedidos/:id` | ✅ Existe con `editWithTransaction` |
| CRIT-6: No existe `caja.test.js` | ✅ Existe con 850 líneas |
| CRIT-7: OpenSpec afirma funcionalidades que no existían | ✅ OpenSpec y docs actualizados para coincidir con código real |

Además, IMP-4 de la auditoría 37 (`updateEstadoPedido` no atómico) **sigue pendiente** — se recomienda evaluar si requiere fix.

---

*Fin del prompt de auditoría B6.2.2 post-reconciliación.*