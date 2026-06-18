# Design: add-ci

## 1. The workflow

```yaml
# .github/workflows/frontend-ci.yml
name: Frontend CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-build:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 11

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: frontend/pnpm-lock.yaml

      - name: Install dependencies
        working-directory: frontend
        run: pnpm install --frozen-lockfile

      - name: Lint
        working-directory: frontend
        run: pnpm lint

      - name: Build
        working-directory: frontend
        run: pnpm build
```

## 2. Why these specific choices

### `actions/checkout@v4`
- The current latest stable version of the official checkout action.

### `pnpm/action-setup@v4`
- The official pnpm setup action maintained by the pnpm team.
- `version: 11` pins the major version (so the workflow uses pnpm 11.x; we won't accidentally get pnpm 12 with breaking changes).

### `actions/setup-node@v4` with `cache: pnpm`
- Native Node setup.
- `cache: pnpm` automatically caches the pnpm store based on the lockfile hash. The `cache-dependency-path` is needed because the lockfile is in `frontend/`, not the root.
- This dramatically reduces install time on subsequent runs (typically 30-60s instead of 2-3 min).

### `pnpm install --frozen-lockfile`
- The `--frozen-lockfile` flag fails if the lockfile is out of date with `package.json`.
- This prevents "I forgot to run pnpm install" failures and forces developers to commit a fresh lockfile when changing dependencies.

### `working-directory: frontend`
- The repo is a monorepo with `backend/`, `frontend/`, etc.
- All frontend commands run in `frontend/`.

### No `services:` block
- We don't need a database service for the frontend build. The backend CI (separate change) would need a MySQL service.

### No test step
- We don't have a frontend test suite yet. Adding `pnpm test` would fail with "no script defined".

### `timeout-minutes: 10`
- Conservative. Typically 1-2 min, but allows for slow cache cold starts.

## 3. The `.nvmrc`

```
22
```

- One line, the Node major version.
- Read by `nvm` automatically when `cd`-ing into the directory.
- Read by Volta, fnm, and asdf.
- Read by some editors (VSCode, etc.) to pin the runtime.

## 4. What we don't do (and why)

### No test step
- We don't have tests. Adding `pnpm test` would fail.

### No coverage report
- Same reason.

### No multi-Node matrix
- The project doesn't support multiple Node versions. Node 20+ is required by Next 16. We pick one stable version (22) and move on.

### No deploy step
- Deploys require secrets (Vercel tokens, etc.). Separate change.

### No "wait for X" step
- No upstream dependencies.

### No concurrency cancellation
- We're not using `concurrency:` because the workflow is fast. If we add slow jobs later, we can add this.

## 5. What to do if a check fails

For each step:
- **Install fails**: usually means lockfile is out of date. Run `pnpm install` locally, commit the updated lockfile.
- **Lint fails**: read the error, fix the code or update the rule.
- **Build fails**: read the error, fix the code.

The CI output will show the exact error and file/line.

## 6. Why a single PR
- 2 new files, no other changes
- No coupling to other systems
- Easy to revert
