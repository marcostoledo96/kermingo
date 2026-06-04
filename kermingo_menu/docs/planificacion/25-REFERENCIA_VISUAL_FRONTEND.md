# 25 — Referencia visual obligatoria del frontend

## Carpeta absoluta de referencia

La referencia visual oficial y obligatoria del frontend es:

```txt
/home/marcos/Escritorio/Kermingo/kermingo_menu/diseno-de-landing-kermingo
```

Dentro del repositorio actual corresponde a:

```txt
diseno-de-landing-kermingo/
```

Esta carpeta fue generada a partir del prototipo de v0 que más gustó y debe usarse como base fuerte para el diseño del frontend.

## Regla principal

Cualquier tarea de frontend debe inspeccionar primero esta carpeta y reutilizar su estructura visual, componentes, estilos y jerarquía antes de proponer rediseños.

No se debe reemplazar la estética por una genérica de IA.

## Qué contiene

```txt
diseno-de-landing-kermingo/
├── app/
│   ├── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   ├── menu/page.tsx
│   ├── carrito/page.tsx
│   ├── confirmar/page.tsx
│   ├── confirmado/page.tsx
│   ├── seguimiento/page.tsx
│   └── admin/
│       ├── page.tsx
│       ├── dashboard/page.tsx
│       ├── productos/page.tsx
│       ├── pedidos/page.tsx
│       ├── caja/page.tsx
│       └── cocina/page.tsx
├── components/
│   ├── header.tsx
│   ├── hero.tsx
│   ├── cta-buttons.tsx
│   ├── event-info.tsx
│   ├── activities.tsx
│   ├── footer.tsx
│   ├── menu/
│   └── admin/
├── lib/products.ts
└── public/images/
```

## Archivos que toda IA debe leer antes de modificar frontend público

```txt
diseno-de-landing-kermingo/app/page.tsx
diseno-de-landing-kermingo/app/globals.css
diseno-de-landing-kermingo/components/header.tsx
diseno-de-landing-kermingo/components/hero.tsx
diseno-de-landing-kermingo/components/cta-buttons.tsx
diseno-de-landing-kermingo/components/event-info.tsx
diseno-de-landing-kermingo/components/activities.tsx
diseno-de-landing-kermingo/components/footer.tsx
```

## Archivos que toda IA debe leer antes de modificar menú/carrito/checkout

```txt
diseno-de-landing-kermingo/components/menu/cart-context.tsx
diseno-de-landing-kermingo/components/menu/menu-screen.tsx
diseno-de-landing-kermingo/components/menu/menu-header.tsx
diseno-de-landing-kermingo/components/menu/menu-filters.tsx
diseno-de-landing-kermingo/components/menu/product-card.tsx
diseno-de-landing-kermingo/components/menu/product-visual.tsx
diseno-de-landing-kermingo/components/menu/floating-cart.tsx
diseno-de-landing-kermingo/components/menu/cart-screen.tsx
diseno-de-landing-kermingo/components/menu/cart-item-row.tsx
diseno-de-landing-kermingo/components/menu/checkout-screen.tsx
diseno-de-landing-kermingo/components/menu/ticket-screen.tsx
diseno-de-landing-kermingo/components/menu/tracking-screen.tsx
diseno-de-landing-kermingo/lib/products.ts
```

## Archivos que toda IA debe leer antes de modificar admin

```txt
diseno-de-landing-kermingo/components/admin/admin-header.tsx
diseno-de-landing-kermingo/components/admin/admin-ui.tsx
diseno-de-landing-kermingo/components/admin/login-screen.tsx
diseno-de-landing-kermingo/components/admin/dashboard-screen.tsx
diseno-de-landing-kermingo/components/admin/products-screen.tsx
diseno-de-landing-kermingo/components/admin/product-form-dialog.tsx
diseno-de-landing-kermingo/components/admin/orders-screen.tsx
diseno-de-landing-kermingo/components/admin/caja-screen.tsx
diseno-de-landing-kermingo/components/admin/cocina-screen.tsx
```

## ADN visual que debe mantenerse

- Fondo celeste claro.
- Azul oscuro como color principal.
- Amarillo/dorado para CTA.
- Celeste argentino como acento.
- Cards blancas con bordes grandes.
- Sombras suaves.
- Franja argentina.
- Detalles de Día de la Bandera.
- Estética Mundial/Argentina.
- Toque scout sutil.
- Mobile-first.
- Botones grandes y claros.
- Actividades como chips o mini elementos, no cards enormes.

## Pantallas que ya existen y se deben adaptar, no recrear desde cero

```txt
/                 Landing
/menu             Catálogo
/carrito          Carrito
/confirmar        Checkout actual, luego puede migrar a /checkout
/confirmado       Confirmación actual, luego puede migrar a /pedido/[token]
/seguimiento      Seguimiento actual
/admin            Login actual
/admin/dashboard  Dashboard
/admin/productos  ABM productos
/admin/pedidos    Pedidos
/admin/caja       Caja rápida
/admin/cocina     Cocina / Entrega
```

## Pantallas que faltan

Crear siguiendo el mismo estilo:

```txt
/admin/comprobantes
/admin/reportes
/admin/configuracion
```

## Decisión sobre nombres de rutas

El prototipo usa:

```txt
/confirmar
/confirmado
/seguimiento
```

La planificación final recomienda:

```txt
/checkout
/pedido/[token]
```

No cambiar rutas de golpe. Primero conectar lo existente. Luego migrar rutas con redirects si hace falta.

## Reglas para tareas de frontend

1. Abrir el archivo de pantalla existente.
2. Abrir los componentes relacionados.
3. Identificar si usa mocks de `lib/products.ts`.
4. Reemplazar mocks por servicios API de a poco.
5. Mantener layout y estilo.
6. Agregar estados loading/error/empty sin romper la estética.
7. Probar mobile.
8. Ejecutar build.
