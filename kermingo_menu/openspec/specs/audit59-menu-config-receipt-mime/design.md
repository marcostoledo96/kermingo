# Design: Kermingo audit59 P2/P3 follow-ups

## P2-1 — MenuScreen respects config loading/error

### Files
- `frontend/components/menu/menu-screen.tsx`

### Design
1. Read `loading` and `error` from the `useApiResource` for `storeConfig` (in addition to `data`).
2. Extend `isStoreDisabled` to be `true` when `storeConfigLoading || storeConfigError` OR store is closed/demo.
3. Keep `state` for products (loading/error/ready) but also show a separate banner when store config is loading or errored.
4. Add a "Reintentar" button bound to the `refetch` returned by `useApiResource`. The error banner explains "No pudimos verificar si la tienda está abierta".
5. FloatingCartBar already checks `isStoreDisabled`; just needs the new condition to flow through.
6. When products are loading, the existing spinner is shown. When products are ready but config is still loading, show the "Verificando tienda…" banner and disable cards.

### Edge cases
- `storeConfigError` could mean transient network failure. Use `refetch` and let user retry.
- If `storeConfig` is `null` and we are not loading and not errored (rare), treat as "ready" and not disabled. The `estado` field will be undefined which is not 'cerrada' nor 'demo'.

## P2-2 — Strict cross-check of receipt extension vs MIME

### Files
- `backend/src/api/middlewares/upload.middleware.js`
- `frontend/lib/receipt-validation.ts` (or wherever the frontend check lives — read first)

### Design
1. In `validateReceiptUploadMetadata`, after the supported-extension check, do:
   ```js
   const expected = ALLOWED_RECEIPT_EXTENSIONS[extension];
   if (file.mimetype && expected !== file.mimetype) {
     throw new ValidationError(`La extensión del archivo (${extension}) no coincide con el tipo declarado (${file.mimetype}).`);
   }
   ```
2. In frontend, replicate the same rule. Read the existing frontend validator first; if it does not cross-check, add a step that compares the file's `type` (MIME) against the extension's expected MIME, using a small `EXTENSION_TO_MIME` map.
3. Both sides already map `.jpg` and `.jpeg` to `image/jpeg`; the new code reuses that map.

### Edge cases
- Some browsers report empty MIME for unusual files; we already guard with `file.mimetype &&` truthy check.
- `image/jpg` is not a real MIME; we keep the alias `image/jpeg` only.

## P3-2 — Rename frontend package

### Files
- `frontend/package.json`

### Design
Replace `"name": "my-project"` with `"name": "kermingo-frontend"`. This is a metadata-only change.

## Test plan
- New frontend test: `frontend/test/menu-screen-config-loading.test.tsx`
  - Mock `useApiResource` to return `loading: true, data: undefined` for store config.
  - Assert: `ProductCard` is disabled (button has `disabled` attribute or click is a no-op).
  - Assert: "Verificando tienda…" or similar status text is shown.
- New frontend test: `frontend/test/receipt-validation-mismatch.test.tsx` (or extend existing)
  - Build a File with name `fake.png` and `type: 'image/jpeg'`.
  - Assert: validator returns false / throws with the expected error.
- New backend test in `tests/comprobantes.unit.test.js`:
  - Mock a `file` with `originalname: 'fake.png'` and `mimetype: 'image/jpeg'`.
  - Call `validateReceiptUploadMetadata(file)` and expect it to throw `ValidationError` mentioning the mismatch.
  - Positive case: `originalname: 'ok.jpg'`, `mimetype: 'image/jpeg'` does NOT throw.

## Workload estimate
- Changed files: 3–4
- Estimated changed lines: 60–100
- 400-line budget risk: **Low**
- Chained PRs: **No** — single PR

## Change log
- 2026-06-17: archived from openspec/changes/audit59-p2p3-fixes
