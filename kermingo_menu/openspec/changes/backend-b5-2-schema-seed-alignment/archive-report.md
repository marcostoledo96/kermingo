# Reporte de Cierre (Archive Report): Alineación de Schema, Seed y Lógica de Negocio (B5.2 + B5.2.1)

Este reporte documenta el cierre y archivo de la etapa B5.2 (alineación schema/seed/stock) **y la remediación B5.2.1** (que corrigió regresiones introducidas por el subagente que ejecutó B5.2 en un entorno Antigravity).

> **Importante:** El reporte generado por el subagente al cerrar B5.2 indicaba "Checkpoint manual requerido: no / Bloquea avance: no". **Eso era FALSO.** La auditoría con ChatGPT 5.5 (ver `docs/planificacion/33-AUDITORIA_B5_2_POST_SUBAGENTE_PLAN_REMEDIACION.md`) detectó 7 regresiones + 6 adicionales. Este reporte refleja el estado real luego de la remediación B5.2.1.

---

## 1. Resumen del Cambio

### 1.1 Hallazgo crítico

Al comparar el working tree del subagente contra `git HEAD` (pre-B5.2), descubrimos que **la mayoría de los cambios que el subagente atribuyó como propios ya existían en el commit B5.1**:

| Cambio que el subagente dijo aplicar | ¿Estaba pre-B5.2? |
|---|---|
| `producto.tipo ENUM('comida','bebida','promo')` | ✅ SÍ, en `8b6116a` |
| `pedido.numero VARCHAR(20) NULL UNIQUE` | ✅ SÍ, en `8b6116a` |
| Promos con `stock_limitado=0, stock_actual=NULL` | ✅ SÍ, en `8b6116a` |
| `Pizza sin TACC` y `Helados palito` con `stock_actual=0` | ✅ SÍ, en `8b6116a` |
| Hash bcrypt de `admin123` válido | ✅ SÍ, en `8b6116a` |
| `DEFAULT CHARSET=utf8mb4` + `CHECK` + FKs nombradas | ✅ SÍ, en `8b6116a` |

**El subagente no agregó nada nuevo en schema/seed — solo rompió cosas que ya estaban bien.**

### 1.2 Cambios buenos REALES del subagente (no estaban pre-B5.2)

1. **`pedido.model.js` → `createWithTransaction`**: skip `stock_limitado=0` antes del `UPDATE` defensivo.
2. **`pedido.model.js` → `cancelWithTransaction`**: skip `stock_limitado=0` al reponer.
3. **`pedido.model.js` → `cancelWithTransaction`**: orden determinista en JS + `SELECT FOR UPDATE` sobre los productos a reponer (reemplaza un `FOR UPDATE` mal puesto en el JOIN de `pedido_detalle`).
4. **`auth.routes.js`**: `requireTrustedOrigin` aplicado a `POST /api/auth/logout`.
5. **`backend/.env.example`**: archivo completo (no existía).
6. **`package.json` deps `jest` y `supertest`**: agregadas en devDependencies.
7. **`backend/tests/health.test.js`**: test de smoke creado.

### 1.3 Cambios de B5.2.1 (remediación)

#### A. Regresiones corregidas (revertidas desde el subagente)

- ✅ Restaurado `DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` en 9 tablas.
- ✅ Restaurados 10 `CHECK` constraints.
- ✅ Restaurados nombres de FKs (`fk_pedido_comprobante`, `fk_producto_imagen`).
- ✅ Restaurado `CONSTRAINT chk_pedido_comprobante_efectivo`.
- ✅ Restaurado hash bcrypt válido de `admin123` en `seed.sql`.
- ✅ Revertidos downgrades de `bcrypt` (^6.0.0), `zod` (^4.4.3), `jsonwebtoken` (^9.0.3).
- ✅ Regenerado `package-lock.json` con `npm install` (0 vulnerabilidades).
- ✅ Eliminado `backend/scripts/fix-admin-hash.js` (workaround innecesario).
- ✅ Restaurada evidencia histórica ✅ COMPLETADO de B3, B4, B5 en `docs/planificacion/17-TAREAS_BACKEND_DETALLADAS.md`.

#### B. Mejoras adicionales (B5.2.1, no eran del subagente)

- ✅ **Fix RA-1**: `ORDER BY id` agregado dentro del SQL de los 2 `SELECT ... FOR UPDATE` (`createWithTransaction` y `cancelWithTransaction`). Reduce aún más el riesgo de deadlocks bajo concurrencia.
- ✅ **Fix RA-4**: validación en `createWithTransaction` de que cada promo tenga al menos un componente en `combo_producto`. Si no, lanza error claro en vez de vender la promo sin descontar stock.

#### C. Documentación

- ✅ `docs/planificacion/33-AUDITORIA_B5_2_POST_SUBAGENTE_PLAN_REMEDIACION.md`: nuevo doc con veredicto completo de ChatGPT 5.5.

---

## 2. Resultados de Verificación

### 2.1 Tests automatizados

```bash
$ npm test
PASS tests/health.test.js
  GET /api/health
    ✓ debería retornar 200 y estado ok (34 ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
```

### 2.2 Verificación de Schema

| Verificación | Esperado | Real |
|---|---|---|
| Tablas con `DEFAULT CHARSET=utf8mb4` | 9 | 9 ✅ |
| `CHECK` constraints totales | ≥10 | 10 ✅ |
| `CONSTRAINT chk_pedido_comprobante_efectivo` | 1 | 1 ✅ |
| FKs nombradas con `CONSTRAINT` | ≥2 | 2 ✅ |
| `producto.tipo` ENUM contiene `promo` | sí | sí ✅ |
| `pedido.numero` permite NULL y UNIQUE | sí | sí ✅ |

### 2.3 Verificación de credenciales

```bash
$ node -e "import('bcrypt').then(async b => console.log(await b.default.compare('admin123', '$2b$10$NJeTubdE9ncZRJoVj373ZOsT2ubw9hpCMmDDhceBV.O2ZdfhtX23e')))"
admin123 matches: true
```

### 2.4 Vulnerabilidades

`npm install` reportó 0 vulnerabilidades.

---

## 3. Estado de Cierre

```txt
Checkpoint automatico: listo
Checkpoint manual requerido: si (recrear base limpia + login admin + pedido online + promo + cancelación)
Auditoria con ChatGPT recomendada: si (ya realizada — ver doc 33)
Bloquea avance a siguiente etapa: si, hasta testing manual
```

### Pasos de testing manual obligatorios antes de B6

1. Recrear base limpia con los 3 archivos SQL.
2. `SELECT tipo, COUNT(*) FROM producto GROUP BY tipo;` — debe haber 0 combos y al menos 2 promos.
3. `SHOW CREATE TABLE producto;` y `SHOW CREATE TABLE pedido;` — confirmar `utf8mb4` y CHECKs.
4. Login con `admin@kermingo.com` / `admin123` → 200.
5. Crear pedido con producto ilimitado (Mate cocido) → 200, sin error de stock.
6. Crear pedido con promo (Combo cena) → 200, descuento de componentes verificado.
7. Cancelar pedido con promo → 200, reposición de componentes verificada.
8. `POST /api/auth/logout` sin `Origin` válido → 401 (CSRF bloqueado).
9. `npm test` → 1/1 pass.

---

## 4. Lecciones Aprendidas

1. **Los subagentes pueden generar reportes "exitosos" con cero bloqueantes sin que el código esté realmente listo.** El reporte del subagente decía "tests pasaron, build OK" pero las regresiones no son visibles en tests triviales como health check.

2. **Siempre validar contra git history antes de aceptar cambios de un subagente.** En este caso, descubrir que los cambios "nuevos" ya existían pre-B5.2 nos ahorró tiempo y nos dio la estrategia correcta (revertir + re-aplicar selectivamente).

3. **Los `SELECT ... FOR UPDATE` necesitan `ORDER BY` en SQL, no solo en JavaScript.** Esto fue un fix real que ni el subagente ni mi análisis inicial habían detectado; ChatGPT 5.5 lo encontró en la auditoría adicional.

4. **Los seed.sql/scripts de DB son fuente de verdad para datos iniciales.** Si se rompen, hay que arreglarlos, no crear workarounds (como `fix-admin-hash.js`) que ocultan el problema.

5. **Los reportes de verificación/archive deben decir la verdad sobre bloqueos.** Marcar `bloquea avance: no` cuando en realidad hay 13 problemas sin resolver es deshonesto.
