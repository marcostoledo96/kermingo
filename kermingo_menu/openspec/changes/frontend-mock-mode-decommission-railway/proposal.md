# Proposal: Frontend mock mode + Railway decommission

## Intent

Stop paying for Railway while keeping a permanent Vercel portfolio demo. Preserve an anonymized MySQL snapshot on GitHub and leave backend code in-repo (powered off) for future revival.

## Scope

### In Scope
- Client mock adapter (`NEXT_PUBLIC_MOCK_API`) with seed-based fixtures + simulated admin login
- Showcase UX: reads from fixtures; mutations no-op with clear demo feedback
- Archival banner + store `cerrada`
- Anonymized prod dump under `backend/src/api/database/archives/`
- Product images exported to `frontend/public/products/`
- Docs: demo mode, revive backend, frontend guide, DEPLOY/SECRETS updates
- Vercel env for mock mode; Railway teardown checklist

### Out of Scope
- MSW / Next Route Handler mock API
- Session-persistent in-memory mutations
- Hosted backend replacement
- Committing raw PII dumps or secrets
- Deleting backend source from the repo

## Capabilities

### New Capabilities
- `mock-api-mode`: Feature-flagged client mock for public + admin API/auth
- `archival-db-dump`: Sanitized SQL archive + restore policy for public git
- `demo-documentation`: Demo/revive/frontend-mod docs and decommission checklist

### Modified Capabilities
- None (delta-only behavior lives in new caps; existing API specs remain the live-backend contract)

## Approach

Client-side mock adapter in `frontend/lib/api.ts` plus auth raw-fetch sites. Fixtures from seed + synthetic pedidos. Images from `public/products/`. Anonymized mysqldump before Railway delete. Docs mark Railway decommissioned.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/lib/api.ts` | Modified | Mock intercept |
| `frontend/lib/mocks/` | New | Fixtures + adapter |
| `frontend/components/admin/*` | Modified | Simulated auth |
| `frontend/scripts/env-guard.mjs` | Modified | Allow mock build |
| `backend/.../archives/` | New | Anonymized dump |
| `DOCUMENTACION/IA/*` | Modified | Demo + revive docs |
| Vercel / Railway | Ops | Env + teardown |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| PII in public git | Med | Anonymize; never commit RAW |
| Fake checkout confusion | Med | Banner + closed store + no-op copy |
| Missing auth fetch paths | Med | Mock login/me/logout explicitly |
| Broken product images | High | Export to `public/` before Drive cut |
| Build gate fails | Med | `env-guard` accepts mock flag |

## Rollback Plan

Unset `NEXT_PUBLIC_MOCK_API`, restore `NEXT_PUBLIC_API_URL` to a live backend, redeploy. Backend code and schema/seed remain intact; anonymized archive stays optional.

## Dependencies

- Railway still reachable for dump + image export (before teardown)
- Vercel project with Root Directory `frontend`

## Success Criteria

- [ ] Vercel demo works with no Railway calls
- [ ] Demo login reaches admin; menu shows static images
- [ ] Anonymized archive documented and restorable locally
- [ ] Railway teardown checklist completed after verify
- [ ] SDD archived; `DOCUMENTACION/IA/` synced
