# Prompt de auditoría para ChatGPT 5.5 — Kermingo B6.3.1 post-OAuth

> Copiá este archivo entero y pegalo en ChatGPT 5.5 (modo GPT-5.5, reasoning alto).
> Adjuntá el ZIP completo del proyecto, generado sin `.env`, `node_modules/`, `.next/`, `coverage/`, `dist/`, credenciales ni zips previos.
>
> Objetivo: auditar el cierre backend de **B6.3 + B6.3.1 + migración Google Drive OAuth**, y decidir si está listo para avanzar a **B7 frontend**.

---

## 1. Qué es Kermingo

Kermingo es un sistema web para un evento scout recaudatorio del **20 de junio de 2026**.

- Dirección: **Echeverría 3920**.
- Organiza: **Grupo Scout San Patricio**.
- Backend: Express + MySQL + API REST + JWT + MVC + Zod + Multer + Google Drive API.
- Frontend: Next.js + React + TypeScript + TailwindCSS en `frontend/`.
- Referencia visual: `diseno-de-landing-kermingo/` (v0, solo lectura; no modificar).
- DB: MySQL Railway/local con `mysql2/promise`, tablas y campos técnicos en español, singular, sin tildes.

---

## 2. Rama y objetivo de esta auditoría

Rama auditada:

```txt
feature/backend-b6-1-cocina-review-fixes
```

Auditar el estado posterior a:

1. **B6.3 — Comprobantes / Google Drive**
   - `POST /api/pedidos` acepta comprobante multipart para transferencias.
   - Metadata en `archivo_drive`.
   - `estado_pago = comprobante_subido`.
   - Endpoint admin `GET /api/admin/pedidos/:id/comprobante`.

2. **B6.3.1 — Hardening pre-B7**
   - `DriveUploadError` tipado → 503.
   - Magic bytes para PDF/PNG/JPEG/WEBP.
   - Nombre interno seguro en Drive.
   - Preflight `assertStoreOpen` antes de upload.
   - Tests determinísticos con `--runInBand`.
   - ZIP de auditoría sin secretos ni `node_modules`.
   - Logs reducidos en producción.

3. **Migración Drive Service Account → OAuth de usuario**
   - Se dejó de usar `GOOGLE_DRIVE_CREDENTIALS_JSON`.
   - Se usa OAuth con refresh token:
     - `GOOGLE_DRIVE_FOLDER_ID`
     - `GOOGLE_OAUTH_CLIENT_ID`
     - `GOOGLE_OAUTH_CLIENT_SECRET`
     - `GOOGLE_OAUTH_REFRESH_TOKEN`
   - Motivo: las Service Accounts no tienen cuota de almacenamiento propia en Drive común.

---

## 3. Evidencia de verificación ya ejecutada

### 3.1 Tests backend completos

```txt
cd backend
npm test

Test Suites: 12 passed, 12 total
Tests:       187 passed, 187 total
Snapshots:   0 total
```

### 3.2 Test real de Google Drive OAuth

```txt
RUN_REAL_DRIVE_TESTS=true npm test -- --testPathPattern=comprobantes.test

PASS tests/comprobantes.test.js
Tests: 18 passed, 18 total
```

La salida confirma:

```txt
[DRIVE] Google Drive service initialized successfully (OAuth).
```

Casos reales verificados:

- transferencia con comprobante real → `201`.
- `estado_pago = comprobante_subido`.
- metadata admin → `200`.
- transiciones `comprobante_subido → pagado|rechazado` OK.
- archivo real subido a Drive y visible/abrible.

---

## 4. Archivos clave a auditar

### Backend Drive / comprobantes

```txt
backend/src/api/services/drive.service.js
backend/src/api/middlewares/upload.middleware.js
backend/src/api/utils/file-signature.utils.js
backend/src/api/utils/errors.js
backend/src/api/controllers/pedido.controller.js
backend/src/api/models/pedido.model.js
backend/src/api/models/archivo.model.js
backend/src/api/routes/pedido.routes.js
backend/src/api/schemas/pedido.schema.js
backend/src/api/config/environments.js
backend/src/app.js
```

### Tests

```txt
backend/tests/comprobantes.test.js
backend/tests/comprobantes.drive-mock.test.js
backend/tests/comprobantes.unit.test.js
backend/tests/caja.test.js
backend/tests/cocina*.test.js
backend/tests/configuracion*.test.js
backend/tests/health.test.js
```

### Infra / documentación

```txt
backend/.env.example
backend/package.json
scripts/crear_zip_auditoria.sh
DOCUMENTACION/IA/API.md
DOCUMENTACION/IA/CORE.md
DOCUMENTACION/IA/INFRA.md
DOCUMENTACION/IA/SECRETS.md
DOCUMENTACION/IA/TESTING.md
DOCUMENTACION/IA/GOTCHAS.md
DOCUMENTACION/IA/FLUJOS.md
DOCUMENTACION/IA/DEPLOY.md
openspec/specs/**
openspec/changes/archive/**
```

---

## 5. Contrato funcional esperado

### 5.1 Pedido público con transferencia

Endpoint:

```txt
POST /api/pedidos
Content-Type: multipart/form-data
```

Campos:

```txt
nombre_cliente: string requerido
metodo_pago: transferencia
items: JSON string con [{"producto_id": number, "cantidad": number}]
comprobante: archivo PDF/PNG/JPEG/WEBP requerido
mesa: opcional
telefono_cliente: opcional
observaciones: opcional
```

Esperado:

```txt
201 Created
estado_pago = comprobante_subido
comprobante_archivo_id != null
fila en archivo_drive
archivo en Google Drive
```

### 5.2 Pedido público efectivo

- No debe aceptar comprobante.
- Debe quedar `estado_pago = pendiente`.

### 5.3 Caja rápida

- Puede crear transferencia sin comprobante si el admin la marca pagada.
- No debe quedar obligada por el flujo público de comprobantes.

### 5.4 Admin comprobante

Endpoint:

```txt
GET /api/admin/pedidos/:id/comprobante
```

Debe:

- requerir admin.
- devolver metadata segura.
- no devolver bytes del archivo.
- permitir al frontend B7 mostrar/usar el link o metadata.

---

## 6. Aspectos técnicos específicos a revisar

### 6.1 OAuth Drive

Verificar en `drive.service.js`:

- usa `google.auth.OAuth2`.
- llama `oauth2Client.setCredentials({ refresh_token })`.
- no usa `google.auth.GoogleAuth` ni Service Account JSON.
- conserva `Readable.from(buffer)` para subir buffers de Multer.
- envía a Drive un nombre interno seguro.
- preserva `nombre_original` en DB.
- todo error de Drive se convierte en `DriveUploadError`.

### 6.2 Variables de entorno

Verificar en `environments.js`, `.env.example`, `SECRETS.md`, `DEPLOY.md`:

```txt
GOOGLE_DRIVE_FOLDER_ID
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_REFRESH_TOKEN
```

Verificar que `GOOGLE_DRIVE_CREDENTIALS_JSON` esté marcado como deprecado o eliminado como configuración actual.

### 6.3 Upload seguro

Verificar:

- Multer `memoryStorage`.
- máximo 5 MB.
- MIME allowlist: jpg/jpeg/png/webp/pdf.
- magic bytes reales:
  - PDF `%PDF`
  - PNG `89 50 4E 47`
  - JPEG `FF D8 FF`
  - WEBP `RIFF....WEBP`

### 6.4 Orden middleware

En `pedido.routes.js`, el orden debe ser:

```txt
uploadComprobante.single('comprobante')
validateBody(createPedidoSchema)
assertMagicBytes
crear
```

### 6.5 Transacciones y huérfanos

Revisar:

- `assertStoreOpen(pool)` antes de subir a Drive.
- upload a Drive antes de transacción DB.
- `archivo_drive` se inserta dentro de la transacción del pedido.
- si falla DB después de upload, puede quedar archivo huérfano en Drive (deuda aceptada/documentada).

### 6.6 Tests

Verificar:

- `npm test` corre con `--runInBand`.
- tests reales Drive solo si `RUN_REAL_DRIVE_TESTS=true`.
- mock tests no tocan Drive real.
- tests cubren 400/409/503 y success path.

### 6.7 ZIP de auditoría

Verificar `scripts/crear_zip_auditoria.sh`:

- excluye `.env`, `.env.local`, `node_modules/`, `.next/`, `coverage/`, `dist/`, `credentials/`, `drive-credentials.json`, zips previos.
- hace verificación post-generación.

---

## 7. Preguntas concretas para responder

1. ¿El backend está listo para que B7 consuma `POST /api/pedidos` multipart sin cambios de contrato?
2. ¿Hay algún riesgo de seguridad pendiente por OAuth refresh token, logs o links de Drive?
3. ¿El endpoint admin de comprobante alcanza para B7 o conviene agregar proxy autenticado antes?
4. ¿La validación magic bytes es suficiente para MVP?
5. ¿La deuda de archivos huérfanos en Drive es aceptable para el evento?
6. ¿La documentación IA y OpenSpec están alineados con el código real?
7. ¿El ZIP de auditoría está limpio y no expone secretos?
8. ¿Hay algo que bloquee avanzar a B7?

---

## 8. Formato de respuesta esperado

Respondé con:

```txt
## Resumen ejecutivo

## Errores críticos
- CRIT-1 ...

## Errores importantes
- IMP-1 ...

## Mejoras recomendadas
- MEJ-1 ...

## Buenas decisiones detectadas
- OK-1 ...

## Checklist de corrección
- [ ] ...

## Preguntas antes de B7
- ...

## Veredicto final
¿Listo para B7?: sí/no
Condiciones: ...
```

Si algo está bien, decilo explícitamente. Si algo bloquea B7, indicá el archivo exacto, evidencia y fix recomendado.

---

## 9. Veredicto esperado local antes de auditoría

Según la verificación local ya ejecutada:

```txt
Backend tests: PASS (187/187)
Drive OAuth real: PASS (18/18 con RUN_REAL_DRIVE_TESTS=true)
Imagen real subida y abrible en Drive: PASS
Backend dev: levanta después de liberar puerto 3001
```

La auditoría debe validar si esto alcanza para pasar a B7 o si recomienda un micro-hardening adicional.
