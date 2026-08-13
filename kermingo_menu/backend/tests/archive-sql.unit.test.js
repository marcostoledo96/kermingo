import { readFile } from 'node:fs/promises'

const archive = new URL('../src/api/database/archives/2026-07-28-prod-anonymized.sql', import.meta.url)
const indexes = new URL('../src/api/database/indexes.sql', import.meta.url)

describe('canonical database SQL', () => {
  it.each([archive, indexes])('%s uses MySQL-compatible CREATE INDEX statements', async (file) => {
    const sql = await readFile(file, 'utf8')

    expect(sql).toMatch(/CREATE INDEX idx_pedido_numero ON pedido\(numero\);/)
    expect(sql).not.toMatch(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS/i)
  })
})
