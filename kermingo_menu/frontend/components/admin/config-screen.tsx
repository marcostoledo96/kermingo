'use client'

import { useCallback, useEffect, useState } from 'react'
import { Save, Loader2, AlertCircle, DoorOpen, DoorClosed, MessageSquare, Check } from 'lucide-react'
import { AdminShell } from './admin-shell'
import { SectionTitle, AdminCard, IconBox } from './admin-ui'
import { useAdminSession } from './admin-session'
import { apiGet, apiPut, ApiError } from '@/lib/api'
import type { ApiConfiguracion } from '@/lib/types'

export function ConfigScreen() {
  const { expireSession } = useAdminSession()
  const [config, setConfig] = useState<ApiConfiguracion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const loadConfig = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet<ApiConfiguracion>('/api/configuracion-tienda')
      setConfig(data)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        expireSession()
        return
      }
      setError(err instanceof Error ? err.message : 'Error al cargar configuración')
    } finally {
      setLoading(false)
    }
  }, [expireSession])

  useEffect(() => {
    void loadConfig()
  }, [loadConfig])

  const handleToggleStore = async () => {
    if (!config) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const newState = config.estado === 'abierta' ? 'cerrada' : 'abierta'
      const updated = await apiPut<ApiConfiguracion>('/api/admin/configuracion-tienda', { estado: newState })
      setConfig(updated)
      setSaveMsg(`Tienda ${newState === 'abierta' ? 'abierta' : 'cerrada'}`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) expireSession()
      setSaveMsg('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateMessage = async () => {
    if (!config) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const updated = await apiPut<ApiConfiguracion>('/api/admin/configuracion-tienda', {
        mensaje_publico: config.mensaje_publico || '',
      })
      setConfig(updated)
      setSaveMsg('Mensaje actualizado')
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) expireSession()
      setSaveMsg('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const isOpen = config?.estado === 'abierta'

  return (
    <AdminShell section="Configuración" subtitle="Estado de la tienda">
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--km-celeste)]" />
          <p className="text-sm font-medium text-[var(--km-tinta-suave)]">Cargando configuración…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AlertCircle className="h-8 w-8 text-[var(--km-peligro-text)]" />
          <p className="text-sm font-medium text-[var(--km-peligro-text)]">{error}</p>
          <button onClick={loadConfig} className="text-xs font-bold text-[var(--km-azul)] underline">
            Reintentar
          </button>
        </div>
      ) : config ? (
        <div className="space-y-6">
          {/* Store status banner */}
          <section>
            <SectionTitle>Estado de la tienda</SectionTitle>
            <AdminCard className="overflow-hidden">
              <div
                className={`flex items-start gap-4 p-5 ${
                  isOpen
                    ? 'bg-[var(--km-listo-bg)]/60'
                    : 'bg-[var(--km-peligro-bg)]/60'
                }`}
              >
                <IconBox
                  icon={isOpen ? DoorOpen : DoorClosed}
                  tone={isOpen ? 'emerald' : 'red'}
                  className="h-14 w-14 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-extrabold text-[#003B73]">
                    {isOpen ? 'La tienda está abierta' : 'La tienda está cerrada'}
                  </h2>
                  <p className="text-sm leading-relaxed text-[#003B73]/60">
                    {isOpen
                      ? 'Las personas pueden ver el menú y hacer pedidos normalmente.'
                      : 'El menú muestra un aviso y no se aceptan nuevos pedidos.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 p-4 sm:grid-cols-2">
                <button
                  onClick={handleToggleStore}
                  disabled={saving || isOpen}
                  className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-40 km-focus ${
                    isOpen
                      ? 'border-[#003B73] bg-[#003B73] text-white'
                      : 'border-[#003B73] bg-[#003B73] text-white'
                  }`}
                >
                  <DoorOpen className="h-4.5 w-4.5" strokeWidth={2.3} />
                  Abrir tienda
                </button>
                <button
                  onClick={handleToggleStore}
                  disabled={saving || !isOpen}
                  className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-40 km-focus ${
                    !isOpen
                      ? 'border-[#5B7793] bg-[#5B7793] text-white'
                      : 'border-[#75AADB]/30 bg-white text-[#003B73] hover:border-[#75AADB] hover:bg-[#EEF5FF]'
                  }`}
                >
                  <DoorClosed className="h-4.5 w-4.5" strokeWidth={2.3} />
                  Cerrar tienda
                </button>
              </div>
            </AdminCard>
          </section>

          {/* Public message */}
          <section>
            <SectionTitle>Mensaje público</SectionTitle>
            <AdminCard className="p-5">
              <label
                htmlFor="public-message"
                className="mb-2 flex items-center gap-2 text-sm font-bold text-[#003B73]"
              >
                <MessageSquare className="h-4 w-4 text-[#75AADB]" strokeWidth={2.4} />
                Texto que ven las personas en el menú
              </label>
              <textarea
                id="public-message"
                value={config.mensaje_publico || ''}
                onChange={(e) => setConfig({ ...config, mensaje_publico: e.target.value })}
                rows={3}
                maxLength={160}
                className="kermingo-input mt-2 resize-none"
                placeholder="Ej: ¡Bienvenidos! El menú estará disponible desde las 19 hs."
                disabled={saving}
              />
              <p className="mt-1.5 text-right text-xs text-[#003B73]/40">
                {(config.mensaje_publico || '').length}/160
              </p>
              <button
                onClick={handleUpdateMessage}
                disabled={saving}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#003B73] py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#003B73]/20 transition-all hover:bg-[#00305d] active:scale-[0.99] disabled:opacity-50 km-focus"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" strokeWidth={2.4} />
                    Guardar mensaje
                  </>
                )}
              </button>
            </AdminCard>
          </section>

          {saveMsg && (
            <div className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: 'var(--km-listo-bg)', background: 'var(--km-listo-bg)', color: 'var(--km-listo-text)' }}>
              <Check className="h-4 w-4" strokeWidth={2.4} />
              {saveMsg}
            </div>
          )}
        </div>
      ) : null}
    </AdminShell>
  )
}