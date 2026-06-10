# Infraestructura — Base de Datos y Conexiones

> Leé este archivo cuando trabajes en tablas, migraciones, índices, pool de conexiones,
> Google Drive API o seed.

---

## Índice

1. [Pool de conexiones](#1-pool-de-conexiones)
2. [Tablas](#2-tablas)
3. [Seed](#3-seed)
4. [Índices](#4-índices)
5. [Configuración singleton](#5-configuración-singleton)
6. [Google Drive API](#6-google-drive-api)

---

## 1. Pool de conexiones

**Archivo:** `backend/src/api/database/db.js`

Configuración centralizada en `backend/src/api/config/environments.js`:

| Variable | Default | Producción |
|---|---|---|
| `DB_HOST` | `''` | Requerida |
| `DB_PORT` | `3306` | Requerida |
| `DB_USER` | `''` | Requerida |
| `DB_PASSWORD` | `''` | Requerida |
| `DB_NAME` | `''` | Requerida |

El pool se crea con `mysql2/promise` usando `createPool()` con `waitForConnections: true`. Los controllers obtienen el pool vía `getPool()`. Las transacciones usan `pool.getConnection()`.

En producción, si faltan variables de entorno críticas, el proceso lanza error y no arranca.

---

## 2. Tablas

**Archivo DDL:** `backend/src/api/database/schema.sql`

9 tablas:

| # | Tabla | PK | Propósito |
|---|---|---|---|
| 1 | `usuario` | `id` | Usuarios admin (login, hash de contraseña) |
| 2 | `archivo_drive` | `id` | Archivos subidos a Google Drive (imágenes de producto, comprobantes) |
| 3 | `categoria` | `id` | Categorías de productos (Merienda, Cena) |
| 4 | `producto` | `id` | Productos (comida, bebida, promo). FK a `archivo_drive` para imagen |
| 5 | `producto_categoria` | `(producto_id, categoria_id)` | Relación N:N entre producto y categoría |
| 6 | `combo_producto` | `(combo_id, producto_id)` | Componentes de promos con cantidad |
| 7 | `pedido` | `id` | Pedidos con número KMG, token, estado, pago, total |
| 8 | `pedido_detalle` | `id` | Items de cada pedido (snapshot de nombre y precio) |
| 9 | `configuracion_tienda` | `id` (siempre 1) | Singleton: estado de la tienda, mensaje, hora de cena |

### Detalle de campos clave

**`producto`:**
- `tipo` ENUM: `'comida'`, `'bebida'`, `'promo'`
- `stock_limitado`: `1` = tiene stock contable, `0` = ilimitado
- `stock_actual`: `NULL` si `stock_limitado = 0`
- `disponible_desde`: TIME para horarios de cena

**`pedido`:**
- `numero`: formato `KMG-XXXX`, UNIQUE
- `token_seguimiento`: hex aleatorio de 32 bytes, UNIQUE
- `origen` ENUM: `'online'`, `'caja'`
- `estado_pedido` ENUM: `'recibido'`, `'en_preparacion'`, `'listo'`, `'entregado'`, `'cancelado'`
- `estado_pago` ENUM: `'pendiente'`, `'comprobante_subido'`, `'pagado'`, `'rechazado'`
- `metodo_pago` ENUM: `'transferencia'`, `'efectivo'`
- CHECK: si `metodo_pago = 'efectivo'`, `comprobante_archivo_id` debe ser `NULL`

**`combo_producto`:**
- `combo_id` → FK a `producto` (la promo)
- `producto_id` → FK a `producto` (el componente)
- `cantidad`: cuántas unidades del componente tiene la promo

---

## 3. Seed

**Archivo:** `backend/src/api/database/seed.sql`

Datos iniciales:

| Entidad | Cantidad | Detalle |
|---|---|---|
| Categorías | 2 | Merienda, Cena |
| Configuración | 1 | `id=1`, `estado='cerrada'` |
| Productos | 24 | 13 comidas, 8 bebidas, 2 promos (sin stock propio) |
| Producto-Categoría | ~30 | Mapeo N:N |
| Combo-Producto | 5 | 2 promos con 2-3 componentes cada una |
| Usuario admin | 1 | `admin@kermingo.com` / `admin123` (hash bcrypt) |

**Nota:** El seed usa `INSERT IGNORE` para ser idempotente. La contraseña `admin123` es temporal y debe cambiarse en producción.

---

## 4. Índices

**Archivo:** `backend/src/api/database/indexes.sql`

Ejecutar **después** de `schema.sql`, una sola vez.

| Índice | Tabla | Columna(s) | Propósito |
|---|---|---|---|
| `idx_producto_activo` | `producto` | `activo` | Filtrar productos activos |
| `idx_pedido_numero` | `pedido` | `numero` | Búsqueda por número KMG |
| `idx_pedido_token` | `pedido` | `token_seguimiento` | Búsqueda por token |
| `idx_pedido_estado_pedido` | `pedido` | `estado_pedido` | Filtro de cocina y admin |
| `idx_pedido_estado_pago` | `pedido` | `estado_pago` | Filtro de pagos pendientes |
| `idx_pedido_metodo_pago` | `pedido` | `metodo_pago` | Filtro por método |
| `idx_pedido_created_at` | `pedido` | `created_at` | Ordenamiento por fecha |
| `idx_producto_categoria_categoria` | `producto_categoria` | `(categoria_id, producto_id)` | Join inverso |
| `idx_pedido_detalle_pedido` | `pedido_detalle` | `pedido_id` | Detalles de un pedido |

---

## 5. Configuración singleton

La tabla `configuracion_tienda` siempre tiene `id = 1`. No se crean más registros.

Para leer la config:
- Público: `SELECT estado, mensaje_publico FROM configuracion_tienda WHERE id = 1`
- Admin: `SELECT estado,mensaje_publico, cena_habilitada_desde FROM configuracion_tienda WHERE id = 1`

Para actualizar: `UPDATE configuracion_tienda SET ... WHERE id = 1`

---

## 6. Google Drive API

**Tabla:** `archivo_drive`

**Estado:** Implementado (B6.3). La integración con Google Drive API está activa para comprobantes de pago.

**Campos:**

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | INT PK | Auto-increment |
| `drive_id` | VARCHAR(150) UNIQUE | Google Drive file ID |
| `nombre_original` | VARCHAR(255) | Nombre original del archivo |
| `mime_type` | VARCHAR(100) | Tipo MIME (image/jpeg, image/png, image/webp, application/pdf) |
| `tamanio_bytes` | INT | Tamaño del archivo en bytes |
| `tipo` | ENUM | `'producto_imagen'` o `'comprobante'` |
| `url_publica` | TEXT NULL | URL pública de Drive (si existe) |
| `created_at` | TIMESTAMP | Fecha de creación |

**Servicio:** `backend/src/api/services/drive.service.js` — usa `google.auth.OAuth2` con refresh token (no Service Account).

**Upload middleware:** `backend/src/api/middlewares/upload.middleware.js` — `multer` con `memoryStorage`, límite 5 MB, fileFilter para MIME types permitidos. Incluye `assertMagicBytes` middleware que valida magic bytes del buffer real post-Multer.

**Validación de contenido (B6.3.1):** `backend/src/api/utils/file-signature.utils.js` — `assertAllowedFileSignature(buffer, mimeType)` verifica magic bytes contra el buffer real. Soporta PDF (`%PDF`), PNG (`89 50 4E 47`), JPEG (`FF D8 FF`), WEBP (`RIFF....WEBP`). Rechaza con 400 si el contenido no coincide con el MIME declarado.

**Nombre interno seguro (B6.3.1):** Los archivos subidos a Drive usan nombre interno `${timestamp}-${uuid}-${sanitizedOriginalName}` donde `sanitizedOriginalName` elimina caracteres no alfanuméricos (excepto `.` y `-`), limita a 100 chars, y remueve separadores de path. El campo `nombre_original` en `archivo_drive` preserva el nombre original del usuario.

**Manejo de errores (B6.3.1):** `DriveUploadError` (extiende `AppError`, status 503) reemplaza el string matching previo. Cualquier fallo de Drive API (credenciales, red, cuota, timeout) lanza `DriveUploadError` → mapeo a 503 en error middleware.

**Test hooks (B6.3.1):** `_getDriveStateForTest()` y `_resetDriveForTest()` exportados solo cuando `NODE_ENV !== 'production'` para safe state save/restore entre suites.

**Configuración:**

| Variable | Descripción | Producción |
|---|---|---|
| `GOOGLE_DRIVE_FOLDER_ID` | ID de la carpeta Drive destino | Requerida |
| `GOOGLE_OAUTH_CLIENT_ID` | Client ID de OAuth para Drive | Requerida |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Client Secret de OAuth para Drive | Requerida |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | Refresh token de OAuth para Drive | Requerida |
| ~~`GOOGLE_DRIVE_CREDENTIALS_JSON`~~ | **Deprecada** — era Service Account JSON, ya no se lee | No usar |

En desarrollo, si faltan las credenciales OAuth, el servidor arranca con un warning y la subida de comprobantes devuelve 503.