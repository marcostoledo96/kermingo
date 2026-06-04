# 07 — Frontend Next.js basado en v0

## Ubicación real del frontend

El frontend actual está en:

```txt
/home/marcos/Escritorio/Kermingo/kermingo_menu/diseno-de-landing-kermingo
```

Dentro del repo:

```txt
diseno-de-landing-kermingo/
```

Cuando la documentación mencione “frontend”, se refiere a esa carpeta.

## Stack

- Next.js
- React
- TypeScript
- TailwindCSS
- lucide-react
- componentes estilo shadcn si ya existen
- jsPDF para ticket PDF
- localStorage para carrito
- Vitest + React Testing Library
- Playwright para E2E si se implementa

## Regla visual obligatoria

El diseño debe inspirarse fuertemente en el prototipo existente. No recrear desde cero.

Leer siempre:

```txt
docs/planificacion/25-REFERENCIA_VISUAL_FRONTEND.md
```

## Pantallas existentes

```txt
diseno-de-landing-kermingo/app/page.tsx
diseno-de-landing-kermingo/app/menu/page.tsx
diseno-de-landing-kermingo/app/carrito/page.tsx
diseno-de-landing-kermingo/app/confirmar/page.tsx
diseno-de-landing-kermingo/app/confirmado/page.tsx
diseno-de-landing-kermingo/app/seguimiento/page.tsx
diseno-de-landing-kermingo/app/admin/page.tsx
diseno-de-landing-kermingo/app/admin/dashboard/page.tsx
diseno-de-landing-kermingo/app/admin/productos/page.tsx
diseno-de-landing-kermingo/app/admin/pedidos/page.tsx
diseno-de-landing-kermingo/app/admin/caja/page.tsx
diseno-de-landing-kermingo/app/admin/cocina/page.tsx
```

## Componentes clave

```txt
diseno-de-landing-kermingo/components/header.tsx
diseno-de-landing-kermingo/components/hero.tsx
diseno-de-landing-kermingo/components/cta-buttons.tsx
diseno-de-landing-kermingo/components/event-info.tsx
diseno-de-landing-kermingo/components/activities.tsx
diseno-de-landing-kermingo/components/footer.tsx
diseno-de-landing-kermingo/components/menu/cart-context.tsx
diseno-de-landing-kermingo/components/menu/menu-screen.tsx
diseno-de-landing-kermingo/components/menu/product-card.tsx
diseno-de-landing-kermingo/components/admin/dashboard-screen.tsx
diseno-de-landing-kermingo/components/admin/caja-screen.tsx
diseno-de-landing-kermingo/components/admin/cocina-screen.tsx
```

## Carpetas a crear cuando se conecte con la API

```txt
diseno-de-landing-kermingo/services/
diseno-de-landing-kermingo/types/
```

## Variables de entorno

Crear:

```txt
diseno-de-landing-kermingo/.env.local.example
```

Con:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Mocks

Actualmente los productos mock están en:

```txt
diseno-de-landing-kermingo/lib/products.ts
```

No borrar de golpe. Reemplazar gradualmente por servicios API y dejar mocks solo como fallback o referencia.

## Rutas actuales y recomendadas

Actuales:

```txt
/confirmar
/confirmado
/seguimiento
```

Recomendadas a futuro:

```txt
/checkout
/pedido/[token]
```

Primero conectar las rutas actuales. Luego migrar si hace falta con redirects.

## Comandos

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/diseno-de-landing-kermingo
pnpm install
pnpm dev
pnpm lint
pnpm build
```
