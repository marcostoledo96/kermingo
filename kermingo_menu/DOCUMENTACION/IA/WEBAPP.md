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
| @dnd-kit/core | — | Drag & drop para reordenar productos admin |
| @dnd-kit/sortable | — | Sortable list para tabla de productos admin |

**Comandos:**

```bash
cd frontend
pnpm install
pnpm dev      # Desarrollo
pnpm lint      # Lint
pnpm build     # Build de producción (ejecuta prebuild check de NEXT_PUBLIC_API_URL)
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
| `/admin` | `app/admin/page.tsx` | Login admin |
| `/admin/dashboard` | `app/admin/dashboard/page.tsx` | Panel operativo del evento (mesa de control) |
| `/admin/productos` | `app/admin/productos/page.tsx` | ABM de productos |
| `/admin/pedidos` | `app/admin/pedidos/page.tsx` | Gestión de pedidos |
| `/admin/caja` | `app/admin/caja/page.tsx` | Caja rápida |
| `/admin/cocina` | `app/admin/cocina/page.tsx` | Vista cocina |
| `/admin/comprobantes` | `app/admin/comprobantes/page.tsx` | Revisión de comprobantes de transferencia |
| `/admin/config` | `app/admin/config/page.tsx` | Configuración de la tienda |
| `/admin/reportes` | `app/admin/reportes/page.tsx` | Reportes de recaudación, pagos y ranking de productos |

> **Rutas implementadas:** `/admin/comprobantes`, `/admin/config`, `/admin/reportes` ahora tienen `page.tsx` funcional.

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
- **Tienda cerrada/demo:** `MenuScreen` y `CheckoutScreen` leen `GET /api/configuracion-tienda` en paralelo. Si `estado !== 'abierta'`, se muestra `mensaje_publico`, se deshabilitan botones de agregar/confirmar y se oculta el carrito. El estado `loading` y errores de red también se manejan con skeletons/retry.
- **Comprobante validado en frontend:** `CheckoutScreen` rechaza HEIC y archivos >5 MB antes de setear el receipt. El `accept` del file picker es `image/jpeg,image/png,image/webp,application/pdf`. Backend también valida magic bytes como autoridad final.
- **Checkout público solo acepta transferencia con comprobante** (`CheckoutScreen`). El cliente debe subir un archivo comprobante. El envío usa `apiPostForm` (multipart/form-data) a `POST /api/pedidos`. Efectivo solo está disponible en caja rápida (admin).

---

## 5. Diseño y referencia visual

**Carpeta de referencia (LOCAL, NO versionada en git):** `diseno-de-landing-kermingo/`

> **Nota:** Esta carpeta existe solo localmente como referencia visual del prototipo v0. Fue removida de git intencionalmente (ver `.gitignore`). No se debe depender de ella para CI/build ni modificar su contenido. Si se necesita comparar diseño, consultarla localmente.

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
- No modificar `diseno-de-landing-kermingo/` (carpeta local, no versionada).
- No depender de esta carpeta en CI/build — no existe en el repositorio remoto.
- Mantener la estética v0: Argentina, Mundial, Día de la Bandera, scout sutil.
- Cards redondeadas, fondo claro, azul/celeste/amarillo, mobile-first.
- El dashboard admin ya fue alineado visualmente con la referencia v0 (ver §11).

**Auditoría visual post-mejoras (Prompt 8):** Ver `docs/planificacion/31-AUDITORIA_FINAL_VISUAL_FRONTEND_POST_MEJORAS.md` para diagnóstico completo por pantalla, problemas pendientes, checklist de accesibilidad y escenarios de verificación manual. La auditoría encontró que admin y flujo público (carrito → seguimiento) están completamente migrados a tokens `--km-*`, mientras que landing y menú público aún usan colores hex hardcodeados.

---

## 6. Componentes principales

**Frontend activo:** `frontend/components/`

Componentes esperados (alineados con la referencia v0):

| Componente | Propósito |
|---|---|
| `ProductCard` | Card de producto en el menú. Deshabilita botón cuando `disponible=0` (todavía no disponible) con copia "Todavía no disponible". |
| `CartItemRow` | Fila de item en el carrito |
| `OrderStatusBadge` | Badge de estado del pedido |
| `PaymentStatusBadge` | Badge de estado de pago |
| `AdminLayout` | Layout del panel admin con sidebar |
| `AdminHeader` | Header del panel admin. Usa `useAdminSession()` para mostrar usuario activo y botón de logout. Muestra skeleton durante loading, alerta en error, y nombre real en authenticated |
| `AdminSessionProvider` | Guard de sesión: protege rutas admin, solo renderiza contenido cuando `status === 'authenticated'` o `'unauthenticated'` (login). Estado `'error'` muestra retry, `'loading'` muestra spinner. |
| `AdminShell` | Shell con sidebar, topbar y footer para secciones admin |
| `MenuScreen` | Pantalla del menú público. Lee `configuracion_tienda.categoria_default` para seleccionar pestaña inicial (Merienda/Cena). Usuarios pueden cambiar libremente. Renderiza productos en orden del API (`orden ASC`). |
| `ConfigScreen` | Configuración de tienda: banner de estado con `IconBox` y botones abrir/cerrar, mensaje público con contador y guardado, campo `cena_habilitada_desde` (input type=time), selector de categoría por defecto (Merienda/Cena). Usa `GET /api/configuracion-tienda` (público) y `PUT /api/admin/configuracion-tienda` (admin) |
| `ReportesScreen` | Reportes admin. Consume `GET /api/admin/reportes`, muestra KPIs de recaudación/pagos/productos, producto estrella, ranking y descarga CSV local de resumen/ranking |
| `ComprobantesScreen` | Revisión de comprobantes de transferencia. Fetch metadata de `GET /api/admin/pedidos/:id/comprobante` y abre `url_publica` de Drive |
| `OrderEditModal` | Modal dentro de `OrdersScreen`: corrige datos del cliente, método/estado de pago y productos. Carga detalle completo del pedido, permite cambiar cantidades, quitar productos y agregar productos activos desde `GET /api/admin/productos?estado=activo`. Al guardar envía `PUT /api/admin/pedidos/:id` y bloquea `items` vacío en cliente. |
| `TicketScreen` | Pantalla de ticket confirmado con QR scaneable y PDF |
| `TrackingScreen` | Pantalla de seguimiento con input manual y auto-carga por `?token=`. **B7:** Cuando `estado_pedido='recibido'` y `estado_pago!='pagado'` muestra "Estamos comprobando tu pago. En cuanto lo verifiquemos, lo mandamos a cocina." |

**Estilos:** TailwindCSS con tokens de color alineados a la paleta Argentina (celeste, azul, amarillo).

---

## 9. Fuente única de datos del evento (`lib/evento.ts`)

El archivo `frontend/lib/evento.ts` centraliza todos los strings visibles del evento: nombre, fecha, horario, dirección, organizadores, frase institucional y temática.

**Por qué existe:** La auditoría visual (doc 28 §2.1) detectó inconsistencia entre `README.md` (Echeverría 3920) y `AGENTS.md` (Estomba 1980). Para evitar que la dirección, fecha u organizadores se hardcodeen en múltiples componentes, se unificó en una única fuente.

**Consumidores actuales:**
- `components/event-info.tsx` — landing section de datos del evento
- `components/footer.tsx` — nombre, fecha, horario, dirección, organizadores, descripción
- `components/menu/ticket-screen.tsx` — nombre, dirección, frase institucional
- `components/admin/admin-ui.tsx` — AdminFooter usa `nombre` y `fechaCorta`

**Regla:** Cualquier componente que muestre nombre del evento, fecha, dirección, organizadores o frase institucional debe importar desde `lib/evento.ts` y no hardcodear strings.

**Dirección pendiente:** El campo `direccionPendienteDeConfirmar` está en `true` hasta que Marcos confirme si la dirección correcta es Estomba 1980 o Echeverría 3920.

---

## 10. Sistema de tokens de estado (`globals.css` + `admin-ui.tsx`)

Se añadieron variables CSS y clases utilitarias en `globals.css` (sección `:root` y `@layer utilities`) para reemplazar los colores Tailwind genéricos (emerald, amber, rose, sky, slate) por tokens propios de Kermingo en componentes de estado.

**Variables CSS añadidas:**

| Token | Fondo | Texto | Uso |
|---|---|---|---|
| `--km-info-bg/text` | Celeste suave | Azul | Recibido, pendiente, informativo |
| `--km-preparando-bg/text` | Amarillo suave | Marrón ámbar | En preparación |
| `--km-listo-bg/text` | Cian | Verde azulado | Listo, pagado, activo |
| `--km-alerta-bg/text` | Naranja suave | Naranja | Stock bajo |
| `--km-peligro-bg/text` | Rosa suave | Rojo Kermingo | Cancelado, agotado, rechazado |
| `--km-entregado-bg/text` | Gris azulado | Gris azulado | Entregado, cerrado |
| `--km-demo-bg/text` | Violeta suave | Violeta | Modo demo |

**Clases utilitarias añadidas:**

| Clase | Propósito |
|---|---|
| `.km-focus` | Focus ring visible para accesibilidad |
| `.km-panel` | Panel operativo (reemplaza cards genéricas) |
| `.km-panel-operativo` | Panel con header (alias) |
| `.km-tabular` | `font-variant-numeric: tabular-nums` para números alineados |
| `.km-safe-bottom` | Padding bottom para safe-area en mobile |

**Componente `EstadoBadge`** en `admin-ui.tsx`:

Mapea estados de dominio a tokens visuales usando el tipo `EstadoVisual`:
- `informacion`, `pendiente`, `preparando`, `listo`, `entregado`
- `pagoPendiente`, `agotado`, `cancelado`, `demo`, `stockBajo`, `activo`

Usa las variables CSS en vez de clases Tailwind genéricas.

**Componente `Badge`** ahora soporta los tones adicionales: `preparando`, `listo`, `entregado`, `alerta`, `demo`.

**Regla:** Los nuevos componentes admin deben usar `EstadoBadge` en vez de `Badge` con tones genéricos. Los componentes existentes pueden migrarse gradualmente.

---

## 7. Ticket confirmado y QR

La página `/confirmado` muestra el ticket del pedido confirmado con estilo de "talón de kermesse":

- Número KMG, items, total, método de pago, fecha.
- **QR scaneable** (vía `qrcode.react` / `QRCodeSVG`) que codifica la URL pública de seguimiento: `${origin}/seguimiento?token=${order.token}`.
- El QR usa SVG renderer a 176×176 CSS px con color `#003B73` (azul corporativo) para impresión nítida, dentro de un contenedor con borde punteado celeste y quiet zone blanca para máxima escaneabilidad.
- El QR se renderiza solo en cliente (`typeof window !== 'undefined'` guard) para evitar hydration mismatch.
- Encabezado "Talón de kermesse" en vez de "Pedido confirmado".
- Sección de retiro con ícono de mostrador y dirección del evento desde `EVENTO.direccion`.
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

**Imagen de producto:** el backend devuelve una URL relativa (`/api/productos/:id/imagen?v=:archivoId`); el helper `ABSOLUTE_IMAGE_URL()` en `lib/config.ts` la convierte a absoluta anteponiendo `API_BASE`. **Todos los mappers deben usar `ABSOLUTE_IMAGE_URL()` — tanto los públicos (`mapProducto` en `mappers.ts`) como los admin (`apiToAdminProduct`, `apiToCajaProduct` en `admin.ts`) y el preview del formulario (`product-form-dialog.tsx`).** Si no se convierte, el navegador pide la imagen desde el servidor de desarrollo de Next (`localhost:3000`) en vez del backend (`localhost:3001`), generando un 404.

| Endpoint público | Uso en frontend |
|---|---|
| `GET /api/productos` | Cargar carta de menú |
| `GET /api/configuracion-tienda` | Verificar si la tienda está abierta |
| `POST /api/pedidos` | Crear pedido online |
| `GET /api/pedidos/seguimiento/:token` | Seguimiento de pedido |

| Endpoint admin | Uso en frontend |
|---|---|
| `POST /api/auth/login` | Login admin |
| `GET /api/admin/pedidos` | Lista de pedidos con filtros. Soporta `?estado_pedido=recibido|en_preparacion|listo|entregado` (usado por los 4 tabs de admin pedidos) |
| `POST /api/admin/pedidos/caja` | Crear pedido de caja |
| `PATCH /api/admin/pedidos/:id/estado` | Avanzar estado |
| `PATCH /api/admin/pedidos/:id/pago` | Cambiar estado de pago |
| `PATCH /api/admin/pedidos/:id/cancelar` | Cancelar pedido |
| `GET /api/admin/pedidos/:id/comprobante` | Metadatos de comprobante (Drive URL) — `ComprobantesScreen` |
| `GET /api/admin/cocina/pedidos` | Pedidos para cocina |
| `PATCH /api/admin/cocina/pedidos/:id/estado` | Avanzar estado en cocina |
| `GET /api/admin/productos` | Lista de productos admin con filtro `?estado=` (activo/todos/desactivado/agotado/todavia_no_disponible). Default `activo`. |
| `POST /api/admin/productos` | Crear producto (incluye `orden`, `disponible`) |
| `PUT /api/admin/productos/:id` | Actualizar producto (incluye `orden`, `disponible`) |
| `GET /api/admin/productos/:id/componentes` | Cargar componentes de una promo en el formulario de producto |
| `PUT /api/admin/productos/:id/componentes` | Reemplazar componentes de una promo; `[]` limpia componentes y deshabilita la promo |
| `PATCH /api/admin/productos/:id/stock` | Ajustar stock |
| `PATCH /api/admin/productos/orden` | Reordenar productos (batch) — body `{ ordenes: [{ id, orden }] }` |
| `GET /api/admin/configuracion-tienda` | Config actual (incluye `categoria_default`) |
| `PUT /api/admin/configuracion-tienda` | Actualizar config (acepta `categoria_default`)
| `GET /api/admin/reportes` | KPIs y ranking de productos para `ReportesScreen` |

| Endpoint público | Uso en frontend |
|---|---|
| `GET /api/productos` | Cargar carta de menú |
| `GET /api/configuracion-tienda` | Verificar si la tienda está abierta |
| `POST /api/pedidos` | Crear pedido online |
| `GET /api/pedidos/seguimiento/:token` | Seguimiento de pedido |

| Endpoint admin | Uso en frontend |
|---|---|
| `POST /api/auth/login` | Login admin |
| `GET /api/admin/pedidos` | Lista de pedidos con filtros. Soporta `?estado_pedido=recibido|en_preparacion|listo|entregado` (usado por los 4 tabs de admin pedidos) |
| `POST /api/admin/pedidos/caja` | Crear pedido de caja |
| `PATCH /api/admin/pedidos/:id/estado` | Avanzar estado |
| `PATCH /api/admin/pedidos/:id/pago` | Cambiar estado de pago |
| `PATCH /api/admin/pedidos/:id/cancelar` | Cancelar pedido |
| `GET /api/admin/pedidos/:id/comprobante` | Metadatos de comprobante (Drive URL) — `ComprobantesScreen` |
| `GET /api/admin/cocina/pedidos` | Pedidos para cocina |
| `PATCH /api/admin/cocina/pedidos/:id/estado` | Avanzar estado en cocina |
| `GET /api/admin/productos` | Lista de productos admin con filtro `?estado=` (activo/todos/desactivado/agotado/todavia_no_disponible). Default `activo`. |
| `POST /api/admin/productos` | Crear producto (incluye `orden`, `disponible`) |
| `PUT /api/admin/productos/:id` | Actualizar producto (incluye `orden`, `disponible`) |
| `GET /api/admin/productos/:id/componentes` | Cargar componentes de una promo en el formulario de producto |
| `PUT /api/admin/productos/:id/componentes` | Reemplazar componentes de una promo; `[]` limpia componentes y deshabilita la promo |
| `PATCH /api/admin/productos/:id/stock` | Ajustar stock |
| `PATCH /api/admin/productos/orden` | Reordenar productos (batch) — body `{ ordenes: [{ id, orden }] }` |
| `GET /api/admin/configuracion-tienda` | Config actual (incluye `categoria_default`) |
| `PUT /api/admin/configuracion-tienda` | Actualizar config (acepta `categoria_default`)
| `GET /api/admin/reportes` | KPIs y ranking de productos para `ReportesScreen` |

Ver `API.md` para detalles completos de cada endpoint.

---

## 11. Dashboard admin — Panel operativo del evento

El dashboard (`/admin/dashboard`) funciona como mesa de control del evento en vivo, no como dashboard SaaS genérico.

**Jerarquía de la pantalla:**

1. **Ahora en el evento** — tira operativa con pendientes, pagos por revisar, listos para entregar, preparando. Cada item linkea a la sección correspondiente (Pedidos o Cocina). Usa `EstadoBadge` con tokens Kermingo.
2. **Acciones de jornada** — botones táctiles grandes: Caja rápida (dorado), Cocina, Pedidos, Productos, Comprobantes, Configuración y Reportes. Comprobantes, Configuración y Reportes están integradas.
3. **Alertas de stock** — stock bajo y agotados con tokens `--km-alerta` y `--km-peligro`.
4. **Recaudación** — dato financiero secundario, no compite con lo operativo. Aparece al costado de últimos pedidos en desktop.
5. **Últimos pedidos** — tabla compacta con `EstadoBadge` en vez de `Badge` con tones genéricos. En desktop, ocupa 2/3 del ancho junto a recaudación.

**Cambios vs. versión anterior (doc 28 §2.2):**
- Reemplazadas 6 metric cards iguales por tira operativa "Ahora en el evento".
- Eliminados colores Tailwind default (emerald, amber, rose, sky, slate).
- Uso exclusivo de `EstadoBadge` y variables CSS `--km-*` para estados.
- Dorado reservado solo para Caja rápida.
- `km-tabular` en números, códigos y montos.
- Navegación admin completa con shell/sidebar: Dashboard, Caja, Pedidos, Cocina, Comprobantes, Productos, Configuración y Reportes. Reportes consume métricas reales del backend.
- Desktop usa `max-w-6xl` y layout 1fr/2fr para recaudación + pedidos.
- Mobile 360px: densidad controlada, sin saturación.

---

## 12. Admin Caja — Registradora rápida de kermesse

La pantalla `/admin/caja` funciona como una caja rápida real de kermesse: vender rápido, agregar productos sin fricción, cobrar y registrar pedido. No es un menú público, es una registradora operativa.

**Jerarquía de la pantalla:**

1. **Catálogo de productos** — grilla densa de botones operativos (no cards de menú). Cada botón muestra nombre, precio con `km-tabular`, stock disponible en unidades (`5 u`), y badges de estado inline (`Agotado`, `Bajo`). Si un producto ya está en la venta, se muestra un badge dorado con la cantidad agregada.
2. **Panel de pedido lateral** — en desktop, siempre visible a la derecha (360px). Contiene líneas con controles +/- compactos, subtotal por línea, método de pago, datos opcionales, total grande y acciones.
3. **Barra "Cobrar" mobile** — barra inferior fija con `km-safe-bottom` que muestra ítems + total, sin cubrir productos. Toca para abrir el sheet del pedido.
4. **Método de pago** — Efectivo es la opción default y visualmente destacada (fondo `--km-listo-bg` / teal). Transferencia usa azul oscuro. Ambos métodos se registran como `pagado` al confirmar caja; el backend ignora estados legacy pendientes.

**B7: Product photos in caja cards** — Los botones de producto ahora renderizan `next/image` con la imagen del producto cuando `imagen_url` existe (URL absoluta via `ABSOLUTE_IMAGE_URL` en `apiToCajaProduct`). Si no hay imagen, se muestra el fallback `ProductIconGlyph`.

**Cambios vs. versión anterior (doc 28 §4.8):**
- Productos: de cards con icono+imagen a botones operativos compactos (nombre + precio + stock).
- **B7 producto image:** se agregó imagen del producto dentro del botón cuando `imagen_url` está disponible; fallback a `ProductIconGlyph` si no.
- Cantidad en botón: badge dorado con cantidad si el producto ya está en la venta.
- Carrito desktop: panel lateral siempre visible con `km-panel`, sin sombras pesadas.
- Mobile: barra inferior "Cobrar · $total" con chevron-up en vez de tapar contenido.
- Efectivo: opción default y clara, con indicador de registro automático.
- Transferencia: registro presencial directo como `pagado`; no requiere comprobante en caja.
- Eliminados colores Tailwind default (red, slate, emerald) en favor de tokens `--km-*`.
- `km-tabular` en precios, cantidades y totales.
- `km-focus` en todos los controles interactivos.
- `km-safe-bottom` en barra mobile.
- Removido hover translate en productos (era fricción innecesaria para botones de caja).
- Removido ícono de producto en cada botón (menos ruido, más velocidad de lectura).
- Removido `Badge` con tones genéricos (`danger`, `warning`) en favor de texto inline con tokens.
- Confirmación de venta: ícono en `--km-listo-bg`/`--km-listo-text` en vez de `emerald`.

---

## 13. Admin Cocina — KDS simple de kermesse

La pantalla `/admin/cocina` funciona como un tablero KDS (Kitchen Display System) simplificado para una kermesse: ver rápido qué preparar, qué está listo y qué entregar. **B7: la cocina ya no muestra pedidos en `recibido`** — los pedidos online deben ser confirmados desde la solapa "Pendiente de confirmación" en `/admin/pedidos` primero.

**Jerarquía de la pantalla:**

1. **Productos pendientes** — strip horizontal arriba de todo que muestra los ítems por preparar agrupados por producto (no por pedido). Usa tokens `--km-preparando-*`. En desktop, muestra hasta 12 productos como chips; en mobile, hasta 8. Incluye total de ítems y productos únicos. Es la primera cosa que ve la cocina al entrar.
2. **Desktop: KDS en columnas** — 2 columnas fijas por estado (En preparación, Listos). La columna "Recibidos" fue eliminada en B7. Cada columna tiene header con icono + label + conteo. Los pedidos se ubican en su columna correspondiente. Pedidos cerrados (entregados/cancelados) están colapsados en un `<details>` al final.
3. **Mobile: tabs con estado visual** — tabs Preparando / Listos / Entregados (ya no incluye Recibidos). Cada tab usa el color de estado correspondiente (no solo el conteo). Pendientes repetido como chips debajo de los tabs para consulta rápida.
4. **Card de pedido KDS** — cada pedido tiene: borde izquierdo coloreado por estado (no solo badge), banner de estado con icono + texto (no solo color), código, cliente, hora, mesa, observaciones con tokens `--km-preparando-*`, líneas de producto con cantidad y nombre.
5. **Acciones múltiples por card** — según el estado actual, se muestran acciones primarias y secundarias. **B7: la cocina ya no muestra pedidos en `recibido`** (solo aparecen tras confirmación en admin pedidos):
   - **En preparación**: secundaria "Volver a recibido" (→ recibido, retroceso por error — desaparece de KDS al retroceder) + primaria "Marcar listo" (→ listo)
   - **Listo**: secundaria "Volver a preparación" (→ preparación, retroceso por error) + primaria "Entregado" (→ entregado, con confirmación)
   - **Entregado/Cancelado**: sin acciones (estado terminal)
6. **Cancelar oculto** — la acción de cancelar está en un menú desplegable (icono `MoreHorizontal` / "…"), no como botón visible que compite con las acciones de avance. Solo aparece en estados `en_preparacion`.

**Diseño visual por estado (no solo color):**

| Estado | Borde izquierdo | Banner | Icono | Token |
|---|---|---|---|---|---|
| En preparación | `--km-preparando-text` (ámbar) | `--km-preparando-bg` (ámbar suave) | `Flame` | `preparando` |
| Listo | `--km-listo-text` (teal) | `--km-listo-bg` (cian) | `Bell` | `listo` |
| Entregado | `--km-entregado-text` (gris azulado) | `--km-entregado-bg` (gris suave) | `CircleCheck` | `entregado` |
| Cancelado | `--km-peligro-text` (rojo Kermingo) | `--km-peligro-bg` (rosa suave) | `CircleX` | `cancelado` |
| Pago pendiente | — | badge inline | — | `pagoPendiente` |

> **B7:** `recibido` ya no aparece en el KDS de cocina. Los pedidos en `recibido` se gestionan desde la solapa "Pendiente de confirmación" en `/admin/pedidos`.

**Cambios vs. versión anterior (doc 28 §4.9):**
- Desktop: de grilla 2 cols genérica a tablero KDS 3 columnas por estado.
- Mobile: de tabs genéricos a tabs con color de estado + icono por tab.
- Cards: de `border-2 border-[#75AADB]/20` + badges genéricos a `border-l-[3px]` coloreado + banner con icono.
- Estados: de `Badge` con tones genéricos (`info`/`warning`/`success`/`neutral`/`danger`) a `EstadoBadge` con tokens `--km-*`.
- Observaciones: de `bg-amber-50 text-amber-700` a `--km-preparando-bg`/`--km-preparando-text`.
- Cancel: de botón visible en grilla 2×2 a menú desplegable oculto (no compite).
- Acción: de 4 botones en grilla a 1 botón principal contextual (siguiente paso lógico).
- Productos pendientes: de sidebar lateral secundaria a strip protagonista arriba.
- Errores: de `bg-red-50 text-red-700 border-red-200` a `--km-peligro-bg`/`--km-peligro-text`.
- Entregado: de `text-emerald-500` a `--km-entregado-text`.
- Cancelado: de `text-red-500` a `--km-peligro-text`.
- Vacío: de `text-slate-400` a `text-[#003B73]/35`.
- Pedidos cerrados en desktop: colapsados en `<details>` para no competir con activos.
- Eliminados todos los colores Tailwind default (red, emerald, amber, slate) en favor de tokens `--km-*`.
- `km-tabular` en códigos, cantidades y totales.
- `km-focus` en todos los controles interactivos.
- `km-panel` en cards en vez de `rounded-2xl + shadow-sm`.
- Polling, endpoints y lógica de avance/cancelación preservados sin cambios.

---

## 14. Admin Pedidos — Gestión de excepciones y control de pedidos

La pantalla `/admin/pedidos` funciona como herramienta para resolver excepciones, verificar pagos y controlar pedidos, organizada en tabs por estado.

**Jerarquía de la pantalla (B7 tabs):**

1. **4 tabs por estado** — el orden por defecto es "Pendiente de confirmación" (`recibido`), y el usuario puede cambiar entre tabs. Cada tab fetches `GET /api/admin/pedidos?estado_pedido={state}&limit=24` directamente desde el servidor; la tab pendiente agrega `origen=online&estado_pago=comprobante_subido` para que no entren ventas de caja rápida ni pedidos ya pagos. Los badges de conteo se obtienen en paralelo con requests `limit=1` por tab usando los mismos filtros:
    - **Pendiente de confirmación** (`recibido`) — pedidos online con comprobante subido que esperan verificación de pago. **No tienen acción genérica de avance.** Solo se pueden enviar a cocina mediante el flujo "Confirmar pago" (ver abajo).
   - **En preparación** (`en_preparacion`) — pedidos que ya están en cocina.
   - **Listos** (`listo`) — pedidos listos para entregar.
   - **Entregados** (`entregado`) — pedidos completados, solo lectura.
2. **Confirmar pago (solo en tab `recibido`)** — botón "Confirmar pago" que ejecuta secuencia no-atómica: `PATCH /api/admin/pedidos/:id/pago {estado_pago:'pagado'}` → si 200, luego `PATCH /api/admin/pedidos/:id/estado {estado_pedido:'en_preparacion'}`. Si el payment PATCH falla, NO se ejecuta el state PATCH. El orden queda en `recibido`+`pagado` y puede reintentarse manualmente.
3. **Búsqueda** — barra de búsqueda siempre visible (por número, cliente o teléfono) con debounce de 300ms.
4. **Filtros colapsables** — panel desplegable con chips de Estado, Pago y Método. Solo se muestra si el usuario lo abre. Los filtros activos se indican con badge en el botón.
5. **Cards con jerarquía clara** — cada pedido muestra: código, cliente, total, estado como `EstadoBadge`, pago como línea compacta inline (no badge que compite), origen (Caja/Online) sutil. Borde izquierdo coloreado por estado.
6. **Acción principal dinámica** — un solo botón grande contextual por estado. En el tab `recibido` no hay avance genérico (solo confirm-payment):
   - **recibido →** botón "Confirmar pago" (no avance de estado directo)
   - **en_preparacion →** "Marcar listo"
   - **listo →** "Entregar"
   - **entregado →** sin acción disponible
7. **Pago pendiente resaltado** — si un pedido necesita pago y no está cerrado, aparece aviso inline "Pago pendiente — verificá al entregar" y botón rápido "Pagado".
8. **Acciones secundarias ocultas** — "Cancelar pedido" y "Ver detalle" están en menú desplegable (icono `MoreHorizontal`), no como botones visibles que compiten.
9. **Editar pedido** — el menú secundario abre un modal para pedidos no cancelados. Permite corregir metadata/pago, ajustar cantidades, quitar productos y agregar productos activos; al guardar refetchea la lista y mantiene el modal abierto si el backend devuelve 400/409.
10. **Empty states contextuales** — distinto mensaje según tab activo y si hay filtros.

**Diseño visual por estado:**

| Estado | Borde izquierdo | EstadoBadge | Icono | Acción principal |
|---|---|---|---|---|
| Recibido | `--km-info-text` (azul) | `informacion` | `CircleDot` | **Confirmar pago** (no avance directo a cocina) |
| En preparación | `--km-preparando-text` (ámbar) | `preparando` | `Flame` | Marcar listo → |
| Listo | `--km-listo-text` (teal) | `listo` | `Bell` | Entregar → |
| Entregado | `--km-entregado-text` (gris azulado) | `entregado` | `CircleCheck` | Ver detalle |
| Cancelado | `--km-peligro-text` (rojo Kermingo) | `cancelado` | `CircleX` | Ver detalle |
| Pago pendiente | — | aviso inline | `CircleDollarSign` | Botón rápido "Pagado" |

**Cambios vs. versión anterior (B7):**
- **De vista única a 4 tabs por estado** — flat list reemplazada por tabs `recibido`/`preparacion`/`listo`/`entregado` con server-side filtering.
- **Payment gate agregado** — los pedidos online en `recibido` ya no tienen "Empezar" como acción de avance directo. Deben pasar por "Confirmar pago" que ejecuta payment PATCH → state PATCH secuencial.
- **Tab counts** — badges con conteo por tab se obtienen con requests paralelos `limit=1`.
- **Edición agregada** — `OrderEditModal` usa `GET /api/admin/pedidos/:id`, `GET /api/admin/productos?estado=activo` y `PUT /api/admin/pedidos/:id`; manda `items` solo si cambian productos.
- El resto de la jerarquía (cards con `EstadoBadge`, búsqueda, filtros, acciones secundarias ocultas, empty states, km-panel, km-tabular, km-focus) se preserva sin cambios.

---

## 15. Admin Productos — Inventario operativo del evento

La pantalla `/admin/productos` funciona como inventario operativo del evento, no como tabla SaaS genérica.

**Filtros por estado:** La pantalla carga productos con `GET /api/admin/productos?estado=activo` por defecto. El admin puede filtrar entre 5 estados: **Activos** (default), **Todos**, **Desactivados**, **Agotados**, **Todavía no disponible**. Cada cambio de filtro refetchea del servidor. El filtro `activo` excluye productos agotados (stock_limitado=1, stock_actual≤0) y no disponibles (disponible=0).

**Agrupación por categoría:** Los productos se agrupan visualmente bajo encabezados de categoría (`Merienda`, `Cena`). Dentro de cada grupo, el orden sigue `orden ASC`.

**Jerarquía de la pantalla:**

1. **Encabezado "Inventario"** — reemplaza "Catálogo" para transmitir que es gestión de stock, no catálogo público.
2. **Filtros compactos** — chips de filtro de estado (activo/todos/desactivado/agotado/todavía no disponible) + búsqueda por nombre + chips de Momento/Tipo con `km-focus`.
3. **Tabla desktop tipo inventario** — columnas: Producto (con thumbnail funcional), Tipo, Momento, Precio, Stock (con unidades `u` e ícono de infinito para ilimitado), Estado (con `EstadoBadge`), Acciones. Header sin `uppercase` excesivo, solo `tracking-wide`. Las filas son arrastrables con `@dnd-kit` para reordenar en desktop.
4. **Drag & drop reorder (desktop)** — las filas de la tabla son sortables vía `@dnd-kit`. Al soltar un producto en nueva posición, se llama `PATCH /api/admin/productos/orden` con las nuevas posiciones. En mobile, se usan botones up/down como fallback accesible.
5. **Cards mobile compactas** — `km-panel` con borde izquierdo de estado (3px coloreado por estado), badges compactos, acciones primarias (Editar/Stock) separadas de acción peligrosa (Desactivar/Recuperar) en menú desplegable. Incluye botones up/down para reordenar sin drag.
5. **Stock visual por token** — stock agotado en `--km-peligro-text`, stock bajo en `--km-alerta-text`, stock OK en `--km-listo-text`, ilimitado con ícono infinito y `--km-tinta-suave`.
6. **Acciones peligrosas separadas** — Desactivar/Recuperar en menú desplegable (icono `MoreHorizontal`), no como botón visible que compite con Editar y Stock. Desktop y mobile usan el mismo patrón.
7. **Modal de stock táctil** — header azul con ícono, info del producto (nombre + stock mínimo), contador grande con +/- táctiles (h-14 w-14), feedback visual del estado: agotado (`--km-peligro-*`), stock bajo (`--km-alerta-*` con mínimo visible), stock OK (`--km-listo-*`). Usa `km-tabular` y `km-focus`.

**Diseño visual por estado de producto:**

| Estado | Borde izquierdo (mobile) | EstadoBadge | Stock |
|---|---|---|---|
| Activo | sin borde especial | `activo` (teal) | número con `--km-listo-text` |
| Stock bajo | `--km-alerta-text` | `activo` + `stockBajo` (naranja) | número con `--km-alerta-text` |
| Agotado | `--km-peligro-text` | `agotado` (rojo) | `0 u` con `--km-peligro-text` |
| Desactivado | `--km-entregado-text` + opacidad reducida | `entregado` (gris azulado) | según stock |
| Ilimitado | sin borde especial | `activo` | ícono infinito |

**Cambios vs. versión anterior (doc 28 §4.11):**
- "Catálogo" → "Inventario" en encabezado.
- Tabla desktop: header sin `uppercase`, con `tracking-wide` y `km-tabular` en números.
- Stock: de número genérico con `font-mono` y colores Tailwind (`text-amber-600`, `text-red-500`, `text-slate-700`, `text-slate-400`) a `StockCell` con tokens `--km-*` e ícono `InfinityIcon` para ilimitado, unidades `u`.
- Estado: de `Badge` con tones genéricos (`success`, `neutral`, `danger`, `warning`) a `EstadoBadge` con `EstadoVisual` (`activo`, `agotado`, `entregado` para desactivado, `stockBajo`).
- Acciones peligrosas: de botón visible "Desactivar"/"Recuperar" en la fila a menú desplegable con icono `MoreHorizontal`. Desktop y mobile usan el mismo patrón.
- Mobile cards: de cards sin jerarquía visual a `km-panel` con `border-l-[3px]` coloreado por estado, badges compactos, acciones primarias (Editar/Stock) separadas del menú de acciones peligrosas.
- Modal de stock: de modal genérico con fondo blanco y sin feedback a modal con header azul, info del producto, contador más grande (h-14 w-14), feedback de estado (agotado/bajo/OK) con tokens `--km-*`, `km-tabular` y `km-focus`.
- Errores: de `border-red-200 bg-red-50 text-red-700` a `--km-peligro-bg`/`--km-peligro-text`.
- Textos grises: de `text-slate-500`, `text-slate-400`, `text-slate-600` a `text-[#003B73]/50`, `text-[#003B73]/40`, `text-[#003B73]/60`.
- Productos desactivados: opacidad reducida (`opacity-70`) + borde izquierdo `--km-entregado-text`.
- `km-tabular` en precios y cantidades.
- `km-focus` en todos los controles interactivos.
- `km-panel` en vez de `rounded-2xl border shadow`.
- Formulario de producto: `text-red-600`, `text-slate-400`, `text-slate-500`, `bg-red-50`, `border-red-200`, `border-slate-300`, `bg-slate-300` reemplazados por tokens `--km-*`.
- Endpoints, data flow y lógica preservados sin cambios.

---

## 16. Admin Configuración — Estado de la tienda

La pantalla `/admin/config` permite abrir/cerrar la tienda y editar el mensaje público del menú.

**Jerarquía de la pantalla:**

1. **Banner de estado** — `AdminCard` con fondo coloreado por estado (abierto: `--km-listo-bg`, cerrado: `--km-peligro-bg`), `IconBox` con ícono `DoorOpen`/`DoorClosed` (tono `emerald`/`red`), título y descripción contextuales.
2. **Botones de estado** — grilla de 2 columnas: "Abrir tienda" (activo con fondo azul `#003B73` cuando está abierto), "Cerrar tienda" (activo con fondo gris `#5B7793` cuando está cerrado). Usa `km-focus` y `active:scale-[0.98]`.
3. **Mensaje público** — `AdminCard` con `SectionTitle`, ícono `MessageSquare`, textarea con contador de caracteres (160 max), botón guardar con ícono `Save` en azul oscuro (`#003B73`).
4. **Feedback de guardado** — banner con `--km-listo-*` tokens e ícono `Check` al guardar exitosamente.

**Endpoints preservados:** `GET /api/configuracion-tienda` (público), `PUT /api/admin/configuracion-tienda` (admin). Toggle de estado envía `{ estado }`, mensaje envía `{ mensaje_publico }`.

**Cambios vs. versión anterior:**
- De `km-panel` suelto a `AdminCard` con `overflow-hidden` y sección de banner coloreado.
- De botón toggle genérico a grilla de botones de estado con ícono, activo/desactivado visual.
- De `SectionTitle` sola a `AdminCard` con label + ícono + textarea con contador.
- De mensaje de guardado como texto plano a banner con ícono `Check` y tokens `--km-listo-*`.
- Guardar mensaje: de botón `bg-[var(--km-azul)]` a botón full-width `bg-[#003B73]` con shadow y `active:scale-[0.99]`.
- Endpoints y data flow preservados sin cambios.

---

## 17. Admin Reportes — Resumen de recaudación

La pantalla `/admin/reportes` usa `ReportesScreen` y carga `GET /api/admin/reportes` mediante `obtenerReportesAdmin()` (`frontend/lib/admin.ts`). El mapper `apiToAdminReportes()` traduce snake_case del backend a camelCase para la UI.

**Jerarquía de la pantalla:**

1. **KPIs principales** — recaudación total, efectivo, transferencia, pedidos pagados, productos vendidos, pagos pendientes y monto pendiente.
2. **Producto estrella** — muestra `producto_top` cuando existe o empty state cuando todavía no hay ventas.
3. **Ranking de productos** — lista `ranking_productos` ordenada por cantidad vendida.
4. **CSV local** — botones para descargar resumen y ranking desde el navegador. No hay implementación Excel.

**Estados:** loading, error con reintento, empty state para ranking vacío y refresh silencioso desde el header.

**Endpoint:** `GET /api/admin/reportes` (cookie admin). Ver `API.md` para el contrato completo.
