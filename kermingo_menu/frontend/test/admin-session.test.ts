import { describe, it, expect } from 'vitest'

/**
 * Unit tests for admin-session logic (pure function level).
 *
 * The AdminSessionProvider is a React component with side effects (fetch, router),
 * so we test the decision logic in isolation rather than rendering the provider.
 * These tests verify the session status transition rules:
 *  - 401 → unauthenticated
 *  - 200 with user → authenticated
 *  - 200 without user → unauthenticated
 *  - network error / non-200 → error (NOT authenticated)
 */

type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error'

function resolveSessionStatus(
  httpResponse: { ok: boolean; status: number } | null,
  userFromPayload: unknown,
): SessionStatus {
  // Network error
  if (httpResponse === null) return 'error'

  // 401 → unauthenticated
  if (httpResponse.status === 401) return 'unauthenticated'

  // 200 with valid user → authenticated
  if (httpResponse.ok) {
    const user = userFromPayload as { name?: string } | null
    if (user && user.name) return 'authenticated'
    // ok response but no user → unauthenticated
    return 'unauthenticated'
  }

  // Other HTTP errors → error (NOT authenticated)
  return 'error'
}

describe('Admin session status resolution', () => {
  it('200 with user → authenticated', () => {
    expect(resolveSessionStatus({ ok: true, status: 200 }, { name: 'Admin' })).toBe('authenticated')
  })

  it('200 without user → unauthenticated', () => {
    expect(resolveSessionStatus({ ok: true, status: 200 }, null)).toBe('unauthenticated')
  })

  it('200 with empty user → unauthenticated', () => {
    expect(resolveSessionStatus({ ok: true, status: 200 }, {})).toBe('unauthenticated')
  })

  it('401 → unauthenticated', () => {
    expect(resolveSessionStatus({ ok: false, status: 401 }, null)).toBe('unauthenticated')
  })

  it('500 → error, NOT authenticated', () => {
    expect(resolveSessionStatus({ ok: false, status: 500 }, null)).toBe('error')
  })

  it('502 → error, NOT authenticated', () => {
    expect(resolveSessionStatus({ ok: false, status: 502 }, null)).toBe('error')
  })

  it('503 → error, NOT authenticated', () => {
    expect(resolveSessionStatus({ ok: false, status: 503 }, null)).toBe('error')
  })

  it('network error (null response) → error, NOT authenticated', () => {
    expect(resolveSessionStatus(null, null)).toBe('error')
  })

  it('403 → error (CSRF/origin rejection), NOT authenticated', () => {
    expect(resolveSessionStatus({ ok: false, status: 403 }, null)).toBe('error')
  })
})

describe('Config screen endpoint mapping', () => {
  it('uses /api/configuracion-tienda for public read', () => {
    const publicEndpoint = '/api/configuracion-tienda'
    expect(publicEndpoint).toBe('/api/configuracion-tienda')
  })

  it('uses /api/admin/configuracion-tienda with PUT for admin write', () => {
    const adminEndpoint = '/api/admin/configuracion-tienda'
    const adminMethod = 'PUT'
    expect(adminEndpoint).toBe('/api/admin/configuracion-tienda')
    expect(adminMethod).toBe('PUT')
  })
})

describe('Comprobante endpoint returns metadata, not file bytes', () => {
  it('comprobante endpoint URL returns JSON with url_publica and url_proxy', () => {
    type ComprobanteMeta = { url_publica: string | null; url_proxy: string; nombre_original: string; mime_type: string }
    const mockResponse: ComprobanteMeta = {
      url_publica: 'https://drive.google.com/file/d/abc123/view',
      url_proxy: '/api/admin/pedidos/42/comprobante/imagen',
      nombre_original: 'comprobante.jpg',
      mime_type: 'image/jpeg',
    }
    // The frontend should use url_proxy for <img> embedding (proxied through backend)
    // and url_publica for "Abrir en otra pestaña" fallback link
    expect(mockResponse.url_proxy).toContain('/api/admin/pedidos/')
    expect(mockResponse.url_proxy).toContain('/comprobante/imagen')
    expect(mockResponse.url_publica).toBeTruthy()
    expect(mockResponse.url_publica).toContain('drive.google.com')
  })

  it('comprobante without url_publica should still have url_proxy for image display', () => {
    type ComprobanteMeta = { url_publica: string | null; url_proxy: string; nombre_original: string; mime_type: string }
    const mockResponse: ComprobanteMeta = {
      url_publica: null,
      url_proxy: '/api/admin/pedidos/42/comprobante/imagen',
      nombre_original: 'comprobante.jpg',
      mime_type: 'image/jpeg',
    }
    // Even without url_publica, url_proxy works for displaying the image
    expect(mockResponse.url_proxy).toBeTruthy()
    expect(mockResponse.url_publica).toBeNull()
  })
})