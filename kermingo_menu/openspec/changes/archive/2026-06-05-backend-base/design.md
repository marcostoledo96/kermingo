# Design: Backend Base Scaffolding

## Technical Approach

Create `backend/` as a standalone Express ESM project with 10 files (~180 lines). Establish four foundational capabilities from the specs: health probe, uniform JSON envelopes, centralized env config, and global error handling with custom classes. No database, no auth, no business logic. MVC folders are created empty with `.gitkeep` to signal the pattern for B1–B7.

## Architecture Decisions

| Decision | Options | Tradeoffs | Choice |
|----------|---------|-----------|--------|
| Module system | CommonJS vs ESM | CJS has wider tool compat; ESM aligns with AGENTS.md, modern Node, and tree-shaking | ESM (`"type": "module"`) |
| Config pattern | Scattered `process.env` vs single module | Single module adds one import everywhere; prevents missing-env bugs and eases testing | `environments.js` — single source of truth |
| Error classes | Plain `Error` vs custom hierarchy | Custom classes add ~15 lines; give predictable status codes and cleaner middleware logic | `AppError` + `ValidationError`, `NotFoundError`, `AuthError` |
| Response helpers | Raw `res.json()` vs wrapper functions | Wrappers enforce envelope shape; trivial runtime cost | `respuestaExitosa()` / `respuestaError()` |
| Middleware 404 | Implicit vs explicit | Explicit 404 handler ensures uniform error envelope for unknown routes | Explicit 404 middleware before error handler |
| Stack traces | Always include vs env-gated | Always exposing stack leaks internals; hiding it hurts local debugging | Include `stack` only when `NODE_ENV !== "production"` |

## Data Flow

```
Request
   │
   ▼
express.json() ──► express.urlencoded() ──► cookieParser() ──► cors()
   │
   ▼
Logger (console)
   │
   ▼
/api/* routes ──► index.routes.js ──► respuestaExitosa(res, data, message)
   │
   ▼
404 middleware (route not found) ──► respuestaError(res, error, 404)
   │
   ▼
error.middleware.js
   ├── Known AppError ──► status = error.statusCode
   └── Unknown Error ──► status = 500, generic message
   │
   ▼
Client receives { ok: true|false, data/error, message? }
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/package.json` | Create | ESM project manifest; deps: express, dotenv, cors, cookie-parser; dev: nodemon |
| `backend/.env.example` | Create | Template env vars: `PORT=3001`, `NODE_ENV=development`, `FRONTEND_URL` placeholder |
| `backend/.gitignore` | Create | Ignore `node_modules/`, `.env`, `*.log`, upload temp dirs |
| `backend/src/server.js` | Create | Entry point: imports config + app, calls `app.listen(config.port)` |
| `backend/src/app.js` | Create | Express app factory: registers global middleware, mounts `/api` router, 404, error handler |
| `backend/src/api/routes/index.routes.js` | Create | Health route `GET /api/health` using `respuestaExitosa` |
| `backend/src/api/config/environments.js` | Create | Reads `.env`, exports frozen config object; defaults port=3001, nodeEnv=development; fail-fast on missing required vars |
| `backend/src/api/utils/respuesta.utils.js` | Create | `respuestaExitosa(res, data, message, status=200)` and `respuestaError(res, error, status=500)` |
| `backend/src/api/utils/errors.js` | Create | `AppError`, `ValidationError`, `NotFoundError`, `AuthError` classes |
| `backend/src/api/middlewares/error.middleware.js` | Create | Global error handler: delegates to `respuestaError`, includes `stack` only in dev |
| `backend/src/api/controllers/.gitkeep` | Create | MVC scaffold placeholder |
| `backend/src/api/models/.gitkeep` | Create | MVC scaffold placeholder |

## Dependency Graph (Topological Order)

```
1. environments.js        (no deps)
2. errors.js              (no deps)
3. respuesta.utils.js     (no deps)
4. error.middleware.js    → errors.js, respuesta.utils.js, environments.js
5. index.routes.js        → respuesta.utils.js
6. app.js                 → environments.js, error.middleware.js, index.routes.js, respuesta.utils.js
7. server.js              → environments.js, app.js
```

## Middleware Order

```js
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(loggerMiddleware);        // simple console logger
app.use('/api', indexRoutes);      // route mount
app.use(notFoundMiddleware);       // 404 handler
app.use(errorMiddleware);           // LAST — global error handler
```

## Error Flow

```
Route handler
   ├── throw new ValidationError("Campo requerido")
   ├── throw new NotFoundError("Recurso no encontrado")
   ├── throw new AppError("Custom", 409)
   └── throw new Error("something broke")
           │
           ▼
   next(error)  ──►  error.middleware.js
           │
           ├── instanceof AppError ? error.statusCode : 500
           ├── message = error.message  (or generic if unknown)
           ├── stack = config.nodeEnv !== "production" ? error.stack : undefined
           └── respuestaError(res, message, statusCode)
```

## Interfaces / Contracts

### Success Response
```json
{
  "ok": true,
  "data": { "status": "ok", "timestamp": "2026-06-04T12:00:00.000Z" },
  "message": "Operación exitosa"
}
```

### Error Response
```json
{
  "ok": false,
  "error": "Error interno del servidor"
}
```

Development-only addition:
```json
{
  "ok": false,
  "error": "Error interno del servidor",
  "stack": "Error: ...\n    at ..."
}
```

### Config Object Shape
```js
{
  port: 3001,
  nodeEnv: "development",
  frontendUrl: "http://localhost:3000",
  // future: db, jwt, drive placeholders
}
```

## Naming Conventions

| Category | Convention | Examples |
|----------|------------|----------|
| File names | kebab-case, Spanish | `environments.js`, `respuesta.utils.js`, `error.middleware.js` |
| Functions | camelCase, Spanish | `respuestaExitosa`, `respuestaError`, `manejarError` |
| Variables | camelCase, Spanish | `config`, `statusCode`, `esProduccion` |
| Classes | PascalCase, English (Error names) | `AppError`, `ValidationError`, `NotFoundError`, `AuthError` |
| Routes | Spanish, no leading slash in router | `index.routes.js` mounts at `/api` |
| ESM imports | Always include `.js` extension | `import { config } from './config/environments.js'` |

## ESM Conventions

- `"type": "module"` in `package.json`
- `import` / `export` syntax only
- All local imports use `.js` extension (e.g., `../utils/errors.js`)
- No `require()` or `module.exports`

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `respuestaExitosa` / `respuestaError` envelope shape | Manual assertion with mock `res` object |
| Unit | Error classes carry correct `statusCode` | Instantiate and assert property |
| Unit | `environments.js` defaults and fail-fast | Mock `process.env`, import module, assert throws |
| Integration | `GET /api/health` returns 200 + envelope | `curl` or Supertest once controllers exist |
| Integration | `POST /api/health` returns 404 + envelope | `curl` or Supertest |
| Integration | Unknown route returns 404 uniform error | `curl` |

## Migration / Rollout

No migration required. This is a greenfield backend folder. Rollback: delete `backend/` directory.

## Open Questions

- [ ] Should `FRONTEND_URL` accept an array for multiple origins once CORS is fully configured? (Deferred to integration phase.)
- [ ] Should `environments.js` validate `JWT_SECRET` and `DB_HOST` now even though they are unused, to enforce the habit? (Decision: validate only when variables are marked required; add them as optional placeholders.)
