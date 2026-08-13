# Handoff OpenCode — Modo demo Vercel + baja Railway

> Documento para continuar en **OpenCode** lo trabajado en **Cursor** (sesión julio–agosto 2026).
> Proyecto: `kermingo_menu` dentro del monorepo `Kermingo`.
> Change SDD: `frontend-mock-mode-decommission-railway`

---

## 0. TL;DR para el agente OpenCode

1. **Objetivo del trabajo:** apagar Railway (dejar de pagar), dejar el portfolio permanente en Vercel con mocks + login simulado, guardar un snapshot SQL anonimizado en git, documentar revive/frontend.
2. **Código y docs del mock están en el working tree de `main`, PERO CASI NADA ESTÁ COMMITEADO.** Prioridad alta: revisar `git status`, armar commit(s) y push si Marcos lo pide.
3. **Vercel production YA se redeployó** (2026-07-28) con `NEXT_PUBLIC_MOCK_API=true` y sin `NEXT_PUBLIC_API_URL`. URL: https://kermingo.vercel.app
4. **Railway aún NO se apagó** (queda checklist manual).
5. **Imágenes de productos:** hay 23 imágenes reales para los IDs 1–13 y 15–24. El ID 14 usa fallback intencional porque no existe una foto exacta; los IDs 8 y 13 comparten chocotorta; el ID 24 representa parcialmente pizza + gaseosa.

---

## 1. Decisiones locked (Marcos)

| Tema | Decisión |
|------|----------|
| Fidelidad demo | Showcase A: UI navegable, mutaciones **no-op** (no persisten) |
| DB en GitHub | Snapshot **sanitizado** (sin PII real) |
| Repo | Público → nunca dump RAW |
| Backend | Código **queda** en repo, marcado apagado |
| Imágenes | Estáticas en `frontend/public/products/` |
| Vercel | Portfolio permanente |
| Auth demo | `admin@kermingo.com` / `admin123` |

---

## 2. Estado actual (qué está hecho vs pendiente)

### Hecho

| Ítem | Evidencia |
|------|-----------|
| SDD explore/propose/design/tasks/specs | `openspec/changes/frontend-mock-mode-decommission-railway/` |
| Specs promovidas | `openspec/specs/{mock-api-mode,archival-db-dump,demo-documentation}/` |
| Mock adapter + fixtures | `frontend/lib/mocks/` |
| Auth simulada | `admin-session.tsx`, `login-screen.tsx` |
| Banner demo | `frontend/components/demo-archive-banner.tsx` en `app/layout.tsx` |
| Env build gate | `scripts/env-guard.mjs` acepta mock; `package.json` build usa `--production` + `env -u NODE_ENV` |
| Archive SQL anonimizado | `backend/src/api/database/archives/2026-07-28-prod-anonymized.sql(.gz)` |
| Script anonimizar | `backend/scripts/anonymize-dump.mjs` |
| Docs IA | `MODO-DEMO.md`, `REVIVIR-BACKEND.md`, `GUIA-FRONTEND.md` + updates DEPLOY/SECRETS/INDEX/README |
| Tests unitarios mock | `frontend/test/mock-api.test.ts` (+ check-env, config) PASS en Cursor |
| Build mock local | `NEXT_PUBLIC_MOCK_API=true pnpm build` PASS |
| Vercel env | `NEXT_PUBLIC_MOCK_API=true` Production+Preview; API URL Railway removida |
| Deploy prod | Aliased a https://kermingo.vercel.app (deployment `dpl_8ztUsRioCct57fM4FRuHqr1VzMiU` / `kermingo-8cu75mu3e-…`) |
| Smoke prod parcial | Landing banner OK; `/menu` productos + tienda cerrada OK; `/admin` muestra credenciales demo; `/products/1.png` 200 |

### Pendiente / incompleto

| Ítem | Notas |
|------|--------|
| **Commit + push** del trabajo | Working tree sucio en `main`; sin esto OpenCode/otro clone no ve los cambios vía git |
| Login admin E2E en prod verificado por agente | Auto-review bloqueó tipeo de password en browser; Marcos puede probar en 10s |
| Teardown Railway | Checklist en `DEPLOY.md` §5 — **no borrar hasta confirmar smoke + dump** |
| Dump RAW real de Railway | No disponible en la sesión Cursor (Docker/MySQL local/Railway CLI fallaron). Archive actual = schema+seed+pedidos sintéticos |
| Imágenes reales de productos | 23 imágenes reales para IDs 1–13 y 15–24; ID 14 con fallback intencional; IDs 8 y 13 comparten chocotorta; ID 24 es una representación parcial de pizza + gaseosa |
| `sdd-archive` del change | verify-report existe pero incompleto re: Vercel (actualizar y archivar) |
| Actualizar `verify-report.md` | Debe reflejar redeploy Vercel OK (julio 28) |

---

## 3. Arquitectura del modo demo

```text
Browser → Next.js (Vercel)
            │
            ├─ NEXT_PUBLIC_MOCK_API=true
            │     → frontend/lib/api.ts despacha a lib/mocks/adapter.ts
            │     → fixtures (productos, pedidos, config, reportes)
            │     → auth localStorage key kermingo:demoSession
            │
            └─ imágenes same-origin /products/{id}.png
```

Sin Railway: no Express, no MySQL, no Drive en runtime.

Flag y helpers:

- `frontend/lib/mocks/mode.ts` — `isMockApi()`, credenciales demo, texto banner
- `frontend/lib/mocks/session.ts` — read/write demo session
- `frontend/lib/mocks/fixtures.ts` — datos
- `frontend/lib/mocks/adapter.ts` — rutas GET + no-ops WRITE
- `frontend/lib/api-error.ts` — `ApiError` (extraído para evitar ciclos)
- `frontend/lib/api.ts` — intercepta si mock
- `frontend/lib/config.ts` — con mock, `API_BASE = ''`

---

## 4. Archivos tocados (mapa rápido)

### Frontend (core)

```text
frontend/lib/mocks/*                    # NUEVO
frontend/lib/api.ts                     # mock intercept
frontend/lib/api-error.ts               # NUEVO
frontend/lib/config.ts                  # mock → API_BASE vacío
frontend/components/demo-archive-banner.tsx
frontend/app/layout.tsx                 # banner
frontend/components/admin/admin-session.tsx
frontend/components/admin/login-screen.tsx
frontend/scripts/env-guard.mjs
frontend/scripts/check-env.mjs          # --production
frontend/package.json                   # build: check-env --production && env -u NODE_ENV next build
frontend/.env.local.example
frontend/test/mock-api.test.ts
frontend/test/check-env.test.ts
frontend/test/config.test.ts
frontend/public/products/{1..13,15..24}.png # 23 imágenes reales; ID 14 usa fallback
```

### Backend / datos

```text
backend/scripts/anonymize-dump.mjs
backend/src/api/database/archives/README.md
backend/src/api/database/archives/2026-07-28-prod-anonymized.sql
```

### Docs

```text
DOCUMENTACION/IA/MODO-DEMO.md
DOCUMENTACION/IA/REVIVIR-BACKEND.md
DOCUMENTACION/IA/GUIA-FRONTEND.md
DOCUMENTACION/IA/DEPLOY.md          # arquitectura demo + checklist Railway
DOCUMENTACION/IA/SECRETS.md
DOCUMENTACION/IA/INDEX.md
README.md (kermingo_menu)
```

### OpenSpec

```text
openspec/changes/frontend-mock-mode-decommission-railway/
  exploration.md proposal.md design.md tasks.md verify-report.md specs/
openspec/specs/mock-api-mode/spec.md
openspec/specs/archival-db-dump/spec.md
openspec/specs/demo-documentation/spec.md
```

### Repo root (monorepo Kermingo)

```text
.gitignore                              # ignora *-prod-RAW.sql
.vercel/                                # link local (no commitear)
```

---

## 5. Vercel — cómo está configurado

| Setting | Valor |
|---------|--------|
| Proyecto | `marcos-toledos-projects/kermingo` |
| URL | https://kermingo.vercel.app |
| Root Directory | `kermingo_menu/frontend` (relativo al root del repo git `Kermingo`) |
| Build | `pnpm build` |
| Env Production/Preview | `NEXT_PUBLIC_MOCK_API=true` |
| Env removida | `NEXT_PUBLIC_API_URL` (ya no apunta a Railway) |

**Importante CLI:** deployar desde `/home/marcos/Escritorio/Kermingo` (raíz git), NO desde `frontend/`, porque el Root Directory es `kermingo_menu/frontend`. Si linkeás solo dentro de `frontend/`, Vercel busca un path doble y falla.

```bash
cd /home/marcos/Escritorio/Kermingo
npx vercel link --yes --project kermingo --scope marcos-toledos-projects
npx vercel deploy --prod --yes --scope marcos-toledos-projects
```

---

## 6. Comandos útiles

```bash
# Frontend demo local
cd kermingo_menu/frontend
# .env.local: NEXT_PUBLIC_MOCK_API=true
pnpm install
pnpm dev
pnpm exec vitest run test/mock-api.test.ts test/check-env.test.ts test/config.test.ts
NEXT_PUBLIC_MOCK_API=true pnpm build

# Anonimizar un dump RAW (nunca commitear el RAW)
cd kermingo_menu/backend
node scripts/anonymize-dump.mjs /ruta/kermingo-prod-RAW.sql \
  src/api/database/archives/YYYY-MM-DD-prod-anonymized.sql
```

Credenciales demo: `admin@kermingo.com` / `admin123`

---

## 7. Checklist recomendado para OpenCode (orden)

### A. Versionar (si Marcos autoriza commit)

1. `git status` / `git diff` en repo `Kermingo`.
2. No incluir `.env`, `.env.local`, `.vercel/`, dumps `*RAW*`.
3. Incluir mocks, archives anonimizados, docs, openspec, imágenes public/products.
4. Commit message sugerido (estilo repo):

```text
feat(kermingo): modo demo en Vercel y archive SQL anonimizado

Deja el portfolio sin Railway: mocks + login simulado, snapshot
sanitizado en git y docs de revive/frontend.
```

5. Push a `origin/main` (o PR si prefieren ramas).

### B. Cerrar verificación prod

1. Abrir https://kermingo.vercel.app/admin → login demo → dashboard.
2. Confirmar que no hay requests a `*.railway.app` (DevTools Network).
3. Actualizar `verify-report.md` (Vercel = OK).

### C. Datos / imágenes (opcional pero valioso)

1. Si Railway aún vive: `mysqldump` RAW privado → anonimizar → reemplazar archive.
2. Mantener documentadas las excepciones actuales: ID 14 con fallback, IDs 8 y 13 comparten chocotorta, ID 24 representa parcialmente pizza + gaseosa.
3. Recién después: teardown Railway (`DEPLOY.md` §5) + revocar OAuth.

### D. Archive SDD

1. Completar tasks.md checkboxes Vercel/Railway.
2. `sdd-archive` del change `frontend-mock-mode-decommission-railway`.
3. Sync final `DOCUMENTACION/IA/` si hace falta.

---

## 8. Trampas conocidas (gotchas de esta sesión)

1. **`pnpm` setea `NODE_ENV=production` en script `build`** → rompe prerender `_global-error` en Next 16. Fix aplicado: `env -u NODE_ENV next build`.
2. **Root Directory Vercel** = `kermingo_menu/frontend` respecto a repo `Kermingo`. Deploy CLI desde raíz del monorepo.
3. **Docker/MySQL no estaban disponibles** en el entorno Cursor → archive sintético, no dump prod real.
4. **Auto-review de Cursor** bloqueó: (a) deploy prod hasta aprobación, (b) tipeo de password en browser aunque sea demo. En OpenCode no aplica igual; en Cursor hay que reintentar con approval.
5. **Nada committeado** — la producción se deployó por CLI con el working tree local; si se pierde el working tree sin commit, se pierde el código (aunque el deploy en Vercel ya tenga el bundle).

---

## 9. Documentación relacionada (leer según tarea)

| Pregunta | Doc |
|----------|-----|
| ¿Cómo funciona el demo? | `DOCUMENTACION/IA/MODO-DEMO.md` |
| ¿Cómo revivir backend? | `DOCUMENTACION/IA/REVIVIR-BACKEND.md` |
| ¿Dónde editar frontend/fixtures? | `DOCUMENTACION/IA/GUIA-FRONTEND.md` |
| ¿Deploy / checklist Railway? | `DOCUMENTACION/IA/DEPLOY.md` |
| ¿Secrets? | `DOCUMENTACION/IA/SECRETS.md` |
| ¿Mapa docs? | `DOCUMENTACION/IA/INDEX.md` |
| ¿Diseño SDD? | `openspec/changes/frontend-mock-mode-decommission-railway/design.md` |
| ¿Verify? | `…/verify-report.md` (actualizar) |
| Guía agentes general | `AGENTS.md` |

---

## 10. Prompt sugerido para pegar en OpenCode

```text
Continuar Kermingo: change frontend-mock-mode-decommission-railway.

Leé DOCUMENTACION/IA/HANDOFF-OPENCODE-MOCK-DEMO.md y AGENTS.md.

Estado: modo mock ya implementado y deployado en https://kermingo.vercel.app
con NEXT_PUBLIC_MOCK_API=true. Código casi todo sin commit en main.

Prioridades:
1) Pedirme confirmación y commitear/pushear el working tree (sin secrets/RAW).
2) Actualizar verify-report.md con redeploy Vercel OK.
3) Smoke login admin en prod.
4) Si hay dump Railway RAW, anonimizar; si no, documentar queue.
5) NO apagar Railway hasta checklist DEPLOY.md §5 completo.
6) Archivar el change SDD cuando verify esté limpio.

Frontend activo: kermingo_menu/frontend. No tocar diseno-de-landing-kermingo/.
```

---

## 11. Checkpoints

```txt
Checkpoint automatico: listo (código mock + docs + build + deploy prod)
Checkpoint manual requerido: si (commit/push + login admin smoke + baja Railway)
Auditoria con ChatGPT recomendada: no
Bloquea apagar Railway: si, hasta dump deseado + smoke confirmado
```

Última actualización del handoff: 2026-08-04 (Continuación Cursor → OpenCode).
