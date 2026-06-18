# Change: backend-add-ci

## Why
The backend has **201 tests** (13 test files) that pass locally in ~21s. Without CI, regressions can land silently:
- A schema change that breaks a query won't be caught
- A controller refactor that introduces a 500 won't be caught
- A new validation that rejects previously-valid inputs won't be caught

We just added frontend CI (`frontend-add-ci`). Adding backend CI brings the same safety net to the backend.

## What changes
- **NEW** `.github/workflows/backend-ci.yml` — GitHub Actions workflow that:
  - Triggers on `push` to `main` and on `pull_request` targeting `main`
  - Uses `ubuntu-latest` runner
  - Sets up Node 22 (matching local dev)
  - **Sets up a MySQL 8.0 service** with credentials matching the integration tests
  - Caches npm (the backend uses npm, not pnpm — different from frontend)
  - Runs `npm ci` (clean install from lockfile)
  - Runs `npm test` (all 201 tests, including integration)
- **NEW** `backend/.env.test` (or `backend/.env.example` additions) — documents the test env vars. **No new file**; we use GitHub Actions' built-in `env:` block to set them.
- No source code changes. No new dependencies. The backend already has 201 tests; we're just running them in CI.

## Why MySQL service
The integration tests (`tests/caja.test.js`, `tests/comprobantes.test.js`, etc.) connect to a real MySQL database via the `pool` import from `src/api/database/db.js`. They create test data, run queries, and clean up. We can't mock MySQL out — the tests are integration tests for a reason (they test SQL queries, transactions, and constraints).

GitHub Actions' `services.mysql` block provides a `mysql:8.0` container with credentials. The integration tests will run against it.

## How env vars are set
- `DB_HOST`: `127.0.0.1` (the mysql service is on localhost from the runner's perspective)
- `DB_PORT`: `3306`
- `DB_USER`: `kermingo`
- `DB_PASSWORD`: `kermingo-test-pw`
- `DB_NAME`: `kermingo_test`
- `JWT_SECRET`: `test-secret` (overrides default for test environment)
- `FRONTEND_URL`: `http://localhost:3000`
- `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_OAUTH_*`: dummy values (the drive mock tests don't actually use them)

## Schema setup
The integration tests use the real schema. We need to run migrations before tests. **Decision**: rely on the existing `src/api/database/db.js` initialization which runs migrations on startup. This is a standard Express app pattern; the same code path runs in dev and in CI.

We can verify by running `npm test` locally against a fresh MySQL container.

## Impact
- 1 new file: `.github/workflows/backend-ci.yml`
- 0 source code changes
- 0 new dependencies
- CI runtime: ~3-5 min (dominated by npm ci + test execution + MySQL service startup)

## Out of scope
- Multi-Node matrix testing
- PostgreSQL/MySQL version matrix
- Per-PR preview deploys
- Test coverage reports
- Parallel test execution (already running with `--runInBand`)
- Auto-deploy to a server
- Linting the backend (no ESLint configured for backend — separate change)
- TypeScript check (backend is plain JS — not applicable)

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| MySQL service is slow to start | Low | GitHub's `mysql:8.0` image starts in ~5s |
| Integration tests leak data across runs | Low | Tests have cleanup logic (`limpiarPedidosDeTest` etc.) |
| Backend tests need env vars we don't have | Med | We define them in the workflow's `env:` block; documented in this proposal |
| `npm ci` fails because lockfile is out of date | Low | Same as frontend: fail loudly, force developer to commit fresh lockfile |
| MySQL container runs out of disk on large test data | Low | Tests are lightweight; no large blobs |
| Backend test command has a shell escaping bug (the bin shim issue we saw) | Med | We run jest via `node node_modules/jest/bin/jest.js` directly, avoiding the shim |

## Rollback
Delete `.github/workflows/backend-ci.yml`. Tests continue to work locally.

## Dependencies
- GitHub Actions (free for public repos)
- MySQL 8.0 (Docker image, free)
- Node 22 (already used locally)

## Success criteria
- [ ] `.github/workflows/backend-ci.yml` exists and is valid
- [ ] Pushing to main (or opening a PR) triggers the workflow
- [ ] MySQL service starts and is reachable
- [ ] `npm ci` completes
- [ ] `npm test` exits 0 (all 201 tests pass)
- [ ] Total CI time < 5 minutes
- [ ] If any test fails, CI fails

## Single-PR decision
Single PR. 1 new file. No source code changes.
