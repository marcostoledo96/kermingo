# Delta for Drive Upload

## MODIFIED Requirements

### Requirement: Drive upload method must return file metadata

The Drive service MUST expose an `uploadFile(buffer, originalName, mimeType)` method that uploads a file to the configured Drive folder using a sanitized internal filename and returns `{ driveFileId, webViewLink, internalName }`. Any failure during upload MUST throw a `DriveUploadError` (typed error, not generic `Error`).

(Previously: Threw generic Error on failure; used originalName directly as Drive filename; returned only driveFileId and webViewLink)

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

### Requirement: Environment configuration must include Drive variables

The system MUST add the following environment variables to `environments.js`:
- `GOOGLE_DRIVE_CREDENTIALS_JSON`: JSON string of the Service Account credentials
- `GOOGLE_DRIVE_FOLDER_ID`: ID of the Drive folder where files are uploaded

The Drive service MUST provide `_resetDriveForTest()` and `_getDriveStateForTest()` for test isolation. These functions MUST NOT be available when `NODE_ENV=production`.

(Previously: No test-safe state reset/get functions existed)

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

#### Scenario: Test functions unavailable in production

- GIVEN `NODE_ENV=production`
- WHEN code attempts to import `_resetDriveForTest`
- THEN the function is undefined or throws if called

**Traceability**: `backend/src/api/services/drive.service.js`, `backend/src/api/controllers/pedido.controller.js`, `backend/tests/comprobantes.drive-mock.test.js`
