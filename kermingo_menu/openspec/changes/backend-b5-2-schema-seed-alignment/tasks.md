# Tareas: Alineación de Schema, Seed y Lógica de Negocio (B5.2 + B5.2.1)

> **Nota:** El subagente que ejecutó B5.2 en un entorno Antigravity aplicó cambios al working tree sin commitear. Una auditoría posterior con ChatGPT 5.5 (ver `docs/planificacion/33-AUDITORIA_B5_2_POST_SUBAGENTE_PLAN_REMEDIACION.md`) detectó regresiones. Esta lista refleja el estado real luego de la remediación B5.2.1.

## Estado de las Tareas

- `[x]` **1. Base de datos (DDL y Seed)**
  - `[x]` Modificar tipo de producto (`producto.tipo`) a ENUM con `'promo'` en `schema.sql`. *(Existía pre-B5.2, no fue agregado por el subagente.)*
  - `[x]` Modificar columna `pedido.numero` a `VARCHAR(20) NULL UNIQUE` en `schema.sql`. *(Existía pre-B5.2.)*
  - `[x]` Eliminar índices duplicados del bloque de índices en `schema.sql` (delegados a `indexes.sql`).
  - `[x]` Cambiar combos en `seed.sql` a `tipo = 'promo'`, `stock_limitado = 0` y `stock_actual = NULL`. *(Existía pre-B5.2.)*
  - `[x]` Configurar `Pizza sin TACC` (ID 4) y `Helados palito` (ID 14) con `stock_actual = 0` (agotados) en `seed.sql`. *(Existía pre-B5.2.)*
  - `[x]` Reemplazar el comentario `-- Combos` por `-- Promos` en `seed.sql`.
  - `[x]` **B5.2.1**: Mantener `DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` en las 9 tablas (revertido desde el subagente).
  - `[x]` **B5.2.1**: Mantener `CHECK` constraints en `precio`, `stock_actual`, `stock_minimo_alerta`, `tamanio_bytes`, `cantidad`, `total`, `precio_unitario`, `subtotal` (revertidos).
  - `[x]` **B5.2.1**: Mantener `CONSTRAINT chk_pedido_comprobante_efectivo` (revertido).
  - `[x]` **B5.2.1**: Mantener nombres de FKs (`fk_producto_imagen`, `fk_pedido_comprobante`).
  - `[x]` **B5.2.1**: Restaurar hash bcrypt válido para `admin123` en `seed.sql` (el subagente lo había cambiado al hash de `password`).

- `[x]` **2. Lógica de Negocio y Concurrencia**
  - `[x]` Declarar `stockMap` fuera de la validación inicial de stock en `createWithTransaction` (`pedido.model.js`).
  - `[x]` Modificar Paso 7 en `createWithTransaction` para saltar la query de descuento de stock de productos ilimitados (`stock_limitado = 0`).
  - `[x]` Evitar bloqueo `FOR UPDATE` de productos en la consulta join inicial de `cancelWithTransaction` (`pedido.model.js`).
  - `[x]` Recopilar reposiciones, ordenar numéricamente las IDs de los productos reponibles en orden ascendente y realizar bloqueo determinista `FOR UPDATE` en `cancelWithTransaction` para evitar deadlocks.
  - `[x]` Omitir reposición de stock para productos ilimitados en `cancelWithTransaction`.
  - `[x]` **B5.2.1 (fix RA-1)**: Agregar `ORDER BY id` dentro del SQL del `SELECT ... FOR UPDATE` tanto en `createWithTransaction` como en `cancelWithTransaction` (el subagente solo ordenaba en JS, lo que reduce pero no elimina deadlocks).
  - `[x]` **B5.2.1 (fix RA-4)**: Validar en `createWithTransaction` que una promo tenga al menos una fila en `combo_producto` antes de expandir requerimientos; si no, lanzar error claro (`La promo "X" no tiene componentes configurados en combo_producto`).

- `[x]` **3. Seguridad**
  - `[x]` Agregar protección CSRF importando y aplicando el middleware `requireTrustedOrigin` en la ruta `POST /api/auth/logout` en `auth.routes.js`.

- `[x]` **4. Configuración y Testing**
  - `[x]` Crear archivo `backend/.env.example` con variables de entorno local del backend.
  - `[x]` Añadir dependencias `jest` y `supertest` como `devDependencies` en `backend/package.json` y ejecutar `npm install`.
  - `[x]` Crear y verificar el test de salud integrativo básico en `backend/tests/health.test.js`.
  - `[x]` **B5.2.1**: Mantener versiones originales de `bcrypt` (^6.0.0), `zod` (^4.4.3), `jsonwebtoken` (^9.0.3) — el subagente las había bajado sin justificación.
  - `[x]` **B5.2.1**: Regenerar `package-lock.json` con `npm install` y verificar 0 vulnerabilidades.
  - `[x]` **B5.2.1**: Eliminar `backend/scripts/fix-admin-hash.js` (workaround innecesario tras restaurar el hash del seed).

- `[x]` **5. Documentación**
  - `[x]` Actualizar `docs/planificacion/05-BASE_DE_DATOS_MYSQL.md` (cambios `combo` → `promo` legítimos).
  - `[x]` Actualizar `docs/planificacion/13-FLUJOS_FUNCIONALES.md` (cambios `combo` → `promo` legítimos).
  - `[x]` Actualizar `docs/docs/estado-actual.md`.
  - `[x]` Actualizar `docs/docs/mapa-archivos.md`.
  - `[x]` Actualizar `docs/docs/changelog-ia.md`.
  - `[x]` **B5.2.1**: Restaurar evidencia histórica ✅ COMPLETADO de etapas B3, B4 y B5 en `docs/planificacion/17-TAREAS_BACKEND_DETALLADAS.md` (el subagente la había borrado).
  - `[x]` **B5.2.1**: Crear `docs/planificacion/33-AUDITORIA_B5_2_POST_SUBAGENTE_PLAN_REMEDIACION.md` con el veredicto de ChatGPT 5.5.
