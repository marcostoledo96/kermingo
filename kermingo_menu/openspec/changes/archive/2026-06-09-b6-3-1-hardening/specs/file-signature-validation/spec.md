# File Signature Validation Specification

## Purpose

Validate uploaded file content by inspecting magic bytes (file signatures) in the actual buffer, not relying solely on client-supplied MIME type. Prevents MIME spoofing attacks where a malicious file claims a valid MIME type but contains different content.

## Requirements

### Requirement: Upload middleware must validate magic bytes after Multer

The system MUST validate the actual file buffer against known magic byte signatures for allowed MIME types (PDF, PNG, JPEG, WEBP). This validation MUST occur after Multer's `memoryStorage` has populated `req.file.buffer` and before any Drive upload or DB transaction. Files failing signature validation MUST be rejected with HTTP 400.

Supported signatures:
| MIME Type | Magic Bytes (hex) | Offset |
|-----------|-------------------|--------|
| `application/pdf` | `25 50 44 46` (`%PDF`) | 0 |
| `image/png` | `89 50 4E 47` | 0 |
| `image/jpeg` | `FF D8 FF` | 0 |
| `image/webp` | `52 49 46 46` + `57 45 42 50` (`RIFF....WEBP`) | 0 + 8 |

#### Scenario: Valid PDF with correct magic bytes passes

- GIVEN a file with MIME type `application/pdf` and buffer starting with `%PDF`
- WHEN `assertAllowedFileSignature(buffer, mimeType)` is called
- THEN the function returns without throwing
- AND the upload proceeds to Drive

#### Scenario: Valid PNG with correct magic bytes passes

- GIVEN a file with MIME type `image/png` and buffer starting with `89 50 4E 47`
- WHEN `assertAllowedFileSignature(buffer, mimeType)` is called
- THEN the function returns without throwing

#### Scenario: Valid JPEG with correct magic bytes passes

- GIVEN a file with MIME type `image/jpeg` and buffer starting with `FF D8 FF`
- WHEN `assertAllowedFileSignature(buffer, mimeType)` is called
- THEN the function returns without throwing

#### Scenario: Valid WEBP with correct magic bytes passes

- GIVEN a file with MIME type `image/webp`, buffer starting with `RIFF` and containing `WEBP` at offset 8
- WHEN `assertAllowedFileSignature(buffer, mimeType)` is called
- THEN the function returns without throwing

#### Scenario: MIME spoofing detected — fake PDF

- GIVEN a file with MIME type `application/pdf` but buffer does NOT start with `%PDF`
- WHEN `assertAllowedFileSignature(buffer, mimeType)` is called
- THEN the function throws a `ValidationError` with message `"Archivo invalido: el contenido no coincide con el tipo declarado"`
- AND the request is rejected with HTTP 400

#### Scenario: MIME spoofing detected — fake image

- GIVEN a file with MIME type `image/png` but buffer does NOT start with `89 50 4E 47`
- WHEN `assertAllowedFileSignature(buffer, mimeType)` is called
- THEN the function throws a `ValidationError`
- AND the request is rejected with HTTP 400

#### Scenario: Unsupported MIME type bypasses signature check

- GIVEN a file with a MIME type not in the supported signature list
- WHEN `assertAllowedFileSignature(buffer, mimeType)` is called
- THEN the function throws `ValidationError` — only PDF/PNG/JPEG/WEBP have defined signatures

#### Scenario: Empty buffer is rejected

- GIVEN a file with zero-byte buffer
- WHEN `assertAllowedFileSignature(buffer, mimeType)` is called
- THEN the function throws `ValidationError` — buffer too short for signature check

**Traceability**: `backend/src/api/utils/file-signature.utils.js`, `backend/tests/comprobantes.unit.test.js` (signature unit tests), `backend/tests/comprobantes.test.js` (integration)
