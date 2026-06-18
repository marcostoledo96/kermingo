# Tasks: product-image-upload

> Single-PR implementation. Tasks are sequenced for minimal risk.

## Phase 1 — Component
- [ ] T1. Refactor `product-form-dialog.tsx`:
  - Add state: `pendingFile`, `previewUrl`, `uploadingImage`, `imageError`, `fileInputRef`
  - Replace disabled "Subir foto" button with hidden file input + visible trigger
  - Add `handleFileSelect` with client-side size validation (5 MB)
  - Show local preview via `URL.createObjectURL`
  - Revoke object URL on replace/unmount via `useEffect` cleanup
- [ ] T2. In edit mode, upload image immediately on file select (no waiting for form submit)
- [ ] T3. Add "Quitar foto" button in edit mode that calls `apiDelete('/api/admin/productos/:id/imagen')`
- [ ] T4. Change `onSave` callback signature to `Promise<AdminProduct>` — returns the saved product so the dialog can use its `id` for image upload
- [ ] T5. In `handleSubmit`, after `onSave` resolves, if creating and there's a `pendingFile`, upload it. If upload fails, set `imageError` (non-blocking) but still close the dialog.

## Phase 2 — Parent
- [ ] T6. Update `handleSave` in `products-screen.tsx` to return the saved `AdminProduct` (instead of `void`).

## Phase 3 — Verification
- [ ] T7. Smoke test: `pnpm build` passes.
- [ ] T8. Smoke test: dev server, login, navigate to /admin/productos. No console errors.
- [ ] T9. End-to-end manual smoke:
  - Create product with image → image appears in list
  - Edit product → replace image → image updates
  - Edit product → remove image → image gone
  - Try uploading 6MB file → see "Archivo demasiado grande" error
- [ ] T10. Mobile check: 360px viewport. File picker button reachable.

## Phase 4 — Archive
- [ ] T11. Move `openspec/changes/frontend-product-image-upload/` to `openspec/changes/archive/`.
- [ ] T12. Copy `specs/product-image-upload.md` to `openspec/specs/product-image-upload/spec.md`.
- [ ] T13. Write `ARCHIVED.md` with the change summary.

## Traceability

| Spec scenario | Tasks |
|---|---|
| REQ-IMG-001 | T1 |
| REQ-IMG-002 | T1, T5, T6 |
| REQ-IMG-003 | T1, T2 |
| REQ-IMG-004 | T1, T3 |
| REQ-IMG-005 | T1 |
| REQ-IMG-006 | T1 |
| REQ-IMG-007 | T1, T2 |
