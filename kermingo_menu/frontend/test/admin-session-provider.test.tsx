import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

const mockReplace = vi.fn()
const mockPathname = vi.fn()
const mockRouter = {
  replace: mockReplace,
  push: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
}

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockPathname(),
}))

import { AdminSessionProvider } from '@/components/admin/admin-session'

function makeFetchResponse(status: number, payload: unknown = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response
}

describe('AdminSessionProvider — unauthenticated redirect guard', () => {
  beforeEach(() => {
    mockReplace.mockReset()
    mockPathname.mockReturnValue('/admin')
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('unauthenticated /admin/dashboard does not render protected child and redirects', async () => {
    mockPathname.mockReturnValue('/admin/dashboard')

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        makeFetchResponse(401, {
          ok: false,
          error: 'Unauthorized',
        }),
      ),
    )

    render(
      <AdminSessionProvider>
        <div data-testid="protected-content">Contenido protegido</div>
      </AdminSessionProvider>,
    )

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/admin')
    })

    expect(await screen.findByText(/Redirigiendo al login/i)).toBeTruthy()
    expect(screen.queryByTestId('protected-content')).toBeNull()
  })

  it('unauthenticated /admin renders login child', async () => {
    mockPathname.mockReturnValue('/admin')

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        makeFetchResponse(401, {
          ok: false,
          error: 'Unauthorized',
        }),
      ),
    )

    render(
      <AdminSessionProvider>
        <div data-testid="login-content">Iniciar sesión admin</div>
      </AdminSessionProvider>,
    )

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/admin')
    })

    expect(await screen.findByTestId('login-content')).toBeTruthy()
  })

  it('authenticated /admin does not render login child and redirects to dashboard', async () => {
    mockPathname.mockReturnValue('/admin')

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        makeFetchResponse(200, {
          ok: true,
          data: {
            usuario: {
              name: 'Admin Kermingo',
              email: 'admin@kermingo.com',
            },
          },
        }),
      ),
    )

    render(
      <AdminSessionProvider>
        <div data-testid="login-content">Iniciar sesión admin</div>
      </AdminSessionProvider>,
    )

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/admin/dashboard')
    })

    expect(await screen.findByText(/Redirigiendo al panel/i)).toBeTruthy()
    expect(screen.queryByTestId('login-content')).toBeNull()
  })
})
