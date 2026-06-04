# 17 — Tareas backend detalladas

## Ubicación del backend

El backend debe crearse en:

```txt
/home/marcos/Escritorio/Kermingo/kermingo_menu/backend
```

Dentro del repo:

```txt
backend/
```

## Leer siempre antes de trabajar backend

```txt
AGENTS.md
docs/planificacion/04-BACKEND_API_EXPRESS_MYSQL.md
docs/planificacion/05-BASE_DE_DATOS_MYSQL.md
docs/planificacion/06-ENDPOINTS_API.md
docs/planificacion/09-AUTH_COOKIES_CORS.md
docs/planificacion/11-GOOGLE_DRIVE_ARCHIVOS.md
```

## Regla de coordinación con frontend

Aunque el backend no toca UI, debe respetar los contratos que usará el frontend existente en:

```txt
/home/marcos/Escritorio/Kermingo/kermingo_menu/diseno-de-landing-kermingo
```

Antes de crear endpoints, revisar también:

```txt
docs/planificacion/18-TAREAS_FRONTEND_DETALLADAS.md
docs/planificacion/25-REFERENCIA_VISUAL_FRONTEND.md
```

## Etapa B0 — Setup backend

### B0.1 — Crear backend Express profesional

Leer:

```txt
docs/planificacion/04-BACKEND_API_EXPRESS_MYSQL.md
docs/planificacion/03-ESTRUCTURA_MONOREPO.md
```

Crear:

```txt
backend/package.json
backend/.env.example
backend/src/app.js
backend/src/server.js
backend/src/api/routes/index.routes.js
```

Hacer:

- Inicializar backend con ESM.
- Instalar Express, dotenv, cors, cookie-parser.
- Crear `app.js` para middlewares y rutas.
- Crear `server.js` para levantar puerto.
- Crear `/api/health`.
- Usar respuesta uniforme.

Criterio:

```bash
cd backend
npm run dev
curl http://localhost:3001/api/health
```

Debe responder `ok: true`.

### B0.2 — Configuración centralizada

Crear:

```txt
backend/src/api/config/environments.js
```

Hacer:

- Cargar dotenv.
- Exportar port, frontendUrl, db config, jwt config, drive config.
- Evitar `process.env` suelto en controladores.

## Etapa B1 — MySQL

### B1.1 — Pool

Crear:

```txt
backend/src/api/database/db.js
```

Hacer:

- Instalar `mysql2`.
- Crear `pool` con `mysql2/promise`.
- Exportar `pool`.
- No crear conexión por request.

### B1.2 — Schema

Crear:

```txt
backend/src/api/database/schema.sql
```

Hacer:

- Tablas en español singular.
- Relaciones muchos-a-muchos.
- `producto_categoria`.
- `combo_producto`.
- `pedido_detalle`.
- Índices.
- Constraints.

### B1.3 — Seed

Crear:

```txt
backend/src/api/database/seed.sql
backend/src/api/utils/hash-password.js
```

Hacer:

- Categorías Merienda/Cena.
- Configuración tienda.
- Usuario admin bcrypt.
- Productos ejemplo.
- Combos ejemplo.

## Etapa B2 — Validaciones Zod

### B2.1 — Middleware validate

Crear:

```txt
backend/src/api/middlewares/validate.middleware.js
```

Hacer:

- Validar body/query/params.
- Devolver 400 uniforme.

### B2.2 — Schemas

Crear:

```txt
backend/src/api/schemas/producto.schema.js
backend/src/api/schemas/pedido.schema.js
backend/src/api/schemas/auth.schema.js
```

Hacer:

- Producto.
- Pedido.
- Login.
- La regla transferencia/comprobante se valida con archivo en controller.

## Etapa B3 — Productos

Crear:

```txt
backend/src/api/models/producto.model.js
backend/src/api/controllers/producto.controller.js
backend/src/api/routes/producto.routes.js
```

Hacer:

- GET `/api/productos`.
- GET `/api/productos/:id`.
- Admin listar paginado.
- Crear/editar/desactivar/recuperar/stock.
- Usar placeholders.
- `affectedRows` en updates.

## Etapa B4 — Auth

Crear:

```txt
backend/src/api/models/usuario.model.js
backend/src/api/controllers/auth.controller.js
backend/src/api/routes/auth.routes.js
backend/src/api/middlewares/auth.middleware.js
```

Hacer:

- Login bcrypt.
- JWT cookie httpOnly 24h.
- Logout.
- Me.
- Middleware `requireAuth`.

## Etapa B5 — Pedidos, stock y combos

Crear:

```txt
backend/src/api/utils/pedido.utils.js
backend/src/api/utils/telefono.utils.js
backend/src/api/models/pedido.model.js
backend/src/api/controllers/pedido.controller.js
backend/src/api/routes/pedido.routes.js
```

Hacer:

- Número `KMG-0001`.
- Token seguimiento.
- Normalizar WhatsApp.
- Crear pedido transaccional.
- Recalcular precios desde DB.
- Validar/descontar stock.
- Soportar combos.
- Cancelar y reponer stock.
- Transferencia requiere comprobante.
- Efectivo no acepta comprobante.

## Etapa B6 — Drive y archivos

Crear:

```txt
backend/src/api/middlewares/upload.middleware.js
backend/src/api/services/googleDrive.service.js
backend/src/api/models/archivoDrive.model.js
```

Hacer:

- Multer memoryStorage.
- Límite 10 MB.
- MIME permitidos.
- Credenciales Drive desde env JSON o archivo local.
- Guardar metadata.

## Etapa B7 — Caja, cocina, comprobantes, reportes

Crear:

```txt
backend/src/api/controllers/caja.controller.js
backend/src/api/routes/caja.routes.js
backend/src/api/controllers/cocina.controller.js
backend/src/api/routes/cocina.routes.js
backend/src/api/controllers/comprobante.controller.js
backend/src/api/routes/comprobante.routes.js
backend/src/api/controllers/reporte.controller.js
backend/src/api/routes/reporte.routes.js
backend/src/api/services/reporte.service.js
backend/src/api/controllers/configuracion.controller.js
backend/src/api/routes/configuracion.routes.js
backend/src/api/models/configuracion.model.js
```

Hacer:

- Caja rápida.
- Cocina con productos pendientes.
- Comprobantes.
- Reportes Excel.
- Configuración tienda.
