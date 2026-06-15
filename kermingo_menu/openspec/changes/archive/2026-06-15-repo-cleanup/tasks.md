# Tasks: repo-cleanup

## Workload Forecast

| Slice | Files | Lines | Risk |
|-------|-------|-------|------|
| 1. Remove `diseno-de-landing-kermingo/` | ~67 tracked | ~400+ deletions | Authorized; large diff expected |
| 2. Consolidate root PNGs → `captures/` | ~47 untracked | ~0 (moves) | Low |
| 3. Delete orphan/generated files | 4 files | ~0 | Low |
| 4. Prune legacy openspec + `sdd/` | 7 dirs + 1 dir | ~0 | Low |
| 5. Update `.gitignore` | 2 files | +4 lines | Low |

**Guard line**: Slice 1 exceeds 400 deletion lines but is explicitly authorized in proposal. No PR chain needed — use 5 work-unit commits. User wants cleanup + commit separation at end → **decision needed**: user must confirm commit sequence after review.

## Safety Precheck (mandatory)

```bash
[ "$(pwd)" = "/home/marcos/Escritorio/Kermingo/kermingo_menu" ] || exit 1
[ "$(git rev-parse --show-toplevel)" = "/home/marcos/Escritorio/Kermingo" ] || exit 1
```

All operations inside `kermingo_menu/` only. No sibling paths (`../backend/`, `../frontend/`, etc.) may be touched.

- [x] Task 1: Remove `diseno-de-landing-kermingo/` — `git rm -rf diseno-de-landing-kermingo/` + `rm -rf diseno-de-landing-kermingo/` to remove untracked remnants. 67 tracked files staged for deletion, untracked files removed from disk.

- [x] Task 2: Consolidate Root Screenshots — `mkdir -p captures/ && mv *.png captures/`. 47 PNGs moved. Root has no `*.png`. `captures/` contains all PNGs. Not staged (per `.gitignore` update in Task 5, `captures/` is now ignored).

- [x] Task 3: Delete Orphan and Generated Files — `rm backend/pnpm-lock.yaml backend/pnpm-workspace.yaml skills-lock.json frontend/tsconfig.tsbuildinfo`. All 4 files deleted. None were tracked.

- [x] Task 4: Prune Stale openspec Changes and `sdd/` — Deleted 7 legacy dirs + `sdd/`. Only `archive/` and `repo-cleanup/` remain under `openspec/changes/`. `openspec/specs/` untouched. `sdd/` gone.

- [x] Task 5: Update `.gitignore` — Appended `captures/` to root `.gitignore`. Appended `*.tsbuildinfo` to `frontend/.gitignore`. Both files modified.

## Docs Inventory Note

- `DOCUMENTACION/IA/` (14 files) — **preserved**, source of truth.
- `docs/planificacion/` (52 files) — **preserved**, historical checkpoints.
- `AGENTS.md`, `README.md` — **preserved**.

## Verification

After all tasks:
- `git status` shows only intended staged deletions/moves.
- No root `*.png` remain.
- `captures/` exists with all PNGs.
- `diseno-de-landing-kermingo/` gone from tracked files.
- Orphan files deleted.
- `sdd/` gone.
- Only `archive/` and `repo-cleanup/` under `openspec/changes/`.
- `docs/planificacion/` and `DOCUMENTACION/IA/` untouched.

## Work-Unit Commit Plan (staged only, no commits executed)

1. `chore: remove diseno-de-landing-kermingo/ v0 reference folder`
2. `chore: consolidate root screenshots into captures/`
3. `chore: delete orphan pnpm artifacts and generated files`
4. `chore: prune legacy openspec change dirs and abandoned sdd/`
5. `chore: ignore tsbuildinfo and capture artifacts`

**Decision needed**: user must confirm commit sequence after reviewing staged changes.

## Summary

- **Total tasks**: 5 (all file operations, no runtime changes)
- **Can apply without extra decision?**: No — user must confirm commit sequence (ask-on-risk). Staging can proceed; commits wait for user approval.
- **Checkpoint**: Manual review of `git status` recommended before commit.
