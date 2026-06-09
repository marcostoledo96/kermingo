# Secrets — Kermingo

> Dónde están las credenciales y variables de entorno.
> NUNCA commitear `.env` con valores reales.

---

## Índice

1. [Archivo .env del backend](#1-archivo-env-del-backend)
2. [Variables en Railway (producción)](#2-variables-en-railway-producción)
3. [Variables en Vercel (producción)](#3-variables-en-vercel-producción)
4. [Template .env.example](#4-template-envexample)
5. [Google Drive API (futuro)](#5-google-drive-api-futuro)

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
```

**Regla:** Al agregar una nueva variable, actualizar `.env.example` con un comentario explicativo. Nunca poner valores reales de producción.

---

## 5. Google Drive API (futuro)

La integración con Google Drive para subir imágenes y comprobantes aún no está implementada. Cuando se implemente, se agregarán:

| Variable | Descripción |
|---|---|
| `GOOGLE_DRIVE_CLIENT_ID` | Client ID de Google Cloud |
| `GOOGLE_DRIVE_CLIENT_SECRET` | Client secret |
| `GOOGLE_DRIVE_REDIRECT_URI` | URI de callback OAuth |
| `GOOGLE_DRIVE_FOLDER_ID` | ID de carpeta de Drive para almacernar archivos |

**Tabla existente:** `archivo_drive` ya tiene los campos necesarios (`drive_id`, `nombre_original`, `mime_type`, `tamanio_bytes`, `tipo`, `url_publica`).