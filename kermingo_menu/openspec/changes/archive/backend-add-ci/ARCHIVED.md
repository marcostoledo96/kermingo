# Archived: backend-add-ci

**Date:** 2026-06-14
**Status:** ARCHIVED — verdict PASS

## Summary
- Created: `openspec/specs/backend-add-ci/spec.md` (durable capability for backend CI)
- 1 new file: `.github/workflows/backend-ci.yml`
- 0 source code changes
- YAML syntax validated
- Local tests verified: 201 tests passing in 20.7s

## The workflow
- Triggers on `push` to `main` and on `pull_request` to `main`
- Sets up Node 22 + npm cache
- **MySQL 8.0 service** with health check
- Sets env vars for the test process (DB_*, JWT_SECRET, FRONTEND_URL, GOOGLE_*)
- Runs `npm ci` (clean install)
- Sleeps 5s for MySQL to be ready (defensive)
- Runs all 201 tests via `node node_modules/jest/bin/jest.js --runInBand` (avoids the shim bug in `npm test`)

## Total backend test suite
- **13 test files** (cocina, caja, configuracion, comprobantes, health, producto-imagen, csrf, controller, unit, drive-mock)
- **201 tests** total
- ~21s locally

## Out of Scope (next changes)
- Backend linting (no ESLint config exists for backend)
- Test coverage reports
- Multi-Node matrix
- Auto-deploy to a server
- Preview deploys per PR
