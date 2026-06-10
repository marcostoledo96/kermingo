# Design: B6.3.1 — Hardening comprobantes, Drive, tests y ZIP limpio

## Technical Approach

Backend-only hardening before B7: determinize tests, type Drive errors, validate file content via magic bytes, sanitize Drive filenames, add a cheap store-open preflight, redact production request logs, and verify the audit ZIP excludes secrets. All changes respect existing ESM/MVC patterns and the current route order.

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Drive error class | `DriveUploadError extends AppError` with `name === 'DriveUploadError'`, status `503` | Replaces brittle `err.message.includes(...)` string matching in controller and error middleware. |
| Safe Drive filename | `${Date.now()}-${crypto.randomUUID()}-${sanitize(originalName)}` | Prevents path traversal, keeps original name in `archivo_drive.nombre_original` unmodified. |
| Magic bytes validation | New util `file-signature.utils.js`, invoked as middleware after Multer, before controller | Must read `req.file.buffer` which only exists after `memoryStorage`. Keeps upload concern cohesive. |
| Store preflight | `assertStoreOpen(pool)` in `pedido.model.js`, called in controller before `driveUploadFile` | Cheap `SELECT` without lock avoids orphan Drive files when store is closed. |
| Test hooks | `_getDriveStateForTest()` and `_resetDriveForTest()` exported only when `NODE_ENV !== 'production'` | Allows safe state save/restore between suites without exposing in prod. |
| Drive opt-in | `RUN_REAL_DRIVE_TESTS` env flag; default mocked | Prevents accidental real Drive calls in CI/local. |
| Test determinism | `--runInBand` in `npm test`; split `test:unit` / `test:integration` | Eliminates concurrent pool interference. |
| Log redaction | Skip request log entirely when `esProduccion`; add `DISABLE_REQUEST_LOG` escape hatch | Simpler than parsing/redacting query strings and headers. |
| ZIP verification | Post-generation `unzip -l` + `grep` for forbidden patterns inside the script | Self-checking script fails fast if exclusion rules leak. |

## Data Flow

```
Client multipart
  → uploadComprobante.single() [Multer: memoryStorage, fileFilter, size]
  → validateBody(createPedidoSchema)
  → assertMagicBytes(req, res, next) [file-signature.utils]
  → crear controller
      → assertStoreOpen(pool) [cheap SELECT]
      → driveUploadFile(buffer, originalName, mimeType)
          → sanitize + crypto.randomUUID → Drive create
      → createWithTransaction(pool) [DB tx]
  → errorMiddleware
      → instance of AppError? → respuestaError with statusCode
      → DriveUploadError.name === 'DriveUploadError' → 503
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/package.json` | Modify | Add `--runInBand` to `test`; add `test:unit` (`*.unit.test.js`) and `test:integration` (`*.test.js --testPathIgnorePatterns=unit`). |
| `scripts/crear_zip_auditoria.sh` | Modify | Add `-x` exclusions for `*.key`/`*.pem`; append post-generation verification with `unzip -l` + `grep` of forbidden patterns; exit non-zero on leak. |
| `backend/src/api/utils/errors.js` | Modify | Add `DriveUploadError` extending `AppError` with `statusCode = 503` and fixed `name = 'DriveUploadError'`. |
| `backend/src/api/services/drive.service.js` | Modify | Wrap `driveClient.files.create` in try/catch: any error throws `DriveUploadError`. Build safe internal name. Make `initDrive()` idempotent. Export `_getDriveStateForTest` and `_resetDriveForTest` guarded by `NODE_ENV !== 'production'`. |
| `backend/src/api/utils/file-signature.utils.js` | Create | `assertAllowedFileSignature(buffer, mimeType)` maps PDF/PNG/JPEG/WEBP to magic bytes; throws `ValidationError` on mismatch, empty buffer, or unsupported MIME. |
| `backend/src/api/middlewares/upload.middleware.js` | Modify | Add `assertMagicBytes` middleware: if `req.file`, call `assertAllowedFileSignature` and forward errors via `next(err)`. |
| `backend/src/api/controllers/pedido.controller.js` | Modify | In `crear`: `await assertStoreOpen(pool)` before `driveUploadFile`. Replace string-based Drive error catch with `err.name === 'DriveUploadError'` → `next(new DriveUploadError(...))`. |
| `backend/src/api/models/pedido.model.js` | Modify | Add `assertStoreOpen(pool)` helper: cheap non-locking `SELECT estado FROM configuracion_tienda WHERE id = 1`; throws `ValidationError('La tienda esta cerrada')` if not `'abierta'` or missing. |
| `backend/src/app.js` | Modify | Make request-log middleware conditional: only if `!environments.esProduccion && !process.env.DISABLE_REQUEST_LOG`. Log `${req.method} ${req.path}` (never `req.url` with query). Never log `Authorization` or cookie values. |
| `backend/src/api/middlewares/error.middleware.js` | Modify | Recognize `err.name === 'DriveUploadError'` explicitly and map to 503 with message `"Servicio de upload no disponible"`. |
| `backend/tests/comprobantes.test.js` | Modify | Gate real Drive tests behind `RUN_REAL_DRIVE_TESTS`: when false, skip real-upload assertions or use mocked state. Replace `afterAll(pool.end)` with safe pattern (check if pool ended). |
| `backend/tests/comprobantes.drive-mock.test.js` | Modify | Use `_getDriveStateForTest()` / `_resetDriveForTest()` instead of manual `_setDriveClientForTest` save/restore. Add test for safe internal filename format. |
| `backend/tests/comprobantes.unit.test.js` | Modify | Add tests for `DriveUploadError` instanceof `AppError`, tests for `assertAllowedFileSignature` with valid/invalid buffers. |
| `DOCUMENTACION/IA/TESTING.md` | Modify | Document `--runInBand`, `test:unit`/`test:integration`, `RUN_REAL_DRIVE_TESTS`, MySQL seed requirement, `_resetDriveForTest` pattern. |
| `DOCUMENTACION/IA/API.md` | Modify | Add 503 `DriveUploadError` to error table. Document magic bytes prefilter and preflight store check. Note admin comprobante strategy: proxy endpoint recommended for B7. |
| `DOCUMENTACION/IA/GOTCHAS.md` | Modify | Add: magic bytes ordering (after Multer), `RUN_REAL_DRIVE_TESTS` default false, orphan Drive files on DB tx failure (post-MVP), ZIP verification. |

## Interfaces / Contracts

### DriveUploadError
```javascript
export class DriveUploadError extends AppError {
  constructor(message = 'Servicio de upload no disponible') {
    super(message, 503);
    this.name = 'DriveUploadError';
  }
}
```

### file-signature.utils.js
```javascript
export function assertAllowedFileSignature(buffer, mimeType) {
  // throws ValidationError on mismatch/unsupported/empty
}
```

### upload.middleware.js — assertMagicBytes
```javascript
export function assertMagicBytes(req, res, next) {
  if (!req.file) return next();
  try {
    assertAllowedFileSignature(req.file.buffer, req.file.mimetype);
    next();
  } catch (err) { next(err); }
}
```

### pedido.model.js — assertStoreOpen
```javascript
export async function assertStoreOpen(pool) {
  const [[config]] = await pool.query(
    'SELECT estado FROM configuracion_tienda WHERE id = 1'
  );
  if (!config || config.estado !== 'abierta') {
    throw new ValidationError('La tienda esta cerrada');
  }
}
```

### drive.service.js — test hooks (exported only when not production)
```javascript
export function _getDriveStateForTest() {
  return { driveClient, isConfigured };
}
export function _resetDriveForTest({ driveClient: dc, isConfigured: ic } = {}) {
  driveClient = dc ?? null;
  isConfigured = ic ?? false;
}
```

## Route / Middleware Ordering

`pedido.routes.js` public POST changes to:
```javascript
publicRouter.post(
  '/',
  uploadComprobante.single('comprobante'),
  validateBody(createPedidoSchema),
  assertMagicBytes,
  crear
);
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `assertAllowedFileSignature` valid/invalid/empty/unsupported | Direct function calls with real buffers in `comprobantes.unit.test.js` |
| Unit | `DriveUploadError` instanceof `AppError`, `name` and `statusCode` | Direct assertion in `comprobantes.unit.test.js` |
| Unit | `sanitize` + UUID filename format | Test `uploadFile` via mocked Drive client in `comprobantes.drive-mock.test.js` |
| Unit | `_getDriveStateForTest` / `_resetDriveForTest` round-trip | Save, mutate, restore, assert `isDriveReady()` in `comprobantes.drive-mock.test.js` |
| Integration | Magic bytes reject fake PDF → 400 | Supertest multipart with `Buffer.from('not-a-pdf')` in `comprobantes.test.js` |
| Integration | Store closed preflight → 400, no Drive attempt | Update existing store-closed test in `comprobantes.test.js` |
| Integration | Drive API error → 503, no DB row | Update existing 503 test to assert `DriveUploadError.name` in `comprobantes.test.js` |
| Integration | Valid file + mocked Drive → 201 | Keep existing success test when `RUN_REAL_DRIVE_TESTS=false` |
| E2E/script | ZIP generation exclusions | Run `bash scripts/crear_zip_auditoria.sh` and assert exit 0 |

## Risks

- **DriveUploadError breaks existing string-match tests**: Update `comprobantes.drive-mock.test.js` assertions from `.toThrow('Failed to upload')` to `.toThrow(DriveUploadError)`.
- **Magic bytes middleware runs too early**: Must be placed after `uploadComprobante.single()` and after `validateBody` (or at least after Multer). Current design places it after `validateBody` to keep Zod rejection before content analysis.
- **`_resetDriveForTest` exposed in production**: Guard exports with `if (process.env.NODE_ENV !== 'production')`.
- **Pool.end reentrancy**: `--runInBand` + single global pool means only the last active suite should call `pool.end()`. Ensure `afterAll` in integration suites skip `pool.end()` if already ended, or remove `pool.end()` from all but one suite (recommended: keep only in the last-loaded file or use a global teardown).

## Verification Commands

```bash
# ZIP hygiene
bash scripts/crear_zip_auditoria.sh

# Test suite (requires MySQL with seed)
cd backend && npm test

# Unit tests only (no DB)
cd backend && npm run test:unit

# Integration tests only
cd backend && npm run test:integration

# Optional real Drive tests
cd backend && RUN_REAL_DRIVE_TESTS=true npm test
```

## Migration / Rollout

No migration required. All changes additive or localized.
