# Spec: Admin UI — Design System, Primitives, Layout

## Purpose

The admin area (`/admin/*`) needs a unified, sober design system that reads as a real operational tool rather than a generated dashboard. This capability defines the shared visual primitives, the header, and the layout shell. It also covers the login screen.

## Files

- `frontend/app/admin/layout.tsx` — `AuthProvider` wrapper for the entire admin tree
- `frontend/components/admin/admin-header.tsx` — sticky white header with brand mark, user email, logout
- `frontend/components/admin/admin-ui.tsx` — shared primitives (`Badge`, `SectionTitle`, `AdminCard`, `IconBox`, `AdminFooter`)
- `frontend/components/admin/login-screen.tsx` — login form with real backend POST + dev creds
- `frontend/app/globals.css` — `.font-display` utility (Archivo + Inter), prefers-reduced-motion
- `frontend/components/kermingo-logo.tsx` — reused for the brand mark (no change)
- `frontend/components/sol-de-mayo.tsx` — reused for fallback (no change)

## Requirements

### Auth Layout (`app/admin/layout.tsx`)

- Renders `<AuthProvider>{children}</AuthProvider>`.
- `AuthProvider` is a client component that:
  - Reads the session from `localStorage` key `kermingo:auth` on mount via `useEffect` (avoid SSR/hydration mismatch).
  - Stores `{ token: 'cookie', user: { id, nombre, email } }` after a successful login.
  - On mount + pathname change, if the user is unauthenticated and the route is `/admin/<something>` (not `/admin`), redirects to `/admin` with `router.replace`.
  - `login(email, password)` POSTs `POST /api/auth/login` with `{ email, contrasenia: password }`. On success, stores the session and pushes to `/admin/dashboard`. On error, sets an `error` string.
  - `logout()` POSTs `POST /api/auth/logout` (best-effort), clears the session, pushes to `/admin`.

### Admin Header (`admin-header.tsx`)

- White bar with a 1px bottom border (`bg-white border-b border-[#75AADB]/20`).
- Sticky to the top (`sticky top-0 z-50`).
- Inner container: `mx-auto max-w-6xl flex items-center justify-between gap-3 px-4 py-2.5`.
- Left side:
  - Optional back link (`h-9 w-9 rounded hover:bg-[#EEF5FF]`).
  - Brand link: `KermingoLogo` (`h-9 w-9 rounded bg-[#003B73]`) + brand text block:
    - Eyebrow: `Kermingo` in `font-mono text-[10px] uppercase tracking-[0.2em] text-[#75AADB]`.
    - Title: section name in `font-display text-base font-extrabold tracking-tight text-[#003B73] truncate`.
  - Optional status badge (sm+ only) with `Badge` (`ml-1 hidden sm:inline-flex`).
- Right side:
  - If a user is logged in and the route is not `/admin`: show a small block with "SESIÓN ACTIVA" eyebrow + user email (`text-xs font-medium text-[#003B73] max-w-[180px] truncate`) and a logout button (`rounded border border-[#75AADB]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#003B73] hover:bg-[#EEF5FF]`).

### Primitives (`admin-ui.tsx`)

- `Badge({ tone, children, className, uppercase, dot })`:
  - `rounded border px-2 py-0.5 font-mono text-[11px] font-medium`
  - Tones: `neutral` (EEF5FF/3A5675), `info` (EEF5FF/003B73), `success` (emerald-50/emerald-700), `warning` (amber-50/amber-700), `danger` (rose-50/rose-700), `gold` (F6B21A15/7A5500).
  - `uppercase` adds `uppercase tracking-wide`.
  - `dot` adds a 6px circle of current color.
- `SectionTitle({ children, action })`:
  - `mb-3 flex items-center justify-between gap-3 border-b border-[#75AADB]/15 pb-2`.
  - Title in `font-mono text-[11px] font-bold uppercase tracking-widest text-[#003B73]/60`.
- `AdminCard({ children, className })`:
  - `rounded-lg border border-[#75AADB]/20 bg-white` (no shadow).
- `IconBox({ icon, tone, className })`:
  - Tones: `blue` (azul/dorado), `gold` (dorado/azul), `slate` (slate-100/600), `emerald` (emerald-50/600), `amber` (amber-50/600), `sky` (sky-50/600), `red` (rose-50/600).
  - The icon container is `rounded` (not `rounded-xl`) with `h-4 w-4` icon and `strokeWidth={2.2}`.
- `AdminFooter()`:
  - Top border, centered text, `font-mono text-[11px] uppercase tracking-widest text-[#75AADB]/60`.

### Login Screen (`login-screen.tsx`)

- Renders inside the admin layout's `AuthProvider`.
- Uses `useAuth().login()` to submit.
- Form has email + password fields with the same show/hide toggle as before.
- Card header uses `KermingoLogo` in a `bg-[#F6B21A]` tile (instead of the `Tent` icon placeholder).
- On error, shows the backend's `error` string in the same red alert style.
- Below the submit button, dev-only credentials hint (`admin@kermingo.com` / `admin123`) in mono text.

### Global Styles (`globals.css`)

- `.font-display { font-family: var(--font-heading); letter-spacing: -0.025em; font-feature-settings: "ss01" on, "ss02" on; }` (kept but with reduced tracking).
- `@media (prefers-reduced-motion: reduce)` overrides on `*` (kept).
- `kermingo-input` utility kept as-is.

## Scenarios

1. **AUTH-1: Unauthenticated user visits `/admin/dashboard`** — `AuthProvider` mounts, reads empty storage, redirects to `/admin`. → User sees login form.
2. **AUTH-2: Authenticated user visits `/admin/cocina`** — `AuthProvider` reads existing session, no redirect. → Header shows email and logout. Main renders the cocina screen.
3. **AUTH-3: User logs out from header** — POST `/api/auth/logout` (best-effort) fires, `localStorage` cleared, push to `/admin`. → Login form reappears.
4. **UI-1: Dashboard renders 6 metric cells in a flat grid** — `gap-px` shared border, no shadow. → Looks like a single block, not 6 separate cards.
5. **UI-2: Quick-access on mobile** — 2×4 compact grid with `h-8 w-8` icons and 11px mono labels. → Fits in viewport without scrolling.
6. **UI-3: KermingoLogo on login** — 64×64 PNG in a dorado tile, fallback to SolDeMayo if image fails. → Brand consistency.
7. **UI-4: AdminHeader email block** — Truncates after 180px, no overflow. → No layout break on long emails.

## Testing Evidence

Manual visual check at 360px and 1024px viewports for:
- `/admin` (login form)
- `/admin/dashboard`
- `/admin/caja`
- `/admin/cocina`
- `/admin/pedidos`
- `/admin/productos`

Automated build: `pnpm build` produces 14 static pages with 0 errors.
