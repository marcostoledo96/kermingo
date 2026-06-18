# Archived: frontend-lint-fix

**Date:** 2026-06-14
**Status:** ARCHIVED — verdict PASS

## Summary
- Created: `openspec/specs/lint-fix/spec.md` (durable capability for the new flat config)
- Replaced broken `next/core-web-vitals` legacy config with hand-rolled flat config
- Pinned ESLint to 9.18.0 (floor; actual install is 9.39.4)
- 2 frontend files modified, lockfile regenerated
- `pnpm lint` now works: 0 errors, 11 warnings (all real `set-state-in-effect` and unused-var findings that were hidden by the crash)
- `pnpm build` 14/14 static pages, 0 errors
- Dev server: HTTP 200

## Bug found and fixed
The previous-session fix ("pin to ESLint 9.x") was wrong: the cycle bug exists in 9.x too. The real fix is to bypass the legacy config entirely.

## Trade-offs
- Lost: `eslint-plugin-react`, `eslint-plugin-jsx-a11y`, `eslint-plugin-import` rule sets
- Kept: `@next/next` (including core-web-vitals), `typescript-eslint`, `react-hooks`, `@eslint/js`

## Out of Scope (next changes)
- Fix the 11 `set-state-in-effect` warnings (separate refactor: use lazy useState initializers in 5+ components)
- Add CI that runs `pnpm lint`
- Restore `eslint-plugin-react` / `jsx-a11y` / `import` when upstream cycle is fixed
