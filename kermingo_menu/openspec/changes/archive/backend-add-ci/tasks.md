# Tasks: backend-add-ci

> Single-PR implementation. 1 new file.

## Phase 1 — Create file
- [ ] T1. Create `.github/workflows/backend-ci.yml` with the workflow definition

## Phase 2 — Verify
- [ ] T2. Validate YAML syntax
- [ ] T3. Verify local tests still pass (201 tests, ~21s)

## Phase 3 — Archive
- [ ] T4. Move change to archive, copy spec, write ARCHIVED.md

## Traceability

| Spec scenario | Tasks |
|---|---|
| REQ-CI-BE-001 | T1, T2, T3 |
| REQ-CI-BE-002 | T1 (built into the workflow) |
| REQ-CI-BE-003 | T1, T3 |
