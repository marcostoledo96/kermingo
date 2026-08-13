# Verify report: frontend-mock-mode-decommission-railway

Date: 2026-07-28

## Automated

| Check | Result |
|---|---|
| `pnpm exec vitest run test/mock-api.test.ts test/check-env.test.ts test/config.test.ts` | PASS |
| `NEXT_PUBLIC_MOCK_API=true pnpm build` | PASS (after `env -u NODE_ENV` fix in `package.json`) |
| Anonymized SQL present | PASS `backend/src/api/database/archives/2026-07-28-prod-anonymized.sql(.gz)` |
| Product images in `public/products/` | PASS (23 real images for ids 1–13 and 15–24; id 14 uses intentional fallback because no exact photo exists; ids 8 and 13 share chocotorta; id 24 partially represents pizza + soda) |

## Manual / ops (owner)

| Check | Result |
|---|---|
| Vercel env `NEXT_PUBLIC_MOCK_API=true` + redeploy | DONE (2026-07-28) — https://kermingo.vercel.app ; deployment `kermingo-8cu75mu3e-…` |
| Smoke producción landing/menú | DONE parcial — banner, menú/productos, tienda cerrada, admin login UI; login E2E password pendiente confirmación humana |
| Railway teardown + $0 | PENDING (requiere dashboard Marcos) |
| Dump RAW Railway → re-anonimizar si hay datos extra | OPCIONAL (archive seed+synthetic listo; ver HANDOFF-OPENCODE-MOCK-DEMO.md) |

## Verdict

**PASS WITH WARNINGS** — código + docs + archive + build mock + deploy Vercel listos. Queda **commit/push**, smoke login admin explícito, y teardown Railway.

## Notes

- Hay 23 imágenes reales para los IDs 1–13 y 15–24. El ID 14 usa fallback intencional porque no existe una foto exacta; los IDs 8 y 13 comparten la imagen de chocotorta; el ID 24 representa parcialmente pizza + gaseosa.
- Si Marcos aporta `kermingo-prod-RAW.sql`, correr `node backend/scripts/anonymize-dump.mjs` y reemplazar el archive.
- Handoff para OpenCode: `DOCUMENTACION/IA/HANDOFF-OPENCODE-MOCK-DEMO.md`.
