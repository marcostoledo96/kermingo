# Proposal: B6.3.1 — Hardening comprobantes, Drive, tests y ZIP limpio pre-B7

## Intent

Cerrar los bloqueantes de auditoría B6.3 antes de avanzar a B7/frontend:
1. ZIPs de auditoría limpios (sin .env, node_modules, artefactos).
2. Suite de tests reproducible: 0 fallos, corriendo con `--runInBand`.
3. Errores de Google Drive tipados y uniformemente mapeados a 503.
4. Tests sin Drive real por defecto (opt-in con `RUN_REAL_DRIVE_TESTS`).
5. Validación de magic bytes sobre el buffer real, no solo MIME cliente.
6. Nombre seguro interno en Drive (`nombre_original` permanece en DB).
7. Preflight barato (tienda abierta) antes de upload para evitar huérfanos obvios.
8. Reducción de logs de request sensibles en producción.
9. Documentar estrategia admin para ver comprobantes en B7 (metadata/link/proxy).

## Scope

### In Scope
- `scripts/crear_zip_auditoria.sh`: verificar exclusiones de secretos y artefactos.
- `backend/package.json`: forzar `--runInBand` en test script, split test:unit/test:integration.
- `backend/tests/*`: aislamiento de suites, `RUN_REAL_DRIVE_TESTS`, reset seguro de Drive.
- `backend/src/api/services/drive.service.js`: `DriveUploadError` tipado, safe internal name, `initDrive` idempotente.
- `backend/src/api/utils/file-signature.utils.js` (nuevo): validación magic bytes.
- `backend/src/api/middlewares/upload.middleware.js`: agregar validación de firma real.
- `backend/src/api/controllers/pedido.controller.js`: mapear `DriveUploadError.name` a 503, preflight tienda abierta.
- `backend/src/app.js`: request logging condicional por entorno, redacción de token.
- `backend/src/api/models/pedido.model.js`: `assertStoreOpen()` helper barato.
- Documentación: `DOCUMENTACION/IA/TESTING.md`, `GOTCHAS.md`, `API.md`.

### Out of Scope
- Frontend (B7).
- `diseno-de-landing-kermingo/`.
- Cambios funcionales en caja, stock, combos, roles o autenticación.
- Implementación del endpoint proxy admin para comprobante (se documenta para B7, no se construye).
- Rate limiter dedicado para upload (post-MVP).
- Limpieza automática de archivos huérfanos en Drive (post-MVP).
- Timeout explícito de Drive API (post-MVP).
- DB de test separada o containerizado.

## Capabilities

### New Capabilities
- `file-signature-validation`: `file-signature.utils.js` valida magic bytes contra buffer real.
- `drive-safe-upload`: `DriveUploadError` + nombre seguro + reset testable.

### Modified Capabilities
- `drive-upload` (spec): requiere `DriveUploadError` que siempre mapea a 503; requiere nombre seguro en Drive.
- `payment-proofs` (spec): requiere magic bytes antes de accept; preflight de tienda antes de upload.
- `error-handling` (spec): `DriveUploadError` debe heredar de `AppError` (o ser reconocible por `name`) en el middleware.
- `store-configuration` (spec): `assertStoreOpen()` disponible para preflight del controller.

## Approach

1. **Determiniza tests**: `--runInBand` en `npm test`; evitar cierre reentrante del pool; documentar setup MySQL.
2. **Aísla Drive**: `RUN_REAL_DRIVE_TESTS=false` por defecto; `_resetDriveForTest()` para restaurar estado limpio.
3. **Tipifica errores**: `DriveUploadError extends AppError` (name fijo). `catch(err)` devuelve `err.name === 'DriveUploadError'` → `503`.
4. **Valida contenido real**: magic bytes contra `file.buffer` (PDF/PNG/JPEG/WEBP); falta → `400`.
5. **Nombre interno seguro**: `${timestamp}-${uuid}-${sanitize(originalName)}` en Drive; `nombre_original` en DB sin cambio.
6. **Preflight tienda**: antes de `driveUploadFile`, llamar `assertStoreOpen(pool)` con `SELECT estado FROM configuracion_tienda WHERE id = 1` (sin lock).
7. **Audit ZIP hygiene**: confirmar `crear_zip_auditoria.sh` excluye `.env`, `node_modules`, `.next`, `coverage`, `dist`, `credentials`, `drive-credentials.json`.
8. **Redact logs**: en `app.js`, request log solo si no producción; usar `req.path` en vez de `req.url`; evitar escribir tokens completos.
9. **Documentación**: describir en `DOCUMENTACION/IA/API.md` y `TESTING.md` la decisión visualización (recomendación: proxy admin autenticado en B7; por ahora solo metadata/link Drive).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `scripts/crear_zip_auditoria.sh` | Modified | Verificar exclusiones de secretos y artefactos pesados. |
| `backend/package.json` | Modified | `--runInBand`; scripts `test:unit` y `test:integration`. |
| `backend/src/app.js` | Modified | Log de requests condicional por entorno. |
| `backend/src/api/services/drive.service.js` | Modified | `DriveUploadError`, nombre seguro, `_resetDriveForTest()`, `initDrive()` idempotente. |
| `backend/src/api/controllers/pedido.controller.js` | Modified | Preflight tienda abierta; mapeo `DriveUploadError` a 503. |
| `backend/src/api/middlewares/upload.middleware.js` | Modified | Agregar validación magic bytes post-Multer. |
| `backend/src/api/utils/file-signature.utils.js` | New | AssertAllowedFileSignature con magic bytes. |
| `backend/src/api/models/pedido.model.js` | Modified | `assertStoreOpen(pool)` helper. |
| `backend/tests/comprobantes.test.js` | Modified | `RUN_REAL_DRIVE_TESTS`, reset seguro. |
| `backend/tests/comprobantes.drive-mock.test.js` | Modified | `_resetDriveForTest()`, sin contaminación. |
| `backend/tests/caja.test.js` | Modified | Aislamiento de stock/pool si aplica. |
| `DOCUMENTACION/IA/TESTING.md` | Modified | Estado real esperado, setup MySQL, flags Drive. |
| `DOCUMENTACION/IA/API.md` | Modified | Decisión visualización admin comprobantes. |
| `DOCUMENTACION/IA/GOTCHAS.md` | Modified | Huérfanos Drive, magic bytes, test flags. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Al fixear pool.end() concurrente, queda suite que no cierra bien y deja handles abiertos | Medio | Cambio a `--runInBand` + teardown central (afterAll). Monitorear Jest open handles. |
| `DriveUploadError` rompe test existente que espera string exacto de mensaje | Bajo | Review de tests Drive: buscar `toThrow('Failed to upload')` y migrar a `toThrow(DriveUploadError)` o `expect(err.name)`. |
| Magic bytes validación rompe flujo multipart en staging si se reordena mal (antes de Multer) | Bajo | Colocar validación después de `uploadComprobante.single()`, antes del controller `crear`. |
| Preflight tienda abierta agrega latencia sin cache | Bajo | Es un solo SELECT sin lock; latencia es despreciable vs upload a Drive. |
| ZIP de auditoría sigue incluyendo secretos si se genera manual fuera del script | Medio | Documentar obligatoriedad del script; agregar verificación post-generation en el mismo script. |

## Rollback Plan

Cada fix aislado es reversible:
1. Tests: revertir `--runInBand` y split de scripts en `package.json`.
2. Drive: reemplazar `throw new DriveUploadError(...)` por `throw new Error(...)` y restaurar mapeo string-based en controller.
3. Magic bytes: comentar/remover la llamada a `assertAllowedFileSignature` en el middleware de upload.
4. Preflight: comentar `await assertStoreOpen(pool)` en controller.
5. Logs: revertir condicional de producción en `app.js`.

## Dependencies

- Esquema MySQL actual con `configuracion_tienda` seed (existe).
- `archivo_drive` estructura existente (existe).
- OpenSpec `error-handling`, `drive-upload`, `payment-proofs` ya existen (se modifican deltas).

## Success Criteria

- [ ] `bash scripts/crear_zip_auditoria.sh` genera ZIP sin `.env`, `node_modules`, `.next`, `coverage`, `dist`, `credentials`, `drive-credentials.json`.
- [ ] `cd backend && npm test` pasa con 0 fallos (requiere MySQL local con seed).
- [ ] `cd backend && npm run test:unit` pasa con 0 fallos sin DB.
- [ ] Tests Drive no tocan Drive real a menos que `RUN_REAL_DRIVE_TESTS=true`.
- [ ] `_resetDriveForTest()` restaura estado limpio entre suites.
- [ ] Archivo con mimetype PDF pero sin firma `%PDF` → `400 Archivo inválido`.
- [ ] Archivo con mimetype correcto y firma correcta → procesado.
- [ ] Error de Google Drive (cualquier causa) → `503 Servicio de upload no disponible`.
- [ ] Tienda cerrada + transferencia con comprobante → `400 La tienda está cerrada` (sin huérfano en Drive).
- [ ] Request log no aparece en stdout cuando `NODE_ENV=production`.
- [ ] Documentación actualizada con estrategia admin (metadata + recomendación proxy B7).
