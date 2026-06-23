#!/usr/bin/env node
/**
 * Fails the run if any test file under tests/ contains a focused test marker
 * (.only on it/describe/test). Jest 29 has no built-in forbidOnly flag, so this
 * guard runs as a pretest step to prevent shipping a focused suite that skips
 * the rest of the backend tests.
 *
 * No dependencies. Exits 1 with the offending files if any .only is found.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const testsDir = resolve(__dirname, '..', 'tests')

// Matches: it.only( / describe.only( / test.only(  (with optional whitespace)
const FOCUS_RE = /\b(?:it|describe|test)\.only\s*\(/

function listTestFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      listTestFiles(full, acc)
    } else if (entry.endsWith('.test.js')) {
      acc.push(full)
    }
  }
  return acc
}

const offenders = []
for (const file of listTestFiles(testsDir)) {
  const src = readFileSync(file, 'utf8')
  if (FOCUS_RE.test(src)) offenders.push(file)
}

if (offenders.length > 0) {
  console.error('\n[forbid-only] Focused tests detected (.only). Remove them before committing:')
  for (const f of offenders) console.error(`  - ${f}`)
  console.error('')
  process.exit(1)
}