# Modo demo — Kermingo

> Portfolio permanente en Vercel **sin backend Railway**.

---

## Estado

Desde el archivo del evento (2026), el sitio público corre en **modo demo**:

- Flag: `NEXT_PUBLIC_MOCK_API=true`
- No llama a Express, MySQL, Google Drive ni otros servicios de red
- Banner visible: “Modo demo / archivo…”
- Tienda mock en `abierta`: permite completar una compra simulada
- No crea ventas reales ni modifica el stock real

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
| Checkout online | Valida los datos y el comprobante en la UI, y crea un pedido simulado desde los fixtures |
| Pedido simulado | Nace con `estado_pedido='en_preparacion'` y `estado_pago='pagado'` |
| Seguimiento | Admite los tokens fijos `demodemo…0001` … `0005` y los pedidos creados en la pestaña actual |
| Admin (lectura) | Pedidos, cocina, productos, reportes, config desde fixtures |
| Mutaciones admin | Feedback visual / respuesta fake; **no persisten** al recargar |

## Persistencia de la compra simulada

- El detalle dinámico se guarda en `sessionStorage` bajo `kermingo:demoOrders`.
- El detalle sobrevive a la navegación y a los refresh de la pestaña, pero desaparece al cerrarla.
- El checkout también mantiene en `localStorage` el resumen y los tokens existentes (`kermingo:lastOrder`, `kermingo:lastToken` y `kermingo:myOrders`). Por eso una sesión nueva puede conservar un token o resumen sin encontrar su detalle dinámico.
- El comprobante es obligatorio y se valida en la UI, pero su contenido no se guarda ni se vuelve a leer.
- El seguimiento se consulta en `/seguimiento`, por token o mediante el enlace mostrado después de confirmar.

El banner de modo demo permanece visible para evitar que la compra simulada se confunda con una venta real.

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
