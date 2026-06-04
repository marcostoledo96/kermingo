# 19 — Tareas de integración y deploy detalladas

## Estructura real

Frontend:

```txt
/home/marcos/Escritorio/Kermingo/kermingo_menu/diseno-de-landing-kermingo
```

Backend:

```txt
/home/marcos/Escritorio/Kermingo/kermingo_menu/backend
```

## Leer antes

```txt
AGENTS.md
docs/planificacion/03-ESTRUCTURA_MONOREPO.md
docs/planificacion/06-ENDPOINTS_API.md
docs/planificacion/09-AUTH_COOKIES_CORS.md
docs/planificacion/14-DEPLOY_RAILWAY_VERCEL.md
docs/planificacion/15-VARIABLES_ENTORNO.md
docs/planificacion/25-REFERENCIA_VISUAL_FRONTEND.md
```

## I0 — Contratos API

Crear:

```txt
docs/api-contracts/productos.md
docs/api-contracts/pedidos.md
docs/api-contracts/auth.md
docs/api-contracts/admin.md
docs/api-contracts/archivos.md
```

Hacer:

- Request/response exacto.
- Errores esperados.
- Qué pantalla consume cada endpoint.
- Archivos frontend asociados.

## I1 — CORS y cookies local

Leer:

```txt
backend/src/app.js
backend/src/api/routes/auth.routes.js
diseno-de-landing-kermingo/services/authService.ts
diseno-de-landing-kermingo/components/admin/login-screen.tsx
```

Hacer:

- Backend localhost:3001.
- Frontend localhost:3000.
- CORS origin localhost.
- Cookie local `sameSite=lax`, `secure=false`.
- Front con `credentials: include`.

Criterio:

- Login setea cookie.
- `/api/auth/me` responde usuario.

## I2 — Compra local

### Efectivo

Pantallas:

```txt
diseno-de-landing-kermingo/components/menu/menu-screen.tsx
diseno-de-landing-kermingo/components/menu/cart-screen.tsx
diseno-de-landing-kermingo/components/menu/checkout-screen.tsx
diseno-de-landing-kermingo/components/menu/ticket-screen.tsx
```

Criterio:

- Pedido creado.
- Stock baja.
- Sin comprobante.

### Transferencia

Criterio:

- Sin comprobante falla.
- Con comprobante se guarda.
- Admin puede aprobar.

## I3 — Caja y cocina

Pantallas:

```txt
diseno-de-landing-kermingo/components/admin/caja-screen.tsx
diseno-de-landing-kermingo/components/admin/cocina-screen.tsx
```

Criterio:

- Caja crea pedido.
- Cocina lo ve.
- Cambios de estado funcionan.

## I4 — Deploy

### Railway backend

- Root: `backend`.
- Variables env.
- MySQL.
- Schema/seed.
- `/api/health`.

### Vercel frontend

- Root Directory: `diseno-de-landing-kermingo`.
- Framework: Next.js.
- Env:
  - `NEXT_PUBLIC_API_URL`
  - `NEXT_PUBLIC_APP_URL`.

### Cookies producción

- CORS permite URL Vercel.
- Cookie `sameSite=none`, `secure=true`, `httpOnly=true`.
- Fetch con credentials.

## I5 — Checklist final

- Landing.
- Menú.
- Carrito persistente.
- Checkout efectivo.
- Checkout transferencia.
- Ticket.
- Seguimiento.
- Login.
- Productos.
- Pedidos.
- Caja.
- Cocina.
- Comprobantes.
- Reportes.
- Configuración tienda.
- Cancelación repone stock.
- Stock agotado.
- Responsive.
- Build frontend.
- Tests backend.
