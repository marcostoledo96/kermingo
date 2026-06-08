# Reporte de Verificación: Alineación de Schema, Seed y Lógica de Negocio (B5.2 + B5.2.1)

Este documento detalla la verificación técnica realizada sobre los cambios de la etapa B5.2, **incluyendo la remediación B5.2.1 que corrigió regresiones introducidas por el subagente que ejecutó la primera versión**.

Para el detalle de las regresiones detectadas y el plan aplicado, ver:

- `docs/planificacion/33-AUDITORIA_B5_2_POST_SUBAGENTE_PLAN_REMEDIACION.md` (veredicto de ChatGPT 5.5)
- `openspec/changes/backend-b5-2-schema-seed-alignment/tasks.md` (tareas B5.2 + B5.2.1)

---

## 1. Verificación de Compilación e Instalación

- **Instalación de dependencias:** `npm install` ejecutado exitosamente.
  - `dependencies`: `bcrypt` ^6.0.0, `jsonwebtoken` ^9.0.3, `zod` ^4.4.3, `cookie-parser` ^1.4.7, `cors` ^2.8.5, `dotenv` ^16.4.7, `express` ^4.21.2, `mysql2` ^3.22.4
  - `devDependencies`: `jest` ^29.7.0, `supertest` ^6.3.4, `nodemon` ^3.1.9
- **Vulnerabilidades:** 0 vulnerabilidades reportadas.

---

## 2. Verificación Automatizada (Tests)

`npm test` ejecutado:

```bash
> kermingo-backend@0.1.0 test
> node --experimental-vm-modules node_modules/.bin/jest
PASS tests/health.test.js
  GET /api/health
    ✓ debería retornar 200 y estado ok (34 ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
```

---

## 3. Auditoría de Código y Verificación de Lógica

### 3.1 Schema y Seed (`schema.sql` y `seed.sql`)

Estado verificado con `grep` sobre el archivo final:

- **9 tablas** con `DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.
- **10 `CHECK` constraints** activos (precio, stock, cantidad, total, subtotal, precio_unitario, tamanio_bytes).
- **`CONSTRAINT chk_pedido_comprobante_efectivo`** presente (defiende que `metodo_pago='efectivo'` no tenga comprobante).
- **`CONSTRAINT fk_pedido_comprobante`** y **`CONSTRAINT fk_producto_imagen`** nombradas.
- **`producto.tipo` ENUM** incluye `'promo'`.
- **`pedido.numero` VARCHAR(20) NULL UNIQUE**.
- **Hash bcrypt del admin** restaurado al de `admin123` (verificado con `bcrypt.compare('admin123', hash) === true`).

### 3.2 Lógica de Stock en Pedidos (`pedido.model.js`)

- **Stock ilimitado en descuento:** `createWithTransaction` skip productos con `stock_limitado = 0` antes del `UPDATE` defensivo.
- **Stock ilimitado en reposición:** `cancelWithTransaction` skip productos con `stock_limitado = 0` antes del `UPDATE` de reposición.
- **Prevención de deadlocks (B5.2.1 fix RA-1):** ambos `SELECT ... FOR UPDATE` (creación y cancelación) incluyen `ORDER BY id` dentro del SQL, además del sort en JavaScript. Esto reduce el riesgo de deadlocks a prácticamente cero bajo carga concurrente.
- **Validación de promos (B5.2.1 fix RA-4):** `createWithTransaction` verifica que cada promo tenga al menos un componente en `combo_producto` antes de expandir requerimientos. Si no, lanza error claro: `La promo "X" no tiene componentes configurados en combo_producto`.

### 3.3 Seguridad en Logout

- `POST /api/auth/logout` ahora pasa por `requireTrustedOrigin`. CSRF en logout bloqueado.

### 3.4 Dependencias

- Versiones originales restauradas: `bcrypt` ^6.0.0, `zod` ^4.4.3, `jsonwebtoken` ^9.0.3.
- Versiones nuevas agregadas: `jest` ^29.7.0, `supertest` ^6.3.4.

### 3.5 Scripts de workaround

- `backend/scripts/fix-admin-hash.js` eliminado (no hace falta con el hash correcto en seed).

---

## 4. Estado de Verificación

```txt
Checkpoint automatico: listo
Checkpoint manual requerido: si
Auditoria con ChatGPT recomendada: si (ya realizada — ver doc 33)
Bloquea avance a siguiente etapa: si, hasta confirmar testing manual de la base limpia
```

### Testing manual requerido antes de B6

Recrear base limpia y verificar:

```sql
DROP DATABASE IF EXISTS kermingo;
CREATE DATABASE kermingo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kermingo;
SOURCE backend/src/api/database/schema.sql;
SOURCE backend/src/api/database/seed.sql;
SOURCE backend/src/api/database/indexes.sql;

SELECT tipo, COUNT(*) FROM producto GROUP BY tipo;
-- Esperado: ninguna fila con tipo='combo', al menos 2 con tipo='promo'

SELECT nombre, stock_actual FROM producto WHERE nombre IN ('Pizza sin TACC', 'Helados palito');
-- Esperado: stock_actual=0 para ambos

SHOW CREATE TABLE producto;
SHOW CREATE TABLE pedido;
-- Esperado: charset utf8mb4, CHECK constraints presentes
```

Probar login admin y flujos online/caja antes de cerrar B5.2.1 y abrir B6.
