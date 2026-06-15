# Design: Repository Cleanup

## Technical Approach

Pure hygiene change: stage deletions of stale tracked and untracked artifacts, consolidate untracked root screenshots into a `captures/` folder, update `.gitignore` rules, and define five commit slices for final review. No runtime behavior changes.

Safety boundary: only touch paths inside `/home/marcos/Escritorio/Kermingo/kermingo_menu/`. Never modify anything outside this root (`../`).

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|---|---|---|---|
| v0 reference deletion | `git rm -rf diseno-de-landing-kermingo/` | Untrack only, keep on disk | User explicitly authorized full removal. Folder has 67 tracked files and 20 modified in the working tree; `git rm -rf` stages all deletions cleanly in one slice. |
| Screenshot handling | Move untracked root PNGs into `captures/` | Delete them | Some captures are QA references; moving preserves them without root clutter. |
| `captures/` in `.gitignore` | Add `captures/` to root `.gitignore` | Track them | Screenshots are QA/build artifacts, not source code. |
| `openspec/specs/` pruning | Defer | Bulk delete | `openspec/specs/` holds reusable main specs per OpenSpec convention. Distinguishing stale specs from active domain specs requires mapping to archived changes, which is beyond this scope. |
| Legacy change dirs | Delete 7 inactive `openspec/changes/*` dirs | Archive them first | These are superseded merged stages, not the audit trail. The audit trail lives in `openspec/changes/archive/` and must be preserved. |
| `sdd/` removal | Delete entire directory | Keep for history | Superseded by `openspec/`; content duplicates archived openspec changes. |

## File Changes

| File / Path | Action | Description |
|---|---|---|
| `diseno-de-landing-kermingo/` | Delete | `git rm -rf`; removes 67 tracked files plus working-tree modifications |
| `backend/pnpm-lock.yaml` | Delete | Untracked orphan; backend uses npm exclusively |
| `backend/pnpm-workspace.yaml` | Delete | Untracked orphan |
| `skills-lock.json` | Delete | Untracked generated lock file |
| `frontend/tsconfig.tsbuildinfo` | Delete | Untracked TypeScript incremental build info |
| `sdd/` | Delete | Abandoned directory; content duplicated in openspec archive |
| `openspec/changes/backend-b5-2-schema-seed-alignment/` | Delete | Legacy merged change |
| `openspec/changes/backend-b6-1-cocina-configuracion/` | Delete | Legacy merged change |
| `openspec/changes/backend-b6-2-1-caja-hardening/` | Delete | Legacy merged change |
| `openspec/changes/backend-b6-caja-cocina-comprobantes-reportes/` | Delete | Legacy merged change |
| `openspec/changes/etapa-3-productos-api/` | Delete | Legacy merged change |
| `openspec/changes/etapa-4-auth/` | Delete | Legacy merged change |
| `openspec/changes/etapa-5-pedidos/` | Delete | Legacy merged change |
| Root `*.png` | Move | `mkdir -p captures/` then `mv *.png captures/` |
| `frontend/.gitignore` | Modify | Append `*.tsbuildinfo` |
| `.gitignore` (root) | Modify | Append `captures/` |

## Data Flow

N/A — no runtime data flow affected.

## Interfaces / Contracts

N/A — no new interfaces or contracts introduced.

## Testing Strategy

Verification only. After staging:

- `git status` shows no untracked root PNGs, no `diseno-de-landing-kermingo/`, no orphan files.
- `captures/` exists and contains the moved PNGs.
- Tracked file count drops by ~67.
- `docs/planificacion/` and `DOCUMENTACION/IA/` remain untouched.
- `openspec/changes/archive/` and `openspec/changes/repo-cleanup/` remain intact.

## Migration / Rollout

All operations are staged but **not committed**. Rollback plan:

```bash
git reset HEAD
git checkout -- .
```

`diseno-de-landing-kermingo/` can be recovered from git history because it was tracked. Untracked orphans are not recoverable from this repo, but they are generated/stray artifacts with no source-of-truth value.

## Commit Work-Unit Plan

1. `chore: remove diseno-de-landing-kermingo/ v0 reference folder` — `git rm -rf diseno-de-landing-kermingo/`
2. `chore: consolidate root screenshots into captures/` — `mkdir -p captures/ && mv *.png captures/ && git add captures/`
3. `chore: delete orphan pnpm artifacts and generated files` — delete `backend/pnpm-lock.yaml`, `backend/pnpm-workspace.yaml`, `skills-lock.json`, `frontend/tsconfig.tsbuildinfo`
4. `chore: prune legacy openspec change dirs and abandoned sdd/` — delete the 7 legacy dirs and `sdd/`
5. `chore: ignore tsbuildinfo and capture artifacts` — update `frontend/.gitignore` and root `.gitignore`

**No commits are executed** — slices are prepared for review.

## Open Questions

- `openspec/specs/` stale determination: some specs may correspond to archived changes, but many appear to be reusable main specs. Recommend a future manual review before any spec deletion.
- `docs/planificacion/` files: exploration recommends keeping these as historical checkpoints; no action required.
