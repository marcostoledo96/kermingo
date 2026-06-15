'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ClipboardCheck,
  Banknote,
  ArrowLeftRight,
  Copy,
  Check,
  UploadCloud,
  FileText,
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
import { apiPost, apiPostForm, ApiError } from '@/lib/api'
import { mapPedido } from '@/lib/mappers'
import type { ApiPedido } from '@/lib/types'
import type { LastOrder, PaymentMethod } from '@/lib/products'

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

export function CheckoutScreen() {
  const router = useRouter()
  const { items, count, total, clear } = useCart()
  const [method, setMethod] = useState<PaymentMethod>('transferencia')
  const [copied, setCopied] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [table, setTable] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const nameComplete = name.trim().length >= 2
  const receiptComplete = method === 'efectivo' || receipt !== null
  const canConfirm = nameComplete && receiptComplete && !submitting

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
      metodo_pago: method,
      items: items.map((i) => ({
        producto_id: Number(i.product.id),
        cantidad: i.qty,
      })),
    }

    try {
      let pedido: ReturnType<typeof mapPedido>
      if (method === 'transferencia' && receipt) {
        const form = new FormData()
        form.append('nombre_cliente', payload.nombre_cliente)
        if (payload.mesa) form.append('mesa', payload.mesa)
        if (payload.telefono_cliente) form.append('telefono_cliente', payload.telefono_cliente)
        if (payload.observaciones) form.append('observaciones', payload.observaciones)
        form.append('metodo_pago', payload.metodo_pago)
        form.append('items', JSON.stringify(payload.items))
        form.append('comprobante', receipt)
        const raw = await apiPostForm<ApiPedido>('/api/pedidos', form)
        pedido = mapPedido(raw)
      } else {
        const raw = await apiPost<ApiPedido>('/api/pedidos', payload)
        pedido = mapPedido(raw)
      }

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
      <div className="flex min-h-screen flex-col bg-[#EEF5FF]">
        <MenuHeader backHref="/carrito" backLabel="Volver al carrito" showCart={false} />
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm">
            <ClipboardCheck className="h-9 w-9 text-[#75AADB]" strokeWidth={1.6} />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-[#003B73]">No hay nada para confirmar</h1>
            <p className="text-sm leading-relaxed text-[#6B7280] text-pretty">
              Agregá productos al carrito antes de finalizar tu pedido.
            </p>
          </div>
          <Link
            href="/menu"
            className="mt-1 rounded-2xl bg-[#F6B21A] px-7 py-3.5 text-base font-extrabold text-[#003B73] shadow-lg shadow-[#F6B21A]/30 transition-all hover:bg-[#ffbe2e] active:scale-[0.99]"
          >
            Ver menú
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#EEF5FF]">
      <MenuHeader backHref="/carrito" backLabel="Volver al carrito" showCart={false} />

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-4">
        <section className="flex items-center gap-2.5 pt-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#003B73]">
            <ClipboardCheck className="h-5 w-5 text-white" strokeWidth={2.2} />
          </div>
          <div className="leading-tight">
            <h1 className="text-2xl font-extrabold tracking-tight text-[#003B73]">
              Confirmá tu pedido
            </h1>
            <span className="text-sm font-medium text-[#6B7280]">No necesitás registrarte</span>
          </div>
        </section>

        {/* Resumen del pedido */}
        <section className="mt-5 overflow-hidden rounded-3xl bg-white shadow-sm shadow-[#003B73]/5">
          <div className="flex items-center justify-between px-5 pt-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-[#6B7280]">
              Resumen del pedido
            </h2>
            <Link
              href="/carrito"
              className="text-xs font-bold text-[#003B73] underline-offset-2 hover:underline"
            >
              Editar
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-dashed divide-[#75AADB]/25 px-5">
            {items.map((item) => (
              <li key={item.product.id} className="flex items-center gap-3 py-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#EEF5FF] text-[#003B73]">
                  <ProductIconGlyph icon={item.product.icon} className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#003B73]">{item.product.name}</p>
                  <p className="text-xs text-[#6B7280]">
                    {item.qty} × {formatPrice(item.product.price)}
                  </p>
                </div>
                <span className="text-sm font-bold text-[#003B73]">
                  {formatPrice(item.qty * item.product.price)}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-end justify-between bg-[#003B73] px-5 py-4">
            <span className="text-sm font-medium text-white/80">
              Total · {count} {count === 1 ? 'producto' : 'productos'}
            </span>
            <span className="text-2xl font-extrabold leading-none text-[#F6B21A]">
              {formatPrice(total)}
            </span>
          </div>
        </section>

        {/* Formulario */}
        <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm shadow-[#003B73]/5">
          <h2 className="text-xs font-bold uppercase tracking-wide text-[#6B7280]">Tus datos</h2>
          <form className="mt-3 space-y-3.5" onSubmit={(e) => e.preventDefault()}>
            <Field label="Nombre y apellido" required>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Cómo te buscamos al entregar"
                className="kermingo-input"
                disabled={submitting}
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

        {/* Método de pago */}
        <section className="mt-5">
          <h2 className="px-1 text-xs font-bold uppercase tracking-wide text-[#6B7280]">
            Método de pago
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <PaymentOption
              active={method === 'transferencia'}
              onClick={() => !submitting && setMethod('transferencia')}
              icon={<ArrowLeftRight className="h-6 w-6" strokeWidth={2.2} />}
              title="Transferencia"
              subtitle="Subís el comprobante"
            />
            <PaymentOption
              active={method === 'efectivo'}
              onClick={() => !submitting && setMethod('efectivo')}
              icon={<Banknote className="h-6 w-6" strokeWidth={2.2} />}
              title="Efectivo"
              subtitle="Al retirar el pedido"
            />
          </div>

          {method === 'transferencia' ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-3xl border border-[#75AADB]/30 bg-white p-5 shadow-sm shadow-[#003B73]/5">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4.5 w-4.5 text-[#003B73]" strokeWidth={2.2} />
                  <h3 className="text-sm font-extrabold text-[#003B73]">Datos para transferir</h3>
                </div>
                <dl className="mt-3 space-y-2.5">
                  {BANK_DETAILS.map((d) => (
                    <div key={d.label} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <dt className="text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                          {d.label}
                        </dt>
                        <dd className="truncate text-sm font-semibold text-[#003B73]">{d.value}</dd>
                      </div>
                      {d.copyable && (
                        <button
                          type="button"
                          onClick={() => handleCopy(d.value)}
                          aria-label={`Copiar ${d.label}`}
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#EEF5FF] text-[#003B73] transition-colors hover:bg-[#75AADB]/25"
                        >
                          {copied === d.value ? (
                            <Check className="h-4 w-4 text-emerald-600" strokeWidth={2.6} />
                          ) : (
                            <Copy className="h-4 w-4" strokeWidth={2.2} />
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </dl>
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="sr-only"
                  onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
                  disabled={submitting}
                />
                {receipt ? (
                  <div className="flex items-center gap-3 rounded-3xl border border-[#75AADB]/30 bg-white p-4 shadow-sm shadow-[#003B73]/5">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#EEF5FF] text-[#003B73]">
                      <FileText className="h-5 w-5" strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[#003B73]">{receipt.name}</p>
                      <p className="text-xs text-[#6B7280]">Comprobante adjuntado</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (submitting) return
                        setReceipt(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                      aria-label="Quitar comprobante"
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#EEF5FF] text-[#6B7280] transition-colors hover:bg-rose-50 hover:text-rose-600"
                    >
                      <X className="h-4 w-4" strokeWidth={2.4} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={submitting}
                    className="flex w-full flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-[#75AADB]/50 bg-white/60 px-4 py-7 text-center transition-colors hover:border-[#003B73]/40 hover:bg-white disabled:opacity-60"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF5FF] text-[#003B73]">
                      <UploadCloud className="h-6 w-6" strokeWidth={2.2} />
                    </div>
                    <span className="text-sm font-extrabold text-[#003B73]">
                      Subir comprobante
                    </span>
                    <span className="text-xs text-[#6B7280]">
                      El comprobante puede ser imagen o PDF
                    </span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-start gap-3 rounded-3xl border border-[#F6B21A]/40 bg-[#FFF6E0] p-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#F6B21A]/20 text-[#9A6B00]">
                <Banknote className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <div>
                <p className="text-sm font-extrabold text-[#7A5500]">Pago en efectivo</p>
                <p className="text-sm leading-relaxed text-[#7A5500]/80">
                  Pagás en caja cuando retires tu pedido.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Error de envío */}
        {submitError && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{submitError}</p>
          </div>
        )}

        <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-[#6B7280]">
          <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
          Pedido sin registro · confirmás en segundos
        </div>
      </main>

      <div className="sticky bottom-0 z-40 border-t border-[#75AADB]/20 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-xl space-y-2.5 px-4 pb-5 pt-4">
          {!canConfirm && !submitting && (
            <p className="text-center text-xs font-medium text-[#9A6B00]">
              {!nameComplete
                ? 'Completá tu nombre para confirmar'
                : 'Adjuntá el comprobante de transferencia'}
            </p>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            aria-disabled={!canConfirm}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-extrabold transition-all ${
              submitting
                ? 'cursor-wait bg-[#F6B21A]/70 text-[#003B73]'
                : canConfirm
                  ? 'bg-[#F6B21A] text-[#003B73] shadow-lg shadow-[#F6B21A]/30 hover:bg-[#ffbe2e] active:scale-[0.99]'
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
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#75AADB]/40 bg-white py-3.5 text-sm font-bold text-[#003B73] transition-colors hover:bg-[#EEF5FF]"
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
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-[#003B73]">
        {label}
        {required && <span className="text-rose-500">*</span>}
        {hint && (
          <span className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">
            {hint}
          </span>
        )}
      </span>
      {children}
    </label>
  )
}

function PaymentOption({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative flex flex-col items-start gap-2 rounded-3xl border-2 p-4 text-left transition-all active:scale-[0.98] ${
        active
          ? 'border-[#003B73] bg-[#003B73] shadow-lg shadow-[#003B73]/20'
          : 'border-[#75AADB]/30 bg-white hover:border-[#75AADB]/60'
      }`}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
          active ? 'bg-[#F6B21A] text-[#003B73]' : 'bg-[#EEF5FF] text-[#003B73]'
        }`}
      >
        {icon}
      </span>
      <span className="leading-tight">
        <span className={`block text-sm font-extrabold ${active ? 'text-white' : 'text-[#003B73]'}`}>
          {title}
        </span>
        <span className={`block text-xs ${active ? 'text-white/70' : 'text-[#6B7280]'}`}>
          {subtitle}
        </span>
      </span>
      {active && (
        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#F6B21A] text-[#003B73]">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
    </button>
  )
}
