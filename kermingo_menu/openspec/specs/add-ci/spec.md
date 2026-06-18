# Spec: add-ci (delta)

## ADDED Requirements

### REQ-CI-001 — Frontend CI workflow
A GitHub Actions workflow MUST be created at `.github/workflows/frontend-ci.yml`. The workflow MUST:
- Trigger on `push` to `main` AND on `pull_request` targeting `main`
- Use the latest stable `ubuntu-latest` runner
- Set up Node.js 22 (matching local dev)
- Set up pnpm 11 (matching local dev)
- Cache the pnpm store for fast install (keyed on `frontend/pnpm-lock.yaml`)
- Run `pnpm install --frozen-lockfile` in the `frontend/` directory
- Run `pnpm lint` in the `frontend/` directory — fails on any warning or error
- Run `pnpm build` in the `frontend/` directory — fails on any error
- Have a timeout of 10 minutes

**Scenario**: Developer opens a PR
- Given a PR targeting `main`
- When the PR is opened (or updated)
- Then the workflow runs and:
  - `pnpm install` completes (using cached store)
  - `pnpm lint` exits 0
  - `pnpm build` exits 0
  - The PR is mergeable only if all three succeed

### REQ-CI-002 — Node version pinning
A `.nvmrc` file MUST be created at the repo root with the content `22`. This pins the Node version for local development and matches the CI version.

**Scenario**: New developer clones the repo
- Given `.nvmrc` exists with `22`
- When the developer runs `nvm use` (or their editor reads it)
- Then Node 22 is activated locally

### REQ-CI-003 — Lint enforcement
If `pnpm lint` produces any warning OR error, the CI job MUST fail. No `--max-warnings 0` relaxation. Warnings are errors in CI.

**Scenario**: Developer introduces a new warning
- Given the repo passes CI
- When the developer opens a PR with code that triggers a lint warning
- Then the CI lint step fails
- And the PR cannot be merged (assuming branch protection is enabled)

## MODIFIED Requirements
None.

## Type updates
None.

## Testing strategy
- **Pre-apply** (verify GitHub is the host): check `.git/config` for `github.com` remote. ✅ Confirmed.
- **Apply**: create the 2 files.
- **Post-apply**:
  - Local validation: run the workflow commands manually (install, lint, build) to confirm they pass
  - Push to main and observe the workflow run on GitHub Actions tab
  - Open a test PR and observe the workflow runs

## Out of scope
- Backend CI (separate change)
- Auto-deploy to Vercel (separate change)
- Multi-Node matrix testing
- Dependabot auto-PRs
- Tests for the frontend (no test suite yet)
- Lint auto-fix on save (developer experience improvement, not CI)
