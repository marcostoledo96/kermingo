'use client'

import { useEffect, useState } from 'react'
import { X, ImagePlus, Check } from 'lucide-react'
import type { MealCategory, ProductIcon, ProductType } from '@/lib/products'
import { ProductIconGlyph } from '@/components/menu/product-visual'

/* Producto enriquecido para el panel admin (incluye control de stock real). */
export type AdminProduct = {
  id: string
  name: string
  description: string
  price: number
  type: ProductType
  meals: MealCategory[]
  icon: ProductIcon
  image?: string
  active: boolean
  stockLimited: boolean
  stockCurrent: number
  stockMin: number
}

const ICON_OPTIONS: ProductIcon[] = [
  'pizza', 'sandwich', 'drumstick', 'sprout', 'cake', 'cookie', 'croissant',
  'donut', 'soda', 'water', 'coffee', 'milk', 'icecream', 'combo',
]

const TYPE_OPTIONS: { value: ProductType; label: string }[] = [
  { value: 'comida', label: 'Comida' },
  { value: 'bebida', label: 'Bebida' },
  { value: 'promo', label: 'Promo' },
]

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
  onSave,
  onClose,
}: {
  initial?: AdminProduct | null
  onSave: (product: AdminProduct) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<AdminProduct>(initial ?? emptyProduct())

  // Bloquear scroll de fondo mientras el diálogo está abierto.
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

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

  const canSave = form.name.trim().length >= 2 && form.price > 0 && form.meals.length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    onSave({ ...form, id: form.id || `prod-${Date.now()}` })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-[#003B73]/40 backdrop-blur-sm"
      />

      {/* Panel */}
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        {/* Header del diálogo */}
        <div className="flex items-center justify-between border-b border-[#75AADB]/20 bg-[#003B73] px-5 py-4 text-white">
          <h2 className="text-lg font-extrabold">
            {isEditing ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cuerpo scrolleable */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            {/* Imagen */}
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-[#EEF5FF] text-[#003B73]">
                {form.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.image || "/placeholder.svg"} alt="" className="h-full w-full rounded-2xl object-cover" />
                ) : (
                  <ProductIconGlyph icon={form.icon} className="h-9 w-9" strokeWidth={1.8} />
                )}
              </div>
              <div className="flex-1">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#003B73]/70">
                  Imagen
                </label>
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#75AADB]/50 bg-[#EEF5FF]/50 px-3 py-2.5 text-sm font-semibold text-[#003B73] transition-colors hover:bg-[#EEF5FF]"
                >
                  <ImagePlus className="h-4 w-4" />
                  Subir foto
                </button>
                <p className="mt-1 text-[11px] text-slate-400">Opcional. Mientras tanto se usa un ícono.</p>
              </div>
            </div>

            {/* Ícono (mientras no hay foto) */}
            <Field label="Ícono representativo">
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => set('icon', ic)}
                    aria-label={ic}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
                      form.icon === ic
                        ? 'border-[#003B73] bg-[#003B73] text-white'
                        : 'border-[#75AADB]/30 bg-white text-[#003B73] hover:border-[#75AADB]'
                    }`}
                  >
                    <ProductIconGlyph icon={ic} className="h-5 w-5" strokeWidth={2} />
                  </button>
                ))}
              </div>
            </Field>

            {/* Nombre */}
            <Field label="Nombre" required>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Ej: Pizza muzza"
                className="kermingo-input"
              />
            </Field>

            {/* Descripción */}
            <Field label="Descripción">
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Breve detalle del producto"
                className="kermingo-input resize-none"
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
                    placeholder="0"
                    className="kermingo-input pl-7"
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
                      className={`flex-1 rounded-xl border px-1 py-2.5 text-xs font-bold transition-all ${
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
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold capitalize transition-all ${
                        checked
                          ? 'border-[#F6B21A] bg-[#F6B21A]/15 text-[#9A6B00]'
                          : 'border-[#75AADB]/30 bg-white text-slate-500 hover:border-[#75AADB]'
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-md border ${
                          checked ? 'border-[#F6B21A] bg-[#F6B21A] text-white' : 'border-slate-300'
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
                      className="kermingo-input"
                    />
                  </Field>
                  <Field label="Alerta mínimo">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={form.stockMin}
                      onChange={(e) => set('stockMin', Number(e.target.value))}
                      className="kermingo-input"
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
              />
            </div>
          </div>

          {/* Acciones fijas */}
          <div className="flex gap-3 border-t border-[#75AADB]/20 bg-white px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-[#75AADB]/40 bg-white py-3.5 text-sm font-bold text-[#003B73] transition-colors hover:bg-[#EEF5FF]"
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
              {isEditing ? 'Guardar cambios' : 'Crear producto'}
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
}: {
  label: string
  hint?: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-bold text-[#003B73]">{label}</p>
        {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors ${
          value ? 'bg-[#003B73]' : 'bg-slate-300'
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
