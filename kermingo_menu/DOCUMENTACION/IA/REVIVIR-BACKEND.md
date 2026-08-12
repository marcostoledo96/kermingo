# Revivir el backend — Kermingo

> Cómo levantar Express + MySQL de nuevo después del modo demo / baja de Railway.

---

## 1. Requisitos

- Node.js 20+
- MySQL 8
- (Opcional) Google Drive OAuth si necesitás comprobantes/imágenes reales

## 2. Base de datos

### Opción A — Sistema vacío (recomendado para desarrollo)

```bash
cd backend
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS kermingo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p kermingo < src/api/database/schema.sql
mysql -u root -p kermingo < src/api/database/indexes.sql
mysql -u root -p kermingo < src/api/database/seed.sql
```

Admin seed: `admin@kermingo.com` / `admin123`

### Opción B — Snapshot anonimizado del evento

```bash
mysql -u root -p kermingo < src/api/database/archives/2026-07-28-prod-anonymized.sql
```

Ver `backend/src/api/database/archives/README.md`.

### Si tenés un dump RAW de Railway

1. Guardalo **fuera de git**.
2. Anonimizá:

```bash
node scripts/anonymize-dump.mjs /ruta/RAW.sql src/api/database/archives/YYYY-MM-DD-prod-anonymized.sql
```

3. Revisá PII a mano y recién ahí commiteá el anonymized.

## 3. Backend

```bash
cd backend
cp .env.example .env
# Completar DB_* JWT_SECRET FRONTEND_URL
npm install
npm run dev
```

Health: `GET http://localhost:3001/api/health`

## 4. Frontend contra API real

```bash
cd frontend
# .env.local
NEXT_PUBLIC_MOCK_API=false
NEXT_PUBLIC_API_URL=http://localhost:3001
pnpm install
pnpm dev
```

## 5. Deploy hospedado (opcional)

El código del backend **sigue en el repo** (`backend/`), documentado como apagado en producción demo.

Para volver a producción real:

1. Provisionar MySQL + Node (Railway u otro).
2. Restaurar schema/seed o archive.
3. Configurar secrets (ver `SECRETS.md`).
4. En Vercel: `NEXT_PUBLIC_MOCK_API=false` y `NEXT_PUBLIC_API_URL=<url-backend>`.
5. Actualizar `DEPLOY.md` con la nueva arquitectura.

## 6. Google Drive

Si no configurás OAuth, imágenes/comprobantes reales no funcionan; el demo usa `frontend/public/products/`.
