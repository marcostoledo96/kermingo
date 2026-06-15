import { API_BASE } from './config'
import type { ApiResponse } from './types'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const STORAGE_KEY = 'kermingo:auth'

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { token?: string }
    return parsed?.token ?? null
  } catch {
    return null
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  let body: ApiResponse<T> | null = null
  try {
    body = (await res.json()) as ApiResponse<T>
  } catch {
    throw new ApiError(`Respuesta inválida del servidor (HTTP ${res.status})`, res.status)
  }
  if (!body || typeof body !== 'object') {
    throw new ApiError('Respuesta vacía del servidor', res.status)
  }
  if (body.ok === false) {
    throw new ApiError(body.error || `Error HTTP ${res.status}`, res.status)
  }
  if (body.ok === true) {
    return body.data
  }
  throw new ApiError('Respuesta con formato desconocido', res.status)
}

function buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
  const base = API_BASE.replace(/\/$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  if (!query) return `${base}${cleanPath}`
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue
    params.append(k, String(v))
  }
  const qs = params.toString()
  return qs ? `${base}${cleanPath}?${qs}` : `${base}${cleanPath}`
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken()
  if (token && token !== 'cookie') {
    return { ...extra, Authorization: `Bearer ${token}` }
  }
  return extra
}

export async function apiGet<T>(
  path: string,
  query?: Record<string, string | number | undefined>,
): Promise<T> {
  const res = await fetch(buildUrl(path, query), {
    method: 'GET',
    credentials: 'include',
    headers: authHeaders({ Accept: 'application/json' }),
  })
  return parseJson<T>(res)
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders({
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(body),
  })
  return parseJson<T>(res)
}

export async function apiPostForm<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders({ Accept: 'application/json' }),
    body: formData,
  })
  return parseJson<T>(res)
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: 'PUT',
    credentials: 'include',
    headers: authHeaders({
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(body),
  })
  return parseJson<T>(res)
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: 'PATCH',
    credentials: 'include',
    headers: authHeaders({
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(body),
  })
  return parseJson<T>(res)
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: 'DELETE',
    credentials: 'include',
    headers: authHeaders({ Accept: 'application/json' }),
  })
  return parseJson<T>(res)
}
