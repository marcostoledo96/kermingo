import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const script = new URL('../scripts/anonymize-dump.mjs', import.meta.url)

describe('anonymize-dump', () => {
  let dir

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'kermingo-anonymize-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('scrubs pedido PII by column in reordered extended inserts without changing other tables', async () => {
    const input = join(dir, 'input.sql')
    const output = join(dir, 'output.sql')
    const sql = [
      "INSERT INTO `otra_tabla` (`nombre_cliente`,`token_seguimiento`) VALUES ('Persona real','abcdefabcdefabcdefabcdefabcdefab');",
      "INSERT INTO `pedido` (`observaciones`,`id`,`telefono_whatsapp`,`nombre_cliente`,`mesa`,`token_seguimiento`,`telefono_cliente`,`total`) VALUES",
      "('Traer cubiertos, servilletas',1,'5492915551111','O''Connor, Ana','Mesa 8','abcdefabcdefabcdefabcdefabcdefab','2915551111',3500),",
      "(NULL,2,NULL,'José Pérez',NULL,'1234567890abcdef1234567890abcdef',NULL,2500);",
      '',
    ].join('\n')
    await writeFile(input, sql)

    await execFileAsync(process.execPath, [script.pathname, input, output])
    const result = await readFile(output, 'utf8')

    expect(result).toContain("INSERT INTO `otra_tabla` (`nombre_cliente`,`token_seguimiento`) VALUES ('Persona real','abcdefabcdefabcdefabcdefabcdefab');")
    expect(result).toContain("('Observacion demo 1',1,'5491199001001','Cliente Demo 1',NULL,'00000000000000000000000000000001','1199001001',3500)")
    expect(result).toContain("(NULL,2,'5491199001002','Cliente Demo 2',NULL,'00000000000000000000000000000002','1199001002',2500)")
    expect(result).not.toMatch(/O''Connor|José|291555|Traer cubiertos|Mesa 8/)
  })

  it('fails closed before writing output when a pedido insert has no explicit column list', async () => {
    const input = join(dir, 'input.sql')
    const output = join(dir, 'output.sql')
    await writeFile(input, "INSERT INTO pedido VALUES (1, 'Persona real');\n")

    await expect(execFileAsync(process.execPath, [script.pathname, input, output])).rejects.toMatchObject({
      code: 1,
    })
    await expect(stat(output)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('does not let a leading SQL comment bypass fail-closed pedido detection', async () => {
    const input = join(dir, 'input.sql')
    const output = join(dir, 'output.sql')
    await writeFile(input, "-- pedido data\nINSERT INTO `pedido` VALUES (1, 'Persona real');\n")

    await expect(execFileAsync(process.execPath, [script.pathname, input, output])).rejects.toMatchObject({
      code: 1,
    })
    await expect(stat(output)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('fails closed on unsupported pedido insert modifiers', async () => {
    const input = join(dir, 'input.sql')
    const output = join(dir, 'output.sql')
    await writeFile(input, "INSERT IGNORE INTO pedido (nombre_cliente) VALUES ('Persona real');\n")

    await expect(execFileAsync(process.execPath, [script.pathname, input, output])).rejects.toMatchObject({
      code: 1,
    })
    await expect(stat(output)).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
