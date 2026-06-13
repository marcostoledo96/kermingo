# 46 — Auditoría B6.3.1 post-OAuth — ZIP completo Kermingo

## Archivo auditado

```txt
kermingo_menu (Copiar).zip
```

## Prompt de referencia

```txt
Prompt de auditoría para ChatGPT 5.5 — Kermingo B6.3.1 post-OAuth
```

## Objetivo

Auditar el cierre backend de:

```txt
B6.3 — Comprobantes / Google Drive
B6.3.1 — Hardening pre-B7
Migración Google Drive Service Account → OAuth de usuario
```

y decidir si el backend está listo para avanzar a:

```txt
B7 — Frontend público + admin
```

## Limitación

La revisión fue principalmente estática, leyendo código, tests, SQL, scripts y documentación.

También intenté ejecutar tests en el sandbox, pero el entorno no tiene MySQL local preparado. Por eso los tests DB-backed no son reproducibles acá. El resultado local que informaste:

```txt
187/187 tests pass
RUN_REAL_DRIVE_TESTS=true comprobantes.test.js → 18/18 pass
```

lo tomo como evidencia declarada, pero no pude reproducirlo en este entorno.

---

# 1. Resumen ejecutivo

La implementación **mejoró bastante** respecto de la auditoría anterior.

Ahora el código ya muestra:

- migración real de Service Account a **OAuth de usuario**;
- uso de `google.auth.OAuth2`;
- `setCredentials({ refresh_token })`;
- eliminación de `GOOGLE_DRIVE_CREDENTIALS_JSON` como configuración activa;
- `DriveUploadError` tipado;
- validación por magic bytes;
- nombre interno seguro para Drive;
- `Readable.from(buffer)` para subir buffers de Multer;
- `handleMulterError` montado en `app.js`;
- preflight `assertStoreOpen(pool)` antes del upload;
- `npm test` configurado con `--runInBand`;
- tests reales de Drive con opt-in `RUN_REAL_DRIVE_TESTS=true`;
- script de ZIP de auditoría con verificación de exclusiones;
- documentación IA bastante alineada con OAuth.

Desde el punto de vista funcional de backend, **B6.3.1 está muy cerca de poder cerrar**.

Sin embargo, encontré algunos problemas importantes antes de avanzar a B7:

1. **El ZIP auditado todavía incluye `node_modules/` y `.next/`**, aunque no incluye `.env`. Esto contradice el requisito del prompt y hace que el paquete no sea limpio.
2. **`backend/tests/comprobantes.test.js` todavía contiene un comentario obsoleto que dice que si Drive está configurado los tests suben a Drive real**, aunque el código ya usa `RUN_REAL_DRIVE_TESTS`. No rompe, pero confunde.
3. **`DOCUMENTACION/IA/TESTING.md` tiene inconsistencias**: dice 186 tests, pero vos informaste 187/187; además documenta un `helpers/setup.js` que no existe.
4. **`frontend/.gitignore` no ignora `.env` genérico**, solo `.env*.local`. Si alguna vez creás `frontend/.env`, podría quedar trackeable.
5. **El endpoint admin de comprobante sigue siendo metadata/link**, no proxy. No bloquea backend, pero B7 tiene que diseñarse sabiendo esa limitación.
6. **La limpieza de archivos reales en Drive durante tests reales sigue siendo manual/deuda**. Es aceptable para preproducción si se documenta y se usa con cuidado.

## Tabla de veredicto

| Punto evaluado | Estado |
|---|---|
| OAuth Drive implementado | **SÍ** |
| Service Account removida del flujo activo | **SÍ** |
| Variables OAuth documentadas | **SÍ** |
| `DriveUploadError` tipado → 503 | **SÍ** |
| Magic bytes PDF/PNG/JPEG/WEBP | **SÍ** |
| Nombre interno seguro en Drive | **SÍ** |
| `Readable.from(buffer)` aplicado | **SÍ** |
| Preflight tienda abierta antes de upload | **SÍ** |
| `handleMulterError` montado | **SÍ** |
| `npm test` con `--runInBand` | **SÍ** |
| Tests Drive real opt-in | **SÍ, con comentario obsoleto** |
| ZIP sin `.env` | **SÍ** |
| ZIP sin `node_modules/` ni `.next/` | **NO** |
| Documentación IA alineada | **PARCIAL** |
| Backend listo para B7 | **CASI, con micro-fixes recomendados** |
| ¿Bloqueante fuerte de backend? | **NO encontré uno fuerte** |
| ¿Avanzar a B7 directo? | **Sí, pero mejor cerrar micro-limpieza antes** |

## Veredicto corto

```txt
B6.3.1 post-OAuth está correctamente encaminado.
No encontré un bug fuerte que invalide el backend.
Antes de B7 recomiendo una micro-limpieza B6.3.2:
- ZIP limpio sin node_modules/.next
- ajustar docs/testing
- corregir comentario obsoleto de tests Drive
- robustecer .gitignore
- documentar decisión metadata/link vs proxy para comprobantes
```

---

# 2. Errores críticos

## Resultado

```txt
No encontré errores críticos de lógica backend que bloqueen por completo B7.
```

Los problemas principales son de higiene del ZIP, documentación y preparación para frontend.

---

# 3. Errores importantes

## IMP-1 — El ZIP auditado incluye `backend/node_modules/`, `frontend/node_modules/` y `.next/`

### Archivos / carpetas detectadas

```txt
backend/node_modules/
frontend/node_modules/
frontend/.next/
```

### Evidencia

El ZIP extraído pesa aproximadamente:

```txt
792 MB
```

y contiene decenas de miles de archivos. En el listado aparecen:

```txt
backend/node_modules
frontend/node_modules
frontend/.next
```

### Problema

El prompt pedía explícitamente adjuntar un ZIP generado sin:

```txt
.env
node_modules/
.next/
coverage/
dist/
credenciales
zips previos
```

No encontré `.env`, lo cual está bien, pero `node_modules/` y `.next/` siguen dentro.

### Impacto

- Dificulta auditoría.
- Hace el ZIP enorme.
- Puede arrastrar archivos innecesarios.
- Puede ocultar resultados por volumen.
- Contradice el estándar de auditoría definido.

### Severidad

```txt
IMPORTANTE ALTA
```

No es un bug funcional del backend, pero sí un problema de proceso.

### Fix requerido

Generar siempre con:

```bash
bash scripts/crear_zip_auditoria.sh
```

y confirmar que el script falle si aparecen exclusiones.

Verificación:

```bash
unzip -l ZIP_GENERADO.zip | grep -E 'node_modules|/\.next/|/\.env$|\.env\.local|coverage|dist|credentials|drive-credentials|\.zip$'
```

Resultado esperado:

```txt
sin resultados
```

### Estado del script

`./scripts/crear_zip_auditoria.sh` está bien planteado y excluye:

```txt
*/node_modules/*
*/.next/*
backend/.env
backend/.env.local
frontend/.env
frontend/.env.local
credentials
drive-credentials.json
coverage
dist
*.zip
.key
.pem
.git
```

Por lo tanto, el problema parece ser que **este ZIP no fue generado con ese script**, o fue creado manualmente.

---

## IMP-2 — `DOCUMENTACION/IA/TESTING.md` dice 186 tests, pero el prompt informa 187/187

### Archivo

```txt
DOCUMENTACION/IA/TESTING.md
```

### Evidencia

El documento dice:

```txt
Total: 12 suites, 186 tests
```

Pero el prompt de auditoría que pasaste informa:

```txt
Test Suites: 12 passed, 12 total
Tests: 187 passed, 187 total
```

### Impacto

La documentación deja de ser una fuente confiable para agentes IA. Esto es especialmente importante en tu flujo, porque OpenCode/Gentle AI se guía por esos docs.

### Severidad

```txt
IMPORTANTE MEDIA
```

### Fix requerido

Actualizar a:

```txt
Total actual esperado B6.3.1 post-OAuth:
12 suites, 187 tests.
Para conteo exacto, correr npm test.
```

También conviene agregar:

```txt
RUN_REAL_DRIVE_TESTS=true npm test -- --testPathPattern=comprobantes.test
→ 18 tests reales Drive esperados
```

---

## IMP-3 — `DOCUMENTACION/IA/TESTING.md` menciona `backend/tests/helpers/setup.js`, pero no existe

### Archivo

```txt
DOCUMENTACION/IA/TESTING.md
```

### Evidencia

El árbol documentado incluye:

```txt
backend/tests/helpers/setup.js
```

pero en el ZIP auditado no existe:

```txt
backend/tests/helpers/
```

### Impacto

Un agente podría intentar usar o modificar un helper inexistente.

### Severidad

```txt
IMPORTANTE MEDIA
```

### Fix requerido

O crear realmente:

```txt
backend/tests/helpers/setup.js
```

o corregir la documentación para que refleje la estructura real.

Mi recomendación:

```txt
Corregir la documentación ahora.
Crear helper compartido después si realmente hace falta.
```

---

## IMP-4 — Comentario obsoleto en `backend/tests/comprobantes.test.js` dice que Drive configurado sube a Drive real

### Archivo

```txt
backend/tests/comprobantes.test.js
```

### Evidencia

El comentario superior todavía dice:

```txt
When Drive IS configured, uploads go to real Google Drive (not ideal for CI).
```

Pero el código actual tiene:

```js
const RUN_REAL_DRIVE_TESTS = process.env.RUN_REAL_DRIVE_TESTS === 'true';
const DRIVE_READY = isDriveReady();
const DRIVE_CONFIGURED = RUN_REAL_DRIVE_TESTS && DRIVE_READY;
```

### Problema

El comentario contradice el comportamiento actual. Ahora Drive real solo se usa si:

```txt
RUN_REAL_DRIVE_TESTS=true
```

### Impacto

Confunde a auditores y agentes. Podría llevar a cambiar algo que ya está bien.

### Severidad

```txt
IMPORTANTE BAJA
```

### Fix requerido

Cambiar comentario por:

```txt
By default, tests do NOT call real Google Drive.
Real Drive upload is enabled only with RUN_REAL_DRIVE_TESTS=true and OAuth credentials configured.
```

---

## IMP-5 — `frontend/.gitignore` no ignora `.env` genérico

### Archivo

```txt
frontend/.gitignore
```

### Evidencia

Tiene:

```txt
.env*.local
```

pero no:

```txt
.env
.env.*
```

### Problema

Si en B7 creás:

```txt
frontend/.env
```

podría no quedar ignorado.

### Severidad

```txt
IMPORTANTE MEDIA / PREVENTIVO
```

### Fix requerido

Agregar a `frontend/.gitignore`:

```txt
.env
.env.*
!.env.example
```

También conviene robustecer el `.gitignore` raíz:

```txt
.env
.env.*
!.env.example
node_modules/
.next/
dist/
coverage/
*.zip
*.pem
*.key
credentials/
drive-credentials.json
```

---

## IMP-6 — `test:unit` en package.json probablemente no es realmente “unit only”

### Archivo

```txt
backend/package.json
```

### Evidencia

Script actual:

```json
"test:unit": "node --experimental-vm-modules node_modules/.bin/jest --runInBand --testPathPattern='(unit|controller|csrf|health)'"
```

### Problema

Incluye:

```txt
csrf
health
controller
```

Algunos pueden ser unit o semi-integration dependiendo del archivo. No es grave, pero el nombre `test:unit` puede dar falsa expectativa.

### Severidad

```txt
IMPORTANTE BAJA
```

### Fix opcional

Renombrar mentalmente/documentar como:

```txt
test:fast
```

o dejar claro:

```txt
test:unit incluye unit/controller/csrf/health.
```

No bloquea B7.

---

## IMP-7 — El endpoint admin de comprobante es metadata/link, no proxy autenticado

### Archivo

```txt
backend/src/api/controllers/pedido.controller.js
```

### Evidencia

`obtenerComprobante` devuelve:

```txt
drive_id
nombre_original
mime_type
tamanio_bytes
url_publica
created_at
```

No devuelve bytes ni proxy del archivo.

### Análisis

Esto coincide con la especificación actual. No es bug.

Pero para B7 hay que definir qué hará el frontend:

1. Mostrar metadata y botón “Abrir en Drive”.
2. Abrir `url_publica`.
3. Implementar proxy autenticado.
4. Dejar revisión manual externa.

### Riesgo

`webViewLink` no garantiza acceso si los permisos de Drive no están configurados para el usuario admin. En tu caso, como OAuth sube con tu usuario Gmail, probablemente vos lo puedas abrir. Pero si otra persona administra el sistema, quizá no.

### Severidad

```txt
IMPORTANTE MEDIA / DECISIÓN B7
```

### Recomendación

Para B7 inicial:

```txt
Mostrar metadata + botón "Abrir comprobante en Drive" si url_publica existe.
Documentar que el acceso depende de permisos Drive.
```

Para una versión más sólida:

```txt
Agregar proxy autenticado backend.
```

No lo haría antes de B7 salvo que sea necesario.

---

## IMP-8 — `DriveUploadError` se reenvuelve en controller y pierde mensaje original

### Archivo

```txt
backend/src/api/controllers/pedido.controller.js
```

### Evidencia

```js
if (err.name === 'DriveUploadError') {
  return next(new DriveUploadError());
}
```

### Análisis

Esto no rompe funcionalidad. De hecho puede ser deseable para no exponer detalles de Google Drive al cliente.

Pero pierde contexto para logs si no se loguea internamente. En producción, cuando falle Drive, sería útil tener algún log interno sin exponerlo al usuario.

### Severidad

```txt
IMPORTANTE BAJA / OBSERVABILIDAD
```

### Fix opcional

```js
if (err.name === 'DriveUploadError') {
  console.error('[DRIVE_UPLOAD_ERROR]', err.message);
  return next(new DriveUploadError());
}
```

O usar logger.

Cuidado: no loguear tokens, secrets ni JSON OAuth.

---

# 4. Mejoras recomendadas

## MEJ-1 — Crear helper compartido de tests DB

### Prioridad

```txt
MEDIA
```

### Motivo

Hoy varios tests tienen helpers parecidos:

```txt
RUN_ID
limpieza
abrir tienda
pool.end
```

Como ya hay bastante testing DB-backed, conviene centralizar después de B7 o antes si se vuelve inmanejable.

### Propuesta

Crear:

```txt
backend/tests/helpers/db-test.helpers.js
```

con funciones como:

```js
crearRunId(prefix)
asegurarTiendaAbierta(pool)
limpiarPedidosPorRunId(pool, runId)
cerrarPoolSeguro(pool)
```

No es bloqueante para B7.

---

## MEJ-2 — Documentar política de refresh token OAuth

### Prioridad

```txt
MEDIA
```

### Motivo

Ya migraste a OAuth de usuario con Gmail común. Conviene que `SECRETS.md` o `DEPLOY.md` tenga una sección operacional:

```txt
Si Drive falla con invalid_grant:
1. Ejecutar script de refresh token.
2. Actualizar GOOGLE_OAUTH_REFRESH_TOKEN en Railway.
3. Redeploy.
4. Probar comprobante.
```

### Estado

La documentación de OAuth está bastante bien, pero agregaría una mini sección “recuperación de token” orientada a operación.

---

## MEJ-3 — Decidir si B7 necesita proxy de comprobantes

### Prioridad

```txt
MEDIA
```

### Recomendación

Para B7 inicial:

```txt
metadata + link Drive
```

Para etapa futura:

```txt
proxy autenticado
```

---

## MEJ-4 — Revisar root `.gitignore`

### Prioridad

```txt
ALTA PREVENTIVA
```

### Motivo

El `.gitignore` raíz actual es mínimo:

```txt
.atl/
```

Dependés de `.gitignore` internos. Funciona parcialmente, pero para evitar accidentes conviene ignorar globalmente:

```txt
.env
.env.*
!.env.example
node_modules/
.next/
dist/
coverage/
*.zip
*.pem
*.key
credentials/
drive-credentials.json
```

---

# 5. Buenas decisiones detectadas

## OK-1 — Migración OAuth está correctamente aplicada

### Archivo

```txt
backend/src/api/services/drive.service.js
```

### Evidencia

Usa:

```js
const oauth2Client = new google.auth.OAuth2(oauthClientId, oauthClientSecret);
oauth2Client.setCredentials({ refresh_token: oauthRefreshToken });
driveClient = google.drive({ version: 'v3', auth: oauth2Client });
```

No usa:

```txt
google.auth.GoogleAuth
GOOGLE_DRIVE_CREDENTIALS_JSON
Service Account JSON
```

### Veredicto

```txt
BIEN APLICADO
```

---

## OK-2 — Variables OAuth están centralizadas

### Archivo

```txt
backend/src/api/config/environments.js
backend/.env.example
DOCUMENTACION/IA/SECRETS.md
DOCUMENTACION/IA/DEPLOY.md
```

### Evidencia

Se usan:

```txt
GOOGLE_DRIVE_FOLDER_ID
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_REFRESH_TOKEN
```

y `GOOGLE_DRIVE_CREDENTIALS_JSON` figura como deprecada.

### Veredicto

```txt
BIEN APLICADO
```

---

## OK-3 — `DriveUploadError` tipado existe y mapea a 503

### Archivos

```txt
backend/src/api/utils/errors.js
backend/src/api/services/drive.service.js
backend/src/api/middlewares/error.middleware.js
```

### Evidencia

`DriveUploadError` extiende `AppError` con status 503 y `name = 'DriveUploadError'`.

`drive.service.js` convierte fallos de Drive a `DriveUploadError`.

`error.middleware.js` reconoce `err.name === 'DriveUploadError'` y devuelve 503.

### Veredicto

```txt
BIEN APLICADO
```

---

## OK-4 — Magic bytes implementados

### Archivo

```txt
backend/src/api/utils/file-signature.utils.js
```

### Evidencia

Valida:

```txt
PDF  → %PDF
PNG  → 89 50 4E 47
JPEG → FF D8 FF
WEBP → RIFF + WEBP offset 8
```

### Veredicto

```txt
BIEN APLICADO PARA MVP
```

No reemplaza un antivirus, pero para MVP está bien.

---

## OK-5 — Middleware order correcto

### Archivo

```txt
backend/src/api/routes/pedido.routes.js
```

### Evidencia

```js
uploadComprobante.single('comprobante')
validateBody(createPedidoSchema)
assertMagicBytes
crear
```

### Veredicto

```txt
BIEN APLICADO
```

Multer parsea multipart, Zod valida body, luego magic bytes valida buffer y recién después entra al controller.

---

## OK-6 — `handleMulterError` está montado en app

### Archivo

```txt
backend/src/app.js
```

### Evidencia

```js
app.use('/api', indexRoutes);
app.use(handleMulterError);
app.use(errorMiddleware);
```

### Veredicto

```txt
BIEN APLICADO
```

---

## OK-7 — Preflight `assertStoreOpen` antes del upload

### Archivos

```txt
backend/src/api/controllers/pedido.controller.js
backend/src/api/models/pedido.model.js
```

### Evidencia

```js
const pool = getPool();
await assertStoreOpen(pool);
...
const driveResult = await driveUploadFile(...)
```

### Veredicto

```txt
BIEN APLICADO
```

Esto reduce huérfanos por tienda cerrada/demo.

---

## OK-8 — Nombre interno seguro en Drive

### Archivo

```txt
backend/src/api/services/drive.service.js
```

### Evidencia

```js
const timestamp = Date.now();
const uuid = crypto.randomUUID();
const safeName = sanitizeFileName(originalName);
const internalName = `${timestamp}-${uuid}-${safeName}`;
```

### Veredicto

```txt
BIEN APLICADO
```

Preserva `nombre_original` en DB y usa un nombre interno menos riesgoso.

---

## OK-9 — `Readable.from(buffer)` aplicado

### Archivo

```txt
backend/src/api/services/drive.service.js
```

### Evidencia

```js
const mediaBody = Buffer.isBuffer(buffer) ? Readable.from(buffer) : buffer;
```

### Veredicto

```txt
BIEN APLICADO
```

Esto evita errores típicos de `part.body.pipe is not a function`.

---

## OK-10 — Tests reales de Drive tienen opt-in

### Archivo

```txt
backend/tests/comprobantes.test.js
```

### Evidencia

```js
const RUN_REAL_DRIVE_TESTS = process.env.RUN_REAL_DRIVE_TESTS === 'true';
const DRIVE_READY = isDriveReady();
const DRIVE_CONFIGURED = RUN_REAL_DRIVE_TESTS && DRIVE_READY;
```

### Veredicto

```txt
BIEN APLICADO
```

Solo falta actualizar el comentario viejo.

---

## OK-11 — Script de ZIP de auditoría está bien diseñado

### Archivo

```txt
scripts/crear_zip_auditoria.sh
```

### Evidencia

Excluye artefactos pesados y sensibles, y verifica post-generación.

### Veredicto

```txt
BIEN APLICADO
```

El problema está en que el ZIP auditado no parece haber sido generado con ese script.

---

# 6. Checklist de corrección

Antes de B7, recomiendo cerrar:

```txt
[ ] Generar ZIP limpio con scripts/crear_zip_auditoria.sh.
[ ] Confirmar ZIP sin node_modules, .next, .env, zips previos ni credenciales.
[ ] Actualizar TESTING.md de 186 a 187 tests.
[ ] Quitar o corregir referencia a backend/tests/helpers/setup.js si no existe.
[ ] Corregir comentario viejo en comprobantes.test.js sobre Drive real.
[ ] Robustecer root .gitignore.
[ ] Agregar .env/.env.* a frontend/.gitignore.
[ ] Documentar recuperación de GOOGLE_OAUTH_REFRESH_TOKEN si aparece invalid_grant.
[ ] Decidir en B7 cómo mostrar comprobante: metadata/link Drive o proxy autenticado.
```

---

# 7. Preguntas antes de B7

## 7.1 — ¿El backend está listo para que B7 consuma `POST /api/pedidos` multipart sin cambios de contrato?

```txt
Sí, con alta probabilidad.
```

Contrato estable:

```txt
POST /api/pedidos
Content-Type: multipart/form-data

nombre_cliente
metodo_pago
items como JSON string
comprobante para transferencia
```

Respuesta esperada:

```txt
201
estado_pago = comprobante_subido
comprobante_archivo_id != null
```

No veo necesidad de cambiar contrato antes de B7.

---

## 7.2 — ¿Hay riesgo pendiente por OAuth refresh token, logs o links Drive?

Sí, pero manejables:

```txt
OAuth refresh token:
- persistente si app está en producción y se usa regularmente;
- puede ser revocado o dar invalid_grant;
- documentar runbook de regeneración.

Logs:
- app.js ya evita logs de producción.
- bien.

Links Drive:
- webViewLink puede requerir permisos;
- B7 debe contemplar que el link quizá no sea visible para todos.
```

---

## 7.3 — ¿El endpoint admin de comprobante alcanza para B7 o conviene proxy?

Para B7 inicial, alcanza si aceptás:

```txt
metadata + url_publica/webViewLink
```

Pero si querés que cualquier admin autenticado vea el archivo sin depender de permisos de Drive, necesitás:

```txt
proxy autenticado backend
```

Mi recomendación:

```txt
B7 inicial: usar metadata/link.
Post-B7 o B7.x: agregar proxy si la experiencia admin lo necesita.
```

---

## 7.4 — ¿La validación magic bytes es suficiente para MVP?

```txt
Sí.
```

Para el evento y comprobantes simples, validar MIME + tamaño + magic bytes es suficiente para MVP.

No es antivirus. No detecta archivos maliciosos embebidos dentro de PDFs reales. Pero como los archivos se guardan en Drive y no se ejecutan en el servidor, el riesgo es aceptable.

---

## 7.5 — ¿La deuda de archivos huérfanos en Drive es aceptable para el evento?

```txt
Sí, si está documentada.
```

Ya se redujo el caso evitable de tienda cerrada con `assertStoreOpen` antes del upload.

Todavía puede quedar huérfano si:

```txt
upload Drive OK
DB transaction falla por stock o constraint
```

Para MVP es aceptable. Después del evento se puede limpiar manualmente.

---

## 7.6 — ¿La documentación IA y OpenSpec están alineados con código real?

```txt
Bastante sí, con detalles menores.
```

Hay buena alineación en:

```txt
OAuth Drive
DriveUploadError
magic bytes
preflight
tests
secrets
deploy
```

Pendientes:

```txt
TESTING.md conteo 186 vs 187
helpers/setup.js inexistente
comentario obsoleto en comprobantes.test.js
```

---

## 7.7 — ¿El ZIP de auditoría está limpio y no expone secretos?

```txt
Parcial.
```

No encontré `.env`, eso está bien.

Pero el ZIP no está limpio porque incluye:

```txt
node_modules/
.next/
```

Hay que regenerarlo con el script.

---

## 7.8 — ¿Hay algo que bloquee avanzar a B7?

No encontré un bug funcional fuerte que bloquee B7.

Pero por orden y prolijidad, recomiendo una micro-etapa:

```txt
B6.3.2 — Limpieza final post-OAuth pre-B7
```

No debería ser una etapa grande.

---

# 8. Prompt para OpenCode — B6.3.2 micro-limpieza post-OAuth

```txt
Continuemos con Kermingo. La auditoría B6.3.1 post-OAuth confirmó que el backend de comprobantes/Google Drive está funcionalmente bien encaminado y casi listo para B7, pero detectó micro-ajustes de proceso, documentación y seguridad preventiva.

# Etapa B6.3.2 — Micro-limpieza post-OAuth pre-B7

No implementar frontend todavía.
No cambiar contrato de API salvo que sea estrictamente necesario.
No tocar diseno-de-landing-kermingo/.

## Objetivo

Cerrar detalles menores antes de avanzar a B7:

1. Generar ZIP limpio con scripts/crear_zip_auditoria.sh.
   - Debe excluir .env, .env.local, node_modules, .next, coverage, dist, credentials, zips previos.
   - Verificar que el script falle si encuentra archivos sensibles o pesados.

2. Actualizar DOCUMENTACION/IA/TESTING.md:
   - cambiar 186 tests a 187 tests si ese es el resultado real actual.
   - aclarar que el conteo exacto se valida con npm test.
   - documentar `RUN_REAL_DRIVE_TESTS=true npm test -- --testPathPattern=comprobantes.test`.
   - eliminar o corregir referencia a backend/tests/helpers/setup.js si no existe.

3. Corregir comentario superior en backend/tests/comprobantes.test.js:
   - reemplazar "When Drive IS configured, uploads go to real Google Drive" por:
     "Real Google Drive is used only when RUN_REAL_DRIVE_TESTS=true and OAuth credentials are configured."

4. Robustecer .gitignore raíz y frontend/.gitignore:
   - .env
   - .env.*
   - !.env.example
   - node_modules/
   - .next/
   - dist/
   - coverage/
   - *.zip
   - *.pem
   - *.key
   - credentials/
   - drive-credentials.json

5. Documentar runbook de recuperación de OAuth refresh token:
   - si Drive falla con invalid_grant/token revoked:
     1. ejecutar script de generación de refresh token
     2. actualizar GOOGLE_OAUTH_REFRESH_TOKEN en Railway
     3. redeploy backend
     4. probar transferencia + comprobante

6. Definir en documentación B7 cómo se verá el comprobante:
   - B7 inicial: metadata + url_publica/webViewLink
   - futuro: proxy autenticado si hace falta

## Verificación

Ejecutar:

```bash
cd backend
npm test
RUN_REAL_DRIVE_TESTS=true npm test -- --testPathPattern=comprobantes.test
```

Generar ZIP:

```bash
bash scripts/crear_zip_auditoria.sh
```

Verificar que el ZIP no contiene:

```txt
.env
.env.local
node_modules
.next
coverage
dist
credentials
drive-credentials.json
*.zip
```

## Resultado esperado

Responder con:

```txt
## Resultado B6.3.2 — Micro-limpieza post-OAuth pre-B7

Archivos modificados:
-

Cambios documentación:
-

Cambios tests/comentarios:
-

Cambios .gitignore:
-

ZIP generado:
-

Verificación ZIP:
-

Resultado npm test:
-

Resultado Drive real:
-

Pendientes:
-

Bloquea avance a B7:
si/no

Veredicto:
-
```
```

---

# 9. Veredicto final

```txt
¿Backend B6.3/B6.3.1 post-OAuth está funcionalmente implementado?
SÍ.

¿POST /api/pedidos multipart está listo para B7?
SÍ.

¿Google Drive OAuth está correctamente integrado?
SÍ.

¿Validación de archivos es suficiente para MVP?
SÍ.

¿Tests declarados pasan?
Según evidencia local: SÍ, 187/187 y Drive real 18/18.
No reproducible en sandbox sin MySQL.

¿ZIP de auditoría está limpio?
NO. Incluye node_modules y .next.

¿Documentación está alineada?
PARCIAL. Hay detalles menores.

¿Hay bug crítico que bloquee B7?
NO encontré.

¿Conviene avanzar directo a B7?
Podés avanzar, pero recomiendo hacer primero una micro-limpieza B6.3.2.
```

## Recomendación final

Mi recomendación práctica:

```txt
1. Hacer B6.3.2 micro-limpieza.
2. Generar ZIP limpio.
3. Si npm test sigue 187/187 y Drive real 18/18, cerrar backend.
4. Avanzar a B7 frontend.
```

Si estás muy justo de tiempo, no veo un bug backend fuerte que bloquee arrancar B7 en paralelo, pero **no haría merge final ni deploy preproducción hasta cerrar la limpieza del ZIP/docs/gitignore**.
