# Tasks: MySQL Schema + Pool

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~350 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Phase 1: Foundation

- [ ] 1.1 Add `mysql2` to `backend/package.json` dependencies (`"mysql2": "^3.14.0"`) and run `npm install`
- [ ] 1.2 Extend `backend/src/api/config/environments.js` with `db.port` (default `3306`) and add `DB_PORT` to production required vars
- [ ] 1.3 Add `DB_HOST`, `DB_PORT=3306`, `DB_USER`, `DB_PASSWORD`, `DB_NAME=kermingo` to `backend/.env.example`

## Phase 2: Core

- [ ] 2.1 Create `backend/src/api/database/db.js`: import `mysql2/promise`, create pool from `config.db.*`, attach `pool.on('error')`, export default — must not throw on import even with empty DB_HOST
- [ ] 2.2 Create `backend/src/api/database/schema.sql`: idempotent DDL for 9 tables (usuario, archivo_drive, categoria, producto, producto_categoria, combo_producto, pedido, pedido_detalle, configuracion_tienda) in FK-safe order, plus 7 indexes — use `CREATE TABLE IF NOT EXISTS` and `DROP INDEX IF EXISTS / CREATE INDEX` pattern
- [ ] 2.3 Create `backend/src/api/database/seed.sql`: insert 2 categories, 22 products (food/drink/combos), product-category mappings, combo components, configuracion_tienda `estado='cerrada'`, admin user with pre-computed bcrypt hash — `INSERT IGNORE` throughout

## Phase 3: Verification

- [ ] 3.1 Import safety: `node -e "import('./backend/src/api/database/db.js')"` with empty DB_HOST must exit 0
- [ ] 3.2 Syntax check: run `mysql --user ... --database ... < backend/src/api/database/schema.sql` on a fresh database and verify 0 errors
- [ ] 3.3 Seed run: execute `seed.sql` after `schema.sql`, verify 22 products, 2 categories, 1 config row, 1 admin user, and no duplicates on re-run
- [ ] 3.4 Idempotency: run `schema.sql` + `seed.sql` a second time and confirm 0 errors, 0 duplicate rows, existing data unchanged
- [ ] 3.5 Health endpoint independence: verify `GET /api/health` returns `200` even when DB_HOST is empty

## Dependency Chain

1.1 → 1.2 → 1.3 → 2.1 → 2.2 → 2.3 → 3.x (parallel after 2.3)
