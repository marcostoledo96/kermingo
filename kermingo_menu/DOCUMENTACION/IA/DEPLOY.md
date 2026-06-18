# Deploy — Kermingo

> Leé este archivo cuando necesites hacer deploy, configurar variables de entorno,
> o entender la infraestructura de producción.

---

## Índice

1. [Arquitectura de deploy](#1-arquitectura-de-deploy)
2. [Backend — Railway](#2-backend--railway)
3. [Frontend — Vercel](#3-frontend--vercel)
4. [Variables de entorno](#4-variables-de-entorno)
5. [Health check](#5-health-check)
6. [Rollback](#6-rollback)
7. [Base de datos](#7-base-de-datos)

---

## 1. Arquitectura de deploy

```
[Internet]
    │
    ├── Vercel (frontend Next.js)
    │   └── frontend/ → build → CDN
    │
    └── Railway (backend Express + MySQL)
        └── backend/ → start → port 3001
```

- **Frontend:** Vercel sirve el build de Next.js. Root directory: `frontend`.
- **Backend:** Railway corre Express con MySQL en el mismo proyecto (o servicio vinculado).
- **Comunicación:** Frontend → Backend vía `FRONTEND_URL` (CORS) y `BACKEND_URL`.

---

## 2. Backend — Railway

| Aspecto | Valor |
|---|---|
| Plataforma | Railway |
| Comando start | `npm start` → `node src/server.js` |
| Puerto | `PORT` env var (default: 3001) |
| Node | ESM (`type: module`) |
| DB | MySQL en Railway (mismo proyecto o vinculado) |

**Health check:** `GET /api/health` devuelve `{ ok: true, data: { status: "ok", timestamp: "..." } }`.

---

## 3. Frontend — Vercel

| Aspecto | Valor |
|---|---|
| Plataforma | Vercel |
| Framework | Next.js |
| Root directory | `frontend` |
| Comando build | `pnpm build` |
| Comando dev | `pnpm dev` |

**Importante:** En Vercel, el root directory debe configurarse como `frontend`, no como la raíz del repo.

---

## 4. Variables de entorno

### Frontend (Vercel)

| Variable | Valor dev | Valor prod | Descripción |
|---|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | URL pública del backend en Railway | URL base del backend que consume el frontend (ver `frontend/lib/config.ts`). En producción **es obligatoria**: si falta o viene vacía, el frontend queda sin `API_BASE` y las rutas de imágenes/API no se resuelven correctamente. |
| `NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS` | No definida | `false` o no definir | Si se setea a `'true'`, muestra credenciales demo (`admin@kermingo.com` / `admin123`) en el login. En producción no debe estar definida o debe ser `'false'`. Ver `frontend/components/admin/login-screen.tsx`. |

**Template:** `frontend/.env.local.example`.

**Regla adicional:** en entorno `production`, validar antes del deploy que `NEXT_PUBLIC_API_URL` esté definida. El `prebuild` script (`scripts/check-env.mjs`) falla si `NODE_ENV=production` y `NEXT_PUBLIC_API_URL` no está definida, bloqueando el build.

### Backend (`.env` en `backend/` o vars en Railway)

| Variable | Ambiente | Producción | Descripción |
|---|---|---|---|---|
| `PORT` | `3001` | Puerto del servidor | Puerto donde escucha Express |
| `NODE_ENV` | `development` | `production` | Controla `sameSite`, `secure`, stack traces, request logging |
| `FRONTEND_URL` | `http://localhost:3000` | `https://kermingo.vercel.app` | URL del frontend (CORS y CSRF) |
| `DB_HOST` | localhost | Host de Railway | Host de MySQL |
| `DB_PORT` | `3306` | Puerto de Railway | Puerto de MySQL |
| `DB_USER` | root | Usuario de Railway | Usuario de MySQL |
| `DB_PASSWORD` | — | Password de Railway | Contraseña de MySQL |
| `DB_NAME` | `kermingo` | Nombre de la BD | Nombre de la base de datos |
| `JWT_SECRET` | `kermingo-dev-secret-...` | **Obligatorio** | Secret para firmar JWT |
| `COOKIE_NAME` | `kermingo_admin_token` | Nombre de la cookie | Cookie JWT |
| `JWT_EXPIRES_IN` | `24h` | Tiempo de expiración | Expiración del token |
| `GOOGLE_DRIVE_CREDENTIALS_JSON` | Opcional (warning) | **Deprecada** — ya no se usa, era Service Account |
| `GOOGLE_DRIVE_FOLDER_ID` | Opcional (warning) | **Obligatorio** | ID de la carpeta Drive destino |
| `GOOGLE_OAUTH_CLIENT_ID` | Opcional (warning) | **Obligatorio** | Client ID de OAuth para Drive |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Opcional (warning) | **Obligatorio** | Client Secret de OAuth para Drive |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | Opcional (warning) | **Obligatorio** | Refresh token de OAuth para Drive |
| `DISABLE_REQUEST_LOG` | Opcional | Opcional | Si se setea, desactiva el log de requests en cualquier entorno |

**Nota sobre request logging (B6.3.1):** En producción (`NODE_ENV=production`), el log de requests se desactiva automáticamente para evitar exponer query strings o tokens. En desarrollo se logea normalmente. Se puede deshabilitar en cualquier entorno con `DISABLE_REQUEST_LOG=true`.

**Template:** Ver `backend/.env.example`.

**Regla:** NUNCA commitear `.env`. Siempre usar `.env.example` como referencia.

---

## 5. Health check

```
GET /api/health
```

**Respuesta:**

```json
{
  "ok": true,
  "data": { "status": "ok", "timestamp": "2026-06-09T12:00:00.000Z" },
  "message": "Servidor operativo"
}
```

Railway puede usar este endpoint para verificar que el servidor está vivo.

---

## 6. Rollback

- **Railway:** Revertir el deploy a la revisión anterior desde el dashboard.
- **Vercel:** Revertir el PR individual o hacer redeploy de la commit anterior.
- **Práctica recomendada:** Cada PR/deploy es individual y reversible. No hacer `force push`.

---

## 7. Base de datos

- **Desarrollo:** MySQL local o Docker.
- **Producción:** MySQL en Railway (mismo proyecto que el backend).
- **Migraciones nuevas:** Ejecutar `schema.sql` + `indexes.sql` + `seed.sql` en orden la primera vez.
- **Migraciones manuales:** cambios de esquema con datos existentes (ej: agregar columnas con backfill) se ejecutan via scripts en `backend/src/api/database/migrations/manual/`. Ejemplo: `2026-06-17-product-admin-filtering-grouping-ordering.sql` agrega `producto.orden`, `producto.disponible`, `configuracion_tienda.categoria_default` con backfill.
- **Procedimiento de migración manual:** aplicar ALTER TABLE con columnas nullable → backfill datos (UPDATE) → ALTER a NOT NULL → crear índices. Este orden evita restricciones durante el backfill.
- **Rollback de migración manual:** revertir código primero, luego DROP COLUMN de las nuevas columnas e índices. Los datos existentes no se pierden.
- **Reset completo:** `DROP DATABASE` + `CREATE DATABASE` + `schema.sql` + `indexes.sql` + `seed.sql`.

**Conexión desde tests:** Los tests de integración usan la misma DB configurada en `.env`. Se recomienda una DB separada para testing si es posible.

---

## 8. OAuth refresh token — Recuperación

Si Google Drive devuelve `invalid_grant` o el refresh token fue revocado, ver el **Runbook de recuperación** completo en `SECRETS.md` sección 6.

Resumen rápido:

1. Generar nuevo refresh token (Google Cloud Console → OAuth playground).
2. Actualizar `GOOGLE_OAUTH_REFRESH_TOKEN` en Railway.
3. Redeploy backend.
4. Probar comprobante con transferencia.
