# Design: add-tests

## 1. The stack

| Tool | Version | Purpose |
|------|---------|---------|
| `vitest` | ^2.x | Test runner |
| `@testing-library/react` | ^16.x | Hook testing (`renderHook`) |
| `jsdom` | ^25.x | DOM environment for tests |
| `@testing-library/dom` | ^10.x | DOM testing utilities (transitive but explicit) |

Why these:
- **Vitest** over Jest: faster, native ESM, native TS, no Babel needed, same `describe`/`it`/`expect` API
- **@testing-library/react**: official, well-supported, the de-facto choice for hook tests in React 19
- **jsdom**: needed for `window.localStorage` and other DOM APIs that our hooks use

We don't need:
- MSW (we pass a mock fetcher function to `useApiResource`)
- A router mock for component tests (out of scope)
- Babel (Vitest uses esbuild internally)

## 2. The config

```ts
// frontend/vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['lib/**/*.{ts,tsx}'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

## 3. The setup file

```ts
// frontend/test/setup.ts
// Global test setup. Currently empty; we can add jest-dom matchers later.
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()  // unmount any rendered hooks/components between tests
  window.localStorage.clear()
})
```

This ensures:
- After each test, any rendered hooks are unmounted (no leaks)
- `localStorage` is cleared (no cross-test pollution)

## 4. The test files

### 4.1 `test/mappers.test.ts`

Tests for `lib/mappers.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  pickProductIcon,
  deriveStockStatus,
  parseCategorias,
  mapProducto,
  mapPedido,
} from '@/lib/mappers'
import type { ApiProducto, ApiPedido } from '@/lib/types'

describe('pickProductIcon', () => {
  it('returns pizza icon for "Pizza muzza"', () => { ... })
  it('returns sandwich icon for "Pancho"', () => { ... })
  it('returns soda icon for "Coca Cola"', () => { ... })
  it('returns water icon for "Agua"', () => { ... })
  it('returns combo icon for "Combo" by default for promo', () => { ... })
  it('returns default by type when no match', () => { ... })
})

describe('deriveStockStatus', () => {
  it('returns ilimitado when stockLimitado is 0', () => { ... })
  it('returns agotado when stockLimitado is 1 and stockActual is 0', () => { ... })
  it('returns bajo when stockLimitado is 1 and stockActual <= minimo', () => { ... })
  it('returns disponible when stockLimitado is 1 and stockActual > minimo', () => { ... })
  it('returns disponible when stockLimitado is 1 and stockActual is null', () => { ... })
})

describe('parseCategorias', () => {
  it('returns empty array for null', () => { ... })
  it('returns ["merienda"] for "Merienda"', () => { ... })
  it('returns ["merienda", "cena"] for "Merienda, Cena"', () => { ... })
  it('returns empty for "Otro"', () => { ... })
})

describe('mapProducto', () => {
  it('maps a full product correctly', () => { ... })
  it('handles string precio', () => { ... })
  it('handles null descripcion', () => { ... })
})

describe('mapPedido', () => {
  it('maps a full pedido with items', () => { ... })
  it('handles empty items', () => { ... })
})
```

### 4.2 `test/admin.test.ts`

Tests for `lib/admin.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  apiToAdminProduct,
  adminToApiPayload,
  apiToOrder,
  orderStatusToApi,
  apiToCocinaOrder,
  apiToCajaProduct,
  isCajaSoldOut,
  isCajaLowStock,
  mapOrderStatus,
} from '@/lib/admin'
import type { ApiProducto, ApiCocinaPedido, ApiItem, ApiPedido } from '@/lib/types'

describe('apiToAdminProduct', () => {
  it('converts string precio to number', () => { ... })
  it('keeps number precio', () => { ... })
  it('treats null stock_actual as 0', () => { ... })
  it('parses "Merienda" to ["merienda"]', () => { ... })
})

describe('adminToApiPayload', () => {
  it('converts stockLimited true to stock_limitado 1', () => { ... })
  it('omits stock_actual when stockLimited is false', () => { ... })
  it('converts active true to activo 1', () => { ... })
})

describe('apiToOrder', () => {
  it('maps a pedido with items', () => { ... })
  it('maps a pedido without items (empty lines)', () => { ... })
  it('treats comprobante_archivo_id null as no receipt', () => { ... })
})

describe('orderStatusToApi', () => {
  it('maps preparacion to en_preparacion', () => { ... })
  it('maps recibido to recibido', () => { ... })
  it('maps listo to listo', () => { ... })
  it('maps entregado to entregado', () => { ... })
  it('maps cancelado to cancelado', () => { ... })
})

describe('apiToCocinaOrder', () => {
  it('maps with items', () => { ... })
  it('maps without items (empty lines)', () => { ... })
  it('infers icon from product name', () => { ... })
})

describe('apiToCajaProduct', () => {
  it('maps a product with image', () => { ... })
  it('maps a product without image', () => { ... })
})

describe('isCajaSoldOut', () => {
  it('true when stockLimited and stockActual is 0', () => { ... })
  it('false when stockLimited and stockActual > 0', () => { ... })
  it('false when stockLimited is false', () => { ... })
  it('false when stockActual is null and stockLimited', () => { ... })
})

describe('isCajaLowStock', () => {
  it('true when stockActual <= minimo and > 0', () => { ... })
  it('false when stockActual is 0 (sold out, not low)', () => { ... })
  it('false when stockActual > minimo', () => { ... })
  it('false when stockLimited is false', () => { ... })
})

describe('mapOrderStatus', () => {
  it('maps recibido to recibido', () => { ... })
  it('maps en_preparacion to preparacion', () => { ... })
  it('maps listo to listo', () => { ... })
  it('maps entregado to entregado', () => { ... })
  it('maps cancelado to cancelado', () => { ... })
  it('maps unknown to recibido (default)', () => { ... })
})
```

### 4.3 `test/use-local-storage.test.ts`

Tests for `useLocalStorageState`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorageState } from '@/lib/use-local-storage'

const KEY = 'test-key'

describe('useLocalStorageState', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns defaultValue when localStorage is empty', () => { ... })
  it('returns stored value when localStorage has the key', () => { ... })
  it('setter writes to localStorage', () => { ... })
  it('setter with function receives current value', () => { ... })
  it('custom parse is used', () => { ... })
  it('custom serialize is used', () => { ... })
  it('two hooks with same key stay in sync via custom event', () => { ... })
})
```

### 4.4 `test/use-api-resource.test.ts`

Tests for `useApiResource`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useApiResource } from '@/lib/use-api-resource'

const mockData = [{ id: 1, name: 'test' }]

describe('useApiResource', () => {
  it('fetches on mount and populates data', async () => { ... })
  it('sets error when fetcher throws', async () => { ... })
  it('refetch updates data', async () => { ... })
  it('refetch({ silent: true }) does not toggle loading', async () => { ... })
  it('setData replaces data', () => { ... })
  it('setData with function receives current data', () => { ... })
  it('re-fetches when fetcher identity changes', async () => { ... })
})
```

## 5. CI integration

Add a `pnpm test` step in `.github/workflows/frontend-ci.yml`:

```yaml
- name: Test
  working-directory: frontend
  run: pnpm test
```

Between `Lint` and `Build`. If tests fail, CI fails.

## 6. What we explicitly don't test

| Not tested | Why |
|---|---|
| `DashboardScreen` | Pre-existing `tones` type issue; out of scope |
| `AuthProvider` | Needs router mock; complex setup; out of scope |
| `CartProvider` | Needs jsdom + RTL; out of scope for this change |
| Component tests (all 12+ screens) | Out of scope; separate change |
| E2E tests (Playwright) | Out of scope; separate change |
| API integration tests | Backend territory |

## 7. Why a single PR
- 6 new files (config + setup + 4 test files)
- 2 modified files (package.json scripts, CI workflow)
- ~50-60 test cases
- No source code changes (only test files + tooling)
- Self-contained: the test setup works without depending on future refactors
