# Design: Backend B6.1 Configuración — Review Fixes

## Technical Approach

Aplicar fixes retroactivos sobre el PUT de configuración: (1) cerrar CSRF omitiendo `requireTrustedOrigin`, (2) eliminar el falso positivo `affectedRows === 0 → 404`, (3) permitir `null` en campos DB-nullable via Zod `.nullable().optional()`, (4) corregir tests engañosos y agregar tests con mocks del controller + unitarios schema. No agregar DB de test; cobertura de autorización con `jest.unstable_mockModule` del middleware `admin.middleware.js`.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| CSRF protection | Por ruta: `requireAdmin`, `requireTrustedOrigin`, `validateBody`, handler | Global middleware. Rechazado: proyecto usa por ruta. | Consistente con `cocina.routes.js`, `pedido.routes.js`, `producto.routes.js`. `sameSite: 'none'` en prod hace esto obligatorio. |
| affectedRows no-op | Descartar `affectedRows`; `findAdmin` post-update | Chequear `changedRows`. Rechazado: mysql2 no expone `changedRows` por defecto. | UPDATE no-op con mismos datos devuelve `affectedRows=0` pero la fila existe por seed `id=1`. `findAdmin` post-update da la semántica real: `null` → 404 (seed borrado), si no → 200. |
| Null en Zod | `.nullable().optional()` | `.nullable()` solo | `.optional()` permite omitir campo (no-op). `.nullable()` permite enviar `null` (limpia SQL `NULL`). Ambas se necesitan. |
| Estructura de tests | 3 archivos: test de integración sin auth + controller mocked + unit Zod | Un solo archivo grande. Rechazado: no se resetea auth entre tests sin afterEach completo. | Patrón validado en fix anterior (`cocina-review-fixes`). `jest.unstable_mockModule` da control sin DB. |
| Rama de fix | `feature/backend-b6-1-configuracion-review-fixes` desde `feature/backend-b6-1-cocina-review-fixes` | Desde `main`. Rechazado: acumula fix cocina + configuración. | Mantener stacked fixes sobre la misma línea de feature B6.1. No romper `main`. |

## Data Flow

```
Admin request
      │
      ▼
┌─────────────────┐
│ requireAdmin    │── cookie JWT + isAdmin ──► 401 si falla
└─────────────────┘
      │
      ▼
┌─────────────────────┐
│ requireTrustedOrigin│── Origin/Referer trusted o sin Origin+Referer frontend ──► 403 si falla
└─────────────────────┘
      │
      ▼
┌──────────────────────┐
│ validateBody(Zod)    │── strict enum, string maxlen, regex TIME, nullable ──► 400 si falla
└──────────────────────┘
      │
      ▼
┌──────────────────┐
│ updateMinimal    │── omite `undefined`, setea SQL NULL para `null`, construye UPDATE dinámico
└──────────────────┘
      │
      ▼
┌──────────────┐
│ findAdmin      │── SELECT post-update; si null → 404 (seed borrado). Si no → 200 + row
└──────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/api/routes/configuracion.routes.js` | Modify | Agregar `import { requireTrustedOrigin } ...`; insertar en cadena admin PUT: `requireAdmin`, `requireTrustedOrigin`, `validateBody(...)` |
| `backend/src/api/controllers/configuracion.controller.js` | Modify | Quitar `if (affected === 0) throw NotFoundError`. Tras `updateMinimal`, llamar `findAdmin`; si resultado `null`, lanzar `NotFoundError`; sino `respuestaExitosa` 200. |
| `backend/src/api/schemas/configuracion.schema.js` | Modify | `mensaje_publico` y `cena_habilitada_desde`: agregar `.nullable()` antes de `.optional()`. |
| `backend/tests/configuracion.test.js` | Modify | Renombrar test "estado inválido -> 400" a "sin cookie devuelve 401"; reescribir comentario sobre error DB (500, no 404); actualizar `afterAll` si se requiere para mocks compatibles. |
| `backend/tests/configuracion.controller.test.js` | Create | Tests con `jest.unstable_mockModule` de `admin.middleware.js` con cookie mock. Cubre: PUT mismos datos → 200, PUT con `null` → 200, PUT con estado inválido → 400, put con origin hostil → 403. |
| `backend/tests/configuracion.unit.test.js` | Create | Tests unitarios del schema Zod sin HTTP/Supertest: estado válido, estado inválido, mensaje longitud, mensaje `null`, cena_habilitada format, cena_habilitada `null`, strict extra prop. |
| `openspec/changes/backend-b6-1-cocina-configuracion/tasks.md` | Modify | Marcar items de configuración completados/desactualizados según estado real del change. |

## Interfaces / Contracts

### Route chain (PUT admin)
```js
adminRouter.put(
  '/',
  requireAdmin,
  requireTrustedOrigin,
  validateBody(updateConfiguracionSchema),
  actualizarAdmin
);
```

### Zod schema export
```js
export const updateConfiguracionSchema = z.object({
  estado: z.enum(['abierta', 'cerrada', 'demo']),
  mensaje_publico: z.string().max(500).nullable().optional(),
  cena_habilizada_desde: z.string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/, 'Formato esperado: HH:MM:SS')
    .nullable()
    .optional(),
}).strict();
```

### Controller: actualizarAdmin (fix)
```js
export async function actualizarAdmin(req, res, next) {
  try {
    const pool = getPool();
    await updateMinimal(pool, req.body);
    const config = await findAdmin(pool);
    if (!config) throw new NotFoundError('Configuración no encontrada');
    return respuestaExitosa(res, config, 'Configuración actualizada');
  } catch (err) { next(err); }
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Integration (no auth) | Rutas sin cookie → 401; body no-op inválidado por Zod no corre sin auth. | `supertest` contra `app.js` con pool real. |
| Controller mocked | PUT autenticado: mismos datos → 200; `null` en campos → 200; estado inválido → 400; origin hostil → 403; strict rejects extra props → 400. | `jest.unstable_mockModule` de `admin.middleware.js` para simular `req.user`. `findAdmin`/`updateMinimal` mock en tests unitarios del controller. |
| Unit (Zod schema) | Estado enum, longitud mensaje, regex hora, `null`, omitido, strict. | `z.safeParse()` directo, sin Supertest ni Express. |
| Manual | No-op con mismos datos devuelve 200 en vez de 404; `null` limpia campos en DB. | Ejecutar request contra backend local con DB. |

## Migration / Rollout

No migration requerida. Schema DB (`TEXT NULL`, `TIME NULL`) sin cambios. Revertir commit revierte los 4 archivos + 2 test + tasks. No afecta `main`.

## Open Questions

- [ ] ¿Se requiere actualizar también `configuracion.test.js` para que use `jest.unstable_mockModule` de la pool (`db.js`) a fin de evitar `afterAll(pool.end())` posiblemente conflictivo con otros test suites? Si es así, evaluar en verify.
- [ ] ¿Existe algún `validateParams` futuro para `id=1` que invalide el approach de seed fija? No necesario para MVP.
