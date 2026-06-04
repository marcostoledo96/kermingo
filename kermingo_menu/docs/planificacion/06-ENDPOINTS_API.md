# 06 — Endpoints API REST

## Convenciones

Base URL local:

```txt
http://localhost:3000/api
```

Base URL producción:

```txt
https://kermingo-backend.up.railway.app/api
```

Formato respuesta:

```json
{
  "ok": true,
  "data": {},
  "message": "Mensaje"
}
```

Errores:

```json
{
  "ok": false,
  "error": "Mensaje"
}
```

## Health

### GET `/api/health`

Verifica que la API esté viva.

## Auth

### POST `/api/auth/login`

Body:

```json
{
  "email": "admin@kermingo.com",
  "contrasenia": "admin123"
}
```

Respuesta:

```json
{
  "ok": true,
  "data": {
    "usuario": {
      "id": 1,
      "nombre": "Admin Kermingo",
      "email": "admin@kermingo.com"
    }
  }
}
```

También setea cookie httpOnly.

### POST `/api/auth/logout`

Limpia cookie.

### GET `/api/auth/me`

Devuelve usuario autenticado.

## Productos públicos

### GET `/api/productos`

Query opcional:

```txt
?categoria=merienda&tipo=comida&buscar=pizza
```

Devuelve productos activos y disponibles.

### GET `/api/productos/:id`

Devuelve detalle público del producto.

## Admin productos

Protegidos por cookie admin.

### GET `/api/admin/productos`

Lista productos con paginación.

Query:

```txt
?page=1&limit=24&estado=activo&tipo=comida
```

### POST `/api/admin/productos`

Crea producto.

Puede ser multipart si incluye imagen.

### PUT `/api/admin/productos/:id`

Actualiza producto.

### PATCH `/api/admin/productos/:id/desactivar`

Soft delete.

### PATCH `/api/admin/productos/:id/recuperar`

Recupera producto.

### PATCH `/api/admin/productos/:id/stock`

Ajusta stock.

## Pedidos públicos

### POST `/api/pedidos`

Crea pedido online.

Puede ser multipart si incluye comprobante.

Reglas:

- transferencia requiere comprobante
- efectivo no permite comprobante
- descuenta stock al confirmar pedido
- usa transacción MySQL
- genera `numero` y `token_seguimiento`

### GET `/api/pedidos/seguimiento/:token`

Devuelve estado público del pedido.

No requiere login.

## Admin pedidos

### GET `/api/admin/pedidos`

Lista pedidos con filtros.

### GET `/api/admin/pedidos/:id`

Detalle de pedido.

### PUT `/api/admin/pedidos/:id`

Edita pedido si cliente lo solicita en caja.

### PATCH `/api/admin/pedidos/:id/estado`

Cambia estado pedido.

Body:

```json
{
  "estado_pedido": "en_preparacion"
}
```

### PATCH `/api/admin/pedidos/:id/pago`

Cambia estado pago.

Body:

```json
{
  "estado_pago": "pagado"
}
```

### PATCH `/api/admin/pedidos/:id/cancelar`

Cancela pedido y repone stock.

No pide motivo obligatorio.

## Caja rápida

### POST `/api/admin/caja/venta`

Crea venta desde caja.

Reglas:

- datos mínimos
- si pago efectivo, puede iniciar `pagado`
- si transferencia, puede marcarse pagada manualmente aunque no haya comprobante
- descuenta stock
- genera pedido y número

## Cocina / Entrega

### GET `/api/admin/cocina/pedidos`

Pedidos operativos.

### GET `/api/admin/cocina/productos-pendientes`

Agrupa productos pendientes de preparar/entregar.

## Comprobantes

### GET `/api/admin/comprobantes`

Lista pedidos por transferencia con comprobante o pendientes.

### GET `/api/admin/archivos/:id/ver`

Abre archivo de Drive vía backend si hace falta.

### PATCH `/api/admin/comprobantes/:pedidoId/aprobar`

Marca pago como pagado.

### PATCH `/api/admin/comprobantes/:pedidoId/rechazar`

Marca pago como rechazado.

## Reportes

### GET `/api/admin/reportes/ventas.xlsx`

Excel de pedidos entregados y pagados.

### GET `/api/admin/reportes/productos-vendidos.xlsx`

Excel agrupado por producto.

### GET `/api/admin/reportes/resumen.xlsx`

Resumen general.

## Configuración tienda

### GET `/api/configuracion-tienda`

Pública: devuelve estado y mensaje.

### GET `/api/admin/configuracion-tienda`

Admin: devuelve configuración completa.

### PUT `/api/admin/configuracion-tienda`

Actualiza estado, mensaje y hora de cena.
