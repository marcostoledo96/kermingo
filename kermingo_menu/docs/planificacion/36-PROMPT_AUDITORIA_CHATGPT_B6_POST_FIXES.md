# Prompt de auditoría para ChatGPT 5.5 — Kermingo B6 post-fixes

> Copiá este archivo entero y pegalo en ChatGPT 5.5 (modo GPT-5.5, reasoning alto).
> El objetivo es que **corrobore que todo esté bien** y **arme un planning** para lo que sigue.

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

## 3. Arquitectura actual del backend

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
    │   │                           # validatePaymentTransition, TRANSICIONES_VALIDAS
    │   └── configuracion.model.js # findPublic, findAdmin, updateMinimal
    ├── schemas/
    │   ├── auth.schema.js
    │   ├── producto.schema.js
    │   ├── pedido.schema.js       # Zod: createPedido, createCaja, query, updateEstado, updatePago, edit, idParam
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
| POST | /api/admin/pedidos/caja | admin | crearCaja | Pedido de caja rápida |
| GET | /api/admin/pedidos | admin | listarAdmin | Lista con filtros y paginación |
| GET | /api/admin/pedidos/:id | admin | obtenerAdmin | Detalle completo |
| PATCH | /api/admin/pedidos/:id/estado | admin | cambiarEstado | Avanza estado (recibido→en_preparacion→listo→entregado) |
| PATCH | /api/admin/pedidos/:id/pago | admin | cambiarPago | State machine de pago (método-aware) |
| PATCH | /api/admin/pedidos/:id/cancelar | admin | cancelar | Cancela y repone stock |
| PUT | /api/admin/pedidos/:id | admin | editar | Edición con reconciliación transaccional de stock |
| GET | /api/admin/cocina/pedidos | admin | listarCocina | Lista pedidos activos (excluye cancelado/entregado) |
| GET | /api/admin/cocina/pedidos/:id | admin | obtenerCocina | Detalle con items |
| PATCH | /api/admin/cocina/pedidos/:id/estado | admin | cambiarEstadoCocina | Transición de cocina |
| GET | /api/configuracion-tienda | público | obtenerPublico | Estado + mensaje público |
| GET | /api/admin/configuracion-tienda | admin | obtenerAdmin | Config completa |
| PUT | /api/admin/configuracion-tienda | admin + trusted origin | actualizarAdmin | Actualiza estado, mensaje, hora cena |

---

## 4. State machines implementadas

### Estado del pedido
```
recibido → en_preparacion → listo → entregado
```
`TRANSICIONES_VALIDAS` en `pedido.model.js`. Transición nula (mismo estado) = false → 400.

### Estado del pago (método-aware)
```
pendiente → pagado | comprobante_subido
comprobante_subido → pagado | rechazado
rechazado → pendiente
pagado → (terminal)
```
`PAGO_TRANSITIONS` con reglas por método (efectivo no permite `comprobante_subido`).
Transición nula (mismo estado) = false → 400.

---

## 5. Estado actual post-fixes retroactivos

### Ramas y commits

Se hizo un ciclo SDD retroactivo sobre **5 PRs** que estaban mergeados en ramas feature pero **nunca integrados a main** (main sigue en B5.2.1). Los fixes están pusheados:

| Rama | PR original | Fix commit | Qué se arregló |
|------|------------|------------|----------------|
| `feature/backend-b6-1-cocina-review-fixes` | #1 cocina | `d3de463` | GROUP BY, duplicación TRANSICIONES, bug transición nula, tests con `jest.unstable_mockModule` |
| `feature/backend-b6-2-caja` | #3 caja | `fcef949` | Acentos, idempotencia PATCH pago, cleanup con `cancelWithTransaction`, `afterAll(pool.end)`, tests deterministas con `TEST-FILTER-*`, invariante stock |
| `feature/backend-b6-2-caja-edicion` | #4 edicion | `e7a99f3` | Cleanup con `cancelWithTransaction`, `afterAll(pool.end)`, catch `producto inactivo → 400` |
| `feature/backend-b6-2-1-caja-hardening` | #5 hardening | `936e997` | Acentos en `cambiarPago`, test asertivo (primer PATCH no se validaba) |

Además, en la rama `feature/backend-b6-1-cocina-review-fixes` hay un commit `9dedd7e` con los SDD artifacts (specs archivados + audit trails).

### Specs archivados como source of truth

| Spec | Archivo | Capability |
|------|---------|------------|
| Cocina | `openspec/specs/kitchen-operations/spec.md` | Listado, detalle, transición de cocina |
| Configuración | `openspec/specs/store-configuration/spec.md` | CRUD config tienda, CSRF, nullable |
| Caja | `openspec/specs/cashier-operations/spec.md` | State machine pagos, filtro unpaid |

### Tests

**88 tests pasan** en 4 suites (cuando todas las ramas están alineadas):
- `caja.test.js`: 36 tests (unit state machine, schema, auth boundary, PATCH integration, filter unpaid, edit integration)
- `cocina.test.js`: 3 tests (auth gating 401)
- `configuracion.test.js`: 4 tests (auth gating)
- `health.test.js`: 1 test

**Tests adicionales en ramas feature** (cuando están los 5 archivos untracked):
- `cocina.controller.test.js`: 9 tests (controller real con `jest.unstable_mockModule`)
- `cocina.unit.test.js`: 6 tests (`transicionEstadoValida` real)
- `configuracion.controller.test.js`: 14 tests (mocks)
- `configuracion.csrf.test.js`: 6 tests (origin middleware real)
- `configuracion.unit.test.js`: 20 tests (Zod schema)

**Total con tests untracked: 143 tests.**

---

## 6. DB Schema (9 tablas)

| Tabla | Filas seed | Propósito |
|-------|-----------|-----------|
| `usuario` | 1 (admin) | Login |
| `producto` | 24 | Menú (comida, bebida, promos) |
| `categoria` | 5 | Categorías de producto |
| `producto_categoria` | — | Relación N:M |
| `combo_producto` | 4 combos | Componentes de promos |
| `pedido` | — | Pedidos (KMG-XXXX) |
| `pedido_detalle` | — | Items del pedido |
| `configuracion_tienda` | 1 (id=1, estado='cerrada') | Config singleton |
| `archivo` | — | Comprobantes en Drive (B6.3) |

---

## 7. Lo que sigue (B6.3 → B7 → deploy)

### B6.3 — Comprobantes y archivos
- Multer + Google Drive API para comprobantes de transferencia
- Endpoints: upload, descarga, revisión (aprobar/rechazar)
- Middleware de archivos (tamaño, tipo MIME)
- `archivo` table en DB
- Tests de integración

### B7 — Frontend
- Migrar páginas v0 a `frontend/` activo
- Carrito, checkout, seguimiento
- Admin dashboard, caja, cocina, productos
- Responsive mobile-first con Tailwind
- jsPDF para ticket

### Deploy
- Railway: backend + MySQL
- Vercel: frontend (root directory: `frontend/`)
- Variables de entorno: `FRONTEND_URL`, `JWT_SECRET`, `DB_*`, `GOOGLE_DRIVE_*`

---

## 8. Qué pedirle al auditor (ChatGPT 5.5)

### 8.1 — Que corrobore que los fixes están bien aplicados

- ¿La state machine de pedido rechaza correctamente transiciones nulas (400)?
- ¿La state machine de pago es método-aware y rechaza transiciones nulas?
- ¿El cleanup de tests (`cancelWithTransaction` en `caja.test.js`) evita la doble reposición de stock?
- ¿El `afterAll(pool.end())` cierra correctamente las conexiones?
- ¿Los mensajes de error tienen acentos consistentes?
- ¿Los tests del filtro `solo_pagos_pendientes` son deterministas con fixtures propios?
- ¿El catch de `producto inactivo` en `editar` devuelve 400 en vez de 500?
- ¿`requireTrustedOrigin` en config admin PUT bloquea origins hostiles?
- ¿`ForbiddenError` (403) se usa correctamente en el middleware de origin?

### 8.2 — Que evalúe la documentación actual

- ¿Qué le falta a `docs/planificacion/` para ser una documentación de sistema útil para IA?
- ¿Qué docs deberían existir en una carpeta `DOCUMENTACION/IA/` estilo PaginaGrupo?
- ¿El `AGENTS.md` actual es suficiente como mapa documental?

### 8.3 — Que arme un planning para B6.3 y B7

- Orden de implementación recomendado
- Riesgos identificados
- Dependencias entre tareas
- Estimación de esfuerzo
- Qué validar antes de deploy
