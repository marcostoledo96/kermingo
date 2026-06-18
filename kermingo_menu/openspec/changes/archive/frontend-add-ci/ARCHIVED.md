# Archived: frontend-add-ci

**Date:** 2026-06-14
**Status:** ARCHIVED — verdict PASS

## Summary
- Created: `openspec/specs/add-ci/spec.md` (durable capability for CI)
- 2 new files: `.github/workflows/frontend-ci.yml`, `.nvmrc`
- 0 source code changes
- YAML syntax validated
- Local dry-run: `pnpm install --frozen-lockfile` OK, `pnpm lint` exit 0, `pnpm build` 14/14 pages

## The workflow
- Triggers on `push` to `main` and on `pull_request` to `main`
- Sets up Node 22 + pnpm 11 (matches local dev)
- Caches pnpm store keyed on lockfile hash
- Runs `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm build` in `frontend/`
- Total estimated runtime: 1-2 min

## Out of Scope (next changes)
- Backend CI (Jest/Supertest with MySQL service)
- Tests for the frontend (no test suite yet)
- Auto-deploy to Vercel on main merge
- Preview deploys per PR (Vercel integration)
- Multi-Node matrix testing
- Dependabot auto-PRs
