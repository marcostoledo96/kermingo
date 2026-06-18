# Design: product-image-upload

## 1. Architecture
- **No backend changes**. The endpoints already exist.
- **State lives in the dialog**, not the parent. The dialog has a `pendingFile: File | null` and a `uploading: boolean` state.
- **Preview is local** (object URL) until the upload completes; then replaced with the server URL.
- **Object URL cleanup** on dialog close via `useEffect`.

## 2. Component changes

### 2.1 product-form-dialog.tsx
- New state:
  ```ts
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)  // either object URL or server URL
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  ```
- `handleFileSelect(file: File)`:
  - Validate size ≤ 5 MB → set error if not.
  - If size OK, revoke any existing preview URL, set new one.
  - In **edit mode** (form has a real numeric `id`), immediately upload via `apiPostForm`.
  - In **create mode**, just keep the file in state for later upload.
- `useEffect` cleanup: revoke `previewUrl` if it's an object URL (we can detect via a ref or by tracking if we just created it).
- `handleRemoveImage()`: in **edit mode**, call `apiDelete('/api/admin/productos/:id/imagen')`; clear `form.image` and `pendingFile`. In **create mode**, just clear local state.
- `onSave(form)` (existing) now also receives a `pendingFile` and uploads it after product creation. The parent (`products-screen`) will need to know about the pendingFile.

**Key decision**: how to pass `pendingFile` to the parent's `onSave`?
- **Option A**: pass the file as a 2nd arg to `onSave(form, pendingFile)`. The parent uploads after create.
- **Option B**: have the dialog itself call the API to create the product, upload the image, and call `onSave` with the final `AdminProduct` (which the parent will add to its list). This is cleaner because the parent doesn't need to know about FormData.

Going with **Option B**. The dialog does:
```ts
async function handleSubmit(e) {
  e.preventDefault()
  if (!canSave || submitting) return
  setSubmitting(true)
  setSubmitError(null)
  try {
    // 1. Save product
    const saved = await onSave(form)  // parent does POST or PUT, returns the saved AdminProduct
    // 2. If creating and there's a pending file, upload it
    if (isCreating && pendingFile && saved.id) {
      try {
        await uploadImage(saved.id, pendingFile)
      } catch (err) {
        setImageError('Producto creado, pero la imagen no se pudo subir')
        // Don't fail the whole flow
      }
    }
    onClose()
  } catch (err) {
    setSubmitError(...)
  } finally {
    setSubmitting(false)
  }
}
```

For the parent to return the saved product, we change the signature of `onSave` from `(product: AdminProduct) => void` to `(product: AdminProduct) => Promise<AdminProduct>`. This is a small breaking change to the `onSave` callback but it's internal to the parent.

### 2.2 products-screen.tsx
- Change `handleSave` to return the saved `AdminProduct`:
  ```ts
  const handleSave = async (product: AdminProduct): Promise<AdminProduct> => {
    // ... existing logic
    return apiToAdminProduct(created)  // or updated
  }
  ```
- No other changes needed.

## 3. Image upload helper

```ts
// In product-form-dialog.tsx (or lib/admin.ts)
async function uploadImage(productId: string, file: File): Promise<ApiProducto> {
  const formData = new FormData()
  formData.append('imagen', file)
  return apiPostForm<ApiProducto>(`/api/admin/productos/${productId}/imagen`, formData)
}

async function deleteImage(productId: string): Promise<ApiProducto> {
  return apiDelete<ApiProducto>(`/api/admin/productos/${productId}/imagen`)
}
```

I'll keep these as private functions in the dialog file (only used there).

## 4. UI states

### Image area (in dialog)
```
┌─────────────────────────────────────┐
│         [img preview]               │
│                                     │
│  [Subir foto] [Quitar foto]        │
│                                     │
│  Subiendo… (if uploading)          │
│  Error message (if any)            │
└─────────────────────────────────────┘
```

- If `previewUrl` is null (no image, no pending file): show only "Subir foto" button
- If `previewUrl` is set (image exists or pending file): show image + "Cambiar foto" + "Quitar foto"
- During upload: disable both buttons, show "Subiendo…" text
- On error: show inline error above the buttons

## 5. Object URL lifecycle

```ts
useEffect(() => {
  return () => {
    // Cleanup: revoke any object URL we created
    if (previewUrlRef.current && previewUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrlRef.current)
    }
  }
}, [])
```

But this only runs on unmount. The `previewUrl` is in state, so the cleanup is straightforward. Actually, since `useEffect(() => { ... return cleanup }, [])` only fires on unmount, the cleanup is correct.

Wait, we also need to revoke the URL when we replace it with a new one. So:
```ts
useEffect(() => {
  if (previewUrl && previewUrl.startsWith('blob:')) {
    return () => URL.revokeObjectURL(previewUrl)
  }
}, [previewUrl])
```

This way, when `previewUrl` changes, the previous object URL is revoked.

## 6. File size validation

```ts
const MAX_FILE_SIZE = 5 * 1024 * 1024  // 5 MB

function handleFileSelect(file: File) {
  if (file.size > MAX_FILE_SIZE) {
    setImageError('Archivo demasiado grande (máx 5 MB)')
    return
  }
  // ...
}
```

## 7. Why a single PR
- 2 files, ~150 lines.
- No backend changes.
- Self-contained: image upload is a single feature.
- Test plan: open form, upload image, see it appear.
