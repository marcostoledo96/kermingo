// Kermingo ESLint config — flat config (no `FlatCompat`, no legacy cycles).
//
// Why a hand-rolled config instead of `next/core-web-vitals`?
// The legacy `eslint-config-next/core-web-vitals` config, when loaded via
// `FlatCompat` (or even when imported directly), causes a circular-reference
// crash inside `@eslint/eslintrc@3.3.5`'s config validator (TypeError:
// Converting circular structure to JSON). The cycle is in the `react`
// plugin's legacy config (`plugins -> react -> configs -> flat -> ...`).
//
// We use the flat configs published by the relevant plugins directly, but
// avoid the self-referential `next.configs['core-web-vitals']` (which has
// the same cycle). Instead we wire up the Next plugin reference and its
// rules manually.
//
// Trade-offs:
//   - We lose a few legacy rule sets (eslint-plugin-react, jsx-a11y, import)
//   - We keep: typescript-eslint, react-hooks, @next/next rules, @eslint/js
//   - When upstream fixes the cycle (eslint-plugin-react@8 or a flat variant
//     of next/core-web-vitals), we can re-introduce them.

import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import nextPlugin from '@next/eslint-plugin-next'
import globals from 'globals'

/** @type {import('eslint').Linter.Config[]} */
export default [
  // 1. Base JS recommended
  js.configs.recommended,

  // 2. TypeScript-aware rules
  ...tseslint.configs.recommended,

  // 3. Next.js rules — wired manually to avoid the cycle in `next.configs`
  {
    name: 'next',
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      // From `next.configs.recommended`
      ...Object.fromEntries(
        Object.entries(nextPlugin.configs.recommended.rules).map(([k, v]) => [
          k,
          /** @type {import('eslint').Linter.RuleEntry} */ (v),
        ]),
      ),
      // Extra rules from `next.configs['core-web-vitals']` (not in `recommended`)
      // These flag issues that hurt Core Web Vitals (LCP, CLS, INP).
      ...Object.fromEntries(
        Object.entries(nextPlugin.configs['core-web-vitals'].rules)
          .filter(([k]) => !(k in nextPlugin.configs.recommended.rules))
          .map(([k, v]) => [
            k,
            /** @type {import('eslint').Linter.RuleEntry} */ (v),
          ]),
      ),
    },
  },

  // 4. React Hooks rules
  {
    name: 'react-hooks',
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/static-components': 'error',
      'react-hooks/use-memo': 'error',
      'react-hooks/preserve-manual-memoization': 'error',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },

  // 5. Project-level tweaks
  {
    name: 'kermingo-tweaks',
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        React: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@next/next/no-img-element': 'warn',
    },
  },

  // 6. Ignore patterns
  {
    name: 'ignores',
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'next.config.mjs',
      'tailwind.config.ts',
      'postcss.config.mjs',
      'diseno-de-landing-kermingo/**',
    ],
  },

  // 7. Test files: relax some rules
  {
    name: 'tests',
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/tests/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]
