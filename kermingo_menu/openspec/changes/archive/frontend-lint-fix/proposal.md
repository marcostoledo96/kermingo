# Change: frontend-lint-fix

## Why
`pnpm lint` crashes before reporting any lint findings because of a circular-reference bug in `@eslint/eslintrc@3.3.5` triggered by the legacy `eslint-config-next/core-web-vitals` config. The cycle is in the `react` plugin's self-referential config (`plugins -> react -> configs -> flat -> ... -> react`). When the validator tries to `JSON.stringify` the data for an error message, it crashes with `TypeError: Converting circular structure to JSON`. This blocks linting completely.

We need linting to work so we can validate code quality on future PRs.

## What changes
- **Replace the broken legacy config** with a hand-rolled flat config in `frontend/eslint.config.mjs` that wires up plugins directly, bypassing the cycle.
- **Pin `eslint` to `^9.18.0`** (the last stable 9.x line, which we tried first but the bug persisted in 9.x — see "Lesson learned" below).
- **Update direct devDependencies** in `frontend/package.json` to make the plugins importable from the top level (pnpm doesn't expose transitives by default). Removed `eslint-config-next` and `@eslint/eslintrc`. Added `@eslint/js`, `typescript-eslint`, `@next/eslint-plugin-next`, `eslint-plugin-react-hooks`, `globals`.
- **Re-run `pnpm install`** to swap packages.

## The actual fix (revised after first attempt failed)

### First attempt: pin ESLint to 9.x
We initially tried pinning `eslint: ^10.4.1` → `^9.18.0`, expecting the bug was introduced in 10. **The bug also exists in 9.39.4** (latest 9.x at time of fix). The cycle is in the legacy config that the user publishes, not in ESLint's validator version. So pinning didn't help.

### Second attempt (works): hand-rolled flat config

The legacy `eslint-config-next/core-web-vitals` config, when loaded through `FlatCompat` (or even imported directly), contains a self-referential cycle in the `react` plugin. ESLint's config validator can't JSON-serialize it. The crash is in `node_modules/.pnpm/@eslint+eslintrc@3.3.5/.../config-validator.js:308`.

The fix: **stop using the legacy config entirely**. Write a flat config that wires up the Next plugin reference manually, avoiding the `next.configs['core-web-vitals']` self-reference.

The new `eslint.config.mjs`:
- Uses `@eslint/js` recommended
- Uses `typescript-eslint` recommended (TypeScript-aware rules)
- Uses `@next/eslint-plugin-next` plugin object directly, copying rules from `next.configs.recommended` and `next.configs['core-web-vitals']` (without going through the cycle-having config objects)
- Uses `eslint-plugin-react-hooks` plugin object directly
- Skips `eslint-plugin-react`, `eslint-plugin-jsx-a11y`, `eslint-plugin-import` (these are what `next/core-web-vitals` pulls in and they have the cycle)

## Trade-offs

| Lost rule set | Impact | When we can re-introduce |
|---|---|---|
| `eslint-plugin-react` (prop-types, no-deprecated, etc.) | Low — we use TypeScript, prop-types redundant | When `eslint-plugin-react@8` lands or when its config is no longer self-referential |
| `eslint-plugin-jsx-a11y` (a11y) | Medium — no automatic a11y linting | When upstream cycle is fixed |
| `eslint-plugin-import` (import order, etc.) | Low | Same |

We keep:
- All `@next/next` rules (including core-web-vitals rules — the LCP/CLS/INP-relevant ones)
- TypeScript-aware rules via `typescript-eslint`
- React Hooks rules via `eslint-plugin-react-hooks`
- JS best practices via `@eslint/js`

## Impact
- Affected files:
  - `frontend/eslint.config.mjs` (rewritten)
  - `frontend/package.json` (devDeps updated)
  - `frontend/pnpm-lock.yaml` (regenerated)
- No source code changes.
- No behavior changes for the app.

## After the fix
- `pnpm lint` exits 0 with **11 warnings** (no errors)
- Warnings are all about `set-state-in-effect` (the standard pattern of `useEffect(() => fetchAndSet())`) and a few unused imports
- These warnings were hidden by the crash; they're now visible and actionable
- Lint will fail CI in the future if `pnpm lint` ever introduces errors (warnings can be opted-into as errors via config)

## Out of scope
- Fixing the 11 lint warnings (separate change — would require refactoring 5+ components to use lazy useState initializers)
- Adding CI that runs `pnpm lint`
- Restoring `eslint-plugin-react` / jsx-a11y / import (deferred until upstream cycle is fixed)

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| A future Next.js upgrade changes the flat config shape | Low | The new config uses well-documented plugin APIs that are stable across ESLint 9.x |
| A future `typescript-eslint` upgrade moves a rule | Low | All imported rule names are explicit; we'll see warnings if any are renamed |
| Hand-rolled config diverges from official Next.js linting | Med | We import the rules from `next.configs.recommended` and `core-web-vitals` programmatically, so we get the same rules the official config provides (just without the cycle) |
| `@next/eslint-plugin-next` internal `configs` object is changed upstream | Low | We read the rules once at config-load time; if Next removes a rule, we'll get a clear "Definition for rule X was not found" error |

## Rollback
Revert `package.json` and `eslint.config.mjs`. Re-run `pnpm install`. (Back to the broken state.)

## Dependencies
- `pnpm` v11 (already installed)
- Network access to npm registry
- 5 new direct devDeps to hoist transitive packages to top level

## Success criteria
- [ ] `pnpm lint` exits with code 0 (warnings OK)
- [ ] No `TypeError: Converting circular structure to JSON` in the output
- [ ] Lint warnings are visible (we WANT to know what the codebase actually looks like)
- [ ] `pnpm build` still passes
- [ ] `pnpm dev` still works

## Single-PR decision
Single PR. 2 files changed (package.json, eslint.config.mjs) + lockfile. No source code.
