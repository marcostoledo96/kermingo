# Proposal: frontend-ticket-qr

## Intent

Replace the decorative `FauxQR` in `/confirmado` with a real, scannable QR code so customers and kitchen staff can quickly open the order tracking page. The backend already generates `token_seguimiento` and exposes `GET /api/pedidos/seguimiento/:token`; we only need to render a scannable QR on the frontend.

## Scope

### In Scope
- Install a client-side QR library (e.g., `qrcode.react` or `qrcode`) in the frontend.
- Render a real QR in `TicketScreen` (`/confirmado`) encoding the tracking URL with the order’s `token_seguimiento`.
- Ensure the QR prints correctly via `window.print()` / jsPDF ticket flow.
- Guard against hydration mismatch (QR is client-only).

### Out of Scope
- No backend changes; token generation and `GET /api/pedidos/seguimiento/:token` already exist.
- No new admin scan endpoint; staff can scan the same public URL.
- No redesign of the ticket layout beyond swapping the QR area.

## Capabilities

### New Capabilities
- `frontend-ticket-qr`: QR generation and display on the confirmed ticket screen. Covers library choice, URL format (`/seguimiento?token=<token>` or `?t=<token>`), printability, and hydration safety.

### Modified Capabilities
- None. Backend order creation (`etapa-5-pedidos`) and tracking endpoint behavior remain unchanged.

## Approach

1. Add `qrcode.react` (or `qrcode` with a small wrapper) to `frontend/package.json`.
2. In `TicketScreen`, replace `<FauxQR seed={order.numero} />` with a `<QRCodeSVG>` (or equivalent) whose value is `${window.location.origin}/seguimiento?token=${order.token}`.
3. Keep the existing tracking link button below the ticket.
4. Use `typeof window !== 'undefined'` or dynamic import to avoid SSR hydration issues.
5. Verify `pnpm build` and `pnpm lint` pass.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/components/menu/ticket-screen.tsx` | Modified | Swap `FauxQR` for real QR component |
| `frontend/package.json` | Modified | Add QR library dependency |
| `frontend/app/confirmado/page.tsx` | None | No change (metadata stays) |
| `frontend/components/menu/tracking-screen.tsx` | Optional | May also show QR if token is known |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| SSR hydration mismatch | Med | Render QR only on client; dynamic import or `useEffect` guard |
| Library not React 19 ready | Low | Pick `qrcode.react` (widely used) or `qrcode` with wrapper |
| Print output too small/blurry | Med | Test `window.print()` at 168 px; use SVG renderer |
| Absolute URL wrong in previews | Low | Build from `window.location.origin` at runtime |

## Rollback Plan

1. Revert the commit(s) touching `ticket-screen.tsx` and `package.json`.
2. Run `pnpm install` to remove the added dependency.
3. Restore the previous `FauxQR` implementation from git history.

## Dependencies

- `qrcode.react` (or equivalent) — must be compatible with Next.js 16 and React 19.

## Success Criteria

- [ ] QR on `/confirmado` scans successfully to `/seguimiento?token=<token>`.
- [ ] `pnpm build` passes with no new warnings.
- [ ] `pnpm lint` passes.
- [ ] Printed ticket includes a readable QR.
- [ ] No hydration errors in browser console.
