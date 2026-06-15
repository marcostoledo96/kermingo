# Archive Report: frontend-ticket-qr

**Archived:** 2026-06-15  
**Source change folder:** `openspec/changes/frontend-ticket-qr/`  
**Archive folder:** `openspec/changes/archive/2026-06-15-frontend-ticket-qr/`  
**Durable spec:** `openspec/specs/frontend-ticket-qr/spec.md`

---

## Summary

Replaced the decorative `FauxQR` in the confirmed ticket screen (`/confirmado`) with a real, scannable QR code using `qrcode.react` (`QRCodeSVG`). The QR encodes the public tracking URL (`${origin}/seguimiento?token=${order.token}`) and is hydration-safe, print-compatible (168×168 CSS px SVG), and does not expose private data. The tracking screen (`/seguimiento`) was updated to read `?token=` from URL query params via `useSearchParams` with a `<Suspense>` boundary, auto-fetching the order on scan.

### Files changed

| File | Action |
|------|--------|
| `frontend/package.json` | Added `qrcode.react` dependency |
| `frontend/components/menu/ticket-screen.tsx` | Replaced `FauxQR` with `QRCodeSVG`; client-only render guard |
| `frontend/app/seguimiento/page.tsx` | Wrapped `<TrackingScreen />` in `<Suspense>` |
| `frontend/components/menu/tracking-screen.tsx` | Added `useSearchParams` to read `?token=` from URL |
| `frontend/lib/use-local-storage.ts` | Fixed React #185 infinite re-render (referential stability cache) |
| `backend/tests/comprobantes.drive-mock.test.js` | Added `pool.end()` in `afterAll` to fix open handle |

### Tests added

| Test file | Tests | Coverage |
|-----------|-------|----------|
| `frontend/test/ticket-screen.test.tsx` | 6 | QR URL, privacy, 168px size |
| `frontend/test/tracking-screen-token.test.tsx` | 6 | URL token auto-fetch, missing token, localStorage override |
| `frontend/test/use-local-storage.test.ts` | 10 | Referential stability, cache invalidation |

---

## Verify Evidence

**Final verdict:** PASS WITH WARNINGS

| Check | Result |
|-------|--------|
| `pnpm lint` | ✅ Passed |
| `pnpm test` (frontend) | ✅ 6 suites, 92 tests passed |
| `pnpm build` | ✅ Next.js 16.2.6 compiled successfully |
| Backend `npm test` | ✅ 13 suites, 201 tests passed |
| Backend `--detectOpenHandles` | ✅ Clean exit, no open handles |
| Runtime browser (Playwright) | ✅ QR renders at 168×168, tracking URL auto-fetches, no React #185 |
| Print media visibility | ✅ QR visible at 168×168 CSS px under print media |
| Spec compliance | ✅ 7/7 scenarios compliant |

### Warnings (non-blocking)

1. **Physical QR scan not verified** — automated verify confirmed QR SVG size (168px), print visibility, and URL correctness, but a real printed/PDF ticket scanned by a physical QR reader was not performed. **Recommended pre-release check.**
2. **`pnpm build` skips type validation** — build output says "Skipping validation of types". Consider adding a dedicated `typecheck` script for stronger signal.
3. **Browser 404 resource-load console noise** — unrelated to QR/tracking functionality; not investigated in this change.
4. **Unrelated working-tree modifications** — this verify only judged `frontend-ticket-qr` remediation.

---

## Source-of-Truth Spec

The durable, versioned specification lives at:

```
openspec/specs/frontend-ticket-qr/spec.md
```

This spec is now the canonical reference for the QR-on-ticket and URL-token-tracking behavior. The change-specific copy has been archived alongside this report.

---

## DOCUMENTACION/IA Updates

The following documentation files were updated to reflect this change:

| File | Update |
|------|--------|
| `DOCUMENTACION/IA/WEBAPP.md` | Added `qrcode.react` to stack table; updated route descriptions for `/confirmado` and `/seguimiento`; added §7 "Ticket confirmado y QR" with QR flow details; added `TicketScreen` and `TrackingScreen` to component table |
| `DOCUMENTACION/IA/FUNCIONALIDADES.md` | Added QR and URL token auto-fetch to "Seguimiento de pedido" section |
| `DOCUMENTACION/IA/TESTING.md` | Added frontend test section with Vitest + RTL; listed new test files and commands |
| `DOCUMENTACION/IA/GOTCHAS.md` | Added §18: `useSyncExternalStore` + `JSON.parse` referential stability gotcha (React #185) |

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
Testing manual requerido: si (physical QR scan pre-release)
Auditoria con ChatGPT recomendada: no
Bloquea avance a siguiente etapa: no
```
