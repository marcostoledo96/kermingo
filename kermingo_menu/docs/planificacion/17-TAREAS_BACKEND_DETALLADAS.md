# 17 — Tareas backend detalladas con checkpoints

## Regla general

Antes de trabajar backend, leer:

```txt
AGENTS.md
docs/planificacion/00-INDICE-MAESTRO.md
docs/planificacion/04-BACKEND_API_EXPRESS_MYSQL.md
docs/planificacion/05-BASE_DE_DATOS_MYSQL.md
docs/planificacion/06-ENDPOINTS_API.md
docs/planificacion/09-AUTH_COOKIES_CORS.md
docs/planificacion/27-CHECKPOINTS_TESTING_AUDITORIA.md
```

Backend activo:

```txt
backend/
```

Frontend activo:

```txt
frontend/
```

Referencia visual, solo lectura:

```txt
diseno-de-landing-kermingo/
```

## Checkpoint obligatorio después de cada etapa backend

Al terminar cada etapa backend, responder:

```txt
Checkpoint automatico:
Testing manual requerido:
Auditoria con ChatGPT recomendada:
Bloquea avance:
Evidencia:
```

## Etapa B1 — Setup backend terminado

Marcos informó que esta etapa ya está terminada. Antes de avanzar, hacer checkpoint.

### Testing manual requerido

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/backend
npm install
npm run dev
```

Probar:

```txt
GET /api/health
```

### Auditoría con ChatGPT recomendada

Sí. Pasar ZIP para revisar:

- estructura backend
- app/server
- package.json
- `.env.example`
- rutas iniciales
- respuestas uniformes
- documentación
- AGENTS.md actualizado

### Prompt para OpenCode

```txt
Antes de avanzar a la Etapa B2, verificá la Etapa B1. Leé AGENTS.md y docs/planificacion/27-CHECKPOINTS_TESTING_AUDITORIA.md. Ejecutá npm run dev si es posible, probá /api/health y generá un reporte de checkpoint. No implementes base de datos todavía.
```

## Etapa B2 — Base de datos MySQL

### Leer antes

```txt
docs/planificacion/05-BASE_DE_DATOS_MYSQL.md
docs/planificacion/13-FLUJOS_FUNCIONALES.md
docs/planificacion/27-CHECKPOINTS_TESTING_AUDITORIA.md
```

### Archivos esperados

```txt
backend/src/api/database/db.js
backend/src/api/database/schema.sql
backend/src/api/database/seed.sql
backend/src/api/config/environments.js
backend/.env.example
```

### Qué hacer

- Implementar pool con `mysql2/promise`.
- Crear `schema.sql`.
- Crear `seed.sql`.
- Respetar tablas en español singular.
- Incluir relaciones muchos-a-muchos:
  - `producto_categoria`
  - `combo_producto`
- Incluir `pedido_detalle`.
- Incluir índices.
- No implementar endpoints todavía si no corresponde.

### Testing manual requerido

- Correr schema en MySQL local o Railway dev.
- Correr seed.
- Verificar tablas.
- Verificar relaciones.
- Verificar que combos puedan representarse.

### Auditoría con ChatGPT recomendada

Sí, obligatoria antes de seguir a pedidos/stock.

## Etapa B3 — Productos API ✅ COMPLETADO

**Implementado y verificado** (11/11 curl tests passed, 8 endpoints, 6 files created/modified).

### Archivos

```txt
backend/src/api/routes/producto.routes.js
backend/src/api/controllers/producto.controller.js
backend/src/api/models/producto.model.js
backend/src/api/schemas/producto.schema.js
backend/src/api/middlewares/validate.middleware.js
backend/src/api/middlewares/admin.middleware.js
```

### Endpoints implementados

- GET /api/productos — público, filtros (tipo, categoria, buscar)
- GET /api/productos/:id — público, 404 si inactivo
- GET /api/admin/productos — admin, paginado (page, limit, estado, tipo)
- POST /api/admin/productos — crear, validación Zod, 201
- PUT /api/admin/productos/:id — actualizar, parcial permitido
- PATCH /api/admin/productos/:id/desactivar — soft delete
- PATCH /api/admin/productos/:id/recuperar — restaurar
- PATCH /api/admin/productos/:id/stock — ajustar stock

### Testing manual requerido

✅ Completado — 11/11 curl tests passed.

### Auditoría con ChatGPT recomendada

No fue necesaria para esta etapa.

## Etapa B4 — Auth admin ✅ COMPLETADO

**Implementado y verificado** (9/9 curl tests passed, 3 endpoints, 4 files created/modified).

### Archivos

```txt
backend/src/api/schemas/auth.schema.js
backend/src/api/models/usuario.model.js
backend/src/api/controllers/auth.controller.js
backend/src/api/routes/auth.routes.js
backend/src/api/middlewares/admin.middleware.js  (modificado)
backend/src/api/routes/index.routes.js           (modificado)
```

### Endpoints implementados

- POST /api/auth/login — validación Zod, bcrypt.compare, JWT en cookie httpOnly
- POST /api/auth/logout — clearCookie
- GET /api/auth/me — retorna usuario actual via requireAdmin middleware

### Middleware

- `requireAdmin` — Verifica JWT en cookie, consulta usuario en DB, valida activo

### Testing manual requerido

✅ Completado — 9/9 curl tests passed:
1. Login correcto → 200, cookie set, user data returned
2. Login incorrecto → 401 "Credenciales inválidas"
3. /me con cookie → 200, user data
4. /me sin cookie → 401 "Token no encontrado"
5. Admin productos con cookie → 200, paginated data
6. Admin productos sin cookie → 401
7. Logout → 200, clearCookie
8. /me post-logout → 401
9. Zod validation → 400 "Email inválido"

### Auditoría con ChatGPT recomendada

Sí, por riesgo de seguridad/CORS. ⚠️ Pendiente de agendar.

## Etapa B5 — Pedidos, stock y combos ✅ COMPLETADO

**Implementado y verificado** (13/13 curl tests passed, 9 endpoints, 6 files created/modified).

### Archivos

```txt
backend/src/api/schemas/pedido.schema.js        (creado)
backend/src/api/models/pedido.model.js          (creado)
backend/src/api/controllers/pedido.controller.js  (creado)
backend/src/api/routes/pedido.routes.js         (creado)
backend/src/api/utils/errors.js                 (modificado — InsufficientStockError)
backend/src/api/routes/index.routes.js          (modificado — mount pedido routes)
```

### Endpoints implementados

- POST /api/pedidos — público, crear pedido online, valida stock, genera KMG-XXXX + token
- GET /api/pedidos/seguimiento/:token — público, estado del pedido
- POST /api/admin/pedidos/caja — admin, caja rápida, puede setear pago=pagado
- GET /api/admin/pedidos — admin, listado paginado con filtros
- GET /api/admin/pedidos/:id — admin, detalle completo con items
- PATCH /api/admin/pedidos/:id/estado — admin, transición de estado (máquina de estados)
- PATCH /api/admin/pedidos/:id/pago — admin, cambiar estado de pago
- PATCH /api/admin/pedidos/:id/cancelar — admin, cancelar y reponer stock

### Lógica clave verificada

- Transacciones BEGIN/COMMIT/ROLLBACK en creación y cancelación
- SELECT FOR UPDATE en validación de stock
- Combos descontant/reponen componentes, no el combo mismo
- KMG-XXXX generado post-insert (UPDATE después del INSERT)
- Stock repuesto correctamente al cancelar
- Zod schemas cubren todos los endpoints
- Auth middleware `requireAdmin` en todas las rutas admin
- Error handling uniforme con `InsufficientStockError` (409)

### Testing manual requerido

✅ Completado — 13/13 curl tests passed:
1. Crear pedido simple → KMG-0002, $5000, estado=recibido
2. Crear pedido con combo → KMG-0003, $7000 (2x combo merienda)
3. Seguimiento por token → 200, estado=recibido
4. Token inexistente → 404
5. Stock insuficiente → 409 "Medialunas. Necesario: 999, disponible: 19"
6. Stock repuesto post-cancel → Pancho stock=38
7. Admin listar pedidos → total pagination works
8. Admin cambiar estado → recibido→en_preparacion
9. Admin cancelar → cancelado, stock repuesto
10. Admin sin cookie → 401
11. Caja rápida → KMG-0004, pago=pagado
12. Validación items vacíos → 400
13. Validación método pago → 400

### Auditoría con ChatGPT recomendada

Sí, obligatoria antes de avanzar a B6.

## Etapa B6 — Caja, cocina, comprobantes, reportes

Seguir los endpoints definidos en `06-ENDPOINTS_API.md`.

Cada módulo requiere testing manual y, si toca stock/pago/Drive, auditoría con ChatGPT.
