/**
 * @file Tests for AdminLoginScreen — login navigation bugfix.
 *
 * Validates that after a successful login, the component calls
 * router.replace('/admin/dashboard') to navigate to the dashboard.
 * Also verifies that failed logins do NOT trigger navigation.
 *
 * Strategy: Mock next/navigation's useRouter and admin-session's
 * useAdminSession/cacheAdminUser, render the login form, submit
 * credentials, and assert router.replace is called with the
 * correct path after refresh resolves.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type React from 'react'

// --- Mock dependencies before importing component ---

const mockReplace = vi.fn()
const mockRefresh = vi.fn(() => Promise.resolve())

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

vi.mock('@/components/admin/admin-session', () => ({
  useAdminSession: () => ({
    refresh: mockRefresh,
    status: 'unauthenticated',
    user: null,
    expireSession: vi.fn(),
    logout: vi.fn(),
  }),
  cacheAdminUser: vi.fn(),
}))

vi.mock('@/components/argentina-stripe', () => ({
  ArgentinaStripe: () => <div data-testid="argentina-stripe" />,
}))

vi.mock('@/components/kermingo-logo', () => ({
  KermingoLogo: ({ className }: { className?: string }) => (
    <svg data-testid="kermingo-logo" className={className} />
  ),
}))

vi.mock('@/lib/config', () => ({
  API_BASE: 'http://localhost:3001',
}))

// Import after mocks
import { AdminLoginScreen } from '@/components/admin/login-screen'
import { cacheAdminUser } from '@/components/admin/admin-session'

describe('AdminLoginScreen — login navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRefresh.mockResolvedValue(undefined)
  })

  it('navigates to /admin/dashboard after successful login', async () => {
    // Mock successful login response
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            ok: true,
            data: {
              usuario: { nombre: 'Admin Test', email: 'admin@kermingo.com' },
            },
          }),
      }),
    )
    vi.stubGlobal('fetch', mockFetch)

    render(<AdminLoginScreen />)

    // Use getElementById to avoid getByLabelText ambiguity with "Contraseña"
    // (the label and the aria-label "Mostrar contraseña" both match)
    const emailInput = document.getElementById('email')!
    const passwordInput = document.getElementById('password')!

    fireEvent.change(emailInput, { target: { value: 'admin@kermingo.com' } })
    fireEvent.change(passwordInput, { target: { value: 'admin123' } })

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /ingresar/i }))

    // Wait for async operations to complete
    await waitFor(() => {
      expect(cacheAdminUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'admin@kermingo.com',
          role: 'admin',
        }),
      )
    })

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled()
    })

    // The critical assertion: router.replace('/admin/dashboard') must be called
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/admin/dashboard')
    })
  })

  it('does NOT navigate to dashboard on login failure (bad credentials)', async () => {
    // Mock failed login response
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () =>
          Promise.resolve({
            ok: false,
            error: 'Credenciales inválidas',
          }),
      }),
    )
    vi.stubGlobal('fetch', mockFetch)

    render(<AdminLoginScreen />)

    const emailInput = document.getElementById('email')!
    const passwordInput = document.getElementById('password')!

    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } })

    fireEvent.click(screen.getByRole('button', { name: /ingresar/i }))

    // Wait for the error alert to appear in the DOM
    await waitFor(() => {
      const alert = screen.getByRole('alert')
      expect(alert).toBeTruthy()
      expect(alert.textContent).toContain('Credenciales inválidas')
    })

    // router.replace should NOT have been called
    expect(mockReplace).not.toHaveBeenCalled()
    // cacheAdminUser should NOT have been called
    expect(cacheAdminUser).not.toHaveBeenCalled()
    // refresh should NOT have been called
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('does NOT navigate on network error', async () => {
    // Mock network error
    const mockFetch = vi.fn(() => Promise.reject(new Error('Network error')))
    vi.stubGlobal('fetch', mockFetch)

    render(<AdminLoginScreen />)

    const emailInput = document.getElementById('email')!
    const passwordInput = document.getElementById('password')!

    fireEvent.change(emailInput, { target: { value: 'admin@kermingo.com' } })
    fireEvent.change(passwordInput, { target: { value: 'admin123' } })

    fireEvent.click(screen.getByRole('button', { name: /ingresar/i }))

    // Wait for the error alert to appear
    await waitFor(() => {
      const alert = screen.getByRole('alert')
      expect(alert).toBeTruthy()
      expect(alert.textContent).toContain('Network error')
    })

    // Should NOT navigate or refresh session
    expect(mockReplace).not.toHaveBeenCalled()
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it('calls router.replace exactly once after successful login', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            ok: true,
            data: {
              usuario: { nombre: 'Admin', email: 'admin@kermingo.com' },
            },
          }),
      }),
    )
    vi.stubGlobal('fetch', mockFetch)

    render(<AdminLoginScreen />)

    const emailInput = document.getElementById('email')!
    const passwordInput = document.getElementById('password')!

    fireEvent.change(emailInput, { target: { value: 'a@b.com' } })
    fireEvent.change(passwordInput, { target: { value: 'pass' } })

    fireEvent.click(screen.getByRole('button', { name: /ingresar/i }))

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledTimes(1)
    })

    expect(mockReplace).toHaveBeenCalledWith('/admin/dashboard')
  })
})