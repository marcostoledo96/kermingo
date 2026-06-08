# 33 — Auditoría B5.2 Post-subagente y Plan de Remediación

## Contexto

Kermingo es el backend de un evento scout recaudatorio del 20 de junio de 2026.

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

La etapa auditada es:

```txt
B5.2 — Alineación schema/seed/promo/numero/stock ilimitado
```

Esta etapa se ejecutó después de B5.1, donde se habían corregido problemas importantes de validación, seguridad y stock.

## Conclusión ejecutiva

B5.2 corrigió varios puntos importantes, pero todavía **NO está lista para avanzar a B6 — Caja, Cocina, Comprobantes y Reportes**.

El subagente aplicó parte de los cambios pedidos, pero también introdujo regresiones y cambios no solicitados.

## Veredicto corto

```txt
Estado actual: NO listo para B6
Siguiente etapa necesaria: B5.2.1 — Remediación de regresiones post-subagente
Motivo principal: se corrigió promo/numero/stock, pero se perdieron defensas SQL y se cambiaron dependencias sin justificación
```

---

# 1. Validación de regresiones reportadas

## R1 — charset/collation perdido

### Estado

✅ **CONFIRMADA**

### Archivo

```txt
backend/src/api/database/schema.sql
```

### Evidencia

Las tablas terminan con:

```sql
);
```

y no incluyen:

```sql
DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

### Severidad real

```txt
ALTA
```

### Justificación

El seed y los datos reales del evento contienen textos en español con tildes y caracteres especiales, por ejemplo:

```txt
jamón
recién
Té
Café
celíacos
```

Si Railway/MySQL local crea la base con `utf8mb4` por default, puede no explotar. Pero si el servidor usa otro charset/collation, puede haber datos corruptos o inserts fallidos.

Para un sistema con datos en español y fecha real de uso, no es aceptable depender del default del servidor.

### Fix recomendado

Restaurar en todas las tablas:

```sql
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## R2 — CHECK constraints perdidos

### Estado

✅ **CONFIRMADA**

### Archivo

```txt
backend/src/api/database/schema.sql
```

### Evidencia

No aparecen constraints como:

```sql
CHECK (precio >= 0)
CHECK (stock_actual IS NULL OR stock_actual >= 0)
CHECK (cantidad > 0)
CHECK (total >= 0)
CHECK (subtotal >= 0)
CHECK (tamanio_bytes > 0)
```

### Severidad real

```txt
MEDIA-ALTA
```

### Justificación

La app valida con Zod, pero la base de datos debe funcionar como última línea de defensa.

Sin estos `CHECK`, un bug futuro, script manual o endpoint nuevo puede insertar:

```txt
precio negativo
cantidad negativa
stock negativo
subtotal negativo
total negativo
tamaño de archivo inválido
```

En MySQL 8.0.16+ los `CHECK` sí se aplican, por lo que perderlos es una regresión real.

### Fix recomendado

Restaurar constraints básicos:

```sql
CONSTRAINT chk_producto_precio CHECK (precio >= 0),
CONSTRAINT chk_producto_stock_actual CHECK (stock_actual IS NULL OR stock_actual >= 0),
CONSTRAINT chk_producto_stock_minimo CHECK (stock_minimo_alerta >= 0)
```

También en:

```txt
archivo_drive
combo_producto
pedido
pedido_detalle
```

---

## R3 — FK nombrada cambiada a FK simple

### Estado

✅ **CONFIRMADA PARCIALMENTE**

### Archivo

```txt
backend/src/api/database/schema.sql
```

### Evidencia

Algunas foreign keys quedaron anónimas, por ejemplo:

```sql
FOREIGN KEY (comprobante_archivo_id) REFERENCES archivo_drive(id)
```

en vez de:

```sql
CONSTRAINT fk_pedido_comprobante
  FOREIGN KEY (comprobante_archivo_id) REFERENCES archivo_drive(id)
```

### Severidad real

```txt
BAJA
```

### Justificación

No rompe funcionalidad, pero empeora el debugging, las migraciones y la claridad de errores MySQL.

### Fix recomendado

Nombrar al menos las foreign keys importantes:

```sql
CONSTRAINT fk_pedido_comprobante
  FOREIGN KEY (comprobante_archivo_id) REFERENCES archivo_drive(id)
```

---

## R4 — CHECK `chk_pedido_comprobante_efectivo` perdido

### Estado

✅ **CONFIRMADA**

### Archivo

```txt
backend/src/api/database/schema.sql
```

### Evidencia

La tabla `pedido` permite:

```sql
metodo_pago ENUM('transferencia', 'efectivo') NOT NULL,
comprobante_archivo_id INT NULL
```

pero ya no tiene una restricción que impida:

```txt
metodo_pago = efectivo
comprobante_archivo_id != NULL
```

### Severidad real

```txt
MEDIA
```

### Justificación

La regla funcional es clara:

```txt
Efectivo no tiene comprobante.
Transferencia puede tener comprobante.
```

El backend puede validarlo, pero la DB debería impedir inconsistencias básicas.

### Fix recomendado

Restaurar:

```sql
CONSTRAINT chk_pedido_comprobante_efectivo CHECK (
  metodo_pago <> 'efectivo' OR comprobante_archivo_id IS NULL
)
```

No conviene hacer obligatorio el comprobante para toda transferencia en DB porque caja rápida puede validar una transferencia manualmente sin archivo.

---

## R5 — seed.sql cambió bcrypt hash del admin

### Estado

✅ **CONFIRMADA**

### Archivo

```txt
backend/src/api/database/seed.sql
backend/scripts/fix-admin-hash.js
```

### Evidencia

El seed actual usa un hash conocido de `password`:

```sql
$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
```

Además se creó un script workaround:

```txt
backend/scripts/fix-admin-hash.js
```

que genera un hash para `admin123`.

### Severidad real

```txt
ALTA
```

### Justificación

El login admin por defecto debería funcionar con la contraseña documentada. Si el seed carga otra contraseña, el login admin falla en una base limpia.

El script `fix-admin-hash.js` no debería ser necesario si el seed está bien.

### Fix recomendado

Corregir `seed.sql` para que el admin tenga hash válido de `admin123`.

Opción recomendada:

```bash
node -e "import bcrypt from 'bcrypt'; console.log(await bcrypt.hash('admin123', 10));"
```

Copiar ese hash al seed.

No usar contraseña plana.

---

## R6 — package.json hizo downgrade de dependencias

### Estado

✅ **CONFIRMADA**

### Archivo

```txt
backend/package.json
```

### Evidencia

El package quedó con:

```json
"bcrypt": "^5.1.1",
"jsonwebtoken": "^9.0.2",
"zod": "^3.23.8"
```

cuando antes se venían usando versiones más nuevas.

### Severidad real

```txt
MEDIA-ALTA
```

### Justificación

Cambiar versiones centrales en una etapa que solo debía alinear schema/seed/stock es arbitrario.

Riesgos:

```txt
Zod 4 → Zod 3 puede afectar validaciones.
bcrypt 6 → bcrypt 5 cambia versión mayor.
jsonwebtoken bajó de versión menor.
```

Aunque no siempre rompa, no fue un cambio pedido ni justificado.

### Fix recomendado

Restaurar versiones previas si funcionaban:

```json
"bcrypt": "^6.0.0",
"jsonwebtoken": "^9.0.3",
"zod": "^4.4.3"
```

Luego ejecutar:

```bash
cd backend
npm install
npm test
```

Si se decide mantener versiones más viejas, debe quedar justificado explícitamente en OpenSpec.

---

## R7 — `stockMap` movido afuera del if

### Estado

❌ **NO ES REGRESIÓN**

### Archivo

```txt
backend/src/api/models/pedido.model.js
```

### Severidad real

```txt
NINGUNA
```

### Justificación

Mover `stockMap` permite reutilizarlo en el descuento para omitir productos ilimitados. No rompe nada.

La regresión real relacionada con stock no es esa, sino que falta `ORDER BY id` en los `SELECT ... FOR UPDATE`.

---

# 2. Regresiones adicionales encontradas

## RA-1 — `SELECT ... FOR UPDATE` no tiene `ORDER BY id`

### Archivo

```txt
backend/src/api/models/pedido.model.js
```

### Descripción

El código ordena IDs en JavaScript:

```js
const idsRequeridos = [...requerimientos.keys()].sort((a, b) => a - b);
```

pero la query no fuerza orden en SQL:

```sql
SELECT id, nombre, stock_limitado, stock_actual
FROM producto
WHERE id IN (...)
FOR UPDATE
```

Lo mismo aplica a cancelación.

### Severidad

```txt
MEDIA-ALTA
```

### Justificación

Ordenar los parámetros ayuda, pero MySQL no está obligado a bloquear filas en ese orden si no hay `ORDER BY`.

Para reducir riesgo de deadlocks, el `ORDER BY id` debe estar dentro del SQL.

### Fix propuesto

```sql
SELECT id, nombre, stock_limitado, stock_actual
FROM producto
WHERE id IN (...)
ORDER BY id
FOR UPDATE
```

Y en cancelación:

```sql
SELECT id, stock_limitado
FROM producto
WHERE id IN (...)
ORDER BY id
FOR UPDATE
```

---

## RA-2 — OpenSpec marca checkpoint manual como no requerido

### Archivo

```txt
openspec/changes/backend-b5-2-schema-seed-alignment/verify-report.md
openspec/changes/backend-b5-2-schema-seed-alignment/archive-report.md
```

### Descripción

La etapa tocó:

```txt
schema
seed
stock
cancelación
logout
dependencias
tests
```

y aun así el reporte indica que no requiere checkpoint manual ni bloquea avance.

### Severidad

```txt
MEDIA
```

### Fix propuesto

Actualizar reportes:

```txt
Checkpoint manual requerido: si
Auditoria con ChatGPT recomendada: si
Bloquea avance a siguiente etapa: si, hasta corregir regresiones detectadas
```

---

## RA-3 — Test agregado solo cubre health, no valida B5.2

### Archivo

```txt
backend/tests/health.test.js
```

### Descripción

El test solo verifica:

```txt
GET /api/health
```

No prueba:

```txt
schema
seed
promo
stock ilimitado
cancelación
logout
pedido.numero
```

### Severidad

```txt
MEDIA
```

### Fix propuesto

Agregar tests mínimos reales o documentar que el test de health solo valida el servidor base.

Tests recomendados:

```txt
producto ilimitado no falla
promo descuenta componentes
cancelación repone componentes
tienda cerrada bloquea pedidos
```

---

## RA-4 — Promos sin componentes podrían venderse sin descontar nada

### Archivo

```txt
backend/src/api/models/pedido.model.js
```

### Descripción

Si un producto tipo `promo` no tiene filas en `combo_producto`, el código no agrega requerimientos y podría venderse sin descontar stock.

### Severidad

```txt
MEDIA
```

### Fix propuesto

Agregar validación:

```js
if (producto.tipo === 'promo') {
  const [compRows] = await conn.query(
    'SELECT producto_id, cantidad FROM combo_producto WHERE combo_id = ?',
    [item.producto_id]
  );

  if (compRows.length === 0) {
    throw new Error(`La promo "${producto.nombre}" no tiene componentes configurados`);
  }

  for (const comp of compRows) {
    const total = comp.cantidad * item.cantidad;
    requerimientos.set(comp.producto_id, (requerimientos.get(comp.producto_id) || 0) + total);
  }
}
```

---

## RA-5 — `indexes.sql` documenta errores como inofensivos

### Archivo

```txt
backend/src/api/database/indexes.sql
```

### Descripción

El archivo puede indicar que si se re-ejecuta y falla por índice existente, el error es inofensivo.

### Severidad

```txt
BAJA-MEDIA
```

### Justificación

No pierde datos, pero en CI/deploy un script que falla no es inofensivo: corta el pipeline.

### Fix propuesto

O hacerlo idempotente, o documentar que es manual y solo se ejecuta en base limpia.

---

## RA-6 — `fix-admin-hash.js` imprime hash generado

### Archivo

```txt
backend/scripts/fix-admin-hash.js
```

### Severidad

```txt
BAJA
```

### Fix propuesto

Si se mantiene el script, no imprimir el hash:

```js
console.log('Admin hash updated.');
```

Preferible: corregir seed y eliminar la necesidad del script.

---

# 3. Validación de cambios buenos

## C1 — `producto.tipo` ahora es `promo`

✅ **BIEN APLICADO**

```sql
tipo ENUM('comida', 'bebida', 'promo') NOT NULL
```

Correcto. Hay que conservar este cambio al restaurar charset/checks.

---

## C2 — `pedido.numero` ahora permite `NULL`

✅ **BIEN APLICADO**

```sql
numero VARCHAR(20) NULL UNIQUE
```

Correcto y alineado con el modelo que primero inserta y luego actualiza el número `KMG-0001`.

---

## C3 — índices duplicados quitados de `schema.sql`

✅ **BIEN APLICADO, PERO INCOMPLETO**

Quedaron separados en:

```txt
backend/src/api/database/indexes.sql
```

Pero el archivo todavía no es idempotente o no está suficientemente protegido contra re-ejecución accidental.

---

## C4 — `seed.sql` usa promos sin stock propio y productos agotados

✅ **BIEN APLICADO**

Debe quedar así:

```txt
Combo merienda → tipo promo, stock_limitado 0, stock_actual NULL
Combo cena → tipo promo, stock_limitado 0, stock_actual NULL
Pizza sin TACC → stock_actual 0
Helados palito → stock_actual 0
```

Correcto.

---

## C5 — `createWithTransaction` omite productos ilimitados en descuento

✅ **BIEN APLICADO**

Debe existir una lógica equivalente a:

```js
if (!prod || !prod.stock_limitado) {
  continue;
}
```

Correcto.

---

## C6 — `cancelWithTransaction` ordena IDs y omite ilimitados

⚠️ **BIEN PERO INCOMPLETO**

Bien:

```txt
ordena ids en JS
omite productos ilimitados
```

Falta:

```sql
ORDER BY id
```

dentro del `SELECT ... FOR UPDATE`.

---

## C7 — `requireTrustedOrigin` aplicado a logout

✅ **BIEN APLICADO**

Correcto si `POST /api/auth/logout` ahora usa `requireTrustedOrigin`.

No hace falta `requireAdmin` si logout solo limpia cookie y Origin está protegido.

---

## C8 — `.env.example` creado

✅ **BIEN APLICADO**

Debe incluir:

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

Correcto si no contiene secretos reales.

---

## C9 — Jest + Supertest agregados y health test creado

✅ **BIEN APLICADO, PERO INSUFICIENTE COMO VERIFICACIÓN DE B5.2**

Correcto como primer test, pero no valida la etapa crítica.

---

# 4. Plan de remediación

## Fix 1 — Restaurar charset/collation en `schema.sql`

- **Acción:** reescribir parcialmente.
- **Archivos:** `backend/src/api/database/schema.sql`

### Cambio exacto

En todas las tablas, usar:

```sql
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Justificación

Garantiza soporte correcto para español, tildes, ñ y caracteres especiales.

### Riesgo

Bajo. En base limpia funciona. En tablas existentes no altera estructura por `IF NOT EXISTS`.

### Verificación

```sql
SHOW TABLE STATUS WHERE Name = 'producto';
SHOW CREATE TABLE producto;
```

---

## Fix 2 — Restaurar CHECK constraints

- **Acción:** reescribir constraints.
- **Archivos:** `backend/src/api/database/schema.sql`

### Snippets recomendados

En `producto`:

```sql
CONSTRAINT chk_producto_precio CHECK (precio >= 0),
CONSTRAINT chk_producto_stock_actual CHECK (stock_actual IS NULL OR stock_actual >= 0),
CONSTRAINT chk_producto_stock_minimo CHECK (stock_minimo_alerta >= 0)
```

En `combo_producto`:

```sql
CONSTRAINT chk_combo_producto_cantidad CHECK (cantidad > 0)
```

En `pedido`:

```sql
CONSTRAINT chk_pedido_total CHECK (total >= 0),
CONSTRAINT chk_pedido_comprobante_efectivo CHECK (
  metodo_pago <> 'efectivo' OR comprobante_archivo_id IS NULL
)
```

En `pedido_detalle`:

```sql
CONSTRAINT chk_pedido_detalle_precio CHECK (precio_unitario >= 0),
CONSTRAINT chk_pedido_detalle_cantidad CHECK (cantidad > 0),
CONSTRAINT chk_pedido_detalle_subtotal CHECK (subtotal >= 0)
```

En `archivo_drive`:

```sql
CONSTRAINT chk_archivo_drive_tamanio CHECK (tamanio_bytes > 0)
```

### Justificación

Defensa en profundidad.

### Riesgo

Medio-bajo. Si el seed tiene datos inválidos, fallará, que es deseable.

### Verificación

Recrear base limpia, correr schema y seed.

---

## Fix 3 — Nombrar FK de comprobante

- **Acción:** reescribir.
- **Archivo:** `backend/src/api/database/schema.sql`

### Cambio exacto

```sql
CONSTRAINT fk_pedido_comprobante
  FOREIGN KEY (comprobante_archivo_id) REFERENCES archivo_drive(id)
```

### Justificación

Mejor debugging y mantenimiento.

### Riesgo

Bajo.

### Verificación

```sql
SHOW CREATE TABLE pedido;
```

---

## Fix 4 — Corregir hash admin del seed

- **Acción:** reescribir seed.
- **Archivo:** `backend/src/api/database/seed.sql`

### Cambio exacto recomendado

Generar hash nuevo de `admin123`:

```bash
node -e "import bcrypt from 'bcrypt'; console.log(await bcrypt.hash('admin123', 10));"
```

Luego pegarlo en:

```sql
INSERT IGNORE INTO usuario (id, nombre, email, contrasenia_hash, activo) VALUES
(1, 'Admin', 'admin@kermingo.com', '<HASH_BCRYPT_VALIDO_DE_ADMIN123>', 1);
```

### Justificación

El login default debe funcionar sin workaround.

### Riesgo

Bajo.

### Verificación

Login con:

```txt
admin@kermingo.com
admin123
```

---

## Fix 5 — Eliminar o dejar local `fix-admin-hash.js`

- **Acción:** eliminar o ajustar.
- **Archivo:** `backend/scripts/fix-admin-hash.js`

### Cambio exacto si se mantiene

```js
console.log('Admin hash updated.');
```

No imprimir el hash.

### Justificación

El seed debe ser la fuente de verdad.

### Riesgo

Bajo.

### Verificación

Confirmar que la documentación no depende del script.

---

## Fix 6 — Revertir downgrades de dependencias

- **Acción:** revertir.
- **Archivo:** `backend/package.json`

### Cambio exacto

```json
"bcrypt": "^6.0.0",
"jsonwebtoken": "^9.0.3",
"zod": "^4.4.3"
```

Luego:

```bash
cd backend
npm install
npm test
```

### Justificación

No había requerimiento para cambiar versiones de librerías centrales.

### Riesgo

Medio. Puede requerir validar compatibilidad de bcrypt/Zod.

### Verificación

```bash
npm install
npm test
npm run dev
```

Y probar login + validaciones.

---

## Fix 7 — Agregar `ORDER BY id` a los `SELECT ... FOR UPDATE`

- **Acción:** reescribir queries.
- **Archivo:** `backend/src/api/models/pedido.model.js`

### Cambio en creación

```js
const [stockRows] = await conn.query(
  `SELECT id, nombre, stock_limitado, stock_actual
   FROM producto
   WHERE id IN (${placeholders})
   ORDER BY id
   FOR UPDATE`,
  idsRequeridos
);
```

### Cambio en cancelación

```js
const [stockRows] = await conn.query(
  `SELECT id, stock_limitado
   FROM producto
   WHERE id IN (${placeholders})
   ORDER BY id
   FOR UPDATE`,
  idsAReponer
);
```

### Justificación

Reduce riesgo de deadlocks.

### Riesgo

Bajo.

### Verificación

Crear y cancelar pedidos con múltiples productos y promos.

---

## Fix 8 — Validar que una promo tenga componentes

- **Acción:** agregar validación.
- **Archivo:** `backend/src/api/models/pedido.model.js`

### Cambio exacto

```js
if (producto.tipo === 'promo') {
  const [compRows] = await conn.query(
    'SELECT producto_id, cantidad FROM combo_producto WHERE combo_id = ?',
    [item.producto_id]
  );

  if (compRows.length === 0) {
    throw new Error(`La promo "${producto.nombre}" no tiene componentes configurados`);
  }

  for (const comp of compRows) {
    const total = comp.cantidad * item.cantidad;
    requerimientos.set(comp.producto_id, (requerimientos.get(comp.producto_id) || 0) + total);
  }
}
```

### Justificación

Evita vender promos sin impacto de stock.

### Riesgo

Bajo.

### Verificación

Crear una promo sin componentes en entorno dev y confirmar que falla.

---

## Fix 9 — Hacer `indexes.sql` idempotente o estrictamente manual

- **Acción:** reescribir o documentar.
- **Archivo:** `backend/src/api/database/indexes.sql`

### Opción ideal

Hacer índices idempotentes usando `information_schema.statistics`.

### Opción aceptable

Cambiar el comentario:

```sql
-- Ejecutar solo en base limpia, después de schema.sql.
-- No incluir este archivo en un pipeline que pueda re-ejecutarse sin limpiar base.
```

### Justificación

Evita falsos verdes o fallos inesperados en deploy/CI.

### Riesgo

Bajo.

### Verificación

Ejecutar en base limpia una vez.

---

## Fix 10 — Corregir reportes OpenSpec

- **Acción:** reescribir documentación.
- **Archivos:**

```txt
openspec/changes/backend-b5-2-schema-seed-alignment/verify-report.md
openspec/changes/backend-b5-2-schema-seed-alignment/archive-report.md
```

### Cambio exacto

```txt
Checkpoint manual requerido: si
Auditoria con ChatGPT recomendada: si
Bloquea avance a siguiente etapa: si, hasta corregir regresiones detectadas
```

### Justificación

El reporte actual no refleja el estado real.

### Riesgo

Ninguno.

### Verificación

Leer docs finales y confirmar que no dicen “listo para B6” sin condiciones.

---

## Fix 11 — Agregar tests mínimos reales de B5.2

- **Acción:** agregar tests.
- **Archivos:** `backend/tests/*.test.js`

### Tests recomendados

```txt
producto ilimitado no falla
promo descuenta componentes
cancelación repone componentes
tienda cerrada bloquea pedidos
```

Si todavía no se quiere usar DB tests, documentar que `health.test.js` no valida B5.2.

### Justificación

B5.2 toca lógica crítica.

### Riesgo

Medio si requiere setup DB en CI.

### Verificación

```bash
cd backend
npm test
```

---

# 5. Orden de aplicación sugerido

1. **Fix 6 — Revertir dependencias**  
   Puede afectar instalación, tests, bcrypt y Zod.

2. **Fix 1, Fix 2, Fix 3 — Restaurar schema robusto**  
   Charset, CHECKs y FK nombradas antes de recrear DB.

3. **Fix 4 — Corregir hash admin en seed**  
   Necesario para login default.

4. **Fix 7 y Fix 8 — Ajustar pedido.model.js**  
   Reducen deadlocks y evitan promos mal configuradas.

5. **Fix 9 — Ajustar indexes.sql**  
   Ordena ejecución SQL.

6. **Fix 10 — Corregir OpenSpec/verify-report**  
   Documenta estado real.

7. **Fix 11 — Tests mínimos o documentación de limitación**  
   Cierra con verificación.

8. **Recrear DB local y probar flujos manuales**  
   No confiar solo en `npm test`.

---

# 6. Prompt para OpenCode — B5.2.1

Copiar este prompt en OpenCode desde la raíz del proyecto.

```txt
Continuemos con Kermingo. La auditoría post-subagente de B5.2 detectó regresiones reales. NO avanzar a B6 todavía.

# Etapa B5.2.1 — Remediación de regresiones post-subagente

Trabajá bajo metodología SDD usando Gentle AI.

No implementar caja, cocina, comprobantes, reportes, frontend ni deploy.

## Objetivo

Corregir regresiones introducidas durante B5.2 sin deshacer los cambios buenos.

Cambios buenos que deben conservarse:
- producto.tipo debe seguir usando `promo`.
- pedido.numero debe seguir permitiendo NULL y UNIQUE.
- seed debe mantener promos con stock_limitado=0 y stock_actual=NULL.
- Pizza sin TACC y Helados palito deben seguir agotados.
- productos ilimitados no deben descontarse.
- logout debe seguir protegido con Origin/Referer.
- .env.example debe existir.

## Leer antes

Leé en este orden:

- AGENTS.md
- docs/planificacion/31-B5_1_FIXES_SEGURIDAD_VALIDACION_STOCK.md
- docs/planificacion/32-B5_2_ALINEACION_SCHEMA_SEED_PROMO_NUMERO_STOCK.md
- docs/planificacion/33-AUDITORIA_B5_2_POST_SUBAGENTE_PLAN_REMEDIACION.md
- backend/src/api/database/schema.sql
- backend/src/api/database/seed.sql
- backend/src/api/database/indexes.sql
- backend/src/api/models/pedido.model.js
- backend/src/api/routes/auth.routes.js
- backend/package.json
- backend/.env.example
- backend/tests/health.test.js
- openspec/changes/backend-b5-2-schema-seed-alignment/

## Cambios requeridos

1. Restaurar `DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` en todas las tablas de schema.sql.
2. Restaurar CHECK constraints para precios, stocks, cantidades, totales, subtotales y tamanio_bytes.
3. Restaurar `chk_pedido_comprobante_efectivo`.
4. Nombrar `fk_pedido_comprobante`.
5. Corregir hash admin del seed para que `admin123` funcione.
6. Eliminar o ajustar `backend/scripts/fix-admin-hash.js` para que no sea workaround obligatorio ni imprima hash.
7. Revertir downgrades injustificados de dependencias:
   - bcrypt ^6.0.0
   - jsonwebtoken ^9.0.3
   - zod ^4.4.3
   Luego ejecutar npm install.
8. Agregar `ORDER BY id` en los SELECT ... FOR UPDATE de creación y cancelación de pedidos.
9. Validar que una promo tenga componentes antes de venderla.
10. Ajustar indexes.sql para que no documente errores como “inofensivos” en pipelines.
11. Corregir verify-report/archive-report de OpenSpec para indicar que esta etapa requería testing manual y auditoría.
12. Agregar tests mínimos reales si es razonable. Si no, documentar explícitamente que health.test.js no valida B5.2.

## Reglas

- No tocar frontend/.
- No tocar diseno-de-landing-kermingo/.
- No cambiar `promo` de vuelta a `combo`.
- No volver `pedido.numero` a NOT NULL.
- No cambiar decisiones funcionales sin preguntar.
- No avanzar a B6.

## Verificación mínima

Ejecutar:

```bash
cd backend
npm install
npm test
npm run dev
curl http://localhost:3001/api/health
```

Si MySQL local está disponible:

1. Recrear base limpia.
2. Ejecutar schema.sql.
3. Ejecutar seed.sql.
4. Ejecutar indexes.sql si corresponde.
5. Verificar que `producto.tipo` no tenga `combo`.
6. Verificar que promos tienen stock_limitado=0 y stock_actual=NULL.
7. Verificar que Pizza sin TACC y Helados palito tienen stock_actual=0.
8. Verificar SHOW CREATE TABLE para charset/checks.
9. Probar login con admin@kermingo.com / admin123.
10. Probar pedido con producto ilimitado.
11. Probar pedido con promo.
12. Probar cancelación de promo.

## Resultado esperado

Responder con:

```txt
## Resultado B5.2.1 — Remediación de regresiones

Pipeline SDD ejecutado:
- explore:
- propose:
- spec:
- design:
- tasks:
- apply:
- verify:
- archive:

Archivos modificados:
-

Cambios en schema.sql:
-

Cambios en seed.sql:
-

Cambios en dependencias:
-

Cambios en pedido.model.js:
-

Cambios en OpenSpec:
-

Cambios en tests:
-

Verificaciones ejecutadas:
-

Resultados:
-

Pendientes:
-

Testing manual requerido:
si

Auditoría con ChatGPT recomendada:
si

Bloquea avance a B6:
si/no

Veredicto:
-
```

No avances a B6 hasta que Marcos apruebe.
```

---

# 7. Testing manual posterior

Después de ejecutar B5.2.1:

## Backend

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/backend
npm install
npm test
npm run dev
curl http://localhost:3001/api/health
```

## Base limpia

```sql
DROP DATABASE IF EXISTS kermingo;
CREATE DATABASE kermingo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kermingo;
SOURCE backend/src/api/database/schema.sql;
SOURCE backend/src/api/database/seed.sql;
SOURCE backend/src/api/database/indexes.sql;
```

## SQL checks

```sql
SELECT tipo, COUNT(*) FROM producto GROUP BY tipo;

SELECT id, nombre, tipo, stock_limitado, stock_actual
FROM producto
WHERE tipo = 'promo';

SELECT nombre, stock_actual
FROM producto
WHERE nombre IN ('Pizza sin TACC', 'Helados palito');

SHOW COLUMNS FROM pedido LIKE 'numero';

SHOW CREATE TABLE producto;
SHOW CREATE TABLE pedido;
```

## Resultados esperados

```txt
No existe tipo combo.
Existe tipo promo.
Promos sin stock propio.
Pizza sin TACC y Helados palito agotados.
pedido.numero permite NULL.
Las tablas usan utf8mb4.
Las CHECK constraints existen.
El admin puede loguear con admin123.
```

---

# 8. Prompt de auditoría posterior con ChatGPT

Después de aplicar B5.2.1, usar este prompt:

```txt
Sos arquitecto de software senior y QA técnico estricto. Te paso el ZIP actualizado de Kermingo después de B5.2.1.

Auditá específicamente si quedaron corregidas estas regresiones:

1. schema.sql recuperó DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci en todas las tablas.
2. schema.sql recuperó CHECK constraints para precios, stocks, cantidades, totales, subtotales y tamanio_bytes.
3. pedido recuperó chk_pedido_comprobante_efectivo.
4. fk_pedido_comprobante está nombrada.
5. seed.sql tiene hash válido para admin123 y no requiere workaround.
6. backend/scripts/fix-admin-hash.js no imprime hash o fue eliminado.
7. package.json no tiene downgrades arbitrarios de bcrypt, zod ni jsonwebtoken.
8. pedido.model.js usa ORDER BY id en SELECT ... FOR UPDATE.
9. pedido.model.js valida que una promo tenga componentes antes de venderla.
10. indexes.sql no documenta fallos como inofensivos en pipeline.
11. OpenSpec no marca falsamente que no requiere testing manual/auditoría.
12. tests son coherentes con lo implementado o la limitación queda documentada.
13. Se conservaron los cambios buenos: promo, numero nullable, promos sin stock propio, productos agotados, productos ilimitados sin descuento y logout con Origin/Referer.

Decime si ya puedo avanzar a B6 — Caja, Cocina, Comprobantes y Reportes.
```

---

# 9. Veredicto final

## Estado actual

```txt
No avanzar a B6 todavía.
```

## Después de aplicar este plan

```txt
Se puede avanzar a B6: sí, con prerrequisitos.
```

## Prerrequisitos para avanzar

```txt
- Recrear base limpia sin errores.
- Correr seed sin errores.
- Confirmar utf8mb4 y CHECK constraints.
- Confirmar login admin con admin123.
- Confirmar pedido normal.
- Confirmar producto ilimitado.
- Confirmar promo.
- Confirmar cancelación de promo.
- Confirmar npm test.
- Confirmar auditoría post-B5.2.1 sin bloqueantes.
```
