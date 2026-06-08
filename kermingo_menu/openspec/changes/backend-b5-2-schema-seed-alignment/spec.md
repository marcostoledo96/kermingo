# Especificación Funcional: Alineación de Schema, Seed y Lógica de Negocio

Este documento detalla las especificaciones funcionales necesarias para corregir las desalineaciones en la base de datos de Kermingo, resolver problemas de concurrencia/deadlocks en el inventario y proteger la ruta de cierre de sesión.

---

## 1. Alineación de Base de Datos y Datos Semilla

### 1.1 Modificaciones en la Estructura (`schema.sql`)
- **Tipo de Producto (`producto.tipo`):**
  - El ENUM de tipos de producto en la tabla `producto` debe cambiar de `'comida', 'bebida', 'combo'` a `'comida', 'bebida', 'promo'`.
  - Todas las referencias documentales y restricciones relacionadas deben actualizarse.
- **Número de Pedido (`pedido.numero`):**
  - La columna `pedido.numero` debe permitir valores `NULL` y mantener su restricción de unicidad: `VARCHAR(20) NULL UNIQUE`.
  - **Razón:** El flujo transaccional requiere insertar primero el pedido con un número temporal `NULL` para obtener el ID incremental (`insertId`), y posteriormente generar el código formateado `KMG-XXXX` y guardarlo.
- **Separación de Índices:**
  - Los índices explícitos creados al final de `schema.sql` deben eliminarse de dicho archivo.
  - La definición de índices debe delegarse exclusivamente a `indexes.sql`.

### 1.2 Datos Semilla (`seed.sql`)
- **Promociones (`Combo merienda` y `Combo cena`):**
  - Modificar su columna `tipo` a `'promo'` (reemplazando `'combo'`).
  - Definir `stock_limitado = 0` y `stock_actual = NULL`, ya que las promociones no controlan stock propio directamente sino a través de sus componentes individuales.
- **Productos Agotados de Inicio:**
  - Establecer `stock_actual = 0` para `Pizza sin TACC` (ID 4) y `Helados palito` (ID 14).
- **Semántica:** Cambiar el comentario `-- Combos` a `-- Promos` para alinear con la nueva nomenclatura.

---

## 2. Ajuste en Lógica de Negocio (Stock y Concurrencia)

### 2.1 Descuento Defensivo de Stock (`createWithTransaction`)
- Si un producto tiene `stock_limitado = 0` (ilimitado), no se debe actualizar su stock en la base de datos ni verificar si la cantidad es suficiente.
- El bucle de descuento en `createWithTransaction` debe consultar el mapa de stock cargado en memoria (`stockMap`) y omitir la actualización de los productos ilimitados.

### 2.1.1 Validación de Promos con Componentes (B5.2.1, fix RA-4)
- Antes de expandir los requerimientos de stock para un item de tipo `promo`, el sistema DEBE verificar que existan filas en `combo_producto` para esa promo.
- Si una promo no tiene componentes configurados, el sistema DEBE lanzar un error claro: `La promo "<nombre>" no tiene componentes configurados en combo_producto`.
- **Justificación:** previene vender promos huérfanas que no impactan stock (rompería el inventario silenciosamente).

### 2.2 Prevención de Deadlocks en Cancelaciones (`cancelWithTransaction`)
- Al cancelar un pedido, los productos cuyas cantidades deben reponerse deben procesarse de manera determinista.
- **Flujo requerido:**
  1. Recopilar las IDs de los productos a reponer.
  2. Ordenar las IDs de forma numérica ascendente (`sort()`).
  3. Ejecutar un bloqueo explícito utilizando `SELECT ... FOR UPDATE` **con `ORDER BY id` dentro del SQL** sobre los productos ordenados antes de aplicar los incrementos de stock.
  4. Omitir el incremento de stock para los productos ilimitados (`stock_limitado = 0`).

### 2.3 Orden Determinista en `createWithTransaction` (B5.2.1, fix RA-1)
- El `SELECT ... FOR UPDATE` que bloquea los productos requeridos para validar stock y descontar DEBE incluir `ORDER BY id` en el SQL (no solo en JavaScript).
- **Justificación:** MySQL no está obligado a bloquear filas en el orden de los placeholders si no hay `ORDER BY`. Sin él, el sort en JS reduce pero no elimina el riesgo de deadlocks.

---

## 3. Seguridad: Protección CSRF en Logout

- La ruta `POST /api/auth/logout` debe ser validada mediante el middleware `requireTrustedOrigin`.
- **Comportamiento esperado:** 
  - Solo se permiten peticiones POST de cierre de sesión si provienen del origen de confianza configurado en `environments.frontendUrl`.
  - Peticiones externas o maliciosas sin el origen/referer permitido serán rechazadas con un error de autenticación (`AuthError`).

---

## 4. Entorno y Pruebas Unitarias

### 4.1 Configuración de Entorno
- Existirá un archivo `backend/.env.example` con la plantilla de variables de entorno requeridas para el funcionamiento local y de producción del backend.

### 4.2 Pruebas Automatizadas
- Se deben incluir `jest` y `supertest` como dependencias de desarrollo (`devDependencies`) en `backend/package.json`.
- El script `npm test` debe estar correctamente configurado.
- Se debe definir un test de salud básico en `backend/tests/health.test.js` que realice una solicitud HTTP `GET /api/health` mediante `supertest` y asegure una respuesta HTTP 200 con un estado `ok`.
