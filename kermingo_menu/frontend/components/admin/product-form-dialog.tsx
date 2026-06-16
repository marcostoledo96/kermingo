'use client'

import { useEffect, useRef, useState } from 'react'
import { X, ImagePlus, Check, Loader2, Trash2 } from 'lucide-react'
import type { MealCategory, ProductIcon, ProductType } from '@/lib/products'
import { ProductIconGlyph } from '@/components/menu/product-visual'
import type { AdminProduct } from '@/lib/admin'
import { apiDelete, apiPostForm, ApiError } from '@/lib/api'
import { ABSOLUTE_IMAGE_URL } from '@/lib/config'
import type { ApiProducto } from '@/lib/types'

const ICON_OPTIONS: ProductIcon[] = [
  'pizza', 'sandwich', 'drumstick', 'sprout', 'cake', 'cookie', 'croissant',
  'donut', 'soda', 'water', 'coffee', 'milk', 'icecream', 'combo',
]

const TYPE_OPTIONS: { value: ProductType; label: string }[] = [
  { value: 'comida', label: 'Comida' },
  { value: 'bebida', label: 'Bebida' },
  { value: 'promo', label: 'Promo' },
]

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ACCEPT_MIME = 'image/jpeg,image/png,image/webp'

const emptyProduct = (): AdminProduct => ({
  id: '',
  name: '',
  description: '',
  price: 0,
  type: 'comida',
  meals: ['cena'],
  icon: 'pizza',
  active: true,
  stockLimited: true,
  stockCurrent: 20,
  stockMin: 5,
})

export function ProductFormDialog({
  initial,
  submitting = false,
  error = null,
  onSave,
  onClose,
}: {
  initial?: AdminProduct | null
  submitting?: boolean
  error?: string | null
  onSave: (product: AdminProduct) => Promise<AdminProduct>
  onClose: () => void
}) {
  const [form, setForm] = useState<AdminProduct>(initial ?? emptyProduct())

  // Image state
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(initial?.image ?? null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  // Local submit error (e.g. "Producto creado pero la imagen no se pudo subir")
  // merges with the parent's `error` prop for display.
  const [localSubmitError, setLocalSubmitError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const displayedError = error ?? localSubmitError

  // Lock body scroll while dialog is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Cleanup object URL when preview changes or unmounts
  useEffect(() => {
    if (!previewUrl) return
    if (!previewUrl.startsWith('blob:')) return
    return () => {
      URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const isEditing = Boolean(initial?.id)
  const set = <K extends keyof AdminProduct>(key: K, value: AdminProduct[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const toggleMeal = (meal: MealCategory) =>
    setForm((f) => ({
      ...f,
      meals: f.meals.includes(meal)
        ? f.meals.filter((m) => m !== meal)
        : [...f.meals, meal],
    }))

  const canSave =
    form.name.trim().length >= 2 && form.price > 0 && form.meals.length > 0 && !submitting && !uploadingImage

  const openFilePicker = () => {
    if (submitting || uploadingImage) return
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Reset input value so picking the same file twice fires onChange again
    e.target.value = ''
    if (!file) return

    setImageError(null)
    if (file.size > MAX_FILE_SIZE) {
      setImageError('Archivo demasiado grande (máx 5 MB)')
      return
    }
    if (!ACCEPT_MIME.split(',').includes(file.type)) {
      setImageError('Tipo de archivo no soportado. Solo JPG, PNG y WEBP.')
      return
    }

    // Local preview
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)

    if (isEditing && form.id) {
      // Edit mode: upload immediately
      setUploadingImage(true)
      try {
        const updated = await uploadImage(form.id, file)
        const absoluteUrl = ABSOLUTE_IMAGE_URL(updated.imagen_url)
        setForm((f) => ({ ...f, image: absoluteUrl }))
        // Keep object URL as fallback while the absolute URL loads
        setPreviewUrl(absoluteUrl ?? objectUrl)
        setPendingFile(null)
      } catch (err) {
        setImageError(
          err instanceof ApiError ? err.message : 'No se pudo subir la imagen',
        )
      } finally {
        setUploadingImage(false)
      }
    } else {
      // Create mode: keep file for upload after create
      setPendingFile(file)
    }
  }

  const handleRemoveImage = async () => {
    if (!isEditing || !form.id) {
      // Create mode: just clear local state
      setPendingFile(null)
      setPreviewUrl(null)
      setImageError(null)
      return
    }
    setUploadingImage(true)
    setImageError(null)
    try {
      const updated = await deleteImage(form.id)
      setForm((f) => ({ ...f, image: ABSOLUTE_IMAGE_URL(updated.imagen_url) }))
      setPreviewUrl(ABSOLUTE_IMAGE_URL(updated.imagen_url) ?? null)
    } catch (err) {
      setImageError(
        err instanceof ApiError ? err.message : 'No se pudo quitar la imagen',
      )
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    setLocalSubmitError(null)
    try {
      const saved = await onSave({ ...form, id: form.id || `prod-${Date.now()}` })

      // Create mode with pending file: upload now
      if (!isEditing && pendingFile && saved.id && !saved.id.startsWith('prod-')) {
        try {
          await uploadImage(saved.id, pendingFile)
        } catch (err) {
          // Non-blocking: show warning but proceed
          setLocalSubmitError(
            err instanceof ApiError
              ? `Producto creado, pero la imagen no se pudo subir: ${err.message}`
              : 'Producto creado, pero la imagen no se pudo subir',
          )
          // Don't return — close the dialog anyway
        }
      }
      onClose()
    } catch (err) {
      setLocalSubmitError(
        err instanceof ApiError ? err.message : 'No se pudo guardar el producto',
      )
    }
    // Note: `submitting` is owned by the parent (products-screen). When the
    // parent's `onSave` is in flight, the parent has `submitting=true`, which
    // disables this form's submit button via the `submitting` prop.
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        aria-label="Cerrar"
        onClick={onClose}
        disabled={submitting || uploadingImage}
        className="absolute inset-0 bg-[#003B73]/40 backdrop-blur-sm"
      />

      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-[#75AADB]/20 bg-[#003B73] px-5 py-4 text-white">
          <h2 className="text-lg font-extrabold">
            {isEditing ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button
            onClick={onClose}
            disabled={submitting || uploadingImage}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            {displayedError && (
              <div className="rounded-xl border px-4 py-3 text-sm font-medium" style={{ borderColor: 'var(--km-peligro-bg)', background: 'var(--km-peligro-bg)', color: 'var(--km-peligro-text)' }}>
                {displayedError}
              </div>
            )}

            {/* Imagen */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#003B73]/70">
                Foto del producto
              </label>
              <div className="flex items-start gap-3">
                <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#EEF5FF] text-[#003B73]">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ProductIconGlyph icon={form.icon} className="h-10 w-10" strokeWidth={1.8} />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT_MIME}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={openFilePicker}
                    disabled={uploadingImage || submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#75AADB]/50 bg-[#EEF5FF]/50 px-3 py-2.5 text-sm font-semibold text-[#003B73] transition-colors hover:bg-[#EEF5FF] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Subiendo…
                      </>
                    ) : (
                      <>
                        <ImagePlus className="h-4 w-4" />
                        {previewUrl ? 'Cambiar foto' : 'Subir foto'}
                      </>
                    )}
                  </button>
                  {previewUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      disabled={uploadingImage || submitting}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-semibold transition-colors hover:bg-[var(--km-peligro-bg)] disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ borderColor: 'var(--km-peligro-bg)', color: 'var(--km-peligro-text)' }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Quitar foto
                    </button>
                  )}
                  <p className="text-[11px] text-[#003B73]/40">JPG, PNG o WEBP. Máximo 5 MB.</p>
                </div>
              </div>
              {imageError && (
                <p className="text-xs font-medium" style={{ color: 'var(--km-peligro-text)' }}>{imageError}</p>
              )}
            </div>

            {/* Ícono (mientras no hay foto) */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#003B73]/70">
                Ícono representativo
              </label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => set('icon', ic)}
                    disabled={submitting || uploadingImage}
                    aria-label={ic}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all disabled:opacity-50 ${
                      form.icon === ic
                        ? 'border-[#003B73] bg-[#003B73] text-white'
                        : 'border-[#75AADB]/30 bg-white text-[#003B73] hover:border-[#75AADB]'
                    }`}
                  >
                    <ProductIconGlyph icon={ic} className="h-5 w-5" strokeWidth={2} />
                  </button>
                ))}
              </div>
            </div>

            {/* Nombre */}
            <Field label="Nombre" required>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                disabled={submitting || uploadingImage}
                placeholder="Ej: Pizza muzza"
                className="kermingo-input disabled:opacity-60"
              />
            </Field>

            {/* Descripción */}
            <Field label="Descripción">
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                disabled={submitting || uploadingImage}
                placeholder="Breve detalle del producto"
                className="kermingo-input resize-none disabled:opacity-60"
              />
            </Field>

            {/* Precio + tipo */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Precio" required>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#75AADB]">$</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={form.price || ''}
                    onChange={(e) => set('price', Number(e.target.value))}
                    disabled={submitting || uploadingImage}
                    placeholder="0"
                    className="kermingo-input pl-7 disabled:opacity-60"
                  />
                </div>
              </Field>
              <Field label="Tipo">
                <div className="flex gap-1.5">
                  {TYPE_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => set('type', t.value)}
                      disabled={submitting || uploadingImage}
                      className={`flex-1 rounded-xl border px-1 py-2.5 text-xs font-bold transition-all disabled:opacity-50 ${
                        form.type === t.value
                          ? 'border-[#003B73] bg-[#003B73] text-white'
                          : 'border-[#75AADB]/30 bg-white text-[#003B73] hover:border-[#75AADB]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            {/* Categorías de momento */}
            <Field label="Disponible en" required>
              <div className="flex gap-2">
                {(['merienda', 'cena'] as MealCategory[]).map((meal) => {
                  const checked = form.meals.includes(meal)
                  return (
                    <button
                      key={meal}
                      type="button"
                      onClick={() => toggleMeal(meal)}
                      disabled={submitting || uploadingImage}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold capitalize transition-all disabled:opacity-50 ${
                        checked
                          ? 'border-[#F6B21A] bg-[#F6B21A]/15 text-[#9A6B00]'
                           : 'border-[#75AADB]/30 bg-white text-[#003B73]/50 hover:border-[#75AADB]'
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-md border ${
                          checked ? 'border-[#F6B21A] bg-[#F6B21A] text-white' : 'border-[#75AADB]/40'
                        }`}
                      >
                        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      {meal}
                    </button>
                  )
                })}
              </div>
            </Field>

            {/* Stock */}
            <div className="rounded-2xl border border-[#75AADB]/20 bg-[#EEF5FF]/40 p-4">
              <ToggleRow
                label="Stock limitado"
                hint="Si está apagado, el producto nunca se agota."
                value={form.stockLimited}
                onChange={(v) => set('stockLimited', v)}
                disabled={submitting || uploadingImage}
              />
              {form.stockLimited && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Field label="Stock actual">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={form.stockCurrent}
                      onChange={(e) => set('stockCurrent', Number(e.target.value))}
                      disabled={submitting || uploadingImage}
                      className="kermingo-input disabled:opacity-60"
                    />
                  </Field>
                  <Field label="Alerta mínimo">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={form.stockMin}
                      onChange={(e) => set('stockMin', Number(e.target.value))}
                      disabled={submitting || uploadingImage}
                      className="kermingo-input disabled:opacity-60"
                    />
                  </Field>
                </div>
              )}
            </div>

            {/* Activo */}
            <div className="rounded-2xl border border-[#75AADB]/20 bg-white p-4">
              <ToggleRow
                label="Producto activo"
                hint="Los desactivados no aparecen en el menú público."
                value={form.active}
                onChange={(v) => set('active', v)}
                disabled={submitting || uploadingImage}
              />
            </div>
          </div>

          <div className="flex gap-3 border-t border-[#75AADB]/20 bg-white px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting || uploadingImage}
              className="flex-1 rounded-2xl border border-[#75AADB]/40 bg-white py-3.5 text-sm font-bold text-[#003B73] transition-colors hover:bg-[#EEF5FF] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className={`flex-[1.4] rounded-2xl py-3.5 text-sm font-extrabold transition-all ${
                canSave
                  ? 'bg-[#F6B21A] text-[#003B73] shadow-lg shadow-[#F6B21A]/30 hover:bg-[#ffbe2e] active:scale-[0.99]'
                  : 'cursor-not-allowed bg-[#E2E8F0] text-[#94A3B8]'
              }`}
            >
              {submitting ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wide text-[#003B73]/70">
        {label}
        {required && <span className="ml-0.5 text-[#F6B21A]">*</span>}
      </label>
      {children}
    </div>
  )
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string
  hint?: string
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-bold text-[#003B73]">{label}</p>
        {hint && <p className="text-[11px] text-[#003B73]/40">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        disabled={disabled}
        className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          value ? 'bg-[#003B73]' : 'bg-[#75AADB]/40'
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

// Image upload helpers ----------------------------------------------------

async function uploadImage(productId: string, file: File): Promise<ApiProducto> {
  const formData = new FormData()
  formData.append('imagen', file)
  return apiPostForm<ApiProducto>(`/api/admin/productos/${productId}/imagen`, formData)
}

async function deleteImage(productId: string): Promise<ApiProducto> {
  return apiDelete<ApiProducto>(`/api/admin/productos/${productId}/imagen`)
}
