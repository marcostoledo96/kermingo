# Prompt de auditoría para ChatGPT 5.5 — Kermingo B6.2.3 post-hardening

> Copiá este archivo entero y pegalo en ChatGPT 5.5 (modo GPT-5.5, reasoning alto).
> El objetivo es que **corrobore que el hardening B6.2.3 se aplicó correctamente**
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

La auditoría B6.2.2 (documento 39) verificó que la reconciliación caja/pagos/edición estaba correcta, pero encontró puntos a corregir antes de B6.3:

| Hallazgo B6.2.2 | Severidad |
|-----------------|-----------|
| CRIT-1: `requireTrustedOrigin` valida `Referer` con `startsWith` → acepta dominios con prefijo engañoso | CRÍTICA |
| IMP-1: Cleanup de `caja.test.js` usa prefijo amplio `TEST-%`, no el `RUN_ID` | IMPORTANTE |
| IMP-2: Cleanup puede borrar pedidos terminales sin reponer stock | IMPORTANTE |
| IMP-3: `caja.test.js` cierra el pool dos veces | BAJA-MEDIA |
| IMP-4: `updateEstadoPedido` no es atómico (SELECT → validar → UPDATE sin lock) | IMPORTANTE |
| IMP-5: `pedidoQuerySchema` no usa `.strict()` | BAJA-MEDIA |
| IMP-6: `findAllAdmin` usa truthiness para `solo_pagos_pendientes` en vez de `=== true` | BAJA-MEDIA |
| IMP-7: Cancelación/edición de promos depende de `combo_producto` actual (deuda futura) | IMPORTANTE FUTURO |

Veredicto B6.2.2: **"B6.2.2 está bien reconciliada, pero recomiendo una B6.2.3 corta de hardening antes de B6.3"**.

### 3.2 — Qué se hizo en B6.2.3 (hardening)

Se aplicaron los 7 fixes recomendados más 2 tests CSRF nuevos:

| Fix | Descripción | Archivo(s) |
|-----|-------------|------------|
| CRIT-1 | `requireTrustedOrigin` ahora usa `safeOriginFromUrl()` con `new URL(referer).origin` en vez de `Referer.startsWith()` | `origin.middleware.js` |
| IMP-4 | `updateEstadoPedido` ahora es atómico: `getConnection + beginTransaction + SELECT FOR UPDATE + commit/rollback + release` | `pedido.model.js` |
| IMP-5 | `pedidoQuerySchema` ahora termina en `.strict()` | `pedido.schema.js` |
| IMP-6 | `findAllAdmin` usa `solo_pagos_pendientes === true` (strict boolean) | `pedido.model.js` |
| IMP-1 | `limpiarPedidosDeTest` usa `LIKE '${RUN_ID}%'` en vez de `LIKE 'TEST-%'` | `caja.test.js` |
| IMP-2 | Cleanup maneja estados terminales: `listo`/`entregado` → `console.warn` + fallthrough a DELETE | `caja.test.js` |
| IMP-3 | Un solo `afterAll(pool.end())` con try/catch | `caja.test.js` |
| IMP-7 | Nueva sección 11 en `GOTCHAS.md` documentando deuda de promos/combo_producto | `GOTCHAS.md` |
| TEST-1 | Test CSRF: Referer malicioso con prefijo engañoso (`${ORIGIN}.evil.com/...`) → 403 | `configuracion.csrf.test.js` |
| TEST-2 | Test CSRF: Origin inválido prioritario sobre Referer válido → 403 | `configuracion.csrf.test.js` |

Estado de tests: **126/126 pasan**.

### 3.3 — Rama actual

```
feature/backend-b6-1-cocina-review-fixes
```

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
    │   ├── origin.middleware.js    # CSRF: safeOriginFromUrl() + ForbiddenError (403)
    │   ├── validate.middleware.js  # Zod validation
    │   └── error.middleware.js     # Global error handler
    ├── routes/
    │   ├── index.routes.js        # Monta /api/auth, /productos, /pedidos, /admin/*, /configuracion-tienda
    │   ├── auth.routes.js
    │   ├── producto.routes.js
    │   ├── pedido.routes.js       # Público + admin (caja, cocina, edicion, cancelar)
    │   ├── cucina.routes.js
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
    │   ├── pedido.model.js        # createWithTransaction, findKitchenPedidos, updateEstadoPedido (ATÓMICO),
    │   │                           # updateEstadoPago, cancelWithTransaction, editWithTransaction,
    │   │                           # validatePaymentTransition, TRANSICIONES_VALIDAS,
    │   │                           # transitionsByMethod, PAGO_TRANSITIONS, findAllAdmin (=== true)
    │   └── configuracion.model.js # findPublic, findAdmin, updateMinimal
    ├── schemas/
    │   ├── auth.schema.js
    │   ├── producto.schema.js
    │   ├── pedido.schema.js       # createPedido, createCaja, pedidoQuery (.strict()),
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
5. **Filtro solo_pagos_pendientes**: muestra pedidos con `estado_pago IN ('pendiente', 'rechazado')` excluyendo `estado_pedido = 'cancelado'`. No filtra por origen.
6. **Edición de pedidos**: solo pedidos `origen = 'caja'`, no cancelados ni entregados.
7. **Edición transaccional**: usa `SELECT ... FOR UPDATE`, restaura stock anterior, calcula requerimientos nuevos, valida stock con reposición aplicada, aplica delta neto, reescribe `pedido_detalle`, recalcula total.
8. **Cancelación transaccional**: usa `SELECT ... FOR UPDATE`, solo desde `recibido` o `en_preparacion`, repone stock de componentes de promos, omite productos ilimitados.
9. **Si elige transferencia**: comprobante obligatorio (para B6.3).
10. **Si elige efectivo**: no mostrar ni enviar comprobante.
11. **Caja rápida puede marcar efectivo como pagado automáticamente**.
12. **Caja rápida puede marcar transferencia como pagada sin comprobante** si el vendedor la verificó.
13. **requireTrustedOrigin usa `safeOriginFromUrl()` + `new URL(referer).origin`** para comparar el origin real del Referer (no `startsWith`). Usar `ForbiddenError` (403) para rechazos.
14. **`updateEstadoPedido` es atómico**: usa `getConnection + beginTransaction + SELECT FOR UPDATE + commit/rollback + release`.
15. **El backend valida todo aunque el frontend ya valide**.

---

## 7. Archivos a auditar

### Código fuente (cambios B6.2.3)

| Archivo | Qué auditar específicamente |
|---------|-----------------------------|
| `backend/src/api/middlewares/origin.middleware.js` | `safeOriginFromUrl()` usa `new URL(value).origin` con try/catch, `requireTrustedOrigin` ya no usa `startsWith`, flujo: safe-methods bypass → Origin exacto → Referer origin exacto → 403 |
| `backend/src/api/models/pedido.model.js` | `updateEstadoPedido` es atómico con `getConnection + beginTransaction + SELECT FOR UPDATE + commit/rollback + release`, `findAllAdmin` usa `=== true` para `solo_pagos_pendientes` |
| `backend/src/api/schemas/pedido.schema.js` | `pedidoQuerySchema` termina en `.strict()` |
| `DOCUMENTACION/IA/GOTCHAS.md` | Sección 11 sobre deuda de promos/combo_documento existe y documentada |

### Tests (cambios B6.2.3)

| Archivo | Qué auditar específicamente |
|---------|-----------------------------|
| `backend/tests/caja.test.js` | `limpiarPedidosDeTest` usa `LIKE '${RUN_ID}%'`, maneja estados terminales con `console.warn`, un solo `afterAll(pool.end())` con try/catch |
| `backend/tests/configuracion.csrf.test.js` | 2 tests nuevos: (1) Referer malicioso con prefijo engañoso → 403, (2) Origin inválido prioritario sobre Referer válido → 403 |

### Documentación

| Archivo | Qué verificar |
|---------|---------------|
| `DOCUMENTACION/IA/GOTCHAS.md` | Sección 7 actualizada: refleja `safeOriginFromUrl` en vez de `startsWith`. Sección 11 nueva: deuda de promos |
| `DOCUMENTACION/IA/API.md` | Endpoints, schemas y middleware de origin consistentes |
| `DOCUMENTACION/IA/CORE.md` | `updateEstadoPedido` atómico documentado |
| `DOCUMENTACION/IA/TESTING.md` | 126 tests, coverage de CSRF nuevos |
| `DOCUMENTACION/IA/AUTENTICACION.md` | Flujo de `requireTrustedOrigin` con `safeOriginFromUrl` |

---

## 8. Qué verificar específicamente

### 8.1 — CRIT-1: Origin middleware ya no acepta Referers con prefijo engañoso

- [ ] ¿Existe la función `safeOriginFromUrl(value)`?
- [ ] ¿`safeOriginFromUrl` usa `new URL(value).origin` con try/catch que retorna `null` en error?
- [ ] ¿`requireTrustedOrigin` YA NO usa `referer.startsWith(environments.frontendUrl)` en ninguna rama?
- [ ] ¿El flujo del middleware es: safe-methods → bypass; `origin === trustedOrigin` → next; `refererOrigin === trustedOrigin` → next; else → 403?
- [ ] ¿Se compara `refererOrigin` (el origin parseado del Referer) con `trustedOrigin` usando `===` (igualdad estricta), no `startsWith`?
- [ ] ¿`safeOriginFromUrl` retorna `null` si el Referer es una URL inválida que no se puede parsear?
- [ ] ¿Si `origin` está presente pero no es confiable, se ignora el Referer y se rechaza (403)? Es decir: ¿Origin tiene prioridad sobre Referer?

### 8.2 — IMP-4: updateEstadoPedido es realmente atómico

- [ ] ¿Usa `pool.getConnection()` para obtener una conexión del pool?
- [ ] ¿Llama `await conn.beginTransaction()`?
- [ ] ¿Hace `SELECT id, estado_pedido FROM pedido WHERE id = ? FOR UPDATE` para lockear la fila?
- [ ] ¿Valida existencia y transición bajo el lock (antes del commit)?
- [ ] ¿Si no existe, hace `rollback()` y retorna `0`?
- [ ] ¿Si la transición es inválida, hace `rollback()` y retorna `-1`?
- [ ] ¿Hace el `UPDATE` dentro de la transacción?
- [ ] ¿Hace `commit()` después del UPDATE exitoso?
- [ ] ¿Hace `rollback()` en el bloque `catch`?
- [ ] ¿Llama `conn.release()` en el bloque `finally`? ¿Incluso si hay error o rollback?
- [ ] ¿Eliminó el viejo patrón `SELECT → validar → pool.query(UPDATE)` sin lock?

### 8.3 — IMP-5: pedidoQuerySchema usa .strict()

- [ ] ¿`pedidoQuerySchema` termina en `.strict()`?
- [ ] ¿Esto previene que campos extra en query params se pasen al controller sin validación?

### 8.4 — IMP-6: findAllAdmin usa strict boolean para solo_pagos_pendientes

- [ ] ¿La condición es `filters.solo_pagos_pendientes === true` (no truthiness)?
- [ ] ¿El string `'false'` ya no activaría el filtro por accidente?
- [ ] ¿El `else if (filters.estado_pago)` sigue funcionando correctamente cuando `solo_pagos_pendientes` es `false`?

### 8.5 — IMP-1/2/3: Cleanup de tests es seguro

- [ ] ¿`limpiarPedidosDeTest` usa `LIKE '${RUN_ID}%'` en vez de `LIKE 'TEST-%'`?
- [ ] ¿El SELECT trae `estado_pedido` para cada pedido?
- [ ] ¿Si un pedido está en estado terminal (`listo`/`entregado`), el código hace `console.warn`?
- [ ] ¿Se intenta `cancelWithTransaction` para cada pedido (incluidos terminales, que fallarán)?
- [ ] ¿Después del intento de cancel, se hace un segundo SELECT para los restantes y DELETE directo de detalles y pedido?
- [ ] ¿Hay un solo `afterAll(pool.end())` con try/catch?
- [ ] ¿Se eliminó el segundo `afterAll(pool.end())` duplicado?

### 8.6 — IMP-7: Documentación de deuda de promos

- [ ] ¿Existe una sección 11 en `GOTCHAS.md`?
- [ ] ¿Documenta que cancelación/edición de promos depende de `combo_producto` actual?
- [ ] ¿Lista al menos una opción de fix antes de habilitar ABM de combos?
- [ ] ¿Declara explícitamente que es deuda aceptable para el MVP actual?

### 8.7 — Tests CSRF nuevos

- [ ] ¿Hay un test "Referer con prefijo engañoso → 403"?
- [ ] ¿El Referer malicioso usa un patrón tipo `${ORIGIN}.evil.com/path` que antes pasaría con `startsWith`?
- [ ] ¿Se espera explícitamente `statusCode` 403?
- [ ] ¿Hay un test "Origin inválido aunque Referer válido → 403"?
- [ ] ¿Este test envía ambos headers: `Origin: https://evil.example.com` + `Referer: ${ORIGIN}/...`?
- [ ] ¿Se espera 403 (prioridad de Origin sobre Referer)?
- [ ] ¿Los tests CSRF anteriores siguen pasando? (Origin confiable → 200, Origin hostil → 403, Referer confiable sin Origin → 200, Referer hostil → 403, sin Origin/Referer → 403, GET con Origin hostil → 200)

### 8.8 — Consistencia documentación vs código

- [ ] ¿`GOTCHAS.md` sección 7 refleja el cambio de `startsWith` a `safeOriginFromUrl`?
- [ ] ¿`GOTCHAS.md` sección 11 existe sobre deuda de promos?
- [ ] ¿`CORE.md` documenta que `updateEstadoPedido` es atómico con `SELECT FOR UPDATE`?
- [ ] ¿`AUTENTICACION.md` describe `safeOriginFromUrl` en el flujo de `requireTrustedOrigin`?
- [ ] ¿`TESTING.md` refleja 126 tests y los 2 tests CSRF nuevos?
- [ ] ¿Los errores HTTP mencionados en documentación coinciden con el código? (403 para Forbidden, 401 para Auth, 404 para NotFound, 400 para Validation, 409 para InsufficientStock)

---

## 9. Preguntas específicas para el auditor

1. **¿El fix CRIT-1 cierra la vulnerabilidad de Referer con prefijo engañoso?**
   - ¿`safeOriginFromUrl` parsea correctamente URLs con subdominios maliciosos?
   - ¿`new URL('https://kermingo.vercel.app.evil.com/path').origin` retorna `'https://kermingo.vercel.app.evil.com'`, no `'https://kermingo.vercel.app'`?
   - ¿Hay algún edge case donde `new URL().origin` pueda devolver el origin equivocado?
   - ¿Qué pasa con URLs tipo `file://`, `data:`, o sin protocolo?

2. **¿`updateEstadoPedido` es verdaderamente atómico ahora?**
   - ¿El `SELECT ... FOR UPDATE` evita race conditions entre dos operadores de cocina avanzando estado simultáneamente?
   - ¿Hay ventana entre el release del lock y la respuesta al cliente donde otro request podría interferir?
   - ¿El patrón `beginTransaction → SELECT FOR UPDATE → UPDATE → commit` es correcto?
   - ¿Qué pasa si `conn.release()` se llama después de un `rollback`? ¿Es seguro?

3. **¿El cleanup de tests es seguro con `RUN_ID`?**
   - ¿`limpiarPedidosDeTest` afecta solo pedidos del run actual?
   - ¿Qué pasa si un test deja un pedido en `listo` o `entregado`? ¿Se pierde stock?
   - ¿El `console.warn` es suficiente o debería fallar el test suite?
   - ¿El DELETE directo de pedidos terminales omite la reposición de stock? ¿Es aceptable para tests?

4. **¿Los nuevos tests CSRF ejercitan los casos correctos?**
   - ¿El Referer `${ORIGIN}.evil.com/...` reproduciría el bug original de `startsWith`?
   - ¿El test de Origin inválido sobre Referer válido valida la prioridad correcta del header `Origin`?
   - ¿Faltan edge cases? (ej: Origin vacío `""` vs Origin ausente, Referer con puerto diferente, Origin con path)

5. **¿`pedidoQuerySchema` con `.strict()` rompe algo existente?**
   - ¿Los query params que el frontend envía coinciden exactamente con los campos del schema?
   - ¿Paginación (`page`, `limit`) está incluida en el schema?

6. **¿La documentación sigue alineada después del hardening?**
   - ¿Las secciones de `GOTCHAS.md` reflejan los cambios de B6.2.3?
   - ¿`CORE.md` dice que `updateEstadoPedido` es atómico?
   - ¿`AUTENTICACION.md` describe el flujo actualizado de `requireTrustedOrigin`?
   - ¿Los 126 tests en `TESTING.md` incluyen los 2 CSRF nuevos?

7. **¿Quedan vulnerabilidades o inconsistencias post-B6.2.3?**
   - ¿`safeOriginFromUrl` maneja URLs con caracteres unicode o encoding inesperado?
   - ¿El `new URL()` constructor de Node.js tiene edge cases de seguridad?
   - ¿Hay otros lugares donde se usa `startsWith` para comparar origins o dominios?
   - ¿`updateEstadoPedido` atómico interactúa bien con `cancelWithTransaction` (que también hace `SELECT FOR UPDATE` sobre la misma fila)?

---

## 10. Formato de respuesta esperado

### 10.1 — Resumen ejecutivo

Tabular con:
- ¿CRIT-1 (Referer por origin) está bien fixeado? (SÍ/PARCIAL/NO)
- ¿IMP-4 (updateEstadoPedido atómico) está bien implementado? (SÍ/NO)
- ¿IMP-5 (pedidoQuerySchema .strict()) está bien aplicado? (SÍ/NO)
- ¿IMP-6 (solo_pagos_pendientes === true) está bien aplicado? (SÍ/NO)
- ¿IMP-1/2/3 (test cleanup seguro) está bien corregido? (SÍ/PARCIAL/NO)
- ¿IMP-7 (deuda de promos documentada)? (SÍ/NO)
- ¿Tests CSRF nuevos cubren los casos? (SÍ/PARCIAL/NO)
- ¿Documentación consistente con código? (SÍ/PARCIAL/NO)
- ¿126/126 tests pasan? (SÍ/NO)
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
¿CRIT-1 (Referer/Origin) está correctamente corregido? SÍ/NO
¿IMP-4 (updateEstadoPedido atómico) está correctamente implementado? SÍ/NO
¿IMP-5/6 (schema/filtro) están correctamente aplicados? SÍ/NO
¿IMP-1/2/3 (test cleanup) están correctamente corregidos? SÍ/NO
¿IMP-7 (deuda de promos documentada)? SÍ/NO
¿B6.2.3 hardening está completo? SÍ/NO
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

## 12. Notas sobre lo que cambió desde la auditoría B6.2.2 (documento 39)

La auditoría 39 encontró **1 hallazgo crítico + 7 importantes**. Desde entonces:

| Hallazgo B6.2.2 | Estado actual B6.2.3 |
|-----------------|---------------------|
| CRIT-1: `requireTrustedOrigin` usa `Referer.startsWith()` | ✅ Ahora usa `safeOriginFromUrl()` con `new URL(referer).origin` + comparación estricta `===` |
| IMP-1: Cleanup usa `TEST-%` genérico | ✅ Ahora usa `LIKE '${RUN_ID}%'` |
| IMP-2: Cleanup borra terminales sin reponer stock | ✅ Ahora hace `console.warn` + fallthrough a DELETE (aceptable para tests) |
| IMP-3: Pool cerrado dos veces | ✅ Un solo `afterAll(pool.end())` con try/catch |
| IMP-4: `updateEstadoPedido` no atómico | ✅ Ahora usa `getConnection + beginTransaction + SELECT FOR UPDATE + commit/rollback + release` |
| IMP-5: `pedidoQuerySchema` sin `.strict()` | ✅ Ahora termina en `.strict()` |
| IMP-6: `findAllAdmin` usa truthiness | ✅ Ahora usa `=== true` |
| IMP-7: Deuda de promos no documentada | ✅ Sección 11 nueva en `GOTCHAS.md` |

Además:
- Se agregaron 2 tests CSRF nuevos para el fix CRIT-1
- Tests totales pasaron de 124 a 126

---

*Fin del prompt de auditoría B6.2.3 post-hardening.*