'use client'

import { ChangeEvent, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ClipboardCheck,
  ArrowLeftRight,
  Copy,
  Check,
  UploadCloud,
  FileCheck2,
  X,
  Wallet,
  ArrowLeft,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { formatPrice } from '@/lib/products'
import { useCart } from './cart-context'
import { MenuHeader } from './menu-header'
import { ProductIconGlyph } from './product-visual'
import { apiGet, apiPostForm, ApiError } from '@/lib/api'
import { mapPedido } from '@/lib/mappers'
import type { ApiConfiguracion, ApiPedido } from '@/lib/types'
import type { LastOrder } from '@/lib/products'
import { useApiResource } from '@/lib/use-api-resource'

const BANK_DETAILS: { label: string; value: string; copyable?: boolean }[] = [
  { label: 'Nombre completo', value: 'Guadalupe Sofía Hryb Alvarez' },
  { label: 'Banco', value: 'Brubank' },
  { label: 'CBU', value: '1430001713038182530011', copyable: true },
  { label: 'Alias', value: 'evento.kermingo', copyable: true },
  { label: 'Nº de cuenta', value: '1303818253001', copyable: true },
  { label: 'CUIT', value: '27-45689712-1', copyable: true },
]

const LAST_ORDER_KEY = 'kermingo:lastOrder'
const LAST_TOKEN_KEY = 'kermingo:lastToken'
const MAX_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_RECEIPT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]
const ALLOWED_RECEIPT_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf'])

export function CheckoutScreen() {
  const router = useRouter()
  const { items, count, total, clear } = useCart()
  const { data: storeConfig, loading: storeConfigLoading, error: storeConfigError } = useApiResource<ApiConfiguracion>(async () => {
    return apiGet<ApiConfiguracion>('/api/configuracion-tienda')
  })
  const [copied, setCopied] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [table, setTable] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [receiptError, setReceiptError] = useState<string | null>(null)

  const nameComplete = name.trim().length >= 2
  const receiptComplete = receipt !== null
  const isStoreClosedOrDemo =
    storeConfig?.estado === 'cerrada' || storeConfig?.estado === 'demo'
  const storeClosedMessage =
    storeConfig?.estado === 'cerrada'
      ? 'La tienda está cerrada. No se aceptan nuevos pedidos por ahora.'
      : storeConfig?.estado === 'demo'
        ? 'La tienda está en modo demo. Esta pantalla no acepta pedidos reales por ahora.'
        : ''
  const disabledMessage = storeConfig?.mensaje_publico?.trim() || storeClosedMessage
  const isStoreReady = storeConfig?.estado === 'abierta'
  const canConfirm =
    nameComplete &&
    receiptComplete &&
    !receiptError &&
    !submitting &&
    isStoreReady &&
    !storeConfigLoading &&
    !storeConfigError

  const validateReceiptFile = (file: File): string | null => {
    if (file.size > MAX_RECEIPT_SIZE_BYTES) {
      return 'El comprobante debe pesar como máximo 5 MB.'
    }

    const extension = file.name.includes('.')
      ? file.name.split('.').pop()?.toLowerCase() ?? ''
      : ''
    const hasSupportedExtension = ALLOWED_RECEIPT_EXTENSIONS.has(extension)
    const hasSupportedMimeType = ALLOWED_RECEIPT_MIME_TYPES.includes(file.type?.toLowerCase() || '')
    const isSupportedType = hasSupportedExtension && (file.type === '' || hasSupportedMimeType)

    if (!isSupportedType) {
      return 'Formato de comprobante no válido. Sólo se aceptan JPG, JPEG, PNG, WEBP o PDF.'
    }

    return null
  }

  const handleReceiptChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null

    if (!file) {
      setReceipt(null)
      setReceiptError(null)
      return
    }

    const error = validateReceiptFile(file)
    if (error) {
      setReceipt(null)
      setReceiptError(error)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setReceipt(file)
    setReceiptError(null)
    setSubmitError(null)
  }

  const statusMessage = storeConfigLoading
    ? 'Verificando estado de la tienda…'
    : storeConfigError
      ? 'No se pudo verificar el estado de la tienda. Volvé a intentarlo.'
      : isStoreClosedOrDemo
        ? disabledMessage || 'La tienda no acepta pedidos por ahora.'
        : !nameComplete
          ? 'Completá tu nombre para confirmar'
          : 'Adjuntá el comprobante de transferencia'

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(value)
      setTimeout(() => setCopied(null), 1600)
    } catch {
      // Clipboard no disponible.
    }
  }

  const handleConfirm = async () => {
    if (!canConfirm) return
    setSubmitting(true)
    setSubmitError(null)

    const payload = {
      nombre_cliente: name.trim(),
      mesa: table.trim() || undefined,
      telefono_cliente: whatsapp.trim() || undefined,
      observaciones: notes.trim() || undefined,
      metodo_pago: 'transferencia' as const,
      items: items.map((i) => ({
        producto_id: Number(i.product.id),
        cantidad: i.qty,
      })),
    }

    try {
      const form = new FormData()
      form.append('nombre_cliente', payload.nombre_cliente)
      if (payload.mesa) form.append('mesa', payload.mesa)
      if (payload.telefono_cliente) form.append('telefono_cliente', payload.telefono_cliente)
      if (payload.observaciones) form.append('observaciones', payload.observaciones)
      form.append('metodo_pago', payload.metodo_pago)
      form.append('items', JSON.stringify(payload.items))
      if (receipt) {
        form.append('comprobante', receipt)
      }
      const raw = await apiPostForm<ApiPedido>('/api/pedidos', form)
      const pedido = mapPedido(raw)

      const lastOrder: LastOrder = {
        id: pedido.id,
        numero: pedido.numero,
        token: pedido.token,
        createdAt: pedido.createdAt,
        name: pedido.name,
        table: pedido.table,
        whatsapp: whatsapp.trim(),
        notes: notes.trim(),
        method: pedido.method,
        total: pedido.total,
        count: pedido.count,
        items: pedido.items,
        status: pedido.status,
        payment: pedido.payment,
      }
      try {
        window.localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(lastOrder))
        window.localStorage.setItem(LAST_TOKEN_KEY, pedido.token)
      } catch {
        // Almacenamiento no disponible.
      }
      clear()
      router.push('/confirmado')
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'No se pudo enviar el pedido. Probá de nuevo.'
      setSubmitError(msg)
      setSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--km-fondo)]">
        <MenuHeader backHref="/carrito" backLabel="Volver al carrito" showCart={false} />
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm">
            <ClipboardCheck className="h-9 w-9 text-[var(--km-celeste)]" strokeWidth={1.6} />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-[var(--km-azul)]">No hay nada para confirmar</h1>
            <p className="text-sm leading-relaxed text-[var(--km-tinta-suave)] text-pretty">
              Agregá productos al carrito antes de finalizar tu pedido.
            </p>
          </div>
          <Link
            href="/menu"
            className="km-focus mt-1 rounded-2xl bg-[var(--km-dorado)] px-7 py-3.5 text-base font-extrabold text-[var(--km-azul)] shadow-lg shadow-[var(--km-dorado)]/30 transition-all hover:bg-[#ffbe2e] active:scale-[0.99]"
          >
            Ver menú
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--km-fondo)]">
      <MenuHeader backHref="/carrito" backLabel="Volver al carrito" showCart={false} />

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-4">
        <section className="flex items-center gap-2.5 pt-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--km-azul)]">
            <ClipboardCheck className="h-5 w-5 text-white" strokeWidth={2.2} />
          </div>
          <div className="leading-tight">
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--km-azul)]">
              Confirmá tu pedido
            </h1>
            <span className="text-sm font-medium text-[var(--km-tinta-suave)]">
              Pedido para retirar en el mostrador
            </span>
          </div>
        </section>

        {/* Paso 1: Resumen del pedido */}
        <section className="mt-5 overflow-hidden km-panel">
          <div className="flex items-center justify-between px-5 pt-4">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-[var(--km-azul)]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--km-azul)] text-xs font-extrabold text-white km-tabular">
                1
              </span>
              Tu pedido
            </h2>
            <Link
              href="/carrito"
              className="text-xs font-bold text-[var(--km-azul)] underline-offset-2 hover:underline"
            >
              Editar
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-dashed divide-[var(--km-linea)] px-5">
            {items.map((item) => (
              <li key={item.product.id} className="flex items-center gap-3 py-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--km-fondo)] text-[var(--km-azul)]">
                  <ProductIconGlyph icon={item.product.icon} className="h-4.5 w-4.5" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[var(--km-azul)]">{item.product.name}</p>
                  <p className="text-xs text-[var(--km-tinta-suave)]">
                    {item.qty} × {formatPrice(item.product.price)}
                  </p>
                </div>
                <span className="text-sm font-bold text-[var(--km-azul)] km-tabular">
                  {formatPrice(item.qty * item.product.price)}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-end justify-between bg-[var(--km-azul)] px-5 py-3.5">
            <span className="text-sm font-medium text-white/80">
              Total · {count} {count === 1 ? 'producto' : 'productos'}
            </span>
            <span className="text-2xl font-extrabold leading-none text-[var(--km-dorado)] km-tabular">
              {formatPrice(total)}
            </span>
          </div>
        </section>

        {/* Paso 2: Tus datos */}
        <section className="mt-4 km-panel p-5">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-[var(--km-azul)]">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--km-azul)] text-xs font-extrabold text-white km-tabular">
              2
            </span>
            Tus datos
          </h2>
          <form className="mt-3 space-y-3.5" onSubmit={(e) => e.preventDefault()}>
            <Field label="Nombre y apellido" required error={!nameComplete && name.length > 0 ? 'Escribí al menos 2 caracteres' : undefined}>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Cómo te buscamos al entregar"
                className="kermingo-input"
                disabled={submitting}
                autoFocus
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mesa" hint="opcional">
                <input
                  type="text"
                  inputMode="numeric"
                  value={table}
                  onChange={(e) => setTable(e.target.value)}
                  placeholder="Ej: 12"
                  className="kermingo-input"
                  disabled={submitting}
                />
              </Field>
              <Field label="WhatsApp" hint="opcional">
                <input
                  type="tel"
                  inputMode="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Cód. + número"
                  className="kermingo-input"
                  disabled={submitting}
                />
              </Field>
            </div>
            <Field label="Observaciones" hint="opcional">
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Sin cebolla, retiro 21 hs, etc."
                className="kermingo-input resize-none"
                disabled={submitting}
              />
            </Field>
          </form>
        </section>

        {/* Paso 3: Cómo pagás — solo transferencia */}
        <section className="mt-4">
          <h2 className="flex items-center gap-1.5 px-1 text-sm font-bold text-[var(--km-azul)]">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--km-azul)] text-xs font-extrabold text-white km-tabular">
              3
            </span>
            Cómo pagás
          </h2>
          <div className="mt-3">
            <div className="km-panel flex items-center gap-3 p-4">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[var(--km-azul)] text-white">
                <ArrowLeftRight className="h-6 w-6" strokeWidth={2.2} />
              </div>
              <div>
                <p className="text-sm font-extrabold text-[var(--km-azul)]">Transferencia bancaria</p>
                <p className="text-xs text-[var(--km-tinta-suave)]">Subí el comprobante y te lo verificamos</p>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {/* Datos bancarios */}
            <div className="km-panel p-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-4.5 w-4.5 text-[var(--km-azul)]" strokeWidth={2.2} />
                <h3 className="text-sm font-bold text-[var(--km-azul)]">Datos para transferir</h3>
              </div>
              <p className="mt-1 text-xs text-[var(--km-tinta-suave)]">
                Copiá los datos y hacé la transferencia. Luego subí el comprobante.
              </p>
              <dl className="mt-3 space-y-2">
                {BANK_DETAILS.map((d) => (
                  <div key={d.label} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <dt className="text-[11px] font-medium tracking-wide text-[var(--km-tinta-suave)]">
                        {d.label}
                      </dt>
                      <dd className="truncate text-sm font-semibold text-[var(--km-azul)] km-tabular">{d.value}</dd>
                    </div>
                    {d.copyable && (
                      <button
                        type="button"
                        onClick={() => handleCopy(d.value)}
                        aria-label={`Copiar ${d.label}`}
                        className="km-focus flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--km-fondo)] text-[var(--km-azul)] transition-colors hover:bg-[var(--km-celeste)]/25"
                      >
                        {copied === d.value ? (
                          <Check className="h-4 w-4 text-[var(--km-listo-text)]" strokeWidth={2.6} />
                        ) : (
                          <Copy className="h-4 w-4" strokeWidth={2.2} />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </dl>
            </div>

            {/* Upload de comprobante */}
            <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={handleReceiptChange}
                  disabled={submitting}
                />
              {receipt ? (
                <div className="km-panel flex items-center gap-3 p-4">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--km-listo-bg)] text-[var(--km-listo-text)]">
                    <FileCheck2 className="h-5 w-5" strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[var(--km-azul)]">{receipt.name}</p>
                    <p className="text-xs text-[var(--km-listo-text)]">Comprobante adjuntado ✓</p>
                  </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (submitting) return
                        setReceipt(null)
                        setReceiptError(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                    aria-label="Quitar comprobante"
                    className="km-focus flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--km-fondo)] text-[var(--km-tinta-suave)] transition-colors hover:bg-[var(--km-peligro-bg)] hover:text-[var(--km-peligro-text)]"
                  >
                    <X className="h-4 w-4" strokeWidth={2.4} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                  className="km-focus flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[var(--km-celeste)]/50 bg-white/60 px-4 py-7 text-center transition-colors hover:border-[var(--km-azul)]/40 hover:bg-white disabled:opacity-60"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--km-fondo)] text-[var(--km-azul)]">
                    <UploadCloud className="h-6 w-6" strokeWidth={2.2} />
                  </div>
                  <span className="text-sm font-bold text-[var(--km-azul)]">
                    Subir comprobante
                  </span>
                  <span className="text-xs text-[var(--km-tinta-suave)]">
                    Imagen o PDF de la transferencia
                  </span>
                </button>
              )}
            </div>

            {/* Aviso de validación */}
            <div className="flex items-start gap-2.5 rounded-xl bg-[var(--km-preparando-bg)] px-4 py-3">
              <AlertCircle className="mt-0.5 h-4.5 w-4.5 flex-shrink-0 text-[var(--km-preparando-text)]" strokeWidth={2.2} />
              <p className="text-xs leading-relaxed text-[var(--km-preparando-text)]">
                El pago queda pendiente hasta que verifiquemos el comprobante. Te avisamos en el seguimiento.
              </p>
            </div>
          </div>
        </section>

        {/* Error de envío */}
        {(submitError || receiptError) && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl border border-[var(--km-peligro-text)]/30 bg-[var(--km-peligro-bg)] p-3 text-sm text-[var(--km-peligro-text)]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{receiptError || submitError}</p>
          </div>
        )}

        <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-[var(--km-tinta-suave)]">
          <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
          Pedido sin registro · confirmás en segundos
        </div>
      </main>

      <div className="sticky bottom-0 z-40 border-t border-[var(--km-linea)] bg-white/95 backdrop-blur-md km-safe-bottom">
        <div className="mx-auto max-w-xl space-y-2.5 px-4 pb-5 pt-4">
          {!canConfirm && !submitting && (
            <p className="text-center text-xs font-medium text-[var(--km-preparando-text)]">
              {statusMessage}
            </p>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            aria-disabled={!canConfirm}
            className={`km-focus flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-extrabold transition-all ${
              submitting
                ? 'cursor-wait bg-[var(--km-dorado)]/70 text-[var(--km-azul)]'
                : canConfirm
                  ? 'bg-[var(--km-dorado)] text-[var(--km-azul)] shadow-lg shadow-[var(--km-dorado)]/30 hover:bg-[#ffbe2e] active:scale-[0.99]'
                  : 'cursor-not-allowed bg-[#E2E8F0] text-[#94A3B8] shadow-none'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Enviando pedido…
              </>
            ) : (
              <>Confirmar pedido · {formatPrice(total)}</>
            )}
          </button>
          <Link
            href="/carrito"
            className="km-focus flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--km-linea)] bg-white py-3.5 text-sm font-bold text-[var(--km-azul)] transition-colors hover:bg-[var(--km-fondo)]"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.6} />
            Volver al carrito
          </Link>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-[var(--km-azul)]">
        {label}
        {required && <span className="text-[var(--km-peligro-text)]">*</span>}
        {hint && (
          <span className="text-xs font-medium text-[var(--km-tinta-suave)]">
            {hint}
          </span>
        )}
      </span>
      {children}
      {error && (
        <p className="mt-1 text-xs font-medium text-[var(--km-peligro-text)]">{error}</p>
      )}
    </label>
  )
}
