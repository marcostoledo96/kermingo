'use client'

import { useCallback, useEffect, useState } from 'react'
import { Save, Loader2, AlertCircle } from 'lucide-react'
import { AdminShell } from './admin-shell'
import { SectionTitle } from './admin-ui'
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
          {/* Store status toggle */}
          <div className="km-panel p-5">
            <SectionTitle>Estado de la tienda</SectionTitle>
            <div className="mt-3 flex items-center gap-4">
              <button
                onClick={handleToggleStore}
                disabled={saving}
                className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold transition-all disabled:opacity-50 ${
                  config.estado === 'abierta'
                    ? 'bg-[var(--km-listo-bg)] text-[var(--km-listo-text)] hover:brightness-110'
                    : 'bg-[var(--km-peligro-bg)] text-[var(--km-peligro-text)] hover:brightness-110'
                }`}
              >
                {config.estado === 'abierta' ? '🔓 Tienda abierta' : '🔒 Tienda cerrada'}
              </button>
              <span className="text-xs text-[var(--km-tinta-suave)]">
                {config.estado === 'abierta'
                  ? 'Los clientes pueden hacer pedidos.'
                  : 'Los pedidos online están deshabilitados.'}
              </span>
            </div>
          </div>

          {/* Public message */}
          <div className="km-panel p-5">
            <SectionTitle>Mensaje público</SectionTitle>
            <p className="mt-1 text-xs text-[var(--km-tinta-suave)]">
              Se muestra en la página principal del menú.
            </p>
            <textarea
              value={config.mensaje_publico || ''}
              onChange={(e) => setConfig({ ...config, mensaje_publico: e.target.value })}
              rows={3}
              className="kermingo-input mt-3 resize-none"
              placeholder="Ej: ¡Bienvenidos! El menú estará disponible desde las 19 hs."
              disabled={saving}
            />
            <button
              onClick={handleUpdateMessage}
              disabled={saving}
              className="mt-3 flex items-center gap-2 rounded-xl bg-[var(--km-azul)] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--km-azul)]/90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" strokeWidth={2} />
              {saving ? 'Guardando…' : 'Guardar mensaje'}
            </button>
          </div>

          {saveMsg && (
            <p className="text-xs font-medium text-[var(--km-listo-text)]">{saveMsg}</p>
          )}
        </div>
      ) : null}
    </AdminShell>
  )
}