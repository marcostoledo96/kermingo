# Delta for Payment Proofs

## MODIFIED Requirements

### Requirement: File validation must enforce MIME type and size limits

The system MUST validate uploaded files in two stages: (1) Multer's `fileFilter` checks MIME type and size, (2) after Multer populates `req.file.buffer`, magic bytes validation confirms the actual file content matches the declared MIME type. Only PDF, PNG, JPEG, and WEBP are accepted. Maximum file size is 5 MB (5,242,880 bytes). Files failing magic bytes validation MUST be rejected with HTTP 400.

(Previously: Only Multer's MIME type check was performed; no content-level validation)

#### Scenario: Valid JPEG file is accepted

- GIVEN a file with MIME type `image/jpeg`, size ≤ 5 MB, and buffer starting with `FF D8 FF`
- WHEN uploaded as `comprobante` in `POST /api/pedidos` with `metodo_pago=transferencia`
- THEN the file passes both Multer and magic bytes validation
- AND the file is processed

#### Scenario: Valid PDF file is accepted

- GIVEN a file with MIME type `application/pdf`, size ≤ 5 MB, and buffer starting with `%PDF`
- WHEN uploaded as `comprobante`
- THEN the file passes both validation stages
- AND the file is processed

#### Scenario: MIME spoofing is detected and rejected

- GIVEN a file with MIME type `image/png` but buffer does NOT start with `89 50 4E 47`
- WHEN uploaded as `comprobante`
- THEN magic bytes validation fails
- AND the server responds 400 with `"Archivo invalido: el contenido no coincide con el tipo declarado"`

#### Scenario: Oversized file is rejected

- GIVEN a file larger than 5 MB (regardless of MIME type)
- WHEN uploaded as `comprobante`
- THEN Multer rejects the file before magic bytes check
- AND the server responds 413 (Payload Too Large) or 400 with a size limit error

### Requirement: Drive unavailability must fail safely

The system MUST handle Google Drive service unavailability without leaving partial pedido state in the database. Before attempting Drive upload, the system MUST perform a cheap preflight check confirming the store is open (`assertStoreOpen(pool)`). If the store is closed, the request MUST be rejected with HTTP 400 BEFORE any Drive upload attempt, preventing orphan files.

(Previously: Drive upload was attempted before checking store state; any Drive error other than specific string matches fell through to 500)

#### Scenario: Store closed prevents Drive upload (preflight)

- GIVEN `configuracion_tienda.estado = 'cerrada'`
- WHEN a client sends `POST /api/pedidos` with `metodo_pago=transferencia` and a valid file
- THEN `assertStoreOpen(pool)` detects the closed store
- AND the request is rejected with HTTP 400 `"La tienda esta cerrada"`
- AND NO Drive upload is attempted
- AND no orphan file is created in Drive

#### Scenario: Drive upload fails with typed error — 503

- GIVEN the store is open
- AND Google Drive service is unavailable (any cause: credentials, network, quota, rate limit)
- WHEN a client sends `POST /api/pedidos` with `metodo_pago=transferencia` and a valid file
- THEN the Drive attempt throws `DriveUploadError`
- AND the controller maps it to HTTP 503 `"Servicio de upload no disponible"`
- AND no pedido row is inserted in the database
- AND no `archivo_drive` row is created

#### Scenario: DB transaction fails after Drive upload succeeds

- GIVEN the Drive upload succeeds
- WHEN the DB transaction fails (e.g., stock conflict, constraint violation)
- THEN the `archivo_drive` row may exist as orphan (acceptable for MVP)
- AND no `pedido` row is created
- AND the server responds with the appropriate DB error (400 or 500)

**Traceability**: `backend/src/api/middlewares/upload.middleware.js`, `backend/src/api/controllers/pedido.controller.js`, `backend/src/api/models/pedido.model.js`, `backend/tests/comprobantes.test.js`
