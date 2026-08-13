# Deploy — Kermingo

> Deploy, variables de entorno e infraestructura.
> **Estado actual (archivo 2026): solo Vercel en modo demo. Railway decommissioned / a apagar.**

---

## Índice

1. [Arquitectura actual (demo)](#1-arquitectura-actual-demo)
2. [Arquitectura legacy (con Railway)](#2-arquitectura-legacy-con-railway)
3. [Frontend — Vercel](#3-frontend--vercel)
4. [Variables de entorno](#4-variables-de-entorno)
5. [Checklist baja de Railway](#5-checklist-baja-de-railway)
6. [Health check (backend vivo)](#6-health-check-backend-vivo)
7. [Rollback / revivir](#7-rollback--revivir)
8. [Base de datos](#8-base-de-datos)

---

## 1. Arquitectura actual (demo)

```
[Internet]
    │
    └── Vercel (frontend Next.js, Root Directory: frontend)
            └── NEXT_PUBLIC_MOCK_API=true
            └── fixtures + /public/products/*
```

- No hay backend hospedado.
- El código `backend/` permanece en el repo para revival local/futuro.
- Docs: `MODO-DEMO.md`, `REVIVIR-BACKEND.md`.

---

## 2. Arquitectura legacy (con Railway)

```
[Internet]
    ├── Vercel (frontend)
    └── Railway (Express + MySQL + Drive)
```

Solo aplica si se vuelve a provisionar un host (ver `REVIVIR-BACKEND.md`).

---

## 3. Frontend — Vercel

| Aspecto | Valor |
|---|---|
| Plataforma | Vercel |
| Root Directory | `frontend` |
| Build | `pnpm build` (respeta mock flag en `env-guard`) |
| URL portfolio | `https://kermingo.vercel.app` (permanente) |

### Cómo configurar Vercel (dashboard)

1. Proyecto → Settings → Environment Variables.
2. Agregar `NEXT_PUBLIC_MOCK_API` = `true` (Production + Preview).
3. Eliminar o vaciar `NEXT_PUBLIC_API_URL` (ya no debe apuntar a Railway).
4. Redeploy Production (Deployments → … → Redeploy).
5. Smoke: `/`, `/menu`, `/admin` con `admin@kermingo.com` / `admin123`.

CLI (si está autenticado):

```bash
cd frontend
npx vercel env add NEXT_PUBLIC_MOCK_API production
# valor: true
npx vercel env rm NEXT_PUBLIC_API_URL production
npx vercel --prod
```

---

## 4. Variables de entorno

### Frontend (Vercel) — demo

Ver tabla arriba y `frontend/.env.local.example`.

### Frontend — contra API real

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_MOCK_API` | `false` o no definir |
| `NEXT_PUBLIC_API_URL` | URL pública del backend |

### Backend (solo si está vivo)

Ver `backend/.env.example` y `SECRETS.md`. En el estado demo, estas vars en Railway deben **revocarse/eliminarse** tras el teardown.

---

## 5. Checklist baja de Railway

Completar **en este orden**:

1. [x] Archive SQL anonimizado en `backend/src/api/database/archives/`
2. [x] Imágenes estáticas en `frontend/public/products/`
3. [x] Modo mock implementado y build local OK
4. [ ] En Vercel: set `NEXT_PUBLIC_MOCK_API=true`, quitar URL Railway, redeploy
5. [ ] Smoke manual en producción (landing, menú, login demo, dashboard)
6. [ ] Backup local extra del RAW (fuera de git), si aún existe
7. [ ] Revocar OAuth Google Drive / rotar secrets
8. [ ] Pausar o eliminar servicios Railway (MySQL + backend) → confirmar $0
9. [ ] Anotar fecha de baja aquí: `DECOMMISSIONED_AT: ________`

---

## 6. Health check (backend vivo)

```
GET /api/health
```

Solo aplica con backend levantado. En demo no existe.

---

## 7. Rollback / revivir

1. Provisionar MySQL + Express.
2. Restaurar DB (`REVIVIR-BACKEND.md`).
3. Vercel: `NEXT_PUBLIC_MOCK_API=false` + `NEXT_PUBLIC_API_URL`.
4. Redeploy.

---

## 8. Base de datos

- **Canonical empty:** `schema.sql` + `indexes.sql` + `seed.sql`
- **Event snapshot (anonymized):** `archives/2026-07-28-prod-anonymized.sql`
- **RAW producción:** nunca en git público
