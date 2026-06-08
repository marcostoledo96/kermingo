# Exploración: Alineación de Schema, Seed, Promos, Número de Pedido y Stock Ilimitado

Este reporte documenta los hallazgos y el estado actual del backend de Kermingo respecto a la desalineación detectada entre el código, el esquema de base de datos (`schema.sql`), los datos iniciales (`seed.sql`), el control de stock y los scripts de prueba.

---

## 1. Definiciones de Schema (`schema.sql`)

### Producto Tipo (`producto.tipo`)
- **Estado Actual:** `tipo ENUM('comida', 'bebida', 'combo') NOT NULL` en [schema.sql:L41](file:///home/marcos/Escritorio/Kermingo/kermingo_menu/backend/src/api/database/schema.sql#L41).
- **Problema:** El código de validación Zod (`backend/src/api/schemas/producto.schema.js`) y la lógica de negocio en `pedido.model.js` esperan el tipo `'promo'`.
- **Riesgo:** Inserciones fallidas de productos de tipo `promo` en bases de datos MySQL reales debido a la restricción del ENUM.

### Número de Pedido (`pedido.numero`)
- **Estado Actual:** `numero VARCHAR(20) NOT NULL UNIQUE` en [schema.sql:L75](file:///home/marcos/Escritorio/Kermingo/kermingo_menu/backend/src/api/database/schema.sql#L75).
- **Problema:** El modelo de pedidos [pedido.model.js:L120-146](file:///home/marcos/Escritorio/Kermingo/kermingo_menu/backend/src/api/models/pedido.model.js#L120-146) inserta el registro del pedido omitiendo el campo `numero` (que tomaría el valor `NULL` por defecto), y luego de obtener el `insertId` ejecuta un `UPDATE` para establecer `KMG-XXXX`.
- **Riesgo:** El `INSERT` inicial falla de inmediato en MySQL porque `numero` no permite valores `NULL` y no tiene un valor por defecto.

---

## 2. Datos Iniciales (`seed.sql`)

- **Estado de Promos/Combos:** Los registros para `Combo merienda` y `Combo cena` usan `tipo = 'combo'`, `stock_limitado = 1` y `stock_actual = 10` en [seed.sql:L45-46](file:///home/marcos/Escritorio/Kermingo/kermingo_menu/backend/src/api/database/seed.sql#L45-46).
- **Problema:** Los combos/promos no deben poseer stock propio; su disponibilidad y stock se calculan en base a sus componentes definidos en `combo_producto`. Su tipo técnico debe ser `'promo'`, con `stock_limitado = 0` y `stock_actual = NULL`.
- **Estado de Stock Inicial Agotado:**
  - `Pizza sin TACC` (ID 4) arranca con `stock_actual = 8`.
  - `Helados palito` (ID 14) arranca con `stock_actual = 15`.
- **Problema:** Deben arrancar agotados (`stock_actual = 0`) para probar correctamente el flujo de falta de stock en el checkout.

---

## 3. Lógica de Descuento de Stock (`pedido.model.js`)

- **Estado Actual:** La función `createWithTransaction` calcula los requerimientos acumulados de productos (incluyendo componentes de promos) y luego ejecuta el descuento defensivo en [pedido.model.js:L160-169](file:///home/marcos/Escritorio/Kermingo/kermingo_menu/backend/src/api/models/pedido.model.js#L160-169):
  ```javascript
  const [result] = await conn.query(
    'UPDATE producto SET stock_actual = stock_actual - ? WHERE id = ? AND stock_limitado = 1 AND stock_actual >= ?',
    [cantidad, productoId, cantidad]
  );
  if (result.affectedRows === 0) { ... throw new Error(...) }
  ```
- **Problema:** Si el producto no es limitado (`stock_limitado = 0`), la condición `AND stock_limitado = 1` hace que no se modifique ninguna fila. Esto resulta en `result.affectedRows === 0`, disparando erróneamente una excepción de "Stock insuficiente" para productos ilimitados (como Agua mineral o Mate cocido).

---

## 4. Índices Duplicados

- **Estado Actual:**
  - `schema.sql` define los mismos índices en [schema.sql:L119-125](file:///home/marcos/Escritorio/Kermingo/kermingo_menu/backend/src/api/database/schema.sql#L119-125) que `indexes.sql` en [indexes.sql:L9-15](file:///home/marcos/Escritorio/Kermingo/kermingo_menu/backend/src/api/database/indexes.sql#L9-15).
  - `indexes.sql` define dos índices adicionales: `idx_producto_categoria_categoria` y `idx_pedido_detalle_pedido`.
- **Problema:** Duplicación redundante. Al correr los dos archivos en secuencia, se intentará recrear índices ya existentes, lo que puede causar fallas o sobrecargar el catálogo de MySQL si no se controlan adecuadamente.

---

## 5. Protección de la Ruta de Logout (`auth.routes.js`)

- **Estado Actual:** La ruta `POST /api/auth/logout` está definida como `router.post('/logout', logout);` en [auth.routes.js:L10](file:///home/marcos/Escritorio/Kermingo/kermingo_menu/backend/src/api/routes/auth.routes.js#L10).
- **Problema:** Carece del middleware `requireTrustedOrigin`, lo que la deja vulnerable a CSRF. Un sitio malicioso podría forzar el cierre de sesión del administrador mediante un simple POST cross-site si el navegador envía las cookies automáticas.

---

## 6. Scripts de Pruebas y Dependencias (`package.json`)

- **Estado Actual:** El script `"test": "node --experimental-vm-modules node_modules/.bin/jest"` está presente, pero no existen dependencias de pruebas (`jest`, `supertest`) en `devDependencies` ni archivos de prueba reales.
- **Problema:** Intentar ejecutar `npm test` resulta en un error de comando no encontrado o módulo faltante.
