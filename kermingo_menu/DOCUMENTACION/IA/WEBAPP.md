# Frontend — Kermingo

> Leé este archivo cuando trabajes en rutas, componentes, estados del carrito,
> diseño o integración con el backend.

---

## Índice

1. [Stack y configuración](#1-stack-y-configuración)
2. [Rutas](#2-rutas)
3. [Patrones de estado](#3-patrones-de-estado)
4. [Carrito con localStorage](#4-carrito-con-localstorage)
5. [Diseño y referencia visual](#5-diseño-y-referencia-visual)
6. [Componentes principales](#6-componentes-principales)
7. [Generación de ticket PDF](#7-generación-de-ticket-pdf)
8. [Integración con el backend](#8-integración-con-el-backend)

---

## 1. Stack y configuración

| Tecnología | Versión | Para qué |
|---|---|---|
| Next.js | 16.x | Framework con App Router |
| React | 19.x | UI |
| TypeScript | 5.7 | Tipado estático |
| TailwindCSS | 4.x | Estilos utility-first |
| shadcn/ui | 4.x | Componentes base estilizados |
| lucide-react | 1.x | Iconos |
| jsPDF | — | Generación de ticket PDF |
| qrcode.react | — | Generación de QR scaneable en ticket confirmado |

**Comandos:**

```bash
cd frontend
pnpm install
pnpm dev      # Desarrollo
pnpm lint      # Lint
pnpm build     # Build de producción
```

**Vercel:** Root directory debe ser `frontend`.

---

## 2. Rutas

### Públicas

| Ruta | Archivo | Propósito |
|---|---|---|
| `/` | `app/page.tsx` | Home pública |
| `/menu` | `app/menu/page.tsx` | Carta de productos |
| `/carrito` | `app/carrito/page.tsx` | Carrito y checkout |
| `/confirmar` | `app/confirmar/page.tsx` | Confirmación de datos |
| `/confirmado` | `app/confirmado/page.tsx` | Pedido confirmado — incluye QR scaneable con URL de seguimiento |
| `/seguimiento` | `app/seguimiento/page.tsx` | Seguimiento por token — acepta `?token=` desde QR escaneado |

### Admin

| Ruta | Archivo | Propósito |
|---|---|---|
| `/admin` | `app/admin/page.tsx` | Dashboard |
| `/admin/dashboard` | `app/admin/dashboard/page.tsx` | Dashboard principal |
| `/admin/productos` | `app/admin/productos/page.tsx` | ABM de productos |
| `/admin/pedidos` | `app/admin/pedidos/page.tsx` | Gestión de pedidos |
| `/admin/caja` | `app/admin/caja/page.tsx` | Caja rápida |
| `/admin/cocina` | `app/admin/cocina/page.tsx` | Vista cocina |

---

## 3. Patrones de estado

Cada página que consume la API maneja tres estados:

| Estado | Cómo se ve | Cuándo |
|---|---|---|
| `loading` | Skeleton / spinner | Fetch inicial |
| `error` | Mensaje de error con reintento | Falla de red o error del servidor |
| `empty` | Mensaje amigable sin datos | No hay resultados |

**Patrón recomendado:**

```typescript
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  fetch('/api/...')
    .then(res => res.json())
    .then(json => setData(json.data))
    .catch(err => setError(err.message))
    .finally(() => setLoading(false));
}, []);
```

---

## 4. Carrito con localStorage

El carrito del cliente se persiste en `localStorage`. No hay carrito en el servidor.

**Estructura típica:**

```typescript
interface CartItem {
  producto_id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  tipo: 'comida' | 'bebida' | 'promo';
}
```

**Comportamiento:**
- Se agrega/quita/items desde la página de menú.
- Al confirmar el pedido se envía al backend y se vacía.
- Si la tienda está cerrada (`estado !== 'abierta'`), se muestra mensaje y no se puede avanzar.

---

## 5. Diseño y referencia visual

**Carpeta de referencia (SOLO LECTURA):** `diseno-de-landing-kermingo/`

| Archivo de referencia | Qué contiene |
|---|---|
| `app/page.tsx` | Home con hero y temática |
| `app/menu/page.tsx` | Carta de productos |
| `app/carrito/page.tsx` | Carrito |
| `app/confirmar/page.tsx` | Checkout |
| `app/confirmado/page.tsx` | Confirmación |
| `app/seguimiento/page.tsx` | Seguimiento |
| `app/admin/page.tsx` | Panel admin |
| `app/admin/dashboard/` | Dashboard |
| `app/admin/productos/` | ABM productos |
| `app/admin/pedidos/` | Gestión pedidos |
| `app/admin/caja/` | Caja rápida |
| `app/admin/cocina/` | Vista cocina |
| `components/` | Componentes compartidos |
| `components/admin/` | Componentes admin |
| `components/menu/` | Componentes de menú |

**Reglas:**
- No modificar `diseno-de-landing-kermingo/`.
- Mantener la estética v0: Argentina, Mundial, Día de la Bandera, scout sutil.
- Cards redondeadas, fondo claro, azul/celeste/amarillo, mobile-first.
- El dashboard admin puede mejorarse.

---

## 6. Componentes principales

**Frontend activo:** `frontend/components/`

Componentes esperados (alineados con la referencia v0):

| Componente | Propósito |
|---|---|
| `ProductCard` | Card de producto en el menú |
| `CartItemRow` | Fila de item en el carrito |
| `OrderStatusBadge` | Badge de estado del pedido |
| `PaymentStatusBadge` | Badge de estado de pago |
| `AdminLayout` | Layout del panel admin con sidebar |
| `AdminHeader` | Header del panel admin |
| `TicketScreen` | Pantalla de ticket confirmado con QR scaneable y PDF |
| `TrackingScreen` | Pantalla de seguimiento con input manual y auto-carga por `?token=` |

**Estilos:** TailwindCSS con tokens de color alineados a la paleta Argentina (celeste, azul, amarillo).

---

## 7. Ticket confirmado y QR

La página `/confirmado` muestra el ticket del pedido confirmado con:

- Número KMG, items, total, método de pago, fecha.
- **QR scaneable** (vía `qrcode.react` / `QRCodeSVG`) que codifica la URL pública de seguimiento: `${origin}/seguimiento?token=${order.token}`.
- El QR usa SVG renderer a 168×168 CSS px con color `#003B73` (azul corporativo) para impresión nítida.
- El QR se renderiza solo en cliente (`typeof window !== 'undefined'` guard) para evitar hydration mismatch.
- Botón de descarga PDF via `jsPDF` (incluye el QR en el PDF).
- Botón de tracking link debajo del ticket.

**Flujo QR → seguimiento:** El usuario escanea el QR → navega a `/seguimiento?token=<token>` → `TrackingScreen` lee `useSearchParams().get('token')`, prioriza el token de URL sobre localStorage, y auto-fetchea el pedido.

---

## 8. Integración con el backend

**API base:** `NEXT_PUBLIC_API_URL` (env var). Default `http://localhost:3001`. Leída en `frontend/lib/config.ts`.

**Cliente HTTP:** `frontend/lib/api.ts`

| Helper | Método | Body | Uso típico |
|---|---|---|---|
| `apiGet<T>(path, query?)` | GET | — | Lectura de recursos públicos o admin |
| `apiPost<T>(path, body)` | POST | JSON | Crear recurso sin archivos |
| `apiPostForm<T>(path, formData)` | POST | multipart | Subida con archivo (comprobante) |

Todas las llamadas usan `credentials: 'include'` para enviar la cookie `kermingo_admin_token` cuando aplique. La respuesta sigue el formato estándar (`{ ok, data, message }` o `{ ok: false, error }`); los helpers lanzan `ApiError` con `status` y `message` del backend.

**Mappers:** `frontend/lib/mappers.ts` traduce `ApiProducto`/`ApiPedido` (tipos backend en `lib/types.ts`) a los tipos UI (`Product`, `OrderItem`, `LastOrder`, `PedidoEstado`, `PedidoPago`). Mantiene el `Product.id` como `string` (el backend devuelve `number`) para no romper el cart ni el admin que aún usa mocks.

**Endpoints públicos consumidos (I1 + B7-público):**

| Helper | Endpoint | Pantalla |
|---|---|---|
| `apiGet('/api/productos')` | `GET /api/productos` | `app/menu/page.tsx` |
| `apiPost('/api/pedidos', payload)` o `apiPostForm(...)` | `POST /api/pedidos` | `app/confirmar/page.tsx` |
| `apiGet('/api/pedidos/seguimiento/:token')` | `GET /api/pedidos/seguimiento/:token` | `app/seguimiento/page.tsx` |
| `localStorage` (sin fetch) | `kermingo:lastOrder`, `kermingo:lastToken` | `app/confirmado/page.tsx` (lee lo que dejó checkout) |

**Estado UI:** cada página pública maneja `loading | ready | error` con skeletons, retry y mensajes contextuales. Ver patrón recomendado en §3.

**Imagen de producto:** el backend devuelve una URL relativa (`/api/productos/:id/imagen?v=:archivoId`); el helper `ABSOLUTE_IMAGE_URL()` en `lib/config.ts` la convierte a absoluta anteponiendo `API_BASE`.

| Endpoint público | Uso en frontend |
|---|---|
| `GET /api/productos` | Cargar carta de menú |
| `GET /api/configuracion-tienda` | Verificar si la tienda está abierta |
| `POST /api/pedidos` | Crear pedido online |
| `GET /api/pedidos/seguimiento/:token` | Seguimiento de pedido |

| Endpoint admin | Uso en frontend |
|---|---|
| `POST /api/auth/login` | Login admin |
| `GET /api/admin/pedidos` | Lista de pedidos con filtros |
| `POST /api/admin/pedidos/caja` | Crear pedido de caja |
| `PATCH /api/admin/pedidos/:id/estado` | Avanzar estado |
| `PATCH /api/admin/pedidos/:id/pago` | Cambiar estado de pago |
| `PATCH /api/admin/pedidos/:id/cancelar` | Cancelar pedido |
| `GET /api/admin/cocina/pedidos` | Pedidos para cocina |
| `PATCH /api/admin/cocina/pedidos/:id/estado` | Avanzar estado en cocina |
| `GET /api/admin/productos` | Lista de productos admin |
| `POST /api/admin/productos` | Crear producto |
| `PUT /api/admin/productos/:id` | Actualizar producto |
| `PATCH /api/admin/productos/:id/stock` | Ajustar stock |
| `GET /api/admin/configuracion-tienda` | Config actual |
| `PUT /api/admin/configuracion-tienda` | Actualizar config |

| Endpoint público | Uso en frontend |
|---|---|
| `GET /api/productos` | Cargar carta de menú |
| `GET /api/configuracion-tienda` | Verificar si la tienda está abierta |
| `POST /api/pedidos` | Crear pedido online |
| `GET /api/pedidos/seguimiento/:token` | Seguimiento de pedido |

| Endpoint admin | Uso en frontend |
|---|---|
| `POST /api/auth/login` | Login admin |
| `GET /api/admin/pedidos` | Lista de pedidos con filtros |
| `POST /api/admin/pedidos/caja` | Crear pedido de caja |
| `PATCH /api/admin/pedidos/:id/estado` | Avanzar estado |
| `PATCH /api/admin/pedidos/:id/pago` | Cambiar estado de pago |
| `PATCH /api/admin/pedidos/:id/cancelar` | Cancelar pedido |
| `GET /api/admin/cocina/pedidos` | Pedidos para cocina |
| `PATCH /api/admin/cocina/pedidos/:id/estado` | Avanzar estado en cocina |
| `GET /api/admin/productos` | Lista de productos admin |
| `POST /api/admin/productos` | Crear producto |
| `PUT /api/admin/productos/:id` | Actualizar producto |
| `PATCH /api/admin/productos/:id/stock` | Ajustar stock |
| `GET /api/admin/configuracion-tienda` | Config actual |
| `PUT /api/admin/configuracion-tienda` | Actualizar config |

Ver `API.md` para detalles completos de cada endpoint.