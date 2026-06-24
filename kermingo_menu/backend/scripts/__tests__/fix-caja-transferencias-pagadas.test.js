/**
 * Tests for fix-caja-transferencias-pagadas.mjs
 *
 * Covers:
 *   - Arg parsing (imported from real script)
 *   - Apply guard (imported from real script)
 *   - --apply without env exits non-zero (spawn test)
 *   - SQL safety: no DROP/TRUNCATE/DELETE, WHERE scoped to caja transferencia
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseArgs, requireApplyGuard } from '../fix-caja-transferencias-pagadas.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCRIPT_PATH = path.resolve(__dirname, '..', 'fix-caja-transferencias-pagadas.mjs');

// ── Arg parsing (imported from real script) ──

describe('fix-caja-transferencias-pagadas arg parsing', () => {
  it('defaults to dry-run when no flags', () => {
    const result = parseArgs([]);
    expect(result.dryRun).toBe(true);
    expect(result.apply).toBe(false);
  });

  it('dry-run flag sets dryRun true', () => {
    const result = parseArgs(['--dry-run']);
    expect(result.dryRun).toBe(true);
    expect(result.apply).toBe(false);
  });

  it('apply flag sets apply true and dryRun false', () => {
    const result = parseArgs(['--apply']);
    expect(result.apply).toBe(true);
    expect(result.dryRun).toBe(false);
  });

  it('both flags: apply wins', () => {
    const result = parseArgs(['--dry-run', '--apply']);
    expect(result.apply).toBe(true);
    expect(result.dryRun).toBe(false);
  });
});

// ── Apply guard (imported from real script) ──

describe('fix-caja-transferencias-pagadas apply guard', () => {
  it('returns true when env is YES', () => {
    expect(requireApplyGuard('YES')).toBe(true);
  });

  it('returns false when env is missing', () => {
    expect(requireApplyGuard(undefined)).toBe(false);
  });

  it('returns false when env is wrong value', () => {
    expect(requireApplyGuard('no')).toBe(false);
    expect(requireApplyGuard('yes')).toBe(false);
  });
});

// ── --apply without env exits non-zero (spawn test) ──

describe('fix-caja-transferencias-pagadas --apply without env', () => {
  it('exits with code 1 when CONFIRM env is not set', () => {
    // Explicitly do NOT set CONFIRM_FIX_CAJA_TRANSFERENCIAS
    const env = { ...process.env };
    delete env.CONFIRM_FIX_CAJA_TRANSFERENCIAS;

    let exitCode;
    try {
      // node --input-type=module is not needed since .mjs is ESM by extension
      execFileSync('node', [SCRIPT_PATH, '--apply'], { env, timeout: 10000, stdio: 'pipe' });
      exitCode = 0;
    } catch (err) {
      exitCode = err.status;
    }
    expect(exitCode).toBe(1);
  });
});

// ── SQL safety: static analysis of script source ──

describe('fix-caja-transferencias-pagadas SQL safety', () => {
  let source;

  /** Strip JS comments so "No DROP" in docstrings does not match. */
  function stripComments(src) {
    // Remove block comments
    let out = src.replace(/\/\*[\s\S]*?\*\//g, '');
    // Remove line comments
    out = out.replace(/\/\/.*$/gm, '');
    return out;
  }

  beforeAll(() => {
    source = stripComments(fs.readFileSync(SCRIPT_PATH, 'utf-8'));
  });

  it('contains no DROP statements', () => {
    expect(/\bDROP\b/i.test(source)).toBe(false);
  });

  it('contains no TRUNCATE statements', () => {
    expect(/\bTRUNCATE\b/i.test(source)).toBe(false);
  });

  it('contains no DELETE statements', () => {
    expect(/\bDELETE\b/i.test(source)).toBe(false);
  });

  it('WHERE_CANDIDATES constant includes origen = \'caja\'', () => {
    // The script uses a WHERE_CANDIDATES template literal for all queries.
    // Verify the constant contains the required safety clauses.
    expect(source).toContain("origen = 'caja'");
  });

  it('WHERE_CANDIDATES constant includes metodo_pago = \'transferencia\'', () => {
    expect(source).toContain("metodo_pago = 'transferencia'");
  });

  it('WHERE_CANDIDATES constant includes estado_pago <> \'pagado\'', () => {
    expect(source).toMatch(/estado_pago\s*<>\s*'pagado'/);
  });
});