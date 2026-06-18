# Spec: backend-add-ci (delta)

## ADDED Requirements

### REQ-CI-BE-001 — Backend CI workflow
A GitHub Actions workflow MUST be created at `.github/workflows/backend-ci.yml`. The workflow MUST:
- Trigger on `push` to `main` AND on `pull_request` targeting `main`
- Use `ubuntu-latest` runner
- Set up Node 22
- **Set up a MySQL 8.0 service** with credentials `DB_USER=kermingo`, `DB_PASSWORD=kermingo-test-pw`, `DB_NAME=kermingo_test`
- Provide env vars to the test process: `DB_HOST=127.0.0.1`, `DB_PORT=3306`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET=test-secret`, `FRONTEND_URL=http://localhost:3000`
- Cache npm (with `cache: 'npm'`) for fast install
- Run `npm ci` (clean install from lockfile)
- Run `npm test` (all 201 tests, including integration)
- Have a timeout of 10 minutes

**Scenario**: Developer opens a PR
- Given a PR targeting `main`
- When the PR is opened
- Then the workflow runs and:
  - MySQL service is healthy
  - `npm ci` completes
  - `npm test` exits 0 (all 201 tests pass)
  - The PR is mergeable only if everything succeeds

### REQ-CI-BE-002 — MySQL service health check
The workflow MUST wait for the MySQL service to be ready before running tests. The `mysql:8.0` image has a built-in health check (it pings the server). We can rely on it.

**Scenario**: MySQL service is starting up
- Given the workflow just started
- When the test step begins
- Then MySQL is already accepting connections on `127.0.0.1:3306`

### REQ-CI-BE-003 — Test correctness
The CI workflow MUST use the same command as local: `npm test`. The backend's test command is:
```
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand
```
(npm wraps the local `test` script, but we run jest directly to avoid a shell escaping bug in the npm-installed shim).

**Scenario**: All 201 tests pass locally
- Given the same Node version, same MySQL version, same env vars
- When the workflow runs `npm test`
- Then all 201 tests pass

## MODIFIED Requirements
None.

## Type updates
None.

## Testing strategy
- **Pre-apply** (verify local works): run all 201 tests locally with `node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand` → 201 passed.
- **Apply**: create the workflow file.
- **Post-apply**:
  - Push to main and observe the workflow run on GitHub Actions
  - Confirm the MySQL service starts
  - Confirm all 201 tests pass in CI
  - Total CI time < 5 minutes

## Out of scope
- Backend linting (no ESLint for backend — separate change)
- Test coverage reports
- Multi-Node matrix
- Per-PR preview deploys
- Linting the backend with a new ESLint setup
