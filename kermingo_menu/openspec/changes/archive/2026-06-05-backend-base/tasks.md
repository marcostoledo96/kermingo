# Tasks: Backend Base Scaffolding

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~180 (12 files, mostly new) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | PR | Notes |
|------|------|----|-------|
| 1 | Create backend base scaffolding | Single PR | 12 files, ~180 lines; includes all deps, config, middleware, health endpoint |

---

## Phase 1: Infrastructure / Foundation

- [ ] 1.1 Create `backend/package.json` with `"type": "module"`, deps (express, dotenv, cors, cookie-parser), devDeps (nodemon), scripts `dev`/`start`/`test`
- [ ] 1.2 Create `backend/.env.example` with `PORT=3001`, `NODE_ENV=development`, `FRONTEND_URL` placeholder
- [ ] 1.3 Create `backend/.gitignore` ignoring `node_modules/`, `.env`, `*.log`, upload temp dirs
- [ ] 1.4 Create `backend/src/api/controllers/.gitkeep` and `backend/src/api/models/.gitkeep` as MVC scaffold placeholders

## Phase 2: Core Utilities & Config

- [ ] 2.1 Create `backend/src/api/config/environments.js` — reads `.env`, exports frozen config with defaults (port=3001, nodeEnv=development); fail-fast on missing required vars
- [ ] 2.2 Create `backend/src/api/utils/errors.js` — `AppError`, `ValidationError`, `NotFoundError`, `AuthError` classes with `statusCode`
- [ ] 2.3 Create `backend/src/api/utils/respuesta.utils.js` — `respuestaExitosa(res, data, message, status=200)` and `respuestaError(res, error, status=500)`; no raw `res.json()` outside helpers

## Phase 3: Middleware & Routes

- [ ] 3.1 Create `backend/src/api/middlewares/error.middleware.js` — global error handler: known `AppError` uses `statusCode`, unknown → 500 generic message, includes `stack` only when `NODE_ENV !== "production"`
- [ ] 3.2 Create `backend/src/api/routes/index.routes.js` — mounts `GET /api/health` returning uniform success envelope with `data.status="ok"` and `data.timestamp` ISO 8601

## Phase 4: App & Server Assembly

- [ ] 4.1 Create `backend/src/app.js` — Express app factory registering middleware in order: `json()` → `urlencoded()` → `cookieParser()` → `cors({ origin, credentials:true })` → logger → `/api` router → 404 handler → error middleware (last)
- [ ] 4.2 Create `backend/src/server.js` — entry point: imports config + app, calls `app.listen(config.port)`

## Phase 5: Verification

- [ ] 5.1 Run `npm install` in `backend/` and confirm no errors
- [ ] 5.2 Run `npm run dev` and confirm server starts on port 3001
- [ ] 5.3 `curl http://localhost:3001/api/health` returns `200` with `{ ok: true, data: { status: "ok", timestamp: "..." } }`
- [ ] 5.4 `curl -X POST http://localhost:3001/api/health` returns `404` with uniform error envelope `{ ok: false, error: "..." }`
- [ ] 5.5 `curl http://localhost:3001/api/unknown` returns `404` uniform error envelope
- [ ] 5.6 Static check: no `process.env` outside `environments.js`; no raw `res.json(` outside `respuesta.utils.js`
