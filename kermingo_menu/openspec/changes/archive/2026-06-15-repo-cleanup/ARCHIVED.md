# Archive Report: repo-cleanup

**Archived:** 2026-06-15
**Source change folder:** `openspec/changes/repo-cleanup/`
**Archive folder:** `openspec/changes/archive/2026-06-15-repo-cleanup/`
**Durable spec:** `openspec/specs/repo-hygiene/spec.md`

---

## Summary

Repository hygiene cleanup: removed the `diseno-de-landing-kermingo/` v0 reference folder (67 tracked files), consolidated root-level PNG screenshots into an ignored `captures/` folder (47 files), deleted orphan/generated artifacts (`backend/pnpm-lock.yaml`, `backend/pnpm-workspace.yaml`, `skills-lock.json`, `frontend/tsconfig.tsbuildinfo`), pruned 7 stale legacy `openspec/changes/` directories and the abandoned `sdd/` directory, and updated `.gitignore` rules (`captures/` at root, `*.tsbuildinfo` in `frontend/.gitignore`).

No runtime behavior changes. Five commit slices defined but not executed — pending user review.

### Operations performed

| Operation | Details |
|-----------|---------|
| v0 reference folder removal | `git rm -rf diseno-de-landing-kermingo/` — 67 tracked files, ~14k lines deleted |
| Screenshot consolidation | 47 root `*.png` files moved to `captures/`; folder added to `.gitignore` |
| Orphan file deletion | 4 untracked generated artifacts removed |
| Legacy openspec/sdd pruning | 7 legacy `openspec/changes/` dirs + `sdd/` removed; `archive/` and `repo-cleanup/` preserved |
| .gitignore updates | `captures/` added to root `.gitignore`; `*.tsbuildinfo` added to `frontend/.gitignore` |

### Spec compliance

| Requirement | Result |
|-------------|--------|
| Cleanup scope boundary | ✅ Confined to `kermingo_menu/` |
| v0 reference folder removal | ✅ `diseno-de-landing-kermingo/` absent |
| Screenshot consolidation | ✅ 0 root PNGs; 47 in `captures/` |
| Orphan file removal | ✅ All 4 orphan paths absent |
| .gitignore maintenance | ✅ `captures/` and `*.tsbuildinfo` present |
| Stale openspec/sdd pruning | ✅ Only `archive/` under `openspec/changes/`; `sdd/` gone |
| Documentation preserved | ✅ `DOCUMENTACION/IA/`, `docs/planificacion/`, `AGENTS.md`, `README.md` exist and unmodified |
| Commit separation plan | ✅ 5 slices defined; HEAD unchanged |

---

## Verify Evidence

**Final verdict:** PASS WITH WARNINGS

| Check | Result |
|-------|--------|
| Root guard (`pwd`) | ✅ `/home/marcos/Escritorio/Kermingo/kermingo_menu` |
| `diseno-de-landing-kermingo/` absent | ✅ `git ls-files` count = 0 |
| Root PNG count = 0 | ✅ |
| `captures/` exists with 47 PNGs | ✅ |
| Orphan files absent | ✅ All 4 paths checked |
| `sdd/` absent | ✅ |
| `openspec/changes/` active dirs | ✅ Only `archive/` |
| `.gitignore` rules | ✅ Both entries present |
| DOCUMENTACION/IA/docs preserved | ✅ Not staged or modified by cleanup |
| `git log` unchanged | ✅ HEAD remains `36f6667` |
| Staged diff | 101 files changed: 6 insertions, 14363 deletions |

### Warnings (non-blocking)

1. **Unrelated unstaged modifications exist** — `AGENTS.md`, `DOCUMENTACION/IA/*.md`, backend test files, and frontend files have unstaged changes in the working tree. These are not part of repo-cleanup and must be reviewed before any commit.
2. **Parent git repo pollution** — `git status` shows untracked sibling paths (`../backend/`, `../frontend/`, etc.) because the git top-level is `/home/marcos/Escritorio/Kermingo`. These were intentionally not touched.
3. **`openspec/specs/` pruning deferred** — `openspec/specs/` contains ~30 likely reusable main specs. Stale determination was deferred per design decision; future manual review recommended.

---

## Source-of-Truth Spec

The durable, versioned specification lives at:

```
openspec/specs/repo-hygiene/spec.md
```

This spec is now the canonical reference for repository hygiene rules. The change-specific copy has been archived alongside this report.

---

## DOCUMENTACION/IA Updates

No documentation updates were required for this change — it is pure repository hygiene with no runtime behavior changes. The existing docs remain accurate.

---

## Commit Work-Unit Plan (pending user review)

| # | Message | Scope |
|---|---------|-------|
| 1 | `chore: remove diseno-de-landing-kermingo/ v0 reference folder` | `git rm -rf diseno-de-landing-kermingo/` |
| 2 | `chore: consolidate root screenshots into captures/` | `mkdir -p captures/ && mv *.png captures/ && git add captures/` |
| 3 | `chore: delete orphan pnpm artifacts and generated files` | `rm backend/pnpm-lock.yaml backend/pnpm-workspace.yaml skills-lock.json frontend/tsconfig.tsbuildinfo` |
| 4 | `chore: prune legacy openspec change dirs and abandoned sdd/` | Delete 7 legacy dirs + `sdd/` |
| 5 | `chore: ignore tsbuildinfo and capture artifacts` | Update `frontend/.gitignore` + root `.gitignore` |

**No commits executed** — user must review staged state and authorize commit sequence.

---

## SDD Cycle Completion

| Phase | Status |
|-------|--------|
| Init | ✅ Complete |
| Explore | ✅ Complete |
| Propose | ✅ Complete |
| Spec | ✅ Complete |
| Design | ✅ Complete |
| Tasks | ✅ Complete |
| Apply | ✅ Complete |
| Verify | ✅ Complete (PASS WITH WARNINGS) |
| Archive | ✅ Complete (this report) |

**SDD cycle: COMPLETED**

### Checkpoint

```
Checkpoint automatico: completado
Testing manual requerido: no
Auditoria con ChatGPT recomendada: no
Bloquea avance a siguiente etapa: no
```