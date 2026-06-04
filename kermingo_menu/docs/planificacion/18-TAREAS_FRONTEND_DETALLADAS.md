# 18 — Tareas frontend detalladas

## Ubicación real del frontend

```txt
/home/marcos/Escritorio/Kermingo/kermingo_menu/diseno-de-landing-kermingo
```

Dentro del repo:

```txt
diseno-de-landing-kermingo/
```

No usar `frontend/` salvo que Marcos lo autorice. Para Vercel, el root directory será `diseno-de-landing-kermingo`.

## Reglas generales

Antes de modificar cualquier archivo:

1. Leer `AGENTS.md`.
2. Leer `docs/planificacion/25-REFERENCIA_VISUAL_FRONTEND.md`.
3. Leer `docs/planificacion/07-FRONTEND_NEXTJS_V0.md`.
4. Leer `docs/planificacion/12-DISENO_VISUAL_V0.md`.
5. Abrir la pantalla existente relacionada.
6. Abrir sus componentes relacionados.
7. Recién después modificar.

Verificación:

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/diseno-de-landing-kermingo
pnpm lint
pnpm build
```

## Etapa F0 — Reconocimiento y estabilización

### F0.1 — Mapear estructura real del frontend

Leer:

```txt
AGENTS.md
docs/planificacion/25-REFERENCIA_VISUAL_FRONTEND.md
diseno-de-landing-kermingo/package.json
diseno-de-landing-kermingo/app/layout.tsx
diseno-de-landing-kermingo/app/page.tsx
diseno-de-landing-kermingo/app/globals.css
```

Crear/modificar:

```txt
docs/docs/mapa-archivos.md
docs/docs/estado-actual.md
```

Hacer:

- Documentar rutas actuales.
- Documentar componentes públicos, menú y admin.
- Detectar mocks, especialmente `lib/products.ts`.
- Detectar scripts reales de `package.json`.
- No modificar código.

Criterio:

- `mapa-archivos.md` explica qué contiene cada carpeta.
- `estado-actual.md` indica qué existe y qué falta.

Prompt:

```txt
Trabajá solo en documentación. Inspeccioná diseno-de-landing-kermingo, que es la referencia visual obligatoria. Documentá rutas, componentes, mocks, scripts y estado actual. No modifiques código.
```

### F0.2 — Verificar compilación inicial

Leer:

```txt
diseno-de-landing-kermingo/package.json
diseno-de-landing-kermingo/next.config.mjs
diseno-de-landing-kermingo/tsconfig.json
```

Modificar solo si hace falta:

```txt
diseno-de-landing-kermingo/package.json
diseno-de-landing-kermingo/next.config.mjs
```

Hacer:

- Ejecutar `pnpm install`.
- Ejecutar `pnpm lint`.
- Ejecutar `pnpm build`.
- Corregir solo errores bloqueantes.
- No rediseñar.

Criterio:

- `pnpm build` termina correctamente.
- El changelog registra la verificación.

## Etapa F1 — Variables, tipos y cliente API

### F1.1 — Variables de entorno

Leer:

```txt
docs/planificacion/14-DEPLOY_RAILWAY_VERCEL.md
docs/planificacion/15-VARIABLES_ENTORNO.md
diseno-de-landing-kermingo/next.config.mjs
```

Crear:

```txt
diseno-de-landing-kermingo/.env.local.example
diseno-de-landing-kermingo/lib/env.ts
```

Hacer:

- Declarar `NEXT_PUBLIC_API_URL`.
- Declarar `NEXT_PUBLIC_APP_URL`.
- Crear helper para leer envs.
- No hardcodear URL del backend.

Criterio:

- El frontend puede leer la URL de API desde env.

### F1.2 — Tipos base TypeScript

Leer:

```txt
docs/planificacion/05-BASE_DE_DATOS_MYSQL.md
docs/planificacion/06-ENDPOINTS_API.md
diseno-de-landing-kermingo/lib/products.ts
```

Crear:

```txt
diseno-de-landing-kermingo/types/api.ts
diseno-de-landing-kermingo/types/producto.ts
diseno-de-landing-kermingo/types/pedido.ts
diseno-de-landing-kermingo/types/auth.ts
diseno-de-landing-kermingo/types/archivo.ts
```

Hacer:

- Definir respuesta API uniforme.
- Definir Producto, Categoria, Pedido, PedidoDetalle, UsuarioAdmin.
- Usar nombres coherentes con backend.
- Evitar `any`.

Criterio:

- Los tipos compilan y pueden importarse.

### F1.3 — Cliente API centralizado

Leer:

```txt
docs/planificacion/06-ENDPOINTS_API.md
docs/planificacion/09-AUTH_COOKIES_CORS.md
diseno-de-landing-kermingo/lib/env.ts
```

Crear:

```txt
diseno-de-landing-kermingo/services/apiClient.ts
```

Hacer:

- Crear wrapper de `fetch`.
- Usar `NEXT_PUBLIC_API_URL`.
- Incluir `credentials: "include"`.
- Parsear respuesta uniforme.
- Manejar errores con mensajes claros.

Criterio:

- Los servicios usan `apiClient`, no `fetch` directo.

## Etapa F2 — Productos y menú

### F2.1 — Servicio de productos

Leer:

```txt
docs/planificacion/06-ENDPOINTS_API.md
diseno-de-landing-kermingo/services/apiClient.ts
diseno-de-landing-kermingo/types/producto.ts
diseno-de-landing-kermingo/lib/products.ts
```

Crear:

```txt
diseno-de-landing-kermingo/services/productoService.ts
```

Hacer:

- `obtenerProductos`.
- Filtros por categoría, tipo y búsqueda.
- Mantener mocks como fallback controlado durante desarrollo.

Criterio:

- Servicio compila.

### F2.2 — Conectar menú a API

Leer:

```txt
diseno-de-landing-kermingo/components/menu/menu-screen.tsx
diseno-de-landing-kermingo/components/menu/menu-filters.tsx
diseno-de-landing-kermingo/components/menu/product-card.tsx
diseno-de-landing-kermingo/components/menu/product-visual.tsx
diseno-de-landing-kermingo/services/productoService.ts
docs/planificacion/25-REFERENCIA_VISUAL_FRONTEND.md
```

Modificar:

```txt
diseno-de-landing-kermingo/components/menu/menu-screen.tsx
```

Solo si hace falta:

```txt
diseno-de-landing-kermingo/components/menu/product-card.tsx
diseno-de-landing-kermingo/components/menu/menu-filters.tsx
```

Hacer:

- Reemplazar mock por `productoService`.
- Agregar loading/error/empty.
- Mantener diseño actual.
- No reescribir ProductCard desde cero.

Criterio:

- Menú carga productos reales cuando API exista.
- Build pasa.

## Etapa F3 — Carrito persistente

### F3.1 — Adaptar CartContext

Leer:

```txt
docs/planificacion/10-CARRITO_LOCALSTORAGE.md
diseno-de-landing-kermingo/components/menu/cart-context.tsx
diseno-de-landing-kermingo/components/menu/floating-cart.tsx
diseno-de-landing-kermingo/components/menu/cart-screen.tsx
```

Modificar:

```txt
diseno-de-landing-kermingo/components/menu/cart-context.tsx
```

Hacer:

- Asegurar persistencia en `localStorage`.
- Guardar productoId, nombre, precio, cantidad, imagen y stock.
- Agregar `clearCart`.
- Evitar errores SSR con `typeof window`.

Criterio:

- Recargar conserva carrito.
- Build pasa.

### F3.2 — Verificar carrito visual

Leer:

```txt
diseno-de-landing-kermingo/components/menu/cart-screen.tsx
diseno-de-landing-kermingo/components/menu/cart-item-row.tsx
diseno-de-landing-kermingo/components/menu/floating-cart.tsx
```

Modificar solo si hace falta:

```txt
diseno-de-landing-kermingo/components/menu/cart-screen.tsx
diseno-de-landing-kermingo/components/menu/cart-item-row.tsx
diseno-de-landing-kermingo/components/menu/floating-cart.tsx
```

Hacer:

- Verificar botones + y -.
- Verificar eliminar producto.
- Verificar total.
- Verificar estado vacío.
- Mantener diseño v0.

Criterio:

- Carrito funciona en UI y mobile.

## Etapa F4 — Checkout y pedido

### F4.1 — Servicio de pedidos

Leer:

```txt
docs/planificacion/06-ENDPOINTS_API.md
docs/planificacion/13-FLUJOS_FUNCIONALES.md
diseno-de-landing-kermingo/types/pedido.ts
diseno-de-landing-kermingo/services/apiClient.ts
```

Crear:

```txt
diseno-de-landing-kermingo/services/pedidoService.ts
```

Hacer:

- Crear pedido online.
- Soportar `multipart/form-data`.
- Obtener pedido por token.
- No validar stock como verdad final en frontend.

Criterio:

- Servicio compila.

### F4.2 — Adaptar checkout existente

Leer:

```txt
diseno-de-landing-kermingo/app/confirmar/page.tsx
diseno-de-landing-kermingo/components/menu/checkout-screen.tsx
diseno-de-landing-kermingo/components/menu/cart-context.tsx
docs/planificacion/13-FLUJOS_FUNCIONALES.md
```

Modificar:

```txt
diseno-de-landing-kermingo/components/menu/checkout-screen.tsx
```

Hacer:

- Nombre obligatorio.
- Mesa opcional.
- Teléfono opcional.
- Observaciones opcional.
- Transferencia muestra datos bancarios y upload.
- Efectivo oculta upload.
- Enviar pedido.
- Si éxito, limpiar carrito y navegar al ticket.

Criterio:

- Transferencia sin comprobante no permite enviar.
- Efectivo no muestra comprobante.
- Build pasa.

### F4.3 — Ticket y seguimiento por token

Leer:

```txt
diseno-de-landing-kermingo/components/menu/ticket-screen.tsx
diseno-de-landing-kermingo/components/menu/tracking-screen.tsx
docs/planificacion/08-RUTAS_FRONTEND.md
```

Crear/modificar:

```txt
diseno-de-landing-kermingo/app/pedido/[token]/page.tsx
diseno-de-landing-kermingo/components/menu/ticket-screen.tsx
diseno-de-landing-kermingo/components/menu/tracking-screen.tsx
```

Hacer:

- Crear ruta por token.
- Consumir pedido real.
- Mostrar estado pago y pedido.
- Mantener ticket vertical.
- Preparar botón PDF.

Criterio:

- Token válido muestra pedido.
- Token inválido muestra error amable.

## Etapa F5 — Admin auth

### F5.1 — Login real

Leer:

```txt
diseno-de-landing-kermingo/app/admin/page.tsx
diseno-de-landing-kermingo/components/admin/login-screen.tsx
docs/planificacion/09-AUTH_COOKIES_CORS.md
```

Crear/modificar:

```txt
diseno-de-landing-kermingo/services/authService.ts
diseno-de-landing-kermingo/components/admin/login-screen.tsx
```

Hacer:

- Conectar login.
- Usar cookie httpOnly.
- Mostrar error.
- Redirigir a dashboard.
- No guardar token en localStorage.

Criterio:

- Login exitoso redirige.
- Error visible.

### F5.2 — Proteger rutas admin

Leer:

```txt
docs/planificacion/09-AUTH_COOKIES_CORS.md
diseno-de-landing-kermingo/app/admin/dashboard/page.tsx
diseno-de-landing-kermingo/components/admin/admin-header.tsx
```

Crear/modificar:

```txt
diseno-de-landing-kermingo/components/admin/protected-admin.tsx
diseno-de-landing-kermingo/services/authService.ts
```

Hacer:

- Consultar `/api/auth/me`.
- Redirigir si no hay sesión.
- Agregar logout.

Criterio:

- Sin sesión no entra.
- Con sesión entra.

## Etapa F6 — Admin operativo

### F6.1 — Productos admin

Leer:

```txt
diseno-de-landing-kermingo/components/admin/products-screen.tsx
diseno-de-landing-kermingo/components/admin/product-form-dialog.tsx
docs/planificacion/06-ENDPOINTS_API.md
```

Crear/modificar:

```txt
diseno-de-landing-kermingo/services/adminProductoService.ts
diseno-de-landing-kermingo/components/admin/products-screen.tsx
diseno-de-landing-kermingo/components/admin/product-form-dialog.tsx
```

Hacer:

- Listar productos reales.
- Crear/editar/desactivar/recuperar.
- Ajustar stock.
- Upload imagen.
- Mantener diseño v0.

Criterio:

- ABM funciona contra API.

### F6.2 — Pedidos admin

Leer:

```txt
diseno-de-landing-kermingo/components/admin/orders-screen.tsx
docs/planificacion/06-ENDPOINTS_API.md
```

Crear/modificar:

```txt
diseno-de-landing-kermingo/services/adminPedidoService.ts
diseno-de-landing-kermingo/components/admin/orders-screen.tsx
```

Hacer:

- Listar pedidos.
- Filtrar.
- Cambiar estado.
- Cambiar pago.
- Cancelar sin motivo obligatorio.

Criterio:

- Acciones actualizan backend.

### F6.3 — Caja rápida

Leer:

```txt
diseno-de-landing-kermingo/components/admin/caja-screen.tsx
docs/planificacion/13-FLUJOS_FUNCIONALES.md
```

Crear/modificar:

```txt
diseno-de-landing-kermingo/services/cajaService.ts
diseno-de-landing-kermingo/components/admin/caja-screen.tsx
```

Hacer:

- Cargar productos.
- Armar venta.
- Confirmar.
- Mostrar número.
- Mandar a cocina.

Criterio:

- Crea pedido origen caja.

### F6.4 — Cocina

Leer:

```txt
diseno-de-landing-kermingo/components/admin/cocina-screen.tsx
docs/planificacion/13-FLUJOS_FUNCIONALES.md
```

Crear/modificar:

```txt
diseno-de-landing-kermingo/services/cocinaService.ts
diseno-de-landing-kermingo/components/admin/cocina-screen.tsx
```

Hacer:

- Polling cada 10 segundos.
- Mostrar pedidos.
- Mostrar productos pendientes.
- Cambiar estados.

Criterio:

- Actualiza sin recargar.

## Etapa F7 — Pantallas faltantes

### F7.1 — Comprobantes

Crear:

```txt
diseno-de-landing-kermingo/app/admin/comprobantes/page.tsx
diseno-de-landing-kermingo/components/admin/comprobantes-screen.tsx
diseno-de-landing-kermingo/services/comprobanteService.ts
```

Leer antes:

```txt
diseno-de-landing-kermingo/components/admin/admin-ui.tsx
diseno-de-landing-kermingo/components/admin/orders-screen.tsx
```

Hacer:

- Lista comprobantes transferencia.
- Aprobar/rechazar.
- Ver archivo.
- Mismo estilo admin.

### F7.2 — Reportes

Crear:

```txt
diseno-de-landing-kermingo/app/admin/reportes/page.tsx
diseno-de-landing-kermingo/components/admin/reportes-screen.tsx
diseno-de-landing-kermingo/services/reporteService.ts
```

Hacer:

- Cards resumen.
- Botones Excel.
- Filtros simples.

### F7.3 — Configuración tienda

Crear:

```txt
diseno-de-landing-kermingo/app/admin/configuracion/page.tsx
diseno-de-landing-kermingo/components/admin/configuracion-screen.tsx
diseno-de-landing-kermingo/services/configuracionService.ts
```

Hacer:

- Abrir/cerrar/demo.
- Mensaje público.
- Hora cena.
