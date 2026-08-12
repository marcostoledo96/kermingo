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

function splitSql(source, delimiter) {
  const parts = []
  let start = 0
  let quote = false
  let depth = 0

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]
    if (quote) {
      if (char === '\\') i += 1
      else if (char === "'" && source[i + 1] === "'") i += 1
      else if (char === "'") quote = false
      continue
    }
    if (char === "'") quote = true
    else if (char === '(') depth += 1
    else if (char === ')') depth -= 1
    else if (char === delimiter && depth === 0) {
      parts.push(source.slice(start, i).trim())
      start = i + 1
    }
    if (depth < 0) throw new Error('Malformed SQL: unmatched parenthesis')
  }
  if (quote || depth !== 0) throw new Error('Malformed SQL: unterminated quoted value or tuple')
  parts.push(source.slice(start).trim())
  return parts
}

function anonymizePedidoInsert(statement, firstSequence) {
  const parsed = statement.match(
    /^(INSERT\s+INTO\s+`?pedido`?\s*)\(([^)]*)\)(\s+VALUES\s*)([\s\S]+)$/i,
  )
  if (!parsed) {
    throw new Error('Unsafe pedido INSERT: explicit columns and plain VALUES are required')
  }

  const columns = splitSql(parsed[2], ',').map((column) =>
    column.replaceAll('`', '').trim().toLowerCase())
  const rows = splitSql(parsed[4], ',')
  let sequence = firstSequence
  const scrubbedRows = rows.map((row) => {
    if (!row.startsWith('(') || !row.endsWith(')')) {
      throw new Error('Unsafe pedido INSERT: only VALUES tuples are supported')
    }
    const values = splitSql(row.slice(1, -1), ',')
    if (values.length !== columns.length) {
      throw new Error('Unsafe pedido INSERT: column/value count mismatch')
    }

    sequence += 1
    const suffix = String(1000 + sequence).slice(-4)
    const replacements = {
      nombre_cliente: `'Cliente Demo ${sequence}'`,
      telefono_cliente: `'119900${suffix}'`,
      telefono_whatsapp: `'549119900${suffix}'`,
      mesa: 'NULL',
      token_seguimiento: `'${sequence.toString(16).padStart(32, '0')}'`,
    }
    for (const [column, replacement] of Object.entries(replacements)) {
      const index = columns.indexOf(column)
      if (index >= 0) values[index] = replacement
    }
    const observaciones = columns.indexOf('observaciones')
    if (observaciones >= 0 && values[observaciones].toUpperCase() !== 'NULL') {
      values[observaciones] = `'Observacion demo ${sequence}'`
    }
    return `(${values.join(',')})`
  })

  return {
    sql: `${parsed[1]}(${parsed[2]})${parsed[3]}${scrubbedRows.join(',\n')}`,
    sequence,
  }
}

let pedidoSequence = 0
const pedidoInsertCount = sql.match(/\bINTO\s+`?pedido`?\b/gi)?.length ?? 0
let parsedPedidoInsertCount = 0
const statements = splitSql(sql, ';')
sql = statements.map((statement) => {
  const prefix = statement.match(/^(?:(?:\s+)|(?:--[^\n]*(?:\n|$))|(?:#[^\n]*(?:\n|$))|(?:\/\*[\s\S]*?\*\/))*/)?.[0] ?? ''
  const executable = statement.slice(prefix.length)
  if (!/^INSERT\b[\s\S]*?\bINTO\s+`?pedido`?\b/i.test(executable)) return statement
  const result = anonymizePedidoInsert(executable, pedidoSequence)
  parsedPedidoInsertCount += 1
  pedidoSequence = result.sequence
  return prefix + result.sql
}).join(';')
if (parsedPedidoInsertCount !== pedidoInsertCount) {
  throw new Error('Unsafe pedido INSERT: not every statement could be parsed')
}

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
