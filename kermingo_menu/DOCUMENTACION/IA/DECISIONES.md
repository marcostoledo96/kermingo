# Decisiones Arquitectónicas — Kermingo

> Leé este archivo cuando quieras entender por qué se tomó una decisión de diseño
> o arquitectura, especialmente si estás considerando cambiarla.

---

## Payment Verification Gate (B7)

### Decisión: Online orders default to `recibido`; caja orders default to `en_preparacion`

| Campo | Valor |
|---|---|
| **Decisión** | Origin-aware default: `createWithTransaction` asigna `estado_pedido='recibido'` cuando `origen='online'` y `estado_pedido='en_preparacion'` cuando `origen='caja'`. |
| **Fecha** | 2026-06-17 |
| **Motivación** | Separar la verificación de pago online del flujo operativo de cocina. Los pedidos online necesitan aprobación de pago antes de prepararse; los pedidos de caja son ventas presenciales verificadas. |
| **Alternativas** | (1) Solo controlar desde frontend — rechazado porque el backend debe ser la autoridad de estado. (2) Endpoint separado para aprobación de pago — se optó por usar los PATCH existentes en secuencia. (3) No tener gate — el estado `recibido` existía previamente y se había eliminado; se restauró con propósito explícito de verificación. |
| **Consecuencias** | La cocina ahora excluye `recibido`. Los pedidos online no aparecen en cocina hasta que un admin confirma el pago. La secuencia confirm-pago no es atómica (dos PATCH). |

### Decisión: Confirmación de pago en secuencia no atómica

| Campo | Valor |
|---|---|
| **Decisión** | La UI de admin ejecuta `PATCH /pago {pagado}` → si 200 → `PATCH /estado {en_preparacion}` como dos requests separados. |
| **Fecha** | 2026-06-17 |
| **Motivación** | Reutilizar endpoints existentes. Evitar acoplar el cambio de pago al cambio de estado en un nuevo endpoint combinado. |
| **Riesgo** | Si el segundo PATCH falla, el pedido queda en `recibido`+`pagado`. El admin puede reintentar manualmente. Aceptable para MVP. |

### Decisión: Admin pedidos en tabs por estado

| Campo | Valor |
|---|---|
| **Decisión** | `/admin/pedidos` usa 4 tabs: `recibido`, `preparacion`, `listo`, `entregado`. Cada tab fetches del servidor con `?estado_pedido={state}&limit=24`. Badges con conteos paralelos `limit=1`. |
| **Fecha** | 2026-06-17 |
| **Motivación** | Permitir al admin enfocarse en un estado a la vez. El tab `recibido` es el workspace de verificación de pago. El server-side filtering asegura datos correctos incluso con datos cambiantes. |
| **Alternativas** | Cliente-side filtering de todos los pedidos — rechazado por escalabilidad y corrección con datos en movimiento. |

### Decisión: Caja rápida bypassa el gate `recibido`

| Campo | Valor |
|---|---|
| **Decisión** | `POST /api/admin/pedidos/caja` crea pedidos con `estado_pedido='en_preparacion'` por defecto. |
| **Fecha** | 2026-06-17 |
| **Motivación** | Las ventas de caja rápida son presenciales: el vendedor ya verificó el pago (efectivo) o lo registró (transferencia). No tiene sentido que pasen por un gate de verificación. |
| **Excepción** | El schema acepta override explícito de `estado_pedido` si en el futuro se necesita un flujo distinto para caja. |

### Decisión: Online efectivo permanece fuera de alcance

| Campo | Valor |
|---|---|
| **Decisión** | El endpoint público `POST /api/pedidos` sigue rechazando `metodo_pago='efectivo'`. Solo se acepta transferencia con comprobante. |
| **Fecha** | 2026-06-17 |
| **Motivación** | No hay forma de verificar pago en efectivo online sin intervención del vendedor. El flujo efectivo queda reservado para caja rápida presencial. |

### Decisión: Caja product cards con imagen

| Campo | Valor |
|---|---|
| **Decisión** | Los botones de producto en `/admin/caja` muestran `next/image` cuando `imagen_url` existe, con fallback a `ProductIconGlyph`. |
| **Fecha** | 2026-06-17 |
| **Motivación** | Mejorar reconocimiento visual de productos en caja rápida sin cambiar el comportamiento operativo. |
| **Técnico** | `apiToCajaProduct` usa `ABSOLUTE_IMAGE_URL(p.imagen_url)`. `next/image` usa `unoptimized` por ser URLs dinámicas del backend. |

---

## Product Admin Filtering, Grouping, and Ordering

### Decisión: Global `orden` column vs per-category ordering

| Campo | Valor |
|---|---|
| **Decisión** | `producto.orden INT NOT NULL DEFAULT 0` — single global order column shared by all categories. |
| **Fecha** | 2026-06-17 |
| **Motivación** | A product can belong to multiple categories; per-category ordering would require a separate table. Global `orden` with `ORDER BY orden ASC, id ASC` is simpler and sufficient for MVP. |
| **Alternativas** | Per-category order in `producto_categoria` — rejected due to complexity for MVP. |
| **Consecuencias** | Products have the same relative position in both Merienda and Cena tabs. |

### Decisión: `disponible` as boolean vs ENUM

| Campo | Valor |
|---|---|
| **Decisión** | `producto.disponible TINYINT(1) NOT NULL DEFAULT 1` — simple boolean flag. |
| **Fecha** | 2026-06-17 |
| **Motivación** | "Todavía no disponible" is a derived state (`activo=1 AND disponible=0`). Using a separate ENUM would require migration logic. Boolean keeps schema consistent with existing `activo` pattern. |
| **Alternativas** | `estado_disponibilidad ENUM('disponible','no_disponible')` — rejected as over-engineering for MVP. |
| **Consecuencias** | The `estado` query parameter computes states server-side via SQL WHERE clauses rather than storing enum values. |

### Decisión: Batch reorder endpoint vs single-item PATCH

| Campo | Valor |
|---|---|
| **Decisión** | `PATCH /api/admin/productos/orden` accepts `{ ordenes: [{ id, orden }] }` — batch update in single transaction. |
| **Fecha** | 2026-06-17 |
| **Motivación** | Drag/drop changes multiple positions atomically. Single-item PATCH would require N requests and could result in partially reordered list. |
| **Alternativas** | `PATCH /:id/orden` per product — rejected due to atomicity concerns. |

### Decisión: Default admin filter = `activo`

| Campo | Valor |
|---|---|
| **Decisión** | `GET /api/admin/productos` defaults to `estado=activo` which excludes sold-out and unavailable products. |
| **Fecha** | 2026-06-17 |
| **Motivación** | Admin most commonly needs to see what's currently available to sell. Full list available on demand via `estado=todos`. |
| **Alternativas** | Load all products by default — rejected; noisier for daily operations. |

### Decisión: `categoria_default` as initial tab only, not purchase restriction

| Campo | Valor |
|---|---|
| **Decisión** | `configuracion_tienda.categoria_default` only selects which tab is initially active in the public menu. Users can freely switch between merienda/cena. |
| **Fecha** | 2026-06-17 |
| **Motivación** | All categories are available for purchase regardless of default tab. The default is a UX convenience, not a business rule. |
| **Consecuencias** | Backend does not enforce category-based purchase restrictions. |

### Decisión: `@dnd-kit` for drag/drop reorder

| Campo | Valor |
|---|---|
| **Decisión** | Use `@dnd-kit/core` + `@dnd-kit/sortable` for drag/drop product reordering in admin. |
| **Fecha** | 2026-06-17 |
| **Motivación** | Modern, accessible, React 19-compatible library. Mobile uses up/down button fallback. |
| **Alternativas** | `@hello-pangea/dnd` (React 18-only concern), custom pointer handlers — rejected. |

---

## Decisiones anteriores (anteriores a B7)

*(Esta sección se irá poblando a medida que se documenten decisiones de etapas anteriores.)*
