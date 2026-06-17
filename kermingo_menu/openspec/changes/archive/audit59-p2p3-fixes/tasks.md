# Tasks: Kermingo audit59 P2/P3 follow-ups

## Review Workload Forecast
| Field | Value |
|-------|-------|
| Estimated changed lines | 60–100 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |

### Suggested Work Units
| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | P2-1 MenuScreen config loading | PR 2 (combined) | Frontend only |
| 2 | P2-2 strict MIME/extension cross-check | PR 2 (combined) | Backend + frontend |
| 3 | P3-2 rename package.json | PR 2 (combined) | Single line |

## Phase 1: P2-1 MenuScreen config loading

- [x] 1.1 In `frontend/components/menu/menu-screen.tsx`, destructure `loading: storeConfigLoading, error: storeConfigError, refetch: refetchConfig` from the `useApiResource` for storeConfig.
- [x] 1.2 Add a derived `isStoreConfigPending = storeConfigLoading || Boolean(storeConfigError)`.
- [x] 1.3 Update `isStoreDisabled` to also be true when `isStoreConfigPending`.
- [x] 1.4 Render a banner above the product grid with a retry button when error.
- [x] 1.5 Add `frontend/test/menu-screen-config-loading.test.tsx` with the required scenarios.

## Phase 2: P2-2 strict MIME/extension cross-check

- [x] 2.1 In `backend/src/api/middlewares/upload.middleware.js`, after the supported-extension check, add a comparison `expected = ALLOWED_RECEIPT_EXTENSIONS[extension]; if (file.mimetype && expected !== file.mimetype) throw new ValidationError(...)`.
- [x] 2.2 Locate the frontend receipt validation module (likely in `frontend/lib/receipt-validation.ts` or similar; check the existing `checkout-screen-receipt-validation.test.tsx` to find what it imports).
- [x] 2.3 In the frontend validator, add the same rule using a small `EXTENSION_TO_MIME` map.
- [x] 2.4 Add a backend unit test in `tests/comprobantes.unit.test.js` for both the negative (mismatch throws) and positive (jpg/jpeg accepted) cases.
- [x] 2.5 Add a frontend test asserting the validator rejects `.png` with `image/jpeg`.

## Phase 3: P3-2 rename

- [x] 3.1 Edit `frontend/package.json`: `"name": "my-project"` → `"name": "kermingo-frontend"`.

## Phase 4: Verification

- [ ] 4.1 Run `cd kermingo_menu/backend && npm test -- --testPathPattern=comprobantes.unit`.
- [ ] 4.2 Run `cd kermingo_menu/frontend && pnpm test && pnpm exec tsc --noEmit && pnpm lint && NEXT_PUBLIC_API_URL=http://localhost:3001 pnpm build`.

## Commit strategy

Single commit with message:

```
fix(audit59): P2 menu config gating, strict receipt MIME, rename package

- MenuScreen treats store config loading/error as "store disabled",
  with a "Verificando tienda..." banner and a "Reintentar" button
  when the config fetch fails.
- Receipt upload now cross-checks file extension against declared MIME
  on both backend (upload.middleware) and frontend (receipt validation).
  Closes a small gap that let a .png with image/jpeg magic through.
- Rename frontend package.json "name" from "my-project" to
  "kermingo-frontend" (P3-2).

P3-1 (datos bancarios), P3-3 (react-hooks warnings) and remaining P2
items (P2-3..P2-5) are intentionally deferred — they need separate
spec work or are pure documentation.
```

## Next Step
Ready for sdd-apply.
