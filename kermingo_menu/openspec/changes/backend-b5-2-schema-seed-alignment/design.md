# Diseño Técnico: Alineación de Schema, Seed y Lógica de Negocio

Este documento detalla el diseño técnico, incluyendo las consultas DDL, la lógica de negocio modificada y la configuración de seguridad del backend para Kermingo.

---

## 1. Cambios en Base de Datos (DDL y DML)

### 1.1 Consultas de Migración DDL
Para bases de datos existentes, se deben ejecutar las siguientes consultas de migración:

```sql
-- 1. Actualizar productos existentes de tipo 'combo' a 'promo' para evitar errores de restricción
UPDATE producto SET tipo = 'promo' WHERE tipo = 'combo';

-- 2. Modificar el tipo ENUM de producto en la tabla producto
ALTER TABLE producto MODIFY COLUMN tipo ENUM('comida', 'bebida', 'promo') NOT NULL;

-- 3. Modificar la columna numero en la tabla pedido para admitir valores nulos
ALTER TABLE pedido MODIFY COLUMN numero VARCHAR(20) NULL UNIQUE;
```

### 1.2 Depuración de Índices Duplicados (`schema.sql` & `indexes.sql`)
- Los índices explícitos creados al final de `schema.sql` se eliminan para evitar redundancias de definición.
- `indexes.sql` mantiene la definición de todos los índices de optimización. La idempotencia en `indexes.sql` se maneja a través de la política del proyecto (los errores por índices ya existentes al re-ejecutar el script son inocuos y se ignoran).

---

## 2. Lógica de Actualización de Stock en `pedido.model.js`

### 2.1 Creación de Pedido (`createWithTransaction`)
Se modifica el flujo para evitar actualizar el stock de productos ilimitados.

**Cambios clave:**
1. Mover la declaración del mapa de stock al ámbito externo de la validación.
2. Comprobar `stock_limitado` antes de intentar el descuento.

```javascript
// ...
const idsRequeridos = [...requerimientos.keys()].sort((a, b) => a - b);
let stockMap = new Map(); // Declarado fuera para visibilidad
if (idsRequeridos.length > 0) {
  const placeholders = idsRequeridos.map(() => '?').join(',');
  const [stockRows] = await conn.query(
    `SELECT id, nombre, stock_limitado, stock_actual FROM producto WHERE id IN (${placeholders}) FOR UPDATE`,
    idsRequeridos
  );

  stockMap = new Map(stockRows.map((r) => [r.id, r]));

  for (const id of idsRequeridos) {
    const producto = stockMap.get(id);
    if (!producto) throw new Error(`Producto ${id} no encontrado`);
    const necesario = requerimientos.get(id);
    if (producto.stock_limitado && producto.stock_actual < necesario) {
      throw new Error(
        `Stock insuficiente de "${producto.nombre}". Necesario: ${necesario}, disponible: ${producto.stock_actual}`
      );
    }
  }
}
// ...
// 7. Descontar stock acumulado con UPDATE defensivo
for (const [productoId, cantidad] of requerimientos) {
  const prod = stockMap.get(productoId);
  if (!prod || !prod.stock_limitado) {
    continue; // Saltar productos ilimitados
  }
  const [result] = await conn.query(
    'UPDATE producto SET stock_actual = stock_actual - ? WHERE id = ? AND stock_limitado = 1 AND stock_actual >= ?',
    [amount, productoId, amount]
  );
  if (result.affectedRows === 0) {
    throw new Error(`Stock insuficiente de "${prod.nombre || productoId}" al descontar`);
  }
}
```

### 2.2 Cancelación de Pedido (`cancelWithTransaction`)
Para prevenir deadlocks, los bloqueos de productos durante la reposición de stock se realizarán en orden determinista de IDs de producto.

**Flujo lógico de `cancelWithTransaction`:**
1. Consultar el detalle del pedido (sin bloqueo de fila en `producto` para evitar bloqueos desordenados).
2. Agrupar las cantidades a reponer por producto.
3. Obtener la lista de IDs únicos a reponer y ordenarlos de menor a mayor.
4. Bloquear los registros correspondientes en la tabla `producto` con `SELECT ... FOR UPDATE` usando el orden ordenado.
5. Reponer el stock únicamente si el producto tiene `stock_limitado = 1`.

**Implementación del código:**
```javascript
export async function cancelWithTransaction(pool, id) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [pedRows] = await conn.query(
      "SELECT id, estado_pedido FROM pedido WHERE id = ? FOR UPDATE", [id]
    );
    const pedido = pedRows[0];
    if (!pedido) {
      await conn.rollback();
      return 0;
    }
    if (!['recibido', 'en_preparacion'].includes(pedido.estado_pedido)) {
      await conn.rollback();
      return -1;
    }

    // Consulta sin bloqueo FOR UPDATE en producto en la consulta del join
    const [detalles] = await conn.query(
      `SELECT pd.producto_id, pd.cantidad, p.tipo
       FROM pedido_detalle pd
       JOIN producto p ON p.id = pd.producto_id
       WHERE pd.pedido_id = ?`,
      [id]
    );

    const reposiciones = new Map();

    for (const d of detalles) {
      if (d.tipo === 'promo') {
        const [comps] = await conn.query(
          'SELECT producto_id, cantidad FROM combo_producto WHERE combo_id = ?',
          [d.producto_id]
        );
        for (const comp of comps) {
          const total = comp.cantidad * d.cantidad;
          reposiciones.set(comp.producto_id, (reposiciones.get(comp.producto_id) || 0) + total);
        }
      } else {
        reposiciones.set(d.producto_id, (reposiciones.get(d.producto_id) || 0) + d.cantidad);
      }
    }

    // 1. Ordenar IDs de forma determinista
    const idsAReponer = [...reposiciones.keys()].sort((a, b) => a - b);
    let stockMap = new Map();
    if (idsAReponer.length > 0) {
      const placeholders = idsAReponer.map(() => '?').join(',');
      // 2. Bloquear en orden determinista
      const [stockRows] = await conn.query(
        `SELECT id, stock_limitado FROM producto WHERE id IN (${placeholders}) FOR UPDATE`,
        idsAReponer
      );
      stockMap = new Map(stockRows.map((r) => [r.id, r]));
    }

    // 3. Ejecutar actualizaciones defensivas omitiendo productos ilimitados
    for (const [productoId, cantidad] of reposiciones) {
      const prod = stockMap.get(productoId);
      if (!prod || !prod.stock_limitado) {
        continue; // Omitir ilimitados
      }
      await conn.query(
        'UPDATE producto SET stock_actual = stock_actual + ? WHERE id = ? AND stock_limitado = 1',
        [cantidad, productoId]
      );
    }

    const [updateResult] = await conn.query(
      "UPDATE pedido SET estado_pedido = 'cancelado' WHERE id = ?",
      [id]
    );

    await conn.commit();
    return updateResult.affectedRows;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
```

---

## 3. Composición de Middleware en Rutas de Autenticación

En `backend/src/api/routes/auth.routes.js`, se incluye el middleware `requireTrustedOrigin` en la ruta `/logout`:

```javascript
import { requireTrustedOrigin } from '../middlewares/origin.middleware.js';

// ...
router.post('/logout', requireTrustedOrigin, logout);
```

- **Gestión de conexiones de base de datos:** No se requieren cambios en `db.js`. El pool maneja correctamente la liberación de conexiones mediante el bloque `finally` con `conn.release()`.

---

## 4. Estructura de Entorno y Configuración de Testing

### 4.1 Ejemplo de Entorno (`.env.example`)
Se definirá el archivo `.env.example` en `backend/` con las siguientes variables por defecto:

```ini
PORT=3001
NODE_ENV=development
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

### 4.2 Configuración del Harness de Pruebas
1. **Dependencias:** Instalar `jest` y `supertest` como `devDependencies` en `backend/package.json`.
2. **Script `npm test`:** Ejecutar Jest utilizando soporte experimental de módulos ES:
   ```json
   "test": "node --experimental-vm-modules node_modules/.bin/jest"
   ```
3. **Prueba de integración de salud (`backend/tests/health.test.js`):**
   ```javascript
   import request from 'supertest';
   import app from '../src/app.js';

   describe('GET /api/health', () => {
     it('debería retornar 200 y estado ok', async () => {
       const res = await request(app).get('/api/health');
       expect(res.statusCode).toEqual(200);
       expect(res.body.status).toEqual('success');
       expect(res.body.data.status).toEqual('ok');
     });
   });
   ```
