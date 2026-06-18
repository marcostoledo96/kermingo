# 56 — Plan de corrección Auditoría B7 — `feature/frontend-ticket-qr`

## Estado

```txt
Proyecto: Kermingo
Branch auditado: feature/frontend-ticket-qr
Commit auditado: 292fa01259b9f911b97981445cb5609de6105998
Root real del proyecto: kermingo_menu/
Veredicto: APROBAR CON CAMBIOS
Prioridad: corregir P1 antes de merge final a main o deploy
```

## Contexto breve

Kermingo es una aplicación web para un evento scout/kermesse con:

```txt
Backend:
- Node.js
- Express
- MySQL
- API REST
- JWT en cookie httpOnly
- Zod
- Multer
- Google Drive OAuth

Frontend:
- Next.js
- React
- TypeScript
- TailwindCSS
- localStorage para carrito
- admin con cookie httpOnly
```

Este snapshot B7 incluye avances importantes:

```txt
- Frontend público
- Menú/carrito/checkout/ticket/seguimiento
- AdminSessionProvider
- AdminShell con sidebar/drawer
- Dashboard admin
- Caja
- Pedidos
- Cocina
- Comprobantes
- Productos
- Configuración
- Reportes
- Tests frontend
- Tests backend
- CI
- Documentación IA
- OpenSpec
```

Evidencia local reportada:

```txt
Backend npm test: 205 tests passed
Frontend pnpm test: 105 tests passed
Frontend pnpm lint: 0 errores, 4 warnings
Frontend pnpm exec tsc --noEmit: passed
Frontend pnpm build: passed
```

## Veredicto ejecutivo

El branch **no está roto** y tiene buena señal técnica, pero **no conviene mergearlo directo a `main` ni usarlo como base de producción sin cerrar los hallazgos P1**.

El principal riesgo no es que no compile, sino que haya detalles funcionales o de seguridad que afecten el evento:

```txt
- compra pública permitiendo efectivo por API;
- CORS/CSRF demasiado permisivo en producción;
- sesión admin inconsistemente manejada;
- endpoints de configuración desalineados;
- comprobantes mal consumidos por frontend;
- eliminación accidental de carpeta de referencia visual.
```

---

# 1. Resumen de prioridades

## P0 — Bloqueantes absolutos

No se detectó P0 confirmado en la auditoría.

Se convertiría en P0 si se verifica manualmente cualquiera de estos casos:

```txt
[ ] POST /api/pedidos público acepta efectivo.
[ ] Admin pierde sesión al navegar.
[ ] Configuración tienda no abre/cierra realmente.
[ ] Comprobantes no pueden revisarse/aprobarse.
[ ] Frontend o backend no levanta en entorno limpio.
```

## P1 — Corregir antes de merge final

```txt
P1-1 — Confirmar/bloquear efectivo en POST público /api/pedidos.
P1-2 — CORS/LAN/CSRF seguro: LAN solo dev, prod solo FRONTEND_URL.
P1-3 — AdminSessionProvider no debe depender de JWT/localStorage como fuente de verdad.
P1-4 — Configuración tienda debe usar endpoints correctos.
P1-5 — Comprobantes debe usar metadata/url_publica y no endpoint de archivo directo inexistente.
P1-6 — Revisar eliminación de diseno-de-landing-kermingo/.
```

## P2 — Deuda técnica importante

```txt
P2-1 — Dividir el PR o al menos separar cleanup de funcionalidad.
P2-2 — Componentes admin demasiado grandes.
P2-3 — Assets demo de comprobantes en public/.
P2-4 — Fallback LAN frontend controlado por entorno.
P2-5 — Reportes como placeholder claro, sin métricas fake.
P2-6 — Validar OpenSpec después del cleanup.
```

## P3 — Mejoras menores

```txt
P3-1 — Resolver warnings de lint.
P3-2 — Mejorar índice/estado en documentación extensa.
P3-3 — Agregar checklist manual por dispositivo.
```

---

# 2. Guía de trabajo recomendada

## Orden recomendado

```txt
1. Crear rama de corrección desde feature/frontend-ticket-qr.
2. Corregir P1 backend.
3. Corregir P1 frontend.
4. Revisar cleanup de repo.
5. Agregar tests faltantes.
6. Ejecutar backend tests.
7. Ejecutar frontend tests/lint/tsc/build.
8. Hacer prueba manual E2E.
9. Recién ahí mergear o abrir PR final.
```

## Rama sugerida

```bash
git checkout feature/frontend-ticket-qr
git pull
git checkout -b fix/b7-auditoria-pre-merge
```

## Reglas durante la corrección

```txt
- No subir .env.
- No tocar secretos.
- No reescribir todo el admin.
- No mezclar refactor grande con fixes críticos.
- No agregar endpoints inventados si backend ya tiene contrato.
- No ocultar errores con mocks como si fueran reales.
- No depender de localStorage para sesión admin.
```

---

# 3. P1-1 — Bloquear efectivo en pedido público

## Problema

La nueva regla funcional confirmada es:

```txt
Compra pública / celular:
- solo transferencia;
- requiere comprobante;
- no efectivo.

Compra en caja admin:
- efectivo permitido;
- transferencia permitida.
```

Si el frontend oculta efectivo pero el backend lo sigue aceptando, alguien podría crear pedidos públicos en efectivo llamando directamente a la API.

## Riesgo real

Alto para el evento.

Podría haber pedidos públicos en efectivo que no tienen comprobante ni flujo de caja claro. Esto confunde a caja/entrega y rompe la regla operativa.

## Archivos a revisar

```txt
kermingo_menu/backend/src/api/controllers/pedido.controller.js
kermingo_menu/backend/src/api/schemas/pedido.schema.js
kermingo_menu/backend/src/api/routes/pedido.routes.js
kermingo_menu/backend/tests/comprobantes.test.js
kermingo_menu/backend/tests/caja.test.js
kermingo_menu/DOCUMENTACION/IA/API.md
kermingo_menu/DOCUMENTACION/IA/FLUJOS.md
```

## Guía de solución backend

### 1. Buscar función de creación pública

En:

```txt
backend/src/api/controllers/pedido.controller.js
```

Identificar el controller público, probablemente:

```js
crear
```

o equivalente.

### 2. Agregar validación explícita

Antes de crear el pedido:

```js
if (req.body.metodo_pago === 'efectivo') {
  throw new ValidationError(
    'Los pedidos online solo aceptan pago por transferencia. Para pagar en efectivo, acercate a caja.'
  );
}
```

Si el controller usa nombres normalizados:

```js
const metodoPago = req.body.metodo_pago;
```

entonces:

```js
if (metodoPago === 'efectivo') {
  throw new ValidationError(
    'Los pedidos online solo aceptan pago por transferencia. Para pagar en efectivo, acercate a caja.'
  );
}
```

### 3. Mantener regla de transferencia con comprobante

Debe seguir existiendo:

```txt
metodo_pago = transferencia sin comprobante → 400
metodo_pago = transferencia con comprobante → 201
```

### 4. No romper caja

La ruta admin de caja debe seguir aceptando:

```txt
efectivo
transferencia
```

No mover esta validación al schema compartido si caja usa el mismo schema. La restricción debe aplicarse solo al flujo público, o deben existir schemas separados:

```txt
createPedidoPublicoSchema
createPedidoCajaSchema
```

## Tests mínimos

Agregar o confirmar:

```txt
POST /api/pedidos con efectivo → 400
POST /api/pedidos transferencia sin comprobante → 400
POST /api/pedidos transferencia con comprobante → 201
POST /api/admin/pedidos/caja efectivo → 201
POST /api/admin/pedidos/caja transferencia → 201
```

## Ejemplo de test conceptual

```js
it('rechaza efectivo en pedido público', async () => {
  const res = await request(app)
    .post('/api/pedidos')
    .field('nombre_cliente', 'Cliente Test')
    .field('metodo_pago', 'efectivo')
    .field('items', JSON.stringify([{ producto_id: productoId, cantidad: 1 }]));

  expect(res.status).toBe(400);
  expect(res.body.ok).toBe(false);
  expect(res.body.error.message).toMatch(/solo aceptan pago por transferencia/i);
});
```

## Criterios de aceptación

```txt
[ ] El frontend público no muestra efectivo.
[ ] POST público con efectivo devuelve 400.
[ ] El mensaje de error es claro para el usuario.
[ ] POST público con transferencia sin comprobante devuelve 400.
[ ] POST público con transferencia + comprobante funciona.
[ ] Caja admin permite efectivo.
[ ] Caja admin permite transferencia.
[ ] Tests backend pasan.
[ ] Documentación API/FLUJOS actualizada.
```

---

# 4. P1-2 — CORS, LAN y CSRF seguros

## Problema

El proyecto necesita funcionar en desarrollo desde notebook/tablet/celular usando LAN, pero en producción no debe permitir orígenes LAN ni comodines peligrosos.

## Riesgo real

Alto si se despliega con CORS/Origin permisivo.

Como el backend usa cookies httpOnly con credentials, un Origin incorrectamente permitido podría facilitar requests no deseados desde otro sitio.

## Archivos a revisar

```txt
kermingo_menu/backend/src/api/config/environments.js
kermingo_menu/backend/src/api/middlewares/origin.middleware.js
kermingo_menu/backend/tests/configuracion.csrf.test.js
kermingo_menu/DOCUMENTACION/IA/DEPLOY.md
kermingo_menu/DOCUMENTACION/IA/AUTENTICACION.md
```

## Guía de solución

### 1. Separar comportamiento por entorno

Regla recomendada:

```txt
development:
- permitir localhost;
- permitir FRONTEND_URL;
- permitir FRONTEND_EXTRA_ORIGINS si está explícitamente configurado;
- opcional LAN solo si se define variable.

production:
- permitir solo FRONTEND_URL;
- permitir FRONTEND_EXTRA_ORIGINS solo si está explícitamente configurado;
- no permitir regex automática de LAN;
- no permitir wildcard.
```

### 2. Revisar configuración de CORS

En `environments.js`, debería existir algo parecido a:

```js
frontendUrl: process.env.FRONTEND_URL,
frontendExtraOrigins: process.env.FRONTEND_EXTRA_ORIGINS
  ? process.env.FRONTEND_EXTRA_ORIGINS.split(',').map((origin) => origin.trim())
  : [],
```

Construcción segura:

```js
const trustedOrigins = [
  frontendUrl,
  ...frontendExtraOrigins,
].filter(Boolean);
```

En producción:

```js
if (isProduction && !frontendUrl) {
  throw new Error('FRONTEND_URL es requerido en producción');
}
```

### 3. Revisar `origin.middleware.js`

Debe validar `Origin` o `Referer` contra lista confiable.

Flujo recomendado:

```txt
1. Si hay Origin:
   - debe estar exactamente en trustedOrigins.
2. Si no hay Origin pero hay Referer:
   - new URL(referer).origin debe estar en trustedOrigins.
3. Si no hay Origin ni Referer:
   - rechazar en rutas mutantes admin, salvo que haya una razón explícita para permitirlo.
```

### 4. Aplicar middleware en rutas mutantes admin

Debe estar en:

```txt
POST
PUT
PATCH
DELETE
```

de rutas admin sensibles:

```txt
productos
pedidos
configuración
comprobantes/pagos
caja
```

No hace falta aplicarlo a GET públicos.

## Tests mínimos

```txt
NODE_ENV=production + Origin LAN → 403
NODE_ENV=production + Origin FRONTEND_URL → OK
NODE_ENV=development + Origin LAN permitido explícitamente → OK
Origin inválido con Referer válido → definir comportamiento y testear
Sin Origin ni Referer en ruta mutante admin → 403
```

## Criterios de aceptación

```txt
[ ] En producción no se permiten orígenes LAN automáticamente.
[ ] En producción FRONTEND_URL es obligatorio.
[ ] No hay wildcard con credentials.
[ ] requireTrustedOrigin valida Origin.
[ ] requireTrustedOrigin valida Referer si falta Origin.
[ ] Rutas admin mutantes tienen protección.
[ ] Tests CSRF/CORS pasan.
[ ] DEPLOY.md documenta variables necesarias.
```

---

# 5. P1-3 — Admin session con cookie httpOnly real

## Problema

Se agregó `AdminSessionProvider`, pero hay que verificar que no haya doble fuente de verdad entre:

```txt
- cookie httpOnly real;
- /api/auth/me;
- localStorage;
- token fake;
- lib/auth.tsx anterior.
```

El backend usa cookie httpOnly. El frontend **no debe guardar JWT real en localStorage**.

## Riesgo real

Alto para el evento.

Si la sesión se rompe al navegar, caja/pedidos/cocina pueden quedar inutilizables en pleno uso.

## Archivos a revisar

```txt
kermingo_menu/frontend/components/admin/admin-session.tsx
kermingo_menu/frontend/components/admin/login-screen.tsx
kermingo_menu/frontend/components/admin/admin-shell.tsx
kermingo_menu/frontend/lib/api.ts
kermingo_menu/frontend/lib/auth.tsx
kermingo_menu/frontend/lib/admin.ts
kermingo_menu/frontend/test/admin-session.test.ts
kermingo_menu/frontend/test/admin.test.ts
```

## Guía de solución

### 1. Centralizar sesión admin

El provider debe ser el punto de entrada:

```txt
AdminSessionProvider
useAdminSession()
```

Debe manejar:

```txt
usuario actual
loading
error
login
logout
refreshSession
handleUnauthorized
```

### 2. Login

Debe usar:

```ts
await fetch(`${API_URL}/api/auth/login`, {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email, contrasenia }),
});
```

O el endpoint real si se llama:

```txt
/api/admin/auth/login
```

Lo importante:

```txt
credentials: 'include'
```

### 3. Logout

Debe usar:

```ts
await fetch(`${API_URL}/api/auth/logout`, {
  method: 'POST',
  credentials: 'include',
});
```

### 4. Me/session

Al cargar admin:

```ts
await fetch(`${API_URL}/api/auth/me`, {
  credentials: 'include',
});
```

Si devuelve 401:

```txt
limpiar usuario local
redirigir a /admin
mostrar sesión vencida
```

### 5. No usar Authorization Bearer incorrecto

Evitar:

```ts
Authorization: `Bearer ${token}`
```

si el token real vive en cookie httpOnly.

### 6. localStorage solo como cache visual

Permitido:

```txt
guardar usuario básico para evitar parpadeo visual
```

No permitido:

```txt
usar localStorage como prueba de sesión válida
usar token fake "cookie" como credencial real
```

## Tests mínimos

```txt
login llama fetch con credentials include
logout llama fetch con credentials include
me llama fetch con credentials include
401 en me limpia sesión
401 en request admin dispara sesión vencida
no se setea Authorization Bearer
reload con cookie válida restaura usuario vía /api/auth/me
```

## Criterios de aceptación

```txt
[ ] Login guarda cookie porque usa credentials include.
[ ] Logout limpia cookie porque usa credentials include.
[ ] Admin layout valida sesión con /api/auth/me.
[ ] Navegar entre páginas admin no rompe token.
[ ] 401 muestra sesión vencida y redirige.
[ ] No hay dependencia real de JWT en localStorage.
[ ] Tests frontend de sesión pasan.
```

---

# 6. P1-4 — Configuración tienda con endpoints correctos

## Problema

La pantalla admin de configuración debe abrir/cerrar la tienda real. No puede ser solo estado local.

## Riesgo real

Alto.

Si caja/admin cree que abrió la tienda pero backend sigue cerrado, los clientes no podrán comprar. Si cree que cerró pero backend sigue abierto, pueden entrar pedidos no deseados.

## Archivos a revisar

```txt
kermingo_menu/frontend/components/admin/config-screen.tsx
kermingo_menu/frontend/lib/admin.ts
kermingo_menu/backend/src/api/routes/configuracion.routes.js
kermingo_menu/backend/src/api/controllers/configuracion.controller.js
kermingo_menu/backend/src/api/models/configuracion.model.js
```

## Endpoints esperados

Confirmar contrato real. Según planificación:

```txt
GET /api/configuracion-tienda
PUT /api/admin/configuracion-tienda
```

También puede haber:

```txt
GET /api/admin/configuracion-tienda
PATCH /api/admin/configuracion-tienda
```

No importa el nombre exacto, pero frontend y backend deben coincidir.

## Guía de solución

### 1. Centralizar API en `frontend/lib/admin.ts`

Ejemplo:

```ts
export async function getConfiguracionTienda() {
  return apiGet<ConfiguracionTienda>('/api/configuracion-tienda');
}

export async function updateConfiguracionTienda(payload: UpdateConfiguracionTiendaPayload) {
  return apiPut<ConfiguracionTienda>('/api/admin/configuracion-tienda', payload);
}
```

### 2. UI no debe usar datos fake

En `config-screen.tsx`:

```txt
- mostrar loading;
- mostrar error;
- mostrar estado real;
- guardar usando endpoint real;
- deshabilitar botón mientras guarda.
```

### 3. Manejo de 401/403

```txt
401 → sesión vencida
403 → origen no permitido / acción no autorizada
```

## Tests mínimos

```txt
config-screen carga configuración real
config-screen guarda por endpoint admin correcto
si backend responde 401, redirige login
si backend responde 403, muestra error claro
```

## Criterios de aceptación

```txt
[ ] La pantalla muestra estado real de tienda.
[ ] Abrir tienda modifica backend.
[ ] Cerrar tienda modifica backend.
[ ] Modo demo, si existe, queda claro.
[ ] No hay estado local engañoso.
[ ] Tests pasan.
[ ] Documentación actualizada.
```

---

# 7. P1-5 — Comprobantes usando metadata y `url_publica`

## Problema

La pantalla de comprobantes debe usar el endpoint admin de metadata y no asumir que puede obtener bytes del archivo o cargar Drive directo como imagen.

## Riesgo real

Alto/medio.

Si caja no puede abrir comprobantes, no puede validar pagos por transferencia.

## Archivos a revisar

```txt
kermingo_menu/frontend/components/admin/comprobantes-screen.tsx
kermingo_menu/frontend/lib/admin.ts
kermingo_menu/backend/src/api/controllers/pedido.controller.js
kermingo_menu/backend/src/api/models/archivo.model.js
```

## Contrato esperado

Endpoint:

```txt
GET /api/admin/pedidos/:id/comprobante
```

Debe devolver metadata segura:

```txt
id
nombre_original
mime_type
tamanio_bytes
url_publica
drive_id
created_at
```

El frontend debe usar:

```txt
url_publica
```

como link de abrir/ver comprobante.

## Guía de solución

### 1. Crear función API

En `frontend/lib/admin.ts`:

```ts
export async function getComprobantePedido(pedidoId: number) {
  return apiGet<ComprobanteMetadata>(`/api/admin/pedidos/${pedidoId}/comprobante`);
}
```

### 2. UI de comprobantes

En `comprobantes-screen.tsx`:

```txt
- listar pedidos con estado_pago = comprobante_subido o rechazado/pendiente accionable;
- seleccionar pedido;
- cargar metadata de comprobante;
- mostrar nombre original;
- mostrar tipo/tamaño;
- botón "Abrir comprobante";
- acciones "Marcar pagado" y "Rechazar";
- manejar sin comprobante;
- manejar error de Drive/url.
```

### 3. No asumir iframe/imagen

Puede hacerse:

```tsx
<a href={comprobante.url_publica} target="_blank" rel="noopener noreferrer">
  Abrir comprobante
</a>
```

Si se decide embebber, hacerlo solo si MIME es imagen/PDF y con fallback.

## Tests mínimos

```txt
renderiza comprobante con metadata
abre url_publica
sin comprobante muestra estado vacío
aprobar llama PATCH pago
rechazar llama PATCH pago
error 401 maneja sesión vencida
```

## Criterios de aceptación

```txt
[ ] Comprobantes no usa endpoint inexistente de bytes.
[ ] Comprobantes muestra metadata.
[ ] Comprobantes permite abrir url_publica.
[ ] Aprobar pago funciona.
[ ] Rechazar pago funciona.
[ ] Maneja comprobante faltante.
[ ] Maneja sesión vencida.
```

---

# 8. P1-6 — Revisar eliminación de `diseno-de-landing-kermingo/`

## Problema

El diff contra `main` muestra que `diseno-de-landing-kermingo/` fue eliminado. El usuario indicó que esa carpeta era referencia visual en etapas anteriores.

## Riesgo real

Medio.

No rompe producción si el frontend ya fue copiado, pero puede romper la documentación/flujo de trabajo con IA si los prompts siguen diciendo que la carpeta existe.

## Archivos/rutas involucradas

```txt
kermingo_menu/diseno-de-landing-kermingo/
kermingo_menu/AGENTS.md
kermingo_menu/docs/planificacion/55-INSTRUCCIONES_OPENCODE_ADMIN_B7_FRONT_BACK.md
kermingo_menu/DOCUMENTACION/IA/WEBAPP.md
```

## Guía de solución

Elegir una estrategia explícita.

### Opción A — Mantener fuera de Git

Si la carpeta es solo local:

```txt
- dejarla en .gitignore;
- documentar que es referencia visual local no versionada;
- no depender de ella para CI/build;
- actualizar AGENTS.md y docs.
```

### Opción B — Mantener versionada

Si otros agentes/devs necesitan verla:

```txt
- revertir eliminación;
- dejar carpeta versionada;
- no tocarla salvo actualizaciones intencionales.
```

### Opción C — Reemplazar por documentación

Si ya no hace falta la carpeta:

```txt
- eliminarla del repo;
- crear DOCUMENTACION/IA/REFERENCIAS_VISUALES.md;
- incluir capturas, links de v0/Figma, decisiones visuales;
- actualizar prompts que dicen que hay que leer esa carpeta.
```

## Recomendación

Para este snapshot, conviene no mezclar cleanup con funcionalidad. Recomendación:

```txt
- revertir eliminación en este branch funcional;
- hacer otro PR de cleanup si querés sacarla.
```

## Criterios de aceptación

```txt
[ ] La decisión está documentada.
[ ] AGENTS.md no apunta a carpeta inexistente.
[ ] docs/planificacion no apunta a carpeta inexistente.
[ ] CI no depende de esa carpeta.
[ ] El PR funcional no mezcla cleanup innecesario.
```

---

# 9. P2-1 — Dividir PR o separar responsabilidades

## Problema

El snapshot mezcla muchos tipos de cambios:

```txt
backend
frontend público
admin completo
CI
docs
OpenSpec
cleanup
assets
tests
eliminaciones
```

## Riesgo

Difícil revisar, difícil revertir, difícil detectar regresiones.

## Guía de solución recomendada

Si todavía no abriste PR final, dividir en:

```txt
PR 1 — Backend B7 rules + tests
- público solo transferencia
- CORS/Origin dev/prod
- tests backend

PR 2 — Frontend público ticket/checkout/tracking
- menú/carrito/checkout transfer-only
- ticket/QR/seguimiento
- tests frontend públicos

PR 3 — Admin session + shell
- AdminSessionProvider
- sidebar/drawer
- login/logout/me
- tests auth admin

PR 4 — Admin operativo
- dashboard
- caja
- pedidos
- cocina
- comprobantes
- config
- productos

PR 5 — CI + docs + cleanup
- workflows
- OpenSpec
- DOCUMENTACION/IA
- eliminar diseno-de-landing-kermingo si corresponde
```

## Alternativa si no querés dividir tanto

```txt
PR A — Funcionalidad B7
PR B — Cleanup/docs/CI
```

## Criterios de aceptación

```txt
[ ] El PR final no mezcla funcionalidad crítica con cleanup innecesario.
[ ] Cada PR tiene tests claros.
[ ] Cada PR se puede revertir sin romper todo.
```

---

# 10. P2-2 — Componentes admin grandes

## Problema

Algunos componentes admin parecen muy grandes:

```txt
frontend/components/admin/orders-screen.tsx
frontend/components/admin/cocina-screen.tsx
frontend/components/admin/dashboard-screen.tsx
frontend/components/admin/products-screen.tsx
frontend/components/admin/caja-screen.tsx
```

## Riesgo

Medio.

Puede funcionar, pero es difícil corregir rápido durante el evento.

## Guía de refactor progresivo

No hacerlo todo ahora si no hace falta. Extraer solo donde haya lógica compleja.

### Pedidos

```txt
OrderList
OrderDetail
OrderFilters
OrderStatusBadge
PaymentStatusBadge
OrderActions
```

### Cocina

```txt
KitchenColumn
KitchenOrderCard
KitchenStatusActions
```

### Caja

```txt
CajaProductGrid
CajaProductButton
CajaCartSummary
CajaPaymentSelector
```

### Productos

```txt
ProductTable
ProductFormDialog
ProductImageControl
ProductStockControl
```

## Criterios de aceptación

```txt
[ ] No se rompe UI.
[ ] No se rompe build.
[ ] La lógica de API queda fuera de componentes gigantes.
[ ] Los subcomponentes reciben props claras.
[ ] Tests existentes siguen pasando.
```

---

# 11. P2-3 — Assets demo de comprobantes en `public/`

## Problema

Se agregaron imágenes tipo:

```txt
frontend/public/bank-transfer-confirmation.png
frontend/public/blurry-payment-receipt.png
frontend/public/mobile-banking-transfer-receipt.png
frontend/public/transfer-receipt-screenshot.png
```

## Riesgo

Bajo/medio.

Pueden confundirse con archivos reales o quedar como demo visible en producción.

## Guía de solución

Opciones:

```txt
1. Borrarlas si no se usan.
2. Moverlas a frontend/public/demo/.
3. Renombrarlas con prefijo demo-.
```

Ejemplo:

```txt
frontend/public/demo/demo-bank-transfer-confirmation.png
```

## Criterios de aceptación

```txt
[ ] No hay assets demo con nombres que parezcan reales.
[ ] Si se usan en tests, están en carpeta demo.
[ ] No aparecen en UI productiva salvo modo demo explícito.
```

---

# 12. P2-4 — Fallback LAN frontend controlado

## Problema

El frontend puede necesitar fallback LAN para probar desde celular/tablet, pero no debe activarse en producción sin control.

## Archivos a revisar

```txt
kermingo_menu/frontend/lib/config.ts
kermingo_menu/DOCUMENTACION/IA/DEPLOY.md
```

## Guía de solución

Regla:

```txt
NEXT_PUBLIC_API_URL manda.
Si no existe:
- development puede usar localhost.
- production debe fallar o advertir claramente.
```

Ejemplo:

```ts
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_API_URL) {
  console.warn('NEXT_PUBLIC_API_URL no está configurada en producción');
}
```

Mejor aún: no hacer fallback silencioso en producción.

## Criterios de aceptación

```txt
[ ] En producción usa NEXT_PUBLIC_API_URL.
[ ] No usa IP LAN hardcodeada en producción.
[ ] DEPLOY.md documenta NEXT_PUBLIC_API_URL.
[ ] Prueba LAN dev documentada.
```

---

# 13. P2-5 — Reportes como placeholder claro

## Problema

Si reportes todavía no está integrado, no debe mostrar datos falsos.

## Archivo

```txt
kermingo_menu/frontend/components/admin/reportes-screen.tsx
```

## Guía de solución

Mientras no haya endpoints reales:

```txt
- mostrar “Reportes en integración”;
- mostrar qué reportes estarán disponibles;
- no mostrar totales fake;
- no simular exportaciones reales.
```

Reportes mínimos futuros:

```txt
- total recaudado;
- ventas por método de pago;
- ventas por producto;
- pedidos por estado;
- export Excel/PDF si backend lo soporta.
```

## Criterios de aceptación

```txt
[ ] No hay métricas fake.
[ ] El estado pendiente es claro.
[ ] No confunde al usuario admin.
```

---

# 14. P2-6 — Validar OpenSpec después del cleanup

## Problema

El diff muestra muchas carpetas de `openspec/changes/*` removidas y archivos archive nuevos.

## Riesgo

Bajo/medio.

Puede no afectar app, pero sí el método SDD y documentación viva.

## Guía de solución

Ejecutar:

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu
openspec validate
```

o el comando real instalado para OpenSpec/Gentle AI.

Revisar:

```txt
openspec/specs/
openspec/changes/archive/
openspec/changes/b7-admin-v0-front-back/
```

## Criterios de aceptación

```txt
[ ] OpenSpec valida sin errores.
[ ] Cambios activos son solo los que siguen pendientes.
[ ] Cambios cerrados están archivados.
[ ] No se perdió contexto crítico de B5/B6.
```

---

# 15. P3 — Mejoras menores

## P3-1 — Resolver warnings de lint

```txt
pnpm lint: 0 errores, 4 warnings
```

### Criterios

```txt
[ ] Ideal: 0 warnings.
[ ] Mínimo: warnings documentados y no riesgosos.
```

## P3-2 — Documentación extensa con índice

Archivos como `DOCUMENTACION/IA/WEBAPP.md` pueden crecer mucho.

### Mejorar con:

```txt
- índice;
- estado actual;
- pendiente;
- endpoints usados;
- decisiones importantes;
- gotchas.
```

## P3-3 — Checklist manual por dispositivo

Crear o actualizar:

```txt
DOCUMENTACION/IA/TESTING.md
```

Agregar:

```txt
Notebook caja
Tablet cocina
Celular compra pública
Celular seguimiento
```

---

# 16. Checklist de pruebas manuales E2E

## Compra pública transferencia

```txt
[ ] Abrir frontend público desde celular.
[ ] Ir a /menu.
[ ] Agregar productos al carrito.
[ ] Ir a checkout.
[ ] Verificar que solo aparece transferencia.
[ ] Subir comprobante.
[ ] Confirmar pedido.
[ ] Ver ticket/código.
[ ] Guardar token de seguimiento.
[ ] Ver pedido en admin.
[ ] Ver comprobante en admin.
[ ] Marcar pago como pagado.
[ ] Ver cambio en seguimiento.
```

## Intento público efectivo

```txt
[ ] Desde UI no existe opción efectivo.
[ ] Desde API/curl POST /api/pedidos con efectivo devuelve 400.
```

## Caja efectiva

```txt
[ ] Login admin.
[ ] Ir a Caja.
[ ] Crear pedido con nombre o “Caja”.
[ ] Método efectivo.
[ ] Registrar venta.
[ ] Ver pedido en pedidos/cocina.
[ ] Marcar entregado.
```

## Caja transferencia

```txt
[ ] Crear pedido desde caja.
[ ] Método transferencia.
[ ] Registrar venta.
[ ] Ver estado de pago esperado.
[ ] Marcar pago si corresponde.
[ ] Entregar.
```

## Configuración tienda

```txt
[ ] Admin ve estado actual.
[ ] Cerrar tienda.
[ ] Intentar compra pública: debe bloquear.
[ ] Abrir tienda.
[ ] Compra pública vuelve a funcionar.
```

## Sesión admin

```txt
[ ] Login.
[ ] Navegar Dashboard → Caja → Pedidos → Cocina → Comprobantes → Productos → Config.
[ ] Refrescar página.
[ ] Sesión sigue válida si cookie existe.
[ ] Logout.
[ ] Volver a ruta admin redirige a login.
```

## Drive/comprobantes

```txt
[ ] Comprobante subido aparece en Drive.
[ ] Metadata aparece en admin.
[ ] url_publica abre el archivo.
[ ] Aprobar/rechazar funciona.
```

---

# 17. Comandos de verificación

## Backend

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/backend
npm test
```

Opcional si hay tests específicos:

```bash
npm test -- --testPathPattern=comprobantes
npm test -- --testPathPattern=caja
npm test -- --testPathPattern=configuracion
```

## Frontend

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/frontend
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

## OpenSpec

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu
openspec validate
```

Si el comando exacto cambia por Gentle AI/OpenSpec local, usar el equivalente.

---

# 18. Prompt recomendado para OpenCode

Copiar en OpenCode:

```txt
Continuemos con Kermingo.

Estoy en el branch:

feature/frontend-ticket-qr

Commit auditado:

292fa01259b9f911b97981445cb5609de6105998

Objetivo:
corregir los hallazgos P1 de la auditoría B7 antes de mergear a main o preparar deploy.

Trabajar bajo SDD/Gentle AI si está disponible.
No hacer commit hasta mostrar resumen final.
No subir .env ni secretos.
No tocar credenciales.
No hacer refactor masivo salvo donde sea necesario.

## Prioridad P1

1. Backend: POST /api/pedidos público debe aceptar solo transferencia con comprobante.
   - efectivo público debe devolver 400;
   - transferencia sin comprobante debe devolver 400;
   - transferencia con comprobante debe seguir funcionando;
   - caja admin debe permitir efectivo y transferencia.

2. Backend: revisar CORS/CSRF.
   - producción solo FRONTEND_URL y FRONTEND_EXTRA_ORIGINS explícitos;
   - no permitir LAN automático en producción;
   - development puede permitir LAN solo si está explícitamente configurado;
   - requireTrustedOrigin debe validar Origin/Referer;
   - rutas admin mutantes deben estar protegidas.

3. Frontend admin: sesión con cookie httpOnly real.
   - login con credentials include;
   - logout con credentials include;
   - /api/auth/me con credentials include;
   - no guardar JWT real en localStorage;
   - no usar Authorization Bearer incorrecto;
   - si 401, limpiar sesión y redirigir a /admin.

4. Frontend configuración:
   - verificar que config-screen use endpoints reales:
     GET /api/configuracion-tienda
     PUT /api/admin/configuracion-tienda
     o los endpoints reales definidos por backend;
   - no usar estado local engañoso.

5. Frontend comprobantes:
   - usar GET /api/admin/pedidos/:id/comprobante para metadata;
   - usar url_publica como link;
   - no asumir endpoint directo de bytes;
   - permitir aprobar/rechazar pago.

6. Repo cleanup:
   - revisar eliminación de diseno-de-landing-kermingo/;
   - si la carpeta sigue siendo referencia visual, revertir eliminación o actualizar AGENTS/docs para que no apunten a una carpeta inexistente;
   - no mezclar cleanup innecesario con funcionalidad si puede separarse.

## Agregar o confirmar tests

Backend:
- POST /api/pedidos efectivo público → 400.
- POST /api/pedidos transferencia sin comprobante → 400.
- POST /api/pedidos transferencia con comprobante → 201.
- POST /api/admin/pedidos/caja efectivo → 201.
- POST /api/admin/pedidos/caja transferencia → 201.
- Origin LAN en production → 403.
- Origin válido production → OK.
- Config admin mutante sin Origin/Referer → 403.

Frontend:
- checkout no muestra efectivo.
- checkout transferencia exige comprobante.
- AdminSession login/logout/me usan credentials include.
- AdminSession 401 limpia sesión.
- config-screen usa endpoint correcto.
- comprobantes-screen renderiza metadata/url_publica.

## Ejecutar verificación

Backend:
cd backend
npm test

Frontend:
cd frontend
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build

OpenSpec:
cd ..
openspec validate

## Resultado esperado

Responder con:

# Resultado corrección auditoría B7

## Cambios backend
-

## Cambios frontend
-

## Cambios documentación/OpenSpec
-

## Tests agregados/modificados
-

## Verificación ejecutada
-

## Pendientes
-

## ¿Listo para merge?
Sí/No, con justificación.
```

---

# 19. Checklist final de aceptación pre-merge

## Backend

```txt
[ ] npm test pasa.
[ ] POST público solo transferencia.
[ ] Efectivo público bloqueado por backend.
[ ] Caja permite efectivo/transferencia.
[ ] Transferencia pública requiere comprobante.
[ ] CORS producción no permite LAN automático.
[ ] CSRF Origin/Referer protege rutas admin mutantes.
[ ] Configuración tienda funciona realmente.
[ ] Comprobantes metadata funciona.
```

## Frontend

```txt
[ ] pnpm test pasa.
[ ] pnpm lint sin errores.
[ ] pnpm exec tsc --noEmit pasa.
[ ] pnpm build pasa.
[ ] Checkout público no muestra efectivo.
[ ] Checkout público exige comprobante.
[ ] Admin session usa cookie httpOnly y /api/auth/me.
[ ] Navegar admin no da error de token.
[ ] Config admin usa backend real.
[ ] Comprobantes abre url_publica.
[ ] Caja crea pedidos reales.
```

## Documentación/repo

```txt
[ ] AGENTS.md no apunta a carpetas inexistentes.
[ ] DOCUMENTACION/IA está alineada con código.
[ ] OpenSpec valida.
[ ] diseno-de-landing-kermingo/ tiene decisión explícita.
[ ] Assets demo están marcados o movidos.
[ ] No hay .env ni secretos.
```

---

# 20. Veredicto final esperado después de corregir

Cuando todos los P1 estén resueltos y la verificación pase:

```txt
Veredicto: APROBADO PARA MERGE A MAIN
Condición: todavía requiere prueba manual completa antes de producción real/evento.
```

Para producción/evento, además:

```txt
[ ] prueba en notebook caja;
[ ] prueba en tablet cocina/entrega;
[ ] prueba en celular con datos móviles;
[ ] prueba Drive real;
[ ] prueba Railway/Vercel;
[ ] backup DB;
[ ] runbook de emergencia.
```
