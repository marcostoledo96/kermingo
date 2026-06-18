# Spec: product-image-upload (delta)

## ADDED Requirements

### REQ-IMG-001 — Image picker (create + edit)
The product form dialog MUST show a "Subir foto" or "Cambiar foto" button that opens a file picker. The file picker MUST accept `image/jpeg, image/png, image/webp` (via the `accept` attribute). On file selection, a local preview MUST be shown immediately via `URL.createObjectURL`.

### REQ-IMG-002 — Create flow with image
When creating a new product with a pending image:
1. The product MUST be created first via `POST /api/admin/productos`.
2. If creation succeeds, the pending image MUST be uploaded via `POST /api/admin/productos/:newId/imagen` (multipart FormData, field name `imagen`).
3. If image upload fails, the product MUST remain created. A warning MUST be shown: "Producto creado, pero la imagen no se pudo subir".
4. The dialog MUST close after creation (whether or not image upload succeeded).

### REQ-IMG-003 — Edit flow with image replacement
When editing a product and the user selects a new image:
1. The image MUST be uploaded immediately to `POST /api/admin/productos/:id/imagen`.
2. The dialog MUST show a "Subiendo…" indicator while the upload is in flight.
3. The file picker MUST be disabled while the upload is in flight.
4. On success, the form's `image` field MUST be updated with the new `imagen_url` from the response.
5. On failure, the previous image MUST be preserved and an error MUST be shown inline.

### REQ-IMG-004 — Image removal
When editing a product, the user MUST be able to click a "Quitar foto" button to remove the current image. This MUST call `DELETE /api/admin/productos/:id/imagen` and clear the form's `image` field. The button MUST be hidden when the product has no image.

### REQ-IMG-005 — File validation (client)
The dialog MUST reject files larger than 5 MB before attempting to upload. The user MUST see a clear error: "Archivo demasiado grande (máx 5 MB)". The dialog MUST NOT send the file to the backend in this case.

### REQ-IMG-006 — Memory cleanup
When the dialog closes (either by submitting or by cancelling), any `URL.createObjectURL` references MUST be revoked via `URL.revokeObjectURL` to prevent memory leaks.

### REQ-IMG-007 — Loading state during upload
While an image upload is in flight (during edit), the "Subir foto" button MUST show a spinner and MUST be disabled. The user MUST NOT be able to trigger another upload concurrently.

## Out of scope
- Image cropping / rotation in-browser
- Multiple images per product
- Drag-and-drop upload
- Bulk upload for many products
- Webcam capture

## Testing strategy
- **Backend smoke** (pre-apply): curl `POST /api/admin/productos/:id/imagen` with a small test image. Confirm 200 with the new `imagen_url`.
- **End-to-end smoke** (post-apply): dev login → /admin/productos → click "Nuevo producto" → fill name+price → click "Subir foto" → select a small JPG → click "Crear producto" → dialog closes → list shows the new product with the image.
- **Edit smoke**: edit existing product → click "Cambiar foto" → select another file → see the image update in the form preview.
- **Remove smoke**: edit existing product with image → click "Quitar foto" → image is removed.
- **Size check**: try uploading a 6MB file → see error "Archivo demasiado grande".
- **Build**: `pnpm build` passes.
- **Mobile check**: 360px viewport. The file picker button is reachable.
