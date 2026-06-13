# Mapa de archivos

## Raíz

```txt
AGENTS.md
diseno-de-landing-kermingo/
docs/
```

## Frontend / referencia visual

Ubicación absoluta:

```txt
/home/marcos/Escritorio/Kermingo/kermingo_menu/diseno-de-landing-kermingo
```

Ubicación relativa:

```txt
diseno-de-landing-kermingo/
```

Archivos principales:

```txt
app/page.tsx
app/globals.css
app/layout.tsx
components/header.tsx
components/hero.tsx
components/cta-buttons.tsx
components/event-info.tsx
components/activities.tsx
components/footer.tsx
```

## Menú/carrito/checkout

```txt
components/menu/cart-context.tsx
components/menu/menu-screen.tsx
components/menu/product-card.tsx
components/menu/cart-screen.tsx
components/menu/checkout-screen.tsx
components/menu/ticket-screen.tsx
components/menu/tracking-screen.tsx
lib/products.ts
```

## Admin

```txt
components/admin/admin-header.tsx
components/admin/admin-ui.tsx
components/admin/login-screen.tsx
components/admin/dashboard-screen.tsx
components/admin/products-screen.tsx
components/admin/orders-screen.tsx
components/admin/caja-screen.tsx
components/admin/cocina-screen.tsx
```

## Documentación

```txt
docs/planificacion/
docs/docs/
docs/scripts/
docs/.agents/skills/
```

## Backend

```txt
backend/
├── package.json          ESM project, express 4.21, cors, cookie-parser, dotenv, nodemon, jest, supertest
├── .env.example          PORT=3001, NODE_ENV=development, etc.
├── .gitignore
├── src/
│   ├── server.js        Entry point
│   ├── app.js           Express app factory
│   └── api/
│       ├── config/
│       │   └── environments.js   Config centralizada con Object.freeze
│       ├── utils/
│       │   ├── respuesta.utils.js  Helpers respuestaExitosa/respuestaError
│       │   ├── errors.js           AppError + ValidationError + NotFoundError + AuthError
│       │   └── file-signature.utils.js Comprobación de firmas de archivo (magic bytes)
│       ├── services/
│       │   ├── drive.service.js  Servicio de subida/descarga de Google Drive
│       │   └── image.service.js  Servicio de procesamiento de imagen WebP con sharp
│       ├── middlewares/
│       │   ├── error.middleware.js  Global error handler
│       │   ├── admin.middleware.js  Middleware de verificación de administrador
│       │   ├── origin.middleware.js Middleware de origen de confianza (Origin/Referer)
│       │   ├── upload.middleware.js Middleware de subida de archivos (Multer) y validación de firma
│       │   └── validate.middleware.js Middleware de validación con Zod
│       ├── database/
│       │   ├── db.js            Pool de conexiones mysql2/promise
│       │   ├── schema.sql       Definición de tablas (tipo 'promo', pedido.numero nullable)
│       │   ├── seed.sql         Carga de datos iniciales
│       │   └── indexes.sql      Creación de índices de base de datos
│       ├── routes/
│       │   ├── index.routes.js  Enrutador principal
│       │   ├── auth.routes.js   Rutas de autenticación (logout protegido por origen)
│       │   ├── producto.routes.js Rutas de gestión de productos
│       │   └── pedido.routes.js Rutas de gestión de pedidos
│       ├── controllers/
│       │   ├── auth.controller.js Controlador de login, logout y me
│       │   ├── producto.controller.js Controlador de CRUD de productos e imágenes
│       │   └── pedido.controller.js Controlador de gestión de pedidos
│       └── models/
│           ├── usuario.model.js Modelo de base de datos para usuarios admin
│           ├── producto.model.js Modelo de base de datos para productos
│           ├── pedido.model.js Modelo transaccional para pedidos y control de stock
│           └── archivo.model.js Modelo de base de datos para archivos en Google Drive
└── tests/
    ├── health.test.js    Test de integración básico del health check
    └── producto-imagen.test.js Test de integración para endpoints de imágenes de producto
```

## Documentación

```txt
docs/planificacion/
docs/docs/
docs/scripts/
docs/.agents/skills/
```
