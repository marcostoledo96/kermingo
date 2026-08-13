# Tasks: frontend-mock-mode-decommission-railway

## 1. SDD artifacts
- [x] 1.1 exploration.md
- [x] 1.2 proposal.md / design.md / specs / tasks.md
- [x] 1.3 Persist proposal to Engram

## 2. Database archive
- [x] 2.1 Obtain baseline (schema+seed+synthetic; Railway RAW optional follow-up)
- [x] 2.2 Anonymize script + `archives/README.md`
- [x] 2.3 Commit-ready anonymized SQL (no PII)

## 3. Static images
- [x] 3.1 Inventory product images
- [x] 3.2 Placeholders into `frontend/public/products/{id}.png`
- [x] 3.3 Map fixture image URLs

## 4. Mock frontend
- [x] 4.1 `env-guard` + `.env.local.example` for `NEXT_PUBLIC_MOCK_API`
- [x] 4.2 `lib/mocks/fixtures.ts` + `adapter.ts`
- [x] 4.3 Wire `api.ts` + admin auth fetch paths
- [x] 4.4 Archival banner + closed store message
- [x] 4.5 Unit tests for mock mode

## 5. Documentation
- [x] 5.1 MODO-DEMO, REVIVIR-BACKEND, GUIA-FRONTEND
- [x] 5.2 Update DEPLOY, SECRETS, INDEX, README

## 6. Verify + teardown
- [x] 6.1 `pnpm build` with mock flag
- [ ] 6.2 Vercel env + redeploy smoke (owner / dashboard)
- [ ] 6.3 Railway teardown checklist (owner)
- [x] 6.4 verify-report.md
