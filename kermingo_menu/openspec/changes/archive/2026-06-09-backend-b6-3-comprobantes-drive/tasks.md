# Tasks: B6.3 Comprobantes / Google Drive

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 600–800 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Foundation + Core Backend (~280 lines) → PR 2: Wiring + Integration Tests + Docs (~350–400 lines) |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Base Branch | Notes |
|------|------|-----------|-------------|-------|
| 1 | Infrastructure + models + unit tests | PR 1 | `feature/backend-b6-3-comprobantes-drive` | package.json, environments, upload.middleware, drive.service, archivo.model, schema preprocess, unit tests |
| 2 | Controller/routes + integration tests + docs | PR 2 | PR 1 branch | pedido.controller.js, pedido.model.js, pedido.routes.js, integration tests, documentation sync |

---

## Phase 1: Infrastructure / Foundation (PR 1)

- [x] **1.1** `backend/package.json` — Add `multer` and `googleapis` deps. Run `npm install`.
- [x] **1.2** `environments.js` — Add `GOOGLE_DRIVE_CREDENTIALS_JSON` and `GOOGLE_DRIVE_FOLDER_ID`. Fail startup in production if missing; warn in dev.
- [x] **1.3** `upload.middleware.js` (CREATE) — Multer instance with `memoryStorage`, `limits.fileSize: 5*1024*1024`, `fileFilter` for `image/jpeg|png|webp|application/pdf`, field name `comprobante`.
- [x] **1.4** `drive.service.js` (CREATE) — `GoogleAuth` init, export `uploadFile(buffer, originalName, mimeType)` returning `{ driveFileId, webViewLink }`. Validate creds at import; log warning if missing in dev, throw if missing in prod.
- [x] **1.5** `archivo.model.js` (CREATE) — `createArchivo(conn, { drive_id, nombre_original, mime_type, tamanio_bytes, tipo })` returning `id`. `findArchivoById(pool, id)` returning row or null.
- [x] **1.6** `pedido.schema.js` — Add `z.preprocess((val) => typeof val === 'string' ? JSON.parse(val) : val, z.array(...))` for `items` field to support multipart/form-data parsing.

**Verify PR 1**: `npm test -- --testPathPattern='comprobantes.unit'` passes. Manual: `npm run dev` starts without errors in dev mode.

## Phase 2: Core Implementation (PR 2)

- [x] **2.1** `pedido.model.js` — In `createWithTransaction`, accept optional `archivo` object (insert `archivo_drive` row before pedido INSERT, set `comprobante_archivo_id`). Include in SELECT queries (`findById`, `findByToken`, `findAllAdmin`).
- [x] **2.2** `pedido.controller.js` — Modify `crear()`: if `metodo_pago === 'transferencia'` and `req.file` present, call `driveService.uploadFile()` then pass `archivo` to model. If `metodo_pago === 'efectivo'` with file → 400. If `transferencia` without file → 400. Add `obtenerComprobante` handler returning archivo metadata (no byte proxy). Return 404 if no comprobante.
- [x] **2.3** `pedido.routes.js` — Mount `upload.single('comprobante')` before `validateBody` on `POST /`. Add `GET /:id/comprobante` under adminRouter with `requireAdmin`.
- [x] **2.4** `pedido.controller.js` — `crearCaja()` must skip comprobante validation (transferencias de caja no requieren archivo).

**Verify PR 2**: `npm test` passes. Manual: `npm run dev` and test with curl multipart.

## Phase 3: Testing

- [x] **3.1** `comprobantes.unit.test.js` (CREATE) — Unit tests:
  - `drive.service.js`: mock `googleapis`, test `uploadFile` success + error throws. Mock `GoogleAuth` init.
  - `archivo.model.js`: mock pool/conn, test `createArchivo` + `findArchivoById`.
  - Schema: test `createPedidoSchema` parses JSON body (native) and multipart (preprocess string `items`) correctly.
  - **Spec traceability**: `drive-upload/R1-S1`, `drive-upload/R1-S2`, `drive-upload/R1-S3`, `drive-upload/R3-S1`, `drive-upload/R3-S2`, `drive-upload/R4-S1`, `drive-upload/R4-S2`, `drive-upload/R4-S3`, `payment-proofs/R2-S1` thru `R2-S5`.

- [x] **3.2** `comprobantes.test.js` (CREATE) — Integration tests via supertest:
  - `POST /api/pedidos` transferencia with valid file → 201, `estado_pago=comprobante_subido`, `comprobante_archivo_id` set. `payment-proofs/R1-S1`, `etapa-5/R2-S1`.
  - `POST /api/pedidos` transferencia without file → 400. `payment-proofs/R1-S2`, `etapa-5/R2-S2`.
  - `POST /api/pedidos` efectivo with file → 400. `payment-proofs/R1-S3`, `etapa-5/R1-S2`.
  - `POST /api/admin/pedidos/caja` transferencia without file → 201 (caja bypass). `payment-proofs/R1-S4`.
  - `GET /api/admin/pedidos/:id/comprobante` with comprobante → 200 + metadata. `payment-proofs/R3-S1`.
  - `GET /api/admin/pedidos/:id/comprobante` without comprobante → 404. `payment-proofs/R3-S2`.
  - `GET /api/admin/pedidos/:id/comprobante` no auth → 401. `payment-proofs/R3-S3`.
  - `GET /api/admin/pedidos/:id/comprobante` non-existent ID → 404. `payment-proofs/R3-S4`.
  - `PATCH /api/admin/pedidos/:id/pago` `comprobante_subido → pagado` → 200. `payment-proofs/R4-S1`.
  - `PATCH` `comprobante_subido → rechazado` → 200. `payment-proofs/R4-S2`.
  - `PATCH` `comprobante_subido → pendiente` → 400. `payment-proofs/R4-S3`.
  - `PATCH` `rechazado → comprobante_subido` → 200. `payment-proofs/R4-S4`.
  - Store closed rejects transfer multipart → 400. `etapa-5/R3-S1`.
  - Insufficient stock rejects order → 400, no pedido. `etapa-5/R3-S2`.
  - Mock `driveService.uploadFile()` in integration tests to throw → 503/500, no DB row. `payment-proofs/R5-S1`, `R5-S2`.

**Spec-to-test traceability**:

| Spec file | Requirement | Scenarios | Test file(s) |
|-----------|------------|-----------|-------------|
| `payment-proofs/spec.md` | R1 (4 esc) | S1–S4 | `comprobantes.test.js` |
| `payment-proofs/spec.md` | R2 (4 esc) | S1–S4 | `comprobantes.unit.test.js` |
| `payment-proofs/spec.md` | R3 (4 esc) | S1–S4 | `comprobantes.test.js` |
| `payment-proofs/spec.md` | R4 (4 esc) | S1–S4 | `comprobantes.test.js` |
| `payment-proofs/spec.md` | R5 (2 esc) | S1–S2 | `comprobantes.test.js` |
| `drive-upload/spec.md` | R1 (3 esc) | S1–S3 | `comprobantes.unit.test.js` |
| `drive-upload/spec.md` | R2 (3 esc) | S1–S3 | `comprobantes.unit.test.js` |
| `drive-upload/spec.md` | R3 (2 esc) | S1–S2 | `comprobantes.unit.test.js` |
| `drive-upload/spec.md` | R4 (3 esc) | S1–S3 | `comprobantes.unit.test.js` |
| `drive-upload/spec.md` | R5 (2 esc) | S1–S2 | `comprobantes.unit.test.js` |
| `etapa-5-pedidos/spec.md` | R1 (2 esc) | S1–S2 | `comprobantes.test.js` |
| `etapa-5-pedidos/spec.md` | R2 (2 esc) | S1–S2 | `comprobantes.test.js` |
| `etapa-5-pedidos/spec.md` | R3 (4 esc) | S1–S3 | `comprobantes.test.js` |
| `etapa-5-pedidos/spec.md` | R4 (1 esc) | S1 | `comprobantes.test.js` |

## Phase 4: Documentation / Archive

- [x] **4.1** `DOCUMENTACION/IA/API.md` — Document `POST /api/pedidos` multipart contract, `GET /api/admin/pedidos/:id/comprobante` response, new error codes.
- [x] **4.2** `DOCUMENTACION/IA/CORE.md` — Document `comprobante_subido` state, comprobante flow, Drive upload before DB transaction.
- [x] **4.3** `DOCUMENTACION/IA/INFRA.md` — Document `archivo_drive` table, `GOOGLE_DRIVE_*` env vars, multer config.
- [x] **4.4** `DOCUMENTACION/IA/GOTCHAS.md` — Add: orphan files on DB failure, `z.preprocess` needed for multipart items, Multer error vs Zod error ordering.
- [x] **4.5** `DOCUMENTACION/IA/SECRETS.md` — Add `GOOGLE_DRIVE_CREDENTIALS_JSON` and drive folder location.
- [x] **4.6** `DOCUMENTACION/IA/TESTING.md` — Add testing approach for Drive service mocking, multipart supertest patterns, cleanup of test-created archivos.