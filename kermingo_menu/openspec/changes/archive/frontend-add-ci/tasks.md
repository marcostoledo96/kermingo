# Tasks: add-ci

> Single-PR implementation. 2 new files, ~30 lines of YAML.

## Phase 1 — Create files
- [ ] T1. Create `.github/workflows/frontend-ci.yml` with the workflow definition
- [ ] T2. Create `.nvmrc` with `22`

## Phase 2 — Verify
- [ ] T3. Manually run the workflow commands locally to confirm they pass:
  - `cd frontend && pnpm install --frozen-lockfile`
  - `cd frontend && pnpm lint`
  - `cd frontend && pnpm build`
- [ ] T4. Validate YAML syntax (no errors when GitHub parses the workflow)

## Phase 3 — Archive
- [ ] T5. Move change to archive, copy spec, write ARCHIVED.md

## Traceability

| Spec scenario | Tasks |
|---|---|
| REQ-CI-001 | T1, T3 |
| REQ-CI-002 | T2 |
| REQ-CI-003 | T1 (implicit: `pnpm lint` fails on warnings by default) |
