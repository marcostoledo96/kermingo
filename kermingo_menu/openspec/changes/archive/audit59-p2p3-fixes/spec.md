# Spec: Kermingo audit59 P2/P3 follow-ups

## P2-1 — MenuScreen config loading/error disables add-to-cart

### Scenario: Store config loading disables add-to-cart
**Given** MenuScreen is mounted
**And** `useApiResource` for `/api/configuracion-tienda` is in `loading: true` state
**When** user sees product cards
**Then** cards are not interactable (no add to cart, no quantity change)
**And** a status banner reads "Verificando si la tienda está abierta…"

### Scenario: Store config error disables add-to-cart and shows retry
**Given** MenuScreen is mounted
**And** `useApiResource` for `/api/configuracion-tienda` returned `error`
**When** user sees product cards
**Then** cards are not interactable
**And** a banner reads "No pudimos verificar si la tienda está abierta. Reintentá."
**And** a "Reintentar" button is shown and triggers `refetch`

### Requirements
- `isStoreDisabled` must be `true` when `storeConfigLoading || storeConfigError || storeConfig?.estado === 'cerrada' || storeConfig?.estado === 'demo'`.
- The status banner must be rendered above the product grid (not as an alert) and must not block the product list visually.
- `FloatingCartBar` must remain hidden or disabled while `isStoreDisabled` is true.

## P2-2 — Strict cross-check of receipt extension vs MIME

### Scenario: Receipt with .png extension and image/jpeg MIME is rejected
**Given** a file with `originalname: 'comprobante.png'` and `mimetype: 'image/jpeg'`
**When** `validateReceiptUploadMetadata(file)` is called
**Then** it throws a `ValidationError` mentioning the extension/MIME mismatch

### Scenario: Receipt with .jpg extension and image/jpeg MIME is accepted
**Given** a file with `originalname: 'comprobante.jpg'` and `mimetype: 'image/jpeg'`
**When** `validateReceiptUploadMetadata(file)` is called
**Then** it does NOT throw

### Scenario: Receipt with .jpeg extension and image/jpeg MIME is accepted
**Given** a file with `originalname: 'comprobante.jpeg'` and `mimetype: 'image/jpeg'`
**When** `validateReceiptUploadMetadata(file)` is called
**Then** it does NOT throw

### Requirements
- Backend `validateReceiptUploadMetadata` must cross-check `file.mimetype` against `ALLOWED_RECEIPT_EXTENSIONS[extension]`.
- Frontend must mirror the same rule with an `EXTENSION_TO_MIME` map.
- The error message must explicitly say "extensión" and "tipo" so users understand the problem.

## P3-2 — Rename frontend package

### Scenario: Frontend package.json has a meaningful name
**Given** `frontend/package.json`
**When** read
**Then** `name` field is `"kermingo-frontend"`

### Requirements
- Single line change in `frontend/package.json`.

## Verification Commands
```bash
# Backend
cd kermingo_menu/backend
npm test -- --testPathPattern=comprobantes.unit
npm test -- --testPathPattern=caja

# Frontend
cd kermingo_menu/frontend
pnpm test
pnpm exec tsc --noEmit
pnpm lint
NEXT_PUBLIC_API_URL=http://localhost:3001 pnpm build
```
