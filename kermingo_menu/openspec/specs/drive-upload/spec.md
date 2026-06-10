# Drive Upload Specification

## Purpose

Servicio de integración con Google Drive para subir archivos de comprobante de pago. Usa Service Account authentication, Multer memoryStorage, y registra metadata en `archivo_drive`.

## Requirements

### Requirement: Google Drive service must authenticate via Service Account

The system MUST provide a `drive.service.js` module that authenticates with Google Drive using a Service Account credential JSON. The service MUST use `google.auth.GoogleAuth` with scopes for Drive file operations.

#### Scenario: Service initializes with valid credentials

- GIVEN `GOOGLE_DRIVE_CREDENTIALS_JSON` contains a valid Service Account JSON
- AND `GOOGLE_DRIVE_FOLDER_ID` is set
- WHEN the Drive service is instantiated
- THEN authentication succeeds and the service is ready to upload files

#### Scenario: Missing credentials in production cause startup error

- GIVEN `NODE_ENV=production`
- AND `GOOGLE_DRIVE_CREDENTIALS_JSON` is not set
- WHEN the application starts
- THEN the startup MUST fail with a clear error message about missing Drive credentials

#### Scenario: Missing credentials in development log a warning

- GIVEN `NODE_ENV=development`
- AND `GOOGLE_DRIVE_CREDENTIALS_JSON` is not set
- WHEN the application starts
- THEN the application starts but the Drive service logs a warning and is non-functional

### Requirement: Drive upload must use Multer memoryStorage

The system MUST use `multer` with `memoryStorage()` for file uploads. Files MUST NOT be written to disk. The upload middleware MUST be configured with:
- `limits.fileSize`: 5,242,880 bytes (5 MB)
- `fileFilter`: accept only `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
- Single file field named `comprobante`

#### Scenario: Multer middleware accepts valid file

- GIVEN a request with `Content-Type: multipart/form-data`
- AND a file field named `comprobante` with valid MIME type and size ≤ 5 MB
- WHEN the upload middleware processes the request
- THEN `req.file` contains the file buffer, originalname, mimetype, and size
- AND no file is written to disk

#### Scenario: Multer rejects oversized file

- GIVEN a file larger than 5 MB
- WHEN the upload middleware processes the request
- THEN Multer throws a `LIMIT_FILE_SIZE` error
- AND the error is caught and converted to a 413 or 400 response

#### Scenario: Multer rejects invalid MIME type

- GIVEN a file with MIME type `application/x-executable`
- WHEN the upload middleware processes the request
- THEN the `fileFilter` rejects the file
- AND the server responds 400 with an unsupported file type error

### Requirement: Drive upload method must return file metadata

The Drive service MUST expose an `uploadFile(buffer, originalName, mimeType)` method that uploads a file to the configured Drive folder using a sanitized internal filename and returns `{ driveFileId, webViewLink, internalName }`. Any failure during upload MUST throw a `DriveUploadError` (typed error, not generic `Error`).

#### Scenario: Upload succeeds with metadata

- GIVEN a valid file buffer, original name, and MIME type
- WHEN `uploadFile()` is called
- THEN the file is uploaded to the folder specified by `GOOGLE_DRIVE_FOLDER_ID`
- AND the Drive file uses a sanitized internal name (`${timestamp}-${uuid}-${sanitizedOriginal}`)
- AND the method returns `{ driveFileId: string, webViewLink: string | null, internalName: string }`

#### Scenario: Upload fails with Drive API error

- GIVEN the Drive API returns any error (quota exceeded, permission denied, timeout, rate limit, invalid_grant, socket hang up)
- WHEN `uploadFile()` is called
- THEN the method throws a `DriveUploadError` with `name === 'DriveUploadError'`
- AND `DriveUploadError` extends `AppError` with `statusCode === 503`
- AND no `archivo_drive` row is created

#### Scenario: Upload fails with network error

- GIVEN the network is unreachable or DNS fails for Drive API
- WHEN `uploadFile()` is called
- THEN the method throws a `DriveUploadError` (not a generic network Error)
- AND the error is recognizable by `err.name === 'DriveUploadError'`

### Requirement: archivo_drive model must support comprobante records

The system MUST provide an `archivo.model.js` module with methods to create and query `archivo_drive` records. The model MUST support the `tipo='comprobante'` enum value already defined in the schema.

#### Scenario: Create archivo record for comprobante

- GIVEN Drive upload returns `{ driveFileId, webViewLink }`
- AND file metadata `{ nombre_original, mime_type, tamanio_bytes }`
- WHEN `createArchivo({ drive_id, nombre_original, mime_type, tamanio_bytes, tipo: 'comprobante' })` is called within a DB transaction
- THEN a row is inserted in `archivo_drive` with `tipo='comprobante'`
- AND the method returns the inserted `id`

#### Scenario: Find archivo by ID

- GIVEN an `archivo_drive` row exists with `id=N`
- WHEN `findById(N)` is called
- THEN the method returns the row with all fields: `id`, `drive_id`, `nombre_original`, `mime_type`, `tamanio_bytes`, `tipo`, `url_publica`, `created_at`

#### Scenario: Find archivo by non-existent ID

- GIVEN no row exists with `id=N`
- WHEN `findById(N)` is called
- THEN the method returns `null` or `undefined`

### Requirement: Environment configuration must include Drive variables

The system MUST add the following environment variables to `environments.js`:
- `GOOGLE_DRIVE_CREDENTIALS_JSON`: JSON string of the Service Account credentials
- `GOOGLE_DRIVE_FOLDER_ID`: ID of the Drive folder where files are uploaded

#### Scenario: Production validates Drive variables

- GIVEN `NODE_ENV=production`
- WHEN `environments.js` is loaded
- THEN `GOOGLE_DRIVE_CREDENTIALS_JSON` and `GOOGLE_DRIVE_FOLDER_ID` MUST be present
- AND if missing, startup throws an error listing the missing variables

#### Scenario: Development allows missing Drive variables

- GIVEN `NODE_ENV=development`
- WHEN `environments.js` is loaded
- THEN missing Drive variables do not block startup
- AND the values default to `undefined` or empty string

### Requirement: Drive service must export test-safe state reset

The system MUST provide `_resetDriveForTest()` and `_getDriveStateForTest()` functions that allow test suites to save and restore the Drive service's internal state (`driveClient`, `isConfigured`) between test runs. These functions MUST NOT be exported in production builds.

#### Scenario: Test suite saves Drive state before mocking

- GIVEN a test suite calls `_getDriveStateForTest()`
- WHEN the function returns
- THEN it returns `{ driveClient, isConfigured }` reflecting current internal state

#### Scenario: Test suite restores Drive state after mocking

- GIVEN a test suite previously saved state via `_getDriveStateForTest()`
- AND the suite mocked the Drive client
- WHEN `_resetDriveForTest(savedState)` is called
- THEN `driveClient` and `isConfigured` are restored to their saved values
- AND subsequent calls to `isDriveReady()` reflect the restored state

#### Scenario: Reset with undefined state is safe

- GIVEN `_resetDriveForTest()` is called with `{ driveClient: undefined, isConfigured: false }`
- WHEN the function executes
- THEN it sets internal state to undefined/not-configured without throwing

#### Scenario: Test functions unavailable in production

- GIVEN `NODE_ENV=production`
- WHEN code attempts to import `_resetDriveForTest`
- THEN the function is undefined or throws if called
