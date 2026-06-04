# 17 — Tareas backend atómicas

## Etapa B0 — Setup backend

### Tarea B0.1 — Inicializar backend

Archivos:

- `backend/package.json`
- `backend/src/app.js`
- `backend/src/server.js`

Hacer:

- crear proyecto Node ESM
- instalar express dotenv cors cookie-parser
- crear endpoint `/api/health`
- separar `app.js` y `server.js`

Criterio:

- `npm run dev` levanta servidor
- `GET /api/health` responde `{ ok: true }`

Prompt para IA:

```txt
Trabajá solo en backend. Inicializá un backend Express ESM profesional con src/app.js y src/server.js. Agregá endpoint GET /api/health con respuesta uniforme. No agregues base de datos todavía.
```

### Tarea B0.2 — Configuración de entorno

Archivos:

- `backend/src/api/config/environments.js`
- `backend/.env.example`

Hacer:

- cargar dotenv
- exportar port, database, frontendUrl, jwt, googleDrive
- documentar variables

Criterio:

- app usa `environments.port`

## Etapa B1 — MySQL

### Tarea B1.1 — Pool MySQL

Archivos:

- `backend/src/api/database/db.js`

Hacer:

- usar mysql2/promise
- createPool
- exportar pool

Criterio:

- `db.js` no abre conexiones manuales por request

### Tarea B1.2 — Schema SQL

Archivos:

- `backend/src/api/database/schema.sql`

Hacer:

- crear tablas usuario, categoria, producto, archivo_drive, producto_categoria, combo_producto, pedido, pedido_detalle, configuracion_tienda
- incluir índices

Criterio:

- script corre sin errores en MySQL

### Tarea B1.3 — Seed inicial

Archivos:

- `backend/src/api/database/seed.sql`

Hacer:

- insertar categorías Merienda/Cena
- insertar configuración tienda
- insertar usuario admin con hash bcrypt placeholder comentado
- insertar productos ejemplo

Criterio:

- base queda con datos iniciales

## Etapa B2 — Productos

### Tarea B2.1 — Modelo producto público

Archivos:

- `backend/src/api/models/producto.model.js`

Hacer:

- obtener productos activos
- filtrar por categoria/tipo/buscar
- incluir categorías e imagen

Criterio:

- query usa placeholders

### Tarea B2.2 — Controller y rutas productos públicos

Archivos:

- `backend/src/api/controllers/producto.controller.js`
- `backend/src/api/routes/producto.routes.js`

Hacer:

- GET /api/productos
- GET /api/productos/:id

Criterio:

- respuesta uniforme

### Tarea B2.3 — Admin CRUD productos

Archivos:

- `producto.model.js`
- `producto.controller.js`
- `producto.routes.js`

Hacer:

- listar paginado
- crear
- editar
- desactivar
- recuperar
- ajustar stock

Criterio:

- PUT/DELETE/PATCH usan affectedRows

## Etapa B3 — Auth

### Tarea B3.1 — Modelo usuario y bcrypt

Archivos:

- `backend/src/api/models/usuario.model.js`
- `backend/src/api/controllers/auth.controller.js`

Hacer:

- buscar usuario por email
- comparar contraseña bcrypt
- generar JWT

Criterio:

- login válido setea cookie

### Tarea B3.2 — Middleware auth

Archivos:

- `backend/src/api/middlewares/auth.middleware.js`

Hacer:

- leer cookie
- verificar JWT
- setear req.usuario
- 401 si falla

Criterio:

- rutas admin quedan protegidas

## Etapa B4 — Pedidos y stock

### Tarea B4.1 — Utilidades pedido

Archivos:

- `backend/src/api/utils/pedido.utils.js`

Hacer:

- generar número KMG-0001
- generar token seguro
- normalizar teléfono WhatsApp

Criterio:

- teléfono inválido devuelve null

### Tarea B4.2 — Modelo pedido con transacción

Archivos:

- `backend/src/api/models/pedido.model.js`

Hacer:

- crear pedido
- validar stock
- descontar stock
- insertar detalles
- soportar combos
- commit/rollback

Criterio:

- stock insuficiente no crea pedido

### Tarea B4.3 — Controller pedido público

Archivos:

- `pedido.controller.js`
- `pedido.routes.js`

Hacer:

- POST /api/pedidos
- GET /api/pedidos/seguimiento/:token

Criterio:

- transferencia sin comprobante falla

### Tarea B4.4 — Admin pedidos

Archivos:

- `pedido.controller.js`
- `pedido.routes.js`

Hacer:

- listar
- detalle
- editar
- cambiar estado
- cambiar pago
- cancelar y reponer stock

Criterio:

- cancelar repone stock

## Etapa B5 — Caja y cocina

### Tarea B5.1 — Caja rápida

Archivos:

- `backend/src/api/routes/caja.routes.js`
- `backend/src/api/controllers/caja.controller.js`

Hacer:

- POST /api/admin/caja/venta

Criterio:

- venta efectivo caja inicia pagada

### Tarea B5.2 — Cocina

Archivos:

- `backend/src/api/routes/cocina.routes.js`
- `backend/src/api/controllers/cocina.controller.js`

Hacer:

- pedidos operativos
- productos pendientes agrupados

Criterio:

- devuelve cantidades agrupadas

## Etapa B6 — Archivos Drive

### Tarea B6.1 — Servicio Drive

Archivos:

- `backend/src/api/services/googleDrive.service.js`

Hacer:

- autenticación service account
- subir buffer
- obtener link
- opcional proxy

Criterio:

- función recibe buffer y devuelve drive_id

### Tarea B6.2 — Multer memoryStorage

Archivos:

- `backend/src/api/middlewares/upload.middleware.js`

Hacer:

- configurar memoryStorage
- límites
- filtros mime

Criterio:

- rechaza formatos inválidos

## Etapa B7 — Comprobantes, reportes, configuración

### Tarea B7.1 — Comprobantes

Archivos:

- `archivo.routes.js`
- `archivo.controller.js`

Hacer:

- listar comprobantes
- ver archivo
- aprobar/rechazar

Criterio:

- solo admin

### Tarea B7.2 — Excel

Archivos:

- `reporte.routes.js`
- `reporte.controller.js`
- `reporte.service.js`

Hacer:

- ventas.xlsx
- productos-vendidos.xlsx
- resumen.xlsx

Criterio:

- solo entregados y pagados

### Tarea B7.3 — Configuración tienda

Archivos:

- `configuracion.routes.js`
- `configuracion.controller.js`
- `configuracion.model.js`

Hacer:

- get público
- get admin
- update admin

Criterio:

- puede cambiar abierta/cerrada/demo
