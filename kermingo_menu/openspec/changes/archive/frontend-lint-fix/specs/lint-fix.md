# Spec: lint-fix (delta)

## ADDED Requirements

### REQ-LINT-001 — Lint command runs without crash
`pnpm lint` MUST exit with a controlled status code (0 = clean or warnings, 1 = errors) without throwing an unhandled exception. Specifically, it MUST NOT throw `TypeError: Converting circular structure to JSON`.

**Scenario**: Developer runs `pnpm lint`
- Given the project is at the state after this change is applied
- When the developer runs `pnpm lint`
- Then the command exits with code 0 (warnings allowed) or 1 (errors)
- And the output is either empty (clean) or shows lint findings (warnings/errors)
- And there is no `TypeError: Converting circular structure to JSON` in the output

### REQ-LINT-002 — Hand-rolled flat config
The ESLint config MUST be a hand-rolled flat config (`eslint.config.mjs`) that does NOT use `FlatCompat` and does NOT extend `next/core-web-vitals` (which is the source of the cycle bug). The config MUST use the `@next/eslint-plugin-next` plugin reference directly, bypassing the cycle-having `next.configs` object.

**Scenario**: Config is self-contained flat config
- Given this change is applied
- When the developer reads `eslint.config.mjs`
- Then there is no `import ... from "@eslint/eslintrc"` line
- And there is no `compat.extends("next/core-web-vitals")` call
- And the config is a pure array of flat config objects

### REQ-LINT-003 — Build still works
`pnpm build` MUST still pass after the lint toolchain change. The lint toolchain is independent of the build, but we want to confirm the install didn't break anything.

**Scenario**: Developer runs `pnpm build`
- Given this change is applied
- When the developer runs `pnpm build`
- Then the command exits 0
- And 14/14 static pages are generated

## MODIFIED Requirements
None.

## Type updates
None.

## Testing strategy
- **Pre-apply** (reproduce bug): `pnpm lint` should fail with `TypeError: Converting circular structure to JSON`. Confirmed.
- **Apply**: rewrite `eslint.config.mjs` and `package.json`. Run `pnpm install`. Run `pnpm lint`. Expect 0 errors (warnings allowed).
- **Post-apply smoke**:
  - `pnpm lint` exits 0 with 11 warnings (or fewer)
  - `pnpm build` exits 0
  - `pnpm dev` starts and serves `/admin/productos` with HTTP 200

## Out of scope
- Fixing the 11 lint warnings (separate change)
- Adding CI
- Restoring `eslint-plugin-react` (deferred)
