# Design: MySQL Schema + Pool (B1)

## Technical Approach

Create three new files in `backend/src/api/database/` (db.js, schema.sql, seed.sql) and update two existing files (environments.js, .env.example). The connection pool uses the existing config block, defers all connection attempts until first query, and carries a pool-level error handler to avoid crashes on import. SQL files are self-contained, idempotent, and runnable via MySQL CLI during manual provisioning. No new runtime code depends on the pool yet — this is strictly infrastructure.

## Architecture Decisions

| Decision | Chosen | Alternatives | Rationale |
|----------|--------|-------------|-------|
| Pool creation on import vs lazy | Create pool on import, but no `.getConnection()` or `query()` called | Lazy singleton wrapper, proxy object | mysql2 createPool is already lazy (TCP not opened until use). Adding a wrapper is unnecessary code. A pool-level `on('error')` prevents unhandled crash. |
| Connection string vs object | Pass config block object `{host,port,user,password,database}` | Build `mysql://` URL | mysql2 accepts objects natively; no string escaping risk. Port is just `config.db.port`. |
| Schema in one `.sql` vs scripts | Single `schema.sql` file, run manually by CLI | JS migration runner (e.g. umzug) | Kermingo does not need a migration runner in the MVP. A single SQL file is simpler, auditable, and version-controlled. |
| Idempotency strategy | `CREATE TABLE IF NOT EXISTS` + `DROP INDEX IF EXISTS / CREATE INDEX` for indexes | `CREATE INDEX IF NOT EXISTS` | MySQL 5.7 does not support `CREATE INDEX IF NOT EXISTS`. Dropping before creating is safe because tables are `IF NOT EXISTS`. |
| Seed admin password | Pre-computed bcrypt hash `$2b$10$...` in SQL | Hash at seed runtime with bcrypt | bcrypt is not in package.json yet. A pre-computed hash lets us test login immediately without adding dependencies in B1. Will be regenerated in B4. |
| Stock unlimited representation | `stock_limitado = 0` with `stock_actual = NULL` | `stock_actual = -1` | `NULL` is semantically correct for "no value" and avoids accidental arithmetic. Matches spec requirement directly. |

## Data Flow

```
             backend/src/api/config/environments.js
                         │ db.host / port / user / password / database
                         ▼
              backend/src/api/database/db.js
              (pool from mysql2/promise)
                         │
                         └──► used by models/services (future stages)

    backend/src/api/database/schema.sql
                ├─► CLI: mysql < schema.sql
                └─► creates 9 tables + 7 indexes (FK-safe order)

    backend/src/api/database/seed.sql
                ├─► CLI: mysql < seed.sql
                └─► inserts categories, products, combos, config, admin
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/api/database/db.js` | Create | mysql2/promise pool using config.db.*. Exports single default. Pool error listener attached. No runtime queries on import. |
| `backend/src/api/database/schema.sql` | Create | DDL for 9 tables (`usuario`, `archivo_drive`, `categoria`, `producto`, `producto_categoria`, `combo_producto`, `pedido`, `pedido_detalle`, `configuracion_tienda`) + 7 indexes, all idempotent. |
| `backend/src/api/database/seed.sql` | Create | Seed: 2 categories, 22 products, product-category mappings, combo components, store config, 1 admin user with tempfiled bcrypt hash. `INSERT IGNORE` throughout. |
| `backend/src/api/config/environments.js` | Modify | Add `port: process.env.DB_PORT \|\| 3306` to `db` block; include `DB_PORT` in production required vars list. |
| `backend/.env.example` | Modify | Add `DB_HOST=`, `DB_PORT=3306`, `DB_USER=`, `DB_PASSWORD=`, `DB_NAME=kermingo`. |
| `backend/package.json` | Modify | Add `mysql2` to dependencies. |

## Interfaces / Contracts

### Pool Module Export
```js
import mysql from 'mysql2/promise';
import config from '../config/environments.js';

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.on('error', (err) => {
  console.error('Pool error:', err.message);
});

export default pool;
```

### Pool consumer pattern (future usage)
```js
import pool from '../database/db.js';
const [rows] = await pool.execute('SELECT ...', [params]);
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Pool module imports without throwing | `node -e "import('./src/api/database/db.js')"` with empty DB_HOST |
| Unit | Config includes `db.port` | Assert `config.db.port` equals `3306` when DB_PORT missing, and custom value when set |
| Integration | schema.sql is valid SQL | Run `mysql --syntax-check < schema.sql` against an empty local database |
| Integration | seed.sql is valid SQL | Run `mysql --syntax-check < seed.sql` after schema |
| Integration | Health endpoint unaffected | `curl http://localhost:<port>/api/health` returns 200 with no db dependency |
| Manual | Full idempotency run | Execute schema.sql + seed.sql twice; verify no errors, no duplicate rows, no duplicate indexes |
| Manual | Admin hash works | Attempt login with bcrypt-comparible password against seeded hash |

## Migration / Rollback

No runtime migration needed — schema is applied manually. Rollback:
1. Delete `backend/src/api/database/`
2. Remove `mysql2` from package.json and reinstall.
3. Revert `environments.js` and `.env.example`.

## Open Questions

- [ ] **Admin password plaintext**: The pre-computed bcrypt hash is a placeholder. In B4 auth stage it must be regenerated via bcrypt so the actual password is not stored or implied anywhere in the repo.
- [ ] **MySQL version target**: If hosting uses MySQL 5.7, `DROP INDEX IF EXISTS` does not exist there either. If 5.7 is confirmed, we will switch to a stored-procedure index check pattern. **Mitigation**: use 8.0+ (Railway default) or add a JS init script later.
