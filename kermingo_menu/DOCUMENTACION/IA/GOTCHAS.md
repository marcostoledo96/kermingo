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
9. [Pedidos online solo aceptan transferencia con comprobante](#9-pedidos-online-solo-aceptan-transferencia-con-comprobante)
10. [Transacciones de stock determinísticas](#10-transacciones-de-stock-determinísticas)
11. [Cancelación/edición de promos depende de la composición actual de combo_producto](#11-cancelaciónedición-de-promos-depende-de-la-composición-actual-de-combo_producto)
12. [z.preprocess necesario para items en multipart (B6.3)](#12-zpreprocess-necesario-para-items-en-multipart-b63)
13. [Multer error vs Zod error ordering (B6.3)](#13-multer-error-vs-zod-error-ordering-b63)
14. [Magic bytes ordering: después de Multer, antes del controller (B6.3.1)](#14-magic-bytes-ordering-después-de-multer-antes-del-controller-b631)
15. [RUN_REAL_DRIVE_TESTS=false por defecto (B6.3.1)](#15-run_real_drive_testsfalse-por-defecto-b631)
16. [Archivos huérfanos en Drive si falla la transacción DB (B6.3.1)](#16-archivos-huérfanos-en-drive-si-falla-la-transacción-db-b631)
17. [Preflight assertStoreOpen evita huérfanos por tienda cerrada (B6.3.1)](#17-preflight-assertstoreopen-evita-huérfanos-por-tienda-cerrada-b631)
18. [useSyncExternalStore + JSON.parse: referential stability (frontend-ticket-qr)](#18-usesyncexternalstore--jsonparse-referential-stability-frontend-ticket-qr)
19. [useApiResource: fetcher inestable causaba loop infinito de re-fetch (frontend-menu)](#19-useapiresource-fetcher-inestable-causaba-loop-infinito-de-re-fetch-frontend-menu)
20. [ZIP de auditoría: verificación post-generación (B6.3.1)](#20-zip-de-auditoría-verificación-post-generación-b631)
21. [npm test con --experimental-vm-modules requiere path directo a jest.js](#21-npm-test-con---experimental-vm-modules-requiere-path-directo-a-jestjs)
22. [AdminSessionProvider no debe tratar errores de red/5xx como authenticated](#22-adminsessionprovider-no-debe-tratar-errores-de-red5xx-como-authenticated)
23. [Comprobante endpoint devuelve metadata, no bytes de archivo](#23-comprobante-endpoint-devuelve-metadata-no-bytes-de-archivo)
24. [Configuración endpoints: configuracion-tienda, no configuracion](#24-configuración-endpoints-configuracion-tienda-no-configuracion)
25. [`diseno-de-landing-kermingo/` es local, no versionada](#25-diseno-de-landing-kermingo-es-local-no-versionada)
26. [Manual visual testing required after frontend UI changes](#26-manual-visual-testing-required-after-frontend-ui-changes)
27. [Cocina: transiciones ágiles (backward y direct ready)](#27-cocina-transiciones-ágiles-backward-y-direct-ready)
28. [Assets demo de comprobantes en `public/` (P2-3, pendiente)](#28-assets-demo-de-comprobantes-en-public-p2-3-pendiente)

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

## 9. Pedidos online solo aceptan transferencia con comprobante

Los pedidos online con `metodo_pago=transferencia` son válidos **siempre que incluyan un archivo comprobante** (multipart/form-data). Efectivo solo está disponible en caja rápida (admin).

**Código:** `pedido.controller.js` → `crear()`:

- Si `metodo_pago === 'transferencia'` y no hay archivo → error 400.
- Si `metodo_pago === 'efectivo'` → error 400, con o sin archivo.
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

## 18. useSyncExternalStore + JSON.parse: referential stability (frontend-ticket-qr)

**Síntoma:** React error #185 (Maximum update depth exceeded) al renderizar `/confirmado` con un objeto en localStorage.

**Causa:** `useSyncExternalStore`'s `getSnapshot` llamaba `JSON.parse()` en cada invocación, creando un nuevo objeto cada vez. React detectaba referencias distintas como cambios de estado, causando re-renders infinitos.

**Solución:** Agregar un cache basado en `useRef` en `getSnapshot`: cuando el string raw de localStorage no cambia, devolver la misma referencia de objeto parseado. Invalidar el cache cuando localStorage cambia o hay error.

**Archivo afectado:** `frontend/lib/use-local-storage.ts`

**Regla:** Siempre que `useSyncExternalStore` se use con `JSON.parse`, cachear el resultado parseado y devolver la misma referencia mientras el string raw no cambie.

---

## 19. useApiResource: fetcher inestable causaba loop infinito de re-fetch (frontend-menu)

**Síntoma:** En `/menu`, la página hace cientos de requests `GET /api/productos` por segundo, causando que la pantalla se cuelgue/lentifique y el scrollbar parpadee.

**Causa:** `useApiResource` recibía el `fetcher` como argumento directo en `useCallback([fetcher])`. En `menu-screen.tsx`, el fetcher era una arrow function inline `async () => { ... }` que crea una nueva referencia cada render. Esto hacía que `refetch` cambiara cada render, disparando el `useEffect([refetch])` que vuelve a ejecutar el fetch, causando un re-render, nueva referencia de fetcher, nuevo refetch... loop infinito.

**Solución:** Usar `useRef(fetcher)` con `fetcherRef.current = fetcher` en cada render, y que `refetch` llame `fetcherRef.current()` en lugar de `fetcher` directamente. Así `refetch` es estable (`useCallback([])`) y el `useEffect([refetch])` solo se ejecuta una vez (mount).

**Archivos afectados:** `frontend/lib/use-api-resource.ts`, `frontend/test/use-api-resource.test.ts`

**Regla:** Nunca pasar una función inline como `fetcher` a un hook que la use en un `useEffect` sin estabilizarla. Usar el patrón ref-based para que el hook solo haga fetch en mount y cuando el consumidor llame `refetch()` manualmente.

---

## 20. ZIP de auditoría: verificación post-generación (B6.3.1)

**Síntoma:** `scripts/crear_zip_auditoria.sh` ahora verifica que ningún patrón prohibido (`.env`, `node_modules`, etc.) esté presente en el ZIP después de generarlo.

**Causa:** Post-generation `unzip -l` + `grep` de patrones prohibidos. Si encuentra algo, el script sale non-zero.

**Regla:** Siempre usar `scripts/crear_zip_auditoria.sh` para generar ZIPs de auditoría. No generar ZIPs manualmente.

---

## 21. npm test con --experimental-vm-modules requiere path directo a jest.js

**Síntoma:** `npm test` falla con error de sintaxis o "node_modules/.bin/jest: not found" cuando se usa `node --experimental-vm-modules node_modules/.bin/jest`.

**Causa:** `.bin/jest` es un shell shim que no funciona como argumento directo de `node --experimental-vm-modules`. Se necesita apuntar al archivo JS real.

**Fix:** El script en `package.json` usa `./node_modules/jest/bin/jest.js` en vez de `node_modules/.bin/jest`:

```json
"test": "node --experimental-vm-modules ./node_modules/jest/bin/jest.js --runInBand"
```

**Regla:** Nunca usar `node_modules/.bin/jest` como argumento de `node --experimental-vm-modules`. Siempre usar el path al `.js` real.

---

## 22. AdminSessionProvider no debe tratar errores de red/5xx como authenticated

**Síntoma:** Si el backend está caído, el panel admin muestra la UI protegida con un usuario cached/default, dando la falsa impresión de que la sesión es válida.

**Causa:** El código original hacía fallback a `setStatus('authenticated')` cuando `/api/auth/me` devolvía un error 5xx o fallaba la red. Esto permitía que la UI protegida se renderizara sin verificación real de la cookie.

**Fix:** El `AdminSessionProvider` ahora tiene 4 estados: `loading`, `authenticated`, `unauthenticated`, `error`. Errores de red y 5xx setean `status: 'error'` y muestran pantalla de retry. Solo `status: 'authenticated'` (respuesta 200 con usuario válido) renderiza la UI protegida.

**Regla:** Nunca tratar un error de red o respuesta no-200 como authenticated. El usuario cached solo se muestra como placeholder durante `loading`, no como prueba de autenticación.

---

## 23. Comprobante endpoint devuelve metadata, no bytes de archivo

**Síntoma:** El frontend linkeaba directamente a `GET /api/admin/pedidos/:id/comprobante` como si fuera un archivo, pero ese endpoint devuelve JSON con metadata (`drive_id`, `url_publica`, `nombre_original`, etc.).

**Causa:** El backend no proxea bytes de Drive. Devuelve metadata para que el frontend abra la URL pública de Drive si está disponible.

**Fix:** `ComprobantesScreen` ahora hace fetch del endpoint de metadata y muestra un botón "Abrir en Drive" que linkea a `url_publica`. Si `url_publica` es null o el fetch falla, muestra un error contextual.

**Regla:** Nunca linkear directamente a `/api/admin/pedidos/:id/comprobante` como si fuera un archivo. Siempre hacer fetch de metadata y usar `url_publica` para abrir en Drive.

---

## 24. Configuración endpoints: configuracion-tienda, no configuracion

**Síntoma:** `ConfigScreen` usaba `GET /api/configuracion` y `PATCH /api/admin/configuracion`, pero los endpoints reales del backend son `GET /api/configuracion-tienda` y `PUT /api/admin/configuracion-tienda`.

**Causa:** Desalineación entre nombres de endpoints del backend y los paths hardcodeados en el frontend.

**Fix:** `ConfigScreen` ahora usa los endpoints correctos y `PUT` en vez de `PATCH`.

**Regla:** Los endpoints de configuración siempre llevan sufijo `-tienda`: `/api/configuracion-tienda` (público) y `/api/admin/configuracion-tienda` (admin con PUT).

---

## 25. `diseno-de-landing-kermingo/` es local, no versionada

**Síntoma:** Agentes o prompts pueden intentar leer archivos de `diseno-de-landing-kermingo/` y no encontrarlos si la carpeta no existe localmente. Git muestra la carpeta como untracked si no está en `.gitignore`.

**Causa:** La carpeta fue removida de git en el commit `1361d5a` (intencionalmente). Existe solo localmente como referencia visual del prototipo v0. No se debe versionar ni depender de ella en CI.

**Regla:**
- La carpeta está en `.gitignore`. No hacer `git add` de su contenido.
- Si se necesita referencia visual, consultar localmente. No depender de ella para builds.
- Si se elimina la carpeta local, el frontend ya está migrado a `frontend/` y no se rompe nada.
- No modificar archivos dentro de `diseno-de-landing-kermingo/`.

---

## 26. Manual visual testing required after frontend UI changes

**Síntoma:** Una pantalla admin puede pasar lint, typecheck y build, pero tener problemas visuales: márgenes inconsistentes, colores incorrectos, distribución rota, o componentes fuera de lugar.

**Causa:** Los tests automatizados (Vitest, Jest) verifican lógica, estado y comportamiento, pero **no verifican layout visual** (CSS, espaciado, colores, tipografía, centrado). Un cambio que ajusta clases Tailwind puede romper la alineación visual sin que ningún test falle.

**Regla:** Después de cualquier cambio que afecte la UI del frontend (admin o público), se debe realizar una verificación manual en browser:
- Navegar todas las pantallas afectadas en desktop (1440px) y mobile (360px).
- Verificar que cards, tablas, formularios y modales mantengan la estética v0: cards redondeadas, paleta azul/celeste/amarillo, tipografía consistente, espaciado uniforme.
- En admin específicamente: verificar sidebar, topbar, km-panel, km-tabular, EstadoBadge, tokens `--km-*`, y que no haya colores Tailwind genéricos (emerald, amber, rose, sky, slate) en componentes operativos.
- Si se cambió `globals.css` o se agregaron nuevos tokens `--km-*`, verificar que todos los consumidores existentes sigan funcionando.

**Referencia visual:** La carpeta local `diseno-de-landing-kermingo/` es la fuente de verdad visual. Comparar el resultado real contra la referencia.

---

## 27. Cocina: transiciones ágiles (backward y direct ready)

**Síntoma:** Si un cocinero marca un pedido como listo por error, no había forma de revertirlo sin cancelar el pedido completo.

**Causa:** La state machine original solo permitía transiciones hacia adelante (`recibido → en_preparacion → listo → entregado`). No existía `en_preparacion → recibido` ni `listo → en_preparacion`, ni `recibido → listo` directo.

**Fix:** Se ampliaron las transiciones válidas en `TRANSICIONES_VALIDAS` (backend) y en la UI del KDS (frontend):
- `recibido → en_preparacion` (empezar preparación)
- `recibido → listo` (directo, para productos ya listos como medialunas)
- `en_preparacion → recibido` (retroceso por error)
- `en_preparacion → listo` (terminó preparación)
- `listo → en_preparacion` (retroceso por error)
- `listo → entregado` (confirmar entrega, con confirmación en frontend)

**Regla:** `entregado` sigue siendo terminal. No se puede retroceder desde entregado. El frontend muestra confirmación (`window.confirm`) antes de marcar `listo → entregado`. Las acciones backward se muestran como botones secundarios (más sutiles) y las forward como primarios.

---

## 28. Assets demo de comprobantes en `public/` (P2-3, pendiente)

---

## 29. Imagen de producto relativa: 404 si no se convierte a absoluta

**Síntoma:** En `/admin/productos`, la imagen de un producto no se muestra (404 gris) aunque el producto tenga imagen subida. En consola del navegador se ve un `GET http://localhost:3000/api/productos/...` 404.

**Causa:** El backend (`backend/src/api/controllers/producto.controller.js`) devuelve `imagen_url` como una ruta relativa (ej: `/api/productos/6/imagen?v=42`) en la respuesta de `GET /api/admin/productos`. Si el mapper frontend no la convierte a absoluta, el navegador resuelve la URL relativa contra el host actual (Next dev server → `localhost:3000`) en vez del backend (`localhost:3001`).

**Mappers obligatorios a convertir:**
- `lib/mappers.ts` → `mapProducto()` — público (menú)
- `lib/admin.ts` → `apiToAdminProduct()` — admin productos
- `lib/admin.ts` → `apiToCajaProduct()` — caja rápida
- `components/admin/product-form-dialog.tsx` → preview tras crear/actualizar

**Helper:** `ABSOLUTE_IMAGE_URL(path)` en `lib/config.ts`. Toma un string relativo o `null/undefined`, antepone `API_BASE` (en dev: `http://localhost:3001`; en producción exige `NEXT_PUBLIC_API_URL`). Si el path ya es absoluto (`http://...`), lo devuelve sin cambios. Si es null/undefined, devuelve `undefined`.

**Regla:** Cualquier mapper o componente que consuma `imagen_url` de la API debe pasarlo por `ABSOLUTE_IMAGE_URL()`. No asumir que el path es absoluto ni que el navegador lo resuelve contra el backend.
