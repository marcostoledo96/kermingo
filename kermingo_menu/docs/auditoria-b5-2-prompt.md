# Prompt de Auditoría Post-B5.2 para ChatGPT 5.5

Sos arquitecto de software senior y QA técnico estricto. Tu rol es adversarial: si encontrás regresiones, bugs, decisiones arbitrarias, o cualquier cosa que rompa lo que ya estaba funcionando, marcala con severidad alta y explicá POR QUÉ. No suavices el análisis.

## Contexto del proyecto

Kermingo es el backend de un evento scout recaudatorio (kermesse + bingo). Stack: Node.js + Express + MySQL (mysql2/promise) + ESM + JWT en cookie httpOnly + bcrypt + Zod. El proyecto es para producción con fecha de evento 20 de junio de 2026.

Estoy trabajando con SDD (Spec-Driven Development) en pipeline `explore → propose → spec → design → tasks → apply → verify → archive`. Cada etapa queda registrada en `openspec/changes/`.

## Historia de la etapa B5.2

### Qué se necesitaba

El doc `docs/planificacion/32-B5_2_ALINEACION_SCHEMA_SEED_PROMO_NUMERO_STOCK.md` define B5.2 como una etapa de **alineación** entre código, schema, seed y documentación. La auditoría post-B5.1 detectó 4 puntos parciales:

- PUNTO-4: Stock acumulado (lógica OK en código, pero DB y seed usaban `combo` en vez de `promo`, y faltaba `ORDER BY` determinista)
- PUNTO-5: Defensa anti stock negativo (existe, pero falla con stock ilimitado porque `affectedRows = 0` en `UPDATE ... WHERE stock_actual >= ?` cuando el producto no tiene stock)
- PUNTO-6: Promos descuentan componentes (lógica OK, pero DB y seed usaban `combo`)
- PUNTO-9: Origin/Referer (faltaba aplicar a `POST /api/auth/logout`)

### Lo que B5.2 debía hacer (puntual)

1. Cambiar `producto.tipo ENUM('comida', 'bebida', 'combo')` → `ENUM('comida', 'bebida', 'promo')` en `schema.sql`.
2. Cambiar `pedido.numero` a `VARCHAR(20) NULL UNIQUE` en `schema.sql` (porque el modelo crea el pedido primero sin número y luego lo actualiza con `KMG-XXXX`).
3. Eliminar índices duplicados de `schema.sql` (ya están en `indexes.sql` separado).
4. Actualizar `seed.sql`: combos → `tipo = 'promo'`, `stock_limitado = 0`, `stock_actual = NULL`. Pizzas sin TACC y Helados palito con `stock_actual = 0`.
5. En `pedido.model.js → createWithTransaction`: omitir `UPDATE` de descuento para productos con `stock_limitado = 0` (porque no tienen stock que descontar).
6. En `pedido.model.js → cancelWithTransaction`: ordenar IDs de productos de forma ascendente antes de hacer `SELECT ... FOR UPDATE` (evita deadlocks). Omitir reposición para stock ilimitado.
7. En `auth.routes.js`: aplicar `requireTrustedOrigin` a `POST /api/auth/logout`.
8. Crear/actualizar `backend/.env.example` con todas las variables necesarias (DB, JWT, COOKIE_NAME, FRONTEND_URL).
9. Crear tests mínimos con `jest` + `supertest` (al menos health test).

### Lo que el subagente (Gemini 3.5 Flash High) hizo

El subagente corrió el pipeline SDD completo sobre un entorno Antigravity y reportó éxito. **Yo detecté que se pasó de la raya y aplicó cambios no pedidos que rompen cosas que ya funcionaban.** Específicamente:

#### Cambios ACEPTABLES (alineados con el doc 32)
- ✅ `producto.tipo ENUM` ahora es `('comida', 'bebida', 'promo')` en `schema.sql`
- ✅ `pedido.numero VARCHAR(20) NULL UNIQUE` en `schema.sql`
- ✅ Índices duplicados quitados del bloque de índices
- ✅ `seed.sql` actualizado: promos con `stock_limitado=0, stock_actual=NULL`
- ✅ `pedido.model.js → createWithTransaction`: skip productos con `stock_limitado=0` en el `UPDATE` de descuento
- ✅ `pedido.model.js → cancelWithTransaction`: ordena IDs, omite ilimitados
- ✅ `auth.routes.js`: `requireTrustedOrigin` en `/logout`
- ✅ `backend/.env.example` creado
- ✅ `package.json`: agregadas dependencias `jest` y `supertest`
- ✅ `backend/tests/health.test.js` creado

#### Cambios PROBLEMÁTICOS que NO estaban pedidos (REGRESIONES)

**R1 — `schema.sql` perdió `DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` en TODAS las tablas**
- El subagente quitó los charset/collation de TODAS las definiciones `CREATE TABLE`.
- Riesgo: la base queda con charset default del server (típicamente `utf8mb3` o `latin1` en MySQL 5.7, o `utf8mb4` en 8.0+). Si la DB se crea en un server con charset distinto, los strings con tildes/ñ ("Categoría", "Comida", "Comprobante", "Merienda", "Bebida", "Pizzas", "Piña", "Café", etc.) van a fallar o guardar mal.
- AGENTS.md dice: "Tablas y campos técnicos en español, singular, sin tildes" pero en los DATOS (nombres de producto, mensajes, observaciones) sí hay tildes (`'Café de filtro recién hecho'`, `'Bien chocolatada'`, etc.).
- **Gravedad: ALTA** (rompe la integridad de datos en producción si el server MySQL no tiene utf8mb4 por default).

**R2 — `schema.sql` perdió todos los `CHECK` constraints**
- Quitó `CHECK (precio >= 0)`, `CHECK (stock_actual IS NULL OR stock_actual >= 0)`, `CHECK (stock_minimo_alerta >= 0)`, `CHECK (cantidad > 0)`, `CHECK (total >= 0)`, `CHECK (subtotal >= 0)`, `CHECK (precio_unitario >= 0)`, `CHECK (tamanio_bytes > 0)`.
- Riesgo: MySQL < 8.0.16 NO enforce CHECK, así que en algunos servers no rompe nada. Pero en 8.0.16+, perder la defensa a nivel DB es perder redundancia importante (la app ya valida con Zod, pero la DB no debería confiar en la app).
- **Gravedad: MEDIA** (depende de la versión de MySQL del server de producción).

**R3 — `schema.sql` cambió `CONSTRAINT fk_pedido_comprobante FOREIGN KEY (...)` a `FOREIGN KEY (...)` simple**
- Pierde el nombre del constraint. Esto hace que los errores de FK en MySQL sean más difíciles de debuggear (sale `errno: 150` genérico en vez de un nombre identificable).
- **Gravedad: BAJA** (más DX que correctness).

**R4 — `schema.sql` perdió `CONSTRAINT chk_pedido_comprobante_efectivo CHECK (metodo_pago <> 'efectivo' OR comprobante_archivo_id IS NULL)`**
- Este check es defensa contra un bug de lógica: si un pedido es `metodo_pago = 'efectivo'`, NO debería tener comprobante. Sin este check, un INSERT/UPDATE con ambos campos se va a la DB sin error.
- AGENTS.md dice: "Si elige efectivo, no mostrar ni enviar comprobante". Esto está implementado en backend, pero perder el check de DB es perder la última línea de defensa.
- **Gravedad: MEDIA** (defensa en profundidad rota).

**R5 — `seed.sql` cambió el bcrypt hash del admin**
- Hash viejo: `$2b$10$NJeTubdE9ncZRJoVj373ZOsT2ubw9hpCMmDDhceBV.O2ZdfhtX23e`
- Hash nuevo: `$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy`
- Esto es el hash estándar de `'password'` (texto literal) generado con bcrypt 5.x. **El password `admin123` ya NO funciona.** El script `backend/scripts/fix-admin-hash.js` existe y parece que se creó como workaround para regenerar el hash.
- **Gravedad: ALTA** (rompe el login admin por default).

**R6 — `package.json` hizo downgrade de dependencias**
- `bcrypt`: `^6.0.0` → `^5.1.1`
- `zod`: `^4.4.3` → `^3.23.8`
- `jsonwebtoken`: `^9.0.3` → `^9.0.2`
- Riesgo: bcrypt 5.x es más estable pero más viejo; zod 4.x → 3.x es **downgrade mayor** y los `.strict()` chained de Zod 4 están deprecados en Zod 3 (pueden dar warnings). La API de Zod 3 vs 4 tiene diferencias (ej. `z.string().email()` con mensaje custom vs sin él, `z.coerce` con cambios menores, etc.).
- **Gravedad: MEDIA-ALTA** (cambiar versiones de seguridad en un proyecto que va a producción es riesgoso sin razón explícita).

**R7 — `pedido.model.js` movió `const stockMap = new Map(...)` afuera del `if`**
- Refactor cosmético, no rompe nada.
- **Gravedad: NINGUNA**.

### Lo que necesito de vos

Necesito que hagas una **auditoría técnica completa y estricta** del estado actual del backend (lo que está en el working tree, NO commiteado todavía). El ZIP adjunto contiene:

- `backend/src/` — código completo del backend
- `backend/.env.example`, `backend/package.json`, `backend/package-lock.json` — dependencias y config
- `backend/tests/health.test.js` — test básico
- `backend/scripts/fix-admin-hash.js` — script de workaround
- `openspec/changes/backend-b5-2-schema-seed-alignment/` — artefactos SDD generados por el subagente (explore, proposal, spec, design, tasks, verify-report, archive-report)
- `openspec/changes/etapa-5-pedidos/` — artefactos del cambio previo relacionado
- `docs/planificacion/32-B5_2_ALINEACION_SCHEMA_SEED_PROMO_NUMERO_STOCK.md` — el doc de la etapa
- `docs/planificacion/31-B5_1_FIXES_SEGURIDAD_VALIDACION_STOCK.md` — auditoría anterior
- `docs/auditoria-b5-1-prompt.md` — el prompt que ejecuté con ChatGPT para B5.1
- `AGENTS.md` — reglas operativas del proyecto

## Tu trabajo

### 1. Validá las regresiones reportadas arriba

Para cada una de las 7 regresiones (R1-R7), confirmá si el código realmente la tiene y decime la severidad real desde tu perspectiva técnica (ignorá mi severidad estimada, usá la tuya). Si encontrás más regresiones que no detecté, listalas.

### 2. Buscá regresiones adicionales

Revisá TODOS los archivos modificados por B5.2 (los que están en el working tree). Compará contra lo que el doc 32 pedía. Si encontrás algo más que se haya "pasado de la raya" (cambios cosméticos, decisiones arbitrarias, código innecesario, dependencias extra, etc.), marcalo.

### 3. Verificá que los cambios BUENOS realmente estén bien

Para los 9 cambios ACEPTABLES listados arriba, verificá que el código realmente los aplique correctamente y que no haya bugs introducidos (por ejemplo: ¿el orden determinista del FOR UPDATE realmente evita deadlocks? ¿la omisión de stock_limitado=0 es correcta? ¿el `requireTrustedOrigin` en logout está bien aplicado?).

### 4. Proponé un plan de remediación detallado

Para CADA regresión y cada bug que encuentres, proponé:
- **Acción concreta**: revertir / reescribir / aceptar
- **Cambio exacto de código o SQL**: con el snippet específico
- **Justificación**: por qué es la acción correcta
- **Riesgo de aplicar el fix**: qué puede romper si lo aplico
- **Verificación**: cómo valido que el fix funcionó

### 5. Orden de aplicación

Proponé un orden de aplicación de los fixes que sea seguro (los cambios que pueden romper tests primero, después los cosméticos, etc.).

### 6. Veredicto final

¿El backend está listo para avanzar a B6 (Caja, Cocina, Comprobantes, Reportes) **después** de aplicar tu plan de remediación? Si hay algo que NO debería resolverse en B5.2 y deba pasar a B6, marcalo.

## Formato de respuesta esperado

```txt
# Auditoría B5.2 — Post-subagente

## 1. Validación de regresiones reportadas

### R1 — charset/collation perdido
[✅ CONFIRMADA / ❌ NO ES REGRESIÓN / ⚠️ PARCIAL]
Archivo: backend/src/api/database/schema.sql
Líneas: X-Y
Evidencia: [...]
Severidad real: [ALTA / MEDIA / BAJA / NINGUNA]
Justificación: [...]

### R2 — CHECK constraints perdidos
[misma estructura]

[... R3 a R7 ...]

## 2. Regresiones adicionales encontradas

### RA-1 — [título]
Archivo: ...
Descripción: ...
Severidad: ...
Fix propuesto: ...

[... otras ...]

## 3. Validación de cambios buenos

### C1 — producto.tipo ahora es 'promo'
[✅ BIEN APLICADO / ⚠️ BIEN PERO INCOMPLETO / ❌ MAL APLICADO]
Verificación: [...]
Notas: ...

[... C2 a C9 ...]

## 4. Plan de remediación

### Fix 1 — [título]
- Acción: [revertir / reescribir / aceptar]
- Archivos: [paths]
- Cambio exacto: [snippet]
- Justificación: ...
- Riesgo: ...
- Verificación: [cómo valido]

[... Fix 2 en adelante ...]

## 5. Orden de aplicación sugerido

1. [Fix X] — razón
2. [Fix Y] — razón
3. ...

## 6. Veredicto final

¿Listo para B6 después de aplicar este plan? [SÍ / NO / SÍ PERO CON PREREQUISITOS]
Si NO, qué bloquea.
Si SÍ, qué monitoreo post-B5.2 sugieres.
```

## Archivos que tenés que abrir sí o sí

Para hacer un buen trabajo, **abrí y leé estos archivos** (al menos):

```txt
backend/src/api/database/schema.sql
backend/src/api/database/seed.sql
backend/src/api/database/indexes.sql
backend/src/api/models/pedido.model.js
backend/src/api/routes/auth.routes.js
backend/src/api/middlewares/origin.middleware.js
backend/src/api/middlewares/validate.middleware.js
backend/src/api/schemas/pedido.schema.js
backend/src/api/controllers/pedido.controller.js
backend/.env.example
backend/package.json
backend/tests/health.test.js
backend/scripts/fix-admin-hash.js
openspec/changes/backend-b5-2-schema-seed-alignment/{proposal.md,spec.md,design.md,tasks.md,verify-report.md,archive-report.md}
docs/planificacion/32-B5_2_ALINEACION_SCHEMA_SEED_PROMO_NUMERO_STOCK.md
docs/planificacion/31-B5_1_FIXES_SEGURIDAD_VALIDACION_STOCK.md
AGENTS.md
```

No quiero que inventes nada: si decís que una regresión está, mostrame con líneas/evidencia. Si decís que no está, también. Si tu conclusión es "esto no es regresión porque X", explicá X.

Sé estricto. Es preferible que me digas "encontré 12 problemas" y sean reales, a que me digas "todo bien" y me esté perdiendo algo que va a explotar en producción el 20 de junio.
