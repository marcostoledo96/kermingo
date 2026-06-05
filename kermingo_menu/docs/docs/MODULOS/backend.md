# Módulo: Backend — Kermingo API

## Descripción

Backend Express ESM standalone para el sistema Kermingo. Expone API REST para el frontend Next.js y admin dashboard.

**Stack**: Node.js + Express 4.21 + ESM + MySQL (futuro) + JWT (futuro)
**Puerto default**: 3001
**Carpeta**: `backend/`

---

## Estructura de archivos

```txt
backend/
├── package.json              ESM project manifest
├── .env.example             Template de variables de entorno
├── .gitignore
└── src/
    ├── server.js             Entry point — bootstraps app + listens
    ├── app.js                Express app factory
    └── api/
        ├── config/
        │   └── environments.js   Config centralizada (Object.freeze)
        ├── utils/
        │   ├── respuesta.utils.js  Helpers respuestaExitosa / respuestaError
        │   └── errors.js           AppError, ValidationError, NotFoundError, AuthError
        ├── middlewares/
        │   └── error.middleware.js  Global error handler (NODE ENV-aware)
        ├── routes/
        │   └── index.routes.js      Mounts GET /api/health
        ├── controllers/             MVC — lógica de negocio (futuro)
        └── models/                  MVC — acceso a datos (futuro)
```

---

## Capabilidades existentes

| Capacidad | Descripción |
|-----------|-------------|
| `api-health` | `GET /api/health` — liveness probe sin dependencia de DB |
| `uniform-responses` | Envelope `{ ok, data, message }` / `{ ok, error }` |
| `centralized-config` | Single source of truth para env vars con Object.freeze |
| `error-handling` | Middleware global + jerarquía AppError (4 clases) |

---

## Capabilidades pendientes

| Capacidad | Prioridad | Descripción |
|-----------|-----------|-------------|
| MySQL schema + seed | Alta (B1) | Tablas productos, pedidos, usuarios, etc. |
| Zod validation | Alta (B2) | Schemas de validación para todos los request |
| CRUD productos | Alta (B3) | Endpoints públicos de menú |
| Auth + JWT | Media (B4) | Login admin, middleware de autenticación |
| Pedidos + carrito | Alta (B5) | Crear/confirmar/cancelar pedidos |
| Archivos (Drive) | Baja (B6) | Subida de comprobantes, export Excel |
| Caja + cocina | Media (B7) | Pantallas оператора |

---

## Convenciones establecidas

| Categoría | Convención |
|-----------|------------|
| Sistema de módulos | ESM (`"type": "module"`, imports con `.js`) |
| Configuración | Todas las env vars en `environments.js` — Object.freeze |
| Responses | Siempre vía `respuestaExitosa()` / `respuestaError()` — sin `res.json()` directo |
| Errores | Jerarquía AppError — no exponer stack en producción |
| Naming archivos | kebab-case, español |
| Naming funciones | camelCase, español |
| Naming clases | PascalCase, inglés (Error classes) |
| Rutas | Española, sin leading slash en router |
| Middleware order | `json()` → `urlencoded()` → `cookieParser()` → `cors()` → logger → routes → 404 → error (last) |

---

## Contratos de 接口

### Success Response
```json
{
  "ok": true,
  "data": { ... },
  "message": "Operación exitosa"
}
```

### Error Response
```json
{
  "ok": false,
  "error": "Mensaje de error"
}
```
En desarrollo además: `"stack": "..."`

---

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | 3001 | Puerto del servidor |
| `NODE_ENV` | development | development \| production |
| `FRONTEND_URL` | http://localhost:3000 | Origen permitido para CORS |

Futuras (B1+):

| Variable | Descripción |
|----------|-------------|
| `DB_HOST` | Host MySQL |
| `DB_PORT` | Puerto MySQL |
| `DB_USER` | Usuario MySQL |
| `DB_PASSWORD` | Contraseña MySQL |
| `DB_NAME` | Nombre de base de datos |
| `JWT_SECRET` | Secreto para JWT |
| `JWT_EXPIRES_IN` | Expiración token |

---

## Docs relacionados

- `docs/docs/estado-actual.md` — Estado general del proyecto
- `docs/docs/changelog-ia.md` — Historial de cambios IA
- `docs/docs/mapa-archivos.md` — Mapa completo de archivos
- `openspec/specs/` — Specs canonicales por dominio
