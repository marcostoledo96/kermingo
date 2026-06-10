# Proposal: backend-b6.3 — Comprobantes / Google Drive

## Intent

Habilitar la subida de comprobantes de pago por transferencia al crear pedidos online (multipart en POST /api/pedidos), guardarlos en Google Drive y exponerlos a admins de forma segura. Hoy `crear()` rechaza `metodo_pago === 'transferencia'` y no existe servicio de Drive ni middleware de upload.

## Scope

### In Scope
- Permitir `transferencia` en `POST /api/pedidos` aceptando un archivo adjunto via multipart.
- Subir comprobante a Google Drive y registrar fila en `archivo_drive` con `tipo = 'comprobante'`.
- Enlazar `pedido.comprobante_archivo_id` y setear `estado_pago = 'comprobante_subido'`.
- Endpoint seguro para admin: `GET /api/admin/pedidos/:id/comprobante` (retorna metadatos de acceso, no proxy de bytes).
- Transiciones de pago `comprobante_subido → pagado|rechazado` via el PATCH de estado de pago existente (`/api/admin/pedidos/:id/pago`).
- Validar archivos: jpg, png, webp, pdf; máximo 5 MB.
- Instalar `multer` (memoryStorage) y `googleapis`.
- Tests para upload + estado + Drive service + endpoint de acceso.
- Actualizar docs relevantes (API, CORE, INFRA, GOTCHAS, SECRETS, TESTING).

### Out of Scope
- UI frontend (`frontend/`, `diseno-de-landing-kermingo/`): no se toca.
- Subida de imágenes de producto (es parte del backlog, no de B6.3).
- Flujo de upload público separado; el comprobante viaja junto con la creación del pedido.
- Streaming o proxy de bytes desde Drive; solo se devuelven datos seguros de acceso (URL pública si existe, o metadatos de archivo).

## Capabilities

### New Capabilities
- `payment-proofs`: subida de comprobantes vinculada a pedidos, registro en Drive, acceso admin.
- `drive-upload`: servicio de integración con Google Drive (subida, metadatos).

### Modified Capabilities
- `etapa-5-pedidos`: el endpoint público de creación de pedidos debe aceptar multipart cuando el método de pago es transferencia.

## Approach

1. **Instalar dependencias**: `multer`, `googleapis` en `backend/package.json`.
2. **Configuración Drive**: añadir variables de entorno (`GOOGLE_DRIVE_CREDENTIALS_JSON`, `GOOGLE_DRIVE_FOLDER_ID`) en `environments.js` con validación en producción.
3. **Middleware de upload**: `upload.middleware.js` usando `multer.memoryStorage()`, con límites de tamaño (5 MB) y filtro de MIME types (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`).
4. **Servicio Drive**: `drive.service.js` con autenticación via Service Account (`google.auth.GoogleAuth`), método `uploadFile(buffer, originalName, mimeType)` que sube a la carpeta configurada y retorna `{ driveFileId, webViewLink }`.
5. **Modelo archivo_drive**: `archivo.model.js` con métodos `createArchivo(record)` y `findById(id)`.
6. **Adaptar `pedido.controller.crear`**:
   - Si `metodo_pago === 'transferencia'` y no hay archivo adjunto → error de validación.
   - Si hay archivo adjunto → subir a Drive, crear registro en `archivo_drive`, y pasar `comprobante_archivo_id` al modelo dentro de la transacción existente.
   - Cambiar `estado_pago` inicial a `comprobante_subido` (en lugar de `pendiente` para transferencias con archivo).
7. **Nuevo endpoint admin**: `GET /api/admin/pedidos/:id/comprobante` en `pedido.routes.js` (o nuevo `comprobante.routes.js` montado bajo `/api/admin`). Llama a servicio que busca el pedido, verifica que tenga `comprobante_archivo_id`, consulta `archivo_drive` y retorna `{ url, nombre_original, mime_type, tamanio }` o 404 si no existe.
8. **Transiciones de pago**: reutilizar `PATCH /api/admin/pedidos/:id/pago` existente. El state machine `transitionsByMethod` ya soporta `comprobante_subido → pagado|rechazado`. No requiere cambio de lógica de estado, pero se debe asegurar que el controller aplique el estado correcto cuando un admin aprueba/rechaza.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/package.json` | Modified | Añade `multer` y `googleapis` |
| `backend/src/api/config/environments.js` | Modified | Nuevas vars de entorno para Google Drive |
| `backend/src/api/middlewares/upload.middleware.js` | New | Configuración de Multer con límites y filtro de MIME |
| `backend/src/api/services/drive.service.js` | New | Upload a Google Drive via Service Account |
| `backend/src/api/models/archivo.model.js` | New | CRUD de `archivo_drive` |
| `backend/src/api/controllers/pedido.controller.js` | Modified | `crear` acepta multipart para transferencia; gestiona upload + registro de archivo |
| `backend/src/api/routes/pedido.routes.js` | Modified | Montar `upload.single('comprobante')` en POST /api/pedidos; nueva ruta GET /api/admin/pedidos/:id/comprobante |
| `backend/src/api/schemas/pedido.schema.js` | Modified | Ajustar validación de `crear` para permitir transferencia cuando hay archivo |
| `backend/tests/pedido.comprobante.test.js` | New | Tests de subida, registro, transición de pago, endpoint de acceso |
| `backend/tests/drive.service.test.js` | New | Tests unitarios del servicio Drive (con mocks) |
| `DOCUMENTACION/IA/API.md` | Modified | Documentar endpoints multipart y comprobante |
| `DOCUMENTACION/IA/CORE.md` | Modified | Reglas de negocio de upload, estados, validaciones |
| `DOCUMENTACION/IA/INFRA.md` | Modified | Dependencias nuevas, vars de entorno Drive |
| `DOCUMENTACION/IA/GOTCHAS.md` | Modified | Limitaciones de Drive, tamaño de archivos, tipos soportados |
| `DOCUMENTACION/IA/SECRETS.md` | Modified | Dónde colocar credenciales de Service Account |
| `DOCUMENTACION/IA/TESTING.md` | Modified | Estrategia de test para upload multipart y mocks de Drive |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|-------------|
| Google Drive credentials no configurados al desplegar | High | Validar variables en `environments.js`; si faltan, lanzar error claro en startup en producción. Documentar en SECRETS.md y GOTCHAS.md. |
| Archivos maliciosos o MIME spoofing | Med | Rechazar extensiones/MIME no permitidas (jpg/png/webp/pdf). Usar `multer` solo con `memoryStorage` (no write a disco). Limitar a 5 MB. |
| Estado de pago inconsistente si upload de Drive falla a mitad de transacción | Med | Realizar upload ANTES de iniciar la transacción de DB, o subir dentro de la transacción con rollback controlado si el upload falla. Preferible: upload antes, luego transacción DB. Si DB falla, archivo queda huérfano en Drive (aceptable para MVP). |
| Oversized PR (B6.3 ya tiene dependencias nuevas + lógica de estado + tests) | Low | Scope acotado: solo comprobantes de pedidos, NO imágenes de producto. No se toca frontend. |
| `schema.sql` tiene `archivo_drive.drive_id` (VARCHAR 150) y no `drive_file_id` | Low | Verificar si los nombres de campo coinciden. El schema actual usa `drive_id` que es equivalente a `drive_file_id`. Documentar delta si se requiere renombrar. |

## Rollback Plan

- Revertir el commit de B6.3; desinstalar `multer` y `googleapis` del `package.json` si no son usados por otro módulo (B6.4 usa exceljs, independiente).
- Restaurar `pedido.controller.js` previo que rechaza `transferencia`.
- Eliminar archivos nuevos (`upload.middleware.js`, `drive.service.js`, `archivo.model.js`, tests específicos) y las líneas añadidas en `environments.js` y rutas.
- Los archivos ya subidos a Google Drive quedan; no hay rollback de Drive.

## Dependencies

- `multer` y `googleapis` deben estar instalados.
- Credenciales de Service Account de Google Drive y `GOOGLE_DRIVE_FOLDER_ID` deben estar disponibles en `.env` (local) o secrets (producción).
- B6.1 y B6.2 deben estar mergeados previamente para evitar conflictos en `pedido.controller.js` y `pedido.routes.js`.

## Success Criteria

- [ ] `POST /api/pedidos` con `metodo_pago=transferencia` y `comprobante` adjunto crea pedido con `estado_pago=comprobante_subido` y `comprobante_archivo_id` poblado.
- [ ] `POST /api/pedidos` con `metodo_pago=transferencia` y sin archivo retorna error 400 con mensaje claro.
- [ ] El archivo subido aparece en Google Drive en la carpeta configurada.
- [ ] El registro en `archivo_drive` tiene los campos requeridos: `id`, `pedido_id` (via FK en `pedido`), `drive_id`, `nombre_original`, `mime_type`, `tamanio_bytes`, `created_at`.
- [ ] `GET /api/admin/pedidos/:id/comprobante` autenticado como admin retorna datos seguros de acceso al archivo.
- [ ] `PATCH /api/admin/pedidos/:id/pago` permite transicionar `comprobante_subido → pagado` y `comprobante_subido → rechazado`.
- [ ] Tests pasan (`npm test`) con cobertura de upload exitoso, rechazo por tipo/tamaño, acceso admin y transiciones de pago.
- [ ] Documentación actualizada (API, CORE, INFRA, GOTCHAS, SECRETS, TESTING).
