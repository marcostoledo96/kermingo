# 15 — Variables de entorno

## Backend `.env.example`

```env
NODE_ENV=development
PORT=3000

FRONTEND_URL=http://localhost:3000
FRONTEND_URL_PRODUCTION=https://kermingo.vercel.app

DB_HOST=localhost
DB_PORT=3306
DB_NAME=kermingo
DB_USER=root
DB_PASSWORD=

JWT_SECRET=poner_un_secret_largo
JWT_EXPIRES_IN=24h
COOKIE_NAME=kermingo_admin_token

GOOGLE_DRIVE_CREDENTIALS_PATH=./credentials/drive-credentials.json
GOOGLE_DRIVE_CREDENTIALS_JSON=
GOOGLE_DRIVE_FOLDER_PRODUCTOS=
GOOGLE_DRIVE_FOLDER_COMPROBANTES=

MAX_FILE_SIZE_MB=10
```

## Frontend `.env.local.example`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Producción frontend Vercel

```env
NEXT_PUBLIC_API_URL=https://kermingo-backend.up.railway.app/api
NEXT_PUBLIC_APP_URL=https://kermingo.vercel.app
```

## Producción backend Railway

```env
NODE_ENV=production
FRONTEND_URL=https://kermingo.vercel.app
```

## Seguridad

No subir a Git:

```txt
.env
.env.local
credentials/
drive-credentials.json
```
