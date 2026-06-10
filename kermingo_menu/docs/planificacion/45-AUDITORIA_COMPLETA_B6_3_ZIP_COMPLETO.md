# 45 — Auditoría completa B6.3 — ZIP completo Kermingo

## Archivo auditado

```txt
kermingo_menu(4).zip
```

## Prompt de referencia

```txt
43-PROMPT_AUDITORIA_CHATGPT_B6_3.md
```

## Objetivo

Rehacer la auditoría de B6.3 con el ZIP más completo, verificando:

- backend real
- `app.js` y `server.js`
- middlewares reales
- integración Multer
- integración Google Drive
- modelos y controladores de comprobantes
- tests reales incluidos
- documentación IA
- OpenSpec
- riesgos para avanzar a B7 / frontend

## Limitación

La revisión principal fue estática, leyendo código y documentación.  
Además hice un intento de ejecución de tests en el entorno de auditoría con:

```bash
cd backend
npm test -- --runInBand
```

Ese intento **no es comparable al entorno local de Marcos** porque no hay MySQL local levantado en el sandbox. Falló principalmente por:

```txt
ECONNREFUSED 127.0.0.1:3306
```

También aparecieron respuestas `401` donde los tests esperaban auth válida, derivadas de la falta de DB/seed real. Por eso no uso ese resultado como veredicto funcional definitivo, pero sí lo tomo como evidencia de que la suite no es autocontenida y requiere entorno DB preparado.

---

# 1. Resumen ejecutivo

El ZIP completo corrige una limitación importante de la auditoría anterior: ahora sí incluye:

```txt
backend/src/app.js
backend/src/server.js
backend/src/api/**
backend/tests/**
backend/package.json
backend/package-lock.json
DOCUMENTACION/IA/**
openspec/**
```

También se confirma que:

- `handleMulterError` está montado en `app.js`.
- `POST /api/pedidos` usa `uploadComprobante.single('comprobante')` antes de `validateBody(createPedidoSchema)`.
- `createPedidoSchema` soporta `items` como JSON string por `z.preprocess`.
- `drive.service.js` usa variables de entorno y scope `drive.file`.
- `archivo_drive` existe en el schema con `drive_id`, `tamanio_bytes`, `tipo`, `url_publica`.
- El flujo de transferencia online exige comprobante.
- El flujo efectivo online rechaza comprobante.
- El upload exitoso setea `estado_pago = comprobante_subido`.
- El endpoint admin `GET /api/admin/pedidos/:id/comprobante` existe y devuelve metadata, no bytes.
- `requireTrustedOrigin` está endurecido con `safeOriginFromUrl()`.

Pero todavía **no recomiendo avanzar a B7/frontend** sin una etapa corta de hardening B6.3.1.

Hay tres bloqueantes principales:

1. **El ZIP incluye `backend/.env` y `backend/node_modules/`**, lo que es grave para seguridad/higiene de auditoría.
2. **La suite de tests no está verde/reproducible**: el script `npm test` no fuerza `--runInBand`, hay múltiples suites cerrando el mismo pool, y el propio prompt reporta 1 test fallido por aislamiento.
3. **Los errores reales de Google Drive no están tipados**: si Drive falla con un mensaje no contemplado, puede terminar como 500 en vez de 503.

Además, quedan riesgos importantes de producción:

- validación de archivo basada solo en `file.mimetype`;
- tests que pueden tocar Drive real si hay credenciales;
- `_setDriveClientForTest` puede contaminar estado entre suites;
- `url_publica/webViewLink` no garantiza que el admin pueda ver el archivo;
- no hay rate limit/timeout específico para upload;
- se sube a Drive antes de validar tienda/stock en DB, generando huérfanos evitables.

## Tabla de veredicto

| Punto evaluado | Estado |
|---|---|
| ZIP incluye código completo (`app.js/server.js`) | **SÍ** |
| ZIP excluye secretos y artefactos pesados | **NO** |
| Flujo multipart correcto | **SÍ** |
| `handleMulterError` montado | **SÍ** |
| State machine de pagos compatible con B6.3 | **SÍ** |
| Drive integration base | **SÍ, parcial en robustez** |
| Tests cubren success/error/no-drive | **PARCIAL** |
| Tests verdes/reproducibles | **NO VERIFICADO / NO en sandbox** |
| Documentación consistente | **PARCIAL** |
| Sin frontend/v0 contamination | **No evaluable por diff; el ZIP incluye esas carpetas completas** |
| Schema fields coinciden (`drive_id`, `tamanio_bytes`) | **SÍ** |
| `_setDriveClientForTest` seguro | **PARCIAL** |
| Production readiness MVP | **PARCIAL** |
| ¿Listo para B7? | **NO todavía** |

## Veredicto corto

```txt
B6.3 está funcionalmente bien encaminada.
El ZIP completo permite validar app.js, rutas y middleware.
No recomiendo avanzar a B7 todavía.
Siguiente paso: B6.3.1 — Hardening comprobantes, Drive, tests y paquete de auditoría.
```

---

# 2. Hallazgos críticos

## CRIT-1 — El ZIP incluye `backend/.env`

### Archivo

```txt
backend/.env
```

### Evidencia

El ZIP contiene:

```txt
backend/.env
```

El archivo tiene variables reales de entorno de desarrollo, entre ellas:

```txt
PORT
NODE_ENV
FRONTEND_URL
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME
```

No reproduzco valores por seguridad.

### Impacto

Aunque el `.env` de este ZIP no muestra variables de Google Drive, **nunca debería compartirse un `.env` en paquetes de auditoría**. Puede contener credenciales de DB, JWT, Drive o producción en otros contextos.

### Severidad

```txt
CRÍTICA
```

### Fix requerido

1. Eliminar `backend/.env` del ZIP y del working tree compartible.
2. Usar solo:

```txt
backend/.env.example
```

3. Generar ZIPs con el script existente:

```bash
bash scripts/crear_zip_auditoria.sh
```

El script ya excluye:

```txt
backend/.env
backend/.env.local
frontend/.env
frontend/.env.local
credentials/
drive-credentials.json
node_modules/
```

### Verificación

```bash
unzip -l kermingo_auditoria.zip | grep -E '(^|/)\\.env$|\\.env.local|credentials|drive-credentials'
```

Resultado esperado:

```txt
sin resultados
```

---

## CRIT-2 — El ZIP incluye `backend/node_modules/`

### Archivo / carpeta

```txt
backend/node_modules/
```

### Evidencia

El ZIP incluye una cantidad enorme de archivos bajo:

```txt
backend/node_modules/
```

El proyecto extraído ocupa aproximadamente:

```txt
792 MB
```

y el listado del ZIP tiene decenas de miles de entradas.

### Impacto

- Hace lento y pesado el análisis.
- Puede incluir binarios o artefactos innecesarios.
- Aumenta riesgo de compartir contenido no deseado.
- No aporta valor para auditoría de código fuente porque ya está `package-lock.json`.

### Severidad

```txt
CRÍTICA PARA HIGIENE DE AUDITORÍA
```

### Fix requerido

No incluir `node_modules/` en ningún ZIP de auditoría.

Verificación:

```bash
unzip -l kermingo_auditoria.zip | grep node_modules
```

Resultado esperado:

```txt
sin resultados
```

---

## CRIT-3 — `npm test` no está verde/reproducible con el paquete actual

### Archivos

```txt
backend/package.json
backend/tests/*.js
backend/src/api/database/db.js
```

### Evidencia

El script actual es:

```json
"test": "node --experimental-vm-modules node_modules/.bin/jest"
```

No fuerza:

```txt
--runInBand
```

Además, varias suites cierran el mismo pool con `pool.end()`:

```txt
tests/caja.test.js
tests/comprobantes.test.js
tests/comprobantes.drive-mock.test.js
tests/configuracion.test.js
```

En el intento de ejecución dentro del sandbox:

```txt
Test Suites: 4 failed, 8 passed, 12 total
Tests: 46 failed, 116 passed, 162 total
```

La causa principal fue falta de MySQL local:

```txt
connect ECONNREFUSED 127.0.0.1:3306
```

El prompt B6.3 también reportaba que en el entorno local había:

```txt
1 failed, 161 passed, 162 total
```

por aislamiento entre suites.

### Impacto

Antes de B7, no conviene basarse en una API cuyo backend no tiene suite verde de forma reproducible.

### Severidad

```txt
CRÍTICA PARA AVANZAR A B7
```

### Fix requerido

1. Separar tests unitarios de tests DB-backed.
2. Para integración con DB, usar `--runInBand` o teardown global.
3. Evitar que múltiples suites cierren el mismo pool.
4. Documentar setup mínimo de MySQL para tests.
5. Exigir:

```txt
npm test → 0 fallos
```

### Propuesta de scripts

```json
{
  "test": "node --experimental-vm-modules node_modules/.bin/jest --runInBand",
  "test:unit": "node --experimental-vm-modules node_modules/.bin/jest --runInBand --testPathPattern='(unit|controller|csrf|health)'",
  "test:integration": "node --experimental-vm-modules node_modules/.bin/jest --runInBand"
}
```

---

## CRIT-4 — Errores reales de Google Drive pueden terminar como 500 en vez de 503

### Archivos

```txt
backend/src/api/services/drive.service.js
backend/src/api/controllers/pedido.controller.js
```

### Evidencia

`drive.service.js` propaga directamente errores de Google API:

```js
const response = await driveClient.files.create(...);
```

El controller solo mapea a 503 si el mensaje contiene algunos textos específicos:

```js
if (
  err.message?.includes('Google Drive service is not configured') ||
  err.message?.includes('Failed to upload') ||
  err.message?.includes('Cannot upload files')
) {
  return res.status(503).json({ ok: false, error: 'Servicio de upload no disponible. Intentá más tarde.' });
}
```

### Problema

Un error real de Google puede tener mensajes como:

```txt
Rate limit exceeded
invalid_grant
insufficient permissions
quotaExceeded
ETIMEDOUT
socket hang up
```

Si no contienen los strings esperados, pasan al `errorMiddleware` global y devuelven:

```txt
500 Error interno del servidor
```

### Impacto

El frontend no puede distinguir bien:

```txt
falló Drive temporalmente
```

de:

```txt
bug interno
```

La documentación promete 503 para Drive no disponible o API error.

### Severidad

```txt
CRÍTICA / ALTA
```

### Fix requerido

Crear error tipado.

Ejemplo:

```js
export class DriveUploadError extends Error {
  constructor(message = 'Drive upload failed') {
    super(message);
    this.name = 'DriveUploadError';
  }
}
```

En `uploadFile`:

```js
export async function uploadFile(buffer, originalName, mimeType) {
  if (!isConfigured || !driveClient) {
    throw new DriveUploadError('Google Drive service is not configured.');
  }

  try {
    const response = await driveClient.files.create(...);
    return {
      driveFileId: response.data.id,
      webViewLink: response.data.webViewLink || null,
    };
  } catch (err) {
    throw new DriveUploadError(`Failed to upload file to Google Drive: ${err.message}`);
  }
}
```

En controller:

```js
if (err.name === 'DriveUploadError') {
  return res.status(503).json({
    ok: false,
    error: 'Servicio de upload no disponible. Intentá más tarde.',
  });
}
```

### Test requerido

```txt
Drive API Error('Rate limit exceeded') → 503
Drive timeout genérico → 503
Drive no configurado → 503
```

---

# 3. Hallazgos importantes

## IMP-1 — Tests pueden subir archivos reales a Google Drive si hay credenciales

### Archivo

```txt
backend/tests/comprobantes.test.js
```

### Evidencia

El test calcula:

```js
const DRIVE_CONFIGURED = !!(environments.googleDrive?.credentialsJson && environments.googleDrive?.folderId);
```

y el comentario advierte:

```txt
When Drive IS configured, uploads go to real Google Drive (not ideal for CI).
```

### Problema

Si un entorno local o CI tiene `GOOGLE_DRIVE_CREDENTIALS_JSON` y `GOOGLE_DRIVE_FOLDER_ID`, los tests pueden crear archivos reales en Google Drive.

Además, los cleanup borran filas `archivo_drive`, pero **no borran el archivo real en Drive**.

### Severidad

```txt
IMPORTANTE ALTA
```

### Fix requerido

Por defecto, no tocar Drive real.

Usar opt-in explícito:

```js
const RUN_REAL_DRIVE_TESTS = process.env.RUN_REAL_DRIVE_TESTS === 'true';

const DRIVE_CONFIGURED =
  RUN_REAL_DRIVE_TESTS &&
  !!(environments.googleDrive?.credentialsJson && environments.googleDrive?.folderId);
```

Y documentar:

```bash
RUN_REAL_DRIVE_TESTS=true npm test -- comprobantes.test.js --runInBand
```

---

## IMP-2 — `_setDriveClientForTest` no restaura cliente real de forma segura

### Archivos

```txt
backend/src/api/services/drive.service.js
backend/tests/comprobantes.drive-mock.test.js
backend/tests/comprobantes.unit.test.js
```

### Evidencia

El servicio expone:

```js
export function _setDriveClientForTest(client, configured) {
  driveClient = client;
  isConfigured = !!configured;
}
```

Los tests guardan:

```js
originalIsConfigured = isDriveReady();
```

pero no guardan el cliente real, porque no existe getter.

Luego restauran con:

```js
_setDriveClientForTest(originalDriveClient, originalIsConfigured);
```

donde `originalDriveClient` queda indefinido.

### Impacto

Si Drive real estaba configurado al comenzar la suite, un test puede dejar:

```txt
isConfigured = true
driveClient = undefined
```

Eso contamina otros tests.

### Severidad

```txt
IMPORTANTE
```

### Fix requerido

Agregar reset seguro:

```js
export function _resetDriveForTest() {
  driveClient = null;
  isConfigured = false;
  initDrive();
}
```

O snapshot:

```js
export function _getDriveStateForTest() {
  return { driveClient, isConfigured };
}
```

Preferencia:

```txt
_resetDriveForTest()
```

---

## IMP-3 — Validación de archivo depende solo de `file.mimetype`

### Archivo

```txt
backend/src/api/middlewares/upload.middleware.js
```

### Evidencia

```js
if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
  cb(null, true);
}
```

### Problema

`file.mimetype` viene del cliente. Un archivo con contenido inválido puede enviarse con:

```txt
contentType: application/pdf
```

y pasar.

### Impacto

El sistema subiría a Drive archivos que no son realmente comprobantes en formato permitido.

### Severidad

```txt
IMPORTANTE MEDIA
```

### Fix requerido

Agregar validación de firma/magic bytes antes de subir a Drive:

```txt
PDF  → empieza con %PDF
PNG  → 89 50 4E 47
JPEG → FF D8 FF
WEBP → RIFF....WEBP
```

Ejemplo de helper:

```txt
backend/src/api/utils/file-signature.utils.js
```

Uso:

```js
assertAllowedFileSignature(req.file.buffer, req.file.mimetype);
```

Si falla:

```txt
400 Archivo inválido o tipo real no coincide con MIME
```

---

## IMP-4 — Nombre original del archivo se usa como nombre en Drive

### Archivo

```txt
backend/src/api/services/drive.service.js
```

### Evidencia

```js
requestBody: {
  name: originalName,
  mimeType,
  parents: [folderId],
}
```

### Problema

`originalName` viene del cliente. Puede repetirse, contener caracteres raros o nombres poco seguros.

Google Drive no interpreta rutas como un filesystem local, pero sigue siendo mala práctica usar el nombre cliente sin prefijo propio.

### Severidad

```txt
IMPORTANTE MEDIA
```

### Fix recomendado

Usar nombre interno seguro:

```js
const safeName = `${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(originalName)}`;
```

Opciones:

- guardar `nombre_original` en DB;
- usar `safeName` solo en Drive;
- agregar columna `nombre_drive` si se quiere registrar.

---

## IMP-5 — `GET /comprobante` devuelve `webViewLink`, pero no garantiza acceso real al archivo

### Archivos

```txt
backend/src/api/controllers/pedido.controller.js
backend/src/api/services/drive.service.js
```

### Evidencia

El endpoint devuelve:

```js
url_publica: archivo.url_publica
```

`url_publica` viene de:

```txt
webViewLink
```

### Problema

`webViewLink` no implica que el admin pueda abrir el archivo si los permisos del archivo/carpeta no están configurados.

### Impacto

B7 podría mostrar un botón “Ver comprobante” que falla al abrir Drive.

### Severidad

```txt
IMPORTANTE MEDIA / DECISIÓN FUNCIONAL
```

### Decisión requerida antes de frontend

Elegir una estrategia:

1. **Metadata-only por ahora** y el admin revisa manualmente en Drive.
2. **Link Drive con permisos compartidos** a la cuenta del grupo.
3. **Permiso público por link** con `permissions.create`.
4. **Proxy autenticado backend** para descargar/ver el archivo.

### Recomendación

Para privacidad:

```txt
proxy admin autenticado
```

Si se posterga, documentar claramente que B7 solo muestra metadata/link y que los permisos Drive deben configurarse fuera del sistema.

---

## IMP-6 — Se sube a Drive antes de validar tienda/stock en DB

### Archivos

```txt
backend/src/api/controllers/pedido.controller.js
backend/src/api/models/pedido.model.js
```

### Evidencia

En `crear()`:

```js
const driveResult = await driveUploadFile(...);
...
const result = await createWithTransaction(...)
```

En `createWithTransaction()` recién después se valida:

```js
SELECT estado FROM configuracion_tienda WHERE id = 1 FOR UPDATE
...
if estado !== 'abierta' throw Error
```

### Problema

Si la tienda está cerrada, en demo, o si luego falla stock, el archivo ya fue subido a Drive.

Esto fue aceptado como deuda de huérfanos, pero algunos casos son evitables, especialmente tienda cerrada/demo.

### Severidad

```txt
IMPORTANTE MEDIA
```

### Fix recomendado

Antes del upload, hacer una validación preflight barata:

```txt
tienda abierta
items existentes/activos
stock aproximado si se desea
```

No reemplaza la transacción real, pero evita subir archivos cuando la tienda está cerrada.

Opción mínima:

```js
await assertStoreOpen(pool);
```

antes de `driveUploadFile`.

---

## IMP-7 — `createCajaSchema` hereda `createPedidoSchema` con preprocess de `items`

### Archivo

```txt
backend/src/api/schemas/pedido.schema.js
```

### Observación

```js
export const createCajaSchema = createPedidoSchema.extend(...)
```

Esto está bien, pero tiene un efecto: caja también acepta `items` como string JSON.

### Severidad

```txt
BAJA / DISEÑO ACEPTABLE
```

### Recomendación

No es bug. Documentarlo si se quiere que caja sea estrictamente JSON puro.

---

## IMP-8 — `app.js` loguea cada request con `console.log`

### Archivo

```txt
backend/src/app.js
```

### Evidencia

```js
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});
```

### Problema

En producción puede generar ruido y logs de rutas con tokens, por ejemplo:

```txt
GET /api/pedidos/seguimiento/:token
```

El token aparecería en logs.

### Severidad

```txt
IMPORTANTE BAJA / PRIVACIDAD
```

### Fix recomendado

- Desactivar en producción o usar logger con redacción.
- No loguear tokens completos.

Ejemplo:

```js
if (!environments.esProduccion) {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}
```

---

## IMP-9 — Documentación de testing no coincide completamente con el estado real

### Archivo

```txt
DOCUMENTACION/IA/TESTING.md
```

### Evidencia

El documento todavía habla de un total aproximado / no estable, y los conteos no son completamente confiables contra lo ejecutado.

El prompt B6.3 dice:

```txt
162 tests, 1 fallo por test-isolation
```

Pero el paquete actual no permite corroborarlo sin MySQL local, y el conteo estático de `it(` da otro número textual porque hay tests condicionales.

### Severidad

```txt
IMPORTANTE BAJA
```

### Fix requerido

Actualizar `TESTING.md` con:

```txt
Estado real esperado:
- npm test debe pasar con 0 fallos.
- Requiere MySQL local con schema + seed.
- Tests DB-backed deben correr --runInBand.
- Tests Drive real son opt-in con RUN_REAL_DRIVE_TESTS=true.
```

---

# 4. Mejoras recomendadas

## MEJ-1 — Timeout explícito para Google Drive

### Prioridad

```txt
MEDIA
```

### Propuesta

Configurar timeout en la llamada a Google Drive o usar AbortController si la librería lo permite.

Motivo:

```txt
Un upload colgado no debería dejar al cliente esperando indefinidamente.
```

---

## MEJ-2 — Rate limit específico para upload

### Prioridad

```txt
MEDIA
```

### Propuesta

Agregar rate limiting a:

```txt
POST /api/pedidos
```

especialmente cuando viene archivo.

Motivo:

```txt
Proteger memoria, cuota Drive y backend.
```

---

## MEJ-3 — Endpoint proxy autenticado para comprobantes

### Prioridad

```txt
MEDIA / ALTA para B7 admin
```

### Propuesta

Agregar en etapa futura:

```txt
GET /api/admin/pedidos/:id/comprobante/ver
```

que descargue o proxyee el archivo desde Drive para admins autenticados.

Motivo:

```txt
No depender de permisos públicos de Drive ni links expuestos.
```

---

## MEJ-4 — Limpieza de archivos huérfanos Drive

### Prioridad

```txt
BAJA para MVP / MEDIA post-evento
```

### Propuesta

Documentar en runbook:

```txt
cómo listar archivos huérfanos
cómo borrarlos manualmente
cómo cruzar archivo_drive vs Drive folder
```

---

# 5. Cosas bien aplicadas

## OK-1 — El ZIP completo incluye `app.js` y `server.js`

### Archivos

```txt
backend/src/app.js
backend/src/server.js
```

### Veredicto

```txt
BIEN APLICADO
```

Esto corrige la limitación principal del ZIP anterior.

---

## OK-2 — `handleMulterError` está montado

### Archivo

```txt
backend/src/app.js
```

### Evidencia

```js
import { handleMulterError } from './api/middlewares/upload.middleware.js';
...
app.use('/api', indexRoutes);
...
app.use(handleMulterError);
app.use(errorMiddleware);
```

### Veredicto

```txt
BIEN APLICADO
```

El orden es correcto para capturar errores de Multer antes del error global.

---

## OK-3 — Flujo multipart está bien encadenado

### Archivo

```txt
backend/src/api/routes/pedido.routes.js
```

### Evidencia

```js
publicRouter.post(
  '/',
  uploadComprobante.single('comprobante'),
  validateBody(createPedidoSchema),
  crear
);
```

### Veredicto

```txt
BIEN APLICADO
```

Multer corre antes de Zod, que es lo correcto para `multipart/form-data`.

---

## OK-4 — `createPedidoSchema` soporta `items` string JSON

### Archivo

```txt
backend/src/api/schemas/pedido.schema.js
```

### Evidencia

```js
items: z.preprocess((val) => {
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return val; }
  }
  return val;
}, z.array(itemSchema).min(1, 'Al menos un producto requerido')),
```

### Veredicto

```txt
BIEN APLICADO
```

---

## OK-5 — Transferencia online exige comprobante

### Archivo

```txt
backend/src/api/controllers/pedido.controller.js
```

### Evidencia

```js
if (metodoPago === 'transferencia' && !tieneComprobante) {
  throw new ValidationError('Transferencia online requiere comprobante. Usá efectivo o contactá al vendedor.');
}
```

### Veredicto

```txt
BIEN APLICADO
```

---

## OK-6 — Efectivo online rechaza comprobante

### Archivo

```txt
backend/src/api/controllers/pedido.controller.js
```

### Evidencia

```js
if (metodoPago === 'efectivo' && tieneComprobante) {
  throw new ValidationError('Los pedidos en efectivo no requieren comprobante.');
}
```

### Veredicto

```txt
BIEN APLICADO
```

---

## OK-7 — Google Drive usa variables de entorno y scope limitado

### Archivo

```txt
backend/src/api/services/drive.service.js
```

### Evidencia

```js
const { credentialsJson, folderId } = environments.googleDrive;
const credentials = JSON.parse(credentialsJson);
...
scopes: ['https://www.googleapis.com/auth/drive.file']
```

### Veredicto

```txt
BIEN APLICADO
```

No se observan credenciales hardcodeadas en el código.

---

## OK-8 — `archivo_drive` se crea dentro de la transacción DB

### Archivos

```txt
backend/src/api/models/pedido.model.js
backend/src/api/models/archivo.model.js
```

### Evidencia

`createWithTransaction` llama:

```js
comprobanteArchivoId = await createArchivo(conn, {...});
```

usando la misma conexión transaccional.

### Veredicto

```txt
BIEN APLICADO
```

Si la transacción DB falla después, la fila `archivo_drive` se revierte. El archivo en Drive queda huérfano, pero eso está documentado como deuda MVP.

---

## OK-9 — Upload exitoso setea `estado_pago = comprobante_subido`

### Archivo

```txt
backend/src/api/models/pedido.model.js
```

### Evidencia

```js
const estadoPago = data.estado_pago || (data.archivo ? 'comprobante_subido' : 'pendiente');
```

### Veredicto

```txt
BIEN APLICADO
```

---

## OK-10 — Endpoint admin de comprobante existe y está antes de `/:id`

### Archivo

```txt
backend/src/api/routes/pedido.routes.js
```

### Evidencia

```js
adminRouter.get('/:id/comprobante', requireAdmin, validateParams(idParamSchema), obtenerComprobante);
adminRouter.get('/:id', requireAdmin, validateParams(idParamSchema), obtenerAdmin);
```

### Veredicto

```txt
BIEN APLICADO
```

El orden evita que `/:id` capture la ruta de comprobante.

---

## OK-11 — `GET /comprobante` no devuelve bytes

### Archivo

```txt
backend/src/api/controllers/pedido.controller.js
```

### Evidencia

Devuelve:

```js
drive_id
nombre_original
mime_type
tamanio_bytes
url_publica
created_at
```

y no devuelve `buffer`.

### Veredicto

```txt
BIEN APLICADO SEGÚN ESPECIFICACIÓN ACTUAL
```

---

## OK-12 — Schema SQL alineado

### Archivo

```txt
backend/src/api/database/schema.sql
```

### Evidencia

La tabla `archivo_drive` tiene:

```sql
drive_id VARCHAR(150) NOT NULL UNIQUE
nombre_original VARCHAR(255) NOT NULL
mime_type VARCHAR(100) NOT NULL
tamanio_bytes INT NOT NULL CHECK (tamanio_bytes > 0)
tipo ENUM('producto_imagen', 'comprobante') NOT NULL
url_publica TEXT NULL
```

`pedido` tiene:

```sql
comprobante_archivo_id INT NULL
CONSTRAINT fk_pedido_comprobante
CONSTRAINT chk_pedido_comprobante_efectivo
```

### Veredicto

```txt
BIEN APLICADO
```

---

## OK-13 — `requireTrustedOrigin` sigue endurecido

### Archivo

```txt
backend/src/api/middlewares/origin.middleware.js
```

### Evidencia

```js
const trustedOrigin = safeOriginFromUrl(environments.frontendUrl) || environments.frontendUrl;
...
refererOrigin === trustedOrigin
```

### Veredicto

```txt
BIEN APLICADO
```

---

# 6. Checklist B6.3

| # | Item | Estado |
|---|------|--------|
| 1 | `drive.service.js` usa env vars, no hardcode | ✅ |
| 2 | Multer memoryStorage, no disco | ✅ |
| 3 | MIME filter: solo jpg/png/webp/pdf | ✅ |
| 4 | Límite 5 MB | ✅ |
| 5 | Upload a Drive antes de DB transaction | ✅ |
| 6 | `estado_pago=comprobante_subido` en upload exitoso | ✅ |
| 7 | `archivo_drive` row insertada dentro de transaction | ✅ |
| 8 | CHECK constraint: efectivo no puede tener comprobante | ✅ |
| 9 | GET /comprobante devuelve solo metadata | ✅ |
| 10 | Caja transferencia bypass comprobante | ✅ |
| 11 | 503 para Drive no disponible/API error | ⚠️ Parcial |
| 12 | `z.preprocess` en items para multipart | ✅ |
| 13 | `_setDriveClientForTest` restaurado en tests | ⚠️ Parcial |
| 14 | GOTCHAS.md documenta huérfanos | ✅ |
| 15 | Sin cambios en frontend/v0 | No verificable por diff; el ZIP incluye carpetas completas |
| 16 | `handleMulterError` montado | ✅ |
| 17 | `npm test` verde | ❌ No demostrado; prompt reporta 1 fallo y sandbox falla sin DB |
| 18 | ZIP sin secretos | ❌ |
| 19 | ZIP sin `node_modules` | ❌ |
| 20 | Magic bytes / firma real de archivo | ❌ |

---

# 7. Preguntas pre-B7

## 7.1 — ¿Hay algo que impida comenzar B7?

Sí.

No por la estructura base de la API, sino por calidad y estabilidad:

```txt
- tests no están verdes de forma demostrada;
- el ZIP incluye .env;
- Drive errors pueden caer como 500;
- tests pueden tocar Drive real;
- validación de archivo es débil;
- no está decidida la visualización real del comprobante para admin.
```

## 7.2 — ¿La API de comprobantes es suficientemente estable para que el frontend consuma?

Parcialmente.

Están bastante estables:

```txt
POST /api/pedidos multipart con campo comprobante
GET /api/admin/pedidos/:id/comprobante
estado_pago = comprobante_subido
errores 400 por reglas de pago/archivo
```

No está completamente cerrada la parte de:

```txt
cómo verá el admin el archivo real
```

porque `GET /comprobante` devuelve metadata y `url_publica`, pero no garantiza que el link abra.

## 7.3 — ¿Hay riesgos de seguridad no resueltos?

Sí:

```txt
- .env compartido en ZIP;
- mimetype spoofing;
- tests con Drive real;
- posible exposición de webViewLink según permisos;
- logs de rutas con token de seguimiento;
- sin rate limit/timeout específico para upload.
```

## 7.4 — ¿El test de caja que falla por test-isolation debe arreglarse antes de B7?

Sí.

Para avanzar a frontend, la API backend debería estar respaldada por:

```txt
npm test → 0 fallos
```

No aceptaría “1 fallo conocido” como base estable.

---

# 8. Plan de remediación recomendado

## Fix 1 — Corregir generación de ZIP

### Acción

Usar siempre:

```bash
bash scripts/crear_zip_auditoria.sh
```

o actualizar el flujo manual para excluir:

```txt
.env
.env.local
node_modules
.next
coverage
dist
credentials
drive-credentials.json
```

### Verificación

```bash
unzip -l ZIP | grep -E 'node_modules|(^|/)\\.env$|\\.env.local|credentials|drive-credentials'
```

Resultado esperado:

```txt
sin resultados
```

---

## Fix 2 — Crear `DriveUploadError`

### Archivos

```txt
backend/src/api/services/drive.service.js
backend/src/api/controllers/pedido.controller.js
backend/tests/comprobantes.drive-mock.test.js
backend/tests/comprobantes.test.js
```

### Objetivo

Todo fallo de Drive debe mapearse a 503, sin depender de strings.

---

## Fix 3 — Corregir tests para 0 fallos

### Acciones

- Usar `--runInBand` para DB-backed tests.
- Evitar múltiples `pool.end()` concurrentes.
- Documentar setup MySQL para tests.
- Corregir aislamiento stock entre `comprobantes.test.js` y `caja.test.js`.
- Exigir `npm test` verde.

---

## Fix 4 — Evitar Drive real por defecto en tests

### Archivo

```txt
backend/tests/comprobantes.test.js
```

### Cambio

```js
const RUN_REAL_DRIVE_TESTS = process.env.RUN_REAL_DRIVE_TESTS === 'true';

const DRIVE_CONFIGURED =
  RUN_REAL_DRIVE_TESTS &&
  !!(environments.googleDrive?.credentialsJson && environments.googleDrive?.folderId);
```

---

## Fix 5 — Reset seguro de Drive mock

### Archivo

```txt
backend/src/api/services/drive.service.js
```

### Cambio

Agregar:

```js
export function _resetDriveForTest() {
  driveClient = null;
  isConfigured = false;
  initDrive();
}
```

---

## Fix 6 — Validación de magic bytes

### Archivo sugerido

```txt
backend/src/api/utils/file-signature.utils.js
```

### Reglas

```txt
PDF  → %PDF
PNG  → 89 50 4E 47
JPEG → FF D8 FF
WEBP → RIFF....WEBP
```

---

## Fix 7 — Nombre seguro en Drive

### Archivo

```txt
backend/src/api/services/drive.service.js
```

### Cambio

Usar nombre interno:

```js
const driveName = `${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(originalName)}`;
```

Guardar `nombre_original` en DB como está.

---

## Fix 8 — Definir visualización de comprobante en B7

### Decisión

Elegir:

```txt
metadata-only
link Drive con permisos
proxy admin autenticado
```

Recomendación:

```txt
proxy admin autenticado
```

Si se posterga, documentar que B7 solo muestra metadata o link Drive y que los permisos deben configurarse en Drive.

---

## Fix 9 — Preflight antes de subir a Drive

### Objetivo

Evitar huérfanos obvios.

Antes de subir a Drive, validar al menos:

```txt
tienda abierta
```

Luego, la validación transaccional real sigue en `createWithTransaction`.

---

## Fix 10 — Reducir logs de request en producción

### Archivo

```txt
backend/src/app.js
```

### Cambio

```js
if (!environments.esProduccion) {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}
```

Evitar loguear tokens completos de seguimiento.

---

# 9. Orden recomendado

```txt
1. Corregir ZIP/auditoría: sin .env ni node_modules.
2. Corregir tests hasta 0 fallos.
3. Crear DriveUploadError y mapear 503 estable.
4. Evitar Drive real por defecto en tests.
5. Reset seguro de Drive mock.
6. Validar magic bytes.
7. Nombre seguro en Drive.
8. Preflight tienda abierta antes de upload.
9. Decidir visualización admin del comprobante.
10. Actualizar documentación IA y OpenSpec.
11. Generar nuevo ZIP limpio.
12. Auditoría rápida final.
```

---

# 10. Prompt para OpenCode — B6.3.1

Copiar desde la raíz del proyecto.

```txt
Continuemos con Kermingo. La auditoría completa del ZIP kermingo_menu(4).zip confirmó que B6.3 está funcionalmente bien encaminada, pero detectó hardening necesario antes de avanzar a B7.

# Etapa B6.3.1 — Hardening comprobantes, Drive, tests y ZIP limpio pre-B7

Trabajá bajo metodología SDD usando Gentle AI.

No implementar frontend todavía.
No tocar diseno-de-landing-kermingo/.
No cambiar reglas de caja/pago/stock salvo que sea necesario para los fixes.

## Objetivo

Cerrar los puntos detectados por auditoría:

1. Garantizar que los ZIPs de auditoría NO incluyan:
   - backend/.env
   - frontend/.env
   - node_modules/
   - .next/
   - coverage/
   - dist/
   - credentials/
   - drive-credentials.json

2. Corregir tests hasta que:
   - npm test pase con 0 fallos
   - los tests DB-backed corran de forma determinista
   - no haya cierre múltiple problemático del pool
   - no haya contaminación de stock entre suites

3. Crear error tipado `DriveUploadError`:
   - todo error de Drive debe mapearse a 503
   - no depender de strings del mensaje

4. Evitar Drive real por defecto en tests:
   - usar `RUN_REAL_DRIVE_TESTS=true` como opt-in
   - por defecto, usar mock o paths no configurados

5. Mejorar `_setDriveClientForTest`:
   - agregar `_resetDriveForTest()` o `_getDriveStateForTest()`
   - evitar que el cliente real quede contaminado

6. Validar magic bytes del archivo:
   - PDF `%PDF`
   - PNG `89 50 4E 47`
   - JPEG `FF D8 FF`
   - WEBP `RIFF....WEBP`

7. Usar nombre seguro en Drive:
   - no usar `originalName` directamente como nombre Drive
   - mantener `nombre_original` en DB

8. Hacer preflight antes de subir a Drive:
   - validar tienda abierta antes del upload para evitar huérfanos evitables

9. Definir/documentar estrategia admin para ver comprobantes:
   - metadata-only
   - link Drive con permisos
   - proxy admin autenticado

10. Reducir logs de request en producción:
   - no loguear tokens de seguimiento completos

## Leer antes

- AGENTS.md
- docs/planificacion/45-AUDITORIA_COMPLETA_B6_3_ZIP_COMPLETO.md
- backend/src/app.js
- backend/src/api/services/drive.service.js
- backend/src/api/middlewares/upload.middleware.js
- backend/src/api/controllers/pedido.controller.js
- backend/src/api/models/pedido.model.js
- backend/src/api/routes/pedido.routes.js
- backend/src/api/schemas/pedido.schema.js
- backend/tests/comprobantes.test.js
- backend/tests/comprobantes.drive-mock.test.js
- backend/tests/comprobantes.unit.test.js
- backend/tests/caja.test.js
- DOCUMENTACION/IA/GOTCHAS.md
- DOCUMENTACION/IA/TESTING.md
- DOCUMENTACION/IA/API.md
- DOCUMENTACION/IA/SECRETS.md

## Verificación obligatoria

Ejecutar:

```bash
cd backend
npm test
npm run dev
curl http://localhost:3001/api/health
```

Casos obligatorios:

```txt
- transferencia sin comprobante → 400
- efectivo con comprobante → 400
- transferencia con archivo válido y Drive mock → 201
- Drive error genérico "Rate limit exceeded" → 503
- MIME inválido → 400
- archivo >5MB → 413
- archivo con mimetype PDF pero firma inválida → 400
- GET comprobante sin auth → 401
- GET comprobante con admin → metadata sin buffer
- npm test 0 fallos
- ZIP generado sin .env ni node_modules
```

## Resultado esperado

Responder con:

```txt
## Resultado B6.3.1 — Hardening comprobantes/Drive/tests/ZIP

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

Cambios en ZIP/script auditoría:
-

Cambios en DriveUploadError:
-

Cambios en tests:
-

Cambios en Drive mock:
-

Cambios en validación de archivo:
-

Cambios en nombres de Drive:
-

Cambios en preflight:
-

Cambios documentación:
-

Resultado npm test:
-

Decisión visualización comprobante:
-

Pendientes:
-

Bloquea avance a B7:
si/no

Veredicto:
-
```

No avanzar a B7 hasta que Marcos revise.
```

---

# 11. Veredicto final

```txt
¿Flujo multipart correcto?
SÍ.

¿handleMulterError montado?
SÍ.

¿State machine compliance?
SÍ.

¿Drive integration segura?
PARCIAL. Falta DriveUploadError, evitar Drive real en tests y magic bytes.

¿Tests cubren B6.3?
PARCIAL. Hay buena cobertura, pero no hay suite verde demostrada y el prompt reportaba 1 fallo.

¿Docs alineadas con código?
PARCIAL.

¿ZIP limpio para auditoría?
NO. Incluye .env y node_modules.

¿Sin frontend/v0 contamination?
No verificable por diff; el ZIP completo incluye esas carpetas.

¿B6.3 está funcionalmente implementado?
SÍ, en lo central.

¿B6.3 está listo para B7?
NO todavía.
```

## Recomendación final

Hacer una etapa corta:

```txt
B6.3.1 — Hardening comprobantes, Drive, tests y ZIP limpio pre-B7
```

Después de eso, si:

```txt
npm test pasa con 0 fallos
Drive errors devuelven 503 estable
tests no tocan Drive real por defecto
ZIP no incluye .env ni node_modules
magic bytes valida archivos
estrategia de visualización admin está definida
```

entonces sí avanzaría a:

```txt
B7 — Frontend público + admin
```
