# Spec: Pedidos (etapa-5-pedidos)

## ADDED Requirements

### Requirement: Pedidos Públicos — Crear pedido

El sistema **DEBE** exponer `POST /api/pedidos` sin autenticación para crear un pedido online con descuento transaccional de stock y generación de número/token.

#### Scenario: Cliente crea pedido online válido
- GIVEN carrito con 2 productos simples y stock suficiente
- WHEN `POST /api/pedidos` con nombre_cliente, teléfono, items y metodo_pago
- THEN estado 201, retorna { ok:true, data:{ numero:"KMG-XXXX", token_seguimiento, total } }
- AND stock de cada producto se descuenta en DB

#### Scenario: Pedido con combo descuenta componentes
- GIVEN combo "Promo Mundial" compuesto por 1 hamburguesa + 1 gaseosa
- WHEN cliente compra 1 combo
- THEN pedido_detalle registra el combo con su precio
- AND stock de hamburguesa y gaseosa se descuenta según combo_producto.cantidad

#### Scenario: Stock insuficiente cancela toda la operación
- GIVEN producto con stock=2 y cliente solicita 3 unidades
- WHEN `POST /api/pedidos`
- THEN estado 409, error `"Stock insuficiente"`, sin insertar pedido ni detalle
- AND ningún stock se modifica

#### Scenario: Pedido con transferencia sin comprobante (diferido)
- GIVEN metodo_pago = transferencia
- WHEN se crea el pedido sin archivo adjunto
- THEN estado_pago = "pendiente"
- AND comprobante_archivo_id = NULL

#### Scenario: Pedido con efectivo
- GIVEN metodo_pago = efectivo
- WHEN se crea el pedido
- THEN estado_pago = "pendiente"
- AND comprobante_archivo_id = NULL (constraint CHECK garantizado)

### Requirement: Pedidos Públicos — Seguimiento

El sistema **DEBE** exponer `GET /api/pedidos/seguimiento/:token` sin autenticación para consultar estado público de un pedido.

#### Scenario: Cliente consulta seguimiento válido
- GIVEN pedido existente con token "abc-123"
- WHEN `GET /api/pedidos/seguimiento/abc-123`
- THEN estado 200, devuelve { numero, estado_pedido, estado_pago, items, total, created_at }
- AND NO expone id interno ni comprobante_archivo_id

#### Scenario: Token inexistente
- GIVEN token "no-existe"
- WHEN `GET /api/pedidos/seguimiento/no-existe`
- THEN estado 404, error `"Pedido no encontrado"`

### Requirement: Admin Pedidos — Listar con filtros

El sistema **DEBE** exponer `GET /api/admin/pedidos` protegido por cookie admin, con paginación y filtros.

#### Scenario: Admin lista pedidos con filtros
- GIVEN 50 pedidos mixtos online/caja
- WHEN `GET /api/admin/pedidos?page=1&limit=20&estado_pedido=recibido&origen=online`
- THEN estado 200, data.items array, data.pagination con total/pages
- AND items incluyen resumen de productos

#### Scenario: Búsqueda por nombre_cliente o número
- GIVEN pedido de "Juan Pérez" con número KMG-0042
- WHEN `GET /api/admin/pedidos?buscar=Juan` o `?buscar=KMG-0042`
- THEN estado 200, data.items contiene ese pedido

### Requirement: Admin Pedidos — Detalle

El sistema **DEBE** exponer `GET /api/admin/pedidos/:id` protegido por cookie admin.

#### Scenario: Admin ve detalle completo
- GIVEN pedido con id=42
- WHEN `GET /api/admin/pedidos/42`
- THEN estado 200, data incluye pedido + detalle[] con nombre_producto, precio_unitario snapshot
- AND incluye datos de cliente y pago

### Requirement: Admin Pedidos — Editar datos cliente

El sistema **DEBE** exponer `PUT /api/admin/pedidos/:id` protegido por cookie admin para modificar nombre_cliente, telefono, mesa, observaciones.

#### Scenario: Admin edita datos de cliente en caja
- GIVEN pedido existente
- WHEN `PUT /api/admin/pedidos/:id` con nombre_cliente nuevo
- THEN estado 200, data refleja cambio
- AND created_at y stock permanecen inalterados

#### Scenario: Editar pedido cancelado o entregado
- GIVEN pedido con estado_pedido = cancelado o entregado
- WHEN `PUT /api/admin/pedidos/:id`
- THEN estado 409, error `"No se puede editar un pedido cancelado o entregado"`

### Requirement: Admin Pedidos — Cambiar estado

El sistema **DEBE** exponer `PATCH /api/admin/pedidos/:id/estado` protegido por cookie admin para avanzar o retroceder el flujo de cocina.

#### Scenario: Transición válida recibido → en_preparacion
- GIVEN pedido con estado_pedido = recibido
- WHEN `PATCH` con `{ estado_pedido:"en_preparacion" }`
- THEN estado 200, data.estado_pedido = en_preparacion

#### Scenario: Transición válida listo → entregado
- GIVEN pedido con estado_pedido = listo
- WHEN `PATCH` con `{ estado_pedido:"entregado" }`
- THEN estado 200, data.estado_pedido = entregado

#### Scenario: Transición inválida recibido → entregado (skip)
- GIVEN pedido con estado_pedido = recibido
- WHEN `PATCH` con `{ estado_pedido:"entregado" }`
- THEN estado 409, error `"Transición de estado no permitida"`

#### Scenario: Cancelar solo desde recibido o en_preparacion
- GIVEN pedido con estado_pedido = listo
- WHEN `PATCH /api/admin/pedidos/:id/cancelar`
- THEN estado 409, error `"Solo se puede cancelar desde recibido o en preparación"`

### Requirement: Admin Pedidos — Cambiar estado de pago

El sistema **DEBE** exponer `PATCH /api/admin/pedidos/:id/pago` protegido por cookie admin.

#### Scenario: Marcar pagado desde pendiente
- GIVEN pedido efectivo con estado_pago = pendiente
- WHEN `PATCH` con `{ estado_pago:"pagado" }`
- THEN estado 200, data.estado_pago = pagado

#### Scenario: Marcar pagado desde comprobante_subido
- GIVEN pedido transferencia con estado_pago = comprobante_subido
- WHEN `PATCH` con `{ estado_pago:"pagado" }`
- THEN estado 200, data.estado_pago = pagado

#### Scenario: Rechazar comprobante
- GIVEN pedido con estado_pago = comprobante_subido
- WHEN `PATCH` con `{ estado_pago:"rechazado" }`
- THEN estado 200, data.estado_pago = rechazado
- AND estado_pedido permanece inalterado

### Requirement: Admin Pedidos — Cancelar y restituir stock

El sistema **DEBE** exponer `PATCH /api/admin/pedidos/:id/cancelar` protegido por cookie admin, restituyendo stock en transacción.

#### Scenario: Cancelar pedido recibido con combo
- GIVEN pedido recibido con 1 combo (hamburguesa + gaseosa)
- WHEN `PATCH /api/admin/pedidos/:id/cancelar`
- THEN estado 200, estado_pedido = cancelado
- AND stock de hamburguesa y gaseosa se repone
- AND no se requiere motivo en body

#### Scenario: Cancelar pedido ya entregado
- GIVEN pedido con estado_pedido = entregado
- WHEN `PATCH /api/admin/pedidos/:id/cancelar`
- THEN estado 409, error `"Solo se puede cancelar desde recibido o en preparación"`

### Requirement: InsufficientStockError

El sistema **DEBE** agregar `InsufficientStockError` (409) en `errors.js` sin modificar requisitos existentes de error-handling.

#### Scenario: Stock insuficiente devuelve 409
- GIVEN producto con stock insuficiente
- WHEN `POST /api/pedidos` intenta descontar más del disponible
- THEN se lanza `InsufficientStockError`
- AND middleware responde 409 con mensaje `"Stock insuficiente para {producto}"`

## Endpoint Reference

| # | Método | Path | Auth | Body / Query | Respuesta 200 | Errores |
|---|--------|------|------|-------------|---------------|---------|
| 1 | POST | /api/pedidos | No | `{ nombre_cliente, telefono_cliente, metodo_pago, items[{ producto_id, cantidad }], observaciones? }` | `{ ok:true, data:{ id, numero, token_seguimiento, total, estado_pedido, estado_pago } }` | 400, 409 InsufficientStock, 500 |
| 2 | GET | /api/pedidos/seguimiento/:token | No | — | `{ ok:true, data:{ numero, estado_pedido, estado_pago, nombre_cliente, total, items[], created_at } }` | 404 |
| 3 | GET | /api/admin/pedidos | Cookie admin | `?page, limit, estado_pedido, estado_pago, origen, buscar` | `{ ok:true, data:{ items:[], pagination:{ page, limit, total, pages } } }` | 401, 500 |
| 4 | GET | /api/admin/pedidos/:id | Cookie admin | — | `{ ok:true, data:{ pedido, detalle[] } }` | 401, 404 |
| 5 | PUT | /api/admin/pedidos/:id | Cookie admin | `{ nombre_cliente?, telefono_cliente?, mesa?, observaciones? }` | `{ ok:true, data:{ pedido } }` | 401, 404, 409 |
| 6 | PATCH | /api/admin/pedidos/:id/estado | Cookie admin | `{ estado_pedido }` | `{ ok:true, data:{ id, estado_pedido, updated_at } }` | 401, 404, 409 |
| 7 | PATCH | /api/admin/pedidos/:id/pago | Cookie admin | `{ estado_pago }` | `{ ok:true, data:{ id, estado_pago, updated_at } }` | 401, 404, 409 |
| 8 | PATCH | /api/admin/pedidos/:id/cancelar | Cookie admin | — (body vacío o motivo opcional) | `{ ok:true, data:{ id, estado_pedido, estado_pago, stock_restituido } }` | 401, 404, 409 |

## Business Rules

| ID | Rule |
|----|------|
| BR-PED-01 | Crear pedido usa transacción MySQL con `SELECT FOR UPDATE` sobre productos afectados |
| BR-PED-02 | Stock de combos se descuenta de componentes en `combo_producto`, no del combo padre |
| BR-PED-03 | `numero` = "KMG-" + 4 dígitos aleatorios generados tras insert (post-insert) |
| BR-PED-04 | `token_seguimiento` = `crypto.randomUUID()` único |
| BR-PED-05 | Efectivo prohibe comprobante_archivo_id (CHECK SQL) |
| BR-PED-06 | Cancelar pedido restituye stock en transacción; solo desde recibido/en_preparacion |
| BR-PED-07 | Estados válidos: recibido→en_preparacion→listo→entregado; cancelar desde recibido|en_preparacion |
| BR-PED-08 | Pago: pendiente→pagado (efectivo); comprobante_subido→pagado/rechazado (transferencia) |
| BR-PED-09 | No se puede editar pedido cancelado o entregado |
| BR-PED-10 | Multer/file upload diferido; transferencia sin comprobante crea estado_pago=pendiente |

## Validation Rules (Zod)

| Field | Rules |
|-------|-------|
| nombre_cliente | string, min 2, max 150 |
| telefono_cliente | string, max 40, opcional |
| metodo_pago | enum ["transferencia", "efectivo"] |
| items | array min 1; cada item: producto_id int > 0, cantidad int > 0 |
| observaciones | string, max 500, opcional |
| estado_pedido (PATCH) | enum ["recibido","en_preparacion","listo","entregado","cancelado"] |
| estado_pago (PATCH) | enum ["pendiente","comprobante_subido","pagado","rechazado"] |

## curl Examples

```bash
# 1. Crear pedido online
curl -X POST http://localhost:3000/api/pedidos \
  -H "Content-Type: application/json" \
  -d '{"nombre_cliente":"María","telefono_cliente":"11 1234-5678","metodo_pago":"efectivo","items":[{"producto_id":1,"cantidad":2}]}'

# 2. Seguimiento público
curl http://localhost:3000/api/pedidos/seguimiento/abc-123-def

# 3. Listar admin con filtros
curl "http://localhost:3000/api/admin/pedidos?page=1&limit=20&estado_pedido=recibido" \
  -H "Cookie: token=..."

# 4. Cambiar estado a en_preparacion
curl -X PATCH http://localhost:3000/api/admin/pedidos/42/estado \
  -H "Content-Type: application/json" -H "Cookie: token=..." \
  -d '{"estado_pedido":"en_preparacion"}'

# 5. Cancelar pedido
curl -X PATCH http://localhost:3000/api/admin/pedidos/42/cancelar \
  -H "Cookie: token=..."
```