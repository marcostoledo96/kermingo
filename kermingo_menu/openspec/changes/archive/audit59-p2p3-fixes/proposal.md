# Proposal: Kermingo audit59 P2/P3 follow-ups

## Intent
Address the remaining P2 and one P3 item from `docs/planificacion/59-AUDITORIA_DB0806C_B7_E2E_FLOWS.md` that are safe and contained. Each fix improves UX, security, or maintainability without breaking the P1 work already merged in `audit59-p1-fixes` (commit `68954cf`).

## Scope
- **P2-1**: `MenuScreen` should treat store config `loading` and `error` as "store disabled" so users cannot add to cart while we cannot confirm the store is open. Surface a retry button.
- **P2-2**: Cross-check receipt file extension against declared MIME type. If they disagree, reject with 400. This closes a small gap that could let a `.png` with `image/jpeg` magic bytes through silently.
- **P3-2**: Rename `frontend/package.json` `name` from `"my-project"` to `"kermingo-frontend"`.

## Affected Areas
- Frontend `components/menu/menu-screen.tsx`
- Frontend `components/menu/checkout-screen.tsx` (no code change; just consistency check — already blocks on loading/error)
- Backend `src/api/middlewares/upload.middleware.js`
- Frontend `lib/checkout.ts` (or wherever receipt validation lives) for the matching frontend rule
- Frontend `package.json`

## Non-Goals
- P2-3 (category ordering in `setProductoCategorias`) — purely cosmetic.
- P2-4 (env example docs) — only documentation.
- P2-5 (time input visual) — UX nit, low priority.
- P3-1 (bank data hardcoded) — requires schema/admin work, separate change.
- P3-3 (react-hooks warnings) — pre-existing, requires refactor of useApiResource.

## Approach
Three small commits (or one combined commit with clear sections) touching ≤5 files. Each is independently testable.

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| P2-1 might over-block and cause flicker on slow connections | Show explicit "Verificando tienda…" state with skeleton, not just disable silently |
| P2-2 strict MIME check rejects legitimate .jpg + image/jpeg combos | Map `.jpg`/`.jpeg` to `image/jpeg` in the allowed map; both forms must be accepted |
| P3-2 breaks Vercel or pnpm workspace detection | Verify `name` change does not affect deployment; `name` is a metadata field, not a runtime dependency |

## Acceptance Criteria
1. `pnpm test` passes (with new P2-1 menu-screen config-loading test).
2. `npm test` backend passes (with new P2-2 receipt MIME/extension mismatch test).
3. `pnpm build` passes.
4. Manual: in `MenuScreen`, with `useApiResource` returning a delayed promise, the ProductCard is disabled until the promise resolves.
