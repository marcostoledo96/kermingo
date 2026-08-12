#!/usr/bin/env node
/**
 * Anonymize a mysqldump for public git.
 * Usage: node anonymize-dump.mjs <input.sql> <output.sql>
 *
 * - Replaces INSERT values for pedido PII columns when detectable in extended inserts
 * - Forces admin hash to the known seed bcrypt for admin123
 * - Nulls Drive URLs / replaces drive_id with synthetic ids
 *
 * Always review the output before committing. Prefer regenerating from a trusted
 * RAW kept outside the repo.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const DEMO_HASH =
  '$2b$10$NJeTubdE9ncZRJoVj373ZOsT2ubw9hpCMmDDhceBV.O2ZdfhtX23e'

const [,, inPath, outPath] = process.argv
if (!inPath || !outPath) {
  console.error('Usage: node anonymize-dump.mjs <input.sql> <output.sql>')
  process.exit(1)
}

let sql = readFileSync(resolve(inPath), 'utf8')

// Strip DEFINER clauses that break restores on shared hosts
sql = sql.replace(/DEFINER=`[^`]+`@`[^`]+`/g, '')

// Replace any bcrypt-looking hashes in usuario inserts with demo hash
sql = sql.replace(/\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/g, DEMO_HASH)

// Soft scrub: quoted phone-like and long hex tokens in INSERT lines for pedido
sql = sql.replace(
  /(INSERT INTO `?pedido`?[\s\S]*?;)/gi,
  (block) => {
    let i = 0
    return block
      .replace(/'(\+?54)?1[1-9]\d{8,10}'/g, () => {
        i += 1
        return `'119900${String(1000 + i).slice(-4)}'`
      })
      .replace(/'[0-9a-f]{32,64}'/gi, () => {
        i += 1
        const hex = `demo${String(i).padStart(4, '0')}${'a'.repeat(28)}`
        return `'${hex.slice(0, 32)}'`
      })
  },
)

// Null public Drive URLs
sql = sql.replace(/url_publica`?,\s*'https?:\/\/[^']*'/gi, "url_publica`, NULL")
sql = sql.replace(/'https:\/\/drive\.google\.com[^']*'/gi, 'NULL')

// Synthetic drive ids
let driveSeq = 0
sql = sql.replace(
  /(INSERT INTO `?archivo_drive`?[\s\S]*?;)/gi,
  (block) =>
    block.replace(/'([A-Za-z0-9_-]{20,})'/g, (m, id) => {
      if (id.startsWith('demo-drive-')) return m
      driveSeq += 1
      return `'demo-drive-${driveSeq}'`
    }),
)

const header = `-- Anonymized dump generated ${new Date().toISOString()}
-- DO NOT use as a source of real PII. Review before committing.
-- Source: ${inPath}

`

writeFileSync(resolve(outPath), header + sql, 'utf8')
console.log(`Wrote ${outPath} (${sql.length} bytes body)`)
