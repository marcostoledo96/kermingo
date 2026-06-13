# 49 — Plan actualizado con ZIP local — `.env` + imágenes de productos WebP + Drive

## Proyecto

```txt
Kermingo
```

## Archivos analizados

```txt
Repo GitHub:
https://github.com/marcostoledo96/kermingo

ZIP local recibido:
kermingo_menu(5).zip
```

## Objetivo

Actualizar el plan de corrección considerando que el ZIP local sí trae:

```txt
kermingo_menu/backend/.env
```

Ese `.env` no está subido a GitHub, lo cual es correcto porque contiene credenciales sensibles.

---

# 1. Veredicto actualizado

## Estado del `.env`

El ZIP local contiene:

```txt
kermingo_menu/backend/.env
```

y ese archivo tiene valores configurados para:

```txt
PORT
NODE_ENV
FRONTEND_URL
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME
GOOGLE_DRIVE_FOLDER_ID
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_REFRESH_TOKEN
```

No se deben copiar ni pegar esos valores en GitHub, documentación pública, prompts, capturas ni Markdown compartido.

## Punto importante

En el `.env` local recibido **no aparece**:

```env
GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID
```

Por lo tanto, aunque el backend ya soporta esa variable, en tu entorno local las imágenes de productos probablemente caerían en el fallback:

```txt
GOOGLE_DRIVE_FOLDER_ID
```

Eso puede servir como fallback técnico, pero no cumple la decisión de separar:

```txt
comprobantes
imágenes de productos
```

---

# 2. Seguridad de secretos

## 2.1 Lo correcto

Que `.env` no esté en GitHub está bien.

Debe mantenerse así:

```txt
[OK] backend/.env no se sube.
[OK] backend/.gitignore ignora .env y .env.*
[OK] root .gitignore también ignora .env y .env.*
```

## 2.2 Riesgo del ZIP

El ZIP que compartiste sí contiene `.env`.

Eso está bien para revisión privada puntual, pero no conviene usar ese ZIP como entregable o archivo de auditoría compartible.

## 2.3 Reglas

```txt
[ ] No subir .env a GitHub.
[ ] No mandar ZIPs con .env a terceros.
[ ] No pegar tokens OAuth en prompts.
[ ] No pegar secretos en documentación.
[ ] No imprimir valores reales de GOOGLE_OAUTH_REFRESH_TOKEN.
[ ] No imprimir valores reales de GOOGLE_OAUTH_CLIENT_SECRET.
```

## 2.4 Recomendación operativa

Para auditorías futuras, usar un script de ZIP limpio que excluya:

```txt
.env
.env.*
node_modules/
.next/
coverage/
dist/
*.zip
credentials/
drive-credentials.json
```

---

# 3. Corrección nueva agregada al plan

## NUEVO — Agregar `GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID` al `.env` local

### Archivo local

```txt
kermingo_menu/backend/.env
```

### Agregar

```env
GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID=1LWWeuAz4iV4Yq-iM8q1f_HZm-FEAUCmk
```

### Ubicación sugerida

Debajo de:

```env
GOOGLE_DRIVE_FOLDER_ID=...
```

Quedaría conceptualmente:

```env
# Google Drive API
GOOGLE_DRIVE_FOLDER_ID=...
GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID=1LWWeuAz4iV4Yq-iM8q1f_HZm-FEAUCmk
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REFRESH_TOKEN=...
```

### Importante

No subir este `.env`.

Solo actualizarlo localmente y en Railway.

---

# 4. Corrección en Railway

Agregar en variables de entorno del backend Railway:

```env
GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID=1LWWeuAz4iV4Yq-iM8q1f_HZm-FEAUCmk
```

## Variables Drive esperadas en Railway

```env
GOOGLE_DRIVE_FOLDER_ID=...
GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID=1LWWeuAz4iV4Yq-iM8q1f_HZm-FEAUCmk
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REFRESH_TOKEN=...
```

## Resultado esperado

```txt
Comprobantes → carpeta general de comprobantes
Imágenes producto → carpeta 1LWWeuAz4iV4Yq-iM8q1f_HZm-FEAUCmk
```

---

# 5. Correcciones que siguen pendientes en código

Estas siguen igual que en el plan 48 actualizado.

---

## CRIT-1 — Corregir fallback de carpeta en `uploadFile()`

### Archivo

```txt
kermingo_menu/backend/src/api/services/drive.service.js
```

### Estado actual

```js
const folderId = options.folderId || environments.googleDrive.productosFolderId || environments.googleDrive.folderId;
```

### Problema

Si `GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID` está configurado, entonces cualquier llamada a `uploadFile()` sin `options.folderId` puede terminar en la carpeta de productos.

Eso afecta a comprobantes, porque el flujo de comprobantes llama `uploadFile()` sin `folderId`.

### Fix obligatorio

Cambiar a:

```js
const folderId = options.folderId || environments.googleDrive.folderId;
```

### Resultado esperado

```txt
uploadFile() sin options.folderId → GOOGLE_DRIVE_FOLDER_ID
uploadFile() con options.folderId → folder explícito
```

---

## IMP-1 — Actualizar `.env.example`

### Archivo

```txt
kermingo_menu/backend/.env.example
```

### Agregar

```env
# Google Drive folder para imágenes de productos.
# Si no se define, se usa GOOGLE_DRIVE_FOLDER_ID como fallback.
GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID=your-product-images-folder-id
```

### No usar secretos reales

En `.env.example` no poner tokens reales.

---

## IMP-2 — Capturar errores de `sharp`

### Archivo

```txt
kermingo_menu/backend/src/api/services/image.service.js
```

### Estado actual

La función procesa con `sharp`, pero no tiene try/catch.

### Fix

Importar:

```js
import { ValidationError } from '../utils/errors.js';
```

y envolver:

```js
export async function processProductImage(inputBuffer) {
  try {
    const processedBuffer = await sharp(inputBuffer)
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
      buffer: processedBuffer,
      mimeType: 'image/webp',
      extension: 'webp',
      size: processedBuffer.length,
    };
  } catch {
    throw new ValidationError(
      'No se pudo procesar la imagen. Verificá que sea JPG, PNG o WEBP válido.'
    );
  }
}
```

---

## IMP-3 — Tests no deben borrar todas las imágenes producto

### Archivo

```txt
kermingo_menu/backend/tests/producto-imagen.test.js
```

### Estado actual

```js
await pool.query("DELETE FROM archivo_drive WHERE tipo = 'producto_imagen'");
```

### Fix

Agregar:

```js
const TEST_RUN_ID = `test-product-image-${Date.now()}`;
```

Usar `drive_id` con prefijo:

```js
`${TEST_RUN_ID}-mock-drive-id-123`
```

Cleanup:

```js
await pool.query(
  "DELETE FROM archivo_drive WHERE tipo = 'producto_imagen' AND drive_id LIKE ?",
  [`${TEST_RUN_ID}%`]
);
```

---

## IMP-4 — Usar `findByIdAdmin` en endpoints admin

### Archivo

```txt
kermingo_menu/backend/src/api/controllers/producto.controller.js
```

### Cambiar en `crear()`

```js
const producto = await findByIdPublic(pool, insertId);
```

por:

```js
const producto = await findByIdAdmin(pool, insertId);
```

### Cambiar en `actualizar()`

```js
const producto = await findByIdPublic(pool, req.params.id);
```

por:

```js
const producto = await findByIdAdmin(pool, req.params.id);
```

---

## MEJ-1 — Ordenar rutas

### Archivo

```txt
kermingo_menu/backend/src/api/routes/producto.routes.js
```

### Cambiar

```js
publicRouter.get('/', validateQuery(productoQuerySchema), listar);
publicRouter.get('/:id', validateParams(idParamSchema), obtener);
publicRouter.get('/:id/imagen', validateParams(idParamSchema), obtenerImagen);
```

por:

```js
publicRouter.get('/', validateQuery(productoQuerySchema), listar);
publicRouter.get('/:id/imagen', validateParams(idParamSchema), obtenerImagen);
publicRouter.get('/:id', validateParams(idParamSchema), obtener);
```

---

## MEJ-2 — Quitar `handleMulterError` de la cadena normal

### Archivo

```txt
kermingo_menu/backend/src/api/routes/producto.routes.js
```

### Estado actual

```js
uploadProductoImagen.single('imagen'),
assertProductImageMagicBytes,
handleMulterError,
subirImagen
```

### Fix recomendado

Dejar:

```js
uploadProductoImagen.single('imagen'),
assertProductImageMagicBytes,
subirImagen
```

Porque `handleMulterError` ya debe estar montado globalmente en `app.js` antes de `errorMiddleware`.

---

# 6. Test nuevo recomendado: carpetas Drive

Agregar un test para evitar que vuelva el bug.

## Objetivo

Probar:

```txt
uploadFile() sin folderId usa GOOGLE_DRIVE_FOLDER_ID
uploadFile() con folderId usa el folder explícito
```

## Archivo posible

```txt
kermingo_menu/backend/tests/drive.service.test.js
```

o dentro de:

```txt
kermingo_menu/backend/tests/producto-imagen.test.js
```

## Caso 1

```js
it('uploadFile without folderId uses default Drive folder', async () => {
  const mockDriveClient = {
    files: {
      create: jest.fn().mockResolvedValue({
        data: { id: 'test-file-id', webViewLink: null },
      }),
    },
  };

  _resetDriveForTest({ driveClient: mockDriveClient, isConfigured: true });

  await uploadFile(Buffer.from('test'), 'comprobante.png', 'image/png');

  expect(mockDriveClient.files.create).toHaveBeenCalledWith(
    expect.objectContaining({
      requestBody: expect.objectContaining({
        parents: [environments.googleDrive.folderId],
      }),
    })
  );
});
```

## Caso 2

```js
it('uploadFile with explicit folderId uses provided folder', async () => {
  const customFolderId = 'productos-folder-test';

  const mockDriveClient = {
    files: {
      create: jest.fn().mockResolvedValue({
        data: { id: 'test-file-id', webViewLink: null },
      }),
    },
  };

  _resetDriveForTest({ driveClient: mockDriveClient, isConfigured: true });

  await uploadFile(Buffer.from('test'), 'producto.webp', 'image/webp', {
    folderId: customFolderId,
  });

  expect(mockDriveClient.files.create).toHaveBeenCalledWith(
    expect.objectContaining({
      requestBody: expect.objectContaining({
        parents: [customFolderId],
      }),
    })
  );
});
```

---

# 7. Orden recomendado

```txt
1. Agregar GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID al .env local.
2. Agregar GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID en Railway.
3. Corregir drive.service.js: uploadFile() fallback.
4. Agregar test de carpeta Drive.
5. Actualizar .env.example.
6. Capturar errores de sharp.
7. Hacer cleanup seguro de producto-imagen.test.js.
8. Cambiar findByIdPublic → findByIdAdmin en crear/actualizar.
9. Ordenar rutas públicas.
10. Quitar handleMulterError de la ruta si está global.
11. Ejecutar tests.
12. Probar Drive real.
```

---

# 8. Tests a ejecutar

Desde:

```bash
cd kermingo_menu/backend
```

Ejecutar:

```bash
npm test
```

Específicos:

```bash
npm test -- --testPathPattern=producto-imagen
```

Si agregás test de Drive:

```bash
npm test -- --testPathPattern=drive
```

---

# 9. Prueba manual obligatoria

## 9.1 Comprobante

Crear pedido online con transferencia y comprobante.

Esperado:

```txt
El archivo se sube a GOOGLE_DRIVE_FOLDER_ID.
No se sube a GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID.
```

## 9.2 Imagen de producto

Subir imagen de producto desde admin/API.

Esperado:

```txt
El archivo .webp se sube a:
1LWWeuAz4iV4Yq-iM8q1f_HZm-FEAUCmk
```

## 9.3 DB

```sql
SELECT id, drive_id, nombre_original, mime_type, tamanio_bytes, tipo
FROM archivo_drive
ORDER BY id DESC
LIMIT 10;
```

Esperado para producto:

```txt
tipo = producto_imagen
mime_type = image/webp
```

Esperado para comprobante:

```txt
tipo = comprobante
mime_type = image/png | image/jpeg | image/webp | application/pdf
```

## 9.4 API imagen

```bash
curl -i http://localhost:3001/api/productos/1/imagen
```

Esperado:

```txt
HTTP/1.1 200
Content-Type: image/webp
Cache-Control: public, max-age=86400, stale-while-revalidate=604800
```

---

# 10. Criterios de aceptación

```txt
[ ] .env local tiene GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID.
[ ] Railway tiene GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID.
[ ] .env no se sube a GitHub.
[ ] .env.example documenta GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID.
[ ] uploadFile() sin options.folderId usa GOOGLE_DRIVE_FOLDER_ID.
[ ] uploadFile() con options.folderId usa folder explícito.
[ ] Comprobantes no van a carpeta de productos.
[ ] Productos van a carpeta 1LWWeuAz4iV4Yq-iM8q1f_HZm-FEAUCmk.
[ ] sharp devuelve 400 si no puede procesar.
[ ] Tests no borran todas las imágenes producto.
[ ] crear()/actualizar() admin usan findByIdAdmin.
[ ] /:id/imagen está antes de /:id.
[ ] npm test pasa.
[ ] Prueba manual Drive real OK.
```

---

# 11. Prompt actualizado para OpenCode

```txt
Continuemos con Kermingo.

Objetivo: corregir el hardening de imágenes de productos WebP + Google Drive teniendo en cuenta que ahora el ZIP local sí trae backend/.env, pero ese .env no debe subirse a GitHub.

No hacer commit todavía.

## Contexto

La implementación existe bajo:

kermingo_menu/

El ZIP local contiene:

kermingo_menu/backend/.env

Ese archivo tiene credenciales reales y NO debe subirse a GitHub ni imprimirse en documentación.

El .env local actual tiene Drive OAuth configurado, pero le falta:

GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID

Agregar localmente:

GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID=1LWWeuAz4iV4Yq-iM8q1f_HZm-FEAUCmk

También agregar esa variable en Railway backend.

## Correcciones obligatorias de código

### 1. Bug crítico de carpeta Drive

Archivo:
kermingo_menu/backend/src/api/services/drive.service.js

Cambiar:

const folderId = options.folderId || environments.googleDrive.productosFolderId || environments.googleDrive.folderId;

Por:

const folderId = options.folderId || environments.googleDrive.folderId;

Motivo:
Los comprobantes llaman uploadFile() sin options.folderId y deben ir a GOOGLE_DRIVE_FOLDER_ID, no a productosFolderId.

### 2. Test de carpeta Drive

Agregar test que confirme:
- uploadFile() sin options.folderId usa environments.googleDrive.folderId.
- uploadFile() con options.folderId usa el folder explícito.

### 3. Documentar variable

Archivo:
kermingo_menu/backend/.env.example

Agregar:

# Google Drive folder para imágenes de productos.
# Si no se define, se usa GOOGLE_DRIVE_FOLDER_ID como fallback.
GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID=your-product-images-folder-id

### 4. Capturar errores de sharp

Archivo:
kermingo_menu/backend/src/api/services/image.service.js

Importar ValidationError y envolver processProductImage() con try/catch.
Si sharp falla, lanzar:

new ValidationError('No se pudo procesar la imagen. Verificá que sea JPG, PNG o WEBP válido.')

### 5. Tests seguros

Archivo:
kermingo_menu/backend/tests/producto-imagen.test.js

No borrar todas las filas:

DELETE FROM archivo_drive WHERE tipo = 'producto_imagen'

Cambiar a limpieza por TEST_RUN_ID.

Ejemplo:
const TEST_RUN_ID = `test-product-image-${Date.now()}`;

Todos los drive_id mock deben empezar con TEST_RUN_ID.

Cleanup:
DELETE FROM archivo_drive
WHERE tipo = 'producto_imagen'
AND drive_id LIKE `${TEST_RUN_ID}%`

### 6. Respuestas admin

Archivo:
kermingo_menu/backend/src/api/controllers/producto.controller.js

En crear() y actualizar(), usar findByIdAdmin en vez de findByIdPublic.

### 7. Orden rutas

Archivo:
kermingo_menu/backend/src/api/routes/producto.routes.js

Ordenar:
GET /
GET /:id/imagen
GET /:id

### 8. Multer handler

En la ruta POST /:id/imagen, quitar handleMulterError de la cadena normal si ya está global en app.js.

## Tests

Ejecutar:

cd kermingo_menu/backend
npm test

Y específicos:

npm test -- --testPathPattern=producto-imagen

Si agregás test de drive service:

npm test -- --testPathPattern=drive

## Prueba manual

1. Subir comprobante de transferencia.
2. Confirmar que fue a GOOGLE_DRIVE_FOLDER_ID.
3. Subir imagen de producto.
4. Confirmar que fue a GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID.
5. Confirmar archivo .webp.
6. Confirmar GET /api/productos devuelve imagen_url.
7. Confirmar GET /api/productos/:id/imagen responde image/webp.

## Resultado esperado

Responder con:

## Resultado hardening env + imágenes producto

Archivos modificados:
-

Variables locales/Railway:
-

Correcciones aplicadas:
-

Bug carpeta Drive:
-

Sharp/error handling:
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

¿Listo para deploy?
-
```

---

# 12. Veredicto final esperado

Después de aplicar este plan:

```txt
Backend imágenes productos: OK
.env local correcto: OK
GitHub sin secretos: OK
Drive comprobantes/productos separado: OK
CORS por proxy backend: OK
Listo para integrar UI/admin o deploy backend: sí
```
