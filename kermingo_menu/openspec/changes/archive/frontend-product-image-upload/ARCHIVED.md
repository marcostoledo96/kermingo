# Archived: frontend-product-image-upload

**Date:** 2026-06-14
**Status:** ARCHIVED — verdict PASS

## Summary
- Created: `openspec/specs/product-image-upload/spec.md` (durable capability for product image upload)
- Replaced the disabled "Subir foto" stub with a real file picker
- 2 frontend files modified, 0 backend changes
- `pnpm build` 14/14 static pages
- E2E smoke tested: real PNG upload, mime-type rejection, delete, all 200 OK

## Verified E2E operations
1. POST /api/admin/productos/24/imagen (PNG) → 200, imagen_url=`/api/productos/24/imagen?v=281`
2. Backend auto-converts to image/webp on Google Drive
3. POST with bad mime type → 400 "Tipo de archivo no soportado"
4. DELETE /api/admin/productos/24/imagen → 200, imagen_url=None

## Out of Scope (next changes)
- Multiple images per product
- Image cropping in-browser
- Drag-and-drop upload
- Webcam capture
- Bulk upload for many products at once
