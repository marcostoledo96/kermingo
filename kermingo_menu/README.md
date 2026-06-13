# Kermingo

Sistema web para evento scout recaudatorio del **20 de junio de 2026** en **Echeverría 3920**, organizado por el Grupo Scout San Patricio.

## Estructura

```txt
kermingo_menu/
├── backend/                    # Express + MySQL + JWT + MVC + Zod + Drive
├── frontend/                   # Next.js + React + TypeScript + TailwindCSS
├── diseno-de-landing-kermingo/ # Referencia visual v0, solo lectura
├── DOCUMENTACION/IA/           # Documentación técnica fuente de verdad
├── docs/planificacion/         # Auditorías y planificación
└── openspec/                   # Specs SDD / OpenSpec
```

## Backend

```bash
cd backend
npm install
npm test
npm run dev
```

Health check:

```bash
curl http://localhost:3001/api/health
```

### Variables backend

Ver `backend/.env.example`.

Variables principales:

```txt
PORT
NODE_ENV
FRONTEND_URL
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME
JWT_SECRET
JWT_EXPIRES_IN
COOKIE_NAME
GOOGLE_DRIVE_FOLDER_ID
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_REFRESH_TOKEN
```

Google Drive usa OAuth de usuario con refresh token. No commitear `.env`, credenciales, keys ni zips.

### Tests de comprobantes con Drive real

Por defecto los tests no tocan Drive real. Para probar la integración real:

```bash
cd backend
RUN_REAL_DRIVE_TESTS=true npm test -- --testPathPattern=comprobantes.test
```

## Frontend

```bash
cd frontend
pnpm install
pnpm dev
pnpm build
```

El frontend activo es `frontend/`. La carpeta `diseno-de-landing-kermingo/` es referencia visual y no debe modificarse.

## Auditoría

Generar ZIP limpio de auditoría:

```bash
bash scripts/crear_zip_auditoria.sh
```

El script excluye `.env`, `node_modules/`, `.next/`, `coverage/`, `dist/`, credenciales y zips previos.

## Documentación

Antes de modificar código, leer:

```txt
AGENTS.md
DOCUMENTACION/IA/INDEX.md
DOCUMENTACION/IA/*.md según el área afectada
```
