# Repo Hygiene Specification

## Purpose

Establish filesystem and git conventions for repository cleanliness: screenshot consolidation, orphan file removal, stale archive pruning, and `.gitignore` maintenance. No runtime behavior changes.

## Requirements

### Requirement: Cleanup scope boundary

All cleanup operations MUST stay strictly inside `kermingo_menu/`. Paths outside this root MUST NOT be modified, deleted, or staged.

#### Scenario: Operations confined to repo root

- GIVEN untracked paths exist outside `kermingo_menu/`
- WHEN cleanup executes
- THEN no file outside `kermingo_menu/` is touched

### Requirement: v0 reference folder removal

`diseno-de-landing-kermingo/` MUST be removed via `git rm -rf`. Explicitly authorized for deletion.

#### Scenario: v0 folder fully removed

- GIVEN `diseno-de-landing-kermingo/` exists with 67 tracked files
- WHEN `git rm -rf diseno-de-landing-kermingo/` is staged
- THEN the directory no longer appears as tracked in `git status`

### Requirement: Screenshot consolidation

All root-level `*.png` files MUST be moved into `captures/` at the repo root. No `*.png` files SHOULD remain at root after consolidation.

#### Scenario: Root PNGs moved to captures

- GIVEN ~45 `*.png` files at repo root
- WHEN moved into `captures/`
- THEN all PNGs are inside `captures/` and none at root

### Requirement: Orphan and generated file removal

The following MUST be deleted: `backend/pnpm-lock.yaml`, `backend/pnpm-workspace.yaml`, `skills-lock.json`, `frontend/tsconfig.tsbuildinfo`.

#### Scenario: Orphan files deleted

- GIVEN the listed files exist
- WHEN cleanup executes
- THEN all four files are removed

### Requirement: Gitignore maintenance

`frontend/.gitignore` MUST include `*.tsbuildinfo`. Root `.gitignore` MAY include `captures/` if screenshots should not be tracked.

#### Scenario: tsbuildinfo ignored

- GIVEN `*.tsbuildinfo` added to `frontend/.gitignore`
- THEN `git status` no longer shows `tsconfig.tsbuildinfo` as untracked

### Requirement: Stale openspec and sdd pruning

Stale `openspec/changes/` legacy entries, stale `openspec/specs/` with no matching active change, and the `sdd/` directory MUST be removed.

#### Scenario: Legacy entries pruned

- GIVEN legacy `openspec/changes/` entries and `sdd/` exist
- WHEN pruned
- THEN only active or archived changes remain and `sdd/` is gone

### Requirement: Documentation source of truth preserved

`DOCUMENTACION/IA/`, `AGENTS.md`, `README.md`, and `docs/planificacion/` MUST NOT be deleted or modified.

#### Scenario: Source-of-truth docs untouched

- GIVEN cleanup executes
- THEN none of the listed docs are modified, deleted, or staged

### Requirement: Commit separation plan

Five commit slices MUST be defined but NO commit SHALL be executed: (1) remove `diseno-de-landing-kermingo/`, (2) consolidate screenshots to `captures/`, (3) delete orphan files, (4) prune stale openspec/sdd, (5) update `.gitignore`.

#### Scenario: Plan defined, no commit executed

- GIVEN all operations are staged
- THEN `git status` shows staged changes and `git log` shows no new commits
