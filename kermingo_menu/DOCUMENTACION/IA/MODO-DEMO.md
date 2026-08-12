# Modo demo — Kermingo

> Portfolio permanente en Vercel **sin backend Railway**.

---

## Estado

Desde el archivo del evento (2026), el sitio público corre en **modo demo**:

- Flag: `NEXT_PUBLIC_MOCK_API=true`
- No llama a Express/MySQL/Drive
- Banner visible: “Modo demo / archivo…”
- Tienda fija en `cerrada`

## Credenciales demo

| Campo | Valor |
|---|---|
| Email | `admin@kermingo.com` |
| Password | `admin123` |

Se muestran en el login cuando `NEXT_PUBLIC_MOCK_API=true` o `NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=true`.

La sesión admin es **local** (`localStorage` clave `kermingo:demoSession`), no cookie httpOnly.

## Qué funciona

| Área | Comportamiento |
|---|---|
| Landing / menú | Fixtures (catálogo seed) + imágenes en `/products/{id}.png` |
| Seguimiento | Tokens demo `demodemo…0001` … `0005` |
| Admin (lectura) | Pedidos, cocina, productos, reportes, config desde fixtures |
| Mutaciones admin | Feedback visual / respuesta fake; **no persisten** al recargar |
| Checkout online | Rechazado (tienda cerrada / archivo) |

## Archivos clave

- `frontend/lib/mocks/mode.ts` — flag
- `frontend/lib/mocks/fixtures.ts` — datos
- `frontend/lib/mocks/adapter.ts` — rutas mock
- `frontend/lib/api.ts` — intercepta si mock
- `frontend/components/demo-archive-banner.tsx`
- `frontend/scripts/env-guard.mjs` — build OK sin `NEXT_PUBLIC_API_URL` si mock

## Variables Vercel

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_MOCK_API` | `true` |
| `NEXT_PUBLIC_API_URL` | vacía o sin definir |
| `NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS` | opcional (`true` redundante con mock) |

## Desarrollo local en mock

```bash
cd frontend
# .env.local
# NEXT_PUBLIC_MOCK_API=true
pnpm dev
```

Para volver a API real: `NEXT_PUBLIC_MOCK_API=false` y `NEXT_PUBLIC_API_URL=http://localhost:3001` con backend arriba.
