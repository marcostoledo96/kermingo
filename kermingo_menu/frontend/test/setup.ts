// Global test setup. Runs before each test file.
//
// Goals:
// - Clean up React Testing Library after each test (unmount rendered hooks)
// - Clear localStorage between tests (avoid cross-test pollution)
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})
