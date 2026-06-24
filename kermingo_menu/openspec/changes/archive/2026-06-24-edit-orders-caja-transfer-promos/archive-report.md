# Archive Report: edit-orders-caja-transfer-promos

status: success (intentional-with-warnings)

## Change Snapshot

| Field | Value |
|---|---|
| Change name | `edit-orders-caja-transfer-promos` |
| Project | kermingo |
| Artifact store | hybrid (OpenSpec + Engram) |
| Archived folder | `openspec/changes/archive/2026-06-24-edit-orders-caja-transfer-promos/` |
| Archive date | 2026-06-24 (ISO) |
| Source-of-truth docs | `DOCUMENTACION/IA/{API,CORE,FUNCIONALIDADES,FLUJOS,WEBAPP,TESTING,GOTCHAS}.md` |
| Cycle phases | explore → propose → spec → design → tasks → apply → verify → archive |

## Why this change existed

Admins could not fix generated orders, caja transfer sales were stored as `pendiente`, and promo components had no admin API or UI. The change expanded order editing to all origins and delivered orders, forced `estado_pago='pagado'` for caja sales regardless of frontend payload, and exposed GET/PUT endpoints plus an admin UI for promo components, including an explicit "clear components to disable" maintenance action.

## Capabilities delivered

| Capability | Status |
|---|---|
| Caja force-pagado for `efectivo` and `transferencia` | Delivered |
| Correction script with dry-run default and backup-gated apply | Delivered |
| `GET /api/admin/productos/:id/componentes` | Delivered |
| `PUT /api/admin/productos/:id/componentes` (atomic replace, clear-to-unavailable) | Delivered |
| `componentes_count` in admin product list + incomplete badge | Delivered |
| Incomplete promo cannot be enabled or sold | Delivered |
| Admin product form: promo component editor with draft preservation | Delivered |
| `PUT /api/admin/pedidos/:id` expanded to all origins and delivered | Delivered |
| Cancelled orders block item edits, empty replacement rejected | Delivered |
| Paid state preserved across `metodo_pago` change, no comprobante mutation | Delivered |
| Admin order edit modal/sheet (metadata, payment, items add/remove/qty) | Delivered |
| `DOCUMENTACION/IA/*` updated | Delivered |

## Specs Synced

This change uses the project's flat OpenSpec layout (the change's `spec.md` is a single document covering all touched capabilities, not a per-domain delta). The project's source of truth lives in `DOCUMENTACION/IA/`, which was updated directly. The relevant existing per-domain specs in `openspec/specs/` (`admin-pedidos-tabs`, `cashier-operations`, `product-admin-api`) describe the prior contracts; the new behavior is captured in the change's `spec.md` (ADDED + MODIFIED requirements) and reflected in the docs.

| Domain | Action | Details |
|---|---|---|
| `admin-pedidos-tabs` | Forward-referenced | New `edit` affordance lives in `/admin/pedidos`; tab/state-gate semantics unchanged. Captured in change `spec.md` MODIFIED requirement "Pedidos tabs include editing without weakening state gates". |
| `cashier-operations` | Forward-referenced | Caja force-pagado captured in change `spec.md` MODIFIED requirement "Caja rápida orders enter preparation immediately". |
| `product-admin-api` | Forward-referenced | New component GET/PUT captured in change `spec.md` ADDED requirements. |
| `DOCUMENTACION/IA/*` | Updated | API, CORE, FLUJOS, FUNCIONALIDADES, WEBAPP, TESTING, GOTCHAS reflect the new contracts. INDEX.md unchanged (no new doc). |

## Archive Folder Contents

- `proposal.md` ✅
- `explore.md` ✅
- `spec.md` ✅
- `design.md` ✅
- `tasks.md` ✅ (automated items checked; manual items left unchecked with explicit reason)
- `verify-report.md` ✅ (status: PASS, 2026-06-24)
- `archive-report.md` ✅ (this file)

## Tasks Reconciliation

The persisted `tasks.md` arrived with `6.3c`–`6.3h` unchecked despite automation having passed. This is a documented case of stale checkboxes; the orchestrator supplied fresh evidence and the executor reran every command. Per the SDD skill, an exceptional mechanical reconciliation is performed and the reason recorded here:

- `6.3c` Full backend suite `npm test` — **reconciled to checked** (19 suites, 353 tests, all PASS).
- `6.3d` Full frontend suite `pnpm vitest run` — **reconciled to checked** (27 files, 292 tests, all PASS).
- `6.3e` Frontend production build `pnpm build` — **reconciled to checked** (Next.js 16.2.6, 18 static pages, with `NEXT_PUBLIC_API_URL=http://localhost:3001`).
- `6.3f` Manual browser QA — **left unchecked**, manual followup (cannot be executed by automation; recorded as post-archive operational gate).
- `6.3g` Correction script dry-run/apply evidence with backup note — **left unchecked** for the apply half; dry-run evidence recorded, apply is opt-in and requires a DB backup. Documented as post-archive operational gate. (Current dataset has zero candidates; apply would be a no-op.)
- `6.3h` `sdd-archive` — **reconciled to checked** by this archive run.

## Verification Summary (commands and outcomes)

| Layer | Outcome |
|---|---|
| Backend `npm test` | PASS — 19 suites, 353 tests |
| Backend `npm test -- caja.test.js` | PASS — 76 tests |
| Backend `npm test -- promos-componentes.test.js producto-filtering.test.js` | PASS — 48 tests |
| Backend `npm test -- scripts/__tests__/fix-caja-transferencias-pagadas.test.js` | PASS — 14 tests |
| Backend `node scripts/fix-caja-transferencias-pagadas.mjs` | PASS dry-run — `Candidate rows: 0` |
| Frontend `pnpm exec vitest run` | PASS — 27 files, 292 tests |
| Frontend `NEXT_PUBLIC_API_URL=http://localhost:3001 pnpm build` | PASS — Next.js 16.2.6, 18 static pages |
| Frontend `pnpm lint` | 8 warnings, 0 errors (pre-existing pattern) |
| Repo `git diff --check` | PASS |

## Manual Followups (operational, not archival)

These do not block the SDD cycle. They are recommended before the change is operated in production.

1. Browser smoke: compra efectivo, compra transferencia con comprobante, login admin, caja rápida, cocina, cancelación con reposición de stock.
2. Browser edit coverage: `Editar pedido` metadata-only on `entregado`; item quantity/remove/add on a non-cancelled order; rejection keeps modal open; `cancelado` is read-only.
3. Promo editor: save components, observe `disponible=0` after `componentes: []`; incomplete-promo badge; enabling an incomplete promo returns 400.
4. Correction script apply (only if production data has any `caja` + `transferencia` + `estado_pago <> 'pagado'` rows): backup first, then `CONFIRM_FIX_CAJA_TRANSFERENCIAS=YES node scripts/fix-caja-transferencias-pagadas.mjs --apply`.

## Risks Accepted into MVP Debt

- **Promo composition drift on cancel/edit** — cancellation and edit use the current `combo_producto` composition, not a sale-time snapshot. If admins change a promo's components after sales, cancel/edit will restore/deduct against the new composition. Documented in `GOTCHAS.md` #11. The new `componentes: []` clear-to-unavailable semantics make this drift easier to trigger, so admin edits to a promo with sales require extra care. Long-term fix is out of scope and would require a `pedido_detalle_componente` snapshot table.

## Next Recommended

- Operate behind a single small browser QA pass.
- Watch `reportes.test.js` for shared-DB fixture pollution if the suite is ever split into a separate schema; current `runInBand` + per-test fixture discipline is the working boundary.
- New SDD changes can be initiated from the active branch.

## Engram Trace

- Observation ID: `3665`
- Sync ID: `obs-b2bb09911b05d6e8`
- Topic key: `sdd/edit-orders-caja-transfer-promos/archive-report`
- Type: `architecture`
- Capture prompt: `false` (automated artifact)

skill_resolution: paths-injected
