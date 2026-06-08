# 32 — Etapa B5.2: Alineación schema/seed/promo/numero/stock ilimitado

## Objetivo

Este documento convierte la auditoría post-B5.1 en una etapa ejecutable para OpenCode.

La etapa B5.1 corrigió gran parte de los problemas de seguridad, validación y stock, pero la auditoría detectó que todavía **no conviene avanzar a B6 — Caja, Cocina, Comprobantes y Reportes** porque hay desalineaciones entre:

```txt
código backend
schema.sql
seed.sql
documentación
```

El problema principal es que el código ya trabaja con productos tipo `promo`, pero la base y el seed todavía usan `combo`. Además, el modelo de pedidos inserta primero el pedido sin número y luego actualiza `KMG-0001`, pero el schema todavía exige `numero NOT NULL`.

---

# Veredicto de auditoría post-B5.1

```txt
Veredicto: NO avanzar todavía a B6.
Estado B5.1: mejoró mucho, pero quedó incompleto por desalineación schema/seed/código.
Siguiente paso recomendado: B5.2 — Alineación schema/seed/promo/numero/stock ilimitado.
```

## Resumen numérico de auditoría

```txt
Puntos corregidos: 10/14
Puntos no corregidos: 0/14
Puntos parciales: 4/14
```

## Puntos parciales detectados

```txt
[PUNTO-4] Stock acumulado: lógica parcial, pero DB/seed usan combo y falta ORDER BY.
[PUNTO-5] Defensa anti stock negativo: existe, pero falla con stock ilimitado.
[PUNTO-6] Promos descuentan componentes: lógica parcial, pero DB/seed usan combo.
[PUNTO-9] Origin/Referer: corregido para productos/pedidos admin, pero logout queda sin protección.
```

---

# Contexto del proyecto

Kermingo es el backend de un evento scout recaudatorio.

Stack backend:

```txt
Node.js
Express
MySQL
mysql2/promise
ESM
JWT en cookie httpOnly
bcrypt
Zod
CORS con credentials
```

Estructura relevante:

```txt
backend/                         # backend activo
frontend/                        # frontend activo Next.js, NO tocar en esta etapa
diseno-de-landing-kermingo/       # referencia visual v0, NO tocar nunca
docs/planificacion/               # documentación viva
openspec/                         # specs SDD/OpenSpec
.agents/skills/                   # skills locales
```

---

# Documentación que OpenCode debe leer antes de ejecutar

Antes de modificar código, leer:

```txt
AGENTS.md
docs/planificacion/00-INDICE-MAESTRO.md
docs/planificacion/05-BASE_DE_DATOS_MYSQL.md
docs/planificacion/06-ENDPOINTS_API.md
docs/planificacion/09-AUTH_COOKIES_CORS.md
docs/planificacion/13-FLUJOS_FUNCIONALES.md
docs/planificacion/17-TAREAS_BACKEND_DETALLADAS.md
docs/planificacion/27-CHECKPOINTS_TESTING_AUDITORIA.md
docs/planificacion/28-CHECKLIST_MANUAL_TESTING.md
docs/planificacion/29-PROMPT_AUDITORIA_CHATGPT.md
docs/planificacion/31-B5_1_FIXES_SEGURIDAD_VALIDACION_STOCK.md
docs/planificacion/32-B5_2_ALINEACION_SCHEMA_SEED_PROMO_NUMERO_STOCK.md
```

También revisar:

```txt
openspec/
.agents/skills/
docs/changelog-ia.md
docs/estado-actual.md
docs/mapa-archivos.md
```

---

# Metodología obligatoria

Trabajar con SDD usando Gentle AI.

Pipeline esperado:

```txt
explore → propose → spec → design → tasks → apply → verify → archive
```

No saltar directo a codear.

Crear cambio OpenSpec sugerido:

```txt
backend-b5-2-schema-seed-alignment
```

Debe incluir:

```txt
proposal.md
design.md
tasks.md
verify-report.md
specs/
```

---

# Reglas críticas

## No tocar frontend

No modificar:

```txt
frontend/
```

en esta etapa, salvo que OpenCode detecte documentación estrictamente necesaria y pida confirmación.

## No tocar referencia visual

No modificar nunca:

```txt
diseno-de-landing-kermingo/
```

## No avanzar a B6

No implementar todavía:

```txt
Caja
Cocina
Comprobantes
Reportes
Google Drive
Excel
Deploy
Frontend services
```

Esta etapa solo corrige alineación backend/schema/seed/documentación.

---

# Hallazgos a corregir

## EXTRA-CRIT-1 — `schema.sql` contradice el código en `tipo = 'promo'`

### Problema

El código backend espera productos tipo:

```txt
promo
```

Pero `schema.sql` todavía define:

```sql
tipo ENUM('comida', 'bebida', 'combo') NOT NULL
```

Mientras que el código ya usa:

```js
producto.tipo === 'promo'
```

y los schemas Zod aceptan:

```js
z.enum(['comida', 'bebida', 'promo'])
```

### Impacto

- Crear producto tipo `promo` por API puede fallar contra MySQL.
- Productos tipo `combo` del seed no entran en la lógica de componentes.
- La lógica de stock de promos queda rota en una base recién creada.

### Fix obligatorio

Cambiar en `backend/src/api/database/schema.sql`:

```sql
tipo ENUM('comida', 'bebida', 'promo') NOT NULL
```

### Criterio de aceptación

- `schema.sql`, Zod y lógica de `pedido.model.js` usan el mismo valor: `promo`.
- No queda `combo` como valor permitido de `producto.tipo`.

---

## EXTRA-CRIT-2 — `seed.sql` sigue usando `combo`, stock propio y productos que deberían estar agotados

### Problema

`seed.sql` todavía puede tener productos así:

```sql
(23, 'Combo merienda', ..., 'combo', 1, 10, 3, 1),
(24, 'Combo cena', ..., 'combo', 1, 10, 3, 1);
```

Pero las decisiones confirmadas fueron:

```txt
tipo = promo
stock_limitado = 0
stock_actual = NULL
```

Además:

```txt
Pizza sin TACC
Helados palito
```

deben arrancar agotados.

### Fix obligatorio

Actualizar `backend/src/api/database/seed.sql`:

```txt
Combo merienda → tipo = 'promo', stock_limitado = 0, stock_actual = NULL
Combo cena     → tipo = 'promo', stock_limitado = 0, stock_actual = NULL
Pizza sin TACC → stock_actual = 0
Helados palito → stock_actual = 0
```

Mantener componentes de las promos en:

```txt
combo_producto
```

### Nota sobre nombre de tabla `combo_producto`

Se puede mantener el nombre técnico `combo_producto` por ahora, pero documentar que representa la composición de productos tipo `promo`.

No renombrar a `promo_producto` en esta etapa salvo que OpenCode proponga una migración ordenada y Marcos lo apruebe.

### Criterio de aceptación

- El seed ya no inserta `tipo = 'combo'`.
- Las promos no tienen stock propio.
- Las promos se calculan por componentes.
- Pizza sin TACC y Helados palito arrancan agotados.

---

## EXTRA-CRIT-3 — `pedido.numero` sigue como `NOT NULL`, pero el modelo inserta sin número

### Problema

El modelo de pedidos inserta primero el pedido sin número:

```sql
INSERT INTO pedido
(token_seguimiento, origen, nombre_cliente, ...)
VALUES (...)
```

Después actualiza:

```js
const numero = formatearNumero(pedidoId);
await conn.query('UPDATE pedido SET numero = ? WHERE id = ?', [numero, pedidoId]);
```

Pero si `schema.sql` define:

```sql
numero VARCHAR(20) NOT NULL UNIQUE
```

el insert puede fallar.

### Fix obligatorio

Cambiar en `schema.sql`:

```sql
numero VARCHAR(20) NULL UNIQUE
```

### Justificación

MySQL permite múltiples `NULL` en un índice `UNIQUE`. Esto permite:

1. Insertar pedido con `numero = NULL`.
2. Obtener `insertId`.
3. Generar `KMG-0001`.
4. Actualizar el pedido dentro de la misma transacción.

### Criterio de aceptación

- Se puede insertar pedido sin número inicial.
- Luego se actualiza con `KMG-0001`.
- No hay race condition con `COUNT + 1`.
- El número sigue siendo único.

---

## EXTRA-IMP-1 — Índices duplicados/no idempotentes

### Problema

`schema.sql` tiene índices con:

```sql
CREATE INDEX ...
```

y además existe:

```txt
backend/src/api/database/indexes.sql
```

Esto puede duplicar el problema de índices no idempotentes.

### Fix requerido

Elegir una sola estrategia.

## Opción recomendada

Dejar índices en `indexes.sql` y eliminarlos de `schema.sql`, o dejar en `schema.sql` solo los índices que vienen por constraints/unique.

Documentar que:

```txt
schema.sql crea tablas
seed.sql carga datos
indexes.sql crea índices adicionales y se ejecuta de forma controlada
```

## Opción alternativa

Hacer idempotentes los índices dentro de `schema.sql`.

### Criterio de aceptación

- No hay índices duplicados en dos lugares sin control.
- Re-ejecutar el flujo documentado no rompe por índice duplicado.
- La documentación explica cómo correr schema/seed/indexes.

---

## EXTRA-IMP-2 — Falta `backend/.env.example` en el ZIP

### Problema

No apareció `backend/.env.example` en la auditoría.

### Fix obligatorio

Crear o recuperar:

```txt
backend/.env.example
```

Contenido mínimo recomendado:

```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=kermingo

JWT_SECRET=kermingo-dev-secret-cambia-en-produccion
JWT_EXPIRES_IN=24h
COOKIE_NAME=kermingo_admin_token
```

Si ya existe en el proyecto real pero no entró al ZIP, revisar:

```txt
scripts/crear_zip_auditoria.sh
```

para asegurarse de incluir `.env.example`, pero excluir `.env`.

### Criterio de aceptación

- Existe `backend/.env.example`.
- No existe `.env` dentro de ZIPs de auditoría.
- Las variables críticas están documentadas.

---

## EXTRA-IMP-3 — `package.json` tiene script test, pero no tiene Jest/Supertest instalados

### Problema

`backend/package.json` tiene:

```json
"test": "node --experimental-vm-modules node_modules/.bin/jest"
```

Pero no aparecen:

```txt
jest
supertest
```

en `devDependencies`.

### Fix recomendado

Si el script va a existir, instalar:

```bash
npm install -D jest supertest
```

O dejar documentado que tests automáticos todavía no están disponibles y ajustar temporalmente el script para no fallar.

### Recomendación para este proyecto

Instalar Jest + Supertest ahora o en una etapa B5.3 de testing. Como ya el script existe, lo más consistente es instalar las dependencias y agregar un test básico de health o dejarlo explícitamente pendiente.

### Criterio de aceptación

- `npm test` no falla por dependencia faltante.
- Si no se instalan tests todavía, queda documentado como pendiente.

---

## EXTRA-IMP-4 — Pedidos con productos ilimitados pueden fallar

### Problema

El descuento defensivo puede ejecutar:

```sql
UPDATE producto
SET stock_actual = stock_actual - ?
WHERE id = ?
  AND stock_limitado = 1
  AND stock_actual >= ?
```

Si un producto tiene:

```txt
stock_limitado = 0
```

el `affectedRows` será `0`, y el sistema puede lanzar error aunque el producto sea ilimitado.

### Fix obligatorio

Durante el descuento, saltar productos ilimitados.

Ejemplo conceptual:

```js
if (!producto.stock_limitado) {
  continue;
}
```

Para eso se necesita mantener un `stockMap` o estructura equivalente con:

```txt
producto_id
stock_limitado
stock_actual
nombre
```

### Criterio de aceptación

- Se puede crear pedido con producto ilimitado.
- No se intenta descontar stock de productos ilimitados.
- No se lanza falso error por `affectedRows = 0` en productos ilimitados.
- Los productos limitados siguen usando actualización defensiva.

---

## Punto parcial adicional — Origin/Referer en logout

### Estado actual

La protección Origin/Referer se aplicó a rutas admin mutantes de productos y pedidos, pero puede quedar afuera:

```txt
POST /api/auth/logout
```

### Recomendación

Aplicar `requireTrustedOrigin` también a logout, o justificar por qué queda público.

### Criterio de aceptación

- Logout no queda vulnerable a CSRF trivial.
- Si se deja público, queda documentado y aceptado.

---

# Archivos principales a revisar/modificar

## Backend

```txt
backend/src/api/database/schema.sql
backend/src/api/database/seed.sql
backend/src/api/database/indexes.sql
backend/src/api/models/pedido.model.js
backend/src/api/routes/auth.routes.js
backend/src/api/middlewares/origin.middleware.js
backend/.env.example
backend/package.json
```

## Documentación

```txt
docs/planificacion/05-BASE_DE_DATOS_MYSQL.md
docs/planificacion/06-ENDPOINTS_API.md
docs/planificacion/09-AUTH_COOKIES_CORS.md
docs/planificacion/13-FLUJOS_FUNCIONALES.md
docs/planificacion/17-TAREAS_BACKEND_DETALLADAS.md
docs/planificacion/27-CHECKPOINTS_TESTING_AUDITORIA.md
docs/changelog-ia.md
docs/estado-actual.md
docs/mapa-archivos.md
```

## OpenSpec

Crear o actualizar:

```txt
openspec/changes/backend-b5-2-schema-seed-alignment/
```

---

# Instrucciones para OpenCode

Copiar y pegar este prompt en OpenCode desde la raíz del proyecto.

```txt
Continuemos con Kermingo. Ya completamos B1 a B5 y luego B5.1. Después de la auditoría post-B5.1, todavía NO vamos a avanzar a B6 porque quedaron desalineaciones entre código, schema y seed.

# Etapa B5.2 — Alineación schema/seed/promo/numero/stock ilimitado

Trabajá bajo metodología SDD usando Gentle AI.

No avances a B6, caja, cocina, reportes, frontend ni deploy.

## Objetivo

Corregir los problemas detectados después de B5.1:

1. schema.sql debe usar `tipo ENUM('comida','bebida','promo')`, no `combo`.
2. seed.sql debe usar `tipo = 'promo'`, no `combo`.
3. Las promos no deben tener stock propio: `stock_limitado = 0`, `stock_actual = NULL`.
4. Pizza sin TACC y Helados palito deben arrancar agotados: `stock_actual = 0`.
5. pedido.numero debe ser `VARCHAR(20) NULL UNIQUE`, porque el modelo inserta primero y luego actualiza `KMG-0001`.
6. Resolver índices duplicados/no idempotentes entre schema.sql e indexes.sql.
7. Crear o recuperar backend/.env.example.
8. Corregir pedido.model.js para no intentar descontar stock de productos ilimitados.
9. Evaluar proteger POST /api/auth/logout con requireTrustedOrigin.
10. Resolver o documentar el script test si Jest/Supertest no están instalados.
11. Actualizar documentación viva y OpenSpec.

## Leer antes

Leé en este orden:

- AGENTS.md
- docs/planificacion/00-INDICE-MAESTRO.md
- docs/planificacion/05-BASE_DE_DATOS_MYSQL.md
- docs/planificacion/06-ENDPOINTS_API.md
- docs/planificacion/09-AUTH_COOKIES_CORS.md
- docs/planificacion/13-FLUJOS_FUNCIONALES.md
- docs/planificacion/17-TAREAS_BACKEND_DETALLADAS.md
- docs/planificacion/27-CHECKPOINTS_TESTING_AUDITORIA.md
- docs/planificacion/31-B5_1_FIXES_SEGURIDAD_VALIDACION_STOCK.md
- docs/planificacion/32-B5_2_ALINEACION_SCHEMA_SEED_PROMO_NUMERO_STOCK.md
- openspec/

También revisá skills locales:

- .agents/skills/
- .opencode/skills/
- .claude/skills/

Usá skills relevantes de backend, verification, SDD y testing si están disponibles.

## Reglas de estructura

- backend/ es el único código a modificar en esta etapa.
- frontend/ no se modifica.
- diseno-de-landing-kermingo/ no se modifica nunca.
- docs/planificacion se actualiza.
- openspec se actualiza.

## Cambios requeridos

### A. schema.sql

Modificar:

- `producto.tipo` debe ser `ENUM('comida','bebida','promo')`.
- `pedido.numero` debe ser `VARCHAR(20) NULL UNIQUE`.
- Resolver índices duplicados o no idempotentes.
- Alinear comentarios/documentación SQL con `promo`.

### B. seed.sql

Modificar:

- `Combo merienda` → `tipo = 'promo'`, `stock_limitado = 0`, `stock_actual = NULL`.
- `Combo cena` → `tipo = 'promo'`, `stock_limitado = 0`, `stock_actual = NULL`.
- `Pizza sin TACC` → `stock_actual = 0`.
- `Helados palito` → `stock_actual = 0`.
- Mantener `combo_producto` como tabla técnica de componentes de promo.

### C. pedido.model.js

Corregir descuento de stock para productos ilimitados:

- Si `stock_limitado = 0`, no ejecutar UPDATE de descuento.
- Si `stock_limitado = 1`, usar UPDATE defensivo con `stock_actual >= ?` y verificar `affectedRows`.
- Mantener acumulación de requerimientos para productos normales y componentes de promo.
- Confirmar que promo no descuenta stock propio.

### D. auth.routes.js / logout

Evaluar agregar `requireTrustedOrigin` a `POST /api/auth/logout`.

Si se agrega, no romper logout desde frontend autorizado.

Si no se agrega, documentar por qué.

### E. .env.example

Crear o corregir:

- backend/.env.example

Debe incluir:

- NODE_ENV
- PORT
- FRONTEND_URL
- DB_HOST
- DB_PORT
- DB_USER
- DB_PASSWORD
- DB_NAME
- JWT_SECRET
- JWT_EXPIRES_IN
- COOKIE_NAME

No incluir secretos reales.

### F. package.json / tests

Revisar si `npm test` falla porque falta Jest/Supertest.

Opciones:

1. Instalar `jest` y `supertest` como devDependencies y agregar test mínimo.
2. Documentar que tests automáticos se implementarán después y evitar script roto.

Preferencia: si es razonable, instalar Jest + Supertest y agregar al menos un test de health básico.

### G. documentación

Actualizar:

- docs/planificacion/05-BASE_DE_DATOS_MYSQL.md
- docs/planificacion/13-FLUJOS_FUNCIONALES.md
- docs/planificacion/17-TAREAS_BACKEND_DETALLADAS.md
- docs/planificacion/27-CHECKPOINTS_TESTING_AUDITORIA.md
- docs/estado-actual.md
- docs/mapa-archivos.md
- docs/changelog-ia.md

Debe quedar explícito:

- `promo` es el tipo técnico en `producto.tipo`.
- `combo_producto` representa componentes de productos tipo promo.
- Promos no tienen stock propio.
- `pedido.numero` se genera luego del insert usando ID.
- Productos ilimitados no se descuentan.
- Modo demo no guarda pedidos reales en base.

### H. OpenSpec

Crear cambio:

- backend-b5-2-schema-seed-alignment

Debe incluir:

- proposal.md
- design.md
- tasks.md
- verify-report.md
- specs si corresponde

## Verificación obligatoria

Ejecutar:

```bash
cd backend
npm run dev
curl http://localhost:3001/api/health
```

Si MySQL Docker está disponible:

1. Recrear base o aplicar schema corregido.
2. Ejecutar schema.sql.
3. Ejecutar seed.sql.
4. Si corresponde, ejecutar indexes.sql.
5. Verificar que hay 24 productos.
6. Verificar que no existe `tipo = 'combo'`.
7. Verificar que existen productos `tipo = 'promo'`.
8. Verificar que promos tienen `stock_limitado = 0` y `stock_actual IS NULL`.
9. Verificar que Pizza sin TACC y Helados palito tienen `stock_actual = 0`.
10. Verificar que pedido.numero acepta NULL.
11. Crear pedido con producto ilimitado y confirmar que no falla por affectedRows 0.
12. Crear pedido con promo y confirmar que descuenta componentes.
13. Cancelar pedido con promo y confirmar que repone componentes.
14. Probar logout si se protegió con Origin.

Consultas sugeridas:

```sql
SELECT tipo, COUNT(*) FROM producto GROUP BY tipo;

SELECT id, nombre, tipo, stock_limitado, stock_actual
FROM producto
WHERE tipo = 'promo';

SELECT nombre, stock_actual
FROM producto
WHERE nombre IN ('Pizza sin TACC', 'Helados palito');

SHOW COLUMNS FROM pedido LIKE 'numero';

SELECT * FROM combo_producto;
```

## Resultado esperado final

Responder con este formato:

```txt
## Resultado B5.2 — Alineación schema/seed/promo/numero/stock ilimitado

Pipeline SDD ejecutado:
- explore:
- propose:
- spec:
- design:
- tasks:
- apply:
- verify:
- archive:

Archivos leídos:
-

Archivos modificados:
-

Archivos creados:
-

Cambios en schema.sql:
-

Cambios en seed.sql:
-

Cambios en pedido.model.js:
-

Cambios auth/logout:
-

Cambios .env.example:
-

Cambios package/tests:
-

Cambios documentación:
-

Cambios OpenSpec:
-

Verificaciones ejecutadas:
-

Resultados:
-

Pendientes:
-

Testing manual requerido:
si/no

Pasos de testing manual:
1.
2.
3.

Auditoría con ChatGPT recomendada:
si

Bloquea avance a B6:
si/no

Veredicto:
-
```

No avances a B6 hasta que Marcos revise y apruebe.
```

---

# Testing manual después de B5.2

Después de ejecutar la etapa, Marcos debe probar:

## 1. Health

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/backend
npm run dev
curl http://localhost:3001/api/health
```

## 2. Base limpia

Si se quiere probar desde cero:

```sql
DROP DATABASE IF EXISTS kermingo;
CREATE DATABASE kermingo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kermingo;
SOURCE backend/src/api/database/schema.sql;
SOURCE backend/src/api/database/seed.sql;
SOURCE backend/src/api/database/indexes.sql;
```

## 3. Verificaciones SQL

```sql
SELECT tipo, COUNT(*) FROM producto GROUP BY tipo;

SELECT id, nombre, tipo, stock_limitado, stock_actual
FROM producto
WHERE tipo = 'promo';

SELECT nombre, stock_actual
FROM producto
WHERE nombre IN ('Pizza sin TACC', 'Helados palito');

SHOW COLUMNS FROM pedido LIKE 'numero';

SELECT * FROM combo_producto;
```

Resultados esperados:

```txt
No debe existir tipo combo.
Debe existir tipo promo.
Promos con stock_limitado = 0.
Promos con stock_actual = NULL.
Pizza sin TACC stock_actual = 0.
Helados palito stock_actual = 0.
pedido.numero permite NULL.
combo_producto tiene componentes.
```

## 4. Flujo pedido con producto ilimitado

Crear pedido con producto `stock_limitado = 0`.

Debe:

```txt
crearse correctamente
no intentar descontar stock
no fallar por affectedRows = 0
```

## 5. Flujo pedido con promo

Crear pedido con promo.

Debe:

```txt
registrar la promo en pedido_detalle
descontar componentes
no descontar stock propio de la promo
```

## 6. Cancelación de pedido con promo

Cancelar pedido.

Debe:

```txt
estado_pedido = cancelado
reponer componentes
no tocar stock propio de la promo
```

## 7. ZIP de auditoría

Generar:

```bash
bash scripts/crear_zip_auditoria.sh
```

Verificar que no incluya:

```txt
.env
.env.local
credentials/
drive-credentials.json
node_modules/
.next/
```

---

# Prompt de auditoría posterior con ChatGPT

Después de B5.2, pasar ZIP y usar este prompt:

```txt
Sos arquitecto de software senior y QA técnico. Te paso el ZIP actualizado de Kermingo después de B5.2.

Auditá específicamente si quedaron corregidos:

1. schema.sql usa producto.tipo ENUM('comida','bebida','promo'), no combo.
2. seed.sql usa tipo promo, no combo.
3. Las promos tienen stock_limitado = 0 y stock_actual = NULL.
4. Pizza sin TACC y Helados palito arrancan con stock_actual = 0.
5. pedido.numero permite NULL y sigue siendo UNIQUE.
6. El modelo de pedidos puede insertar pedido sin número y luego actualizar KMG-0001.
7. Los índices no están duplicados entre schema.sql e indexes.sql.
8. backend/.env.example existe y no tiene secretos reales.
9. npm test no está roto por falta de dependencias, o quedó documentado.
10. pedido.model.js no intenta descontar stock de productos ilimitados.
11. Las promos descuentan componentes y no stock propio.
12. La cancelación de promos repone componentes.
13. Logout está protegido con Origin/Referer o documentado.
14. La documentación y OpenSpec quedaron alineados.

Decime si ya puedo avanzar a B6 — Caja, Cocina, Comprobantes y Reportes.
```

---

# Criterio para avanzar a B6

Se puede avanzar a B6 solo si:

```txt
- schema, seed y código usan promo de forma consistente.
- pedido.numero permite NULL.
- productos ilimitados no fallan en descuento.
- promos descuentan componentes.
- cancelación repone componentes.
- indexes están ordenados/documentados.
- .env.example existe.
- no hay .env en ZIP de auditoría.
- testing manual mínimo pasó.
- auditoría post-B5.2 no detecta bloqueantes.
```
