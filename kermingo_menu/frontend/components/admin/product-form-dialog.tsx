
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { X, ImagePlus, Check, Loader2, Trash2, Plus } from 'lucide-react'
import type { MealCategory, ProductIcon, ProductType } from '@/lib/products'
import { ProductIconGlyph } from '@/components/menu/product-visual'
import { apiToAdminProduct, type AdminProduct, type Componente, fetchComponentes, saveComponentes } from '@/lib/admin'
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
  available: true,
  order: 0,
  stockLimited: true,
  stockCurrent: 20,
  stockMin: 5,
})

export function ProductFormDialog({
  initial,
  allProducts = [],
  submitting = false,
  error = null,
  onSave,
  onClose,
  onProductUpdated,
}: {
  initial?: AdminProduct | null
  allProducts?: AdminProduct[]
  submitting?: boolean
  error?: string | null
  onSave: (product: AdminProduct) => Promise<AdminProduct>
  onClose: () => void
  onProductUpdated?: (product: AdminProduct) => void
}) {
  const [form, setForm] = useState<AdminProduct>(initial ?? emptyProduct())
  const [stockCurrentInput, setStockCurrentInput] = useState(() => String((initial ?? emptyProduct()).stockCurrent))
  const [stockMinInput, setStockMinInput] = useState(() => String((initial ?? emptyProduct()).stockMin))

  // Promo component state
  const [componentes, setComponentes] = useState<Componente[]>([])
  const [loadingComponentes, setLoadingComponentes] = useState(false)
  const [componentError, setComponentError] = useState<string | null>(null)
  const [hadInitialComponentes, setHadInitialComponentes] = useState(false)
  const [componentesDirty, setComponentesDirty] = useState(false)
  const [newComponentId, setNewComponentId] = useState('')
  const [newComponentQty, setNewComponentQty] = useState(1)

  const componentProducts = useMemo(
    () =>
      allProducts
        .filter((p) => p.type !== 'promo' && p.id !== form.id)
        .sort((a, b) => a.name.localeCompare(b.name, 'es-AR', { sensitivity: 'base' })),
    [allProducts, form.id],
  )

  // Load components when editing a promo
  useEffect(() => {
    if (form.type !== 'promo') {
      setComponentes([])
      setComponentError(null)
      setHadInitialComponentes(false)
      setComponentesDirty(false)
      return
    }

    if (!form.id || form.id.startsWith('prod-')) {
      setLoadingComponentes(false)
      setComponentError(null)
      setComponentes([])
      setHadInitialComponentes(false)
      setComponentesDirty(false)
      return
    }

    setLoadingComponentes(true)
    setComponentError(null)
    setComponentesDirty(false)
    fetchComponentes(Number(form.id))
      .then((next) => {
        setComponentes(next)
        setHadInitialComponentes(next.length > 0)
        setComponentesDirty(false)
      })
      .catch((err) => {
        setComponentError(err instanceof ApiError ? err.message : 'No se pudieron cargar los componentes')
      })
      .finally(() => setLoadingComponentes(false))
  }, [form.id, form.type])

  // Keep component selection in sync when type changes.
  useEffect(() => {
    if (form.type !== 'promo') {
      setNewComponentId('')
      setNewComponentQty(1)
      setComponentesDirty(false)
      setHadInitialComponentes(false)
    }
  }, [form.type])

  const markComponentesTouched = () => setComponentesDirty(true)

  const addComponent = () => {
    const productoId = Number(newComponentId)
    const cantidad = Math.max(1, Number.parseInt(String(newComponentQty), 10) || 0)
    if (!Number.isFinite(productoId) || productoId <= 0 || cantidad <= 0) return

    const baseProduct = componentProducts.find((p) => p.id === newComponentId)
    if (!baseProduct) return

    setComponentError(null)

    setComponentes((prev) => {
      const index = prev.findIndex((c) => c.productoId === productoId)
      if (index >= 0) {
        return prev.map((c) =>
          c.productoId === productoId
            ? {
                ...c,
                nombre: baseProduct.name,
                cantidad: c.cantidad + cantidad,
                activo: baseProduct.active,
                disponible: baseProduct.available,
                stockLimited: baseProduct.stockLimited,
                stockActual: baseProduct.stockCurrent,
              }
            : c,
        )
      }
      return [
        ...prev,
        {
          productoId,
          nombre: baseProduct.name,
          cantidad,
          activo: baseProduct.active,
          disponible: baseProduct.available,
          stockLimited: baseProduct.stockLimited,
          stockActual: baseProduct.stockCurrent,
        },
      ]
    })

    setNewComponentId('')
    setNewComponentQty(1)
    markComponentesTouched()
  }

  const updateComponentQuantity = (productoId: number, rawQuantity: string) => {
    const cantidad = Number.parseInt(rawQuantity, 10)
    setComponentes((prev) =>
      prev.map((c) =>
        c.productoId === productoId
          ? { ...c, cantidad: Number.isNaN(cantidad) ? 1 : Math.max(1, cantidad) }
        : c,
      ),
    )
    markComponentesTouched()
  }

  const removeComponent = (productoId: number) => {
    setComponentes((prev) => prev.filter((c) => c.productoId !== productoId))
    markComponentesTouched()
  }

  const savePayload = componentes.map((c) => ({ producto_id: c.productoId, cantidad: c.cantidad }))

  const isPromoUnavailableWithoutComponents = form.type === 'promo' && form.available && componentes.length === 0

  const maybeResetNewComponentQty = (value: number) => {
    const next = Number.parseInt(String(value), 10)
    setNewComponentQty(Number.isNaN(next) ? 1 : Math.max(1, next))
  }

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
    if (isPromoUnavailableWithoutComponents) {
      setLocalSubmitError('La promo necesita componentes antes de estar disponible.')
      return
    }
    setLocalSubmitError(null)
    setImageError(null)
    try {
      const normalizedForm = {
        ...form,
        stockCurrent: stockCurrentInput === '' ? 0 : form.stockCurrent,
        stockMin: stockMinInput === '' ? 0 : form.stockMin,
      }
      const shouldEnableAfterComponentSave =
        normalizedForm.type === 'promo' &&
        normalizedForm.available &&
        componentes.length > 0 &&
        !hadInitialComponentes
      const productForFirstSave = shouldEnableAfterComponentSave
        ? { ...normalizedForm, available: false }
        : normalizedForm
      let saved = await onSave({ ...productForFirstSave, id: productForFirstSave.id || `prod-${Date.now()}` })

      // Create mode with pending file: upload now
      if (!isEditing && pendingFile && saved.id && !saved.id.startsWith('prod-')) {
        setUploadingImage(true)
        try {
          const uploaded = await uploadImage(saved.id, pendingFile)
          const updatedProduct = apiToAdminProduct(uploaded)
          setForm((f) => ({ ...f, ...updatedProduct }))
          setPreviewUrl(updatedProduct.image ?? null)
          setPendingFile(null)
          onProductUpdated?.(updatedProduct)
        } catch (err) {
          // Keep dialog open so admin can retry uploading image.
          setLocalSubmitError(
            err instanceof ApiError
              ? `Producto creado, pero la imagen no se pudo subir: ${err.message}`
              : 'Producto creado, pero la imagen no se pudo subir',
          )
          return
        } finally {
          setUploadingImage(false)
        }
      }

        const shouldPersistComponentes =
          form.type === 'promo' &&
          !!saved.id &&
          !saved.id.startsWith('prod-') &&
          (componentes.length > 0 || hadInitialComponentes || componentesDirty)

        // Save promo components if type is promo and product has an ID.
        // For existing promos (or promos already loaded from backend), empty payload
        // means clear components explicitly.
        if (shouldPersistComponentes) {
          try {
            const payload = componentes.length > 0 ? savePayload : []
            const savedComponents = await saveComponentes(Number(saved.id), payload)
            setComponentes(savedComponents)
            onProductUpdated?.({ ...saved, componentesCount: savedComponents.length })
            if (shouldEnableAfterComponentSave) {
              saved = await onSave({ ...saved, available: true, componentesCount: savedComponents.length })
              onProductUpdated?.(saved)
            }
          } catch (err) {
            // Component save failed — keep form data visible, don't close
            setComponentError(
              err instanceof ApiError ? err.message : 'No se pudieron guardar los componentes',
            )
            return
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
                      value={stockCurrentInput}
                      aria-label="Stock actual"
                      onChange={(e) => {
                        const value = e.target.value
                        setStockCurrentInput(value)
                        if (value !== '') set('stockCurrent', Math.max(0, Number(value)))
                      }}
                      disabled={submitting || uploadingImage}
                      className="kermingo-input disabled:opacity-60"
                    />
                  </Field>
                  <Field label="Alerta mínimo">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={stockMinInput}
                      aria-label="Alerta mínimo"
                      onChange={(e) => {
                        const value = e.target.value
                        setStockMinInput(value)
                        if (value !== '') set('stockMin', Math.max(0, Number(value)))
                      }}
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

            {/* Disponible */}
            <div className="rounded-2xl border border-[#75AADB]/20 bg-white p-4">
              <ToggleRow
                label="Disponible para pedir"
                hint="Si está desactivado, el producto se muestra en el menú pero no se puede comprar."
                value={form.available}
                onChange={(v) => set('available', v)}
                disabled={submitting || uploadingImage}
              />
              {!form.available && (
                <p className="mt-2 text-xs font-medium text-[#8a5d00]">
                  Los clientes verán el producto con la etiqueta "Todavía no disponible".
                </p>
              )}
              {form.type === 'promo' && form.available && componentes.length === 0 && (
                <p className="mt-1 text-xs font-medium" style={{ color: 'var(--km-peligro-text)' }}>
                  La promo necesita componentes antes de estar disponible.
                </p>
              )}
            </div>

            {/* Componentes de promo */}
            {form.type === 'promo' && (
              <div className="rounded-2xl border border-[#75AADB]/20 bg-white p-4">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#003B73]/70">
                  Componentes
                </label>
                <div className="mb-3 space-y-2">
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                    <label className="sr-only" htmlFor="component-producto">
                      Producto
                    </label>
                    <select
                      id="component-producto"
                      value={newComponentId}
                      onChange={(e) => setNewComponentId(e.target.value)}
                      disabled={submitting || uploadingImage || loadingComponentes}
                      className="kermingo-input min-h-10 bg-white"
                    >
                      <option value="">Seleccioná un producto</option>
                      {componentProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>

                    <label className="sr-only" htmlFor="component-cantidad">
                      Cantidad
                    </label>
                    <input
                      id="component-cantidad"
                      type="number"
                      min={1}
                      value={newComponentQty}
                      onChange={(e) => {
                        maybeResetNewComponentQty(Number(e.target.value))
                      }}
                      disabled={submitting || uploadingImage || !newComponentId}
                      className="kermingo-input min-h-10 sm:w-20"
                    />

                    <button
                      type="button"
                      onClick={addComponent}
                      disabled={submitting || uploadingImage || !newComponentId || newComponentQty <= 0}
                      className="flex shrink-0 items-center justify-center gap-1 rounded-xl border border-[#75AADB]/40 bg-[#EEF5FF]/70 px-3 py-2.5 text-xs font-bold text-[#003B73] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar
                    </button>
                  </div>
                </div>

                {componentError && (
                  <div className="mb-2 rounded-lg px-3 py-2 text-sm font-medium" style={{ background: 'var(--km-peligro-bg)', color: 'var(--km-peligro-text)' }}>
                    {componentError}
                  </div>
                )}
                {loadingComponentes ? (
                  <div className="flex items-center gap-2 py-2 text-sm text-[#003B73]/50">
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} />
                    Cargando componentes…
                  </div>
                ) : componentes.length === 0 ? (
                  <p className="py-2 text-sm text-[#003B73]/50">
                    Esta promo no tiene componentes configurados.
                  </p>
                ) : (
                  <ul className="space-y-2">
                     {componentes.map((c) => (
                       <li key={c.productoId} className="flex items-center justify-between gap-2 rounded-xl border border-[#75AADB]/20 bg-[#EEF5FF]/30 px-3 py-2">
                         <div className="min-w-0">
                           <p className="text-sm font-semibold text-[#003B73]">{c.nombre}</p>
                           <div className="mt-1 flex items-center gap-2">
                             <label className="text-xs text-[#003B73]/70" htmlFor={`component-qty-${c.productoId}`}>
                               Cantidad
                             </label>
                             <input
                               id={`component-qty-${c.productoId}`}
                               type="number"
                               min={1}
                               value={c.cantidad}
                               onChange={(event) => updateComponentQuantity(c.productoId, event.target.value)}
                               disabled={submitting || uploadingImage}
                               className="h-8 w-16 rounded-lg border border-[#75AADB]/40 px-2 text-sm"
                             />
                           </div>
                           <p className="text-xs text-[#003B73]/50">
                             {!c.activo && 'Desactivado'}
                             {(!c.activo && c.disponible) ? ' · ' : ''}
                             {!c.disponible && 'No disponible'}
                           </p>
                         </div>
                         <button
                           type="button"
                           onClick={() => removeComponent(c.productoId)}
                           disabled={submitting || uploadingImage}
                           aria-label="Quitar"
                           className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--km-peligro-bg)] text-[var(--km-peligro-text)] transition-colors hover:bg-[var(--km-peligro-bg)] disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" strokeWidth={2.2} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
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
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 pr-2">
        <p className="text-sm font-bold text-[#003B73]">{label}</p>
        {hint && <p className="text-[11px] text-[#003B73]/40">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        disabled={disabled}
        className={`relative h-8 w-14 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          value ? 'bg-[#003B73]' : 'bg-[#75AADB]/40'
        }`}
      >
        <span
          className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-6' : 'translate-x-0'
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
