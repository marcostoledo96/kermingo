# Design: B6.3 Comprobantes / Google Drive

## Technical Approach

Implementaremos la subida de comprobantes en el endpoint `POST /api/pedidos` habilitando `multipart/form-data`. Se usará `multer` en memoria (`memoryStorage`) para validar MIME type y tamaño antes de procesar el request. El archivo se subirá a Google Drive usando `googleapis` y `GoogleAuth` (Service Account) **antes** de iniciar la transacción en la base de datos. Una vez subido, se inyectará el objeto del archivo en los datos del pedido, y dentro de la misma transacción DB (`createWithTransaction`) se insertará el registro en `archivo_drive` y luego el pedido vinculado. Se creará un endpoint seguro `GET /api/admin/pedidos/:id/comprobante` para que el admin pueda ver los metadatos y la URL pública sin necesidad de hacer proxy de bytes.

## Architecture Decisions

### Decision: Inserción de `archivo_drive` en transacción de pedido

**Choice**: Insertar el registro de `archivo_drive` dentro del mismo `createWithTransaction` de `pedido.model.js`.
**Alternatives considered**: Insertar `archivo_drive` fuera y antes de la transacción de pedido.
**Rationale**: Garantiza consistencia relacional. Si la creación del pedido falla (por ejemplo, por falta de stock), la transacción de base de datos hace rollback, evitando que quede un registro inútil en `archivo_drive`. El archivo subido en Google Drive quedará huérfano, lo cual se asume como riesgo aceptable para el MVP (evitamos lógicas complejas de compensación).

### Decision: Preprocesamiento de campos JSON en multipart

**Choice**: Usar `z.preprocess` en `createPedidoSchema` para hacer `JSON.parse` de `items` (y transformar numéricos) si llegan como strings.
**Alternatives considered**: Parsear `req.body.items` manualmente en un middleware previo, o crear un esquema separado para multipart.
**Rationale**: `multer` convierte todos los campos de texto del form-data a strings. `z.preprocess` es idiomático de Zod y permite que el mismo esquema soporte nativamente tanto `application/json` (donde `items` ya es un arreglo de objetos) como `multipart/form-data` sin ensuciar los controladores o requerir múltiples middlewares de validación.

### Decision: Almacenamiento temporal en servidor

**Choice**: `multer.memoryStorage()`
**Alternatives considered**: `multer.diskStorage()` en `/tmp` seguido de subida a Drive y borrado local.
**Rationale**: Evita lidiar con la gestión de permisos del filesystem, cleanup o archivos atascados en disco si falla el proceso. El límite de 5 MB por archivo es perfectamente manejable en RAM.

## Data Flow

    [Cliente] ── (multipart/form-data) ──→ [Multer Middleware] (Valida 5MB + MIME)
                                                  │
                                            (req.file + req.body)
                                                  ↓
                                          [Pedido Controller]
                                                  │
                                                  ├─→ [Drive Service] ──→ Google Drive (Upload)
                                                  │         └── Retorna { driveFileId, webViewLink }
                                                  ↓
                                          [Pedido Model] (DB Transaction)
                                                  ├─→ INSERT archivo_drive
                                                  └─→ INSERT pedido (comprobante_archivo_id = archivo_id)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/package.json` | Modify | Añadir `multer` y `googleapis`. |
| `backend/src/api/config/environments.js` | Modify | Requerir y exportar `GOOGLE_DRIVE_CREDENTIALS_JSON` y `GOOGLE_DRIVE_FOLDER_ID`. |
| `backend/src/api/middlewares/upload.middleware.js` | Create | Instancia de `multer` con `memoryStorage`, límite de 5MB y `fileFilter` para JPG/PNG/WEBP/PDF. |
| `backend/src/api/services/drive.service.js` | Create | Servicio que inicializa `GoogleAuth` y expone método `uploadFile(buffer, name, mimeType)`. |
| `backend/src/api/models/archivo.model.js` | Create | Métodos `createArchivo(conn, data)` y `findArchivoById(pool, id)`. |
| `backend/src/api/controllers/pedido.controller.js` | Modify | `crear()` valida método de pago vs file, llama a `driveService.uploadFile` y pasa `archivo` al model. Nuevo `obtenerComprobante`. |
| `backend/src/api/models/pedido.model.js` | Modify | En `createWithTransaction`: invocar `createArchivo` e insertar `comprobante_archivo_id`. Modificar SELECTs para incluir `comprobante_archivo_id`. |
| `backend/src/api/routes/pedido.routes.js` | Modify | Intercalar `upload.single('comprobante')` en `POST /`. Montar ruta `GET /:id/comprobante`. |
| `backend/src/api/schemas/pedido.schema.js` | Modify | Añadir `z.preprocess` para parsear `items` si es string. |

## Interfaces / Contracts

**Respuesta GET /api/admin/pedidos/:id/comprobante:**
```json
{
  "exito": true,
  "mensaje": "Comprobante obtenido correctamente",
  "datos": {
    "drive_id": "1A2B3C4D5E...",
    "nombre_original": "transferencia.jpg",
    "mime_type": "image/jpeg",
    "tamanio_bytes": 1048576,
    "url_publica": "https://drive.google.com/file/d/...",
    "created_at": "2026-06-09T10:00:00.000Z"
  }
}
```

**Esquema items preprocess (Zod):**
```typescript
items: z.preprocess((val) => {
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch(e) { return val; }
  }
  return val;
}, z.array(...))
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `drive.service.js` | Usar `jest.mock('googleapis')` para simular éxito y error en la subida, verificando que los parámetros pasados sean correctos. |
| Integration | `POST /api/pedidos` (Validaciones) | Usar Supertest. Probar rechazo de archivos >5MB (mock multer err), tipos no permitidos y falta de archivo en `transferencia`. |
| Integration | `POST /api/pedidos` (Éxito) | Probar envío de form-data válido, mockeando la respuesta de `driveService`. Validar creación de `archivo_drive`, `pedido` con `estado_pago=comprobante_subido` y `comprobante_archivo_id`. |
| Integration | `GET /api/admin/pedidos/:id/comprobante` | Verificar acceso a la metada del archivo devolviendo 200, 404 si no tiene comprobante y 401 si no hay token admin. |

## Migration / Rollout

No requiere migración de datos. La tabla `archivo_drive` y la columna `pedido.comprobante_archivo_id` ya existen en el esquema SQL (B6.1). 
Para el despliegue es estrictamente necesario configurar las variables de entorno `GOOGLE_DRIVE_CREDENTIALS_JSON` y `GOOGLE_DRIVE_FOLDER_ID` en el servicio de hosting (Railway u otro) para que la app no falle al levantar en producción.

## Open Questions

- Ninguna. La orfandad de archivos en caso de falla de base de datos fue avalada explícitamente en el documento de requirements.
