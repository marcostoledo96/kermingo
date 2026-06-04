# 14 — Deploy Railway + Vercel

## Frontend

Deploy en Vercel desde carpeta:

```txt
frontend/
```

Framework:

```txt
Next.js
```

Variables Vercel:

```txt
NEXT_PUBLIC_API_URL=https://kermingo-backend.up.railway.app/api
NEXT_PUBLIC_APP_URL=https://kermingo.vercel.app
```

## Backend

Deploy en Railway desde carpeta:

```txt
backend/
```

Comando start:

```txt
npm start
```

Variables Railway:

```txt
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://kermingo.vercel.app

DB_HOST=...
DB_NAME=...
DB_USER=...
DB_PASSWORD=...
DB_PORT=3306

JWT_SECRET=...
COOKIE_NAME=kermingo_admin_token

GOOGLE_DRIVE_CREDENTIALS_JSON=...
GOOGLE_DRIVE_FOLDER_PRODUCTOS=...
GOOGLE_DRIVE_FOLDER_COMPROBANTES=...
```

## MySQL Railway

Crear servicio MySQL en Railway.

Luego cargar:

```txt
schema.sql
seed.sql
```

## CORS producción

Backend solo debe permitir:

```txt
https://kermingo.vercel.app
```

Y local:

```txt
http://localhost:3000
```

## Cookies cross-site

En producción:

```txt
sameSite: none
secure: true
```

## Checklist deploy

1. crear MySQL Railway
2. configurar variables DB
3. probar `/api/health`
4. cargar schema
5. cargar seed
6. deploy backend
7. configurar Vercel frontend
8. configurar `NEXT_PUBLIC_API_URL`
9. probar login
10. probar pedido completo
11. probar cookie admin
12. probar CORS
13. probar subida de imagen/comprobante
14. probar stock
15. probar Excel
