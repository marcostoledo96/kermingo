# 42 — Prompt de inicio B6.3 — Nueva sesión

> Copiá este archivo entero y pegalo en OpenCode al comenzar una nueva sesión.
> Rama actual: `feature/backend-b6-1-cocina-review-fixes`
> Trabajar bajo metodología SDD con Gentle AI, delegando con subagentes.

---

## 1. Qué es Kermingo

Sistema web para evento scout recaudatorio del **20 de junio de 2026**.
Dirección: Echeverría 3920. Organizan: Grupo Scout San Patricio.

- **Backend**: Express + MySQL + JWT + MVC + Zod + Multer + Google Drive API
- **Frontend**: Next.js + React + TypeScript + TailwindCSS (en `frontend/`)
- **Referencia visual**: `diseno-de-landing-kermingo/` (v0, solo lectura, no modificar)
- **BD**: Railway MySQL, tablas en español singular, `mysql2/promise`

---

## 2. Dónde estamos (estado real del código)

La rama `feature/backend-b6-1-cocina-review-fixes` tiene TODO el backend base listo y auditado:

### Lo que YA funciona (126 tests, 0 fallos)

| Módulo | Estado | Tests |
|---|---|---|
| Auth JWT + cookies httpOnly | ✅ | auth.test.js |
| Productos (CRUD admin) | ✅ | producto.test.js |
| Pedidos públicos (crear, seguir) | ✅ | pedido.test.js |
| Cocina (recibido → en_preparación → listo → entregado) | ✅ | cocina.test.js, cocina.controller.test.js, cocina.unit.test.js |
| Configuración tienda (abierta/cerrada/demo) | ✅ | config.test.js, config.controller.test.js, config.csrf.test.js, config.unit.test.js |
| **Caja rápida** (crear pedidos admin) | ✅ | caja.test.js |
| **State machine de pago method-aware** (efectivo/transferencia) | ✅ | caja.test.js |
| **Filtro solo_pagos_pendientes** | ✅ | caja.test.js |
| **Edición transaccional** (editWithTransaction) | ✅ | caja.test.js |
| **Cancelación con reposición** (cancelWithTransaction) | ✅ | caja.test.js |
| **updateEstadoPago atómico** (SELECT FOR UPDATE) | ✅ | caja.test.js |
| **updateEstadoPedido atómico** (SELECT FOR UPDATE) | ✅ | probado en cocina |
| **origin.middleware** (safeOriginFromUrl, ForbiddenError 403) | ✅ | config.csrf.test.js |
| Schema SQL, seed con 24 productos + combos | ✅ | schema.sql, seed.sql |

### Estructura clave de archivos

```
backend/src/api/
├── controllers/pedido.controller.js   ← cambiarPago, editar, cancelar, crearCaja
├── middlewares/origin.middleware.js    ← safeOriginFromUrl, ForbiddenError 403
├── models/pedido.model.js             ← transiciones, editWithTransaction, updateEstadoPago
├── routes/pedido.routes.js            ← PUT /:id, PATCH /:id/pago, PATCH /:id/cancelar
├── schemas/pedido.schema.js           ← comprobante_subido, solo_pagos_pendientes, editPedidoSchema
├── utils/errors.js                    ← ValidationError, ForbiddenError, NotFoundError, AuthError
└── database/
    ├── schema.sql                      ← 9 tablas (incluye archivo_drive pendiente de crear)
    └── seed.sql                        ← 24 productos + combos
```

### State machine de pago actual

```
transitionsByMethod:
  efectivo:
    pendiente → pagado
    pagado: terminal

  transferencia:
    pendiente → pagado | comprobante_subido
    comprobante_subido → pagado | rechazado
    rechazado → pendiente | comprobante_subido
    pagado: terminal
```

---

## 3. Lo que sigue: B6.3 — Comprobantes / Google Drive

### Objetivo

Permitir que el usuario suba un comprobante de transferencia al hacer un pedido, y que el admin pueda verlo y aprobar/rechazar el pago.

### Tareas (según planificación 37-AUDITORIA)

```
1. Crear tabla archivo_drive en schema.sql
2. Agregar Google Drive service (google-drive.service.js)
3. Configurar Multer memoryStorage con límite de tamaño
4. Validar MIME: jpg, png, webp, pdf
5. POST /api/pedidos (transferencia) acepta archivo comprobante
6. Guardar metadata en tabla archivo_drive
7. Al subir comprobante: setear estado_pago = comprobante_subido
8. Endpoint admin GET /api/admin/pedidos/:id/comprobante → URL de Drive
9. PATCH /api/admin/pedidos/:id/pago → comprobante_subido → pagado | rechazado
10. Tests de transferencia con y sin comprobante
11. Actualizar documentación (API.md, CORE.md, INFRA.md, GOTCHAS.md)
```

### Reglas funcionales

- Solo pedidos con `metodo_pago = transferencia` pueden subir comprobante
- Si es efectivo, no se muestra ni acepta comprobante
- El comprobante se sube junto con el pedido (no en endpoint separado)
- El admin puede ver el comprobante (endpoint dedicado)
- El admin puede aprobar (comprobante_subido → pagado) o rechazar (comprobante_subido → rechazado)
- Caja rápida puede marcar transferencia como pagada sin comprobante (el vendedor verificó)
- Archivos: jpg, png, webp, pdf — máximo 5 MB
- La tabla archivo_drive guarda: id, pedido_id, drive_file_id, nombre_original, mime_type, tamaño, created_at

### Referencia técnica Google Drive

Ver `docs/planificacion/11-GOOGLE_DRIVE_ARCHIVOS.md`:
- Usar backend como intermediario (no subir directo desde frontend)
- Multer memoryStorage (sin disco)
- Google Drive API v3 con service account o API key
- Flujo: Multer memory → validar → subir a Drive → guardar metadata en MySQL → descartar buffer

---

## 4. Reglas no negociables

- Leé `AGENTS.md` del proyecto ANTES de tocar código
- `DOCUMENTACION/IA/` es fuente de verdad — leé los docs relevantes antes de escribir
- Tablas y campos en español, singular, sin tildes
- Endpoints en español
- Backend valida todo aunque el frontend ya valide
- Tests obligatorios para cada feature nueva
- `npm test` debe pasar antes de commit
- No modificar `diseno-de-landing-kermingo/` ni `frontend/` (B6.3 es solo backend)
- No implementar B7 (frontend) hasta que Marcos lo pida
- Delegá trabajo real a subagentes SDD

### Pipeline SDD para B6.3

```
explore → propose → spec → design → tasks → apply → verify → archive
```

Usá `delegate` (async) para exploración, apply, verify. Usá `task` (sync) solo si necesitás el resultado antes del siguiente paso.

---

## 5. Documentos clave a leer

| Doc | Para qué |
|---|---|
| `AGENTS.md` | Reglas del proyecto |
| `DOCUMENTACION/IA/API.md` | Endpoints actuales |
| `DOCUMENTACION/IA/CORE.md` | State machines, lógica de negocio |
| `DOCUMENTACION/IA/INFRA.md` | Base de datos, pool |
| `DOCUMENTACION/IA/ARQUITECTURA.md` | Estructura del proyecto |
| `DOCUMENTACION/IA/GOTCHAS.md` | Trampas conocidas |
| `DOCUMENTACION/IA/TESTING.md` | Cómo estructurar tests |
| `docs/planificacion/11-GOOGLE_DRIVE_ARCHIVOS.md` | Diseño de integración Drive |
| `backend/src/api/database/schema.sql` | Schema actual (9 tablas) |
| `backend/src/api/models/pedido.model.js` | Modelo de pedidos (referencia para nuevo código) |

---

## 6. Resultado esperado al terminar B6.3

```txt
## Resultado B6.3 — Comprobantes / Google Drive

Pipeline SDD ejecutado:
- explore:
- propose:
- spec:
- design:
- tasks:
- apply:
- verify:
- archive:

Archivos creados/modificados:
-

Tabla archivo_drive:
-

Drive service:
-

Endpoint comprobante:
-

Tests agregados:
-

Resultados npm test:
-

Pendientes:
-

Checkpoint automático: listo
Checkpoint manual requerido: si/no
Auditoría con ChatGPT recomendada: si
Bloquea avance a B7: si/no

Veredicto:
-
```

---

## 7. Notas para el agente

- La rama ya tiene 126 tests pasando — mantenelos verdes
- Si necesitás credenciales de Google Drive, están en `.env` (NO las leas, solo usalas)
- La tabla `archivo_drive` todavía NO existe en `schema.sql` — hay que crearla
- El modelo `pedido.model.js` ya tiene `updateEstadoPago` atómico y `transitionsByMethod` — reusalo
- El schema `pedido.schema.js` ya acepta `comprobante_subido` en `updateEstadoPagoSchema`
- Multer hay que instalarlo si no está: `npm install multer`
- Google Drive API hay que instalarla si no está: `npm install googleapis`
- Si algo no está claro, preguntame antes de implementar
