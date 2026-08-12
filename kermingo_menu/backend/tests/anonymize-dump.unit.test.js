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

  it('scrubs every sensitive table by column in reordered extended inserts without changing catalog data', async () => {
    const input = join(dir, 'input.sql')
    const output = join(dir, 'output.sql')
    const sql = [
      "INSERT INTO `otra_tabla` (`nombre_cliente`,`token_seguimiento`) VALUES ('Persona real','abcdefabcdefabcdefabcdefabcdefab');",
      "INSERT INTO `producto` (`id`,`nombre`,`descripcion`) VALUES (14,'Helados palito','Variedad de gustos');",
      "INSERT INTO `pedido` (`observaciones`,`id`,`telefono_whatsapp`,`nombre_cliente`,`mesa`,`token_seguimiento`,`telefono_cliente`,`total`) VALUES",
      "('Traer cubiertos, servilletas',1,'5492915551111','O''Connor, Ana','Mesa 8','abcdefabcdefabcdefabcdefabcdefab','2915551111',3500),",
      "(NULL,2,NULL,'José Pérez',NULL,'1234567890abcdef1234567890abcdef',NULL,2500);",
      "INSERT INTO `usuario` (`email`,`id`,`contrasenia_hash`,`nombre`,`activo`) VALUES",
      "('persona@example.test',1,'hash-no-bcrypt-canary','Nombre Real',1),",
      "('otra@example.test',2,'otro-hash-canary','Otra Persona',1);",
      "INSERT INTO `archivo_drive` (`url_publica`,`id`,`nombre_original`,`drive_id`,`mime_type`) VALUES",
      "('https://files.example.test/private-canary',4,'comprobante-persona-canary.pdf','short-drive-canary','application/pdf'),",
      "(NULL,5,'foto-persona-canary.png','another-short-id','image/png');",
      '',
    ].join('\n')
    await writeFile(input, sql)

    await execFileAsync(process.execPath, [script.pathname, input, output])
    const result = await readFile(output, 'utf8')

    expect(result).toContain("INSERT INTO `otra_tabla` (`nombre_cliente`,`token_seguimiento`) VALUES ('Persona real','abcdefabcdefabcdefabcdefabcdefab');")
    expect(result).toContain("INSERT INTO `producto` (`id`,`nombre`,`descripcion`) VALUES (14,'Helados palito','Variedad de gustos');")
    expect(result).toContain("('Observacion demo 1',1,'5491199001001','Cliente Demo 1',NULL,'00000000000000000000000000000001','1199001001',3500)")
    expect(result).toContain("(NULL,2,'5491199001002','Cliente Demo 2',NULL,'00000000000000000000000000000002','1199001002',2500)")
    expect(result).toContain("('usuario1@example.invalid',1,'$2b$10$NJeTubdE9ncZRJoVj373ZOsT2ubw9hpCMmDDhceBV.O2ZdfhtX23e','Usuario Demo 1',1)")
    expect(result).toContain("('usuario2@example.invalid',2,'$2b$10$NJeTubdE9ncZRJoVj373ZOsT2ubw9hpCMmDDhceBV.O2ZdfhtX23e','Usuario Demo 2',1)")
    expect(result).toContain("(NULL,4,'archivo-demo-1.pdf','demo-drive-1','application/pdf')")
    expect(result).toContain("(NULL,5,'archivo-demo-2.png','demo-drive-2','image/png')")
    expect(result).not.toMatch(/O''Connor|José|291555|Traer cubiertos|Mesa 8|persona@example|Nombre Real|hash-no-bcrypt-canary|private-canary|comprobante-persona-canary|short-drive-canary/)
    expect(result).not.toContain(input)
    expect(result).toContain('-- Source: anonymized SQL input')
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

  it.each([
    ['usuario', "INSERT INTO usuario (id, nombre, email) VALUES (1, 'Persona', 'persona@example.test');"],
    ['archivo_drive', "INSERT INTO archivo_drive (id, nombre_original, drive_id) VALUES (1, 'private.pdf', 'drive-canary');"],
    ['pedido', "INSERT INTO pedido (id, nombre_cliente) VALUES (1, 'Persona');"],
  ])('fails closed without output when %s is missing required sensitive columns', async (_table, statement) => {
    const input = join(dir, 'input.sql')
    const output = join(dir, 'output.sql')
    await writeFile(input, `${statement}\n`)

    await expect(execFileAsync(process.execPath, [script.pathname, input, output])).rejects.toMatchObject({
      code: 1,
    })
    await expect(stat(output)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it.each(['usuario', 'archivo_drive'])(
    'fails closed without output when a %s insert has no explicit column list',
    async (table) => {
      const input = join(dir, 'input.sql')
      const output = join(dir, 'output.sql')
      await writeFile(input, `INSERT INTO ${table} VALUES (1, 'private-canary');\n`)

      await expect(execFileAsync(process.execPath, [script.pathname, input, output])).rejects.toMatchObject({
        code: 1,
      })
      await expect(stat(output)).rejects.toMatchObject({ code: 'ENOENT' })
    },
  )
})
