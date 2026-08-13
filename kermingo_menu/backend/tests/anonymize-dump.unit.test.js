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

  it.each([
    'pedido',
    'demo.pedido',
    '`demo`.pedido',
    'demo.`pedido`',
    '`demo`.`pedido`',
    '`demo-prod`.`pedido`',
    '`demo archive`.`pedido`',
    '`demo``prod`.`pedido`',
  ])('scrubs pedido INSERT with target %s', async (target) => {
    const input = join(dir, 'input.sql')
    const output = join(dir, 'output.sql')
    await writeFile(input, `INSERT INTO ${target} (nombre_cliente, telefono_cliente, telefono_whatsapp, mesa, token_seguimiento, observaciones) VALUES ('Persona real', '2915551111', '5492915551111', 'Mesa 8', 'abcdefabcdefabcdefabcdefabcdefab', 'Privado');\n`)

    await execFileAsync(process.execPath, [script.pathname, input, output])
    const result = await readFile(output, 'utf8')

    expect(result).toContain(`INSERT INTO ${target}`)
    expect(result).toContain("'Cliente Demo 1'")
    expect(result).not.toMatch(/Persona real|2915551111|Mesa 8|Privado/)
  })

  it.each([
    'INSERT /* generated export */ INTO pedido',
    'INSERT\n-- generated export\nINTO pedido',
  ])('scrubs pedido when ordinary comments separate INSERT tokens: %s', async (header) => {
    const input = join(dir, 'input.sql')
    const output = join(dir, 'output.sql')
    await writeFile(input, `${header} (nombre_cliente, telefono_cliente, telefono_whatsapp, mesa, token_seguimiento, observaciones) VALUES ('Persona real', '2915551111', '5492915551111', 'Mesa 8', 'abcdefabcdefabcdefabcdefabcdefab', 'Privado');\n`)

    await execFileAsync(process.execPath, [script.pathname, input, output])
    const result = await readFile(output, 'utf8')

    expect(result).toContain("'Cliente Demo 1'")
    expect(result).not.toMatch(/Persona real|2915551111|Mesa 8|Privado/)
  })

  it.each([
    ['usuario', 'nombre, email, contrasenia_hash', "'Persona', 'persona@example.test', 'private-hash'"],
    ['archivo_drive', 'nombre_original, drive_id, url_publica', "'private.pdf', 'private-drive', 'https://private.test'"],
  ])('scrubs every qualified quoting form for %s', async (table, columns, values) => {
    const input = join(dir, 'input.sql')
    const output = join(dir, 'output.sql')
    const targets = [`demo.${table}`, `\`demo\`.${table}`, `demo.\`${table}\``, `\`demo\`.\`${table}\``]
    await writeFile(input, targets.map((target) =>
      `INSERT INTO ${target} (${columns}) VALUES (${values});`).join('\n'))

    await execFileAsync(process.execPath, [script.pathname, input, output])
    const result = await readFile(output, 'utf8')

    expect(result).not.toMatch(/Persona|persona@example|private-hash|private\.pdf|private-drive|private\.test/)
  })

  it('ignores comments, DDL, and similar table names that mention sensitive tables', async () => {
    const input = join(dir, 'input.sql')
    const output = join(dir, 'output.sql')
    const sql = [
      '-- INSERT INTO pedido VALUES (1, \'comment only\')',
      'CREATE TABLE pedido_backup (id INT)',
      "INSERT INTO pedido_backup (nombre_cliente) VALUES ('Catalog value')",
      "INSERT INTO `demo-prod`.`pedido_historico` (nombre_cliente) VALUES ('Historical value')",
      "INSERT INTO demo.usuario_audit (email) VALUES ('audit@example.test')",
      '',
    ].join(';\n')
    await writeFile(input, sql)

    await execFileAsync(process.execPath, [script.pathname, input, output])
    const result = await readFile(output, 'utf8')

    expect(result).toContain("INSERT INTO pedido_backup (nombre_cliente) VALUES ('Catalog value')")
    expect(result).toContain("INSERT INTO `demo-prod`.`pedido_historico` (nombre_cliente) VALUES ('Historical value')")
    expect(result).toContain("INSERT INTO demo.usuario_audit (email) VALUES ('audit@example.test')")
  })

  it('splits statements and VALUES only in normal SQL state while preserving comments', async () => {
    const input = join(dir, 'input.sql')
    const output = join(dir, 'output.sql')
    const sql = [
      '# ordinary ; comment',
      '-- ordinary ; comment',
      '/* ordinary ; comment */',
      '/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE */;',
      'SELECT "double; quote )";',
      'SELECT `backtick``name; )`;',
      'INSERT INTO pedido (`nombre_cliente`,`telefono_cliente`,`telefono_whatsapp`,`mesa`,`token_seguimiento`,`observaciones`,`total`) VALUES',
      "('O\\'Connor; Ana','291,555','549291555','Mesa )','abcdefabcdefabcdefabcdefabcdefab','backslash',COALESCE(NULL,3500)),",
      "('D''Angelo','292','549292','Mesa 2','1234567890abcdef1234567890abcdef','double '' quote',2500),",
      "('Double quote value','293','549293','Mesa 3','2234567890abcdef1234567890abcdef','ok',2500),",
      "('Backtick value','294','549294','Mesa 4','3234567890abcdef1234567890abcdef','ok',2500);",
      "INSERT INTO producto (`id`,`nombre`) VALUES (99,'Catalog; value, with ) paren');",
      '',
    ].join('\n')
    await writeFile(input, sql)

    await execFileAsync(process.execPath, [script.pathname, input, output])
    const result = await readFile(output, 'utf8')

    expect(result).toContain('# ordinary ; comment')
    expect(result).toContain('-- ordinary ; comment')
    expect(result).toContain('/* ordinary ; comment */')
    expect(result).toContain('/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE */')
    expect(result).toContain("INSERT INTO producto (`id`,`nombre`) VALUES (99,'Catalog; value, with ) paren')")
    expect(result).toContain('COALESCE(NULL,3500)')
    expect(result).toContain("'Cliente Demo 4'")
    expect(result).not.toMatch(/O\\'Connor|D''Angelo|Double quote value|Backtick value/)
  })

  it('treats -- as a comment only when followed by MySQL whitespace or control', async () => {
    const input = join(dir, 'input.sql')
    const output = join(dir, 'output.sql')
    await writeFile(input, [
      "SELECT 4--2; INSERT INTO pedido VALUES (1, 'not hidden');",
      "--\tINSERT INTO pedido VALUES (2, 'comment only');",
      '',
    ].join('\n'))

    await expect(execFileAsync(process.execPath, [script.pathname, input, output])).rejects.toMatchObject({ code: 1 })
    await expect(stat(output)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it.each([
    ['single quote', "INSERT INTO producto (id,nombre) VALUES (1,'unterminated);"],
    ['double quote', 'SELECT "unterminated;'],
    ['backtick', 'SELECT `unterminated;'],
    ['block comment', 'SELECT 1; /* unterminated'],
    ['nested block comment', 'SELECT 1; /* outer /* nested */'],
    ['unmatched parenthesis', 'SELECT (1;'],
    ['executable sensitive insert', "/*!40101 INSERT INTO pedido VALUES (1, 'private') */;"],
    ['qualified executable sensitive insert', "/*!40101 INSERT INTO `demo archive`.`pedido` VALUES (1, 'private') */;"],
    ['executable sensitive insert before -- comment', "/*!40101 INSERT INTO pedido VALUES (1, 'private') */ -- trailing\n;"],
    ['executable sensitive insert before # comment', "/*!40101 INSERT INTO pedido VALUES (1, 'private') */ # trailing\n;"],
    ['executable comment inside sensitive insert', "INSERT /*! generated */ INTO pedido VALUES (1, 'private');"],
  ])('fails closed without output for %s', async (_case, sql) => {
    const input = join(dir, 'input.sql')
    const output = join(dir, 'output.sql')
    await writeFile(input, sql)

    await expect(execFileAsync(process.execPath, [script.pathname, input, output])).rejects.toMatchObject({ code: 1 })
    await expect(stat(output)).rejects.toMatchObject({ code: 'ENOENT' })
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

  it.each([
    ['-- generated export', '\r'],
    ['# generated export', '\r'],
    ['-- generated export', '\r\n'],
    ['# generated export', '\r\n'],
  ])('scrubs explicit-column pedido INSERT after a leading %s comment with %j line ending', async (comment, lineEnding) => {
    const input = join(dir, 'input.sql')
    const output = join(dir, 'output.sql')
    const sql = `${comment}${lineEnding}INSERT INTO pedido (nombre_cliente, telefono_cliente, telefono_whatsapp, mesa, token_seguimiento, observaciones) VALUES ('Persona real', '2915551111', '5492915551111', 'Mesa 8', 'abcdefabcdefabcdefabcdefabcdefab', 'Privado');${lineEnding}`
    await writeFile(input, sql)

    await execFileAsync(process.execPath, [script.pathname, input, output])
    const result = await readFile(output, 'utf8')

    expect(result).toContain("'Cliente Demo 1'")
    expect(result).not.toMatch(/Persona real|2915551111|Mesa 8|Privado/)
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

  it.each([
    'demo.pedido',
    '`demo`.pedido',
    'demo.`pedido`',
    '`demo`.`pedido`',
    '`demo-prod`.`pedido`',
    '`demo archive`.`pedido`',
    '`demo``prod`.`pedido`',
  ])('fails closed without output for qualified %s missing sensitive columns', async (target) => {
    const input = join(dir, 'input.sql')
    const output = join(dir, 'output.sql')
    await writeFile(input, `INSERT INTO ${target} (id, nombre_cliente) VALUES (1, 'Persona');\n`)

    await expect(execFileAsync(process.execPath, [script.pathname, input, output])).rejects.toMatchObject({ code: 1 })
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
