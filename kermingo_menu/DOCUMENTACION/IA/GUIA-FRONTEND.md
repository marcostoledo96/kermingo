# Guía frontend — Kermingo (modo demo y general)

> Dónde tocar el frontend del portfolio / menú / admin.

---

## Estructura útil

```txt
frontend/
├── app/                    # Rutas Next (page.tsx por pantalla)
├── components/             # UI (landing, menu/, admin/)
├── lib/
│   ├── api.ts              # Cliente HTTP (+ mock)
│   ├── mocks/              # Fixtures y adapter demo
│   ├── mappers.ts          # API → UI
│   └── products.ts         # Tipos + catálogo legacy estático
└── public/products/        # Imágenes estáticas del demo
```

## Landing

- `app/page.tsx` + `components/hero.tsx`, `header.tsx`, `cta-buttons.tsx`, etc.
- Mantener estética v0 (celeste, azul, amarillo, franja argentina). No rediseñar desde cero.

## Menú público

- Pantalla: `components/menu/menu-screen.tsx`
- Datos: `apiGet('/api/productos')` → en mock sale de `lib/mocks/fixtures.ts`
- Carrito: `components/menu/cart-context.tsx` (localStorage)

### Agregar / editar un producto en el demo

1. Editá `frontend/lib/mocks/fixtures.ts` (array `SEED` / `MOCK_PRODUCTOS`).
2. Poné la imagen en `frontend/public/products/{id}.png`.
3. Si también querés el SQL archive alineado, actualizá `backend/src/api/database/seed.sql` o el archive.

## Admin

- Login: `components/admin/login-screen.tsx` (mock: `mockLogin`)
- Sesión: `components/admin/admin-session.tsx`
- Pantallas: `dashboard-screen`, `orders-screen`, `cocina-screen`, `caja-screen`, `products-screen`, `config-screen`, `comprobantes-screen`

Mutaciones en mock **no persisten**. Para lógica real necesitás backend (ver `REVIVIR-BACKEND.md`).

## Banner demo

`components/demo-archive-banner.tsx` — se muestra si `NEXT_PUBLIC_MOCK_API=true`.

## Imágenes

- Demo: siempre paths same-origin `/products/{id}.png`
- API real: URLs relativas `/api/productos/:id/imagen` resueltas con `ABSOLUTE_IMAGE_URL`

Hay 23 imágenes reales para los IDs 1–13 y 15–24. El ID 14 usa fallback intencional porque no existe una foto exacta; los IDs 8 y 13 comparten la imagen de chocotorta; el ID 24 representa parcialmente pizza + gaseosa.

## Tests

```bash
cd frontend
pnpm test
```

Incluye `test/mock-api.test.ts` y `test/check-env.test.ts`.

## Build

```bash
NEXT_PUBLIC_MOCK_API=true pnpm build
```
