const DEFAULT_API_BASE = 'http://localhost:3001'

export const API_BASE: string =
  process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE

export const ABSOLUTE_IMAGE_URL = (path: string | null | undefined): string | undefined => {
  if (!path) return undefined
  if (/^https?:\/\//i.test(path)) return path
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
}
