# Payment Proofs Specification

## Purpose

Gestión de comprobantes de pago vinculados a pedidos online. Permite subir archivos de comprobante al crear un pedido por transferencia, registrar metadata en `archivo_drive`, y exponer acceso seguro a admins. Cubre validación de archivos, transiciones de estado de pago, y endpoint de consulta admin.

## Requirements

### Requirement: Online transfer orders must include a payment proof file

The system MUST require a file upload when `metodo_pago === 'transferencia'` for public online orders (`POST /api/pedidos`). The endpoint MUST accept multipart/form-data with the file field named `comprobante`.

#### Scenario: Transfer order with valid comprobante creates pedido with comprobante_subido

- GIVEN the store is open (`configuracion_tienda.estado = 'abierta'`)
- WHEN a client sends `POST /api/pedidos` with multipart/form-data containing valid order fields, `metodo_pago=transferencia`, and a file attachment named `comprobante` (valid MIME, ≤5 MB)
- THEN the file is uploaded to Google Drive
- AND a row is inserted in `archivo_drive` with `tipo='comprobante'` and metadata (`drive_id`, `nombre_original`, `mime_type`, `tamanio_bytes`)
- AND the `pedido` is created with `estado_pago='comprobante_subido'` and `comprobante_archivo_id` pointing to the `archivo_drive` row
- AND the response returns 201 with the pedido data

#### Scenario: Transfer order without comprobante is rejected

- GIVEN a client sends `POST /api/pedidos` with `metodo_pago=transferencia`
- WHEN no file is attached in the multipart request
- THEN the server responds 400 with a clear validation error message

#### Scenario: Efectivo order must not accept comprobante

- GIVEN a client sends `POST /api/pedidos` with `metodo_pago=efectivo`
- WHEN a file is attached as `comprobante`
- THEN the server responds 400 rejecting the file for efectivo orders
- AND the DB CHECK constraint `chk_pedido_comprobante_efectivo` is never violated

#### Scenario: Transfer order through caja rápida may be marked pagado without comprobante

- GIVEN an authenticated admin sends `POST /api/admin/pedidos/caja` with `metodo_pago=transferencia`
- WHEN no file is attached
- THEN the pedido is created with `estado_pago='pagado'` (or the state the admin specified)
- AND no comprobante upload is required for caja orders

### Requirement: File validation must enforce MIME type and size limits

The system MUST validate uploaded files before processing. Only the following MIME types are accepted: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`. Maximum file size is 5 MB (5,242,880 bytes).

#### Scenario: Valid JPEG file is accepted

- GIVEN a file with MIME type `image/jpeg` and size ≤ 5 MB
- WHEN uploaded as `comprobante` in `POST /api/pedidos` with `metodo_pago=transferencia`
- THEN the file passes validation and is processed

#### Scenario: Valid PDF file is accepted

- GIVEN a file with MIME type `application/pdf` and size ≤ 5 MB
- WHEN uploaded as `comprobante`
- THEN the file passes validation and is processed

#### Scenario: Invalid MIME type is rejected

- GIVEN a file with MIME type `application/x-executable` or `text/plain`
- WHEN uploaded as `comprobante`
- THEN the server responds 400 with a validation error indicating unsupported file type

#### Scenario: Oversized file is rejected

- GIVEN a file larger than 5 MB (regardless of MIME type)
- WHEN uploaded as `comprobante`
- THEN the server responds 413 (Payload Too Large) or 400 with a size limit error

#### Scenario: MIME spoofing is mitigated

- GIVEN a file with `.jpg` extension but actual content is not a valid image
- WHEN uploaded as `comprobante`
- THEN the system relies on Multer's MIME detection from the request, not file extension
- AND the file is rejected if the detected MIME is not in the allowed list

### Requirement: Admin can access comprobante metadata securely

The system MUST provide `GET /api/admin/pedidos/:id/comprobante` that returns safe access information for a pedido's comprobante. This endpoint MUST NOT proxy file bytes — it returns metadata and a safe Drive URL if available.

#### Scenario: Admin retrieves comprobante metadata for a pedido with comprobante

- GIVEN a pedido exists with `comprobante_archivo_id` populated
- AND an authenticated admin sends `GET /api/admin/pedidos/:id/comprobante`
- THEN the server responds 200 with `{ drive_id, nombre_original, mime_type, tamanio_bytes, url_publica (if set), created_at }`
- AND the response does NOT include the file bytes

#### Scenario: Admin requests comprobante for pedido without comprobante

- GIVEN a pedido exists with `comprobante_archivo_id IS NULL`
- WHEN an authenticated admin sends `GET /api/admin/pedidos/:id/comprobante`
- THEN the server responds 404 with a message indicating no comprobante exists

#### Scenario: Unauthenticated user requests comprobante

- GIVEN no valid admin cookie is present
- WHEN a request is sent to `GET /api/admin/pedidos/:id/comprobante`
- THEN the server responds 401

#### Scenario: Non-existent pedido comprobante request

- GIVEN a pedido ID that does not exist in the database
- WHEN an authenticated admin sends `GET /api/admin/pedidos/:id/comprobante`
- THEN the server responds 404

### Requirement: Payment state transitions must support comprobante_subido

The system MUST support transitions from `comprobante_subido` to `pagado` (approve) and `rechazado` (reject) via the existing `PATCH /api/admin/pedidos/:id/pago` endpoint.

#### Scenario: Admin approves comprobante (comprobante_subido → pagado)

- GIVEN a pedido with `estado_pago='comprobante_subido'` and `metodo_pago='transferencia'`
- WHEN an authenticated admin sends `PATCH /api/admin/pedidos/:id/pago` with `{ estado_pago: 'pagado' }`
- THEN the state machine validates the transition
- AND `estado_pago` is set to `'pagado'`
- AND the server responds 200 with the updated pedido

#### Scenario: Admin rejects comprobante (comprobante_subido → rechazado)

- GIVEN a pedido with `estado_pago='comprobante_subido'` and `metodo_pago='transferencia'`
- WHEN an authenticated admin sends `PATCH /api/admin/pedidos/:id/pago` with `{ estado_pago: 'rechazado' }`
- THEN the state machine validates the transition
- AND `estado_pago` is set to `'rechazado'`
- AND the server responds 200 with the updated pedido

#### Scenario: Invalid transition from comprobante_subido is rejected

- GIVEN a pedido with `estado_pago='comprobante_subido'`
- WHEN an admin sends `PATCH /api/admin/pedidos/:id/pago` with `{ estado_pago: 'pendiente' }`
- THEN the server responds 400 with `'Transicion de estado de pago no valida'`

#### Scenario: Rejected comprobante can be resubmitted (rechazado → comprobante_subido)

- GIVEN a pedido with `estado_pago='rechazado'` and `metodo_pago='transferencia'`
- WHEN an admin sends `PATCH /api/admin/pedidos/:id/pago` with `{ estado_pago: 'comprobante_subido' }`
- THEN the transition is allowed by the state machine
- AND the server responds 200

### Requirement: Drive unavailability must fail safely

The system MUST handle Google Drive service unavailability without leaving partial pedido state in the database.

#### Scenario: Drive upload fails before DB transaction

- GIVEN Google Drive service is unavailable or credentials are invalid
- WHEN a client sends `POST /api/pedidos` with `metodo_pago=transferencia` and a valid file
- THEN the Drive upload attempt fails
- AND no pedido row is inserted in the database
- AND the server responds 503 (Service Unavailable) or 500 with a clear error message
- AND no `archivo_drive` row is created

#### Scenario: DB transaction fails after Drive upload succeeds

- GIVEN the Drive upload succeeds
- WHEN the DB transaction fails (e.g., stock conflict, constraint violation)
- THEN the `archivo_drive` row may exist as orphan (acceptable for MVP)
- AND no `pedido` row is created
- AND the server responds with the appropriate DB error (400 or 500)
