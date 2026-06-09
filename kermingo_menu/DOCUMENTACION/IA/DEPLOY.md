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

### Backend (`.env` en `backend/`)

| Variable | Ambiente | Producción | Descripción |
|---|---|---|---|
| `PORT` | `3001` | Puerto del servidor | Puerto donde escucha Express |
| `NODE_ENV` | `development` | `production` | Controla `sameSite`, `secure`, stack traces |
| `FRONTEND_URL` | `http://localhost:3000` | `https://kermingo.vercel.app` | URL del frontend (CORS y CSRF) |
| `DB_HOST` | localhost | Host de Railway | Host de MySQL |
| `DB_PORT` | `3306` | Puerto de MySQL | Puerto de MySQL |
| `DB_USER` | root | Usuario de Railway | Usuario de MySQL |
| `DB_PASSWORD` | — | Password de Railway | Contraseña de MySQL |
| `DB_NAME` | `kermingo` | Nombre de la BD | Nombre de la base de datos |
| `JWT_SECRET` | `kermingo-dev-secret-...` | **Obligatorio** | Secret para firmar JWT |
| `COOKIE_NAME` | `kermingo_admin_token` | Nombre de la cookie | Cookie JWT |
| `JWT_EXPIRES_IN` | `24h` | Tiempo de expiración | Expiración del token |

### Variables opcionales (futuro)

| Variable | Descripción |
|---|---|
| `GOOGLE_DRIVE_CLIENT_ID` | Client ID de Google Drive API |
| `GOOGLE_DRIVE_CLIENT_SECRET` | Client secret |
| `GOOGLE_DRIVE_REDIRECT_URI` | URI de callback |
| `GOOGLE_DRIVE_FOLDER_ID` | ID de carpeta en Drive |

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
- **Migraciones:** Ejecutar `schema.sql` + `indexes.sql` + `seed.sql` en orden la primera vez.
- **Reset completo:** `DROP DATABASE` + `CREATE DATABASE` + `schema.sql` + `indexes.sql` + `seed.sql`.

**Conexión desde tests:** Los tests de integración usan la misma DB configurada en `.env`. Se recomienda una DB separada para testing si es posible.