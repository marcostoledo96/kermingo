# Design: Frontend mock mode + Railway decommission

## Goals

- Vercel portfolio with zero Railway cost
- Simulated admin login; navigable admin on fixtures
- Mutations: no-op + user-visible demo feedback
- Anonymized SQL on git; static product images in `public/products/`

## Non-goals

MSW, Next `app/api` mock server, session-persisted mutation store, deleting `backend/`.

## Architecture

```
UI screens → lib/api.ts / auth fetch
                │
                ├─ MOCK off → real API_BASE (legacy / local revive)
                └─ MOCK on  → lib/mocks/adapter.ts → fixtures.ts
```

### Flag

- `NEXT_PUBLIC_MOCK_API=true`
- `env-guard.mjs`: if mock flag true, skip requiring `NEXT_PUBLIC_API_URL`
- Optional: `NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=true` on Vercel

### Adapter behavior

| Method | Behavior |
|--------|----------|
| GET matching fixtures | Return data |
| GET unknown | `ApiError` 404 |
| POST/PUT/PATCH/DELETE/Form | Demo success stub or `ApiError` 501 with Spanish demo message; no durable writes |
| Auth login/me/logout | Local session helpers |

### Fixtures source

- Products/categories/config from seed catalog
- Image URLs: `/products/{id}.png` with fallback to `/products/pizza-muzza.png` or placeholder
- Sample pedidos with synthetic PII for admin/cocina/seguimiento demos
- Reportes: static numbers derived from sample pedidos

### Auth simulation

- Storage key e.g. `kermingo_demo_admin`
- `cacheAdminUser` + `AdminSessionProvider` treat mock me as authenticated
- No cookie Set-Cookie

### Banner

Shared component or inline strip: “Modo demo / archivo — evento finalizado. Los cambios no se guardan.”

### DB anonymization

Script `backend/scripts/anonymize-dump.mjs` (or shell) transforms RAW → archives file:

- `pedido.nombre_cliente` → `Cliente Demo N`
- phones → `11XXXXXXXX` synthetic
- tokens → hex fake
- `usuario.contrasenia_hash` → seed demo hash
- null Drive URLs/file ids

### Image export

While Drive/OAuth alive: download product images → `frontend/public/products/{id}.png`. If download fails, keep catalog with pizza placeholder.

### Teardown order

1. Anonymized archive committed
2. Images in public
3. Mock deploy verified on Vercel
4. Revoke OAuth / remove Railway services
5. Update DEPLOY with decommission date

## Threat / privacy notes

Public repo: never RAW dump. Demo credentials are intentional for portfolio. Banner reduces social-engineering risk of fake orders.
