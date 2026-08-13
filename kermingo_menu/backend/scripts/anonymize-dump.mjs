#!/usr/bin/env node
/**
 * Anonymize a mysqldump for public git.
 * Usage: node anonymize-dump.mjs <input.sql> <output.sql>
 *
 * - Replaces sensitive INSERT values by explicit table/column policy
 * - Rejects unsupported sensitive REPLACE mutations before writing output
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

function scanSql(source, delimiter, trackParentheses = true) {
  const parts = []
  let start = 0
  let state = 'normal'
  let depth = 0

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]

    if (state === 'line-comment') {
      if (char === '\n' || char === '\r') state = 'normal'
      continue
    }
    if (state === 'block-comment') {
      if (char === '/' && source[i + 1] === '*') throw new Error('Malformed SQL: nested block comment')
      if (char === '*' && source[i + 1] === '/') {
        state = 'normal'
        i += 1
      }
      continue
    }
    if (state !== 'normal') {
      const quote = state === 'single-quote' ? "'" : state === 'double-quote' ? '"' : '`'
      if (char === '\\') i += 1
      else if (char === quote && source[i + 1] === quote) i += 1
      else if (char === quote) state = 'normal'
      continue
    }

    if (char === "'") state = 'single-quote'
    else if (char === '"') state = 'double-quote'
    else if (char === '`') state = 'backtick'
    else if (char === '#') state = 'line-comment'
    else if (char === '-' && source[i + 1] === '-' && /[\x00-\x20]/.test(source[i + 2] ?? '')) {
      state = 'line-comment'
      i += 1
    } else if (char === '/' && source[i + 1] === '*') {
      state = 'block-comment'
      i += 1
    } else if (trackParentheses && char === '(') depth += 1
    else if (trackParentheses && char === ')') depth -= 1
    else if (char === delimiter && (!trackParentheses || depth === 0)) {
      parts.push(source.slice(start, i).trim())
      start = i + 1
    }
    if (depth < 0) throw new Error('Malformed SQL: unmatched parenthesis')
  }
  if (state !== 'normal' && state !== 'line-comment') throw new Error('Malformed SQL: unterminated quote or comment')
  if (depth !== 0) throw new Error('Malformed SQL: unterminated tuple')
  parts.push(source.slice(start).trim())
  return parts
}

function leadingComments(statement) {
  let end = 0
  while (end < statement.length) {
    const whitespace = statement.slice(end).match(/^\s+/)?.[0]
    if (whitespace) {
      end += whitespace.length
      continue
    }
    if (statement[end] === '#' || (statement.startsWith('--', end) && /[\x00-\x20]/.test(statement[end + 2] ?? ''))) {
      const newline = statement.slice(end).search(/[\r\n]/)
      end = newline === -1 ? statement.length : end + newline + 1
      continue
    }
    if (statement.startsWith('/*', end) && !statement.startsWith('/*!', end)) {
      const close = statement.indexOf('*/', end + 2)
      if (close === -1) throw new Error('Malformed SQL: unterminated block comment')
      end = close + 2
      continue
    }
    break
  }
  return statement.slice(0, end)
}

const SENSITIVE_TABLES = {
  pedido: {
    required: [
      'nombre_cliente',
      'telefono_cliente',
      'telefono_whatsapp',
      'mesa',
      'token_seguimiento',
      'observaciones',
    ],
    replacements: (sequence, values, columns) => ({
      nombre_cliente: `'Cliente Demo ${sequence}'`,
      telefono_cliente: `'119900${String(1000 + sequence).slice(-4)}'`,
      telefono_whatsapp: `'549119900${String(1000 + sequence).slice(-4)}'`,
      mesa: 'NULL',
      token_seguimiento: `'${sequence.toString(16).padStart(32, '0')}'`,
      observaciones: values[columns.indexOf('observaciones')].toUpperCase() === 'NULL'
        ? 'NULL'
        : `'Observacion demo ${sequence}'`,
    }),
  },
  usuario: {
    required: ['nombre', 'email', 'contrasenia_hash'],
    replacements: (sequence) => ({
      nombre: `'Usuario Demo ${sequence}'`,
      email: `'usuario${sequence}@example.invalid'`,
      contrasenia_hash: `'${DEMO_HASH}'`,
    }),
  },
  archivo_drive: {
    required: ['nombre_original', 'drive_id', 'url_publica'],
    replacements: (sequence, values, columns) => {
      const original = values[columns.indexOf('nombre_original')]
      const extension = original.match(/\.([a-z0-9]+)'$/i)?.[1]?.toLowerCase()
      return {
        nombre_original: `'archivo-demo-${sequence}${extension ? `.${extension}` : ''}'`,
        drive_id: `'demo-drive-${sequence}'`,
        url_publica: 'NULL',
      }
    },
  },
}

const QUOTED_IDENTIFIER = '`(?:``|[^`])+`'
const UNQUOTED_IDENTIFIER = '(?:[a-zA-Z_$\u0080-\uFFFF][a-zA-Z0-9_$\u0080-\uFFFF]*|[0-9]+[a-zA-Z_$\u0080-\uFFFF][a-zA-Z0-9_$\u0080-\uFFFF]*)'
const IDENTIFIER = `(?:${QUOTED_IDENTIFIER}|${UNQUOTED_IDENTIFIER})`
const INSERT_TARGET = new RegExp(
  `^INSERT\\b(?<modifiers>(?:\\s+[a-zA-Z_]+)*)\\s+INTO\\s+(?:(?<schema>${IDENTIFIER})\\s*\\.\\s*)?(?<table>${IDENTIFIER})(?=\\s|\\()`,
  'i',
)
const REPLACE_TARGET = new RegExp(
  `^REPLACE\\b(?<modifiers>(?:\\s+(?:LOW_PRIORITY|DELAYED))*)\\s*(?:INTO\\s+)?(?:(?<schema>${IDENTIFIER})\\s*\\.\\s*)?(?<table>${IDENTIFIER})(?=\\s|\\()`,
  'i',
)

function maskComments(statement, includeExecutable = false) {
  const blockComment = includeExecutable ? '\\/\\*[\\s\\S]*?\\*\\/' : '\\/\\*(?!\\!)[\\s\\S]*?\\*\\/'
  return statement.replace(
    new RegExp(`${blockComment}|#[^\\r\\n]*|--(?=[\\x00-\\x20])[^\\r\\n]*`, 'g'),
    (comment) => comment.replace(/[^\r\n]/g, ' '),
  )
}

function sensitiveInsertTarget(statement) {
  let match = maskComments(statement).match(INSERT_TARGET)
  if (!match && statement.includes('/*!')) {
    const executableMatch = maskComments(statement, true).match(INSERT_TARGET)
    if (executableMatch) {
      const table = executableMatch.groups.table.replaceAll('`', '').toLowerCase()
      if (Object.hasOwn(SENSITIVE_TABLES, table)) {
        throw new Error('Unsafe executable comment: sensitive INSERT is not supported')
      }
    }
  }
  if (!match) return null
  const table = match.groups.table.startsWith('`')
    ? match.groups.table.slice(1, -1).replaceAll('``', '`').toLowerCase()
    : match.groups.table.toLowerCase()
  return Object.hasOwn(SENSITIVE_TABLES, table)
    ? { table, end: match[0].length, hasModifiers: match.groups.modifiers.trim() !== '' }
    : null
}

function sensitiveReplaceTarget(statement) {
  let match = maskComments(statement).match(REPLACE_TARGET)
  if (!match && statement.includes('/*!')) {
    match = maskComments(statement, true).match(REPLACE_TARGET)
    if (match) throw new Error('Unsafe executable comment: sensitive REPLACE is not supported')
  }
  if (!match) return null
  const table = match.groups.table.startsWith('`')
    ? match.groups.table.slice(1, -1).replaceAll('``', '`').toLowerCase()
    : match.groups.table.toLowerCase()
  return Object.hasOwn(SENSITIVE_TABLES, table) ? { table } : null
}

function sensitiveMutationTarget(statement) {
  return sensitiveInsertTarget(statement) ?? sensitiveReplaceTarget(statement)
}

function executableCommentTarget(statement) {
  const body = statement.match(/^\/\*!\d*\s*([\s\S]*?)\*\//)?.[1]
  return body ? sensitiveMutationTarget(body) : null
}

function anonymizeSensitiveInsert(statement, table, firstSequence) {
  const target = sensitiveInsertTarget(statement)
  const parsed = target && !target.hasModifiers
    ? statement.slice(target.end).match(/^(\s*)\(([^)]*)\)(\s+VALUES\s*)([\s\S]+)$/i)
    : null
  if (!parsed || target.table !== table) {
    throw new Error(`Unsafe ${table} INSERT: explicit columns and plain VALUES are required`)
  }

  const columns = scanSql(parsed[2], ',', false).map((column) =>
    column.replaceAll('`', '').trim().toLowerCase())
  const missing = SENSITIVE_TABLES[table].required.filter((column) => !columns.includes(column))
  if (missing.length > 0) {
    throw new Error(`Unsafe ${table} INSERT: missing required columns: ${missing.join(', ')}`)
  }
  const rows = scanSql(parsed[4], ',')
  let sequence = firstSequence
  const scrubbedRows = rows.map((row) => {
    if (!row.startsWith('(') || !row.endsWith(')')) {
      throw new Error(`Unsafe ${table} INSERT: only VALUES tuples are supported`)
    }
    const values = scanSql(row.slice(1, -1), ',')
    if (values.length !== columns.length) {
      throw new Error(`Unsafe ${table} INSERT: column/value count mismatch`)
    }

    sequence += 1
    const replacements = SENSITIVE_TABLES[table].replacements(sequence, values, columns)
    for (const [column, replacement] of Object.entries(replacements)) {
      values[columns.indexOf(column)] = replacement
    }
    return `(${values.join(',')})`
  })

  return {
    sql: `${statement.slice(0, target.end)}${parsed[1]}(${parsed[2]})${parsed[3]}${scrubbedRows.join(',\n')}`,
    sequence,
  }
}

const sequences = Object.fromEntries(Object.keys(SENSITIVE_TABLES).map((table) => [table, 0]))
const expectedCounts = Object.fromEntries(Object.keys(SENSITIVE_TABLES).map((table) => [table, 0]))
const parsedCounts = Object.fromEntries(Object.keys(SENSITIVE_TABLES).map((table) => [table, 0]))
const statements = scanSql(sql, ';')
for (const statement of statements) {
  const prefix = leadingComments(statement)
  if (executableCommentTarget(statement.slice(prefix.length))) {
    throw new Error('Unsafe executable comment: sensitive mutation is not supported')
  }
  const executable = statement.slice(prefix.length)
  if (sensitiveReplaceTarget(executable)) {
    throw new Error('Unsafe sensitive REPLACE: mutation is not supported')
  }
  const target = sensitiveInsertTarget(statement.slice(prefix.length))
  if (target) expectedCounts[target.table] += 1
}
sql = statements.map((statement) => {
  const prefix = leadingComments(statement)
  const executable = statement.slice(prefix.length)
  if (sensitiveReplaceTarget(executable)) {
    throw new Error('Unsafe sensitive REPLACE: mutation is not supported')
  }
  const target = sensitiveInsertTarget(executable)
  if (!target) return statement
  const result = anonymizeSensitiveInsert(executable, target.table, sequences[target.table])
  parsedCounts[target.table] += 1
  sequences[target.table] = result.sequence
  return prefix + result.sql
}).join(';')
for (const table of Object.keys(SENSITIVE_TABLES)) {
  if (parsedCounts[table] !== expectedCounts[table]) {
    throw new Error(`Unsafe ${table} INSERT: not every executable statement could be parsed`)
  }
}

const header = `-- Anonymized dump generated ${new Date().toISOString()}
-- DO NOT use as a source of real PII. Review before committing.
-- Source: anonymized SQL input

`

writeFileSync(resolve(outPath), header + sql, 'utf8')
console.log(`Wrote ${outPath} (${sql.length} bytes body)`)
