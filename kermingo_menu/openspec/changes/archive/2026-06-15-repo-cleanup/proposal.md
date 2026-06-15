# Proposal: Repository Cleanup

## Intent

Remove stale artifacts, orphaned files, and folder bloat so the repo is navigable, safe to archive, and easy for future agents to understand. This is pure hygiene — no runtime behavior changes.

## Scope

### In Scope
- Delete `diseno-de-landing-kermingo/` (67 tracked files, explicitly authorized).
- Move root PNG screenshots into `captures/`.
- Delete orphan files: `backend/pnpm-lock.yaml`, `backend/pnpm-workspace.yaml`, `skills-lock.json`, `frontend/tsconfig.tsbuildinfo`.
- Prune stale `openspec/changes/` legacy entries and `openspec/specs/` entries with no active change.
- Remove abandoned `sdd/` directory.
- Add `.gitignore` entries for `*.tsbuildinfo` and `captures/`.

### Out of Scope
- No changes to `backend/` or `frontend/` source code.
- No deletion of `docs/planificacion/` (historical archive, keep).
- No deletion of `DOCUMENTACION/IA/` (source of truth, keep).
- No changes outside `kermingo_menu/` root.
- No commits (prepared but not executed).

## Capabilities

### New Capabilities
- `repo-hygiene`: Folder structure conventions, capture location rules, and cleanup classification for future maintenance.

### Modified Capabilities
- None. No runtime capabilities are affected.

## Approach

1. Stage `git rm -rf diseno-de-landing-kermingo/`.
2. Create `captures/`, move `*.png` from root, stage.
3. Delete orphan/generated files and stage deletions.
4. Remove stale openspec entries and `sdd/`; stage.
5. Update `.gitignore`; stage.
6. Define 5 commit slices for final review, but do NOT commit.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `diseno-de-landing-kermingo/` | Removed | Entire v0 reference folder deleted |
| Root `*.png` | Moved | Screenshots consolidated into `captures/` |
| `backend/pnpm-*` | Removed | Orphan pnpm artifacts |
| `frontend/tsconfig.tsbuildinfo` | Removed | Generated incremental build info |
| `openspec/changes/` | Pruned | Legacy entries and flat archive cleaned |
| `openspec/specs/` | Pruned | Stale specs with no active change removed |
| `sdd/` | Removed | Abandoned directory superseded by openspec |
| `.gitignore` | Modified | Add `*.tsbuildinfo` and `captures/` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Large deletion diff for `diseno-de-landing-kermingo/` | High | Authorized explicitly; 20 modified files inside will show as deleted changes — expected |
| Accidental loss of useful openspec history | Low | Only delete entries with no matching active change; compress rather than delete if uncertain |
| `docs/planificacion/` misclassified as deletable | Low | Explicitly keep per policy; they are complementary historical docs, not redundant |

## Rollback Plan

All changes are staged but not committed. If anything is wrong, run `git reset HEAD` and `git checkout -- .` to restore the working tree. `diseno-de-landing-kermingo/` can be recovered from git history if already tracked, or from backups if untracked.

## Dependencies

- None.

## Success Criteria

- [ ] `git status` shows no untracked root screenshots, no `diseno-de-landing-kermingo/`, no orphan files.
- [ ] `captures/` exists with all PNGs inside.
- [ ] Tracked file count drops by ~67 (diseno-de-landing-kermingo).
- [ ] `docs/planificacion/` and `DOCUMENTACION/IA/` remain untouched.
- [ ] Commit slices are defined and ready for manual review.
