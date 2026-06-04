---
name: kermingo-frontend-v0
description: Usar cuando se trabaje en frontend Next.js/React/Tailwind de Kermingo basado en el prototipo v0.
---

# Kermingo Frontend v0 Skill

## Cuándo usar

Usar antes de modificar archivos dentro de `frontend/`.

## Contexto visual

El prototipo v0 es base visual fuerte. No rediseñar desde cero.

Mantener:

- fondo celeste claro
- azul oscuro
- amarillo/dorado
- franja argentina
- hero fuerte
- chips compactos
- cards blancas redondeadas
- mobile-first
- tono Argentina/Mundial/Día de la Bandera
- toque scout sutil

## Archivos a mirar primero

```txt
frontend/app/page.tsx
frontend/app/globals.css
frontend/components/hero.tsx
frontend/components/header.tsx
frontend/components/cta-buttons.tsx
frontend/components/event-info.tsx
frontend/components/activities.tsx
frontend/components/footer.tsx
frontend/components/menu/menu-screen.tsx
frontend/components/menu/product-card.tsx
frontend/components/menu/cart-context.tsx
frontend/components/admin/dashboard-screen.tsx
```

## Reglas

- No usar fetch directo en pantallas: crear services.
- Usar `credentials: include` para admin.
- Carrito persistente con localStorage.
- Transferencia muestra comprobante; efectivo lo oculta.
- Mantener estados loading/error/empty.
- Probar mobile.
