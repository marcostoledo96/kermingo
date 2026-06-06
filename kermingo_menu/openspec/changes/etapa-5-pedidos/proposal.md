# Proposal: Sistema de Pedidos (etapa-5-pedidos)

## Intent
Implementar el flujo completo de pedidos: creación pública con validación de stock, combos, número KMG y token de seguimiento; gestión admin con filtros, cambio de estado, pago y cancelación con restitución de stock. Desbloquea el frontend de checkout, seguimiento y cocina.

## Scope

### In Scope
- 8 endpoints REST: 2 públicos + 6 admin
- Creación de pedido con transacción MySQL y `SELECT FOR UPDATE`
- Descuento de stock de productos y componentes de combos
- Generación de `numero` (KMG-XXXX) y `token_seguimiento` (crypto random)
- Seguimiento público por token
- Cancelación con restitución de stock en transacción
- Cambio de estado de pedido: recibido → en_preparacion → listo → entregado
- Cambio de estado de pago
- Edición de pedido admin (datos cliente)
- Lista paginada con filtros (estado_pedido, estado_pago, origen, buscar)
- Nuevo error `InsufficientStockError` (409) en `errors.js`

### Out of Scope
- Subida de comprobante de transferencia (multer no está instalado; se difiere a etapa de Drive/files)
- Caja rápida (`POST /api/admin/caja/venta`) → etapa 6
- Cocina/entrega endpoints específicos → etapa 6
- Reportes Excel → etapa 7
- Comprobantes admin (aprobar/rechazar) → etapa de files

## Capabilities

### New Capabilities
- `pedidos-publicos`: `POST /api/pedidos`, `GET /api/pedidos/seguimiento/:token`
- `pedidos-admin`: `GET /api/admin/pedidos`, `GET /api/admin/pedidos/:id`, `PUT /api/admin/pedidos/:id`, `PATCH /api/admin/pedidos/:id/estado`, `PATCH /api/admin/pedidos/:id/pago`, `PATCH /api/admin/pedidos/:id/cancelar`
- `stock-management`: validación, descuento y restitución en transacción; soporte combo-producto
- `insufficient-stock-error`: nueva clase `InsufficientStockError` 409

### Modified Capabilities
- None (no cambian requisitos de specs existentes)

## Approach
1. Extender `errors.js` con `InsufficientStockError`
2. Crear `pedido.routes.js` y registrar en `index.routes.js`
3. Crear `pedido.controller.js` con 8 handlers delegando a service
4. Crear `pedido.service.js` con lógica de negocio (generar número/token, transacciones stock, combos)
5. Crear `pedido.model.js` con queries SQL (insert pedido, insert detalle, listar con filtros, update estado)
6. Crear `pedido.schema.js` con Zod para validar body de POST, PUT, PATCH
7. Reutilizar `producto.model.js` para leer stock y combos
8. Verificar: `npm test` con mocks de DB; `npm run dev` + curl a endpoints

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/api/routes/index.routes.js` | Modified | Registrar `pedido.routes.js` |
| `backend/src/api/routes/pedido.routes.js` | New | 8 rutas públicas y admin |
| `backend/src/api/controllers/pedido.controller.js` | New | Handlers de pedidos |
| `backend/src/api/services/pedido.service.js` | New | Lógica de negocio + transacciones |
| `backend/src/api/models/pedido.model.js` | New | Queries pedido y detalle |
| `backend/src/api/schemas/pedido.schema.js` | New | Validación Zod |
| `backend/src/api/utils/errors.js` | Modified | Agregar `InsufficientStockError` |
| `backend/src/api/models/producto.model.js` | Modified | Query stock combos si falta |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|-------------|
| Race condition en stock sin `SELECT FOR UPDATE` | Med | Usar transacción con `FOR UPDATE` en validación |
| Inconsistencia si combo componentes cambian post-pedido | Low | Snapshot en `pedido_detalle`, no recalcula |
| Numero/token collision improbable | Low | Prefix KMG + 4 dígitos random; retry si UNIQUE falla |
| Multer ausente bloquea comprobante | Med | **Documentado**: difiere file upload; admin marca pagado manual |

## Rollback Plan
Eliminar archivos nuevos (`pedido.*.js`) y revertir `index.routes.js` y `errors.js` con git. Sin impacto en tablas existentes (solo se lee/escribe; no altera schema).

## Dependencies
- `backend/src/api/database/schema.sql` — tablas `pedido`, `pedido_detalle`, `combo_producto` ya existen
- `mysql2/promise` — ya instalado
- `crypto` — nativo, para token
- **NO se instala multer** en esta etapa (defer)

## Success Criteria
- [ ] `POST /api/pedidos` crea pedido, descuenta stock, devuelve número KMG-XXXX y token
- [ ] `GET /api/pedidos/seguimiento/:token` devuelve estado público del pedido
- [ ] `GET /api/admin/pedidos` lista paginada con filtros funcionando
- [ ] `PATCH /api/admin/pedidos/:id/estado` avanza estados válidos
- [ ] `PATCH /api/admin/pedidos/:id/cancelar` restituye stock en transacción
- [ ] Stock insuficiente devuelve 409 con `InsufficientStockError`
- [ ] Combo descuenta stock de sus componentes internos
- [ ] `npm test` pasa con mocks de DB (Jest/Supertest)
