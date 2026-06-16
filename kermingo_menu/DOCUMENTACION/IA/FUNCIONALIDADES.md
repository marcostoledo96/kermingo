# Funcionalidades — Kermingo

> Leé este archivo cuando necesites saber qué puede hacer cada rol
> o qué funcionalidades existen en el sistema.

---

## Índice

1. [Roles](#1-roles)
2. [Funcionalidades por rol](#2-funcionalidades-por-rol)
3. [Detalle de funcionalidades](#3-detalle-de-funcionalidades)

---

## 1. Roles

| Rol | Descripción |
|---|---|
| **Público** | Visitante sin login. Puede ver el menú, crear pedidos y seguir su pedido. |
| **Admin** | Usuario autenticado con cookie JWT. Puede hacer todo. No hay roles granulares en el MVP. |

---

## 2. Funcionalidades por rol

| Funcionalidad | Público | Admin | Endpoint |
|---|---|---|---|
| Ver carta de productos | ✅ | ✅ | `GET /api/productos` |
| Ver producto individual | ✅ | ✅ | `GET /api/productos/:id` |
| Ver estado de la tienda | ✅ | ✅ | `GET /api/configuracion-tienda` |
| Crear pedido online (solo transferencia con comprobante) | ✅ | — | `POST /api/pedidos` (multipart) |
| Seguir pedido por token | ✅ | — | `GET /api/pedidos/seguimiento/:token` |
| Login | — | ✅ | `POST /api/auth/login` |
| Logout | — | ✅ | `POST /api/auth/logout` |
| Ver usuario actual | — | ✅ | `GET /api/auth/me` |
| Crear pedido de caja | — | ✅ | `POST /api/admin/pedidos/caja` |
| Listar pedidos con filtros | — | ✅ | `GET /api/admin/pedidos` |
| Ver detalle de pedido | — | ✅ | `GET /api/admin/pedidos/:id` |
| Avanzar estado de pedido | — | ✅ | `PATCH /api/admin/pedidos/:id/estado` |
| Ver comprobante de pago | — | ✅ | `GET /api/admin/pedidos/:id/comprobante` — Devuelve metadata y `url_publica` (webViewLink). B7 inicial: botón "Abrir en Drive". Futuro: proxy autenticado si se necesita. |
| Cambiar estado de pago | — | ✅ | `PATCH /api/admin/pedidos/:id/pago` |
| Cancelar pedido (reponer stock) | — | ✅ | `PATCH /api/admin/pedidos/:id/cancelar` |
| Ver pedidos de cocina | — | ✅ | `GET /api/admin/cocina/pedidos` |
| Ver detalle de pedido (cocina) | — | ✅ | `GET /api/admin/cocina/pedidos/:id` |
| Avanzar estado (cocina) | — | ✅ | `PATCH /api/admin/cocina/pedidos/:id/estado` |
| Listar productos admin | — | ✅ | `GET /api/admin/productos` |
| Crear producto | — | ✅ | `POST /api/admin/productos` |
| Actualizar producto | — | ✅ | `PUT /api/admin/productos/:id` |
| Desactivar producto | — | ✅ | `PATCH /api/admin/productos/:id/desactivar` |
| Recuperar producto | — | ✅ | `PATCH /api/admin/productos/:id/recuperar` |
| Ajustar stock | — | ✅ | `PATCH /api/admin/productos/:id/stock` |
| Ver config completa | — | ✅ | `GET /api/admin/configuracion-tienda` |
| Actualizar config | — | ✅ | `PUT /api/admin/configuracion-tienda` |

---

## 3. Detalle de funcionalidades

### Compra online (público)

- El visitante ve la carta (`GET /api/productos`) filtrada por categoría y tipo.
- Agrega items al carrito (localStorage).
- En checkout, el único método de pago disponible es **transferencia con comprobante**. El cliente debe subir un archivo comprobante (imagen o PDF). El envío usa `apiPostForm` (multipart/form-data) a `POST /api/pedidos`.
- Recibe un número KMG y un token de seguimiento.
- Puede seguir su pedido en `/seguimiento` ingresando el token.
- **Efectivo no está disponible en checkout público.** Solo se usa en caja rápida (admin).

### Seguimiento de pedido (público)

- `GET /api/pedidos/seguimiento/:token` devuelve el estado del pedido y sus items.
- No revela datos sensibles del admin.
- El ticket confirmado (`/confirmado`) incluye un QR scaneable que codifica la URL de seguimiento con el token.
- El tracking screen (`/seguimiento`) acepta `?token=` desde el QR escaneado y auto-carga el pedido.

### Caja rápida (admin)

- El admin crea pedidos directamente desde `/admin/caja`.
- Puede setear `estado_pago: 'pagado'` y `estado_pedido` inicial distinto a `'recibido'`.
- Útil para ventas presenciales con pago inmediato.

### Cocina (admin)

- Vista optimizada: solo pedidos en estados `recibido`, `en_preparacion`, `listo`.
- Orden: primero los `recibido`, después `en_preparacion`, después `listo`, y dentro de cada grupo por antigüedad.
- Avanza estado: `recibido → en_preparacion → listo → entregado`.

### Gestión de pagos (admin)

- Marca pedidos como `pagado` o `rechazado`.
- Si un pedido online eligió transferencia con comprobante, se crea con `estado_pago=comprobante_subido`. El admin puede aprobar (`comprobante_subido → pagado`) o rechazar (`comprobante_subido → rechazado`) el comprobante.
- Efectivo no existe en el flujo online; si se intenta enviar, el backend responde 400. Las ventas en efectivo se cargan desde caja rápida.
- Caja rápida puede crear pedidos con `estado_pago='pagado'` directamente.
- Cambiar `estado_pago` no afecta el stock.

### Filtro de pendientes de pago (admin)

- El admin puede listar pedidos filtrando por `estado_pago=pendiente`.
- Permite identificar rápidamente pedidos que requieren verificación de pago.

### Edición de pedidos de caja (admin)

- Los pedidos creados desde caja (`origen='caja'`) son los únicos editables.
- Los pedidos online (`origen='online'`) no se pueden editar, solo cancelar.

### Cancelación con reposición de stock (admin)

- Solo pedidos en estado `recibido` o `en_preparacion` pueden cancelarse.
- Al cancelar, se repone el stock de todos los items (expandiendo combos).

### Configuración de tienda (admin)

- Abrir/cerrar la tienda (`estado: 'abierta'`, `'cerrada'`, `'demo'`).
- Setear mensaje público para cuando está cerrada.
- Setear hora de cena (`cena_habilitada_desde`).

### Productos (admin)

- CRUD completo con activación/desactivación (soft-delete).
- Ajuste manual de stock.
- Subida, reemplazo y eliminación de imagen de producto desde admin. El frontend envía `FormData` con campo `imagen` a `POST /api/admin/productos/:id/imagen`; quitar imagen usa `DELETE /api/admin/productos/:id/imagen`.
