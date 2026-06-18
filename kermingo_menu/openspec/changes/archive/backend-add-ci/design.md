# Design: backend-add-ci

## 1. The workflow

```yaml
name: Backend CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    name: Test (with MySQL)
    runs-on: ubuntu-latest
    timeout-minutes: 10
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root-test-pw
          MYSQL_DATABASE: kermingo_test
          MYSQL_USER: kermingo
          MYSQL_PASSWORD: kermingo-test-pw
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping -h 127.0.0.1 -u kermingo -pkermingo-test-pw"
          --health-interval=5s
          --health-timeout=5s
          --health-retries=10

    env:
      DB_HOST: 127.0.0.1
      DB_PORT: 3306
      DB_USER: kermingo
      DB_PASSWORD: kermingo-test-pw
      DB_NAME: kermingo_test
      JWT_SECRET: test-secret
      FRONTEND_URL: http://localhost:3000
      GOOGLE_DRIVE_FOLDER_ID: dummy
      GOOGLE_OAUTH_CLIENT_ID: dummy
      GOOGLE_OAUTH_CLIENT_SECRET: dummy
      GOOGLE_OAUTH_REFRESH_TOKEN: dummy

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: backend
        run: npm ci

      - name: Run migrations (or wait for app to do it)
        run: sleep 5  # give MySQL time to fully initialize (defensive)

      - name: Test
        working-directory: backend
        run: node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand
```

## 2. Key design decisions

### Why `mysql:8.0` as a service
- The backend uses `mysql2/promise` (no specific version constraint in tests, but the production server runs MySQL 8)
- `mysql:8.0` is the standard GitHub Actions MySQL image
- It auto-runs the health check via the `--health-cmd` option

### Why run jest directly (not `npm test`)
- The npm-installed jest shim has a shell escaping bug on Linux (we observed `SyntaxError: missing ) after argument list` in the shim)
- Running `node node_modules/jest/bin/jest.js` directly bypasses the shim
- We use the same flags that the `npm test` script uses: `--experimental-vm-modules --runInBand`

### Why `npm ci` (not `npm install`)
- `npm ci` is faster and stricter — it requires `package-lock.json` to be in sync with `package.json`
- Fails fast if lockfile is out of date, forcing developer to commit a fresh lockfile

### Why env vars in the workflow's `env:` block
- Same env vars for all steps
- Override the default `kermingo-dev-secret` in `JWT_SECRET` (the production check throws if secrets are missing; we provide test values)
- Provide dummy Google Drive credentials (the drive mock tests don't actually call Drive)

### Why `cache: npm` with `cache-dependency-path: backend/package-lock.json`
- The backend uses `package-lock.json` (npm), not `pnpm-lock.yaml` (pnpm)
- We need to point npm's cache at the right lockfile

### Why we don't run migrations explicitly
- The app's `src/api/database/db.js` runs migrations on first connection
- The integration tests connect to the DB, which triggers migration
- We rely on this rather than duplicating the migration logic in CI

### Why a `sleep 5` before tests
- Defensive: give MySQL a moment to fully initialize (the health check should handle this, but extra safety)
- The first test that connects will trigger migrations, which adds a small delay; the sleep is cheap insurance

### Why we don't separate unit vs integration tests
- The backend doesn't have a clean unit/integration split (some tests use mocks, some use real DB)
- Running all 201 tests takes ~21s locally, which is acceptable in CI
- If we need to optimize later, we can split

## 3. What we don't do (and why)

### No multi-Node matrix
- The backend doesn't support multiple Node versions
- Node 22 LTS is sufficient

### No lint step
- The backend has no ESLint config (separate concern)
- The CI catches tests + types, not style

### No test coverage report
- Not needed for MVP; can add later (`--coverage` flag)

### No deploy step
- Requires secrets; separate change

### No concurrency cancellation
- We have one job. If we add more later, we can add `concurrency:` to cancel redundant runs.

### No caching of MySQL data
- The integration tests create their own data
- We don't need to snapshot MySQL state

## 4. What to do if a check fails

For each step:
- **Checkout fails**: usually means bad ref or auth issue. Rare.
- **MySQL service unhealthy**: the workflow log will show MySQL startup errors. The runner might be slow or the image might have a transient issue.
- **`npm ci` fails**: usually lockfile out of date. Run `npm install` locally, commit the updated lockfile.
- **Tests fail**: read the error, fix the test or the code.

## 5. Why a single PR
- 1 new file, no source code changes
- Self-contained
- Easy to revert
