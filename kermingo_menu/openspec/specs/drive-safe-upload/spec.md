# Drive Safe Upload Specification

## Purpose

Ensure Google Drive file uploads use sanitized internal filenames to prevent path traversal, injection, or filesystem issues, while preserving the original filename in the database for user-facing display. Provide typed error handling and test-safe state management for the Drive service.

## Requirements

### Requirement: Drive upload must use sanitized internal filename

The system MUST generate a safe internal filename for files stored in Google Drive. The internal name MUST be deterministic and unique, composed of `${timestamp}-${uuid}-${sanitizedOriginalName}` where `sanitizedOriginalName` strips non-alphanumeric characters (except dots and hyphens), limits to 100 chars, and removes path separators. The `nombre_original` field in `archivo_drive` MUST remain unchanged (original user-facing name).

#### Scenario: Upload generates safe internal Drive filename

- GIVEN an upload with `originalName = "mi comprobante (1).pdf"`
- WHEN `uploadFile()` generates the Drive filename
- THEN the Drive file is named like `1718000000000-abc123-mi-comprobante-1.pdf`
- AND `archivo_drive.nombre_original` stores `"mi comprobante (1).pdf"` unchanged

#### Scenario: Upload sanitizes path traversal attempts

- GIVEN an upload with `originalName = "../../../etc/passwd"`
- WHEN `uploadFile()` generates the Drive filename
- THEN path separators are stripped from the sanitized portion
- AND no directory traversal is possible in the Drive filename

#### Scenario: Upload handles very long original names

- GIVEN an upload with `originalName` of 500+ characters
- WHEN `uploadFile()` generates the Drive filename
- THEN the sanitized portion is truncated to 100 characters
- AND `nombre_original` in DB preserves the full original name

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

**Traceability**: `backend/src/api/services/drive.service.js`, `backend/tests/comprobantes.drive-mock.test.js`, `backend/tests/comprobantes.unit.test.js`
