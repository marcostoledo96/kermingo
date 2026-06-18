# Change: frontend-product-image-upload

## Why
After `frontend-admin-api-wiring`, the "Subir foto" button in the product form dialog was left as a disabled stub labeled "Próximamente". This change wires it to the existing backend endpoint `POST /api/admin/productos/:id/imagen` so admins can actually upload product photos from the admin UI.

## What changes
- **`product-form-dialog.tsx`**: replace the disabled "Subir foto" button with a real file picker. On file select, show local preview. On form submit (create or edit), upload the image to the backend. For edit, also support immediate image replacement and removal.
- **`products-screen.tsx`**: small adjustment to handle image upload errors gracefully (don't roll back the product create if image upload fails — show a warning but keep the product).
- **No backend changes**. `POST/DELETE /api/admin/productos/:id/imagen` already exist.
- **No new types**. We reuse the existing `ApiProducto` (returned by upload) and `apiToAdminProduct` adapter.

## Upload flow

### Create product
1. User opens create dialog
2. User optionally clicks "Subir foto" → file picker (accept `image/jpeg, image/png, image/webp`)
3. On file selected → local preview via `URL.createObjectURL`
4. User fills rest of form, clicks "Crear producto"
5. Dialog calls `onSave(form)` (existing callback)
6. Parent (`products-screen`) does `POST /api/admin/productos` (existing)
7. **NEW**: if dialog has a pending file, it does `POST /api/admin/productos/:newId/imagen` with FormData
8. If upload fails, show non-blocking warning, keep the product
9. Dialog closes, list refreshes

### Edit product
1. User opens edit dialog with existing image
2. User clicks "Cambiar foto" or "Subir foto" → file picker
3. On file selected → immediate upload to `POST /api/admin/productos/:id/imagen`
4. Update form's `image` with returned `imagen_url`
5. User can also click "Quitar foto" → `DELETE /api/admin/productos/:id/imagen`
6. User clicks "Guardar cambios" → `PUT` with the rest of the form

## Constraints
- Max 5 MB per file (backend rejects larger)
- Allowed mime types: `image/jpeg, image/png, image/webp`
- Image gets converted to webp by backend, stored on Google Drive
- Image URL is `imagen_url` field on the product (returned by `findByIdAdmin`)

## Impact
- Affected files (frontend only):
  - `frontend/components/admin/product-form-dialog.tsx` (main change)
  - `frontend/components/admin/products-screen.tsx` (small: warn-on-image-fail, `onImageUploaded` callback)

## Out of scope
- Multiple images per product (backend supports only one)
- Image cropping in-browser (backend does the resize)
- Drag-and-drop upload
- Webcam capture
- Bulk image upload for many products at once
- Image removal audit log

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| File too large (>5MB) | Med | Client-side check before upload + show "Archivo demasiado grande (máx 5 MB)" |
| Wrong mime type | Med | Client-side `accept` attribute + server-side validation already exists |
| Image upload fails AFTER product is created | Med | Don't roll back product create; show a soft warning ("Producto creado, pero la imagen no se pudo subir") |
| Memory leak from `URL.createObjectURL` | Low | Revoke object URL on dialog close via `useEffect` cleanup |
| Concurrent uploads (user changes file twice quickly) | Low | Cancel previous upload; show "Subiendo…" indicator with disable on input |

## Rollback
Revert this change. Backend untouched.

## Dependencies
- `apiPostForm` already exists in `lib/api.ts`
- `apiDelete` already exists in `lib/api.ts`
- Backend `POST /api/admin/productos/:id/imagen` and `DELETE .../:id/imagen` already deployed

## Success criteria
- [ ] Create product with image: product is created, image is uploaded, list shows the product with the new image
- [ ] Edit product: replacing image updates `imagen_url` immediately
- [ ] Edit product: removing image clears `imagen_url`
- [ ] Create product without image: still works (uses icon fallback)
- [ ] File >5MB shows a clear error and doesn't crash
- [ ] File with wrong type is rejected by the file picker (via `accept` attribute)
- [ ] Local preview is shown immediately after file selection
- [ ] Object URL is revoked when the dialog closes (no memory leak)
- [ ] `pnpm build` passes
- [ ] No console errors

## Single-PR decision
Single PR. ~150 lines of changes in 2 files. No backend changes. Tight scope.
