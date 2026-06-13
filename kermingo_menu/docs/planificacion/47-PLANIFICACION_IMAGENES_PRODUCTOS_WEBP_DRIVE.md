# 47 — Planificación detallada — Imágenes de productos WebP + Google Drive + Menú público

## Objetivo

Implementar fotos reales de comidas/productos para Kermingo:

```txt
Admin web → sube imagen JPG/PNG/WEBP
Backend → valida archivo
Backend → convierte a WebP con sharp
Backend → sube WebP a Google Drive
Backend → guarda metadata en archivo_drive
Backend → asocia producto.imagen_archivo_id
Menú público → usa imagen_url del backend
Backend → sirve la imagen desde Drive por API propia
```

La imagen pública **no debe cargarse desde Google Drive directo**. Debe cargarse desde la API propia para evitar problemas de CORS, permisos, hotlinking y links de Drive no embebibles.

## Carpeta Google Drive para imágenes de productos

Usar esta carpeta:

```txt
1LWWeuAz4iV4Yq-iM8q1f_HZm-FEAUCmk
```

Variable recomendada:

```env
GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID=1LWWeuAz4iV4Yq-iM8q1f_HZm-FEAUCmk
```

Regla:

```txt
Comprobantes → GOOGLE_DRIVE_FOLDER_ID
Imágenes de productos → GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID
Si GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID no existe → fallback a GOOGLE_DRIVE_FOLDER_ID
```

---

# 1. Estado actual del proyecto

## 1.1 Base de datos

La DB ya está preparada para esto.

Existe:

```txt
archivo_drive
```

con:

```txt
id
drive_id
nombre_original
mime_type
tamanio_bytes
tipo
url_publica
created_at
```

y `tipo` acepta:

```txt
producto_imagen
comprobante
```

También existe en `producto`:

```txt
imagen_archivo_id
```

apuntando a:

```txt
archivo_drive(id)
```

Por eso no hace falta crear una tabla nueva. Hay que completar modelos, endpoints, frontend y tests.

## 1.2 Google Drive

El backend ya tiene OAuth Drive para comprobantes. Esa integración debe reutilizarse para productos, agregando:

```txt
- folder específico de productos
- conversión a WebP antes de subir
- lectura/stream desde Drive
```

## 1.3 Productos

Actualmente productos lista datos básicos, pero todavía no expone imagen:

```txt
id
nombre
descripcion
precio
tipo
stock
activo
categorias
```

Hay que agregar:

```txt
imagen_archivo_id
imagen_url
imagen_mime_type
imagen_tamanio_bytes
```

## 1.4 Frontend menú

El frontend todavía puede estar usando mock desde:

```txt
frontend/lib/products.ts
```

y la card ya contempla un campo tipo:

```ts
image?: string
```

El objetivo es que `image` venga desde:

```txt
GET /api/productos
```

como URL de API propia.

---

# 2. Decisiones técnicas

## 2.1 Formato final

Toda imagen de producto se guarda como:

```txt
image/webp
```

Extensión:

```txt
.webp
```

## 2.2 Conversión

Usar:

```txt
sharp
```

Regla recomendada:

```txt
rotate automático
resize máximo 900x900
fit inside
withoutEnlargement true
webp quality 75
```

## 2.3 Tamaño máximo de entrada

Recomendado:

```txt
5 MB
```

Motivo: permite subir fotos de celular razonables, y el backend las optimiza.

## 2.4 Tamaño esperado de salida

Objetivo:

```txt
< 250 KB por imagen
```

No bloquear si queda algo mayor, pero sí documentarlo como objetivo de performance.

## 2.5 Borrado de imagen

MVP:

```txt
DELETE /api/admin/productos/:id/imagen
```

solo desasocia:

```txt
producto.imagen_archivo_id = NULL
```

No borra el archivo de Drive por ahora.

Motivo:

```txt
- evita borrados accidentales
- reduce riesgo operativo
- simplifica MVP
```

Deuda aceptada:

```txt
pueden quedar archivos huérfanos en Drive
```

---

# 3. Variables de entorno

## 3.1 Backend local

Agregar en `backend/.env`:

```env
GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID=1LWWeuAz4iV4Yq-iM8q1f_HZm-FEAUCmk
```

Mantener:

```env
GOOGLE_DRIVE_FOLDER_ID=...
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REFRESH_TOKEN=...
```

## 3.2 Railway

Agregar en variables del backend Railway:

```env
GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID=1LWWeuAz4iV4Yq-iM8q1f_HZm-FEAUCmk
```

## 3.3 `.env.example`

Actualizar:

```env
# Google Drive OAuth
GOOGLE_DRIVE_FOLDER_ID=your-comprobantes-folder-id
GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID=your-product-images-folder-id
GOOGLE_OAUTH_CLIENT_ID=your-google-oauth-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_OAUTH_REFRESH_TOKEN=your-google-oauth-refresh-token
```

---

# 4. Backend — Fase A: configuración y servicios

## 4.1 Instalar sharp

```bash
cd backend
npm install sharp
```

## 4.2 Actualizar environments

Archivo:

```txt
backend/src/api/config/environments.js
```

Agregar:

```js
const googleDriveProductosFolderId = process.env.GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID || '';
```

Dentro de `googleDrive`:

```js
googleDrive: {
  folderId: googleDriveFolderId,
  productosFolderId: googleDriveProductosFolderId,
  oauthClientId: googleOAuthClientId,
  oauthClientSecret: googleOAuthClientSecret,
  oauthRefreshToken: googleOAuthRefreshToken,
}
```

En producción, `GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID` puede ser opcional si hay fallback a `GOOGLE_DRIVE_FOLDER_ID`.

## 4.3 Crear `image.service.js`

Archivo nuevo:

```txt
backend/src/api/services/image.service.js
```

Función:

```js
import sharp from 'sharp';
import { ValidationError } from '../utils/errors.js';

export async function processProductImage(inputBuffer) {
  try {
    const outputBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({
        width: 900,
        height: 900,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 75 })
      .toBuffer();

    return {
      buffer: outputBuffer,
      mimeType: 'image/webp',
      extension: 'webp',
      size: outputBuffer.length,
    };
  } catch {
    throw new ValidationError('No se pudo procesar la imagen. Verificá que sea JPG, PNG o WEBP válido.');
  }
}
```

---

# 5. Backend — Fase B: Google Drive

## 5.1 Extender `drive.service.js`

Archivo:

```txt
backend/src/api/services/drive.service.js
```

Mantener `uploadFile()` para comprobantes.

Agregar soporte para folder opcional:

```js
export async function uploadFile(buffer, originalName, mimeType, options = {}) {
  const folderId = options.folderId || environments.googleDrive.folderId;
  ...
}
```

Para productos:

```js
const folderId =
  environments.googleDrive.productosFolderId ||
  environments.googleDrive.folderId;
```

## 5.2 Agregar lectura desde Drive

Agregar:

```js
export async function downloadFile(driveFileId) {
  if (!isConfigured || !driveClient) {
    throw new DriveReadError('Google Drive service is not configured. Cannot read files.');
  }

  try {
    const response = await driveClient.files.get(
      { fileId: driveFileId, alt: 'media' },
      { responseType: 'stream' }
    );

    return response.data;
  } catch (err) {
    throw new DriveReadError(`Failed to read file from Google Drive: ${err.message}`);
  }
}
```

## 5.3 Nombre interno recomendado

Para productos:

```txt
producto-{productoId}-{timestamp}-{uuid}.webp
```

Ejemplo:

```txt
producto-12-1710000000000-uuid.webp
```

Guardar en DB:

```txt
nombre_original = nombre original subido por admin
mime_type = image/webp
```

---

# 6. Backend — Fase C: errores

Archivo:

```txt
backend/src/api/utils/errors.js
```

Agregar:

```js
export class DriveReadError extends AppError {
  constructor(message = 'Servicio de lectura de archivos no disponible. Intentá más tarde.') {
    super(message, 503);
    this.name = 'DriveReadError';
  }
}
```

Verificar que `error.middleware.js` responda `503` para `DriveReadError`.

---

# 7. Backend — Fase D: upload middleware

Archivo:

```txt
backend/src/api/middlewares/upload.middleware.js
```

## 7.1 Crear middleware específico

```js
const PRODUCT_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

function productImageFileFilter(_req, file, cb) {
  if (PRODUCT_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no soportado: ${file.mimetype}. Solo se permiten JPG, PNG y WEBP.`), false);
  }
}

export const uploadProductoImagen = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: productImageFileFilter,
});
```

## 7.2 Middleware magic bytes solo imágenes

```js
export function assertProductImageMagicBytes(req, res, next) {
  if (!req.file) {
    return next(new ValidationError('Imagen requerida'));
  }

  if (!PRODUCT_IMAGE_MIME_TYPES.includes(req.file.mimetype)) {
    return next(new ValidationError('Solo se permiten imágenes JPG, PNG o WEBP'));
  }

  try {
    assertAllowedFileSignature(req.file.buffer, req.file.mimetype);
    next();
  } catch (err) {
    next(err);
  }
}
```

No permitir PDF para productos.

---

# 8. Backend — Fase E: archivo.model

Archivo:

```txt
backend/src/api/models/archivo.model.js
```

Agregar:

```js
export async function findProductImageByProductId(pool, productoId, { includeInactive = false } = {}) {
  const activoClause = includeInactive ? '' : 'AND p.activo = 1';

  const [rows] = await pool.query(
    `
    SELECT
      a.id,
      a.drive_id,
      a.nombre_original,
      a.mime_type,
      a.tamanio_bytes,
      a.tipo,
      a.url_publica,
      a.created_at
    FROM producto p
    JOIN archivo_drive a ON a.id = p.imagen_archivo_id
    WHERE p.id = ?
      ${activoClause}
      AND a.tipo = 'producto_imagen'
    `,
    [productoId]
  );

  return rows[0] || null;
}
```

---

# 9. Backend — Fase F: producto.model

Archivo:

```txt
backend/src/api/models/producto.model.js
```

## 9.1 Agregar JOIN

En público y admin:

```sql
LEFT JOIN archivo_drive ai ON ai.id = p.imagen_archivo_id
```

## 9.2 Agregar campos al SELECT

```sql
p.imagen_archivo_id,
ai.nombre_original AS imagen_nombre_original,
ai.mime_type AS imagen_mime_type,
ai.tamanio_bytes AS imagen_tamanio_bytes,
CASE
  WHEN ai.id IS NOT NULL THEN CONCAT('/api/productos/', p.id, '/imagen?v=', ai.id)
  ELSE NULL
END AS imagen_url
```

## 9.3 No exponer al público

No devolver públicamente:

```txt
drive_id
webViewLink
url_publica de Drive
```

## 9.4 Ajustar GROUP BY

Agregar al `GROUP BY`:

```sql
p.imagen_archivo_id,
ai.id,
ai.nombre_original,
ai.mime_type,
ai.tamanio_bytes
```

## 9.5 Helper transaccional

Agregar:

```js
export async function updateImagenArchivoId(conn, productoId, archivoId) {
  const [result] = await conn.query(
    'UPDATE producto SET imagen_archivo_id = ? WHERE id = ?',
    [archivoId, productoId]
  );
  return result.affectedRows;
}
```

También conviene agregar:

```js
export async function findByIdAdmin(pool, id) {
  ...
}
```

para verificar existencia aunque esté inactivo.

---

# 10. Backend — Fase G: producto.controller

Archivo:

```txt
backend/src/api/controllers/producto.controller.js
```

Agregar:

```txt
obtenerImagen
subirImagen
quitarImagen
```

## 10.1 `obtenerImagen`

Endpoint:

```txt
GET /api/productos/:id/imagen
```

Flujo:

```txt
1. Buscar imagen por producto activo.
2. Si no existe → 404.
3. Descargar stream desde Drive.
4. Responder image/webp.
5. Agregar cache headers.
6. Pipear stream a response.
```

Headers:

```js
res.setHeader('Content-Type', archivo.mime_type);
res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
res.setHeader('Content-Disposition', `inline; filename="${archivo.nombre_original}"`);
```

## 10.2 `subirImagen`

Endpoint:

```txt
POST /api/admin/productos/:id/imagen
```

Flujo:

```txt
1. Validar producto existente.
2. Exigir req.file.
3. Validar magic bytes.
4. Procesar con sharp a WebP.
5. Subir WebP a Drive folder productos.
6. Abrir transacción.
7. Insertar archivo_drive tipo producto_imagen.
8. Actualizar producto.imagen_archivo_id.
9. Commit.
10. Devolver producto actualizado con imagen_url.
```

Datos para `archivo_drive`:

```txt
drive_id = Drive file id
nombre_original = req.file.originalname
mime_type = image/webp
tamanio_bytes = outputBuffer.length
tipo = producto_imagen
url_publica = webViewLink o null
```

## 10.3 `quitarImagen`

Endpoint:

```txt
DELETE /api/admin/productos/:id/imagen
```

Flujo MVP:

```txt
1. Validar producto existente.
2. UPDATE producto SET imagen_archivo_id = NULL WHERE id = ?
3. Devolver producto actualizado.
```

No borrar Drive en esta etapa.

---

# 11. Backend — Fase H: producto.routes

Archivo:

```txt
backend/src/api/routes/producto.routes.js
```

## 11.1 Rutas públicas

Importar:

```js
obtenerImagen
```

Agregar antes de `/:id`:

```js
publicRouter.get('/:id/imagen', validateParams(idParamSchema), obtenerImagen);
publicRouter.get('/:id', validateParams(idParamSchema), obtener);
```

## 11.2 Rutas admin

Importar:

```js
subirImagen,
quitarImagen
```

Agregar antes de `PUT /:id`:

```js
adminRouter.post(
  '/:id/imagen',
  requireAdmin,
  requireTrustedOrigin,
  validateParams(idParamSchema),
  uploadProductoImagen.single('imagen'),
  assertProductImageMagicBytes,
  subirImagen
);

adminRouter.delete(
  '/:id/imagen',
  requireAdmin,
  requireTrustedOrigin,
  validateParams(idParamSchema),
  quitarImagen
);
```

---

# 12. Frontend público — menú

## 12.1 Crear API client

Archivo:

```txt
frontend/lib/api.ts
```

```ts
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function apiUrl(path: string) {
  if (path.startsWith('http')) return path;
  return `${API_URL}${path}`;
}
```

## 12.2 Crear productos API

Archivo:

```txt
frontend/lib/productos-api.ts
```

Responsabilidad:

```txt
- llamar GET /api/productos
- mapear backend español → UI Product
- armar image absoluta desde imagen_url
```

Mapper:

```ts
function mapProductoApiToProduct(p: ProductoApi): Product {
  return {
    id: String(p.id),
    name: p.nombre,
    description: p.descripcion || '',
    price: Number(p.precio),
    meals: mapCategoriasToMeals(p.categorias),
    type: p.tipo,
    stock: calcularStockStatus(p),
    icon: fallbackIcon(p.tipo, p.nombre),
    image: p.imagen_url ? apiUrl(p.imagen_url) : undefined,
  };
}
```

Stock:

```ts
function calcularStockStatus(p: ProductoApi): StockStatus {
  if (!p.stock_limitado) return 'ilimitado';
  if (Number(p.stock_actual) <= 0) return 'agotado';
  if (Number(p.stock_actual) <= Number(p.stock_minimo_alerta)) return 'bajo';
  return 'disponible';
}
```

## 12.3 MenuScreen

Cambiar de mock local a API real, o dejar fallback claro.

Ideal:

```txt
- cargar productos desde backend
- mostrar loading state
- mostrar error state
- fallback mock solo en modo demo si está documentado
```

## 12.4 ProductCard

Mantener imagen:

```tsx
<img
  src={product.image}
  alt={product.name}
  loading="lazy"
  decoding="async"
/>
```

Agregar:

```txt
- fallback si falla imagen
- placeholder sobrio
- sin layout shift
```

---

# 13. Frontend admin

## 13.1 Si ya existe admin productos

Agregar:

```txt
- preview imagen actual
- input file
- preview local antes de subir
- botón Subir/Reemplazar imagen
- botón Quitar imagen
- estados loading/error/success
```

## 13.2 Si no existe admin productos

Crear pantalla mínima:

```txt
/admin/productos
```

MVP:

```txt
- listar productos
- mostrar imagen actual o placeholder
- subir/reemplazar imagen
- quitar imagen
```

No hace falta resolver todo el CRUD visual si todavía no existe.

## 13.3 Validación frontend

```txt
accept="image/webp,image/jpeg,image/png"
máximo 5 MB
mensaje: "El servidor la optimiza automáticamente a WebP"
```

---

# 14. Tests backend

Archivo sugerido:

```txt
backend/tests/producto-imagen.test.js
```

Casos:

```txt
[ ] GET /api/productos incluye imagen_url cuando producto tiene imagen.
[ ] GET /api/productos no expone drive_id.
[ ] GET /api/productos/:id/imagen devuelve image/webp.
[ ] GET imagen producto sin imagen devuelve 404.
[ ] GET imagen producto inexistente devuelve 404.
[ ] POST /api/admin/productos/:id/imagen sin auth devuelve 401.
[ ] POST imagen válida con admin crea archivo_drive.
[ ] POST imagen válida actualiza producto.imagen_archivo_id.
[ ] POST PDF devuelve 400.
[ ] POST mimetype falso devuelve 400.
[ ] POST archivo vacío devuelve 400.
[ ] DELETE imagen desasocia producto.imagen_archivo_id.
[ ] Drive upload error devuelve 503.
[ ] Drive read error devuelve 503.
```

No tocar Drive real por defecto.

Test real opcional:

```bash
RUN_REAL_DRIVE_TESTS=true npm test -- --testPathPattern=producto-imagen
```

---

# 15. Documentación

Actualizar:

```txt
DOCUMENTACION/IA/API.md
DOCUMENTACION/IA/CORE.md
DOCUMENTACION/IA/INFRA.md
DOCUMENTACION/IA/GOTCHAS.md
DOCUMENTACION/IA/TESTING.md
DOCUMENTACION/IA/WEBAPP.md
backend/.env.example
openspec/
```

Documentar:

```txt
- admin sube JPG/PNG/WEBP
- backend convierte a WebP
- backend guarda en Google Drive folder productos
- DB guarda metadata y FK
- frontend lee por API propia
- no se usan links directos de Google Drive
- posible huérfano si falla DB después de upload
- DELETE imagen solo desasocia en MVP
```

---

# 16. OpenSpec

Crear:

```txt
openspec/changes/product-images-drive-webp/
```

## proposal.md

```txt
Agregar imágenes de productos subidas por admin, convertidas a WebP, guardadas en Drive y servidas por API propia.
```

## design.md

Explicar:

```txt
- por qué WebP
- por qué sharp
- por qué Google Drive
- por qué proxy backend
- por qué no webViewLink
- deuda de archivos huérfanos
```

## tasks.md

Checklist completo backend/frontend/tests/docs.

## specs/productos/spec.md

Requirements:

```txt
WHEN admin uploads valid product image
THEN system converts it to WebP
AND stores it in Google Drive product folder
AND creates archivo_drive row
AND associates producto.imagen_archivo_id

WHEN public menu requests products
THEN product with image exposes imagen_url

WHEN browser requests imagen_url
THEN API serves image/webp

WHEN invalid image is uploaded
THEN system rejects with 400
```

---

# 17. Orden recomendado de implementación

```txt
1. Agregar GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID.
2. Instalar sharp.
3. Crear image.service.js.
4. Extender drive.service.js con folder opcional y downloadFile.
5. Agregar DriveReadError.
6. Crear uploadProductoImagen.
7. Crear assertProductImageMagicBytes.
8. Agregar findProductImageByProductId.
9. Modificar producto.model.js para devolver imagen_url.
10. Agregar controller obtenerImagen.
11. Agregar controller subirImagen.
12. Agregar controller quitarImagen.
13. Agregar rutas.
14. Tests backend con mock Drive.
15. Documentación/OpenSpec.
16. Frontend menú consume imagen_url.
17. Admin UI para subir/quitar.
18. Prueba manual con Drive real.
```

---

# 18. Criterios de aceptación

## Backend

```txt
[ ] npm test pasa.
[ ] POST /api/admin/productos/:id/imagen acepta JPG/PNG/WEBP.
[ ] POST convierte a WebP.
[ ] POST guarda en Drive folder 1LWWeuAz4iV4Yq-iM8q1f_HZm-FEAUCmk.
[ ] POST crea archivo_drive tipo producto_imagen.
[ ] POST actualiza producto.imagen_archivo_id.
[ ] GET /api/productos devuelve imagen_url.
[ ] GET /api/productos/:id/imagen responde image/webp.
[ ] DELETE /api/admin/productos/:id/imagen desasocia imagen.
[ ] PDF rechazado.
[ ] MIME falso rechazado.
[ ] Drive upload/read error devuelve 503.
```

## Frontend público

```txt
[ ] Menú muestra imagen real si existe.
[ ] Menú muestra placeholder si no existe.
[ ] Imagen usa lazy loading.
[ ] Imagen no genera layout shift.
[ ] No usa Google Drive directo.
```

## Admin

```txt
[ ] Admin puede elegir imagen.
[ ] Admin ve preview.
[ ] Admin puede subir/reemplazar.
[ ] Admin puede quitar.
[ ] Admin ve errores claros.
```

## Seguridad

```txt
[ ] Upload requiere admin.
[ ] Mutaciones usan requireTrustedOrigin.
[ ] No se exponen tokens OAuth.
[ ] No se expone drive_id públicamente.
[ ] No se usa webViewLink público.
```

---

# 19. Prueba manual

## Upload

Usar Postman/Thunder Client:

```txt
POST http://localhost:3001/api/admin/productos/1/imagen
Content-Type: multipart/form-data
Cookie admin válida
field imagen = archivo JPG/PNG/WEBP
```

Esperado:

```txt
200 o 201
producto actualizado
imagen_archivo_id != null
imagen_url != null
```

## SQL

```sql
SELECT id, nombre, imagen_archivo_id
FROM producto
WHERE id = 1;
```

```sql
SELECT id, drive_id, nombre_original, mime_type, tamanio_bytes, tipo
FROM archivo_drive
ORDER BY id DESC
LIMIT 5;
```

Esperado:

```txt
mime_type = image/webp
tipo = producto_imagen
```

## Imagen pública

```bash
curl -i http://localhost:3001/api/productos/1/imagen
```

Esperado:

```txt
HTTP/1.1 200
Content-Type: image/webp
Cache-Control: public, max-age=86400, stale-while-revalidate=604800
```

## Menú

```txt
Abrir menú público.
Producto 1 muestra imagen real.
Si se reemplaza imagen, cambia con ?v=imagen_archivo_id.
```

---

# 20. Riesgos y mitigaciones

## Riesgo: sharp falla en Railway

Mitigación:

```txt
probar deploy temprano y revisar logs
```

## Riesgo: imagen pesada

Mitigación:

```txt
input max 5 MB
output WebP 900px quality 75
lazy loading
```

## Riesgo: Drive lento

Mitigación:

```txt
cache headers
?v=imagen_archivo_id para cache busting
```

## Riesgo: huérfanos en Drive

Mitigación:

```txt
documentar deuda
limpieza manual post-evento
futuro deleteFile(drive_id)
```

---

# 21. Prompt listo para OpenCode

```txt
Continuemos con Kermingo.

Objetivo: implementar imágenes reales de productos/comidas subidas desde el admin web, procesadas por el backend a formato WebP, almacenadas en Google Drive OAuth en la carpeta de productos, registradas en MySQL y servidas al menú público por la API propia para evitar CORS y links directos de Drive.

No hacer commit todavía.

Carpeta Drive de productos:
GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID=1LWWeuAz4iV4Yq-iM8q1f_HZm-FEAUCmk

Si esa variable no existe, usar fallback a GOOGLE_DRIVE_FOLDER_ID.

Contexto:
La DB ya tiene archivo_drive, archivo_drive.tipo producto_imagen/comprobante y producto.imagen_archivo_id.
Google Drive OAuth ya está implementado en backend/src/api/services/drive.service.js.
El menú frontend todavía usa mock local desde frontend/lib/products.ts.
ProductCard ya soporta product.image, pero todavía no viene desde backend.

Decisión obligatoria:
El frontend NO debe usar links directos de Google Drive.
La imagen pública debe mostrarse usando:
GET /api/productos/:id/imagen?v=:imagen_archivo_id
El backend descarga la imagen desde Google Drive y responde image/webp.

Backend:
1. Instalar sharp.
2. Agregar GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID en environments y .env.example.
3. Crear backend/src/api/services/image.service.js con processProductImage().
4. Extender drive.service.js con uploadFile folderId opcional y downloadFile(driveFileId).
5. Agregar DriveReadError 503.
6. Crear uploadProductoImagen:
   - memoryStorage
   - field imagen
   - máximo 5 MB
   - solo image/jpeg, image/png, image/webp
   - no PDF
7. Crear assertProductImageMagicBytes.
8. Agregar findProductImageByProductId en archivo.model.js.
9. Modificar producto.model.js:
   - LEFT JOIN archivo_drive
   - devolver imagen_archivo_id, imagen_nombre_original, imagen_mime_type, imagen_tamanio_bytes, imagen_url
   - imagen_url = /api/productos/:id/imagen?v=:imagen_archivo_id
   - ajustar GROUP BY
10. Agregar controller:
   - obtenerImagen
   - subirImagen
   - quitarImagen
11. Agregar rutas:
   - GET /api/productos/:id/imagen
   - POST /api/admin/productos/:id/imagen
   - DELETE /api/admin/productos/:id/imagen

Frontend:
1. Crear cliente API si no existe.
2. Crear productos-api mapper backend → Product UI.
3. MenuScreen debe poder consumir productos reales de backend.
4. ProductCard debe mostrar product.image.
5. Si no hay imagen, placeholder sobrio.
6. Si falla imagen, fallback.
7. No usar webViewLink ni Drive directo.

Admin:
Si existe admin productos:
- agregar preview
- input file accept image/webp,image/jpeg,image/png
- subir/reemplazar imagen
- quitar imagen
- estados loading/error

Si no existe:
- dejar backend completo y documentar UI admin como pendiente inmediato.

Tests:
Agregar tests backend:
- GET /api/productos incluye imagen_url cuando producto tiene imagen.
- GET /api/productos/:id/imagen devuelve image/webp.
- producto sin imagen → 404.
- POST admin imagen sin auth → 401.
- POST imagen válida → crea archivo_drive y actualiza producto.
- POST PDF → 400.
- POST mimetype falso → 400.
- DELETE imagen → desasocia.
- Drive read/upload error → 503.

No tocar Drive real por defecto.

Documentación:
Actualizar API.md, CORE.md, INFRA.md, GOTCHAS.md, TESTING.md, WEBAPP.md, .env.example y OpenSpec.

Verificación:
cd backend
npm test

Si se toca frontend:
cd frontend
npm run lint
npm run build

Prueba manual:
1. Subir imagen JPG/PNG desde admin/API.
2. Confirmar que Drive recibe archivo .webp en carpeta 1LWWeuAz4iV4Yq-iM8q1f_HZm-FEAUCmk.
3. Confirmar fila archivo_drive con mime_type=image/webp y tipo=producto_imagen.
4. Confirmar producto.imagen_archivo_id.
5. Abrir GET /api/productos.
6. Confirmar imagen_url.
7. Abrir GET /api/productos/:id/imagen.
8. Confirmar Content-Type image/webp.
9. Confirmar que el menú muestra la imagen.

Resultado esperado:
## Resultado imágenes de productos WebP + Drive

Archivos modificados:
-

Backend:
-

Sharp / conversión WebP:
-

Google Drive:
-

Base de datos:
-

Endpoints:
-

Frontend:
-

Admin:
-

Tests:
-

Documentación:
-

Comandos ejecutados:
-

Prueba manual:
-

Pendientes:
-

Riesgos:
-

¿Listo para avanzar?
-
```

---

# 22. Preguntas pendientes

No bloquean esta planificación, pero conviene responder antes de implementar UI admin:

1. ¿La imagen debe ser obligatoria para publicar un producto o puede quedar con placeholder?
2. ¿El admin de productos ya existe visualmente o hay que crearlo desde cero?
3. ¿Querés que el nombre del archivo en Drive incluya el nombre del producto?
4. ¿Querés conservar historial de imágenes anteriores o solo reemplazar y dejar huérfanos?
5. ¿Primero backend completo y después UI admin, o todo junto?
