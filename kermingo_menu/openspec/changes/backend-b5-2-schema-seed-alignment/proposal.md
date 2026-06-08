# Propuesta: Alineación de Schema, Seed, Promos, Número de Pedido y Stock Ilimitado

Esta propuesta detalla los cambios sugeridos para resolver los hallazgos de desalineación en el backend y la base de datos de Kermingo, asegurando un comportamiento correcto y seguro antes de avanzar a la etapa B6.

---

## 1. Alineación de Base de Datos y Datos Semilla

### A. Corrección en `schema.sql`
- **Cambio en tipo de producto:** Cambiar el ENUM de `producto.tipo` a `ENUM('comida', 'bebida', 'promo')` y actualizar la documentación/comentarios SQL relacionados.
- **Cambio en número de pedido:** Modificar `pedido.numero` a `VARCHAR(20) NULL UNIQUE`. Esto permitirá el flujo transaccional actual: insertar el pedido vacío (`numero` temporalmente `NULL`), recuperar su `insertId`, y luego generar y guardar el valor `KMG-XXXX`.
- **Ubicación:** `backend/src/api/database/schema.sql`.

### B. Corrección en `seed.sql`
- **Promos (`Combo merienda` y `Combo cena`):**
  - Cambiar su tipo a `'promo'` (reemplazando `'combo'`).
  - Establecer `stock_limitado = 0` y `stock_actual = NULL`, ya que las promociones no controlan stock por sí mismas.
- **Productos Agotados:**
  - Establecer `stock_actual = 0` para `Pizza sin TACC` (ID 4) y `Helados palito` (ID 14).
- **Relaciones y comentarios:** Cambiar las referencias y comentarios que mencionan "Combos" a "Promos/Combos" o "Promos". La tabla de relaciones `combo_producto` se mantendrá intacta por razones de estabilidad técnica (representando componentes de promos).
- **Ubicación:** `backend/src/api/database/seed.sql`.

### C. Resolución de Índices Duplicados
- **Estrategia:** Eliminar los índices duplicados definidos explícitamente al final de `schema.sql` y dejarlos **únicamente** en `indexes.sql` para seguir una separación de responsabilidades clara:
  - `schema.sql`: Creación de la estructura de tablas y restricciones (PK, FK, UNIQUE).
  - `seed.sql`: Carga de datos base.
  - `indexes.sql`: Creación de índices adicionales de consulta y optimización de rendimiento.
- **Ubicación:** `backend/src/api/database/schema.sql`.

---

## 2. Ajuste en Lógica de Negocio y Seguridad

### A. Descuento de Stock en `pedido.model.js`
- **Cambio en descuento defensivo:** Modificar el bucle de descuento de stock de modo que se salte la actualización si el producto es ilimitado (`stock_limitado = 0`).
  - Utilizaremos el `stockMap` ya cargado en memoria (que contiene `stock_limitado`) para verificar el estado de cada producto.
  - Solo realizaremos la consulta `UPDATE` y la comprobación de `affectedRows === 0` en aquellos productos donde `stock_limitado === 1`.
- **Mejora contra Deadlocks en Cancelaciones:** En la función `cancelWithTransaction`, se ordenarán los IDs a reponer de forma determinística (`sort()`) y se bloquearán con `SELECT FOR UPDATE` antes de ejecutar la reposición, tal como se hace en la creación de pedidos.
- **Ubicación:** `backend/src/api/models/pedido.model.js`.

### B. Protección CSRF en Logout
- **Estrategia:** Proteger la ruta `POST /api/auth/logout` aplicando el middleware `requireTrustedOrigin`. Esto evita ataques CSRF de cierre de sesión forzado.
- **Ubicación:** `backend/src/api/routes/auth.routes.js`.

---

## 3. Entorno y Pruebas Unitarias

### A. Archivo de Configuración de Entorno
- **Estrategia:** Crear el archivo `.env.example` en la raíz del backend con variables esenciales (DB, puerto, URL de frontend, JWT). Asegurar que la herramienta de empaquetado de auditoría no incluya archivos `.env` reales.
- **Ubicación:** `backend/.env.example`.

### B. Dependencias de Testing
- **Estrategia:** Instalar `jest` y `supertest` como `devDependencies` en `backend/package.json`.
- **Escribir Prueba Base:** Crear `backend/tests/health.test.js` para realizar una prueba básica de `/api/health` usando `supertest` y Jest, asegurando que `npm test` funcione correctamente y no falle por falta de módulos.
- **Ubicaciones:** `backend/package.json` y `backend/tests/health.test.js`.

---

## 4. Cambios de Código Propuestos (Diffs)

### A. `backend/src/api/database/schema.sql`
```diff
@@ -38,3 +38,3 @@
     precio DECIMAL(10,2) NOT NULL,
-    tipo ENUM('comida', 'bebida', 'combo') NOT NULL,
+    tipo ENUM('comida', 'bebida', 'promo') NOT NULL,
     stock_limitado TINYINT(1) NOT NULL DEFAULT 1,
@@ -72,3 +72,3 @@
 CREATE TABLE IF NOT EXISTS pedido (
     id INT AUTO_INCREMENT PRIMARY KEY,
-    numero VARCHAR(20) NOT NULL UNIQUE,
+    numero VARCHAR(20) NULL UNIQUE,
     token_seguimiento VARCHAR(100) NOT NULL UNIQUE,
@@ -115,12 +115,2 @@
 -- ============================================
--- Índices
--- ============================================
-
-CREATE INDEX idx_producto_activo ON producto(activo);
-CREATE INDEX idx_pedido_numero ON pedido(numero);
-CREATE INDEX idx_pedido_token ON pedido(token_seguimiento);
-CREATE INDEX idx_pedido_estado_pedido ON pedido(estado_pedido);
-CREATE INDEX idx_pedido_estado_pago ON pedido(estado_pago);
-CREATE INDEX idx_pedido_metodo_pago ON pedido(metodo_pago);
-CREATE INDEX idx_pedido_created_at ON pedido(created_at);
```

### B. `backend/src/api/database/seed.sql`
```diff
@@ -31,3 +31,3 @@
 -- Productos — Merienda y Cena
-(14, 'Helados palito',     'Variedad de gustos. Sujeto a disponibilidad.',                    2000, 'comida', 1, 15, 3, 1),
+(14, 'Helados palito',     'Variedad de gustos. Sujeto a disponibilidad.',                    2000, 'comida', 1, 0,  3, 1),
 
@@ -44,4 +44,4 @@
--- Combos
-(23, 'Combo merienda',     '3 medialunas + café o mate cocido.',                              3500, 'combo', 1, 10, 3, 1),
-(24, 'Combo cena',         'Pancho + porción de pizza + gaseosa.',                            6500, 'combo', 1, 10, 3, 1);
+-- Promos
+(23, 'Combo merienda',     '3 medialunas + café o mate cocido.',                              3500, 'promo', 0, NULL, 3, 1),
+(24, 'Combo cena',         'Pancho + porción de pizza + gaseosa.',                            6500, 'promo', 0, NULL, 3, 1);
```

### C. `backend/src/api/models/pedido.model.js`
```diff
@@ -91,2 +91,3 @@
     const idsRequeridos = [...requerimientos.keys()].sort((a, b) => a - b);
+    let stockMap = new Map();
     if (idsRequeridos.length > 0) {
@@ -98,3 +99,3 @@
 
-      const stockMap = new Map(stockRows.map((r) => [r.id, r]));
+      stockMap = new Map(stockRows.map((r) => [r.id, r]));
 
@@ -159,10 +160,14 @@
     // 7. Descontar stock acumulado con UPDATE defensivo
     for (const [productoId, cantidad] of requerimientos) {
+      const prod = stockMap.get(productoId);
+      if (!prod || !prod.stock_limitado) {
+        continue; // Saltar productos ilimitados
+      }
       const [result] = await conn.query(
         'UPDATE producto SET stock_actual = stock_actual - ? WHERE id = ? AND stock_limitado = 1 AND stock_actual >= ?',
         [cantidad, productoId, cantidad]
       );
       if (result.affectedRows === 0) {
-        const [[prod]] = await conn.query('SELECT nombre FROM producto WHERE id = ?', [productoId]);
-        throw new Error(`Stock insuficiente de "${prod?.nombre || productoId}" al descontar`);
+        throw new Error(`Stock insuficiente de "${prod.nombre || productoId}" al descontar`);
       }
     }
```

### D. `backend/src/api/routes/auth.routes.js`
```diff
@@ -4,2 +4,3 @@
 import { requireAdmin } from '../middlewares/admin.middleware.js';
+import { requireTrustedOrigin } from '../middlewares/origin.middleware.js';
 import { login, logout, me } from '../controllers/auth.controller.js';
@@ -9,3 +10,3 @@
 router.post('/login', validateBody(loginSchema), login);
-router.post('/logout', logout);
+router.post('/logout', requireTrustedOrigin, logout);
 router.get('/me', requireAdmin, me);
```
