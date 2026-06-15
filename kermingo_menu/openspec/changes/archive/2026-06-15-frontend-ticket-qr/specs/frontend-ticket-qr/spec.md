# Frontend Ticket QR Specification

## Purpose

Replace the decorative `FauxQR` in the confirmed ticket screen with a real, scannable QR code that encodes the public tracking URL. The QR must be hydration-safe, print-compatible, and must not expose private data beyond the tracking token.

## Requirements

### Requirement: Ticket screen MUST render a scannable QR code

The system MUST render a real QR code in `TicketScreen` (`/confirmado`) that encodes the full tracking URL for the order. The QR value MUST be `${origin}/seguimiento?token=${order.token}`, where `origin` is `window.location.origin` at runtime. The QR MUST NOT encode any private data (client name, phone, payment details).

#### Scenario: QR encodes correct tracking URL

- GIVEN an order with `token = "abc123"` exists in localStorage
- AND the page is rendered at `https://kermingo.example.com`
- WHEN the ticket screen renders
- THEN the QR code value is `https://kermingo.example.com/seguimiento?token=abc123`

#### Scenario: QR does not expose private data

- GIVEN an order with client name, phone, and payment info
- WHEN the QR code is scanned
- THEN the URL contains only the `token` query parameter
- AND no personal data (name, phone, payment method) is encoded in the QR

### Requirement: QR rendering MUST be hydration-safe

The system MUST avoid SSR/SSG hydration mismatch when rendering the QR code. The QR component MUST render only on the client side, using dynamic import, `useEffect` guard, or `typeof window !== 'undefined'` check.

#### Scenario: No hydration mismatch on server render

- GIVEN the ticket page is server-rendered by Next.js
- WHEN React hydrates the page on the client
- THEN no hydration mismatch warning appears in the console
- AND the QR code appears after client hydration completes

### Requirement: QR MUST be readable in printed output

The system MUST ensure the QR code is legible when the ticket is printed via `window.print()` or exported via jsPDF. The QR MUST render at a minimum size of 168x168 CSS pixels and use an SVG renderer for crisp output.

#### Scenario: QR is scannable on printed ticket

- GIVEN the ticket screen is displayed with a valid order
- WHEN the user triggers `window.print()`
- THEN the printed output includes a clearly visible QR code
- AND the printed QR code is scannable by a standard QR reader

### Requirement: Tracking screen MUST accept token from URL query parameter

The system MUST read a `token` query parameter from the URL on `/seguimiento` and auto-populate the tracking lookup. When a token is present in the URL, the tracking screen MUST automatically fetch the order status without requiring user input.

#### Scenario: QR scan auto-loads tracking

- GIVEN a user scans the ticket QR code
- AND the browser navigates to `/seguimiento?token=abc123`
- WHEN the tracking screen loads
- THEN the screen automatically fetches order data for token `abc123`
- AND the order details are displayed without user interaction

#### Scenario: Missing token shows manual input form

- GIVEN the user navigates to `/seguimiento` without a `token` parameter
- WHEN the tracking screen loads
- THEN the manual token input form is displayed
- AND no automatic fetch is attempted

#### Scenario: URL token takes precedence over localStorage

- GIVEN a token exists in localStorage
- AND the URL contains a different `token` query parameter
- WHEN the tracking screen loads
- THEN the URL token is used for the lookup
- AND the localStorage token is NOT used for the initial fetch

## Affected Components

| Component | Change |
|-----------|--------|
| `frontend/components/menu/ticket-screen.tsx` | Replace `FauxQR` with real QR component; client-only render |
| `frontend/components/menu/tracking-screen.tsx` | Read `token` from URL query params; auto-fetch on mount |
| `frontend/package.json` | Add QR library dependency (e.g., `qrcode.react`) |
