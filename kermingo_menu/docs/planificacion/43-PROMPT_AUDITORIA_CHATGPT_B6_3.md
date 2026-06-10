# Prompt de auditoría para ChatGPT 5.5 — Kermingo B6.3 Comprobantes / Google Drive

> Copiá este archivo entero y pegalo en ChatGPT 5.5 (modo GPT-5.5, reasoning alto).
> El objetivo es que **valide que la implementación B6.3 (comprobantes de transferencia + Google Drive) es correcta, segura y consistente** con el resto del sistema, y que los 162 tests (1 fallo aislado por test-isolation) cubren adecuadamente la funcionalidad.

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
- Subida de comprobante de transferencia a Google Drive (B6.3)
- Visión de comprobante por admin (GET /api/admin/pedidos/:id/comprobante)
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
| Archivos | Multer memoryStorage + Google Drive API v3 | Comprobantes de transferencia |
| Reportes | ExcelJS | Exportación de ventas |
| Testing | Jest 29 + Supertest | `--experimental-vm-modules` |
| Frontend | Next.js + React + TypeScript + TailwindCSS | En `frontend/` |
| Componentes UI | shadcn-style | Basados en referencia v0 |
| Carrito | localStorage | Persistencia de cliente |
| PDF | jsPDF | Ticket de pedido |

---

## 3. Contexto de esta auditoría

### 3.1 — Qué pasó antes (B6.2.2 + B6.2.3 hardening)

Las auditorías B6.2.2 (documento 39) y B6.2.3 (documento 41) verificaron y corrigieron:

| Hallazgo | Severidad | Estado |
|----------|-----------|--------|
| CRIT‑1: `requireTrustedOrigin` usaba `Referer.startsWith()` — aceptaba dominios con prefijo engañoso | CRÍTICA | ✅ Fixeado con `safeOriginFromUrl()` + `new URL().origin` + comparación estricta `===` |
| IMP‑1: Cleanup tests usaba prefijo `TEST-%` genérico | IMPORTANTE | ✅ Ahora `LIKE '${RUN_ID}%'` |
| IMP‑2: Cleanup borraba terminales sin reponer stock | IMPORTANTE | ✅ `console.warn` + fallthrough (aceptable para tests) |
| IMP‑3: Pool cerrado dos veces | BAJA | ✅ Un `afterAll(pool.end())` con try/catch |
| IMP‑4: `updateEstadoPedido` no atómico (SELECT→UPDATE sin lock) | IMPORTANTE | ✅ Atómico con `getConnection + beginTransaction + SELECT FOR UPDATE + commit/rollback + release` |
| IMP‑5: `pedidoQuerySchema` sin `.strict()` | BAJA | ✅ `.strict()` agregado |
| IMP‑6: `findAllAdmin` usaba truthiness para `solo_pagos_pendientes` | BAJA | ✅ Ahora `=== true` |
| IMP‑7: Deuda de promos no documentada | IMPORTANTE FUTURO | ✅ Sección 11 en GOTCHAS.md |

Veredicto final B6.2.3: **"Todo fixeado, listo para B6.3".**

### 3.2 — Qué se hizo en B6.3 (Comprobantes / Google Drive)

| Feature | Descripción | Archivos nuevos/modificados |
|---------|-------------|-----------------------------|
| Tabla `archivo_drive` | `drive_id, nombre_original, mime_type, tamanio_bytes, tipo, url_publica, created_at` | `schema.sql` (ya existía la tabla pero se completó) |
| Google Drive service | Subida de archivos via Service Account con `drive.file` scope | `drive.service.js` (NUEVO) |
| Multer middleware | memoryStorage, MIME filter (jpg/png/webp/pdf), 5 MB limit | `upload.middleware.js` (NUEVO) |
| `createPedidoSchema` | `z.preprocess` para `items` como JSON string (multipart) | `pedido.schema.js` |
| `POST /api/pedidos` | Acepta multipart con campo `comprobante`; sube a Drive ANTES de la transacción DB | `pedido.controller.js` (crear), `pedido.routes.js` |
| `createWithTransaction` | Inserta `archivo_drive` dentro de la transacción; setea `comprobante_archivo_id` y `estado_pago=comprobante_subido` | `pedido.model.js` |
| `GET /api/admin/pedidos/:id/comprobante` | Devuelve metadatos del archivo (NO proxy de bytes) | `pedido.controller.js` + `pedido.routes.js` |
| `archivo.model.js` | Modelo CRUD para `archivo_drive`: `createArchivo` (transaction connection), `findArchivoById` (pool) | `archivo.model.js` (NUEVO) |
| Payment state machine | Ya soportaba `comprobante_subido` y `rechazado` desde B6.2 | Sin cambios — se reusa `transitionsByMethod` |
| GOTCHAS.md | Secciones 8, 9, 12, 13, 14 documentan edge cases de Drive | Actualizado |
| Tests: comprobantes | 3 test files: `comprobantes.test.js`, `comprobantes.unit.test.js`, `comprobantes.drive-mock.test.js` | 3 archivos NUEVOS |

### 3.3 — Rama actual

```
feature/backend-b6-1-cocina-review-fixes
```

### 3.4 — Resultados de tests

```
Test Suites: 1 failed, 11 passed, 12 total
Tests:       1 failed, 161 passed, 162 total
```

El **1 test fallido** es un problema de **test-isolation** (no de código):
- `caja.test.js > "Authenticated PUT edit correction (PR2 integration) > PUT works with promo combo and reconciles component stock"` → `Expected: 200, Received: 500`
- **Causa raíz**: La suite `comprobantes.test.js` se ejecuta antes que `caja.test.js` y modifica stock (crea pedidos con productos limitados sin limpiar stock correctamente). Esto deja el stock alterado para el test de edición de combo.
- **Evidencia**: El test pasa cuando se ejecuta solo (`npm test -- --testNamePattern="PUT works with promo"` → PASS).
- **Impacto**: Bajo. Es un problema de aislamiento entre suites, no un bug de la funcionalidad. No bloquea.

---

## 4. Arquitectura actual del backend (B6.3)

```
backend/src/
├── app.js                         # Express app con cors, cookieParser, error middleware
├── server.js                      # Entry point
└── api/
    ├── config/
    │   └── environments.js        # Variables de entorno centralizadas (incluye googleDrive)
    ├── database/
    │   ├── db.js                  # Pool mysql2/promise
    │   ├── schema.sql             # DDL (10 tablas: archivo_drive, usuario, categoria, producto,
    │   │                           #       producto_categoria, combo_producto, pedido, pedido_detalle,
    │   │                           #       configuracion_tienda) + FK comprobante_archivo_id → archivo_drive
    │   ├── seed.sql               # 24 productos + usuario admin + configuracion
    │   └── indexes.sql            # Índices
    ├── middlewares/
    │   ├── admin.middleware.js     # JWT verify + DB lookup
    │   ├── origin.middleware.js    # CSRF: safeOriginFromUrl() + ForbiddenError (403)
    │   ├── validate.middleware.js  # Zod validation
    │   ├── upload.middleware.js    # ★ NUEVO: Multer memoryStorage, MIME filter, 5MB limit
    │   └── error.middleware.js     # Global error handler
    ├── routes/
    │   ├── index.routes.js        # Monta /api/auth, /productos, /pedidos, /admin/*, /configuracion-tienda
    │   ├── auth.routes.js
    │   ├── producto.routes.js
    │   ├── pedido.routes.js       # ★ MODIFICADO: POST / usa uploadComprobante, GET /:id/comprobante
    │   ├── cocina.routes.js
    │   └── configuracion.routes.js
    ├── controllers/
    │   ├── auth.controller.js
    │   ├── producto.controller.js
    │   ├── pedido.controller.js   # ★ MODIFICADO: crear() acepta multipart, obtenerComprobante() NUEVO
    │   ├── cocina.controller.js
    │   └── configuracion.controller.js
    ├── models/
    │   ├── usuario.model.js
    │   ├── producto.model.js
    │   ├── pedido.model.js        # ★ MODIFICADO: createWithTransaction inserta archivo_drive + comprobante_archivo_id
    │   ├── archivo.model.js       # ★ NUEVO: createArchivo (transaction), findArchivoById (pool)
    │   └── configuracion.model.js
    ├── schemas/
    │   ├── auth.schema.js
    │   ├── producto.schema.js
    │   ├── pedido.schema.js       # ★ MODIFICADO: createPedidoSchema con z.preprocess para items (multipart)
    │   ├── cocina.schema.js
    │   └── configuracion.schema.js
    ├── services/
    │   └── drive.service.js       # ★ NUEVO: initDrive, uploadFile, isDriveReady, _setDriveClientForTest
    └── utils/
        ├── errors.js              # AppError, ValidationError, NotFoundError, AuthError, ForbiddenError, InsufficientStockError
        └── respuesta.utils.js     # respuestaExitosa, respuestaError
```

### Endpoints principales (con cambios B6.3 marcados)

| Método | Ruta | Auth | Handler | Descripción | B6.3 |
|--------|------|------|---------|-------------|------|
| POST | /api/auth/login | público | login | Login admin, retorna JWT en cookie | — |
| GET | /api/productos | público | listar | Lista productos activos | — |
| **POST** | **/api/pedidos** | **público** | **crear** | **Pedido online con comprobante opcional (multipart)** | **★** |
| GET | /api/pedidos/seguimiento/:token | público | seguimiento | Estado público del pedido | — |
| POST | /api/admin/pedidos/caja | admin + trusted | crearCaja | Pedido de caja rápida | — |
| GET | /api/admin/pedidos | admin | listarAdmin | Lista con filtros y paginación | — |
| **GET** | **/api/admin/pedidos/:id/comprobante** | **admin** | **obtenerComprobante** | **Metadatos del archivo en Drive** | **★** |
| GET | /api/admin/pedidos/:id | admin | obtenerAdmin | Detalle completo | — |
| PATCH | /api/admin/pedidos/:id/estado | admin + trusted | cambiarEstado | Avanza estado pedido | — |
| PATCH | /api/admin/pedidos/:id/pago | admin + trusted | cambiarPago | State machine de pago (ya soporta comprobante_subido) | — |
| PATCH | /api/admin/pedidos/:id/cancelar | admin + trusted | cancelar | Cancela y repone stock | — |
| PUT | /api/admin/pedidos/:id | admin + trusted | editar | Edición con reconciliación transaccional de stock | — |
| GET | /api/admin/cocina/pedidos | admin | listarCocina | Lista pedidos activos | — |
| PATCH | /api/admin/cocina/pedidos/:id/estado | admin + trusted | cambiarEstadoCocina | Transición cocina | — |
| GET | /api/configuracion-tienda | público | obtenerPublico | Estado + mensaje público | — |
| PUT | /api/admin/configuracion-tienda | admin + trusted | actualizarAdmin | Actualiza estado, mensaje, hora cena | — |

---

## 5. State machines (sin cambios desde B6.2, pero ampliadas en uso)

### Estado del pedido
```
recibido → en_preparacion → listo → entregado
```
`TRANSICIONES_VALIDAS` en `pedido.model.js`. Cancelación solo desde `recibido` o `en_preparacion`.

### Estado del pago (method-aware) — B6.3 ejercita comprobante_subido
```
efectivo:
  pendiente → pagado
  pagado → (terminal)

transferencia:
  pendiente → pagado | comprobante_subido    ← B6.3: upload setea comprobante_subido
  comprobante_subido → pagado | rechazado    ← B6.3: admin decide
  rechazado → pendiente | comprobante_subido ← B6.3: re-upload posible (futuro)
  pagado → (terminal)
```
`transitionsByMethod` en `pedido.model.js`. Sin cambios en las transiciones — el estado `comprobante_subido` ya existía desde B6.2.

---

## 6. Reglas funcionales (no negociables)

Estas son las reglas de negocio que el código DEBE cumplir:

1. **Pago efectivo**: solo permite `pendiente → pagado`. No permite comprobante.
2. **Pago transferencia online**: **requiere comprobante**. Si no hay archivo → 400.
3. **Pago efectivo online**: **no acepta comprobante**. Si hay archivo → 400.
4. **Caja rápida transferencia**: puede crear pedido SIN comprobante (el vendedor verificó).
5. **Subida de archivo**: solo jpg, png, webp, pdf. Máximo 5 MB. Multer memoryStorage.
6. **Drive upload ANTES de DB transaction**: si la subida falla → 503, no se crea pedido.
7. **Si la DB transaction falla después del upload**: archivo huérfano en Drive es aceptable para MVP (ver GOTCHAS.md sección 12).
8. **`estado_pago=comprobante_subido`**: se setea automáticamente al subir comprobante exitosamente.
9. **Admin endpoint GET comprobante**: devuelve metadatos, NO proxy de bytes.
10. **Backend valida todo aunque el frontend ya valide**.

---

## 7. Archivos a auditar

### 7.1 — Archivos NUEVOS en B6.3

| Archivo | Líneas | Qué auditar |
|---------|--------|-------------|
| `backend/src/api/services/drive.service.js` | 98 | initDrive, uploadFile, isDriveReady, _setDriveClientForTest |
| `backend/src/api/middlewares/upload.middleware.js` | 54 | Multer config, MIME filter, file size limit, handleMulterError |
| `backend/src/api/models/archivo.model.js` | 47 | createArchivo (transaction connection), findArchivoById (pool) |

### 7.2 — Archivos MODIFICADOS en B6.3

| Archivo | Qué auditar |
|---------|-------------|
| `backend/src/api/controllers/pedido.controller.js` | `crear()` con flujo multipart (líneas 22-71), `obtenerComprobante()` nuevo (líneas 232-257) |
| `backend/src/api/models/pedido.model.js` | `createWithTransaction` — inserción de `archivo_drive`, `comprobante_archivo_id`, `estado_pago=comprobante_subido` (líneas 168-203) |
| `backend/src/api/routes/pedido.routes.js` | POST `/` con `uploadComprobante.single('comprobante')`, GET `/:id/comprobante` |
| `backend/src/api/schemas/pedido.schema.js` | `createPedidoSchema` con `z.preprocess` para items (multipart) |
| `backend/src/api/config/environments.js` | Sección `googleDrive` con `credentialsJson` y `folderId` |
| `backend/.env.example` | Variables `GOOGLE_DRIVE_CREDENTIALS_JSON` y `GOOGLE_DRIVE_FOLDER_ID` comentadas |
| `backend/src/api/database/schema.sql` | Tabla `archivo_drive` (existente desde B6.1), FK `comprobante_archivo_id` en `pedido` con CHECK constraint |
| `DOCUMENTACION/IA/GOTCHAS.md` | Secciones 8, 9, 12, 13, 14 |

### 7.3 — Tests NUEVOS en B6.3

| Archivo | Tests | Qué cubre |
|---------|-------|-----------|
| `backend/tests/comprobantes.test.js` | ~25 tests | Integration: validación método+file, MIME/size, upload+Drive flow, GET comprobante, transiciones pago, edge cases |
| `backend/tests/comprobantes.unit.test.js` | ~12 tests | Unit: schema preprocess, archivo.model mock, drive.service unit con _setDriveClientForTest |
| `backend/tests/comprobantes.drive-mock.test.js` | ~12 tests | Integration con Drive mockeado: éxito, error API, GET comprobante con metadata |

### 7.4 — Documentación

| Archivo | Qué verificar |
|---------|---------------|
| `DOCUMENTACION/IA/API.md` | Endpoints de comprobante, middleware chain actualizada |
| `DOCUMENTACION/IA/CORE.md` | State machine, reglas de comprobante |
| `DOCUMENTACION/IA/INFRA.md` | Tabla archivo_drive, pool |
| `DOCUMENTACION/IA/GOTCHAS.md` | Secciones 8 (comprobante), 9 (transferencia online), 12 (archivos huérfanos), 13 (z.preprocess), 14 (Multer vs Zod ordering) |
| `DOCUMENTACION/IA/TESTING.md` | 162 tests, nuevos patterns de mock Drive |

---

## 8. Código clave inline

### 8.1 — drive.service.js (servicio de Google Drive)

```javascript
import { google } from 'googleapis';
import environments from '../config/environments.js';

let driveClient = null;
let isConfigured = false;

function initDrive() {
  const { credentialsJson, folderId } = environments.googleDrive;
  if (!credentialsJson || !folderId) {
    if (environments.esProduccion) {
      throw new Error('Google Drive credentials not configured.');
    }
    console.warn('[DRIVE] Skipping Drive init — credentials not configured.');
    isConfigured = false;
    return;
  }
  try {
    const credentials = JSON.parse(credentialsJson);
    const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive.file'] });
    driveClient = google.drive({ version: 'v3', auth });
    isConfigured = true;
  } catch (err) {
    if (environments.esProduccion) throw new Error(`Failed to init Drive: ${err.message}`);
    console.warn(`[DRIVE] Failed to init Drive: ${err.message}`);
    isConfigured = false;
  }
}

initDrive();

export async function uploadFile(buffer, originalName, mimeType) {
  if (!isConfigured || !driveClient) throw new Error('Google Drive service is not configured.');
  const { folderId } = environments.googleDrive;
  const response = await driveClient.files.create({
    requestBody: { name: originalName, mimeType, parents: [folderId] },
    media: { mimeType, body: buffer },
    fields: 'id, webViewLink',
  });
  return { driveFileId: response.data.id, webViewLink: response.data.webViewLink || null };
}

export function isDriveReady() { return isConfigured; }

export function _setDriveClientForTest(client, configured) {
  driveClient = client;
  isConfigured = !!configured;
}
```

### 8.2 — upload.middleware.js (Multer)

```javascript
import multer from 'multer';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const storage = multer.memoryStorage();

function fileFilter(_req, file, cb) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) cb(null, true);
  else cb(new Error(`Tipo de archivo no soportado: ${file.mimetype}. Solo se permiten JPG, PNG, WEBP y PDF.`), false);
}

export const uploadComprobante = multer({ storage, limits: { fileSize: MAX_FILE_SIZE }, fileFilter });

export function handleMulterError(err, _req, res, next) {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ ok: false, error: 'El archivo supera el límite de 5 MB' });
  if (err.message?.includes('Tipo de archivo no soportado')) return res.status(400).json({ ok: false, error: err.message });
  if (err.name === 'MulterError') return res.status(400).json({ ok: false, error: `Error de upload: ${err.message}` });
  next(err);
}
```

### 8.3 — archivo.model.js

```javascript
export async function createArchivo(conn, data) {
  const [result] = await conn.query(
    `INSERT INTO archivo_drive (drive_id, nombre_original, mime_type, tamanio_bytes, tipo, url_publica)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.drive_id, data.nombre_original, data.mime_type, data.tamanio_bytes, data.tipo, data.url_publica || null]
  );
  return result.insertId;
}

export async function findArchivoById(pool, id) {
  const [rows] = await pool.query(
    `SELECT id, drive_id, nombre_original, mime_type, tamanio_bytes, tipo, url_publica, created_at
     FROM archivo_drive WHERE id = ?`, [id]
  );
  return rows[0] || null;
}
```

### 8.4 — pedido.controller.js — crear() flujo multipart

```javascript
export async function crear(req, res, next) {
  try {
    const metodoPago = req.body.metodo_pago;
    const tieneComprobante = !!req.file;

    if (metodoPago === 'transferencia' && !tieneComprobante)
      throw new ValidationError('Transferencia online requiere comprobante.');
    if (metodoPago === 'efectivo' && tieneComprobante)
      throw new ValidationError('Los pedidos en efectivo no requieren comprobante.');

    let archivo = null;
    if (tieneComprobante) {
      // Upload to Drive BEFORE DB transaction
      const driveResult = await driveUploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
      archivo = {
        drive_id: driveResult.driveFileId,
        nombre_original: req.file.originalname,
        mime_type: req.file.mimetype,
        tamanio_bytes: req.file.size,
        url_publica: driveResult.webViewLink,
      };
    }

    const pool = getPool();
    const result = await createWithTransaction(pool, { ...req.body, origen: 'online', archivo });
    const pedido = await findByToken(pool, result.token);
    return respuestaExitosa(res, pedido, 'Pedido creado correctamente', 201);
  } catch (err) {
    if (err.message?.includes('Stock insuficiente')) return next(new InsufficientStockError(err.message));
    if (err.message?.includes('tienda no está abierta')) return next(new ValidationError('La tienda no está abierta'));
    if (err.message?.includes('Google Drive') || err.message?.includes('Failed to upload') || err.message?.includes('Cannot upload'))
      return res.status(503).json({ ok: false, error: 'Servicio de upload no disponible.' });
    next(err);
  }
}
```

### 8.5 — pedido.controller.js — obtenerComprobante()

```javascript
export async function obtenerComprobante(req, res, next) {
  try {
    const pool = getPool();
    const pedido = await findById(pool, req.params.id);
    if (!pedido) throw new NotFoundError('Pedido no encontrado');
    if (!pedido.comprobante_archivo_id) throw new NotFoundError('Este pedido no tiene comprobante asociado');
    const archivo = await findArchivoById(pool, pedido.comprobante_archivo_id);
    if (!archivo) throw new NotFoundError('Comprobante no encontrado en almacenamiento');
    return respuestaExitosa(res, {
      drive_id: archivo.drive_id,
      nombre_original: archivo.nombre_original,
      mime_type: archivo.mime_type,
      tamanio_bytes: archivo.tamanio_bytes,
      url_publica: archivo.url_publica,
      created_at: archivo.created_at,
    }, 'Comprobante obtenido correctamente');
  } catch (err) { next(err); }
}
```

### 8.6 — pedido.model.js — createWithTransaction (cambios comprobante)

```javascript
// Inside createWithTransaction, after stock validation and before INSERT pedido:

// 3.5. Insert archivo_drive row if comprobante was uploaded
let comprobanteArchivoId = null;
if (data.archivo) {
  comprobanteArchivoId = await createArchivo(conn, {
    drive_id: data.archivo.drive_id,
    nombre_original: data.archivo.nombre_original,
    mime_type: data.archivo.mime_type,
    tamanio_bytes: data.archivo.tamanio_bytes,
    tipo: 'comprobante',
    url_publica: data.archivo.url_publica || null,
  });
}

// 4. INSERT pedido with comprobante_archivo_id
const estadoPago = data.estado_pago || (data.archivo ? 'comprobante_subido' : 'pendiente');
const [pedidoResult] = await conn.query(
  `INSERT INTO pedido (token_seguimiento, origen, nombre_cliente, mesa, telefono_cliente,
    telefono_whatsapp, observaciones, metodo_pago, estado_pago, estado_pedido, total, comprobante_archivo_id)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [token, data.origen || 'online', data.nombre_cliente, data.mesa || null,
   data.telefono_cliente || null, normalizarTelefono(data.telefono_cliente),
   data.observaciones || null, data.metodo_pago, estadoPago,
   data.estado_pedido || 'recibido', total, comprobanteArchivoId]
);
```

### 8.7 — pedido.routes.js — nuevas rutas

```javascript
// POST /api/pedidos (público) — uploadComprobante.single() ANTES de validateBody
publicRouter.post('/', uploadComprobante.single('comprobante'), validateBody(createPedidoSchema), crear);

// GET /api/admin/pedidos/:id/comprobante (admin)
adminRouter.get('/:id/comprobante', requireAdmin, validateParams(idParamSchema), obtenerComprobante);
```

### 8.8 — environments.js — Drive configuration

```javascript
const googleDriveCredentialsJson = process.env.GOOGLE_DRIVE_CREDENTIALS_JSON || '';
const googleDriveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

const entorno = {
  // ...
  googleDrive: {
    credentialsJson: googleDriveCredentialsJson,
    folderId: googleDriveFolderId,
  },
};

if (esProduccion) {
  const requeridos = [
    // ... DB, JWT, FRONTEND_URL ...
    'GOOGLE_DRIVE_CREDENTIALS_JSON', 'GOOGLE_DRIVE_FOLDER_ID'
  ];
  // throw if missing in production
}

if (!esProduccion && (!googleDriveCredentialsJson || !googleDriveFolderId)) {
  console.warn('[DRIVE] Google Drive credentials not configured. Set GOOGLE_DRIVE_CREDENTIALS_JSON and GOOGLE_DRIVE_FOLDER_ID in .env');
}
```

### 8.9 — .env.example

```
# Google Drive (comprobantes de transferencia). Opcional en dev, requerido en prod.
# GOOGLE_DRIVE_CREDENTIALS_JSON={"type":"service_account",...}
# GOOGLE_DRIVE_FOLDER_ID=your-folder-id-here
```

### 8.10 — schema.sql — tabla archivo_drive y FK en pedido

```sql
CREATE TABLE IF NOT EXISTS archivo_drive (
    id INT AUTO_INCREMENT PRIMARY KEY,
    drive_id VARCHAR(150) NOT NULL UNIQUE,
    nombre_original VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    tamanio_bytes INT NOT NULL CHECK (tamanio_bytes > 0),
    tipo ENUM('producto_imagen', 'comprobante') NOT NULL,
    url_publica TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- En pedido:
comprobante_archivo_id INT NULL,
CONSTRAINT fk_pedido_comprobante FOREIGN KEY (comprobante_archivo_id) REFERENCES archivo_drive(id),
CONSTRAINT chk_pedido_comprobante_efectivo CHECK (
    metodo_pago <> 'efectivo' OR comprobante_archivo_id IS NULL
)
```

### 8.11 — Tests structure overview

```
comprobantes.test.js (integration):
  - transferencia without file → 400
  - efectivo with file → 400
  - efectivo without file → 201, estado_pago=pendiente
  - caja transferencia without file → 201 (bypass comprobante)
  - invalid MIME (text/plain) → 400
  - oversized file (>5MB) → 400/413
  - Drive configured: transferencia+file → 201, comprobante_subido, archivo_drive row
  - Drive NOT configured: transferencia+file → 503, no pedido creado
  - GET /comprobante unauthenticated → 401
  - GET /comprobante nonexistent → 404
  - GET /comprobante no comprobante → 404
  - GET /comprobante with comprobante (Drive configured) → 200, metadata
  - comprobante_subido → pagado → 200
  - comprobante_subido → rechazado → 200
  - comprobante_subido → pendiente → 400
  - rechazado → comprobante_subido → 200
  - store closed → 400/503
  - insufficient stock → 409

comprobantes.unit.test.js (unit):
  - createPedidoSchema z.preprocess: native array, JSON string, invalid JSON, empty array
  - createArchivo: correct params, insertId, null url_publica
  - findArchivoById: found, not found
  - drive.service: unconfigured throws, mocked success, mocked API error
  - MIME validation: allowed types list, denied types

comprobantes.drive-mock.test.js (integration with mocked Drive):
  - uploadFile success with mocked client
  - uploadFile Drive API error
  - isDriveReady reflects state
  - POST /api/pedidos transferencia with mocked Drive → 201, archivo_drive row, comprobante_archivo_id
  - GET /comprobante with mocked file → 200, complete metadata
  - Drive API error → 503, no pedido, no archivo_drive row
```

---

## 9. Qué verificar específicamente

### 9.1 — Flujo multipart: ¿la cadena de middlewares es correcta?

- [ ] `POST /api/pedidos` usa `uploadComprobante.single('comprobante')` ANTES de `validateBody(createPedidoSchema)`?
- [ ] Multer inyecta `req.file` como `Express.Multer.File` con `buffer`, `originalname`, `mimetype`, `size`?
- [ ] Cuando no hay archivo (efectivo), `req.file` es `undefined` y `!!req.file` es `false`?
- [ ] El schema `createPedidoSchema` usa `z.preprocess` para convertir `items` de string JSON a array?
- [ ] El error de Multer (MIME inválido) llega al `handleMulterError` en vez de al `errorMiddleware`?
- [ ] El error de Multer (tamaño excedido) retorna 413?

### 9.2 — State machine compliance

- [ ] `transferencia` sin archivo → `crear()` lanza `ValidationError` → 400?
- [ ] `efectivo` con archivo → `crear()` lanza `ValidationError` → 400?
- [ ] `transferencia` con archivo y Drive exitoso → `estado_pago=comprobante_subido`?
- [ ] `transferencia` con archivo y Drive fallido → 503, sin pedido creado?
- [ ] `caja` transferencia sin archivo → 201 (bypass permitido)?
- [ ] `comprobante_subido → pagado` permitido (200)?
- [ ] `comprobante_subido → rechazado` permitido (200)?
- [ ] `comprobante_subido → pendiente` rechazado (400)?
- [ ] `rechazado → comprobante_subido` permitido (200)?
- [ ] CHECK constraint en schema.sql: `metodo_pago <> 'efectivo' OR comprobante_archivo_id IS NULL`?

### 9.3 — Drive integration safety

- [ ] `drive.service.js` recibe credenciales desde `environments.googleDrive.credentialsJson` (variable de entorno), NO está hardcodeado?
- [ ] ¿Hay algún plain-text credential en el código? (no debe haber)
- [ ] Multer usa `memoryStorage` — no escribe archivos a disco?
- [ ] El buffer de Multer se descarta después de subir a Drive (no se persiste)?
- [ ] `_setDriveClientForTest` es seguro? Solo modifica variables de módulo (`driveClient`, `isConfigured`) que son privadas al closure, no afecta estado global compartido?
- [ ] `_setDriveClientForTest` se restaura en `afterAll`/`afterEach` de cada test suite?
- [ ] Archivos huérfanos en Drive (cuando la DB transaction falla después del upload): ¿están documentados como deuda aceptable?
- [ ] La subida a Drive ocurre ANTES de la transacción DB — ¿hay riesgo de archivo huérfano sin pedido? (esperado: sí, documentado)
- [ ] En producción, si Drive no está configurado, ¿`initDrive()` lanza error y `crear()` retorna 503?
- [ ] En desarrollo, si Drive no está configurado, ¿se loguea warning y los tests sin mock retornan 503?

### 9.4 — Cobertura de tests (162 tests, 1 fallo por test-isolation)

- [ ] ¿Los tests de `comprobantes.test.js` cubren los casos de éxito (Drive configurado)?
- [ ] ¿Cubren los casos de error (Drive no configurado → 503, MIME inválido, tamaño excedido)?
- [ ] ¿Cubren validaciones de método de pago vs archivo (transferencia sin file, efectivo con file)?
- [ ] ¿Cubren transiciones de pago con `comprobante_subido`?
- [ ] ¿Cubren edge cases (tienda cerrada, stock insuficiente)?
- [ ] ¿Los tests de `comprobantes.drive-mock.test.js` cubren el path de éxito con Drive mockeado?
- [ ] ¿Verifican que la fila `archivo_drive` se crea con los campos correctos?
- [ ] ¿Verifican que `GET /comprobante` devuelve metadata sin buffer de bytes?
- [ ] ¿Hay test que verifica que no se inserta `archivo_drive` cuando Drive falla?
- [ ] ¿Los tests de unidad de `archivo.model.js` cubren `createArchivo` y `findArchivoById`?
- [ ] El 1 test fallido (`PUT works with promo combo` → Expected 200, Received 500) es solo un problema de **test-isolation** entre suites, no un bug de código. ¿Pasa cuando se ejecuta solo?

### 9.5 — Documentación vs código

- [ ] ¿`API.md` documenta el endpoint `GET /api/admin/pedidos/:id/comprobante`?
- [ ] ¿`API.md` documenta que `POST /api/pedidos` acepta multipart con campo `comprobante`?
- [ ] ¿`CORE.md` refleja que `createWithTransaction` ahora inserta en `archivo_drive`?
- [ ] ¿`INFRA.md` incluye la tabla `archivo_drive` con sus campos?
- [ ] ¿`GOTCHAS.md` secciones 8, 9, 12, 13, 14 existen y son precisas?
- [ ] ¿`TESTING.md` refleja 162 tests, los 3 archivos de comprobantes, y el patrón `_setDriveClientForTest`?
- [ ] ¿Los errores HTTP mencionados en documentación coinciden con el código? (503 para Drive no disponible, 400 para validación, 413 para tamaño excedido, 409 para stock)

### 9.6 — Sin frontend/v0 contamination

- [ ] ¿No hay cambios en `frontend/`?
- [ ] ¿No hay cambios en `diseno-de-landing-kermingo/`?
- [ ] B6.3 fue solo backend — ¿se respetó esa regla?

### 9.7 — Schema table fields matching

- [ ] El campo en código es `drive_id` en `pedido.controller.js` destructuring: `{ drive_id: driveResult.driveFileId, ... }`?
- [ ] El campo en `archivo.model.js` es `drive_id`?
- [ ] El campo en `obtenerComprobante` respuesta es `drive_id`?
- [ ] El campo en `schema.sql` es `drive_id` (NO `drive_file_id`)?
- [ ] El campo en código es `tamanio_bytes` (con 'a' y 't', sin tilde)?
- [ ] El campo en `schema.sql` es `tamanio_bytes` (NO `tamaño_bytes`)?
- [ ] CHECK constraint en archivo_drive: `tamanio_bytes > 0`?
- [ ] CHECK constraint en pedido: `metodo_pago <> 'efectivo' OR comprobante_archivo_id IS NULL`?

### 9.8 — Production readiness gaps

- [ ] Si `GOOGLE_DRIVE_CREDENTIALS_JSON` no está configurado en producción: ¿`initDrive()` lanza error, `crear()` retorna 503?
- [ ] Si `GOOGLE_DRIVE_FOLDER_ID` no está configurado en producción: ¿mismo comportamiento?
- [ ] ¿`environments.js` valida que ambas variables existan en producción?
- [ ] ¿El error 503 de Drive es catchable por el frontend para mostrar mensaje amigable?
- [ ] ¿Hay rate limiting en el endpoint de upload? (no se espera para MVP, pero es bueno señalarlo)
- [ ] ¿Hay límite de concurrent uploads en Multer? (el default es ilimitado, podría ser issue en producción con muchos usuarios simultáneos)

### 9.9 — `_setDriveClientForTest` safety

- [ ] La función exportada se llama `_setDriveClientForTest` (prefijo `_` indica privacidad)?
- [ ] Solo modifica `driveClient` y `isConfigured` (variables de módulo, no de instancia)?
- [ ] No hay side effects fuera del módulo de `drive.service.js`?
- [ ] Se restaura en `afterAll` de cada test suite que lo usa?
- [ ] ¿Podría un test que NO restaura el cliente contaminar a otro test? (Verificar que todos los test suites tienen `afterAll` con restauración)

---

## 10. Preguntas específicas para el auditor

1. **¿El flujo multipart es correcto?**
   - ¿Multer injecta `req.file` antes de que Zod valide el body?
   - ¿El `z.preprocess` para `items` funciona tanto con JSON nativo como con multipart string?
   - ¿Hay riesgo de que un request `application/json` con campo `items` como string JSON falle?
   - ¿El orden de middlewares `uploadComprobante → validateBody → crear` es el correcto?

2. **¿La integración con Google Drive es segura?**
   - ¿Las credenciales viajan solo en variable de entorno, nunca hardcodeadas?
   - ¿`JSON.parse(credentialsJson)` en `initDrive()` puede fallar con credenciales inválidas? ¿Se maneja?
   - ¿El scope `drive.file` limita el acceso de la service account solo a archivos que crea?
   - ¿Hay logging de información sensible? (no debe loguearse el JSON de credenciales)

3. **¿El manejo de archivos huérfanos es aceptable para MVP?**
   - Si la subida a Drive funciona pero la transacción DB falla (stock, constraint), ¿el archivo queda huérfano?
   - ¿Hay algún mecanismo de cleanup periódico? (no se espera para MVP)
   - ¿La documentación en GOTCHAS.md sección 12 es clara sobre esta limitación?

4. **¿`_setDriveClientForTest` es seguro para producción?**
   - ¿Solo se llama desde tests (por convención y naming)?
   - ¿Podría un error en tests dejar el cliente mockeado para el siguiente test suite?
   - ¿Hay algún mecanismo para prevenir llamadas en producción? (no hay guard, solo naming)

5. **¿La tabla `archivo_drive` y sus FKs son correctas?**
   - `drive_id VARCHAR(150) NOT NULL UNIQUE` — ¿150 es suficiente para un file ID de Google Drive? (sí, los IDs son típicamente < 50 chars)
   - `tamanio_bytes INT` — ¿INT alcanza para 5 MB? (sí, 5 MB = 5,242,880 < 2,147,483,647 MAX INT)
   - `tipo ENUM('producto_imagen', 'comprobante')` — ¿Es correcto tener ambos tipos aquí?
   - El CHECK `metodo_pago <> 'efectivo' OR comprobante_archivo_id IS NULL` — ¿previene que un pedido efectivo tenga comprobante?

6. **¿Los 162 tests cubren adecuadamente B6.3?**
   - ¿Hay test para el caso "Drive configurado + transferencia + archivo válido → 201 + archivo_drive row"?
   - ¿Hay test para "Drive no configurado + transferencia + archivo → 503, no pedido"?
   - ¿Hay test para "subida a Drive falla con error de API → 503, no archivo_drive row"?
   - ¿Hay test para "GET /comprobante con datos mockeados → 200, metadata completa"?
   - El 1 test fallido: ¿es realmente test-isolation o podría ser un bug real?

7. **¿Qué gaps de production readiness existen?**
   - ¿Multer sin límite de concurrent uploads? (no hay límite configurado)
   - ¿Drive quota? (depende de la service account)
   - ¿Timeout en `driveClient.files.create`? (no hay timeout explícito)
   - ¿Tamaño máximo de 5 MB es suficiente? (razonable para comprobantes)

---

## 11. Formato de respuesta esperado

### 11.1 — Resumen ejecutivo

Tabular con:
- ¿Flujo multipart correcto? (SÍ/PARCIAL/NO)
- ¿State machine compliance? (SÍ/PARCIAL/NO)
- ¿Drive integration segura? (SÍ/PARCIAL/NO)
- ¿Tests cubren success/error/no-drive paths? (SÍ/PARCIAL/NO)
- ¿Documentación consistente con código? (SÍ/PARCIAL/NO)
- ¿Sin frontend/v0 contamination? (SÍ/NO)
- ¿Schema fields coinciden (drive_id, tamanio_bytes)? (SÍ/NO)
- ¿`_setDriveClientForTest` es seguro? (SÍ/PARCIAL/NO)
- ¿162 tests (1 fail por test-isolation) aceptables? (SÍ/NO)
- ¿Production readiness suficiente para MVP? (SÍ/PARCIAL/NO)
- ¿Listo para B7? (SÍ/NO — solo backend; frontend a implementar)
- ¿Veredicto general?

### 11.2 — Hallazgos críticos (CRIT)

Cada hallazgo con:
- ID (CRIT-N)
- Archivo(s)
- Descripción del problema
- Impacto
- Severidad
- Fix requerido

### 11.3 — Hallazgos importantes (IMP)

Mismo formato que CRIT pero severidad importante.

### 11.4 — Mejoras recomendadas (MEJ)

Cada mejora con:
- ID (MEJ-N)
- Archivo(s)
- Descripción
- Prioridad (ALTA/MEDIA/BAJA)
- Propuesta de implementación

### 11.5 — Cosas bien aplicadas (OK)

Cada hallazgo positivo con:
- ID (OK-N)
- Archivo(s)
- Evidencia
- Veredicto

### 11.6 — Checklist de corrección para B6.3

| # | Item | Estado |
|---|------|--------|
| 1 | `drive.service.js` usa env vars, no hardcode | ✅ / ❌ |
| 2 | Multer memoryStorage, no disco | ✅ / ❌ |
| 3 | MIME filter: solo jpg/png/webp/pdf | ✅ / ❌ |
| 4 | Límite 5 MB | ✅ / ❌ |
| 5 | Upload a Drive ANTES de DB transaction | ✅ / ❌ |
| 6 | `estado_pago=comprobante_subido` en upload exitoso | ✅ / ❌ |
| 7 | `archivo_drive` row insertada dentro de transaction | ✅ / ❌ |
| 8 | CHECK constraint: efectivo no puede tener comprobante | ✅ / ❌ |
| 9 | GET /comprobante devuelve solo metadata | ✅ / ❌ |
| 10 | Caja transferencia bypass comprobante | ✅ / ❌ |
| 11 | 503 para Drive no disponible | ✅ / ❌ |
| 12 | `z.preprocess` en items para multipart | ✅ / ❌ |
| 13 | `_setDriveClientForTest` restaurado en tests | ✅ / ❌ |
| 14 | GOTCHAS.md documenta huérfanos | ✅ / ❌ |
| 15 | Sin cambios en frontend/ | ✅ / ❌ |

### 11.7 — Preguntas pre-B7

Basado en la auditoría, responder:
1. ¿Hay algo que impida comenzar B7 (frontend de comprobantes)?
2. ¿La API de comprobantes es suficientemente estable para que el frontend consuma?
3. ¿Hay riesgos de seguridad no resueltos?
4. ¿El test de caja que falla por test-isolation debe fixearse antes de B7 o puede esperar?

### 11.8 — Veredicto final

```txt
¿Flujo multipart correcto? SÍ/NO
¿State machine compliance? SÍ/NO
¿Drive integration segura? SÍ/NO
¿Tests cubren B6.3? SÍ/NO
¿Docs alineadas con código? SÍ/NO
¿Sin frontend/v0 contamination? SÍ/NO
¿B6.3 está completo y listo para revisión? SÍ/NO
¿Se puede avanzar a B7 (frontend)? SÍ/NO
```

Siguiente paso recomendado y riesgos identificados.

---

## 12. Instrucciones para ejecutar la auditoría

1. **Leer** todos los archivos listados en la sección 7.
2. **Verificar** cada item de la sección 9.
3. **Responder** las preguntas de la sección 10.
4. **Evaluar** consistencia documentación vs código (sección 9.5).
5. **Verificar** que los snippets de la sección 8 coinciden con el código real.
6. **Generar** el reporte con el formato de la sección 11.
7. **Incluir** un veredicto final claro y recomendaciones de siguiente paso.

---

## 13. Notas sobre lo que cambió desde la auditoría B6.2.3 (documento 41)

La auditoría 41 aprobó el hardening B6.2.3 con veredicto "Listo para B6.3". Desde entonces:

### Archivos NUEVOS
| Archivo | Propósito |
|---------|-----------|
| `backend/src/api/services/drive.service.js` | Google Drive API client con service account |
| `backend/src/api/middlewares/upload.middleware.js` | Multer memoryStorage, MIME/size validation |
| `backend/src/api/models/archivo.model.js` | CRUD para tabla archivo_drive |
| `backend/tests/comprobantes.test.js` | Integration tests de comprobantes (~25 tests) |
| `backend/tests/comprobantes.unit.test.js` | Unit tests de schema/model/drive (~12 tests) |
| `backend/tests/comprobantes.drive-mock.test.js` | Integration con Drive mockeado (~12 tests) |

### Archivos MODIFICADOS
| Archivo | Cambio |
|---------|--------|
| `backend/src/api/controllers/pedido.controller.js` | `crear()` acepta multipart, `obtenerComprobante()` nuevo |
| `backend/src/api/models/pedido.model.js` | `createWithTransaction` inserta archivo_drive, setea comprobante_archivo_id |
| `backend/src/api/routes/pedido.routes.js` | POST / usa uploadComprobante, GET /:id/comprobante |
| `backend/src/api/schemas/pedido.schema.js` | z.preprocess para items en createPedidoSchema |
| `backend/src/api/config/environments.js` | googleDrive config section |
| `backend/.env.example` | GOOGLE_DRIVE_* variables documentadas |
| `DOCUMENTACION/IA/GOTCHAS.md` | Secciones 8, 9, 12, 13, 14 nuevas |

### Tests evolucionaron
| Métrica | B6.2.3 | B6.3 |
|---------|--------|------|
| Test suites | 10 | 12 |
| Tests totales | 126 | 162 (+36) |
| Fallos | 0 | 1 (test-isolation) |
| Archivos de test | 7 | 10 |

---

## 14. Referencia: contexto adicional sobre archivos en el ZIP de auditoría

El paquete `kermingo_contexto_auditoria_b6_3.zip` incluye:

```
AGENTS.md
backend/package.json
backend/.env.example
backend/src/api/**/*.js
backend/tests/**/*.js
DOCUMENTACION/IA/*.md
openspec/changes/backend-b6-caja-cocina-comprobantes-reportes/*.md
openspec/specs/drive-upload/*.md
openspec/specs/etapa-5-pedidos/*.md
openspec/specs/payment-proofs/*.md
```

Excluye: `node_modules/`, `.next/`, `.env`, `.env.local`, `backend/credentials/`, `drive-credentials.json`, `coverage/`, `dist/`, archivos zip existentes.

---

*Fin del prompt de auditoría B6.3 — Comprobantes / Google Drive.*