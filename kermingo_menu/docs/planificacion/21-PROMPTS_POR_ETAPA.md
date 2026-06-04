# 21 — Prompts por etapa actualizados

## Etapa 0 — Reconocimiento del repo

```txt
Trabajá solo en documentación. Leé AGENTS.md y revisá la estructura real del proyecto en /home/marcos/Escritorio/Kermingo/kermingo_menu. Es fundamental reconocer que el frontend y referencia visual obligatoria está en /home/marcos/Escritorio/Kermingo/kermingo_menu/diseno-de-landing-kermingo. Documentá rutas, componentes, mocks, scripts y estado actual en docs/docs/mapa-archivos.md y docs/docs/estado-actual.md. No modifiques código.
```

## Etapa 1 — Estabilizar frontend v0

```txt
Trabajá solo en /home/marcos/Escritorio/Kermingo/kermingo_menu/diseno-de-landing-kermingo. Verificá package.json, scripts, pnpm-lock, next.config.mjs, tsconfig y build. Ejecutá pnpm install si hace falta, pnpm lint y pnpm build. Corregí solo errores bloqueantes. No rediseñes. La estética actual es la base obligatoria.
```

## Etapa 2 — Crear backend base

```txt
Trabajá solo en backend/. Creá un backend Express profesional con ESM, src/app.js, src/server.js, dotenv, cors, cookie-parser y GET /api/health. Leé docs/planificacion/04-BACKEND_API_EXPRESS_MYSQL.md antes de empezar. No implementes base de datos todavía.
```

## Etapa 3 — Base de datos MySQL

```txt
Trabajá solo en backend. Implementá mysql2/promise, createPool, schema.sql y seed.sql según docs/planificacion/05-BASE_DE_DATOS_MYSQL.md. Usá tablas en español singular. Incluí relaciones producto_categoria, combo_producto y pedido_detalle.
```

## Etapa 4 — Productos API + frontend menú

```txt
Primero implementá backend productos con MVC. Después conectá el menú del frontend existente en diseno-de-landing-kermingo/components/menu/menu-screen.tsx. No cambies el diseño visual. Reemplazá mocks gradualmente por productoService.
```

## Etapa 5 — Auth admin

```txt
Implementá auth backend con bcrypt y JWT en cookie httpOnly. Luego conectá diseno-de-landing-kermingo/components/admin/login-screen.tsx. No guardar token en localStorage. Usar credentials include.
```

## Etapa 6 — Carrito, checkout y pedido

```txt
Trabajá sobre el CartContext existente en diseno-de-landing-kermingo/components/menu/cart-context.tsx. Asegurá localStorage. Luego conectá checkout-screen.tsx al backend. Transferencia muestra comprobante; efectivo lo oculta. Al crear pedido, limpiar carrito y navegar al ticket por token.
```

## Etapa 7 — Admin operativo

```txt
Conectá productos, pedidos, caja y cocina a API real. Leer primero los componentes existentes en diseno-de-landing-kermingo/components/admin/. Mantener diseño v0. Mejorar dashboard solo en sentido operativo, no rediseñar genérico.
```

## Etapa 8 — Comprobantes, reportes y configuración

```txt
Crear pantallas faltantes /admin/comprobantes, /admin/reportes y /admin/configuracion dentro de diseno-de-landing-kermingo, siguiendo el estilo de admin-ui.tsx y dashboard-screen.tsx. Conectar a endpoints reales.
```

## Etapa 9 — Drive y archivos

```txt
Implementá Multer memoryStorage y Google Drive API en backend. El frontend envía FormData. Productos pueden usar imagen pública directa si conviene; comprobantes deben estar protegidos para admin.
```

## Etapa 10 — Deploy

```txt
Deploy backend en Railway desde backend/. Deploy frontend en Vercel con Root Directory diseno-de-landing-kermingo. Configurá CORS, cookies cross-site, envs, MySQL y Google Drive. Probar flujo completo en producción.
```
