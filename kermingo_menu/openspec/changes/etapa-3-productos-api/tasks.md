# Tasks: Productos API Backend Module

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~350–450 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | auto-chain |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation + Middlewares + Schema + Model | PR 1 | base: main; all new files; no runtime dependency on controller |
| 2 | Controller + Routes + Mount + Verify | PR 1 | base: main; depends on WU-1; wired and tested |

## Phase 1: Foundation

- [ ] 1.1 Install `zod` dependency in `backend/package.json`
- [ ] 1.2 Create `backend/src/api/middlewares/validate.middleware.js` — generic Zod validation wrapper that transforms `ZodError` into `ValidationError`
- [ ] 1.3 Create `backend/src/api/middlewares/admin.middleware.js` — placeholder that logs a warning and calls `next()` (auth is B4 scope)

## Phase 2: Core Schema & Model

- [ ] 2.1 Create `backend/src/api/schemas/producto.schema.js` — Zod schemas for `productoQuerySchema`, `adminProductoQuerySchema`, `createProductoSchema`, `updateProductoSchema`, `stockAdjustmentSchema`, `idParamSchema`
- [ ] 2.2 Create `backend/src/api/models/producto.model.js` — SQL queries via `mysql2/promise`: `findAllPublic`, `findByIdPublic`, `findAllAdmin`, `findByIdAdmin`, `create`, `update`, `deactivate`, `restore`, `updateStock`, `findComboComponents`, `createComboComponents`, `deleteComboComponents`

## Phase 3: Controller & Routes

- [ ] 3.1 Create `backend/src/api/controllers/producto.controller.js` — 8 handlers: `listar`, `obtener`, `listarAdmin`, `crear`, `actualizar`, `desactivar`, `recuperar`, `ajustarStock`
- [ ] 3.2 Create `backend/src/api/routes/producto.routes.js` — export `publicRouter` (`GET /`, `GET /:id`) and `adminRouter` (`GET /`, `POST /`, `PUT /:id`, `PATCH /:id/desactivar`, `PATCH /:id/recuperar`, `PATCH /:id/stock`) with `validate.middleware` + `admin.middleware`
- [ ] 3.3 Modify `backend/src/api/routes/index.routes.js` — mount both routers: `router.use('/productos', publicRouter)` and `router.use('/admin/productos', adminRouter)`

## Phase 4: Testing & Verification

- [ ] 4.1 Run `cd backend && npm install` and verify `npm run dev` starts without module errors
- [ ] 4.2 curl `GET http://localhost:3001/api/productos` and assert 200 with active products array
- [ ] 4.3 curl `GET http://localhost:3001/api/productos/1` and assert 200 with product detail
- [ ] 4.4 curl `GET http://localhost:3001/api/admin/productos` and assert 401 (admin placeholder rejects)
- [ ] 4.5 curl `POST http://localhost:3001/api/admin/productos` with invalid body and assert 400 with validation errors
