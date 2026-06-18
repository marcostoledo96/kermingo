const DEFAULT_API_BASE = 'http://localhost:3001'

type ApiBaseContext = {
  apiUrl?: string | null
  nodeEnv?: string
  isBrowser?: boolean
  browserLocation?: {
    protocol: string
    hostname: string
  }
}

export const resolveApiBase = (context: ApiBaseContext = {}): string => {
  const explicit = context.apiUrl ?? process.env.NEXT_PUBLIC_API_URL
  if (explicit?.trim()) {
    return explicit.trim()
  }

  const nodeEnv = context.nodeEnv ?? process.env.NODE_ENV
  const isBrowser = context.isBrowser ?? typeof window !== 'undefined'

  if (!isBrowser) {
    return nodeEnv === 'production' ? '' : DEFAULT_API_BASE
  }

  if (nodeEnv === 'production') {
    console.error('NEXT_PUBLIC_API_URL es requerido en producción')
    return ''
  }

  const location = context.browserLocation ?? window.location
  const { protocol, hostname } = location
  return `${protocol}//${hostname}:3001`
}

export const API_BASE: string = resolveApiBase()

export const ABSOLUTE_IMAGE_URL = (
  path: string | null | undefined,
  apiBase = API_BASE,
): string | undefined => {
  if (!path) return undefined
  if (/^https?:\/\//i.test(path)) return path
  return `${apiBase}${path.startsWith('/') ? path : `/${path}`}`
}
