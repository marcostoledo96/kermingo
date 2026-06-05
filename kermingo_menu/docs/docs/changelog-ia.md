# Changelog IA

## Fase 1 — Backend Base Scaffolding (2026-06-05)

### Cambios aplicados

- Creado scaffolding completo `backend/` como proyecto Express ESM standalone.
- 12 archivos creados:
  - `backend/package.json` — ESM (`type: module`), deps express/cors/cookie-parser/dotenv, dev nodemon
  - `backend/.env.example` — PORT=3001, NODE_ENV=development, FRONTEND_URL placeholder
  - `backend/.gitignore` — node_modules, .env, *.log
  - `backend/src/server.js` — entry point con dotenv + app.listen
  - `backend/src/app.js` — Express app factory con middleware global
  - `backend/src/api/routes/index.routes.js` — GET /api/health con envelope uniforme
  - `backend/src/api/config/environments.js` — config centralizada con Object.freeze
  - `backend/src/api/utils/respuesta.utils.js` — respuestaExitosa / respuestaError
  - `backend/src/api/utils/errors.js` — AppError + ValidationError + NotFoundError + AuthError
  - `backend/src/api/middlewares/error.middleware.js` — global error handler
  - `backend/src/api/controllers/.gitkeep` + `backend/src/api/models/.gitkeep` (MVC scaffold)
- Stack verificado: Express 4.21, ESM, 4 specs, 14 scenarios — todos PASS
- curl tests: GET /api/health → 200, POST /api/health → 404, /api/unknown → 404 ✅
- No `process.env` fuera de environments.js, no `res.json()` fuera de helpers ✅

### Verificación

| Test | Resultado |
|------|-----------|
| `npm install` | ✅ Sin errores |
| `npm run dev` | ✅ Servidor inicia en puerto 3001 |
| `GET /api/health` | ✅ 200 + envelope `{ ok: true, data: { status: "ok", timestamp: "..." } }` |
| `POST /api/health` | ✅ 404 + envelope `{ ok: false, error: "Ruta no encontrada" }` |
| `GET /api/unknown` | ✅ 404 + envelope uniforme |
| grep `process.env` | ✅ Solo en environments.js |
| grep `res.json(` | ✅ Solo en respuesta.utils.js |

---

## Fase 0 — Setup y preparación del proyecto (2026-06-04)

### Cambios aplicados

- Creada carpeta `frontend/` con copia del prototipo v0 desde `diseno-de-landing-kermingo/`.
- `diseno-de-landing-kermingo/` se conserva intacta como referencia visual.
- Instalado pnpm 11.5.1 vía `npm install -g pnpm --prefix ~/.local/`.
- Instaladas dependencias frontend (602 paquetes, Next.js 16.2.6).
- Agregado ESLint (`eslint`, `eslint-config-next`, `@eslint/eslintrc`) como devDependencies.
- Creado `eslint.config.mjs` para flat config de ESLint v10.
- Creado `.npmrc` con `onlyBuiltDependencies` para msw, sharp, unrs-resolver.
- Instaladas 13 skills externas desde skills.sh:
  - `vercel-labs/next-skills` (next-best-practices, next-cache-components, next-upgrade)
  - `vercel-labs/agent-skills` (vercel-composition-patterns, deploy-to-vercel, vercel-react-best-practices, vercel-react-native-skills, vercel-react-view-transitions, vercel-cli-with-tokens, vercel-optimize, web-design-guidelines, writing-guidelines)
  - `mattpocock/skills` (tdd)
- Sincronizadas skills locales a `.agents/skills/` (kermingo-backend-api, kermingo-frontend-v0, kermingo-verification).
- Ejecutado `gentle-ai skill-registry refresh --force` → 55 skills registradas.
- Creado `docs/docs/registro-skills.md` con clasificación completa de todas las skills.
- Build exitoso: ✅ `pnpm build` compila correctamente (Next.js 16.2.6 + Turbopack).
- Lint parcial: ESLint v10 tiene conflicto con `eslint-config-next` (circular structure error). El build funciona.

### Problemas detectados y estado

- ESLint: conflicto entre ESLint v10 y `eslint-config-next`. Build no está bloqueado.
- pnpm 11.5.1: políticas estrictas de build scripts resueltas con `.npmrc`.
- Engram: naming conflict entre `kermingo` y `entradas_kermingo`.

---

## Actualización documentación — referencia visual obligatoria

Se actualizó la documentación para reflejar que la carpeta:

```txt
/home/marcos/Escritorio/Kermingo/kermingo_menu/diseno-de-landing-kermingo
```

es la referencia visual obligatoria del frontend.

Cambios aplicados:

- Actualizado `AGENTS.md`.
- Actualizado índice maestro.
- Actualizada estructura real del proyecto.
- Agregado `25-REFERENCIA_VISUAL_FRONTEND.md`.
- Agregado `26-AGENTS_Y_SKILLS.md`.
- Reescritas tareas frontend detalladas con rutas reales.
- Reescritas tareas backend e integración para respetar estructura actual.
- Agregado script `docs/scripts/sincronizar_skills_a_raiz.sh`.
