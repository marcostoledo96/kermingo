# Proposal: MySQL Schema + Pool (B2)

## Intent
Establish MySQL connectivity and the foundational database schema for Kermingo. This unblocks all downstream backend work: product CRUD, orders, stock management, auth, and admin dashboard.

## Scope

### In Scope
- Add `mysql2` dependency and create a `mysql2/promise` connection pool
- Create `schema.sql` with 9 tables + 7 indexes, fully idempotent (`IF NOT EXISTS`, `INSERT IGNORE`)
- Create `seed.sql` with initial data: 22 products, 2 categories, store config, and one pre-hashed admin user
- Update `environments.js` with `db.port`
- Update `.env.example` with `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- Ensure the pool module does NOT crash on import if MySQL is unavailable

### Out of Scope
- No API routes, controllers, or middleware
- No auth endpoints or JWT validation logic
- No business logic (stock rules, combo resolution)
- No Google Drive integration
- No runtime seed execution from code (seed will be run manually via MySQL CLI)

## Capabilities

### New Capabilities
- `mysql-pool`: Centralized `mysql2/promise` pool with graceful error handling on import
- `database-schema`: Idempotent DDL for 9 tables with FKs, indexes, and constraints
- `database-seed`: Idempotent initial dataset for store opening

### Modified Capabilities
- `config-environments`: Extended `db` object with `port` field

## Approach
1. Add `mysql2` to `package.json`
2. Create `db.js`: export a lazy pool that validates config at query time, not import time. If DB_HOST is empty, export a no-op object that logs warnings but never throws
3. Create `schema.sql`: use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`; order tables so referenced tables come first (archivo_drive, categoria, usuario) before dependent ones (producto, pedido, etc.)
4. Create `seed.sql`: use `INSERT IGNORE` for all rows so it can be re-run safely. Admin password uses a pre-computed bcrypt hash so we don't need the `bcrypt` module at this stage
5. Update `environments.js` and `.env.example`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/package.json` | Modified | Add `mysql2` dependency |
| `backend/.env.example` | Modified | Add DB env vars |
| `backend/src/api/config/environments.js` | Modified | Add `db.port` |
| `backend/src/api/database/db.js` | New | Pool module |
| `backend/src/api/database/schema.sql` | New | Full DDL |
| `backend/src/api/database/seed.sql` | New | Initial data |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| MySQL unavailable at import time | Med | Lazy pool: no connection until first query; module never throws on import |
| FK ordering breaks `schema.sql` | Low | Order: `archivo_drive` → `categoria` → `usuario` → `producto` → `pedido` → join tables |
| Seed re-run duplicates data | Low | Use `INSERT IGNORE` on all rows |
| Admin hash is a placeholder | Med | Marked with `-- AUTH STAGE B4: replace with bcrypt hash` in seed.sql; will be regenerated in B4 |
| MySQL version doesn't support `CREATE INDEX IF NOT EXISTS` | Med | Use idempotent `DROP INDEX IF EXISTS` + `CREATE INDEX` pattern |

## Rollback Plan
1. Remove `mysql2` from `package.json` and `node_modules`
2. Delete `backend/src/api/database/`
3. Revert `environments.js` and `.env.example`
4. Restore from git if needed

## Dependencies
- MySQL server (local, Docker, or Railway) available for manual testing
- Node.js runtime for pool module verification (syntax-only)

## Success Criteria
- [ ] `schema.sql` runs without errors against an empty MySQL database
- [ ] `seed.sql` runs without errors and all rows are present
- [ ] Re-running `schema.sql` and `seed.sql` is idempotent (no errors, no duplicates)
- [ ] `db.js` imports without crashing when MySQL is unavailable
- [ ] `environments.js` exposes `db.port` correctly
- [ ] `.env.example` documents all required DB variables
