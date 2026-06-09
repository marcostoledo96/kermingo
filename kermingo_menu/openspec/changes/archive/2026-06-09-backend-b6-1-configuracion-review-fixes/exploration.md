# Exploración: B6.1 PR2 configuracion review fixes

## Estado verificado por archivo

### `backend/src/api/routes/configuracion.routes.js`
- **P1 (ChatGPT Codex) — `adminRouter.put('/')` no usa `requireTrustedOrigin`**: **REAL**
  - Línea 15: `adminRouter.put('/', requireAdmin, validateBody(updateConfiguracionSchema), actualizarAdmin);` — falta `requireTrustedOrigin`.
  - Comparación con otros archivos:
    - `pedido.routes.js` líneas 16, 22, 28, 34: todos los endpoints unsafe (`POST caja`, `PATCH estado`, `PATCH pago`, `PATCH cancelar`) usan `requireTrustedOrigin`.
    - `producto.routes.js` líneas 19, 20, 21, 22, 23: todos los endpoints unsafe (`POST /`, `PUT /:id`, `PATCH /:id/desactivar`, `PATCH /:id/recuperar`, `PATCH /:id/stock`) usan `requireTrustedOrigin`.
    - `cocina.routes.js` línea 17: `PATCH /pedidos/:id/estado` usa `requireTrustedOrigin`.
  - **Impacto**: CSRF vulnerability. La cookie tiene `sameSite: 'none'` en producción (`auth.controller.js` líneas 17–18, 24–25), por lo que sin `requireTrustedOrigin` un site malicioso puede hacer PUT desde otro origen usando la cookie del admin.

### `backend/src/api/controllers/configuracion.controller.js`
- **Copilot HIGH — `actualizarAdmin` lanza 404 cuando `affected === 0`**: **REAL** (líneas 38–41)
  - `if (affected === 0) throw new NotFoundError('Configuración no encontrada');`
  - En MySQL/mysql2, `affectedRows = 0` se devuelve cuando el row existe pero ninguna columna cambia su valor (UPDATE no-op). Esto significa que si el admin envía exactamente los mismos datos, recibirá HTTP 404 en lugar de 200 con la configuración.
  - **Evidencia**: El `id=1` siempre existe por seed (`seed.sql`), por lo tanto `affected === 0` nunca significa "no encontrado". El error conceptual es interpretar `affectedRows=0` como ausencia del recurso.

### `backend/src/api/schemas/configuracion.schema.js`
- **Copilot MEDIUM — `mensaje_publico` y `cena_habilitada_desde` son nullable en DB pero el schema Zod rechaza `null`**: **REAL**
  - DB (`schema.sql` líneas 95–99): `mensaje_publico TEXT NULL`, `cena_habilitada_desde TIME NULL`.
  - Schema (`configuracion.schema.js` líneas 5–9):
    ```js
    mensaje_publico: z.string().max(500).optional(),
    cena_habilitada_desde: z.string().regex(...).optional(),
    ```
  - En Zod v4, `.optional()` significa que el campo puede estar ausente (`undefined`), pero si se envía `null`, Zod rechaza con error porque `null` no es string.
  - **Impacto**: Es imposible limpiar (setear a `null`) estos campos vía API. El admin no puede "borrar" el mensaje público ni la hora de habilitación de cena.

### `backend/tests/configuracion.test.js`
- **Copilot MEDIUM — test de validación body con estado inválido asserta 401 en lugar de 400**: **REAL** (líneas 29–42)
  - Comentario dice: `// Reutilizamos el validador Zod; sin cookie da 401 antes, así que solo podemos probar// que la ruta en sí responde...Verificamos que el schema esta montado testeando un 401.`
  - `it('PUT ... con estado invalido -> 400'` — pero el `expect` es `statusCode.toEqual(401)`.
  - El nombre del test contradice el assertion y la realidad técnica: sin cookie, `requireAdmin` devuelve 401 antes de que el validador body corra. Esto no prueba que el schema Zod esté montado.
  - **Impacto**: El test es engañoso y no cubre la validación real.

- **Copilot LOW — comentario "404 si no hay DB" confunde**: **REAL** (líneas 12–13)
  - Comentario en test: `No exigimos body.ok porque el middleware de error global puede devolver 404 si no hay DB.`
  - Un fallo de conexión a DB en los controllers de configuración (que usan `getPool()`) arrojaría un error no-controlado (Error de mysql2), no un 404. El `NotFoundError` solo se lanza cuando `config` es falsy — lo cual ocurre solo si el `SELECT` devuelve cero rows (es decir, si no hay seed), no por fallo de conexión. Fallo real de conexión = 500.
  - El comentario confunde el lector sobre el mecanismo de error.

## Hallazgos extra

### `updateMinimal` en `configuracion.model.js` permite `null` parcialmente
- **Verificado**: El modelo checkea `data[key] !== undefined` (líneas 12, 15, 18). Si `data.cena_habilitada_desde = null`, `undefined !== null` es `true`, por lo que se incluye en el UPDATE y se setea a `NULL` en SQL sin problema.
- **PERO**: El schema Zod rechaza `null` antes de que llegue al modelo, así que este comportamiento es inaccesible. El fix es en el schema, no en el modelo.

### `requireTrustedOrigin` — ¿global o por ruta?
- **Por ruta**. No hay montaje global en `app.js` ni en `index.routes.js`. Se importa explícitamente en cada archivo de rutas administrativas que lo necesita.
- Confirmado: `producto.routes.js`, `pedido.routes.js`, `cocina.routes.js` usan `requireTrustedOrigin` en todos sus endpoints unsafe. `configuracion.routes.js` es el único que no lo tiene en su PUT.

### `index.routes.js` monta correctamente ambos routers
- **Verificado**: líneas 6, 26, 27 montan `configuracionPublicRouter` y `configuracionAdminRouter` en `/configuracion-tienda` y `/admin/configuracion-tienda` respectivamente. Sin problemas.

### `configuracion_tienda` tiene `id=1` en seed
- **Verificado** (`seed.sql` línea 7): `INSERT IGNORE INTO configuracion_tienda (id, estado) VALUES (1, 'cerrada');`
- Esto confirma que el error de `affected === 0` en `actualizarAdmin` nunca significa "no existe": el registro siempre está.

### `afterAll(pool.end())` en `configuracion.test.js` — potencial open handles
- **Verificado** (líneas 61–63): `afterAll(async () => { await pool.end(); });` (usando `db.js` default export que es la pool directa).
- **Observación**: `pool.end()` en mysql2 cierra todas las conexiones del pool. Si hay conexiones abiertas por otros modulos (ej. tests corriendo en paralelo) puede haber intermitencia. Para un solo archivo de test esto no suele ser problema. No hay evidencia directa de open handles hoy.
- **Nota**: Si el runner tiene `--runInBand`, es safe. Si no, potencial race condition.

### Tests reales de admin authenticated — gap existente
- **Confirmado**: No hay helpers de login ni cookies de prueba en `configuracion.test.js`. Los únicos tests son sin auth (401) o con body inválido pero sin cookie (401 antes de validar).
- **Comparación con cocina**: `cocina.test.js` tampoco tiene login real. Es un gap sistémico del suite de tests.
- **Impacto**: Ninguna validación de schema ni comportamiento post-auth se prueba automáticamente. Esto incluye el bug de `affectedRows=0` y el bug de `null` en schema.

### Cookie `sameSite: 'none'` — producción
- **Verificado** (`auth.controller.js`):
  - Producción: `sameSite: 'none'` (líneas 17–18, reiterado en líneas 24–25).
  - Desarrollo: `sameSite: 'lax'` (mismo condicional).
- Esto hace que `requireTrustedOrigin` sea necesario en producción para todo endpoint unsafe, pero en desarrollo (localhost cross-origin con frontend en :3000 y backend en :3001) `Fetch` enviaría cookie igualmente.

## Tests actuales

### Qué cubren hoy
1. **Público sin auth**: `GET /api/configuracion-tienda` → 200 sin cookie.
2. **Admin sin auth**: `GET /api/admin/configuracion-tienda` → 401 sin cookie.
3. **Admin PUT sin auth**: `PUT /api/admin/configuracion-tienda` → 401 sin cookie.
4. **Invalid body (disfrazado)**: `PUT /api/admin/configuracion-tienda` con `estado: 'no_existe'` → 401 (no prueba Zod realmente).

### Qué falta
1. **Admin autenticado**: Login helper o cookie previa para testear endpoints autenticados.
2. **PUT con mismos datos → 200**: Prueba del bug de `affectedRows=0`.
3. **PUT con `null` en campos nullable → 200**: Prueba del bug de schema Zod rechazando `null`.
4. **PUT con origin hostil → 403/401**: Prueba de `requireTrustedOrigin` en la ruta de configuración.
5. **PUT con origin confiable → 200**: Flujo positivo de actualización.
6. **Pool end race condition**: Si `afterAll(pool.end())` es compartido, verificar que no cierra pool antes de que otros tests terminen.

## Recomendación de approach

### Comentarios válidos para actuar (todos son REALES)

| # | Comentario | Estado | Archivo(s) | Fix |
|---|---|---|---|---|
| 1 | CSRF — `adminRouter.put('/')` sin `requireTrustedOrigin` | Real | `configuracion.routes.js` | Importar y agregar `requireTrustedOrigin` como primer middleware después de `requireAdmin` en `adminRouter.put('/')`. |
| 2 | `affected === 0` interpretado como 404 | Real | `configuracion.controller.js` | Para `configuracion_tienda` (id fijo), `affected === 0` no significa ausencia. Refactorizar a: si `result.affectedRows === 0`, buscar con `findAdmin` igualmente y devolver 200 (posible no-op) o chequear `changedRows` (pero mysql2 lo devuelve como `changedRows`, no `affectedRows`). Alternativa: eliminar la verificación `affected === 0` porque el seed garantiza existencia; si realmente falla, sería error de DB (500). |
| 3 | Schema Zod rechaza `null` en campos DB-nullable | Real | `configuracion.schema.js` | Cambiar `.optional()` por `.nullable()` o `.optional().nullable()` para `mensaje_publico` y `cena_habilitada_desde`, permitiendo enviar explícitamente `null` para limpiar. |
| 4 | Test con nombre "400" pero asserta 401 | Real | `configuracion.test.js` | Renombrar el test o marcar como `it.skip` con comentario explicando el gap. Idealmente, implementar login helper y reescribir el test para validar que Zod rechaza realmente con 400. |
| 5 | Comentario confuso sobre "404 si no hay DB" | Real | `configuracion.test.js` | Corregir comentario: un fallo de conexión a BD devuelve 500 (error del pool), no 404. El 404 ocurre solo si el registro no existe en la tabla (sin seed). |

### Decisión: ¿poner `requireTrustedOrigin` en `configuracion.routes.js`?
- **Sí**. Patrón establecido en todo el backend para endpoints admin de escritura. Única excepción actual: `configuracion.routes.js`.

### Decisión: ¿cómo refactorizar `actualizarAdmin`?
- **Opción A**: Eliminar `if (affected === 0) throw NotFoundError`. Confiamos en que el seed existe. Si el seed no existe, el `findAdmin` posterior devolvería `null`, y ahí sí lanzar 404.
- **Opción B**: Reescribir el controller para hacer el `findAdmin` primero (404 si no existe) y luego `updateMinimal` sin interpretar `affectedRows=0` como error.
- **Recomendación: Opción A** es más simple: remover la línea 39. Si `findAdmin` devuelve `null` después del update, lanzar 404; de lo contrario devolver 200. Eso cubre el caso edge real (seed borrado manualmente) sin false positive en no-op.

### Decisión: schema nullables
- `z.string().max(500).optional()` → `z.string().max(500).nullable().optional()` (o solo `.nullable()` si el modelo espera que siempre llegue).
- `z.string().regex(...).optional()` → `z.string().regex(...).nullable().optional()` (o `z.union([z.string().regex(...), z.null()]).optional()`).
- Nota: `.optional()` hace opcional el envío del campo; `.nullable()` valida `null`. Ambos necesarios para permitir "no enviar" (no cambiar) o "enviar null" (limpiar).

### Decisión: tests
- No es parte de esta exploración implementar login helper genérico (es gap sistémico), pero sí se puede:
  1. Corregir el nombre del test existente.
  2. Corregir el comentario.
  3. Agregar un test de `PUT` con origin confiable y actualización real (requiere auth helper, pero si no hay, se deja documentado como gap).
  4. O dejar los tests mínimos como hoy y documentar el gap en el reporte.

## Listo para propuesta
**Sí**

Todos los comentarios revisados son reales y afectan código en `feature/backend-b6-1-cocina-review-fixes`. No hay dependencia con PRs #4/#5 (caja/edicion). La rama de fix es `feature/backend-b6-1-configuracion-review-fixes`, saliendo de la rama actual.
