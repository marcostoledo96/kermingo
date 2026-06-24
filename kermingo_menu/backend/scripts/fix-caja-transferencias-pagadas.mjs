#!/usr/bin/env node

/**
 * fix-caja-transferencias-pagadas.mjs
 *
 * Correction script: sets estado_pago='pagado' for all caja transferencia
 * orders that are not already pagado. Runs in a transaction with dry-run
 * default.
 *
 * Usage:
 *   node scripts/fix-caja-transferencias-pagadas.mjs                # dry-run (default)
 *   node scripts/fix-caja-transferencias-pagadas.mjs --apply         # apply (requires CONFIRM_FIX_CAJA_TRANSFERENCIAS=YES)
 *
 * Safety:
 *   - Default is --dry-run: reports candidates without modifying data.
 *   - --apply requires CONFIRM_FIX_CAJA_TRANSFERENCIAS=YES env var.
 *   - Uses a single transaction; rolls back on any error.
 *   - No DROP, TRUNCATE, DELETE, or seed reset.
 *   - Only touches: estado_pago on rows matching
 *     origen='caja' AND metodo_pago='transferencia' AND estado_pago <> 'pagado'.
 *   - Does NOT modify estado_pedido, stock, pedido_detalle, or products.
 *   - Dry-run output: candidate count + IDs only. No PII (no nombre_cliente,
 *     total, estado_pedido, phone, mesa, created_at).
 *
 * BACKUP REQUERIDO ANTES DE PRODUCCIÓN:
 *   mysqldump --single-transaction -u USER -p DATABASE > backup_before_fix.sql
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { pathToFileURL } from 'url';

dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'kermingo';

const APPLY_FLAG = '--apply';
const DRY_RUN_FLAG = '--dry-run';
const CONFIRM_ENV = 'CONFIRM_FIX_CAJA_TRANSFERENCIAS';

/** WHERE clause used to scope every query in this script. */
const WHERE_CANDIDATES = "origen = 'caja' AND metodo_pago = 'transferencia' AND estado_pago <> 'pagado'";

export function parseArgs(args) {
  const apply = args.includes(APPLY_FLAG);
  return {
    apply,
    dryRun: !apply,
  };
}

/** Exit non-zero if --apply is used without the required env guard. */
export function requireApplyGuard(envValue) {
  return envValue === 'YES';
}

async function main() {
  const { apply, dryRun } = parseArgs(process.argv.slice(2));

  if (apply) {
    if (!requireApplyGuard(process.env[CONFIRM_ENV])) {
      console.error(`\n⚠️  --apply requires ${CONFIRM_ENV}=YES environment variable.`);
      console.error(`   Example: ${CONFIRM_ENV}=YES node scripts/fix-caja-transferencias-pagadas.mjs --apply\n`);
      process.exit(1);
    }
  }

  const pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 1,
  });

  try {
    const conn = await pool.getConnection();

    try {
      if (dryRun) {
        console.log('=== DRY RUN (no changes will be made) ===\n');

        const [candidates] = await conn.query(
          `SELECT id, numero FROM pedido WHERE ${WHERE_CANDIDATES} ORDER BY id`
        );

        console.log(`Candidate rows: ${candidates.length}`);

        if (candidates.length > 0) {
          const ids = candidates.map((r) => `${r.id} (${r.numero})`).join(', ');
          console.log(`IDs: ${ids}`);
        }

        console.log('\n=== BACKUP REQUERIDO ANTES DE PRODUCCIÓN ===');
        console.log('mysqldump --single-transaction -u USER -p DATABASE > backup_before_fix.sql\n');
        console.log(`To apply: ${CONFIRM_ENV}=YES node scripts/fix-caja-transferencias-pagadas.mjs --apply\n`);
      } else {
        console.log('=== APPLY MODE ===\n');

        // BACKUP WARNING
        console.log('⚠️  BACKUP REQUERIDO ANTES DE PRODUCCIÓN');
        console.log('   mysqldump --single-transaction -u USER -p DATABASE > backup_before_fix.sql\n');

        await conn.beginTransaction();

        // Lock candidate rows for update
        const [candidates] = await conn.query(
          `SELECT id FROM pedido WHERE ${WHERE_CANDIDATES} ORDER BY id FOR UPDATE`
        );

        console.log(`Candidate rows: ${candidates.length}\n`);

        if (candidates.length === 0) {
          await conn.rollback();
          console.log('No rows to update. Transaction rolled back (no-op).\n');
          return;
        }

        const [result] = await conn.query(
          `UPDATE pedido SET estado_pago = 'pagado' WHERE ${WHERE_CANDIDATES}`
        );

        await conn.commit();

        console.log(`Updated rows: ${result.affectedRows}\n`);

        // Verify: re-read to confirm
        const [remaining] = await conn.query(
          `SELECT COUNT(*) as count FROM pedido WHERE ${WHERE_CANDIDATES}`
        );
        console.log(`Remaining non-pagado caja transferencia rows: ${remaining[0].count}\n`);

        console.log('✅ Transaction committed successfully.\n');
      }
    } finally {
      conn.release();
    }
  } finally {
    await pool.end();
  }
}

// Only run main when executed directly, not when imported for testing
const IS_MAIN = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (IS_MAIN) {
  main().catch((err) => {
    console.error('Script failed:', err.message);
    process.exit(1);
  });
}