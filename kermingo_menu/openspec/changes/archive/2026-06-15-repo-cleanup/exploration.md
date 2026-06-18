# Exploration: repo-cleanup

## Current State

The active root is `/home/marcos/Escritorio/Kermingo/kermingo_menu`. There are ~729 tracked files and ~306 untracked files inside the repo. The working tree shows massive untracked noise: root-level screenshots, duplicate/backup folders outside the repo (`../backend/`, `../frontend/`, `../kermingo_menu (Copiar)/`, `../kermingo_menu.zip`, `../entradas_kermingo/`), stale openspec archives, orphaned planning documents, and modified files in `diseno-de-landing-kermingo/` that git marks as changed because the folder IS tracked (67 tracked files inside it).

### Dirty Working Tree Categories

- **Screenshots/captures (~45 PNGs in root):** `home-*.png`, `menu-*.png`, `admin-*.png`, `verify-*.png`, `bingo-*.png`, `carrito-*.png`, `confirmar-*.png`, `seguimiento-360.png`. Total ~3.5 MB.
- **`diseno-de-landing-kermingo/` modifications:** 20 modified files inside the v0 reference (plus untracked new files like `logo.png`, `public/bank-transfer-confirmation.png`, `components/crest-row.tsx`, etc.). The folder has 67 tracked files; many were modified during copy-paste work.
- **Orphan backend files:** `backend/pnpm-lock.yaml` and `backend/pnpm-workspace.yaml` — npm was historically used (`package-lock.json` present); pnpm artifacts are stray.
- **Stale openspec/archive entries:** `openspec/changes/archive/` contains 22+ archived changes. Many have no `archive/` subdirectory and the archive root is flat. Some entries date from 2026-06-05 to 2026-06-15 and likely correspond to merged/rejected branches.
- **Active `openspec/changes/` (non-archive):** 7 old entries remain: `backend-b5-2-schema-seed-alignment`, `backend-b6-1-cocina-configuracion`, `backend-b6-2-1-caja-hardening`, `backend-b6-caja-cocina-comprobantes-reportes`, `etapa-3-productos-api`, `etapa-4-auth`, `etapa-5-pedidos`. These are historical stages already merged or superseded.
- **`openspec/specs/`:** 31 entries, many with corresponding archive entries. Appears synced but bloated with old specs.
- **`sdd/` directory:** Contains only `sdd/backend-b6-2-caja/` (single subdir). Looks abandoned vs. `openspec/`.
- **`skills-lock.json`:** Untracked, likely auto-generated.
- **Git-marked paths OUTSIDE repo root:** `../backend/`, `../frontend/`, `../kermingo_menu (Copiar)/`, `../entradas_kermingo/`, `../kermingo_menu.zip`. These are git status pollution from a parent folder that is also a git repo (the workspace). They must be handled safely — **do NOT delete anything outside `/home/marcos/Escritorio/Kermingo/kermingo_menu/` without separate confirmation.**

### Documentation Situation

- **Source of truth (keep):** `DOCUMENTACION/IA/` (INDEX, ARQUITECTURA, API, CORE, INFRA, WEBAPP, AUTH, FUNCIONALIDADES, FLUJOS, DEPLOY, TESTING, GOTCHAS, GLOSARIO). Also `AGENTS.md` and `README.md`.
- **Historical planning docs (complementary):** `docs/planificacion/` with 49 numbered files (01–49) covering prompts, audits, task plans, and checkpoint lists. These are valuable historical context but are NOT the source of truth.
- **Generated/AI docs:** `docs/planificacion/20-PROMPT_MAESTRO_OPENCODE.md`, `29-PROMPT_AUDITORIA_CHATGPT.md`, etc.

### Important: `diseno-de-landing-kermingo/` is TRACKED

It has 67 tracked files. Deleting the entire folder will remove tracked files, producing a large deletion diff. That is explicitly authorized by the user (`Delete the entire diseno-de-landing-kermingo/ folder`). Git will record the deletion correctly. However, note that 20 of those files are also marked as `M` (modified) in working tree; the diff will show those modifications being deleted along with the rest.

## Proposed Cleanup Classification Table

### 1. Delete Now (explicitly authorized)

| Path | Reason |
|---|---|
| `diseno-de-landing-kermingo/` | Entire v0 reference folder, explicitly authorized. Note: 67 tracked files will be deleted; staged as `git rm -rf`. |
| `home-*.png` (root, 9 files) | Screenshots cluttering root. |
| `menu-*.png` (root, 7 files) | Screenshots cluttering root. |
| `admin-*.png` (root, 10 files) | Screenshots cluttering root. |
| `verify-*.png` (root, 10 files) | Verify screenshots cluttering root. |
| `bingo-*.png` (root, 2 files) | Screenshots cluttering root. |
| `carrito-360.png` | Screenshot cluttering root. |
| `confirmar-360.png` | Screenshot cluttering root. |
| `seguimiento-360.png` | Screenshot cluttering root. |
| `skills-lock.json` | Untracked generated file; not in .gitignore. Safe to delete. |
| `backend/pnpm-lock.yaml` | Orphan pnpm artifact; project uses npm. |
| `backend/pnpm-workspace.yaml` | Orphan pnpm artifact; project is not a pnpm workspace. |
| `frontend/tsconfig.tsbuildinfo` | Untracked TypeScript incremental build info. Should be in .gitignore. |
| `openspec/changes/archive/` contents older than 30 days or already merged | Historical archive bloat. |
| `openspec/changes/` non-archive entries that are merged | 7 legacy entries. |
| `openspec/specs/` entries with no matching active change | Stale specs. |
| `sdd/` | Abandoned directory superseded by openspec. Contains `sdd/backend-b6-2-caja/` which is already archived in openspec. |

### 2. Move to a Single Captures Folder

Suggest path: `/home/marcos/Escritorio/Kermingo/kermingo_menu/captures/`

Move ALL remaining screenshots from root here. Also move `verify-*.png` and any future captures. This becomes the canonical folder for visual QA captures.

Action:
```bash
mkdir -p captures/
mv *.png captures/
```

This keeps them accessible without cluttering root.

### 3. Archive/Keep Documentation

| Path | Action | Reason |
|---|---|---|
| `DOCUMENTACION/IA/` | **Keep** (update INDEX if needed) | Source of truth for agents. |
| `AGENTS.md` | **Keep** | Operational guide; do not delete. |
| `README.md` | **Keep** | Public-facing readme. |
| `docs/planificacion/` | **Keep** | Historical context; not source of truth but Marcos references checkpoints from here. |

### 4. Requires User Confirmation Despite Broad Request

| Item | Why confirmation is needed |
|---|---|
| `docs/planificacion/` | User said "clean documentation, planning files, and prompts". But deleting these files loses historical checkpoint definitions and audit prompts. Recommend KEEP but maybe compress old audit outputs. |
| `openspec/changes/archive/` | Flat archive with 22 entries. May contain specs that were never merged. Safer to compress to a single `archive.tar.gz` than delete. |
| `.github/workflows/` | Recently added (CI). Should be kept. |
| `.nvmrc` | Small file specifying Node version; keep. |
| `frontend/test/` | Contains 3 frontend tests (ticket-screen, tracking-screen, use-local-storage). Keep. |
| `.agents/skills/` | Tracked; contains project-specific skills. Keep. |

### Safety Boundaries

- **DO NOT touch:** `backend/`, `frontend/` (except move `tsconfig.tsbuildinfo` to cleanup or gitignore), `DOCUMENTACION/IA/`, `AGENTS.md`, `README.md`, `docs/planificacion/` files, `.github/workflows/`, `.agents/skills/`.
- **DO NOT delete outside repo root:** `../backend/`, `../frontend/`, `../kermingo_menu (Copiar)/`, `../entradas_kermingo/`, `../kermingo_menu.zip`. These belong to a parent git repo in `/home/marcos/Escritorio/Kermingo/` and are outside our authority. We only note them as git status pollution.
- **DO NOT commit:** As instructed.

## Risks

1. **Deleting `diseno-de-landing-kermingo/` removes tracked files.** Since 20 files inside it are modified in working tree, `git rm -rf` will show a large deletion diff. This is expected and authorized.
2. **Untracked screenshots may still be referenced.** None of the PNGs are imported in source code. They are pure captures. Safe to delete/move.
3. **Orphan `pnpm` files in backend.** Deleting `pnpm-lock.yaml` + `pnpm-workspace.yaml` is safe if the team exclusively uses npm. Both files are untracked.
4. **Loss of historical `sdd/` artifacts.** `sdd/backend-b6-2-caja/` appears to duplicate openspec archive content. Deletion is safe after confirming no unique content exists (I confirmed it is a subset).
5. **.gitignore gaps.** `frontend/tsconfig.tsbuildinfo` is not ignored. Recommend adding `*.tsbuildinfo` to `frontend/.gitignore`.
6. **Parent repo pollution.** Git status shows paths outside the repo root (`../backend/`, `../frontend/`, etc.). These are untracked items in the parent workspace repo. They do NOT belong to this repo. We should NOT touch them.

## Work-Unit Commit Plan (after cleanup, do NOT commit now)

### Commit 1: chore: remove v0 reference folder `diseno-de-landing-kermingo`
- `git rm -rf diseno-de-landing-kermingo/`
- Message: `chore: remove diseno-de-landing-kermingo/ v0 reference folder`

### Commit 2: chore: move root screenshots to captures/ folder
- `mkdir captures/ && mv *.png captures/`
- `git add captures/`
- Message: `chore: consolidate screenshots into captures/ folder`

### Commit 3: chore: delete orphan and generated files
- Delete `backend/pnpm-lock.yaml`, `backend/pnpm-workspace.yaml`, `skills-lock.json`, `frontend/tsconfig.tsbuildinfo`
- Message: `chore: remove orphan pnpm artifacts and generated lock/info files`

### Commit 4: chore: prune stale openspec archives and legacy sdd/
- Remove `openspec/changes/archive/*` (or compress), `openspec/changes/*` (legacy active entries), `openspec/specs/*` (stale specs), `sdd/`
- Message: `chore: prune stale openspec archives, legacy specs, and abandoned sdd/`

### Commit 5: chore: update .gitignore for tsbuildinfo and captures
- Add `*.tsbuildinfo` to `frontend/.gitignore`
- Optionally add `captures/` to root `.gitignore` if they should not be committed
- Message: `chore: ignore tsbuildinfo and capture artifacts`

### Final state check
- Run `git status` to confirm only desired untracked/modified items remain.
- Run `git ls-files | wc -l` to confirm tracked count dropped by ~67 (diseno-de-landing-kermingo).

## Recommendation and Whether Ready for Proposal

**Recommendation:** Proceed with the cleanup in the 5 commits above. The user gave broad authorization to delete `diseno-de-landing-kermingo/`, root screenshots, duplicates/orphans, and planning bloat. The only items requiring pause are:
- `docs/planificacion/` files — recommend KEEP (they are historical checkpoints, not redundant with DOCUMENTACION/IA/).
- `openspec/changes/archive/` — recommend compress to `archive.tar.gz` inside `openspec/changes/` rather than outright deletion, preserving history.

**Ready for Proposal?** Yes. The exploration is complete. The user explicitly authorized deletion of `diseno-de-landing-kermingo/` and root screenshots. All paths are explicit. Safety boundaries are clear (nothing outside repo root touched). The commit plan is reviewable.

### Checkpoint

- Checkpoint automatico: listo
- Checkpoint manual requerido: no
- Auditoria con ChatGPT recomendada: no
- Bloquea avance a siguiente etapa: no
