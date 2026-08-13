## Exploration: Frontend mock mode + Railway decommission (archival/demo)

### Current State

Kermingo is a dual-deploy system: **Vercel** serves `frontend/` (Next.js 16 / React 19); **Railway** runs `backend/` (Express + MySQL + Google Drive). The event (20 Jun 2026) already happened — the goal is archival/demo on Vercel without paying for Railway, plus a recoverable DB backup on GitHub.

**API coupling today**

- All browser API traffic goes through `frontend/lib/api.ts` → `API_BASE` from `frontend/lib/config.ts` (`NEXT_PUBLIC_API_URL`).
- Helpers use `credentials: 'include'` and parse `{ ok, data, message }` / `{ ok: false, error }`.
- Admin session truth is the httpOnly cookie `kermingo_admin_token` + `GET /api/auth/me` (`admin-session.tsx`). Login/logout also call `fetch(API_BASE/...)` directly (not always via `api.ts`).
- Production build gate: `pnpm build` runs `NODE_ENV=production node scripts/check-env.mjs`, which **requires** non-empty `NEXT_PUBLIC_API_URL` (`env-guard.mjs`). Empty URL → broken images/API and failed build.
- No Next.js rewrites/proxy to the backend. Product images are relative `/api/productos/:id/imagen?v=…` resolved via `ABSOLUTE_IMAGE_URL(API_BASE)`. Comprobantes use Drive `url_publica` + authenticated proxy `/api/admin/pedidos/:id/comprobante/imagen`.

**Mocks today**

- Only Vitest `vi.mock('@/lib/api')` in tests. No production mock layer, no MSW, no Route Handlers under `frontend/app/api/`.
- `NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS` only toggles UI hint for `admin@kermingo.com` / `admin123`; login still hits the real backend.
- Seed already has that admin user; store defaults to `estado='cerrada'` in `seed.sql`.

**API surface that mock mode must cover (minimum for a usable demo)**

| Area | Key endpoints |
|------|----------------|
| Public | `GET /productos`, `GET /productos/:id/imagen`, `GET /configuracion-tienda`, `POST /pedidos` (multipart), `GET /pedidos/seguimiento/:token`, `GET /health` |
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Admin pedidos | list/detail/estado/pago/cancelar/edit, caja create, comprobante meta + image proxy, aprobar |
| Cocina | list/detail/estado |
| Productos admin | CRUD-ish list/create/update/stock/desactivar/recuperar/orden/componentes/imagen |
| Config / reportes | admin config GET/PUT, `GET /admin/reportes` |

Full catalog is in `DOCUMENTACION/IA/API.md` (~30+ routes). Mutations (stock, orders, uploads) need either in-memory simulation or graceful no-ops with toast.

**DB / Drive**

- Schema+seed already in git: `backend/src/api/database/{schema.sql,indexes.sql,seed.sql}` (~200 lines). Production MySQL on Railway holds real pedidos (PII: names, phones), `archivo_drive` rows, and possibly product images beyond seed.
- Binary assets for products/comprobantes live in Google Drive, not in the repo. `frontend/public/products/` has limited local placeholders (~1.7MB). Demo receipt PNGs already exist under `public/` (GOTCHAS §28).
- Secrets (JWT, DB, Google OAuth) live only in Railway/Vercel env — must never enter a git dump.

### Affected Areas

- `frontend/lib/api.ts` — single choke point for most API calls; best place for a mock adapter flag
- `frontend/lib/config.ts` + `frontend/scripts/{check-env,env-guard}.mjs` — production `NEXT_PUBLIC_API_URL` gate; mock mode must satisfy or relax this
- `frontend/components/admin/admin-session.tsx` + `login-screen.tsx` — cookie/`/auth/me`/`/auth/login` bypass for simulated admin
- `frontend/lib/mappers.ts`, `frontend/lib/admin.ts` — image URL absolute resolution; fixtures must emit absolute or same-origin paths
- `frontend/components/**` (menu, checkout, tracking, all admin screens) — consumers of API; behavior when store closed / mutations fail
- `frontend/public/` — static product/branding assets for demo without Drive
- `backend/src/api/database/*` — already versioned revival baseline; optional dump under e.g. `backend/src/api/database/archives/`
- `DOCUMENTACION/IA/{DEPLOY,SECRETS,WEBAPP,INFRA,AUTENTICACION}.md` + root `README.md` — decommission, reactivation, frontend-mod guide
- Vercel env — remove/replace Railway URL; set mock flags
- Railway — stop after backup confirmed (out of code scope for this change)

### Approaches

#### A. Mock API strategies

1. **Client-side mock adapter in `lib/api.ts` (feature flag)** — When `NEXT_PUBLIC_MOCK_API=true` (or `API_BASE` empty + mock flag), intercept `apiGet/Post/...` and return fixtures / in-memory store. Special-case auth in `admin-session` / login to skip real cookies (local session only).
   - Pros: Small surface; no MSW dependency; works on Vercel static/SSR without server routes; easy to ship; credentials/CORS irrelevant; aligns with existing Vitest mock style.
   - Cons: Bypass of `fetch` paths that call `API_BASE` directly (login/me/logout) must be updated too; binary image routes need static `public/` mapping; multipart checkout must be simulated; not a real HTTP contract for future clients.
   - Effort: Medium

2. **Next.js Route Handlers as mock API (`frontend/app/api/**`)** — Point `NEXT_PUBLIC_API_URL` at same origin (`''` or `https://kermingo.vercel.app`) and implement handlers mirroring Express routes with JSON fixtures + cookie simulation.
   - Pros: Real HTTP; images/comprobantes can be served from `public/`; cookie auth can be faked with Set-Cookie on same origin; build gate can keep requiring API URL (self).
   - Cons: Large rewrite of many handlers; serverless cold starts; duplicating Zod/business rules; multipart + streaming proxies are awkward on Vercel; higher maintenance.
   - Effort: High

3. **MSW (browser worker) in production/demo** — Service worker intercepts network.
   - Pros: Transparent to call sites; good DX for tests too.
   - Cons: Extra dependency; SW on Vercel/CDN quirks; SSR/first paint may still hit real network; overkill for archival demo; auth cookie semantics still messy.
   - Effort: Medium–High

4. **Static JSON fixtures + UI-only demo (disable mutations)** — Ship read-only menu/admin views from static JSON; hide checkout/caja writes or show “demo” banner.
   - Pros: Lowest code; safest (no fake writes).
   - Cons: Admin flows feel dead; tracking/checkout demos weak; still need auth bypass for admin pages.
   - Effort: Low–Medium

5. **Keep a free-tier/minimal backend elsewhere** — Not mock mode; contradicts “stop paying Railway” unless free host is acceptable.
   - Pros: Full fidelity.
   - Cons: Still a hosted backend + DB + Drive secrets; not what Marcos asked.
   - Effort: Medium (ops)

#### B. Database backup on GitHub strategies

1. **Anonymized mysqldump of production** — Dump schema+data with names/phones/tokens redacted; store under `backend/src/api/database/archives/YYYY-MM-DD-prod-anonymized.sql` (gzip if large). Document restore steps.
   - Pros: Realistic revival data for demos/analytics; GitHub as vault.
   - Cons: Must scrub PII carefully; Drive file IDs still dead without Drive; may need LFS if huge; never include secrets.
   - Effort: Medium

2. **Schema + seed only (already in repo)** — Rely on existing `schema.sql`/`indexes.sql`/`seed.sql`; optionally export product catalog snapshot as JSON for frontend fixtures.
   - Pros: No PII risk; already versioned; enough to revive empty system.
   - Cons: Loses real event pedidos/reportes history.
   - Effort: Low

3. **Full raw mysqldump (unredacted) in private repo / release asset** — Complete fidelity.
   - Pros: Perfect restore.
   - Cons: **PII in git** (phones, names); unacceptable for public GitHub; even private repos are risky without access control docs.
   - Effort: Low dump / High compliance risk

4. **Git LFS for large dump + images** — If dump or exported Drive binaries are large.
   - Pros: Keeps clone manageable.
   - Cons: LFS setup; still need anonymization policy.
   - Effort: Medium

### Recommendation

**Primary: Approach A1 (client mock adapter + fixtures) + B1/B2 hybrid for DB.**

1. **Frontend demo mode**
   - Add `NEXT_PUBLIC_MOCK_API=true` (and optionally keep `NEXT_PUBLIC_API_URL` pointing at a dummy same-origin or a documented placeholder so `check-env` still passes — or extend `env-guard` to accept mock mode as production-valid).
   - Implement a thin mock layer behind `api.ts` plus the three raw `fetch` auth call sites.
   - Fixtures derived from seed catalog (24 products) + a handful of sample pedidos (synthetic PII) + `configuracion_tienda` with `estado: 'cerrada'` and a public archival message.
   - Simulated admin: accept demo credentials locally; set `adminUser` in localStorage; `/auth/me` mock returns authenticated without httpOnly cookie.
   - Product images: map to `/products/*.png` or icon fallbacks (already in UI); comprobantes: use existing `public/*receipt*.png` demo assets; no Drive.
   - Mutations: in-memory store for the browser session (or optimistic UI + reset on reload) so caja/cocina/pedidos feel alive without persistence.
   - Banner: clear “Modo demo / archivo — evento finalizado” on public + admin.

2. **Database / GitHub**
   - **Must-have before Railway teardown:** anonymized dump (B1) *or* confirm Marcos accepts seed-only revival (B2).
   - Keep schema+seed as the canonical revive path; put anonymized dump in `backend/src/api/database/archives/` with README section “Restore”.
   - Do **not** commit OAuth/JWT/DB passwords. Export Drive files separately only if Marcos wants binaries (optional zip outside git or LFS).

3. **Docs package (GitHub-facing)**
   - Update `DEPLOY.md`: Vercel-only demo architecture; Railway archived.
   - Update `SECRETS.md`: which vars to delete; mock flags.
   - Add short `docs/` or README sections: “Reactivate backend”, “Modify frontend”, “Mock mode”.
   - Document decommission checklist: dump → verify Vercel mock → remove Railway → revoke Google OAuth if unused.

4. **Why not Route Handlers / MSW first**
   - Archival goal favors minimal cost and minimal surface. A1 reuses the existing API client choke point and Vitest patterns. Route Handlers are a fallback if same-origin cookies/images prove painful.

### Risks

- **Build gate:** `check-env.mjs` fails without `NEXT_PUBLIC_API_URL` — mock mode must update guard or keep a dummy URL.
- **Auth dual path:** login/`me`/logout use raw `fetch`, not only `api.ts` — easy to miss and leave admin broken.
- **PII in dumps:** `pedido.nombre_cliente`, `telefono_cliente`, WhatsApp fields — public repo must anonymize or omit.
- **Dead Drive URLs:** product images and comprobantes break when Railway/Drive stop; fixtures must not depend on `archivo_drive` / Railway hosts.
- **CORS/cookies:** irrelevant in mock mode, but reactivation docs must restore `FRONTEND_URL` + `sameSite:'none'` gotchas.
- **False “live store”:** if mock leaves store `abierta` and checkout “succeeds”, visitors may think they ordered — default closed + banner required.
- **Scope creep:** full mutation fidelity for all admin endpoints is large; prefer session in-memory + soft-fail for rare paths (image upload, Excel, etc.).
- **Secrets leftover on Railway/Vercel:** OAuth refresh tokens should be revoked when Drive is retired.
- **Incomplete endpoint coverage:** screens that hit uncommon routes (aprobar comprobante, reorder, componentes) will error unless mocked or gracefully disabled.

### Open questions for Marcos

1. **Demo fidelity:** read-only archive (menu + closed store + login to browse empty-ish admin) vs interactive admin (caja/cocina/pedidos mutate in-memory)?
2. **Real pedidos history:** anonymized prod dump on GitHub, seed-only revive, or private dump outside git?
3. **Product photos:** keep icon-only / `public/products` placeholders, or export current Drive images into `public/` before teardown?
4. **Vercel URL:** keep `https://kermingo.vercel.app` live indefinitely as portfolio demo?
5. **Google Drive / OAuth:** revoke and delete folder after backup, or leave files in Drive as cold storage?
6. **Public checkout:** fully disabled vs fake success that never persists?
7. **Acceptable demo credentials:** keep advertising `admin@kermingo.com` / `admin123` via `NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=true`?

### Ready for Proposal

**Yes** — enough codebase and ops context to draft a proposal. Orchestrator should confirm Marcos’s answers on questions 1–3 (fidelity, dump policy, images) before locking design; default recommendation if unanswered: **interactive in-memory mock + seed fixtures + anonymized dump if Railway still reachable, else seed-only**.
