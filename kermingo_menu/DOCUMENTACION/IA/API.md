# Capa API — Kermingo

> Leé este archivo cuando trabajes en routes, controllers, schemas, middleware o necesites
> agregar o modificar un endpoint.

---

## Índice

1. [Formato de respuesta estándar](#1-formato-de-respuesta-estándar)
2. [Middleware chain por dominio](#2-middleware-chain-por-dominio)
3. [Endpoints públicos](#3-endpoints-públicos)
4. [Endpoints admin — Auth](#4-endpoints-admin--auth)
5. [Endpoints admin — Pedidos](#5-endpoints-admin--pedidos)
6. [Endpoints admin — Cocina](#6-endpoints-admin--cocina)
7. [Endpoints admin — Productos](#7-endpoints-admin--productos)
8. [Endpoints admin — Configuración](#8-endpoints-admin--configuración)
9. [Endpoints admin — Reportes](#9-endpoints-admin--reportes)
10. [Schemas Zod](#10-schemas-zod)
11. [Errores HTTP](#11-errores-http)

---

## 1. Formato de respuesta estándar

**Éxito:**

```json
{
  "ok": true,
  "data": { ... },
  "message": "Mensaje descriptivo"
}
```

**Error:**

```json
{
  "ok": false,
  "error": "Mensaje del error"
}
```

En desarrollo, los errores incluyen `"stack": "..."`.

Archivos fuente: `utils/respuesta.utils.js` (`respuestaExitosa`, `respuestaError`), `utils/errors.js` (`AppError`, `ValidationError`, `NotFoundError`, `AuthError`, `InsufficientStockError`).

---

## 2. Middleware chain por dominio

| Dominio | Prefijo | Middlewares típicos |
|---|---|---|
| Público | `/api/productos`, `/api/pedidos` | `validateQuery` / `validateBody` / `validateParams` |
| Admin auth | `/api/auth` | `validateBody` (login), `requireAdmin` (me), `requireTrustedOrigin` (logout) |
| Admin pedidos | `/api/admin/pedidos` | `requireAdmin`, `requireTrustedOrigin` (POST/PATCH), `validateBody`, `validateParams` |
| Admin cocina | `/api/admin/cocina` | `requireAdmin`, `requireTrustedOrigin` (PATCH), `validateParams` |
| Admin productos | `/api/admin/productos` | `requireAdmin`, `requireTrustedOrigin` (POST/PUT/PATCH), `validateBody`, `validateParams` |
| Admin config | `/api/admin/configuracion-tienda` | `requireAdmin`, `requireTrustedOrigin` (PUT), `validateBody` |
| Admin reportes | `/api/admin/reportes` | `requireAdmin` |
| Público config | `/api/configuracion-tienda` | Ninguno (GET público) |

---

## 3. Endpoints públicos

| Método | Ruta | Handler | Descripción |
|---|---|---|---|
| `GET` | `/api/health` | inline | Health check |
| `GET` | `/api/productos` | `producto.listar` | Lista productos activos (excluye `activo=0`). Ordenado por `orden ASC, id ASC`. No retorna desactivados. Incluye `disponible=0` (todavía no disponible) pero marcados como no comprables. Query: `?categoria=`, `?tipo=`, `?buscar=` |
| `GET` | `/api/productos/:id` | `producto.obtener` | Detalle de un producto activo |
| `GET` | `/api/configuracion-tienda` | `configuracion.obtenerPublico` | Estado de la tienda (`estado`, `mensaje_publico`, `categoria_default`) |
| `POST` | `/api/pedidos` | `pedido.crear` | Crear pedido online **solo transferencia** (multipart con `comprobante`). Body/fields: `nombre_cliente`, `items`, `metodo_pago='transferencia'`. `metodo_pago='efectivo'` devuelve 400; efectivo solo está disponible en caja admin. **Default `estado_pedido='recibido'`** (online payment gate). Transfer con comprobante válido → `estado_pago='comprobante_subido'`. El pedido debe ser confirmado por admin desde la solapa "Pendiente de confirmación" en `/admin/pedidos` antes de pasar a `en_preparacion`. Middleware chain: `uploadComprobante.single()` → `validateBody` → `assertMagicBytes` (magic bytes post-Multer) → `crear` (preflight `assertStoreOpen` antes de Drive upload) |
| `GET` | `/api/pedidos/seguimiento/:token` | `pedido.seguimiento` | Estado público del pedido por token |

---

## 4. Endpoints admin — Auth

| Método | Ruta | Auth | Middleware | Handler | Schema |
|---|---|---|---|---|---|
| `POST` | `/api/auth/login` | No | `validateBody(loginSchema)` | `auth.login` | `{ email, contrasenia }` |
| `POST` | `/api/auth/logout` | Cookie | `requireTrustedOrigin` | `auth.logout` | — |
| `GET` | `/api/auth/me` | Cookie | `requireAdmin` | `auth.me` | — |

**Cookie:** `kermingo_admin_token` — `httpOnly`, `sameSite: 'none'` en prod, `secure: true` en prod, 24h.

---

## 5. Endpoints admin — Pedidos

| Método | Ruta | Handler | Descripción |
|---|---|---|---|
| `POST` | `/admin/pedidos/caja` | `pedido.crearCaja` | Crear pedido desde caja rápida. **Default `estado_pedido='en_preparacion'`** (caja bypasses `recibido` gate). Puede setear `estado_pago` y `estado_pedido` explícitamente si se necesita override. |
| `GET` | `/admin/pedidos` | `pedido.listarAdmin` | Lista pedidos con filtros y paginación. Query: `page`, `limit`, `estado_pedido`, `estado_pago`, `metodo_pago`, `origen`, `buscar` |
| `GET` | `/admin/pedidos/:id` | `pedido.obtenerAdmin` | Detalle completo de un pedido |
| `GET` | `/admin/pedidos/:id/comprobante` | `pedido.obtenerComprobante` | Metadatos del comprobante de pago (Drive). Retorna `{ nombre_original, mime_type, tamanio_bytes, url_publica, url_proxy, created_at }`. `url_publica` es el enlace público de Drive (para "Abrir en otra pestaña"). `url_proxy` es el endpoint `/api/admin/pedidos/:id/comprobante/imagen` para embeber la imagen vía proxy backend. Acceso: admin autenticado. |
| `GET` | `/admin/pedidos/:id/comprobante/imagen` | `pedido.obtenerComprobanteImagen` | Proxy autenticado que devuelve los bytes del comprobante desde Google Drive. Usa el mismo patrón que `GET /api/productos/:id/imagen`. Retorna el stream con `Content-Type`, `Content-Disposition: inline` y `Cache-Control: private, max-age=300`. Acceso: admin autenticado. |
| `PATCH` | `/admin/pedidos/:id/estado` | `pedido.cambiarEstado` | Avanzar estado del pedido. Valida transición |
| `PATCH` | `/admin/pedidos/:id/pago` | `pedido.cambiarPago` | Cambiar estado de pago |
| `PATCH` | `/admin/pedidos/:id/cancelar` | `pedido.cancelar` | Cancelar pedido y reponer stock |
| `PUT` | `/admin/pedidos/:id` | `pedido.editar` | Edita pedido de caja con reconciliación transaccional de stock. Solo pedidos origen=caja, no cancelados ni entregados |

**Schemas:**

- `createPedidoSchema`: `{ nombre_cliente, mesa?, telefono_cliente?, observaciones?, metodo_pago, items }`
- `createCajaSchema`: extiende `createPedidoSchema` con `estado_pago` y `estado_pedido`
- `pedidoQuerySchema`: `{ page, limit, estado_pedido?, estado_pago?, metodo_pago?, origen?, buscar?, solo_pagos_pendientes? }` — `solo_pagos_pendientes` es boolean string que filtra pedidos con `estado_pago IN ('pendiente','rechazado')` excluyendo `cancelado`
- `updateEstadoPedidoSchema`: `{ estado_pedido }` enum `recibido|en_preparacion|listo|entregado`
- `updateEstadoPagoSchema`: `{ estado_pago }` enum `pendiente|comprobante_subido|pagado|rechazado`
- `editPedidoSchema`: `{ nombre_cliente?, mesa?, telefono_cliente?, observaciones?, metodo_pago?, items? }` — al menos un campo obligatorio; `items` opcional (si no se envía, solo se editan metadatos sin tocar stock)
- `idParamSchema`: `{ id: number }`

---

## 6. Endpoints admin — Cocina

| Método | Ruta | Handler | Descripción |
|---|---|---|---|
| `GET` | `/admin/cocina/pedidos` | `cocina.listarCocina` | Pedidos operativos (excluye `recibido`, `cancelado` y `entregado`). Solo retorna `en_preparacion` y `listo`. Los pedidos online en `recibido` deben ser confirmados desde la solapa "Pendiente de confirmación" en `/admin/pedidos` antes de aparecer aquí. Orden: `en_preparacion → listo`, luego antigüedad |
| `GET` | `/admin/cocina/pedidos/:id` | `cocina.obtenerCocina` | Detalle de un pedido para cocina |
| `PATCH` | `/admin/cocina/pedidos/:id/estado` | `cocina.cambiarEstadoCocina` | Cambiar estado vía cocina. Valida transición |

**Schema:** `updateEstadoPedidoCocinaSchema`: `{ estado_pedido }` enum `recibido|en_preparacion|listo|entregado`

**Transiciones válidas (Cocina):**

| Estado actual | Puede pasar a | Caso de uso |
|---|---|---|
| `recibido` | `en_preparacion` | Empezar a preparar |
| `recibido` | `listo` | Producto ya listo (ej: medialunas, bebidas) |
| `en_preparacion` | `recibido` | Retroceso: se marcó por error |
| `en_preparacion` | `listo` | Terminó la preparación |
| `listo` | `en_preparacion` | Retroceso: se marcó listo por error |
| `listo` | `entregado` | Confirmar entrega (con confirmación en frontend) |
| `entregado` | *(ninguna)* | Estado terminal |

---

## 7. Endpoints admin — Productos

| Método | Ruta | Handler | Descripción |
|---|---|---|---|---|
| `GET` | `/admin/productos` | `producto.listarAdmin` | Lista productos con filtros. **Query:** `page`, `limit`, `tipo`, `estado` (`activo`\|`todos`\|`desactivado`\|`agotado`\|`todavia_no_disponible`, **default `activo`**). SQL por filtro: `activo` → `activo=1 AND disponible=1 AND (stock_limitado=0 OR stock_actual>0)`; `todos` → sin WHERE; `desactivado` → `activo=0`; `agotado` → `activo=1 AND disponible=1 AND stock_limitado=1 AND stock_actual=0`; `todavia_no_disponible` → `activo=1 AND disponible=0`. Ordenado por `orden ASC, id ASC`. |
| `POST` | `/admin/productos` | `producto.crear` | Crear producto. Schema incluye `orden` y `disponible`. |
| `PUT` | `/admin/productos/:id` | `producto.actualizar` | Actualizar producto completo. Schema incluye `orden` y `disponible`. |
| `PATCH` | `/admin/productos/:id/desactivar` | `producto.desactivar` | Soft-delete (setea `activo=0`) |
| `PATCH` | `/admin/productos/:id/recuperar` | `producto.recuperar` | Reactivar (setea `activo=1`) |
| `PATCH` | `/admin/productos/:id/stock` | `producto.ajustarStock` | Ajustar stock |
| `PATCH` | `/admin/productos/orden` | `producto.reordenar` | Reordenar productos (batch). Body: `{ ordenes: [{ id, orden }] }`. Protegido + trusted origin. Transacción que solo actualiza `orden`. |

**Schemas:**

- `createProductoSchema`: `{ nombre, descripcion?, precio, tipo, stock_limitado, stock_actual?, stock_minimo_alerta?, activo?, disponible?, orden?, categorias }` — `categorias` es array de `('Merienda' | 'Cena')` con mínimo 1 elemento (obligatorio).
- `updateProductoSchema`: schema explícito con todos los campos `.optional()` (no `partial()`) — evita que `.default()` sobre `stock_minimo_alerta`/`activo` sobrescriba silenciosamente. Incluye `orden` y `disponible`. `categorias` opcional, si viene no puede estar vacío.
- `stockAdjustmentSchema`: `{ stock_actual: number }`
- `reordenarSchema`: `{ ordenes: z.array({ id: z.number(), orden: z.number().int().min(0) }).min(1) }`
- `adminProductoQuerySchema`: incluye `estado` enum con los 5 valores, default `activo`.

---

## 8. Endpoints admin — Configuración

| Método | Ruta | Auth | Handler | Descripción |
|---|---|---|---|---|
| `GET` | `/configuracion-tienda` | No | `configuracion.obtenerPublico` | Estado público de la tienda |
| `GET` | `/admin/configuracion-tienda` | Cookie | `configuracion.obtenerAdmin` | Config completa (incluye `cena_habilitada_desde`, `categoria_default`) |
| `PUT` | `/admin/configuracion-tienda` | Cookie + Origin | `configuracion.actualizarAdmin` | Actualizar config. Schema: `{ estado?, mensaje_publico?, cena_habilitada_desde?, categoria_default? }` — todos los campos son opcionales, pero al menos uno debe estar presente. `categoria_default` es `ENUM('merienda','cena')`. |

---

## 9. Endpoints admin — Reportes

| Método | Ruta | Auth | Handler | Descripción |
|---|---|---|---|---|
| `GET` | `/admin/reportes` | Cookie | `reportes.obtenerReportesAdmin` | Resumen agregado para `/admin/reportes`: `total_recaudado`, `total_efectivo`, `total_transferencia`, `pedidos_pagados`, `productos_vendidos`, `pedidos_pendientes_pago`, `monto_pendiente_pago`, `producto_top`, `ranking_productos`, `actualizado_en`. Excluye pedidos `cancelado` y calcula ventas/ranking solo con pagos `pagado`. |

No requiere schema Zod porque no recibe body, params ni query pública.

---

## 10. Schemas Zod

Todos los schemas están en `backend/src/api/schemas/`. Usan `z.object(...).strict()` que rechaza campos extra.

| Archivo | Schemas exportados |
|---|---|
| `auth.schema.js` | `loginSchema` |
| `pedido.schema.js` | `createPedidoSchema`, `createCajaSchema`, `pedidoQuerySchema`, `updateEstadoPedidoSchema`, `updateEstadoPagoSchema`, `editPedidoSchema`, `idParamSchema` |
| `producto.schema.js` | `productoQuerySchema`, `adminProductoQuerySchema`, `createProductoSchema`, `updateProductoSchema`, `stockAdjustmentSchema`, `idParamSchema` |
| `cocina.schema.js` | `idParamSchema`, `updateEstadoPedidoCocinaSchema` |
| `configuracion.schema.js` | `updateConfiguracionSchema` |

Middleware de validación: `validateBody`, `validateQuery`, `validateParams` (en `middlewares/validate.middleware.js`).

---

## 11. Errores HTTP

| Código | Clase | Cuándo |
|---|---|---|
| `400` | `ValidationError` | Schema Zod falla, tienda cerrada, transición inválida, MIME no soportado, pedido online en efectivo, transferencia sin comprobante |
| `401` | `AuthError` | Token ausente/inválido, cuenta inactiva |
| `403` | `ForbiddenError` | Origen no permitido (CSRF — `requireTrustedOrigin`) |
| `404` | `NotFoundError` | Recurso no encontrado (pedido, producto, comprobante sin archivo) |
| `409` | `InsufficientStockError` | Stock insuficiente al crear pedido |
| `413` | Multer `LIMIT_FILE_SIZE` | Archivo comprobante supera 5 MB |
| `503` | `DriveUploadError` | Google Drive no disponible (credenciales, red, cuota, timeout). Siempre mapea a `"Servicio de upload no disponible"` |
| `500` | Error genérico | Cualquier error no operacional |

**Nota sobre errores de autenticación/autorización:** `AuthError` (401) se usa para fallos de JWT (token ausente/inválido/cuenta inactiva). `ForbiddenError` (403) se usa para rechazos de origen CSRF (`requireTrustedOrigin`). Ver `GOTCHAS.md` sección 7 para detalles.
