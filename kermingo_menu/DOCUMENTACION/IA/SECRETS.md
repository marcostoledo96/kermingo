# Secrets — Kermingo

> Dónde están las credenciales y variables de entorno.
> NUNCA commitear `.env` con valores reales.

---

## Índice

1. [Archivo .env del backend](#1-archivo-env-del-backend)
2. [Variables en Railway (producción)](#2-variables-en-railway-producción)
3. [Variables en Vercel (producción)](#3-variables-en-vercel-producción)
4. [Template .env.example](#4-template-envexample)
5. [Google Drive API (B6.3 implementado)](#5-google-drive-api-b63-implementado)

---

## 1. Archivo .env del backend

**Ubicación:** `backend/.env`

**Estado:** No se commitea (está en `.gitignore`).

**Contiene:**

| Variable | Requerida | Descripción |
|---|---|---|
| `PORT` | No (default 3001) | Puerto del servidor |
| `NODE_ENV` | No (default development) | `development` o `production` |
| `FRONTEND_URL` | No (default localhost:3000) | URL del frontend para CORS y CSRF |
| `DB_HOST` | Sí en prod | Host de MySQL |
| `DB_PORT` | No (default 3306) | Puerto de MySQL |
| `DB_USER` | Sí en prod | Usuario de MySQL |
| `DB_PASSWORD` | Sí en prod | Contraseña de MySQL |
| `DB_NAME` | Sí en prod | Nombre de la base de datos |
| `JWT_SECRET` | Sí en prod | Secret para firmar JWT |
| `COOKIE_NAME` | No (default kermingo_admin_token) | Nombre de la cookie JWT |
| `JWT_EXPIRES_IN` | No (default 24h) | Expiración del token |
| `GOOGLE_DRIVE_CREDENTIALS_JSON` | **Deprecada** | ~~JSON string de Service Account~~ — ya no se usa |
| `GOOGLE_DRIVE_FOLDER_ID` | Sí en prod | ID de la carpeta Drive destino |
| `GOOGLE_OAUTH_CLIENT_ID` | Sí en prod | Client ID de OAuth para Drive |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Sí en prod | Client Secret de OAuth para Drive |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | Sí en prod | Refresh token de OAuth para Drive |
| `DISABLE_REQUEST_LOG` | No | Si se setea, desactiva el log de requests en cualquier entorno |

---

## 2. Variables en Railway (producción)

Configurar en el dashboard de Railway como variables de entorno del servicio backend:

- Todas las variables requeridas de la tabla anterior.
- `NODE_ENV=production`
- `JWT_SECRET` con un valor aleatorio seguro.
- `FRONTEND_URL` con la URL real del frontend en Vercel.

Railway inyecta automáticamente `PORT` como variable de entorno interna.

---

## 3. Variables en Vercel (producción)

Configurar en el dashboard de Vercel como variables de entorno del proyecto frontend:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL del backend en Railway (ej: `https://kermingo-backend.up.railway.app`) |

---

## 4. Template .env.example

**Ubicación:** `backend/.env.example`

```
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=kermingo

JWT_SECRET=kermingo-dev-secret-cambia-en-produccion
COOKIE_NAME=kermingo_admin_token
JWT_EXPIRES_IN=24h

# Google Drive (opcional en dev, requerido en prod)
# Usa autenticación OAuth (refresh token), no Service Account.
# GOOGLE_DRIVE_CREDENTIALS_JSON está deprecado y no se usa más.
GOOGLE_DRIVE_FOLDER_ID=your-folder-id
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
GOOGLE_OAUTH_REFRESH_TOKEN=your-refresh-token

# Deshabilitar request log (opcional)
# DISABLE_REQUEST_LOG=true
```

**Regla:** Al agregar una nueva variable, actualizar `.env.example` con un comentario explicativo. Nunca poner valores reales de producción.

---

## 5. Google Drive API (B6.3 → OAuth migration)

La integración con Google Drive para subir comprobantes de pago está implementada (B6.3). Usa autenticación OAuth con refresh token (no Service Account).

| Variable | Descripción | Producción |
|---|---|---|
| `GOOGLE_DRIVE_FOLDER_ID` | ID de la carpeta Drive donde se almacenan los archivos | Requerida |
| `GOOGLE_OAUTH_CLIENT_ID` | Client ID de OAuth (Google Cloud Console) | Requerida |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Client Secret de OAuth (Google Cloud Console) | Requerida |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | Refresh token de OAuth (obtenido vía autorización) | Requerida |
| ~~`GOOGLE_DRIVE_CREDENTIALS_JSON`~~ | **Deprecada** — ya no se usa, era Service Account JSON | No usar |

**Cómo obtener las credenciales OAuth:**

1. Ir a Google Cloud Console → APIs & Services → Credentials.
2. Crear **OAuth client ID** (tipo "Web application"), no Service Account.
3. Configurar redirect URI (ej: `http://localhost` para obtener el refresh token).
4. Copiar Client ID y Client Secret.
5. Obtener el refresh token:
   - Autorizar la app con el scope `https://www.googleapis.com/auth/drive.file` usando el endpoint de OAuth.
   - Usar el código de autorización para obtener el refresh token.
6. Compartir la carpeta Drive con la cuenta de Google que autorizó el refresh token.
7. Copiar el folder ID de la URL de la carpeta.
8. En `.env` o Railway, setear las cuatro variables: `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN`.

**Nota:** La Service Account (`GOOGLE_DRIVE_CREDENTIALS_JSON`) está deprecada y ya no se lee. Si la config sigue existiendo en Railway o `.env`, no tiene efecto.

**Tabla existente:** `archivo_drive` ya tiene los campos necesarios (`drive_id`, `nombre_original`, `mime_type`, `tamanio_bytes`, `tipo`, `url_publica`).

**En desarrollo:** Si las variables OAuth faltan, el servidor arranca con warning. La subida de comprobantes devuelve 503.