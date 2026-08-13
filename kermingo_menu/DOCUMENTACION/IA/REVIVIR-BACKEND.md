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

El seed contiene una credencial pública de demo. No expongas el backend con ese hash.

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
3. Mantener Express y MySQL sin exposición pública mientras se rota la credencial admin.
4. Desde `backend/`, identificar el usuario a rotar sin leer hashes: `mysql -u root -p kermingo -e "SELECT id,nombre,email,activo FROM usuario;"`.
5. Generar y aplicar un hash bcrypt único. Este proceso pide la contraseña de forma oculta y no guarda el texto plano en el historial:

```bash
(
set -e
read -rp 'ID del admin: ' ADMIN_ID
read -rsp 'Nueva contraseña admin: ' ADMIN_PASSWORD; printf '\n'
read -rsp 'Repetir contraseña: ' ADMIN_PASSWORD_CONFIRM; printf '\n'
[[ "$ADMIN_ID" =~ ^[1-9][0-9]*$ ]] || { unset ADMIN_ID; false; }
test "$ADMIN_PASSWORD" != 'admin123' || { unset ADMIN_PASSWORD ADMIN_PASSWORD_CONFIRM ADMIN_ID; false; }
test "$ADMIN_PASSWORD" = "$ADMIN_PASSWORD_CONFIRM" || { unset ADMIN_PASSWORD ADMIN_PASSWORD_CONFIRM ADMIN_ID; false; }
ADMIN_HASH=$(printf '%s' "$ADMIN_PASSWORD" | node --input-type=module -e "import bcrypt from 'bcrypt'; let value=''; for await (const chunk of process.stdin) value += chunk; process.stdout.write(await bcrypt.hash(value, 10))")
unset ADMIN_PASSWORD ADMIN_PASSWORD_CONFIRM
mysql -u root -p kermingo -e "UPDATE usuario SET contrasenia_hash='${ADMIN_HASH}' WHERE id=${ADMIN_ID};"
unset ADMIN_HASH ADMIN_ID
)
```

6. Verificar el login nuevo contra el backend todavía privado/local y confirmar que la contraseña pública `admin123` ya no autentica.
7. Recién entonces configurar secrets (ver `SECRETS.md`) y habilitar la URL pública del backend.
8. En Vercel: `NEXT_PUBLIC_MOCK_API=false` y `NEXT_PUBLIC_API_URL=<url-backend>`.
9. Actualizar `DEPLOY.md` con la nueva arquitectura.

La rotación y ambas verificaciones de login son un gate obligatorio previo a cualquier exposición pública.

## 6. Google Drive

Si no configurás OAuth, imágenes/comprobantes reales no funcionan; el demo usa `frontend/public/products/`.
