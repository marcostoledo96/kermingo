# Prompt de Auditoría para ChatGPT — Kermingo Backend B5

> **Contexto**: Kermingo es el backend de un evento scout recaudatorio (kermesse + bingo).  
> **Stack**: Node.js + Express + MySQL (mysql2/promise) + ESM + JWT en cookie httpOnly + bcrypt + Zod.  
> **Estado**: Etapas B1 a B5 completadas. Todas las rutas fueron probadas con curl (test suite completa en docs).

## ZIP adjunto: `kermingo-backend-auditoria-b5.zip`

El ZIP contiene el código fuente del backend (`backend/src/`), los specs de OpenSpec (`openspec/`), el AGENTS.md, la documentación de planificación relevante (`docs/planificacion/`), y la configuración (`package.json`, `.env.example`).

### Estructura del ZIP

```
backend/src/api/
├── config/environments.js       # CORS, JWT, DB pool config
├── controllers/
│   ├── auth.controller.js       # Login/logout/me (B4)
│   ├── pedido.controller.js     # Crear, seguir, admin gestionar (B5)
│   └── producto.controller.js   # CRUD productos (B3)
├── database/
│   ├── db.js                    # mysql2/promise pool
│   ├── indexes.sql
│   ├── schema.sql               # 9 tablas
│   └── seed.sql                 # 24 productos + admin
├── middlewares/
│   ├── admin.middleware.js       # JWT verify + user load
│   ├── error.middleware.js       # Global error handler
│   └── validate.middleware.js    # Zod body/query/params
├── models/
│   ├── pedido.model.js          # Transacciones + stock + KMG + cancel
│   ├── producto.model.js        # Queries CRUD + filtros + paginación
│   └── usuario.model.js         # findByEmail
├── routes/
│   ├── auth.routes.js
│   ├── index.routes.js          # Montaje central
│   ├── pedido.routes.js
│   └── producto.routes.js
├── schemas/
│   ├── auth.schema.js
│   ├── pedido.schema.js
│   └── producto.schema.js
└── utils/
    ├── errors.js                # AppError + subclases (401, 404, 409)
    └── respuesta.utils.js       # Uniform response helper
```

### Documentación incluida en el ZIP

```
docs/planificacion/
├── 04-BACKEND_API_EXPRESS_MYSQL.md
├── 05-BASE_DE_DATOS_MYSQL.md
├── 06-ENDPOINTS_API.md
├── 09-AUTH_COOKIES_CORS.md
├── 13-FLUJOS_FUNCIONALES.md
├── 17-TAREAS_BACKEND_DETALLADAS.md
├── 27-CHECKPOINTS_TESTING_AUDITORIA.md
├── 29-PROMPT_AUDITORIA_CHATGPT.md
AGENTS.md
```

## Lo implementado hasta B5

| Etapa | Qué | Endpoints | Estado |
|---|---|---|---|
| B1 | Express server + error handling + uniform responses | `GET /api/health` | ✅ |
| B2 | MySQL schema + pool + seed | 9 tablas, 24 productos, admin seed | ✅ |
| B3 | Productos API | 8 endpoints (2 público, 6 admin) | ✅ |
| B4 | Auth admin | JWT cookie httpOnly, login/logout/me | ✅ |
| B5 | Pedidos, stock y combos | 9 endpoints (2 público, 7 admin) | ✅ |

**Total**: 20+ endpoints activos, testeados con curl.

## Lo que necesito que audites

### 1. Seguridad — Auth (PRIORIDAD ALTA)

- Revisá `admin.middleware.js`: ¿la verificación JWT es correcta? ¿manejo de errores completo?
- Revisá `auth.controller.js`: ¿las cookies están configuradas correctamente para dev y prod? ¿hay riesgo de CSRF con las opciones actuales de sameSite?
- Revisá `environments.js`: ¿la configuración de CORS (`cors.origin`) es segura para Vercel (frontend) + Railway (backend)? ¿el origin actual permite cualquier dominio o está restrictivo?
- ¿Hay algún endpoint admin que NO tenga `requireAdmin` aplicado?
- ¿El mensaje de error en login (`Credenciales inválidas`) es uniforme y no revela si el email existe o no?

### 2. Lógica de stock — Transacciones (PRIORIDAD ALTA)

- Revisá `pedido.model.js` funciones `createWithTransaction` y `cancelWithTransaction`:
  - ¿`SELECT FOR UPDATE` bloquea correctamente las filas de producto durante la transacción?
  - ¿Hay algún path donde se haga COMMIT sin haber descontado stock, o viceversa?
  - ¿El stock de combos se descuenta de los componentes (productos internos) y NO del combo en sí?
  - ¿La cancelación repone correctamente el stock de componentes de combo?
  - ¿Hay riesgo de stock negativo si dos pedidos concurrentes compran el mismo producto?

### 3. Validación de entrada

- Revisá los schemas Zod en `schemas/`:
  - ¿Todos los campos obligatorios están validados?
  - ¿Hay sanitización de strings (XSS, SQL injection)?
  - ¿Los precios vienen del backend o del request del cliente? (deben venir del backend)
  - ¿Los números de teléfono están correctamente normalizados?

### 4. Estructura y patrones

- ¿Se respeta el patrón MVC? (models/controllers/routes separados, sin SQL en controllers ni routes)
- ¿Hay errores no capturados que puedan crashear el servidor?
- ¿Las respuestas de error incluyen stack traces en producción? (deberían ocultarse)

### 5. Base de datos

- Revisá `schema.sql`: ¿los tipos de datos son correctos? ¿las constraints CHECK son suficientes?
- Revisá `seed.sql`: ¿el hash bcrypt del admin es correcto? ¿hay datos sensibles expuestos?

## Formato de respuesta esperado

Por favor estructurá tu respuesta así:

### Hallazgos críticos (bloquean deploy)
- [CRIT-1] Descripción del problema, archivo, línea, sugerencia de fix

### Hallazgos importantes (deberían arreglarse antes de producción)
- [IMP-1] Descripción...

### Sugerencias (mejoras, no bloqueantes)
- [SUG-1] Descripción...

### Verificación positiva (lo que está bien)
- ✅ CORS configurado con credentials: true
- ✅ etc...

### Resumen
¿El backend está listo para avanzar a B6 (caja, cocina, reportes) o necesita fixes primero?
