# 31 — Etapa B5.1: Fixes de seguridad, validación y stock antes de B6

## Objetivo

Este documento convierte la auditoría del backend B5 de Kermingo en una etapa ejecutable para OpenCode.

La auditoría detectó que el backend está bien encaminado, pero **no conviene avanzar todavía a B6 — Caja, Cocina y Reportes** hasta cerrar una etapa corta de fixes críticos.

## Veredicto de auditoría

```txt
Backend B5:
- Diseño general: bueno
- MVC: correcto
- Base de datos: correcta
- Auth: funcional, requiere hardening CSRF/origin
- Stock: buena base, requiere acumulación de requerimientos
- Validación: requiere fix crítico porque Zod parsea pero no reemplaza req.body/query/params
- Puede avanzar a B6: NO todavía
```

## Etapa requerida

```txt
B5.1 — Fixes de seguridad, validación y stock
```

Esta etapa debe completarse y verificarse antes de seguir con:

```txt
B6 — Caja, Cocina, Comprobantes, Reportes
```

---

# 1. Contexto del proyecto

Kermingo es un sistema web para un evento scout recaudatorio del 20 de junio de 2026.

Organizan:

```txt
Grupo Scout San Patricio
Tropa Raider “Compañía de Jesús”
Comunidad Raider “Fortaleza de María”
```

Stack backend:

```txt
Node.js
Express
MySQL
mysql2/promise
ESM
JWT en cookie httpOnly
bcrypt
Zod
CORS con credentials
```

Estructura actual:

```txt
backend/                         # backend activo
frontend/                        # frontend activo Next.js
diseno-de-landing-kermingo/       # referencia visual v0, solo lectura
docs/planificacion/               # documentación viva
openspec/                         # specs SDD/OpenSpec
.agents/skills/                   # skills locales
```

Regla crítica:

```txt
NO modificar diseno-de-landing-kermingo/
NO trabajar frontend en esta etapa
NO avanzar a B6 hasta cerrar B5.1
```

---

# 2. Documentación que OpenCode debe leer antes de ejecutar

Antes de modificar código, leer:

```txt
AGENTS.md
docs/planificacion/00-INDICE-MAESTRO.md
docs/planificacion/04-BACKEND_API_EXPRESS_MYSQL.md
docs/planificacion/05-BASE_DE_DATOS_MYSQL.md
docs/planificacion/06-ENDPOINTS_API.md
docs/planificacion/09-AUTH_COOKIES_CORS.md
docs/planificacion/13-FLUJOS_FUNCIONALES.md
docs/planificacion/17-TAREAS_BACKEND_DETALLADAS.md
docs/planificacion/27-CHECKPOINTS_TESTING_AUDITORIA.md
docs/planificacion/28-CHECKLIST_MANUAL_TESTING.md
docs/planificacion/29-PROMPT_AUDITORIA_CHATGPT.md
docs/planificacion/31-B5_1_FIXES_SEGURIDAD_VALIDACION_STOCK.md
```

También revisar:

```txt
openspec/
.agents/skills/
docs/changelog-ia.md
docs/estado-actual.md
docs/mapa-archivos.md
```

Si algún archivo no existe, OpenCode debe informarlo y seguir con criterio conservador, sin inventar reglas que contradigan `AGENTS.md`.

---

# 3. Metodología obligatoria

Trabajar con SDD usando Gentle AI.

Pipeline esperado:

```txt
explore → propose → spec → design → tasks → apply → verify → archive
```

No saltar directo a codear.

OpenCode debe:

1. Explorar estado actual.
2. Leer documentación.
3. Revisar specs OpenSpec actuales.
4. Crear cambio OpenSpec para B5.1.
5. Diseñar fixes.
6. Aplicar cambios chicos.
7. Verificar con curl/tests manuales.
8. Archivar cambio si todo pasa.
9. Actualizar documentación viva.

Nombre sugerido del cambio OpenSpec:

```txt
backend-b5-1-security-validation-stock-fixes
```

---

# 4. Hallazgos críticos a corregir

## CRIT-1 — Middleware de validación no reemplaza req.body/query/params

### Problema

`validate.middleware.js` ejecuta:

```js
schema.parse(req.body);
next();
```

Pero no guarda el resultado validado.

Esto permite que el controlador siga usando el objeto original, incluyendo campos no permitidos por Zod.

### Riesgos

Un cliente podría enviar campos no permitidos:

```json
{
  "nombre_cliente": "Test",
  "metodo_pago": "efectivo",
  "estado_pago": "pagado",
  "estado_pedido": "entregado",
  "items": []
}
```

Si el modelo usa `data.estado_pago || 'pendiente'`, se puede terminar creando un pedido público con estado manipulado.

También puede afectar productos si se usa `INSERT INTO producto SET ?`.

### Archivos a revisar/modificar

```txt
backend/src/api/middlewares/validate.middleware.js
backend/src/api/schemas/pedido.schema.js
backend/src/api/schemas/producto.schema.js
backend/src/api/schemas/auth.schema.js
backend/src/api/controllers/pedido.controller.js
backend/src/api/controllers/producto.controller.js
backend/src/api/models/pedido.model.js
backend/src/api/models/producto.model.js
```

### Fix requerido

Modificar middleware para asignar resultado validado:

```js
export function validateBody(schema) {
  return (req, _res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}
```

También para query y params:

```js
req.query = schema.parse(req.query);
req.params = schema.parse(req.params);
```

Agregar `.strict()` a schemas críticos para rechazar campos extra.

Ejemplo:

```js
z.object({
  nombre_cliente: z.string().min(1),
  metodo_pago: z.enum(['transferencia', 'efectivo'])
}).strict()
```

### Criterio de aceptación

- Los schemas devuelven datos validados y limpios.
- Campos no permitidos son rechazados.
- `estado_pago` y `estado_pedido` no pueden ser manipulados desde `POST /api/pedidos` público.
- Los controladores usan `req.body` ya validado.
- No hay mass assignment accidental en productos.

---

## CRIT-2 — Stock se valida por ítem, pero no acumula requerimientos totales

### Problema

`SELECT FOR UPDATE` bloquea filas, pero la lógica valida cada ítem individualmente.

Esto falla cuando un mismo producto aparece más de una vez directa o indirectamente.

Ejemplo:

```txt
Stock Coca Cola = 60

Pedido:
- 10 Coca Cola directas
- 60 Promo cena, cada promo descuenta 1 Coca Cola

Validación individual:
10 <= 60
60 <= 60

Realidad:
70 > 60
```

Puede dejar stock negativo.

### Archivos a revisar/modificar

```txt
backend/src/api/models/pedido.model.js
backend/src/api/schemas/pedido.schema.js
```

### Fix requerido

En `createWithTransaction`:

1. Expandir items.
2. Si el producto es `promo`, reemplazar por sus componentes de `combo_producto`.
3. Acumular cantidades por producto componente.
4. Bloquear productos requeridos en orden determinístico.
5. Validar stock total acumulado.
6. Descontar stock usando cantidades acumuladas.
7. No descontar stock del producto tipo `promo`.

Estructura conceptual:

```js
const requerimientos = new Map();

function agregarRequerimiento(productoId, cantidad) {
  requerimientos.set(productoId, (requerimientos.get(productoId) || 0) + cantidad);
}
```

Para producto normal:

```txt
agregarRequerimiento(producto.id, item.cantidad)
```

Para promo:

```txt
agregarRequerimiento(componente.producto_id, componente.cantidad * item.cantidad)
```

Luego bloquear:

```sql
SELECT id, nombre, stock_limitado, stock_actual
FROM producto
WHERE id IN (...)
ORDER BY id
FOR UPDATE
```

Luego actualizar defensivamente:

```sql
UPDATE producto
SET stock_actual = stock_actual - ?
WHERE id = ?
  AND stock_limitado = 1
  AND stock_actual >= ?
```

Verificar `affectedRows`.

### Criterio de aceptación

- Si un producto aparece duplicado, se valida contra la suma total.
- Si una promo consume componentes, se valida contra componentes.
- Una promo no descuenta su propio stock.
- No puede quedar stock negativo.
- La transacción hace rollback si falta stock.

---

## CRIT-3 — Riesgo CSRF con cookie SameSite=None

### Problema

En producción la cookie admin necesita:

```txt
sameSite=None
secure=true
httpOnly=true
```

porque frontend Vercel y backend Railway están en dominios distintos.

Pero con cookies cross-site y `express.urlencoded`, un sitio externo podría intentar enviar formularios a rutas admin si el navegador manda la cookie.

CORS no bloquea todos los formularios HTML tradicionales.

### Archivos a revisar/modificar

```txt
backend/src/app.js
backend/src/api/config/environments.js
backend/src/api/middlewares/admin.middleware.js
backend/src/api/routes/auth.routes.js
backend/src/api/routes/producto.routes.js
backend/src/api/routes/pedido.routes.js
```

### Fix mínimo recomendado

Agregar middleware de protección para métodos no seguros en rutas admin:

```txt
POST
PUT
PATCH
DELETE
```

Validar `Origin` contra `FRONTEND_URL`.

Si no hay `Origin`, validar `Referer` de forma conservadora.

Nombre sugerido:

```txt
backend/src/api/middlewares/origin.middleware.js
```

Ejemplo conceptual:

```js
export function requireTrustedOrigin(req, _res, next) {
  const unsafeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  if (!unsafeMethods.includes(req.method)) {
    return next();
  }

  const origin = req.get('origin');
  const referer = req.get('referer');

  if (origin === environments.frontendUrl) {
    return next();
  }

  if (!origin && referer?.startsWith(environments.frontendUrl)) {
    return next();
  }

  throw new AuthError('Origen no permitido');
}
```

Aplicarlo a rutas admin que modifican datos.

### Fix opcional adicional

Rechazar formularios urlencoded en rutas admin mutantes y aceptar solo JSON/multipart donde corresponda.

### Criterio de aceptación

- Rutas admin mutantes rechazan origin no confiable.
- Frontend autorizado sigue funcionando.
- Login/logout no quedan vulnerables a CSRF obvio.
- CORS sigue con `credentials: true` y origin restrictivo.

---

## CRIT-4 — No se controla configuracion_tienda.estado al crear pedidos

### Problema

La base tiene:

```sql
configuracion_tienda.estado ENUM('abierta','cerrada','demo')
```

Pero `POST /api/pedidos` permite crear pedidos aunque la tienda esté `cerrada` o `demo`.

### Archivos a revisar/modificar

```txt
backend/src/api/models/pedido.model.js
backend/src/api/database/schema.sql
backend/src/api/database/seed.sql
docs/planificacion/13-FLUJOS_FUNCIONALES.md
```

### Regla confirmada por Marcos

```txt
estado = abierta  → permite pedidos reales
estado = cerrada  → no permite crear pedidos
estado = demo     → no permite crear pedidos reales; frontend usa flujo mock/demo
```

### Fix requerido

Al inicio de la transacción de creación de pedido:

```sql
SELECT estado
FROM configuracion_tienda
WHERE id = 1
FOR UPDATE
```

Si no está `abierta`, lanzar error.

### Criterio de aceptación

- Con tienda `cerrada`, `POST /api/pedidos` falla.
- Con tienda `demo`, `POST /api/pedidos` falla.
- Con tienda `abierta`, permite crear pedido.
- El modo demo no guarda pedidos reales en base.

---

# 5. Hallazgos importantes a corregir

## IMP-1 — Transferencia todavía no exige comprobante

### Problema

La regla funcional dice:

```txt
Transferencia online → comprobante obligatorio
Efectivo online → sin comprobante
```

Pero actualmente B5 puede crear transferencia sin comprobante.

### Decisión para B5.1

Como Google Drive/Multer puede estar planificado para etapa posterior, hay dos opciones:

### Opción A — Bloquear transferencia online hasta implementar comprobantes

Recomendada si el frontend todavía no está conectado al checkout real.

```txt
POST /api/pedidos con metodo_pago=transferencia → 400/422 "Comprobante requerido"
```

### Opción B — Permitir transferencia pendiente temporalmente

Solo si queda muy documentado como deuda técnica.

### Recomendación

Para mantener consistencia funcional, en B5.1 bloquear transferencia online sin comprobante o dejarlo explícitamente pendiente pero marcado como bloqueante antes de conectar checkout real.

---

## IMP-2 — cancelWithTransaction devuelve undefined en éxito

### Problema

Al final de la función se devuelve algo como:

```js
return pedRows.affectedRows;
```

Pero `pedRows` viene de un `SELECT`, no del `UPDATE`.

### Fix requerido

Guardar el resultado del update:

```js
const [updateResult] = await conn.query(
  "UPDATE pedido SET estado_pedido = 'cancelado' WHERE id = ?",
  [id]
);

await conn.commit();
return updateResult.affectedRows;
```

### Criterio de aceptación

- Cancelación exitosa devuelve `1`.
- Pedido inexistente devuelve `0`.
- Pedido ya cancelado devuelve `-1` o el valor acordado.
- Controller responde correctamente.

---

## IMP-3 — Normalización de teléfono WhatsApp insuficiente

### Problema

La normalización actual puede eliminar `54` pero no garantiza formato para WhatsApp.

### Fix requerido

Crear función más clara:

```txt
input original → telefono_cliente
normalizado WhatsApp → telefono_whatsapp
```

Reglas mínimas:

1. Dejar solo dígitos.
2. Si empieza con `549`, conservar.
3. Si empieza con `54`, transformar a `549...`.
4. Si empieza con `0`, quitar 0.
5. Para números argentinos locales razonables, prefijar `549`.
6. Si no se puede normalizar, devolver `null`.

### Archivo sugerido

Puede quedarse en `pedido.model.js` por ahora o moverse a:

```txt
backend/src/api/utils/telefono.utils.js
```

Mejor opción: crear `telefono.utils.js`.

### Criterio de aceptación

- No rompe si teléfono viene vacío.
- No guarda caracteres raros en `telefono_whatsapp`.
- Devuelve `null` si no puede normalizar.
- Mantiene `telefono_cliente` como lo escribió el usuario.

---

## IMP-4 — Login revela cuenta inactiva

### Problema

Actualmente puede responder:

```txt
Cuenta inactiva
```

Eso revela que el email existe.

### Fix recomendado

Responder siempre:

```txt
Credenciales inválidas
```

Para email inexistente, contraseña incorrecta o usuario inactivo.

### Criterio de aceptación

- No se puede distinguir si el email existe.
- El backend puede loguear internamente si se desea, pero no revelar al cliente.

---

## IMP-5 — FRONTEND_URL no requerido en producción

### Problema

CORS depende de `FRONTEND_URL`, pero puede no ser obligatorio en producción.

### Fix requerido

En `environments.js`, agregar `FRONTEND_URL` como requerido en producción.

También revisar `.env.example`.

### Variables mínimas recomendadas

```env
FRONTEND_URL=http://localhost:3000
JWT_SECRET=...
JWT_EXPIRES_IN=24h
COOKIE_NAME=kermingo_admin_token
```

### Criterio de aceptación

- En producción, si falta `FRONTEND_URL`, el backend falla rápido.
- `.env.example` documenta JWT y cookie.

---

## IMP-6 — Cookie hardcodeada como token

### Problema

Auth usa cookie:

```txt
token
```

Hardcodeada.

### Fix requerido

Agregar a environments:

```js
cookie: {
  name: process.env.COOKIE_NAME || 'kermingo_admin_token'
}
```

Usar en:

```txt
auth.controller.js
admin.middleware.js
```

### Criterio de aceptación

- Nombre de cookie configurable por env.
- Logout limpia la misma cookie.
- Middleware lee la misma cookie.

---

## IMP-7 — Productos API no maneja categorías, imagen ni componentes de promo

### Estado

No es obligatorio para B5.1 si el foco es seguridad y stock.

Pero antes de conectar ABM real del frontend, debe resolverse.

### Dejar documentado

Crear pendiente para etapa Productos API avanzada:

```txt
POST /api/admin/productos debe manejar categorias y componentes de promo en transacción.
```

---

## IMP-8 — Productos públicos no calculan disponibilidad real de promos

### Estado

No necesariamente en B5.1, pero debe quedar planificado.

### Recomendación

Cuando se conecte frontend:

```json
{
  "stock_calculado": 10,
  "agotado": false
}
```

Para promos, `stock_calculado` se calcula por componentes.

---

## IMP-9 — Script test existe pero Jest/Supertest no instalados

### Problema

`package.json` puede tener script `test`, pero faltan devDependencies.

### Fix recomendado

Si B5.1 incluye tests automáticos:

```bash
npm install -D jest supertest
```

Si no, documentar que tests automáticos se implementan en etapa específica.

---

# 6. Sugerencias no bloqueantes

Estas mejoras no bloquean B6, pero son recomendables.

## SUG-1 — Rate limiting en login

Agregar `express-rate-limit` para:

```txt
POST /api/auth/login
```

## SUG-2 — Helmet

Agregar:

```bash
npm install helmet
```

Y en `app.js`:

```js
app.use(helmet());
```

## SUG-3 — Limitar tamaño JSON

En `app.js`:

```js
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
```

## SUG-4 — Búsqueda admin por teléfono

En pedidos admin, incluir:

```sql
telefono_cliente LIKE ?
```

## SUG-5 — Transiciones de pedido más flexibles

Evaluar si admin puede pasar:

```txt
recibido → listo
recibido → entregado
en_preparacion → entregado
```

Para evento real, la fluidez puede valer más que una máquina de estados estricta.

---

# 7. Archivos principales a revisar/modificar

## Backend

```txt
backend/src/api/middlewares/validate.middleware.js
backend/src/api/middlewares/admin.middleware.js
backend/src/api/middlewares/origin.middleware.js
backend/src/api/controllers/auth.controller.js
backend/src/api/controllers/pedido.controller.js
backend/src/api/controllers/producto.controller.js
backend/src/api/models/pedido.model.js
backend/src/api/models/producto.model.js
backend/src/api/models/usuario.model.js
backend/src/api/schemas/auth.schema.js
backend/src/api/schemas/pedido.schema.js
backend/src/api/schemas/producto.schema.js
backend/src/api/config/environments.js
backend/src/app.js
backend/.env.example
backend/package.json
```

## Documentación

```txt
docs/planificacion/06-ENDPOINTS_API.md
docs/planificacion/09-AUTH_COOKIES_CORS.md
docs/planificacion/13-FLUJOS_FUNCIONALES.md
docs/planificacion/17-TAREAS_BACKEND_DETALLADAS.md
docs/planificacion/27-CHECKPOINTS_TESTING_AUDITORIA.md
docs/changelog-ia.md
docs/estado-actual.md
docs/mapa-archivos.md
```

## OpenSpec

Crear o actualizar:

```txt
openspec/changes/backend-b5-1-security-validation-stock-fixes/
```

---

# 8. Instrucciones para OpenCode

Copiar y pegar este prompt en OpenCode desde la raíz del proyecto.

```txt
Continuemos con Kermingo. Ya completamos B1 a B5 del backend. Después de auditoría externa, necesitamos ejecutar una etapa corta antes de avanzar a B6.

# Etapa B5.1 — Fixes de seguridad, validación y stock

Trabajá bajo metodología SDD usando Gentle AI.

No avances a B6, caja, cocina, reportes, frontend ni deploy.

## Objetivo

Corregir problemas críticos detectados en auditoría:

1. validate.middleware.js debe reemplazar req.body, req.query y req.params con datos validados.
2. Los schemas Zod críticos deben ser strict para rechazar campos extra.
3. Crear pedidos no debe permitir manipular estado_pago ni estado_pedido desde request público.
4. El stock debe acumular requerimientos por producto, incluyendo componentes de promos, antes de validar/descontar.
5. Las promos no descuentan stock propio; descuentan componentes.
6. cancelWithTransaction debe devolver affectedRows correcto.
7. Crear pedidos debe respetar configuracion_tienda.estado: solo `abierta` crea pedidos reales.
8. Agregar protección CSRF mínima por Origin/Referer para rutas admin mutantes.
9. Mejorar normalización de telefono_whatsapp.
10. Unificar cookie name configurable con COOKIE_NAME.
11. FRONTEND_URL debe ser requerido en producción.
12. Login no debe revelar cuenta inactiva.
13. Documentar o bloquear transferencia online sin comprobante hasta implementar Drive/Multer.

## Leer antes

Leé en este orden:

- AGENTS.md
- docs/planificacion/00-INDICE-MAESTRO.md
- docs/planificacion/06-ENDPOINTS_API.md
- docs/planificacion/09-AUTH_COOKIES_CORS.md
- docs/planificacion/13-FLUJOS_FUNCIONALES.md
- docs/planificacion/17-TAREAS_BACKEND_DETALLADAS.md
- docs/planificacion/27-CHECKPOINTS_TESTING_AUDITORIA.md
- docs/planificacion/31-B5_1_FIXES_SEGURIDAD_VALIDACION_STOCK.md
- openspec/

También revisá skills locales:

- .agents/skills/
- .opencode/skills/
- .claude/skills/

Usá las skills relevantes de backend, testing, verification y SDD si están disponibles.

## Reglas de estructura

- backend/ es el único código a modificar en esta etapa.
- frontend/ no se modifica.
- diseno-de-landing-kermingo/ no se modifica nunca; es referencia visual.
- docs/planificacion se actualiza.
- openspec se actualiza.

## Cambios requeridos

### A. Validación Zod

Modificar validate.middleware.js para que:

- req.body = schema.parse(req.body)
- req.query = schema.parse(req.query)
- req.params = schema.parse(req.params)

Agregar .strict() a schemas críticos.

Verificar que POST /api/pedidos rechace estado_pago y estado_pedido si vienen en el body.

### B. Stock acumulado

Modificar pedido.model.js para que createWithTransaction:

- expanda items
- detecte productos tipo promo
- cargue componentes desde combo_producto
- acumule requerimientos por producto_id
- bloquee productos requeridos con SELECT FOR UPDATE
- valide stock total acumulado
- descuente con UPDATE defensivo y affectedRows
- no descuente stock del producto promo
- haga rollback ante cualquier fallo

### C. Cancelación

Corregir cancelWithTransaction para devolver affectedRows real del UPDATE.

Asegurar que cancelación reponga correctamente stock de productos normales y componentes de promo.

### D. Configuración de tienda

Antes de crear pedido real, consultar configuracion_tienda con FOR UPDATE.

Regla:

- abierta: permite pedido
- cerrada: rechaza pedido
- demo: rechaza pedido real

### E. Seguridad admin / CSRF mínimo

Crear middleware de Origin/Referer confiable para métodos mutantes admin.

Aplicarlo a rutas admin que modifican datos.

No romper CORS con credentials.

### F. Auth cookies

Agregar COOKIE_NAME a environments.

Usar ese nombre en:

- auth.controller.js
- admin.middleware.js
- logout

Agregar FRONTEND_URL como requerido en producción.

Login debe responder "Credenciales inválidas" para usuario inexistente, password incorrecta o usuario inactivo.

### G. Teléfono WhatsApp

Crear o mejorar normalización para telefono_whatsapp:

- solo dígitos
- formato argentino razonable
- preferentemente 549...
- null si no puede normalizar

Mantener telefono_cliente como texto original.

### H. Transferencia sin comprobante

Como todavía no está implementado Drive/Multer para comprobantes, tomar una decisión segura:

Opción recomendada:
- bloquear POST /api/pedidos con metodo_pago=transferencia hasta que exista comprobante

Si preferís no bloquearlo todavía, documentar explícitamente como deuda crítica antes de conectar checkout real.

No inventes implementación de Drive/Multer en esta etapa.

### I. Tests / verificación

Si ya están Jest/Supertest instalados, agregar tests mínimos para:

- validate strict
- pedido no acepta estado_pago manipulado
- tienda cerrada rechaza pedido
- stock acumulado evita negativo
- cancelación devuelve resultado correcto

Si Jest/Supertest no están instalados, no agregues una suite grande sin preguntar. Podés dejar comandos curl/manuales y recomendar instalar tests en etapa siguiente.

## OpenSpec

Crear cambio:

backend-b5-1-security-validation-stock-fixes

Debe incluir:

- proposal.md
- design.md
- tasks.md
- verify-report.md
- specs si corresponde

Al terminar y verificar, archivar si el flujo actual lo permite.

## Verificación obligatoria

Ejecutar:

```bash
cd backend
npm run dev
curl http://localhost:3001/api/health
```

Probar manualmente con curl o script:

1. POST /api/pedidos con estado_pago=pagado debe fallar.
2. POST /api/pedidos con tienda cerrada debe fallar.
3. Con tienda abierta, pedido válido debe crearse.
4. Pedido con stock insuficiente acumulado debe fallar.
5. Pedido con promo debe descontar componentes, no la promo.
6. Cancelar pedido debe reponer stock.
7. Ruta admin mutante con Origin inválido debe fallar.
8. Login de usuario inactivo debe devolver Credenciales inválidas.
9. Logout limpia la cookie configurada.

## Resultado esperado final

Responder con este formato:

```txt
## Resultado B5.1 — Fixes seguridad, validación y stock

Pipeline SDD ejecutado:
- explore:
- propose:
- spec:
- design:
- tasks:
- apply:
- verify:
- archive:

Archivos leídos:
-

Archivos modificados:
-

Archivos creados:
-

Cambios de validación:
-

Cambios de stock:
-

Cambios de auth/cookies:
-

Cambios CSRF/origin:
-

Cambios configuración tienda:
-

Cambios teléfono:
-

Cambios transferencia/comprobante:
-

Cambios documentación:
-

Cambios OpenSpec:
-

Verificaciones ejecutadas:
-

Resultados:
-

Pendientes:
-

Testing manual requerido:
si/no

Pasos de testing manual:
1.
2.
3.

Auditoría con ChatGPT recomendada:
si

Bloquea avance a B6:
si/no

Veredicto:
-
```

No avances a B6 hasta que Marcos revise y apruebe.
```

---

# 9. Testing manual después de B5.1

Después de que OpenCode ejecute la etapa, Marcos debe probar:

## 1. Health backend

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/backend
npm run dev
curl http://localhost:3001/api/health
```

## 2. Validación strict

Probar que no se permita crear pedido público con estados manipulados.

Ejemplo conceptual:

```bash
curl -X POST http://localhost:3001/api/pedidos \
  -H "Content-Type: application/json" \
  -d '{
    "nombre_cliente": "Test Hack",
    "metodo_pago": "efectivo",
    "estado_pago": "pagado",
    "estado_pedido": "entregado",
    "items": [
      { "producto_id": 1, "cantidad": 1 }
    ]
  }'
```

Debe fallar por campos no permitidos.

## 3. Tienda cerrada/demo

Con `configuracion_tienda.estado = cerrada`:

```bash
curl -X POST http://localhost:3001/api/pedidos ...
```

Debe fallar.

Con `estado = demo`, también debe fallar para pedidos reales.

Con `estado = abierta`, debe permitir si el pedido es válido.

## 4. Stock acumulado

Crear caso donde el mismo producto se pida directo y como componente de promo, superando stock total.

Debe fallar sin dejar stock negativo.

## 5. Promos

Crear pedido con promo.

Verificar:

- no baja stock de la promo
- baja stock de componentes
- pedido_detalle registra la promo vendida
- cancelación repone componentes

## 6. Cancelación

Cancelar pedido creado.

Verificar:

- estado_pedido = cancelado
- stock repuesto
- respuesta exitosa coherente

## 7. Origin admin

Probar una ruta admin mutante con Origin inválido.

Debe fallar.

Con Origin correcto, debe funcionar si hay cookie admin válida.

## 8. Login

Probar:

- email inexistente
- contraseña incorrecta
- usuario inactivo

Todos deben responder genéricamente:

```txt
Credenciales inválidas
```

## 9. ZIP de auditoría

Generar:

```bash
bash scripts/crear_zip_auditoria.sh
```

Verificar que no incluya:

```txt
.env
.env.local
credentials/
drive-credentials.json
node_modules/
.next/
```

---

# 10. Auditoría con ChatGPT después de B5.1

Cuando OpenCode termine B5.1, generar ZIP y auditar de nuevo.

## Prompt sugerido

```txt
Sos arquitecto de software senior y QA técnico. Te paso el ZIP actualizado de Kermingo después de B5.1.

Auditá específicamente si quedaron corregidos:

1. validate.middleware.js reemplaza req.body/query/params con datos validados.
2. Zod rechaza campos extra críticos.
3. POST /api/pedidos no permite manipular estado_pago ni estado_pedido.
4. Stock acumula requerimientos por producto incluyendo componentes de promo.
5. No puede quedar stock negativo.
6. Las promos descuentan componentes y no stock propio.
7. cancelWithTransaction devuelve affectedRows correcto.
8. configuracion_tienda.estado bloquea pedidos si está cerrada o demo.
9. Hay protección CSRF mínima por Origin/Referer en rutas admin mutantes.
10. COOKIE_NAME es configurable.
11. FRONTEND_URL es requerido en producción.
12. Login no revela cuenta inactiva.
13. Telefono WhatsApp se normaliza mejor.
14. Transferencia sin comprobante quedó bloqueada o documentada como deuda crítica.

Decime si ya puedo avanzar a B6 — Caja, Cocina, Comprobantes y Reportes.
```

---

# 11. Criterio para avanzar a B6

Se puede avanzar a B6 si:

```txt
- Validación strict funciona.
- Pedido público no acepta estados manipulados.
- Stock acumulado evita negativos.
- Promos descuentan componentes.
- Cancelación repone stock y devuelve resultado correcto.
- Tienda cerrada/demo bloquea pedidos reales.
- Rutas admin mutantes tienen protección mínima Origin/Referer.
- Auth cookie usa COOKIE_NAME.
- FRONTEND_URL es requerido en producción.
- No hay .env en ZIP de auditoría.
```

Si alguno de esos puntos falla, no avanzar.