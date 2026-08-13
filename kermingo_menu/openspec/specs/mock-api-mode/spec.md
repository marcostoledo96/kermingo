# Spec: mock-api-mode

## Purpose

Enable a production-safe Vercel portfolio where the frontend serves public and admin UI without a live Express/MySQL backend.

## Requirements

### Requirement: Feature flag

The system SHALL activate mock mode when `NEXT_PUBLIC_MOCK_API` is the string `true`.

When mock mode is active, production builds SHALL succeed without a real `NEXT_PUBLIC_API_URL` pointing at Railway.

### Requirement: API interception

In mock mode, `apiGet`, `apiPost`, `apiPut`, `apiPatch`, `apiDelete`, and `apiPostForm` SHALL NOT perform network requests to an external backend.

Read endpoints SHALL return fixture data shaped like the real `{ ok, data }` contract (helpers already unwrap `data`).

Write endpoints SHALL return a successful fake payload or a clear demo error without mutating durable state across reloads (showcase no-op).

### Requirement: Simulated admin auth

In mock mode, login SHALL accept `admin@kermingo.com` / `admin123` (and reject other credentials).

Session truth SHALL be local UI state (e.g. localStorage), not an httpOnly cookie.

`/api/auth/me` equivalent SHALL report authenticated when the simulated session exists.

Logout SHALL clear the simulated session.

`NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS` MAY be `true` on the portfolio deploy.

### Requirement: Archival UX

Mock fixtures SHALL expose store configuration with `estado: 'cerrada'` and a public archival message.

The public and admin UI SHALL show a visible demo/archive banner stating the event is finished and the site is a demo.

Product image URLs in fixtures SHALL resolve to same-origin paths under `/products/` (or documented placeholders).

### Requirement: Tests

Unit tests SHALL cover mock flag gating, demo login success/failure, and at least one public GET fixture path.
