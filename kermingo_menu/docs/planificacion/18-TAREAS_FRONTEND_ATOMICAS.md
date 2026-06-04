# 18 — Tareas frontend atómicas

## Etapa F0 — Importar v0

### Tarea F0.1 — Copiar prototipo

Archivos:

- `frontend/*`

Hacer:

- copiar ZIP v0 dentro de frontend
- renombrar package
- verificar `npm install`
- verificar `npm run dev`

Criterio:

- landing carga localmente

Prompt:

```txt
Trabajá solo en frontend. Importá el proyecto Next.js de v0 como base en frontend/. No conectes API todavía. Verificá que compile y que las rutas existentes carguen.
```

### Tarea F0.2 — Variables entorno

Archivos:

- `frontend/.env.local.example`
- `frontend/lib/env.ts`

Hacer:

- declarar NEXT_PUBLIC_API_URL
- helper para leer API URL

Criterio:

- no hardcodear backend URL

## Etapa F1 — Tipos y servicios API

### Tarea F1.1 — Tipos compartidos

Archivos:

- `frontend/types/producto.ts`
- `frontend/types/pedido.ts`
- `frontend/types/auth.ts`

Hacer:

- definir tipos TS

Criterio:

- componentes no usan `any` para datos principales

### Tarea F1.2 — Cliente API

Archivos:

- `frontend/services/apiClient.ts`

Hacer:

- wrapper fetch
- base URL
- credentials include
- manejo ok/error

Criterio:

- servicios usan apiClient

### Tarea F1.3 — Servicios

Archivos:

- `productoService.ts`
- `pedidoService.ts`
- `authService.ts`
- `adminService.ts`

Hacer:

- encapsular llamadas

Criterio:

- pantallas no llaman fetch directo

## Etapa F2 — Carrito

### Tarea F2.1 — Adaptar CartContext

Archivos:

- `frontend/components/menu/cart-context.tsx`

Hacer:

- persistir localStorage
- tipos reales
- limpiar carrito

Criterio:

- recargar página conserva carrito

### Tarea F2.2 — Menú con API

Archivos:

- `menu-screen.tsx`
- `product-card.tsx`

Hacer:

- reemplazar mock por API
- loading/error
- filtros

Criterio:

- productos vienen de backend

## Etapa F3 — Checkout y pedido

### Tarea F3.1 — Checkout real

Archivos:

- `checkout-screen.tsx`

Hacer:

- formulario
- efectivo oculta comprobante
- transferencia muestra datos y upload
- submit multipart

Criterio:

- transferencia sin comprobante no permite enviar

### Tarea F3.2 — Redirección a pedido

Archivos:

- `checkout-screen.tsx`
- `app/pedido/[token]/page.tsx`

Hacer:

- al crear pedido, limpiar carrito
- navegar a `/pedido/:token`

Criterio:

- ticket muestra pedido real

## Etapa F4 — Seguimiento/ticket

### Tarea F4.1 — Pedido por token

Archivos:

- `ticket-screen.tsx`
- `tracking-screen.tsx`

Hacer:

- consumir `/api/pedidos/seguimiento/:token`
- mostrar estado real

Criterio:

- refresh muestra datos actualizados

### Tarea F4.2 — jsPDF

Archivos:

- `ticket-screen.tsx`
- `frontend/lib/pdf.ts`

Hacer:

- generar ticket PDF corto vertical

Criterio:

- botón descarga PDF

## Etapa F5 — Admin auth

### Tarea F5.1 — Login

Archivos:

- `login-screen.tsx`
- `authService.ts`

Hacer:

- login real
- credentials include
- error visual
- redirect dashboard

Criterio:

- cookie queda seteada

### Tarea F5.2 — Protected admin

Archivos:

- `frontend/components/admin/protected-admin.tsx`

Hacer:

- consultar /auth/me
- proteger rutas

Criterio:

- sin sesión redirige login

## Etapa F6 — Admin operativo

### Tarea F6.1 — Productos

Archivos:

- `products-screen.tsx`
- `product-form-dialog.tsx`

Hacer:

- CRUD API
- upload imagen
- stock limitado/ilimitado
- categorías

Criterio:

- crear producto real

### Tarea F6.2 — Pedidos

Archivos:

- `orders-screen.tsx`

Hacer:

- listar
- filtrar
- cambiar estado/pago
- cancelar

Criterio:

- acciones actualizan backend

### Tarea F6.3 — Caja

Archivos:

- `caja-screen.tsx`

Hacer:

- venta rápida real
- total
- confirmar venta
- mostrar número

Criterio:

- crea pedido origen caja

### Tarea F6.4 — Cocina

Archivos:

- `cocina-screen.tsx`

Hacer:

- polling cada 10s
- pedidos operativos
- productos pendientes
- cambiar estado

Criterio:

- actualiza sin recargar manualmente

## Etapa F7 — Pantallas faltantes

### Tarea F7.1 — Comprobantes

Crear:

- `app/admin/comprobantes/page.tsx`
- `components/admin/comprobantes-screen.tsx`

Criterio:

- lista comprobantes y permite aprobar/rechazar

### Tarea F7.2 — Reportes

Crear:

- `app/admin/reportes/page.tsx`
- `components/admin/reportes-screen.tsx`

Criterio:

- botones descargan Excel

### Tarea F7.3 — Configuración

Crear:

- `app/admin/configuracion/page.tsx`
- `components/admin/configuracion-screen.tsx`

Criterio:

- cambia abierta/cerrada/demo
