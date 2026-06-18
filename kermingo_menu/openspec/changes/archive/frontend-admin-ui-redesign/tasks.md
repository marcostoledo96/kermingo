# Tasks: frontend-admin-ui-redesign

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~600-800 |
| 400-line budget risk | High (size-exception) |
| Chained PRs recommended | No |
| Suggested split | Single PR (cohesion) |
| Delivery strategy | single-pr |

Decision needed before apply: No (user already approved scope = complete).
Chained PRs recommended: No (5 admin views share a single primitive set).
Chain strategy: size-exception.
400-line budget risk: High (single exception).

## Scenario → Test → Task Traceability

| Scenario (from Spec) | Domain | Task(s) | Evidence |
|----------------------|--------|---------|----------|
| AUTH-1 unauth → /admin redirect | admin-ui-system | 1.1 | Playwright: clear storage, visit /admin/dashboard, expect /admin |
| AUTH-2 auth → /admin/cocina renders | admin-ui-system | 1.2 | Playwright: login, visit /admin/cocina, expect 200 |
| AUTH-3 logout flow | admin-ui-system | 1.3 | Playwright: click logout, expect redirect to /admin, storage cleared |
| LOGIN-1 KermingoLogo on login | admin-ui-system | 2.1 | Visual: PNG or fallback SVG visible |
| HEADER-1 KermingoLogo on every admin page | admin-ui-system | 2.2 | Visual: header shows logo on all 5 admin routes |
| HEADER-2 user email + logout | admin-ui-system | 2.3 | Playwright: header shows admin@kermingo.com |
| DASH-1 no "Sábado 20 de junio..." banner | admin-ui-system | 3.1 | Visual: banner absent |
| DASH-2 dense metric grid (gap-px) | admin-ui-system | 3.2 | Visual: 6 cells share borders, no shadows |
| DASH-3 compact quick-access 4×2 | admin-ui-system | 3.3 | Visual: 7 cells in 2 rows desktop, 2×4 mobile |
| DASH-4 dense orders table | admin-ui-system | 3.4 | Visual: tabular figures, mono KMG codes, hover row |
| CAJA-1 caja applies new header & primitives | admin-ui-system | 4.1 | Visual: 360/1024 |
| COCINA-1 cocina applies new header & primitives | admin-ui-system | 4.2 | Visual: 360/1024 |
| PEDIDOS-1 pedidos applies new header & primitives | admin-ui-system | 4.3 | Visual: 360/1024 |
| PRODUCTOS-1 productos applies new header & primitives | admin-ui-system | 4.4 | Visual: 360/1024 |
| BUILD-1 pnpm build passes | admin-ui-system | 5.1 | `pnpm build` 0 errors |
| LAYOUT-1 no overflow at 360/1024 | admin-ui-system | 5.2 | Playwright overflowX check |

## Phase 1: Auth + Layout (1 file new, 1 modified)

- [x] 1.1 Create `frontend/app/admin/layout.tsx` exporting `AuthProvider`-wrapped layout.
- [x] 1.2 Verify `lib/auth.tsx` redirects unauthenticated users from any `/admin/*` route (except `/admin`) to `/admin`.

## Phase 2: Header + Primitives + Login (4 files modified, 0 new)

- [x] 2.1 Refactor `admin-header.tsx` to a clean white bar with KermingoLogo, brand text, optional status badge, user email, working logout button.
- [x] 2.2 Refactor `admin-ui.tsx` primitives: sober `Badge` (mono, sober tones), `SectionTitle` (bottom border, mono title), flat `AdminCard`, compact `IconBox`, mono `AdminFooter`.
- [x] 2.3 Refactor `login-screen.tsx` to use `KermingoLogo` and `useAuth().login()`, show backend errors, show dev creds.
- [x] 2.4 Create 3 placeholder PNGs (64×64) for `public/branding/escudo-{grupo-san-patricio,tropa-raider,comunidad-raider}.png`.

## Phase 3: Dashboard refactor (1 file modified)

- [x] 3.1 Remove the redundant "Sábado 20 de junio · 17 a 21 hs · Kermingo 2026" banner.
- [x] 3.2 Replace metric cards with a dense grid using `gap-px` and shared border.
- [x] 3.3 Replace quick-access cards with a compact cell grid (4×2 desktop, 2×4 mobile).
- [x] 3.4 Make the orders table denser (py-2.5, hover row, mono KMG codes and prices).
- [x] 3.5 Add defensive `?? tones.slate` in `tones[tone]` to avoid runtime undefined (already done).

## Phase 4: Apply to remaining admin screens (4 files modified)

- [x] 4.1 Apply new header + primitives to `caja-screen.tsx` (keep POS layout, refresh style).
- [x] 4.2 Apply new header + primitives to `cocina-screen.tsx` (keep KANBAN-like flow).
- [x] 4.3 Apply new header + primitives to `orders-screen.tsx` (keep table+detail).
- [x] 4.4 Apply new header + primitives to `products-screen.tsx` (keep ABM table).
- [x] 4.5 Minimal touch on `product-form-dialog.tsx` (use new Badge / SectionTitle if present).

## Phase 5: Verify

- [x] 5.1 `pnpm build` from `frontend/` passes with 0 errors and 14 static pages.
- [x] 5.2 Playwright screenshots at 360px and 1024px viewports for `/admin` (login), `/admin/dashboard`, `/admin/caja`, `/admin/cocina`, `/admin/pedidos`, `/admin/productos`. Manual visual check.
- [x] 5.3 Confirm no Tailwind pastel colors in admin primitives (grep for `emerald-|amber-|rose-|sky-` and `bg-emerald|bg-amber|bg-rose|bg-sky`).
