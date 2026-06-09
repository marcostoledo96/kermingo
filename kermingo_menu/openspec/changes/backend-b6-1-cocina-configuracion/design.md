# Design: backend-b6-1-cocina-configuracion

## Technical Approach

Implement B6.1 as two thin HTTP modules: `cocina` for admin kitchen operations and `configuracion` for store status. Reuse existing pedido auth, validation, response helpers, and pedido state mutation logic. Keep kitchen reads close to pedido data; keep store config CRUD isolated in its own model because it targets `configuracion_tienda`.

## Architecture Decisions

### Decision: Reuse pedido transition logic

| Option | Tradeoff | Decision |
|---|---|---|
| Duplicate kitchen transition rules in `cocina` | Fast locally, risks rule drift with `/admin/pedidos/:id/estado` | No |
| Reuse `pedido.model.js` transition path and add only kitchen-specific guards | Small touch in existing code, single source of truth | Yes |

**Rationale**: `pedido.model.js` already owns the estado machine. Kitchen should call that path after an explicit guard that rejects no-op or out-of-flow requests.

### Decision: New controller/routes, minimal model changes

| Option | Tradeoff | Decision |
|---|---|---|
| Put kitchen endpoints into `pedido.routes/controller` | Fewer files, mixes cashier/admin list concerns | No |
| Create `cocina.routes/controller/schema` and reuse pedido model methods | Clear module boundary, narrow apply slice | Yes |

**Rationale**: the HTTP surface is new, but core pedido rules already exist.

### Decision: Minimal config support = public GET + admin GET/PUT

| Option | Tradeoff | Decision |
|---|---|---|
| Only public GET + admin PUT | Smallest diff, admin UI lacks dedicated read | No |
| Public GET plus admin GET/PUT for same minimal fields | Slightly larger, supports edit form safely | Yes |

**Rationale**: admin needs the persisted `cena_habilitada_desde` value without overloading the public contract.

## Data Flow

`GET /api/admin/cocina/pedidos` → `requireAdmin` → `findKitchenPedidos()` → response 200  
`GET /api/admin/cocina/pedidos/:id` → `requireAdmin` → `findById()` → 404/200  
`PATCH /api/admin/cocina/pedidos/:id/estado` → `requireAdmin` + trusted origin + body validation → fetch pedido → reject same-state / invalid target → `updateEstadoPedido()` → `findById()` → response 200  
`GET|PUT /api/configuracion-tienda` → config model on `configuracion_tienda(id=1)` → response 200

Kitchen list query filters `estado_pedido IN ('recibido','en_preparacion','listo')`, excludes `cancelado`, and returns enough summary fields for queue rendering (`id`, `numero`, `nombre_cliente`, `mesa`, `estado_pedido`, `estado_pago`, `observaciones`, `created_at`, `total`, item count). Detail reuses existing `findById()` item snapshot.

## File Changes

| File | Action | Description |
|---|---|---|
| `backend/src/api/routes/cocina.routes.js` | Create | Admin kitchen routes (`/pedidos`, `/pedidos/:id`, `/pedidos/:id/estado`). |
| `backend/src/api/controllers/cocina.controller.js` | Create | Thin orchestration for kitchen list/detail/state change. |
| `backend/src/api/schemas/cocina.schema.js` | Create | Param/body schemas for kitchen endpoints. |
| `backend/src/api/models/pedido.model.js` | Modify | Add `findKitchenPedidos()` and, if needed, export a tiny helper/guard-friendly read path without duplicating transition rules. |
| `backend/src/api/routes/configuracion.routes.js` | Create | Public/admin config routes. |
| `backend/src/api/controllers/configuracion.controller.js` | Create | Read/update handlers for minimal store config fields. |
| `backend/src/api/models/configuracion.model.js` | Create | `findPublic`, `findAdmin`, `updateMinimal` on `configuracion_tienda`. |
| `backend/src/api/schemas/configuracion.schema.js` | Create | `estado`, `mensaje_publico`, `cena_habilitada_desde` validation. |
| `backend/src/api/routes/index.routes.js` | Modify | Mount `/admin/cocina`, `/configuracion-tienda`, `/admin/configuracion-tienda`. |
| `backend/tests/cocina-configuracion.test.js` | Create | Supertest coverage for key contracts. |

## Interfaces / Contracts

```http
GET    /api/admin/cocina/pedidos
GET    /api/admin/cocina/pedidos/:id
PATCH  /api/admin/cocina/pedidos/:id/estado
GET    /api/configuracion-tienda
GET    /api/admin/configuracion-tienda
PUT    /api/admin/configuracion-tienda
```

```json
{ "estado_pedido": "en_preparacion" }
```

```json
{
  "estado": "abierta",
  "mensaje_publico": "Tomamos pedidos",
  "cena_habilitada_desde": "20:30:00"
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Integration | auth required, 404 detail, valid/invalid kitchen transition, cancelado excluded | `backend/tests/cocina-configuracion.test.js` with Supertest + seeded DB fixtures/mocks matching current backend style |
| Integration | public config read + admin config update validation | same test file; assert response shape and 400 on invalid `estado` |
| Manual | kitchen queue progression and config update | curl flow from spec + checklist cocina |

## Migration / Rollout

No migration required. Existing `configuracion_tienda` row `id=1` is assumed by seed and must remain present.

## Open Questions

- [ ] Confirm preferred kitchen ordering: strict flow order (`recibido`, `en_preparacion`, `listo`) vs delivery-priority ordering.
- [ ] Confirm whether same-state PATCH should be treated as `400` in kitchen endpoints (recommended) while leaving generic admin pedido behavior untouched.
