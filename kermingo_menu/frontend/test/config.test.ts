import { describe, it, expect, vi } from 'vitest'
import { ABSOLUTE_IMAGE_URL, resolveApiBase } from '@/lib/config'

describe('resolveApiBase', () => {
  it('uses explicit NEXT_PUBLIC_API_URL when provided', () => {
    expect(
      resolveApiBase({
        apiUrl: '  https://api.kermingo.test  ',
        nodeEnv: 'production',
        isBrowser: false,
      }),
    ).toBe('https://api.kermingo.test')
  })

  it('uses browser LAN host in non-production when no explicit API URL', () => {
    expect(
      resolveApiBase({
        nodeEnv: 'development',
        isBrowser: true,
        browserLocation: { protocol: 'http:', hostname: '192.168.1.20' },
      }),
    ).toBe('http://192.168.1.20:3001')
  })

  it('uses localhost in SSR non-production when no explicit API URL', () => {
    expect(resolveApiBase({ nodeEnv: 'development', isBrowser: false })).toBe('http://localhost:3001')
  })

  it('returns empty string in production SSR when API URL is missing', () => {
    expect(resolveApiBase({ nodeEnv: 'production', isBrowser: false })).toBe('')
  })

  it('logs and returns empty string in production browser when API URL is missing', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(
      resolveApiBase({
        nodeEnv: 'production',
        isBrowser: true,
        browserLocation: { protocol: 'https:', hostname: 'kermingo.vercel.app' },
      }),
    ).toBe('')

    expect(errorSpy).toHaveBeenCalledWith('NEXT_PUBLIC_API_URL es requerido en producción')
    errorSpy.mockRestore()
  })
})

describe('ABSOLUTE_IMAGE_URL', () => {
  it('builds absolute URL from relative path with provided base', () => {
    expect(ABSOLUTE_IMAGE_URL('/api/productos/1/imagen?v=10', 'https://api.kermingo.test')).toBe(
      'https://api.kermingo.test/api/productos/1/imagen?v=10',
    )
  })

  it('normalizes relative paths without leading slash', () => {
    expect(ABSOLUTE_IMAGE_URL('api/productos/1/imagen?v=10', 'https://api.kermingo.test')).toBe(
      'https://api.kermingo.test/api/productos/1/imagen?v=10',
    )
  })

  it('keeps absolute paths untouched', () => {
    expect(ABSOLUTE_IMAGE_URL('https://cdn.example.com/pic.jpg', 'https://api.kermingo.test')).toBe(
      'https://cdn.example.com/pic.jpg',
    )
  })

  it('returns undefined when path is missing', () => {
    expect(ABSOLUTE_IMAGE_URL(null, 'https://api.kermingo.test')).toBeUndefined()
    expect(ABSOLUTE_IMAGE_URL(undefined, 'https://api.kermingo.test')).toBeUndefined()
  })
})
