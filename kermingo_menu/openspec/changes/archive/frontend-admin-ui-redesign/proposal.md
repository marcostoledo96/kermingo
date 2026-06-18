# Change: frontend-admin-ui-redesign

## Intent

The admin area (login, header, primitives, dashboard, caja, cocina, pedidos, productos) has accumulated "AI-style" generic patterns: heavy `shadow-xl` cards, pastel Tailwind chips (`emerald-50`, `amber-50`, `rose-50`, `sky-50`), inflated `rounded-2xl` everywhere, decorative `lucide` icons used as decoration rather than function, redundant headers, an unnecessary contextual banner ("Sábado 20 de junio · 17 a 21 hs · Kermingo 2026") in the dashboard, and a quick-access grid that is too large and slow to scan on mobile. The user explicitly asked to:
- Refactor to a "herramienta operativa" aesthetic (Linear / Notion / Vercel dashboard) — not the "AI startup" look.
- Add the Kermingo logo to the login and admin header.
- Remove the redundant event banner from the dashboard.
- Make the quick-access grid more compact and agile.
- Remove pastel Tailwind colors; use the brand palette (azul #003B73, celeste #75AADB / #EEF5FF, dorado #F6B21A, tinta #3A5675) consistently.
- Apply a more characterful typography stack for display, body and code/numbers.
- Reduce visual gaps and unify the spacing rhythm.
- Apply lenses from installed design skills: `impeccable` (audit + correction plan), `frontend-design` (anti-AI patterns), `minimalist-ui` (mono + sober palette), `emil-design-eng` (component polish).

This is a client-side-only refactor. No backend, schema, API, or business logic changes.

## Scope

### In Scope

1. **Admin layout** — wrap `/admin/*` in `AuthProvider`, redirect to `/admin` if not authenticated.
2. **Admin primitives** (`admin-ui.tsx`) — sober `Badge`, `SectionTitle` with bottom-border, flat `AdminCard` (no shadow), compact `IconBox`, `AdminFooter` with mono text.
3. **Admin header** (`admin-header.tsx`) — include the `KermingoLogo` (with PNG + SVG fallback), show logged-in user email, real logout button.
4. **Login** (`login-screen.tsx`) — use `KermingoLogo` instead of `Tent`, connect to `POST /api/auth/login` via `useAuth`, show backend errors and dev-only credentials hint.
5. **Dashboard** (`dashboard-screen.tsx`) — remove redundant banner; compact metrics grid (gap-px with shared border); compact quick-access (4×2 on desktop, 2×4 on mobile, smaller icons, no card); dense orders table.
6. **Caja** (`caja-screen.tsx`) — apply the same primitives/header/typography; compact POS grid + cart drawer.
7. **Cocina** (`cocina-screen.tsx`) — apply primitives/header; compact KANBAN-like flow (recibido → en preparación → listo).
8. **Pedidos** (`orders-screen.tsx`) — apply primitives/header; table+detail; use the same `DEMO_ORDERS` until backend wiring.
9. **Productos** (`products-screen.tsx` + `product-form-dialog.tsx`) — apply primitives/header; compact ABM table.
10. **Brand consistency** — use the `KermingoLogo` everywhere a brand mark is needed; ensure the `SolDeMayo` SVG and `KermingoLogo` PNG are reused, not duplicated.
11. **Empty/placeholder escudos** — 3 placeholder PNGs for the institutional shields, so the footer CrestRow does not 404.

### Out of Scope

- Backend changes (no API, schema, controllers, or routes modified).
- Connecting the admin mock screens to the real API (a separate change; data is still mock in 4 of 5 views).
- Public pages (home, menu, carrito, confirmar, confirmado, seguimiento) — already polished in earlier changes.
- Changing the actual font family loaded (still `Inter` + `Archivo`); the typography lens is applied to hierarchy/scale/weighting.
- The decorative graphics in the public pages (bingo card, banderines).

## Capabilities

### New Capabilities

- `admin-ui-system`: shared design tokens, primitives, header and layout for the admin area. Sober palette, dense layout, mono for codes.

### Modified Capabilities

- `admin-dashboard` (currently MOCK): apply new header, primitives, layout.
- `admin-caja` (currently MOCK): apply new header, primitives, layout.
- `admin-cocina` (currently MOCK): apply new header, primitives, layout.
- `admin-pedidos` (currently MOCK): apply new header, primitives, layout.
- `admin-productos` (currently MOCK): apply new header, primitives, layout.
- `admin-login`: connect to real backend via `useAuth`, use `KermingoLogo`, show dev creds.

## Approach

- **Layout & header** — Convert the admin header from a dark blue slab with a generic `Tent` icon to a clean white bar with a bottom border, using the `KermingoLogo` component (PNG with SolDeMayo fallback) and the user email + logout. Use `max-w-6xl` container and tighter padding.
- **Primitives** — Replace the rounded-2xl + shadow-xl style on `AdminCard` with a flat `rounded-lg` + 1px border. `Badge` uses `font-mono` and `text-[11px]`. `IconBox` is `rounded` (not `rounded-xl`) and 20×20. `SectionTitle` keeps a bottom border for a magazine-like divider.
- **Dashboard** — Remove the "Sábado 20 de junio · 17 a 21 hs · Kermingo 2026" banner (already in the page metadata + footer). Replace metric cards with a dense grid using `gap-px` and shared border (Notion-style). Replace quick-access grid with a 4×2 compact cell grid (`py-2`, `h-8 w-8` icon, label 11px). Orders table gets a denser row height (`py-2.5`) and hover row background.
- **Caja / Cocina / Pedidos / Productos** — Wrap each in the new `AdminHeader` and apply the same primitive set. Internal layout remains as-is (KANBAN for cocina, POS for caja, table+detail for pedidos, ABM table for productos) but with consistent spacing, mono codes, and brand palette.
- **Login** — Replace the `Tent` placeholder with the actual `KermingoLogo`. Layout kept similar (centered card with brand header) but cleaner.
- **Color usage** — Replace `emerald-50/100/600`, `amber-50/100/600`, `rose-50/100/600`, `sky-50/100/600` with brand-aligned variants: `bg-[#EEF5FF]` / `text-[#3A5675]` for neutral; `bg-[#F6B21A]/15` / `text-[#7A5500]` for warning; `bg-rose-50` / `text-rose-700` for danger; `bg-emerald-50` / `text-emerald-700` only for the "Pagado" success state. Borders `border-[#75AADB]/20` consistently.
- **Typography** — Display headings use `font-display` (Archivo Black) with `tracking-tight`. Labels and metadata use `font-mono` 10–11px uppercase with `tracking-widest`. Numbers and prices use `font-mono` for tabular figures. Body text uses Inter default.
- **Spacing** — `space-y-7` → `space-y-5`, `pt-6 pb-16` → `pt-4 pb-10`, `py-3` → `py-2.5` on list items, `gap-3` → `gap-2` on tight grids.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/app/admin/layout.tsx` | New | `AuthProvider` wrapper for `/admin/*` |
| `frontend/app/globals.css` | Modified | Sober utility classes; reduced `font-display` aggression |
| `frontend/components/admin/admin-header.tsx` | Modified | White bar + KermingoLogo + user email + logout |
| `frontend/components/admin/admin-ui.tsx` | Modified | Sober primitives, mono labels, flat cards |
| `frontend/components/admin/login-screen.tsx` | Modified | KermingoLogo, real backend login, dev creds |
| `frontend/components/admin/dashboard-screen.tsx` | Modified | Remove banner, dense grid, compact quick-access |
| `frontend/components/admin/caja-screen.tsx` | Modified | New header + primitives applied |
| `frontend/components/admin/cocina-screen.tsx` | Modified | New header + primitives applied |
| `frontend/components/admin/orders-screen.tsx` | Modified | New header + primitives applied |
| `frontend/components/admin/products-screen.tsx` | Modified | New header + primitives applied |
| `frontend/public/branding/escudo-{grupo-san-patricio,tropa-raider,comunidad-raider}.png` | New | Placeholder PNGs (64×64) for the institutional shields |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Turbopack/SWC + `Record<string, ...>` indexed by a typed prop can return `undefined` at runtime | Med | Add `as const` and `?? tones.slate` defensive fallback (as already done in dashboard). Apply the same pattern when introducing new tone maps. |
| Compaction reduces breathing room and the layout feels cramped on small screens | Med | Keep `pt-3 / pb-10` on mobile main, `pt-4 / pb-12` on desktop; keep 16:24 vertical rhythm; preserve `safe-area-inset-bottom` in floating cart and sticky bar |
| Escudos are placeholders — they look like solid color squares until real images are provided | Low | Document the file paths in the `CrestRow` component (already done); add TODO comment in admin-ui for the user to drop in real PNGs |
| Switching away from "AI-style" colors might feel less playful | Low | The brand palette is still warm thanks to the Sol de Mayo + dorado accent; visual interest comes from typography and density, not from saturated chips |
| Reused mock data (caja/cocina/pedidos/productos) does not match new state machines | Low | Mock data is local to each screen; no change to types or business logic |

## Rollback Plan

Revert the PR for `feature/frontend-admin-ui-redesign`. No backend or schema changes, so rollback restores the visual state without affecting the data model.

## Dependencies

- None external.
- The `KermingoLogo` component and the `SolDeMayo` SVG must exist in the codebase (already present in `frontend/components/`).
- The `useAuth` hook and `AuthProvider` (created in `etapa-4-auth`) must be present and stable.

## Success Criteria

- [ ] `pnpm build` from `frontend/` passes with 0 errors and all 14 routes prerender
- [ ] `pnpm lint` from `frontend/` shows no new errors (existing bug in ESLint 10.4.1 is known and accepted)
- [ ] All 5 admin routes render: `/admin/dashboard`, `/admin/caja`, `/admin/cocina`, `/admin/pedidos`, `/admin/productos`
- [ ] Login with `admin@kermingo.com` / `admin123` succeeds and redirects to `/admin/dashboard`
- [ ] KermingoLogo is visible on `/admin` and on every admin page header
- [ ] AdminHeader shows the logged-in user email and a working logout button
- [ ] Dashboard has no "Sábado 20 de junio..." banner
- [ ] No Tailwind pastel colors (`emerald-50/100/600`, `amber-50/100/600`, `rose-50/100/600`, `sky-50/100/600`) in the admin primitives or layouts
- [ ] All numbers, codes and timestamps in admin tables render in `font-mono`
- [ ] Visual rhythm and palette are coherent across all 5 admin views
- [ ] Manual check at 360px and 1024px shows no overflow, no broken layout, no missing logo

## Single-PR Decision

Single PR. All changes are tightly coupled to the admin visual system and share a single primitive set. Splitting would create cross-file inconsistencies in header/primitives/palette that no one PR can resolve alone. Estimated changed lines: ~600–800 (front-end only). Above the 400-line budget, so this is a `size-exception` PR with explicit `frontend-admin-ui-redesign` change ID for traceability.
