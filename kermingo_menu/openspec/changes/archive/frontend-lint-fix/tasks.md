# Tasks: lint-fix

> Single-PR implementation. Purely a dev-tooling fix.

## Phase 1 — Apply (revised after first attempt failed)
- [x] ~~T1. Edit `package.json`: change `"eslint": "^10.4.1"` to `"eslint": "^9.18.0"`.~~ **Failed**: bug persists in ESLint 9.x
- [ ] T2. **NEW**: rewrite `eslint.config.mjs` to use hand-rolled flat config (no FlatCompat, no `next/core-web-vitals`)
- [ ] T3. **NEW**: update `package.json` devDependencies:
  - Remove `eslint-config-next`, `@eslint/eslintrc`
  - Add `@eslint/js`, `typescript-eslint`, `@next/eslint-plugin-next`, `eslint-plugin-react-hooks`, `globals`
- [ ] T4. Run `pnpm install` to swap packages
- [ ] T5. Verify `pnpm list eslint --depth 0` shows 9.x

## Phase 2 — Verify
- [ ] T6. Run `pnpm lint`. Confirm:
  - No `TypeError: Converting circular structure to JSON`
  - Exits 0 (warnings allowed)
  - 11 warnings expected (mostly `set-state-in-effect`)
- [ ] T7. Run `pnpm build`. Confirm 14/14 static pages, 0 errors.
- [ ] T8. Confirm dev server still serves `/admin/productos` (HTTP 200)

## Phase 3 — Archive
- [ ] T9. Move `openspec/changes/frontend-lint-fix/` to `openspec/changes/archive/`
- [ ] T10. Copy `specs/lint-fix.md` to `openspec/specs/lint-fix/spec.md`
- [ ] T11. Write `ARCHIVED.md` with the change summary

## Traceability

| Spec scenario | Tasks |
|---|---|
| REQ-LINT-001 | T2, T4, T6 |
| REQ-LINT-002 | T2 |
| REQ-LINT-003 | T7 |
