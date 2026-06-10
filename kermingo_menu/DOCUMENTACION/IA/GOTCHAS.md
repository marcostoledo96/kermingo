# Gotchas — Trampas y Bugs Conocidos

> Antes de implementar algo que toque estas áreas, leé la sección relevante.
> Cada gotcha está documentado para que no se repita.

---

## Índice

1. [Cookie sameSite en producción](#1-cookie-samesite-en-producción)
2. [MySQL ONLY_FULL_GROUP_BY](#2-mysql-only_full_group_by)
3. [affectedRows no es matched rows](#3-affectedrows-no-es-matched-rows)
4. [requireAdmin hace query a DB](#4-requireadmin-hace-query-a-db)
5. [configuracion_tienda cerrada por defecto](#5-configuracion_tienda-cerrada-por-defecto)
6. [jest.unstable_mockModule tiene scope de archivo](#6-jestunstable_mockmodule-tiene-scope-de-archivo)
7. [ForbiddenError 403 en origin middleware (CSRF)](#7-forbiddenerror-403-en-origin-middleware-csrf)
8. [Estados de pago sin comprobante real (B6.3)](#8-estados-de-pago-sin-comprobante-real-b63)
9. [Pedidos online solo permiten efectivo](#9-pedidos-online-solo-permiten-efectivo)
10. [Transacciones de stock determinísticas](#10-transacciones-de-stock-determinísticas)
11. [Cancelación/edición de promos depende de la composición actual de combo_producto](#11-cancelaciónedición-de-promos-depende-de-la-composición-actual-de-combo_producto)

---

## 1. Cookie sameSite en producción

**Síntoma:** En desarrollo local, la cookie de autenticación no se envía si se fuerza `secure: true`. En producción sin HTTPS, lo mismo.

**Causa:** `sameSite: 'none'` **requiere** `secure: true`. Sin HTTPS, el navegador rechaza la cookie.

**Config actual:**

```javascript
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: environments.esProduccion,  // false en dev, true en prod
  sameSite: environments.esProduccion ? 'none' : 'lax',
  path: '/',
  maxAge: 24 * 60 * 60 * 1000,
};
```

**Regla:** Nunca forzar `secure: true` en desarrollo local. La config condicional ya lo maneja.

---

## 2. MySQL ONLY_FULL_GROUP_BY

**Síntoma:** Queries con `GROUP BY` lanzan error `ONLY_FULL_GROUP_BY` en MySQL 8.

**Causa:** MySQL 8 habilita `ONLY_FULL_GROUP_BY` por default. Toda columna seleccionada que no esté en un aggregate debe estar en `GROUP BY`.

**Ejemplo afectado:** La query de cocina (`findKitchenPedidos`) usa `GROUP BY p.id, ...` incluyendo todas las columnas seleccionadas. Funciona porque lista TODAS las columnas no agregadas.

**Regla:** Si agregás una columna al `SELECT`, agregala también al `GROUP BY`.

---

## 3. affectedRows no es matched rows

**Síntoma:** Un `UPDATE` que no cambia ningún valor devuelve `affectedRows: 0`, aunque la fila exista.

**Causa:** En `mysql2`, `affectedRows` cuenta filas **MODIFICADAS**, no filas **MATCHED**. Si `UPDATE producto SET stock_actual = 10 WHERE id = 1` ya tiene `stock_actual = 10`, devuelve `0`.

**Dónde importa:**

- `updateEstadoPedido` devuelve `affectedRows`. Si el pedido ya está en ese estado, devuelve `0`, pero `transicionEstadoValida` ya lo rechaza porque `actual === siguiente` devuelve `false`.
- `updateStock` con el mismo valor → `affectedRows: 0` → se interpreta como "producto no encontrado" (NotFoundError). **No es un bug en este caso** porque el controller lo trata como error 404.

**Regla:** Si un UPDATE puede ser idempotente, verificar existencia antes de confiar en `affectedRows`.

---

## 4. requireAdmin hace query a DB

**Síntoma:** Tests unitarios que mockean solo JWT fallan porque `requireAdmin` hace `SELECT ... FROM usuario WHERE id = ?`.

**Causa:** El middleware no solo verifica el token, sino que busca el usuario en la BD para confirmar que existe y está activo.

**Solución en tests:**

- Tests de integración: usar DB real.
- Tests unitarios: mockear `getPool` o usar `jest.unstable_mockModule` para `database/db.js`.

---

## 5. configuracion_tienda cerrada por defecto

**Síntoma:** Tests de integración que crean pedidos fallan con "La tienda no está abierta".

**Causa:** El seed inserta `configuracion_tienda` con `estado = 'cerrada'`. `createWithTransaction` verifica `estado = 'abierta'` con `FOR UPDATE`.

**Solución:** Antes de los tests que crean pedidos, ejecutar:

```sql
UPDATE configuracion_tienda SET estado = 'abierta' WHERE id = 1;
```

O mockear `getPool` para omitir la verificación.

---

## 6. jest.unstable_mockModule tiene scope de archivo

**Síntoma:** Remockear un módulo en el mismo archivo no funciona. El primer mock persiste.

**Causa:** `jest.unstable_mockModule` (necesario para ESM) tiene scope de archivo, no de test individual.

**Solución:** Usar `mockImplementationOnce` sobre el mock ya creado, o dividir en archivos de test separados.

---

## 7. ForbiddenError 403 en origin middleware (CSRF)

`requireTrustedOrigin` usa `ForbiddenError` (403) para rechazar requests con origin no permitido. Esto significa que el frontend recibe un 403 (prohibido) en lugar de un 401 (no autenticado). Si se desea que el frontend trate el rechazo como "no autenticado" y redirija al login, se puede cambiar a `AuthError` (401), pero el código actual usa `ForbiddenError`.

**Código actual:** `origin.middleware.js` importa y usa `ForbiddenError` para rechazos de origin.

---

## 8. Estados de pago con comprobante real (B6.3)

Los estados `comprobante_subido` y `rechazado` existen en el ENUM de `estado_pago` y **tienen flujo real** desde B6.3.

- `POST /api/pedidos` con `metodo_pago=transferencia` y archivo `comprobante` → `estado_pago=comprobante_subido`.
- `GET /api/admin/pedidos/:id/comprobante` devuelve metadatos del archivo en Google Drive.
- `PATCH /api/admin/pedidos/:id/pago` permite `comprobante_subido → pagado|rechazado`.
- Integración con Google Drive via `drive.service.js` (OAuth con refresh token).
- `archivo_drive` se usa para registrar metadata de archivos subidos.

**Nota:** Si las credenciales OAuth de Drive (`GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN`, `GOOGLE_DRIVE_FOLDER_ID`) no están configuradas, la subida de comprobantes falla con 503. Ver `SECRETS.md`.

---

## 9. Pedidos online aceptan transferencia con comprobante

Los pedidos online con `metodo_pago=transferencia` son válidos **siempre que incluyan un archivo comprobante** (multipart/form-data).

**Código:** `pedido.controller.js` → `crear()`:

- Si `metodo_pago === 'transferencia'` y no hay archivo → error 400.
- Si `metodo_pago === 'efectivo'` y hay archivo → error 400.
- Si `metodo_pago === 'transferencia'` con archivo válido → sube a Drive, crea `archivo_drive`, y genera pedido con `estado_pago=comprobante_subido`.

**Ver también:** `upload.middleware.js` (validación MIME/tamaño), `drive.service.js` (subida a Drive).

---

## 10. Transacciones de stock determinísticas

Las transacciones que modifican stock usan `SELECT ... FOR UPDATE` con IDs ordenados para evitar deadlocks:

```javascript
const idsRequeridos = [...requerimientos.keys()].sort((a, b) => a - b);
```

**Regla:** Nunca hacer `SELECT ... FOR UPDATE` sin ORDER BY cuando hay múltiples locks. Siempre ordenar por ID para que las transacciones adquieran locks en el mismo orden.

**Archivos afectados:** `pedido.model.js` (`createWithTransaction`, `cancelWithTransaction`).

---

## 11. Cancelación/edición de promos depende de la composición actual de combo_producto

Cuando se cancela o edita un pedido con una promo, el backend consulta los componentes actuales en `combo_producto` para reponer o recalcular stock. Esto funciona mientras los componentes de la promo no cambien después de la venta.

Si en una etapa futura de ABM productos se permite modificar la composición de una promo ya vendida, la cancelación o edición puede reponer componentes equivocados.

**Fix requerido antes de habilitar ABM de combos:** elegir una de:
- Opción A: No permitir modificar componentes de promos con ventas asociadas.
- Opción B: Guardar snapshot de componentes consumidos por pedido en una tabla `pedido_detalle_componente`.
- Opción C: Expandir componentes en una tabla de movimientos de stock al vender.

Para el MVP actual sin ABM avanzado de combos, es deuda documentada aceptable.

---

## 12. z.preprocess necesario para items en multipart (B6.3)

**Síntoma:** Cuando el frontend envía `POST /api/pedidos` como `multipart/form-data`, el campo `items` llega como string JSON. El schema Zod debe usar `z.preprocess` para parsearlo.

**Código:** `pedido.schema.js`:

```javascript
items: z.preprocess((val) => {
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return val; }
  }
  return val;
}, z.array(itemSchema).min(1))
```

**Regla:** Nunca remover el `z.preprocess` de `items`. Tanto `application/json` (array nativo) como `multipart/form-data` (string JSON) deben funcionar.

---

## 13. Multer error vs Zod error ordering (B6.3)

**Síntoma:** Un request multipart con MIME inválido puede generar error de Multer (fileFilter) ANTES de que Zod valide el body.

**Causa:** `uploadComprobante.single('comprobante')` se ejecuta antes de `validateBody(createPedidoSchema)` en la cadena de middlewares.

**Regla:** El error de tipo MIME devuelve 400 (via `handleMulterError`). El error de Zod también devuelve 400 (via `errorMiddleware`). No hay conflicto: Multer rechaza primero tipos inválidos, Zod rechaza campos faltantes/inválidos después.

---

## 14. Magic bytes ordering: después de Multer, antes del controller (B6.3.1)

**Síntoma:** `assertMagicBytes` necesita `req.file.buffer`, que solo existe después de que Multer procesa el multipart con `memoryStorage`.

**Causa:** El middleware `assertMagicBytes` se coloca después de `uploadComprobante.single()` y después de `validateBody`, pero antes del controller `crear`. Si se colocara antes de Multer, `req.file` sería `undefined`.

**Regla:** No mover `assertMagicBytes` antes de `uploadComprobante.single()`. El orden correcto es: Multer → validateBody → assertMagicBytes → crear.

---

## 15. RUN_REAL_DRIVE_TESTS=false por defecto (B6.3.1)

**Síntoma:** Los tests de Drive no contactan Drive real a menos que se setee explícitamente `RUN_REAL_DRIVE_TESTS=true`.

**Causa:** Por diseño — evitar llamadas accidentales a Drive API en CI o desarrollo local.

**Regla:** Si necesitás probar Drive real, ejecutar: `RUN_REAL_DRIVE_TESTS=true npm test`. Sin esa flag, todos los tests Drive usan mocks.

---

## 16. Archivos huérfanos en Drive si falla la transacción DB (B6.3.1)

**Síntoma:** El Drive upload sucede ANTES de la transacción DB. Si la transacción falla (stock, constraint), el archivo ya está en Drive sin `pedido` asociado.

**Causa:** Por diseño — el upload a Drive ocurre primero, y solo después se inicia la transacción DB que inserta `archivo_drive` + `pedido`.

**Mitigación MVP:** Se acepta que archivos huérfanos queden en Drive. No hay lógica de compensación. Los archivos son pequeños (≤5 MB) y no consumen cuota significativa. El preflight `assertStoreOpen` reduce el riesgo de huérfanos por tienda cerrada.

**Regla:** No intentar hacer rollback de Drive dentro del catch de la DB transaction.

---

## 17. Preflight assertStoreOpen evita huérfanos por tienda cerrada (B6.3.1)

**Síntoma:** Si la tienda está cerrada, el preflight `assertStoreOpen` rechaza el request antes de cualquier upload a Drive.

**Causa:** `assertStoreOpen(pool)` se llama en el controller `crear` antes de `driveUploadFile`. Es un SELECT sin lock, barato.

**Regla:** No remover este preflight. Es la primera línea de defensa contra archivos huérfanos.

---

## 18. ZIP de auditoría: verificación post-generación (B6.3.1)

**Síntoma:** `scripts/crear_zip_auditoria.sh` ahora verifica que ningún patrón prohibido (`.env`, `node_modules`, etc.) esté presente en el ZIP después de generarlo.

**Causa:** Post-generation `unzip -l` + `grep` de patrones prohibidos. Si encuentra algo, el script sale non-zero.

**Regla:** Siempre usar `scripts/crear_zip_auditoria.sh` para generar ZIPs de auditoría. No generar ZIPs manualmente.