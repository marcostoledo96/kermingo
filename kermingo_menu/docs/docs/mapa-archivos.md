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
├── package.json          ESM project, express 4.21, cors, cookie-parser, dotenv, nodemon
├── .env.example         PORT=3001, NODE_ENV=development
├── .gitignore
└── src/
    ├── server.js        Entry point
    ├── app.js           Express app factory
    └── api/
        ├── config/
        │   └── environments.js   Config centralizada con Object.freeze
        ├── utils/
        │   ├── respuesta.utils.js  Helpers respuestaExitosa/respuestaError
        │   └── errors.js           AppError + ValidationError + NotFoundError + AuthError
        ├── middlewares/
        │   └── error.middleware.js  Global error handler
        ├── routes/
        │   └── index.routes.js      GET /api/health
        ├── controllers/.gitkeep     MVC scaffold
        └── models/.gitkeep         MVC scaffold
```

## Documentación

```txt
docs/planificacion/
docs/docs/
docs/scripts/
docs/.agents/skills/
```
