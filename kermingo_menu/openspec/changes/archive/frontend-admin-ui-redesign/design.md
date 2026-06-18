# Design: Admin UI Redesign

## Architecture

The admin tree (`/admin/*`) wraps every route in an `AuthProvider` (client component) that holds the session in `localStorage` and gates access via `router.replace('/admin')` when unauthenticated. The login screen uses `useAuth().login()` to POST to `/api/auth/login`; on success the session is stored and the user is pushed to `/admin/dashboard`.

All admin views share:
- `AdminHeader` — sticky white bar with brand mark, section title, optional status badge, user email, logout.
- `admin-ui` primitives — `Badge`, `SectionTitle`, `AdminCard`, `IconBox`, `AdminFooter` with consistent sober styling.
- `KermingoLogo` (PNG with SolDeMayo SVG fallback) as the brand mark on login and header.
- Mock data stays in the screen file (no API call); only the login/logout hits the backend.

## Visual System

### Palette (brand, sober, no pastel Tailwind)

| Role | Token | Usage |
|---|---|---|
| Primary | `#003B73` | text, brand |
| Secondary | `#75AADB` | metadata, secondary lines |
| Background | `#EEF5FF` | page background |
| Surface | `#FFFFFF` | cards, header |
| Accent | `#F6B21A` | dorado, CTAs |
| Tinta (text) | `#3A5675` | body text on light bg |
| Success | `emerald-50 / emerald-700` | only for "Pagado" payment state |
| Warning | `amber-50 / amber-700` | stock bajo |
| Danger | `rose-50 / rose-700` | cancelado, error |

Tailwind pastels (`emerald-50/100/600`, `amber-50/100/600`, `rose-50/100/600`, `sky-50/100/600`) are NOT used outside the documented exception (success on payment status). Estado is communicated by icon + text color, not by saturated background.

### Typography

- **Display**: `font-display` (`Archivo` from `next/font/google`) at `text-2xl sm:text-3xl font-extrabold tracking-tight` for h1; `text-base font-extrabold` for h2 in section titles.
- **Body**: Inter default, `text-sm` for paragraphs, `text-xs` for metadata.
- **Mono / code**: `font-mono` with `text-[11px] uppercase tracking-widest` for labels, statuses, KMG codes, prices, hours. Tabular numbers via default Inter.

### Layout

- Outer page background `#EEF5FF`.
- Page header is a white bar with bottom border, sticky, container `max-w-6xl px-4 py-2.5`.
- Main container: `max-w-6xl mx-auto px-4 pt-3 pb-10 sm:pt-4 sm:pb-16`.
- Spacing rhythm: `space-y-5` between sections, `gap-2` on tight grids, `gap-3` on loose grids, `gap-px` on dense "table-like" grids.

### Anti-AI patterns removed

- No `shadow-xl`, `shadow-2xl`, `drop-shadow-*` on admin cards.
- No `rounded-2xl` / `rounded-3xl` on small elements (header icons, badges). `rounded` (4px) or `rounded-lg` (8px) only.
- No decorative emoji. Lucide icons only, used functionally.
- No "EN VIVO" / "Modo demo" extra pills on the header (kept only the canonical "Modo demo" badge where relevant).
- No redundant contextual banners (the "Sábado 20 de junio ..." line is removed; the date lives in the header of the home only and in the meta of the page).

### Dense grid pattern (Dashboard metrics & Quick access)

```jsx
<div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#75AADB]/20 bg-[#75AADB]/20 sm:grid-cols-3 lg:grid-cols-6">
  <Cell ... />
</div>
```

A single shared border and 1px gaps between cells produce a "Notion / Linear table" look without box-shadows.

## Backend Wiring

None. The login and logout routes already exist:
- `POST /api/auth/login` — returns `{ ok, data: { usuario: { id, nombre, email } }, message }` and sets the httpOnly cookie.
- `POST /api/auth/logout` — clears the cookie.

`lib/api.ts` automatically attaches `Authorization: Bearer <token>` from `localStorage` if present, but the backend's admin routes rely on the httpOnly cookie (`credentials: 'include'` is already enabled).

## Files Touched

1. `frontend/app/admin/layout.tsx` (new)
2. `frontend/components/admin/admin-header.tsx` (modified)
3. `frontend/components/admin/admin-ui.tsx` (modified)
4. `frontend/components/admin/login-screen.tsx` (modified)
5. `frontend/components/admin/dashboard-screen.tsx` (modified)
6. `frontend/components/admin/caja-screen.tsx` (modified)
7. `frontend/components/admin/cocina-screen.tsx` (modified)
8. `frontend/components/admin/orders-screen.tsx` (modified)
9. `frontend/components/admin/products-screen.tsx` (modified)
10. `frontend/components/admin/product-form-dialog.tsx` (modified — minimal)
11. `frontend/app/globals.css` (minor; reduced tracking on `.font-display`)
12. `frontend/public/branding/escudo-{grupo-san-patricio,tropa-raider,comunidad-raider}.png` (new; placeholders)

## Out-of-scope but documented

- Real-time updates of pedidos / cocina via SSE or polling (handled in etapa-5-pedidos change spec).
- Replace DEMO_ORDERS in `orders-screen.tsx` with `apiGet('/api/admin/pedidos')`.
- Replace DEMO_PRODUCTS in `products-screen.tsx` with `apiGet('/api/admin/productos')`.
- Real-time QR generation for ticket scanning (using `qrcode.react`).
- ESLint 10.4.1 known circular-structure bug (workaround: keep `ignoreBuildErrors` in `tsconfig` or downgrade).
