# Design: frontend-ticket-qr

## Technical Approach

We will replace the mock QR code (`FauxQR`) on the ticket confirmation screen with a real, scannable QR code using the `qrcode.react` library. The QR code will encode the tracking URL populated with the order's unique `token`. To handle automatic lookup upon scanning, the tracking screen will be updated to read the `token` parameter from the URL using Next.js's `useSearchParams`. 

## Architecture Decisions

### Decision: QR Generation Library

**Choice**: `qrcode.react`
**Alternatives considered**: `qrcode` (requires a React wrapper), `react-qr-code`.
**Rationale**: `qrcode.react` is a widely adopted, lightweight React library that exposes a direct `<QRCodeSVG />` component. Rendering as an SVG natively scales infinitely without pixelation, guaranteeing crisp readability during `window.print()` or PDF exports, satisfying the printability requirement.

### Decision: URL Reading in Tracking Screen

**Choice**: Use `useSearchParams` from `next/navigation` wrapped in `<Suspense>` at the page level.
**Alternatives considered**: Manually parsing `window.location.search` inside a `useEffect`.
**Rationale**: `useSearchParams` is the idiomatic way to access query parameters in Next.js App Router. Wrapping `<TrackingScreen />` in `<Suspense>` inside `app/seguimiento/page.tsx` is required by Next.js to prevent the route from fully de-optimizing during build and to silence React hydration warnings.

### Decision: Hydration Safety in Ticket Screen

**Choice**: Use `typeof window !== 'undefined'` inline since `order` state is managed by `useSyncExternalStore`.
**Alternatives considered**: A dedicated `useEffect` to set `window.location.origin` in state.
**Rationale**: The custom `useLocalStorageState` uses `useSyncExternalStore`, which intentionally returns the default value (`null` for `order`) during the server render and fetches from localStorage on the first client render. Therefore, if `order` evaluates to truthy, execution is definitively occurring on the client. Checking `typeof window !== 'undefined' ? window.location.origin : ''` is completely safe here and avoids a double-render layout shift.

### Decision: QR Color and Sizing

**Choice**: Use the brand's dark blue (`#003B73`) for the QR code foreground and SVG renderer at 144px.
**Alternatives considered**: Pure black (`#000000`).
**Rationale**: The brand's dark blue `#003B73` provides exceptionally high contrast against the white background, ensuring standard QR readers can easily scan it. Preserving the exact dimensions (a 144px QR code inside a 168px padded container) ensures zero visual layout shift compared to the existing `FauxQR`.

## Data Flow

    Ticket Screen (`/confirmado`)
         │
         ├── Reads `order` from localStorage.
         ├── Generates tracking URL: `https://.../seguimiento?token=XYZ`
         └── Renders `<QRCodeSVG>` with tracking URL.
         
    User Scans QR
         │
         ▼
    Tracking Screen (`/seguimiento?token=XYZ`)
         │
         ├── Reads `token` from `useSearchParams()`.
         ├── Prioritizes URL token over localStorage token.
         ├── Updates localStorage with the new token.
         └── Triggers `fetchByToken(token)` on mount.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/package.json` | Modify | Add `qrcode.react` to `dependencies`. |
| `frontend/components/menu/ticket-screen.tsx` | Modify | Remove `FauxQR`. Import `QRCodeSVG` from `qrcode.react`. Render real QR encoding the dynamic tracking URL. |
| `frontend/app/seguimiento/page.tsx` | Modify | Wrap `<TrackingScreen />` inside a `<Suspense>` boundary to correctly support `useSearchParams` in the Next.js App Router. |
| `frontend/components/menu/tracking-screen.tsx` | Modify | Import `useSearchParams`. Read `token` from URL and use it as the prioritized token source for the initial `fetchByToken` call. |

## Interfaces / Contracts

No new API contracts or types are required. We are simply appending `?token=<token>` to the existing frontend URL and reading it.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Tracking Screen Token Init | Mount `TrackingScreen` with a mocked `useSearchParams` returning `?token=abc`. Verify `fetchByToken('abc')` is invoked on mount. |
| Unit | Ticket Screen QR Render | Render `TicketScreen` with a mock order. Assert that `<QRCodeSVG>` is present and its `value` prop matches the expected tracking URL. |
| Manual | Print Output | Open the `/confirmado` page with a test order, trigger `window.print()`, and verify the QR code is legible and scannable in the PDF preview. |
| Manual | E2E Scan Flow | Generate a real QR code on `/confirmado`, scan it with a mobile device, and ensure it correctly redirects to `/seguimiento` and auto-fetches the order. |

## Migration / Rollout

No data migration or rollout flags are required.

## Open Questions

- None.
