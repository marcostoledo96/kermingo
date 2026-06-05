# Proposal: Backend Base Scaffolding

## Intent
Create the `backend/` folder as a standalone Express ESM project with a minimal, production-ready foundation. This enables the Kermingo API to exist, serve a health endpoint, and establish the conventions (MVC, uniform responses, centralized config, error handling) that all future backend stages will follow. It unblocks parallel work on MySQL schema (B1), auth (B4), and product endpoints (B3).

## Scope

### In Scope
- `backend/package.json` — ESM project with `type: module`, scripts `dev`/`start`/`test`
- `backend/.env.example` — PORT=3001 template
- `backend/.gitignore` — node_modules, .env, credentials
- `backend/src/server.js` — entry point, bootstraps app and listens
- `backend/src/app.js` — Express app with global middleware (json, urlencoded, cookieParser, cors, logger, 404, error handler)
- `backend/src/api/routes/index.routes.js` — `GET /api/health` returns `{ ok: true }`
- `backend/src/api/config/environments.js` — centralized config (port, frontendUrl placeholders)
- `backend/src/api/utils/respuesta.utils.js` — `success()` / `error()` response helpers
- `backend/src/api/utils/errors.js` — `AppError` and `ValidationError` custom classes
- `backend/src/api/middlewares/error.middleware.js` — global error middleware (uniform JSON, hides stack in prod)

### Out of Scope
- MySQL connection, schema, seed (B1)
- Zod validation schemas or middleware (B2)
- Product, auth, order, cash, kitchen endpoints (B3–B7)
- File upload, Google Drive, ExcelJS (B6–B7)
- JWT, bcrypt, roles (B4)
- Jest / Supertest tests (deferred until first controllers exist)

## Capabilities

### New Capabilities
- `api-health`: `GET /api/health` liveness probe
- `uniform-responses`: Standardized JSON envelope (`{ ok, data, message }` / `{ ok, error }`)
- `centralized-config`: Single `environments.js` source of truth for env vars
- `error-handling`: Global middleware with custom error classes

### Modified Capabilities
- None

## Approach
1. Create folder structure under `backend/src/api/`
2. Write `package.json` with ESM, Express, dotenv, cors, cookie-parser + nodemon dev
3. Implement config → utils → middleware → routes → app → server in dependency order
4. Use Spanish naming for files/routes per AGENTS.md
5. Keep all `process.env` access inside `environments.js`
6. Verify with `npm install && npm run dev && curl http://localhost:3001/api/health`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/` | New | Entire backend project created |
| `backend/src/api/config/` | New | Centralized env config |
| `backend/src/api/utils/` | New | Response helpers + error classes |
| `backend/src/api/middlewares/` | New | Global error handler |
| `backend/src/api/routes/` | New | Health route only |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Port 3001 conflicts with local services | Low | Configurable via `.env` |
| ESM module resolution issues on Windows | Low | Use `.js` extensions in imports |
| CORS origin misconfiguration later | Low | Placeholder array in config, fill at integration |

## Rollback Plan
Delete `backend/` folder and remove from monorepo. No impact on existing `frontend/` or `diseno-de-landing-kermingo/`.

## Dependencies
- Node.js ≥ 18 (already available)
- No database, auth, or external APIs needed for this stage

## Success Criteria
- [ ] `npm install` completes without errors
- [ ] `npm run dev` starts server on port 3001
- [ ] `curl http://localhost:3001/api/health` returns `{ ok: true }`
- [ ] `backend/.gitignore` ignores `.env` and `node_modules`
- [ ] No `process.env` scattered outside `environments.js`
