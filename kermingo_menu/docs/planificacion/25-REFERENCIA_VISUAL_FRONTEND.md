# 25 — Referencia visual frontend

## Regla actualizada

Hay dos carpetas relacionadas con frontend:

```txt
frontend/
diseno-de-landing-kermingo/
```

## Carpeta activa de desarrollo

La carpeta donde se trabaja el frontend real es:

```txt
/home/marcos/Escritorio/Kermingo/kermingo_menu/frontend
```

Dentro del repo:

```txt
frontend/
```

Todo cambio real de frontend debe hacerse ahí.

## Carpeta de referencia visual

La carpeta de referencia visual obligatoria es:

```txt
/home/marcos/Escritorio/Kermingo/kermingo_menu/diseno-de-landing-kermingo
```

Dentro del repo:

```txt
diseno-de-landing-kermingo/
```

Esta carpeta fue generada con v0 y se usa como base visual fuerte.

## Regla no negociable

`diseno-de-landing-kermingo/` es **solo lectura**.

Permitido:

- leer archivos
- comparar componentes
- observar layout
- tomar clases Tailwind como referencia
- tomar decisiones de diseño inspiradas en esa carpeta
- replicar patrones visuales en `frontend/`

No permitido:

- modificar archivos dentro de `diseno-de-landing-kermingo/`
- mover esa carpeta
- usarla como root activo del deploy
- instalar dependencias ahí salvo para verla localmente
- convertirla en fuente de datos o lógica real

## Root Directory en Vercel

El root de Vercel debe ser:

```txt
frontend
```

No usar:

```txt
diseno-de-landing-kermingo
```

## Comandos

### Frontend activo

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/frontend
pnpm dev
pnpm lint
pnpm build
```

### Referencia visual

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/diseno-de-landing-kermingo
pnpm dev
```

Solo para mirar visualmente.

## Archivos a comparar antes de modificar frontend

Cuando se trabaje una pantalla en `frontend/`, primero buscar su equivalente en `diseno-de-landing-kermingo/`.

Ejemplos:

| Pantalla | Archivo activo | Referencia visual |
|---|---|---|
| Landing | `frontend/app/page.tsx` | `diseno-de-landing-kermingo/app/page.tsx` |
| Menú | `frontend/app/menu/page.tsx` | `diseno-de-landing-kermingo/app/menu/page.tsx` |
| Carrito | `frontend/app/carrito/page.tsx` | `diseno-de-landing-kermingo/app/carrito/page.tsx` |
| Checkout | `frontend/app/confirmar/page.tsx` o `frontend/app/checkout/page.tsx` | `diseno-de-landing-kermingo/app/confirmar/page.tsx` |
| Ticket | `frontend/app/confirmado/page.tsx` o `frontend/app/pedido/[token]/page.tsx` | `diseno-de-landing-kermingo/app/confirmado/page.tsx` |
| Seguimiento | `frontend/app/seguimiento/page.tsx` o `frontend/app/pedido/[token]/page.tsx` | `diseno-de-landing-kermingo/app/seguimiento/page.tsx` |
| Admin dashboard | `frontend/app/admin/dashboard/page.tsx` | `diseno-de-landing-kermingo/app/admin/dashboard/page.tsx` |
| Productos | `frontend/app/admin/productos/page.tsx` | `diseno-de-landing-kermingo/app/admin/productos/page.tsx` |
| Pedidos | `frontend/app/admin/pedidos/page.tsx` | `diseno-de-landing-kermingo/app/admin/pedidos/page.tsx` |
| Caja | `frontend/app/admin/caja/page.tsx` | `diseno-de-landing-kermingo/app/admin/caja/page.tsx` |
| Cocina | `frontend/app/admin/cocina/page.tsx` | `diseno-de-landing-kermingo/app/admin/cocina/page.tsx` |

## Criterio de aceptación visual

Una pantalla implementada en `frontend/` se considera aceptable si:

- respeta el ADN visual de v0
- no parece una pantalla genérica de IA
- mantiene mobile-first
- respeta colores, jerarquía y estilo
- tiene botones grandes y claros
- no rompe el flujo de compra
- no modifica la carpeta de referencia
