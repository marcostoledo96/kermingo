# 08 — Rutas frontend Next.js

## Rutas públicas

```txt
/                 Landing del evento
/menu             Catálogo
/carrito          Carrito
/checkout         Checkout
/pedido/:token    Ticket + seguimiento público
```

## Compatibilidad con prototipo v0

El prototipo trae:

```txt
/confirmar
/confirmado
/seguimiento
```

Se recomienda migrar a rutas más claras:

```txt
/checkout
/pedido/[token]
```

Si se quiere mantener compatibilidad:

```txt
/confirmar → redirect a /checkout
/seguimiento → formulario para buscar pedido o explicación
```

## Rutas admin

```txt
/admin/login
/admin/dashboard
/admin/productos
/admin/pedidos
/admin/caja
/admin/cocina
/admin/comprobantes
/admin/reportes
/admin/configuracion
```

## Protección admin

Las rutas admin deben:

1. consultar `/api/auth/me`
2. si no hay sesión, redirigir a `/admin/login`
3. usar `credentials: "include"`

## Organización sugerida App Router

```txt
frontend/app/
├── page.tsx
├── menu/page.tsx
├── carrito/page.tsx
├── checkout/page.tsx
├── pedido/[token]/page.tsx
└── admin/
    ├── login/page.tsx
    ├── dashboard/page.tsx
    ├── productos/page.tsx
    ├── pedidos/page.tsx
    ├── caja/page.tsx
    ├── cocina/page.tsx
    ├── comprobantes/page.tsx
    ├── reportes/page.tsx
    └── configuracion/page.tsx
```

## Nota sobre server/client components

Como casi todas las pantallas tienen interacción, muchas serán Client Components.

Se puede mantener simple:

- páginas cargan componente screen
- screens usan servicios API
- componentes reutilizables muestran UI

Ejemplo:

```tsx
export default function MenuPage() {
  return <MenuScreen />
}
```
