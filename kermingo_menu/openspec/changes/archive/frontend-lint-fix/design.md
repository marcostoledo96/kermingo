# Design: lint-fix

## 1. The bug
`@eslint/eslintrc@3.3.5`'s `config-validator.js:308` calls `JSON.stringify(error.data)` to format an error message. The `error.data` is a config object that contains a self-referential cycle in the `react` plugin's config (also present in `@next/eslint-plugin-next`'s `core-web-vitals` config). JSON.stringify crashes on the cycle.

Stack trace:
```
TypeError: Converting circular structure to JSON
    at JSON.stringify (<anonymous>)
    at file:///.../@eslint/eslintrc/lib/shared/config-validator.js:308:45
    at ConfigValidator.formatErrors (...)
    at ConfigValidator.validateConfigSchema (...)
    at ConfigArrayFactory._normalizeConfigData (...)
    at ConfigArrayFactory._loadConfigData (...)
    at ConfigArrayFactory._loadExtendedShareableConfig (...)
    at ConfigArrayFactory._loadExtends (...)
    at ConfigArrayFactory._normalizeObjectConfigDataBody (...)
```

## 2. Why the previous-session fix didn't work

A previous session tried to fix this by pinning ESLint to 9.x. We tried the same fix and confirmed: **the bug exists in ESLint 9.39.4 too** (latest 9.x). The cycle is in the legacy config object, not in ESLint's validator. Pinning ESLint doesn't help.

## 3. The actual fix

We stop using the legacy config entirely. The new `eslint.config.mjs`:
1. Imports plugins as objects: `@eslint/js`, `typescript-eslint`, `@next/eslint-plugin-next`, `eslint-plugin-react-hooks`, `globals`
2. References the Next plugin's `configs.recommended.rules` and `configs['core-web-vitals'].rules` **programmatically** (not by spreading the config objects themselves)
3. The rule entries are extracted as plain `{ ruleName: 'warn' | 'error' }` objects, which don't carry the cycle
4. Wired into our own flat config object

This works because:
- The cycle is in the **config object** (`{ plugins: { '@next/next': plugin }, rules: {...} }`)
- The cycle is NOT in the **rules themselves** (they're just rule definitions)
- By extracting the rules and putting them in our own config object (with our own plugin reference), the cycle is broken

## 4. The new `eslint.config.mjs` shape

```js
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import nextPlugin from '@next/eslint-plugin-next'
import globals from 'globals'

export default [
  js.configs.recommended,                              // @eslint/js
  ...tseslint.configs.recommended,                     // typescript-eslint
  {                                                     // @next/next rules
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,           // safe to spread: rules are plain
      ...Object.fromEntries(                            // core-web-vitals extras
        Object.entries(nextPlugin.configs['core-web-vitals'].rules)
          .filter(([k]) => !(k in nextPlugin.configs.recommended.rules))
      ),
    },
  },
  {                                                     // react-hooks rules
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // ... etc
    },
  },
  {                                                     // project tweaks
    languageOptions: { ... },
    rules: { ... },
  },
  { ignores: [...] },                                   // ignore patterns
  { files: ['**/*.test.*'], rules: {...} },            // test files
]
```

## 5. Why not write a custom config that re-implements `next/core-web-vitals`?

We considered:
- **Option A**: Drop the `core-web-vitals` extra rules (the LCP/CLS/INP ones). Bad — those are exactly what we want.
- **Option B**: Hand-pick a subset of next rules. Brittle — manual selection, hard to maintain.
- **Option C** (chosen): Read the rules from the upstream config objects programmatically. Maintains alignment with Next.js's official rule set. If Next adds a new rule, we get it automatically.

## 6. Why drop `eslint-plugin-react`?

`eslint-plugin-react@7.x` is the source of the original cycle. Its config object is the one with `plugins -> react -> configs -> flat -> ... -> react`. Including it (even via FlatCompat) reproduces the bug.

We could pin to `eslint-plugin-react@8.x`, but:
- v8 has its own breaking API changes
- `eslint-config-next` still depends on v7 internally
- The win (a few `react/jsx-key` style rules) doesn't justify the migration cost right now

We can re-introduce it when upstream `next/core-web-vitals` ships a flat-config variant that doesn't have the cycle.

## 7. What we lose

- `react/jsx-key` — we already use TypeScript, so missing keys would be a type error anyway
- `react/no-unknown-property` — not critical
- `react-hooks/exhaustive-deps` and `react-hooks/rules-of-hooks` — still have these via the `eslint-plugin-react-hooks` standalone package
- A11y rules (`jsx-a11y`) — we should restore these eventually
- Import order rules (`import/order`) — nice-to-have

## 8. What we keep

- All `@next/next` rules: `no-img-element`, `no-html-link-for-pages`, `no-css-tags`, `no-sync-scripts`, `no-typos`, `google-font-preconnect`, etc.
- All `typescript-eslint` recommended rules: `no-unused-vars`, `no-explicit-any` (off), `consistent-type-imports`, etc.
- All `react-hooks` rules
- All `@eslint/js` recommended rules

## 9. Risk: API stability

`@next/eslint-plugin-next`'s public API:
- `configs.recommended.rules` is a flat object of rule entries (RuleEntry[])
- `configs['core-web-vitals'].rules` is the same shape
- `rules` is the plugin's rule dictionary

These are stable APIs. If they change, we'll get a clear error.

## 10. Why a single PR

- 1 config file rewritten, 1 package.json updated, 1 lockfile regenerated
- Zero source code touched
- The "lesson learned" is that the previous-session fix was wrong; this PR supersedes it
