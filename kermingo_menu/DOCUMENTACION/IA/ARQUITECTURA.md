# Arquitectura del Proyecto Kermingo

**Stack:** Express + MySQL + JWT (backend) | Next.js + React + TypeScript + TailwindCSS (frontend)

---

## Índice

1. [Capas y flujo de dependencias](#1-capas-y-flujo-de-dependencias)
2. [Estructura de carpetas](#2-estructura-de-carpetas)
3. [Stack tecnológico](#3-stack-tecnológico)
4. [Reglas de arquitectura](#4-reglas-de-arquitectura)
5. [Decisiones de arquitectura](#5-decisiones-de-arquitectura)
6. [Documentación relacionada](#6-documentación-relacionada)

---

## 1. Capas y flujo de dependencias

```
Frontend (Next.js)  →  [HTTP REST]  →  Express Router
                                            │
                                     middleware (auth, origin, validate)
                                            │
                                       Controller
                                            │
                                         Model (SQL directo con mysql2/promise)
                                            │
                                        MySQL 8
```

**Regla:** El controller orquesta la lógica. No hay capa de service separada (el proyecto es chico). Los models ejecutan SQL directamente. Los schemas Zod validan la entrada ANTES de llegar al controller.

**Dependencias permitidas:**

| Capa | Puede importar de |
|---|---|
| `routes/` | `controllers/`, `middlewares/`, `schemas/` |
| `controllers/` | `models/`, `utils/`, `database/` |
| `models/` | `database/` (pool) |
| `middlewares/` | `utils/`, `database/`, `config/` |
| `schemas/` | Ninguna (solo `zod`) |

**Prohibido:** SQL en routes, lógica pesada en controllers (debe ir a models), importar controllers desde otros controllers.

---

## 2. Estructura de carpetas

```
kermingo_menu/
├── AGENTS.md                        # Guía operativa para agentes IA
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── config/
│   │   │   │   └── environments.js   # Config centralizada (DB, JWT, CORS, cookie)
│   │   │   ├── controllers/          # Handlers HTTP (4 controllers)
│   │   │   ├── database/
│   │   │   │   ├── db.js             # Pool de conexiones mysql2/promise
│   │   │   │   ├── schema.sql        # DDL: 9 tablas
│   │   │   │   ├── seed.sql          # Datos iniciales (24 productos, 1 admin)
│   │   │   │   └── indexes.sql       # Índices de rendimiento
│   │   │   ├── middlewares/          # requireAdmin, requireTrustedOrigin, validate, error
│   │   │   ├── models/               # SQL directo: pedido, producto, configuracion, usuario
│   │   │   ├── routes/               # Definición de rutas con middleware chain
│   │   │   ├── schemas/              # Validación Zod (auth, pedido, producto, cocina, configuracion)
│   │   │   └── utils/               # errors.js (AppError, ValidationError, etc.), respuesta.utils.js
│   │   ├── app.js                    # App Express (middleware, CORS, cookie-parser, routes)
│   │   └── server.js                 # Servidor HTTP
│   ├── tests/                        # Jest + Supertest
│   ├── package.json                  # ESM ("type": "module")
│   └── .env / .env.example
├── frontend/                          # Next.js 16 + React 19 + TypeScript + TailwindCSS
│   ├── app/
│   │   ├── page.tsx                  # Home pública
│   │   ├── menu/                     # Menú público
│   │   ├── carrito/                  # Carrito (localStorage)
│   │   ├── confirmar/               # Checkout
│   │   ├── confirmado/              # Confirmación de pedido
│   │   ├── seguimiento/             # Seguimiento por token
│   │   └── admin/                   # Panel admin
│   │       ├── page.tsx             # Dashboard admin
│   │       ├── caja/               # Caja rápida
│   │       ├── cocina/             # Vista cocina
│   │       ├── pedidos/            # Gestión de pedidos
│   │       ├── productos/          # ABM productos
│   │       └── dashboard/         # Dashboard principal
│   ├── components/                   # Componentes React (shadcn-style)
│   ├── lib/                          # Utilidades
│   ├── public/                       # Assets estáticos
│   └── package.json
├── diseno-de-landing-kermingo/       # Referencia visual v0 (LOCAL, NO versionada en git)
├── docs/planificacion/               # Planificación original
├── scripts/                          # Scripts de utilidad
└── DOCUMENTACION/IA/                 # Esta documentación
```

---

## 3. Stack tecnológico

### Backend

| Tecnología | Versión | Para qué |
|---|---|---|
| Node.js | — | Runtime |
| Express | 4.x | Framework HTTP |
| mysql2 | 3.x | Conexión MySQL con pool y promesas |
| JWT (jsonwebtoken) | 9.x | Autenticación por cookie httpOnly |
| bcrypt | 6.x | Hash de contraseñas |
| cookie-parser | 1.x | Parseo de cookies |
| cors | 2.x | CORS con `credentials: true` |
| Zod | 4.x | Validación de schemas |
| Jest | 29.x | Testing con `--experimental-vm-modules` |
| Supertest | 6.x | Tests de integración HTTP |

### Frontend

| Tecnología | Para qué |
|---|---|
| Next.js 16 | Framework React con App Router |
| React 19 | UI |
| TypeScript | Tipado estático |
| TailwindCSS 4 | Estilos utility-first |
| shadcn/ui | Componentes base estilizados |
| lucide-react | Iconos |
| jsPDF | Generación de ticket PDF |

### Base de datos

| Tecnología | Para qué |
|---|---|
| MySQL 8 | RDBMS principal |

---

## 4. Reglas de arquitectura

- **MVC estricto:** No SQL en routes, no lógica pesada en controllers.
- **ESM:** `"type": "module"` en `package.json`. Imports con extensión `.js`.
- **Tablas en español singular:** `usuario`, `producto`, `pedido`, `categoria`, etc.
- **Endpoints en español:** `/pedidos`, `/productos`, `/auth/login`, `/admin/cocina`.
- **Validación Zod antes del controller:** Los schemas se aplican en la ruta vía `validateBody` / `validateQuery` / `validateParams`.
- **Respuesta estándar:** `{ ok: true, data, message }` o `{ ok: false, error: "mensaje" }`.
- **Frontend en `frontend/`:** Toda modificación va ahí. `diseno-de-landing-kermingo/` es referencia visual local no versionada (ver `.gitignore`). No modificar su contenido ni depender de ella en CI/build.
- **Diseño mobile-first:** Argentina, Mundial, Día de la Bandera, scout sutil.

---

## 5. Decisiones de arquitectura

- **Sin capa de service:** Proyecto chico; el controller orquesta models directamente. Si escala, extraer services.
- **Sin ORM:** SQL directo con `mysql2/promise`. Da control total y transparencia.
- **JWT en cookie httpOnly:** No expone el token a JavaScript. Protección CSRF vía `requireTrustedOrigin`.
- **`configuracion_tienda` como singleton:** `id = 1`, siempre un solo registro. No hay tabla de configs múltiples.
- **`sameSite: 'none'` en producción:** Necesario para cross-site cookie (Vercel → Railway). Requiere `secure: true`.
- **Estado `demo` en tienda:** Permite al frontend funcionar sin crear pedidos reales.

---

## 6. Documentación relacionada

| Para ver... | Archivo |
|---|---|
| Endpoints y schemas | `API.md` |
| State machines, reglas de negocio | `CORE.md` |
| Tablas, pool, seed, índices | `INFRA.md` |
| Frontend Next.js | `WEBAPP.md` |
| JWT, cookies, CSRF | `AUTENTICACION.md` |
| Bugs y trampas | `GOTCHAS.md` |