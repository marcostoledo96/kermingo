# 58 — Plan TDD de corrección B7 — Flujos E2E `feature/frontend-ticket-qr`

## Proyecto

```txt
Kermingo
```

## Branch

```txt
feature/frontend-ticket-qr
```

## Último commit auditado

```txt
c649943 fix: address admin audit flow findings
```

## Repositorio

```txt
https://github.com/marcostoledo96/kermingo/tree/feature/frontend-ticket-qr
```

## Root real del proyecto

```txt
kermingo_menu/
```

---

# 1. Objetivo de este documento

Este documento convierte la auditoría del branch `feature/frontend-ticket-qr` en un **plan de corrección TDD** para que OpenCode u otra IA de código pueda trabajar con seguridad.

La idea es:

```txt
1. Escribir tests que fallen.
2. Implementar el mínimo cambio para que pasen.
3. Refactorizar sin romper.
4. Ejecutar suite completa.
5. Hacer QA manual de flujos reales.
```

Este plan está orientado a cerrar los riesgos detectados antes de mergear a `main` o preparar deploy preproducción.

---

# 2. Veredicto actual

## Estado general

```txt
Veredicto: APROBAR CON CAMBIOS
P0 actual: ninguno confirmado
P1: sí, corregir antes de merge/deploy
```

El branch mejoró mucho respecto de la auditoría anterior:

```txt
[OK] Comprobantes ya no usa solo_pagos_pendientes=true para comprobante_subido.
[OK] Transferencia rechazado -> pagado ya está permitida en backend.
[OK] Configuración acepta updates parciales.
[OK] Credenciales demo están condicionadas por NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS.
[OK] API_BASE ya no infiere LAN en production; devuelve string vacío y loguea error.
[OK] AdminSessionProvider ya tiene caso unauthenticated sin renderizar children.
[OK] Admin productos carga limit=100.
[OK] Producto con imagen tiene onProductUpdated y error handling mejorado.
```

Pero quedan riesgos reales de flujo completo:

```txt
P1-1 — Crear/editar producto permite elegir Merienda/Cena pero no parece persistir categorías.
P1-2 — Crear producto con imagen puede cerrar el diálogo antes de mostrar error de upload por cierre en el padre.
P1-3 — Público no parece leer configuracion_tienda para avisar/bloquear tienda cerrada antes del submit.
P1-4 — Estado de pago de caja depende de que el frontend mande estado_pago correcto.
P1-5 — NEXT_PUBLIC_API_URL debe estar garantizado en producción.
```

---

# 3. Regla de trabajo TDD

Para cada corrección:

```txt
RED:
- Escribir test que reproduzca el bug.
- Ejecutar solo ese test y confirmar que falla.

GREEN:
- Implementar el mínimo fix.
- Ejecutar el test puntual y confirmar que pasa.

REFACTOR:
- Limpiar código.
- Ejecutar suite relacionada.
- Ejecutar suite completa al final.
```

No hacer commit hasta completar una tanda coherente y mostrar resultados.

---

# 4. Comandos base

## Backend

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/backend
npm test
```

Tests puntuales:

```bash
npm test -- --testPathPattern=productos
npm test -- --testPathPattern=producto
npm test -- --testPathPattern=caja
npm test -- --testPathPattern=cocina
npm test -- --testPathPattern=configuracion
npm test -- --testPathPattern=comprobantes
```

## Frontend

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/frontend
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

Tests puntuales:

```bash
pnpm test -- mappers
pnpm test -- product-form-dialog
pnpm test -- products
pnpm test -- checkout
pnpm test -- config
pnpm test -- admin-session
pnpm test -- cocina-actions
pnpm test -- comprobantes
```

---

# 5. Corrección P1-1 — Persistir categorías Merienda/Cena al crear/editar producto

## Severidad

```txt
P1
```

## Problema

En la UI de admin, al crear/editar producto se eligen categorías:

```txt
Merienda
Cena
```

Pero el payload actual de producto no parece enviar esas categorías al backend. Si el backend no actualiza `producto_categoria`, el producto nuevo puede quedar sin categoría y luego no aparecer en el menú público.

## Impacto real

Alto.

Durante el evento, si agregan un producto desde admin y no se asocia a Merienda/Cena:

```txt
- el admin cree que lo creó correctamente;
- el producto existe en DB;
- pero no aparece en /menu por filtro de categoría;
- caja/menú pueden quedar desalineados.
```

## Archivos a revisar

### Frontend

```txt
frontend/components/admin/product-form-dialog.tsx
frontend/components/admin/products-screen.tsx
frontend/lib/admin.ts
frontend/lib/types.ts
frontend/lib/mappers.ts
frontend/test/mappers.test.ts
frontend/test/product-form-dialog.test.tsx
```

### Backend

```txt
backend/src/api/schemas/producto.schema.js
backend/src/api/controllers/producto.controller.js
backend/src/api/models/producto.model.js
backend/src/api/database/schema.sql
backend/src/api/database/seed.sql
backend/tests/productos*.test.js
```

---

## Decisión técnica recomendada

Usar en API un campo explícito:

```ts
categorias: ('Merienda' | 'Cena')[]
```

Ejemplo request admin:

```json
{
  "nombre": "Torta de ricota",
  "descripcion": "Porción",
  "precio": 2500,
  "tipo": "comida",
  "stock_limitado": 1,
  "stock_actual": 10,
  "stock_minimo_alerta": 2,
  "activo": 1,
  "categorias": ["Merienda"]
}
```

Alternativa válida:

```txt
categoria_ids: number[]
```

Pero para este proyecto, `categorias: ["Merienda", "Cena"]` es más legible y consistente con español.

---

## TDD — RED backend

Crear o ampliar test:

```txt
backend/tests/productos-categorias.test.js
```

### Test 1 — Crear producto Merienda

```js
it('POST /api/admin/productos crea producto asociado a Merienda', async () => {
  const res = await request(app)
    .post('/api/admin/productos')
    .set('Cookie', adminCookie())
    .set('Origin', ORIGIN)
    .send({
      nombre: `${RUN_ID}-MEDIALUNA-TEST`,
      descripcion: 'Producto test',
      precio: 1234,
      tipo: 'comida',
      stock_limitado: 1,
      stock_actual: 10,
      stock_minimo_alerta: 2,
      activo: 1,
      categorias: ['Merienda'],
    });

  expect(res.statusCode).toBe(201);
  expect(res.body.data.categorias).toContain('Merienda');

  const publicRes = await request(app).get('/api/productos?categoria=Merienda');
  expect(publicRes.body.data.some((p) => p.nombre === `${RUN_ID}-MEDIALUNA-TEST`)).toBe(true);
});
```

### Test 2 — Crear producto Cena

```js
it('POST /api/admin/productos crea producto asociado a Cena', async () => {
  const res = await request(app)
    .post('/api/admin/productos')
    .set('Cookie', adminCookie())
    .set('Origin', ORIGIN)
    .send({
      nombre: `${RUN_ID}-PIZZA-TEST`,
      descripcion: 'Producto test',
      precio: 3000,
      tipo: 'comida',
      stock_limitado: 1,
      stock_actual: 10,
      stock_minimo_alerta: 2,
      activo: 1,
      categorias: ['Cena'],
    });

  expect(res.statusCode).toBe(201);
  expect(res.body.data.categorias).toContain('Cena');
});
```

### Test 3 — Editar categorías

```js
it('PUT /api/admin/productos/:id cambia categorias de Merienda a Cena', async () => {
  const created = await crearProductoAdmin({ categorias: ['Merienda'] });

  const res = await request(app)
    .put(`/api/admin/productos/${created.id}`)
    .set('Cookie', adminCookie())
    .set('Origin', ORIGIN)
    .send({
      nombre: created.nombre,
      descripcion: created.descripcion,
      precio: created.precio,
      tipo: created.tipo,
      stock_limitado: created.stock_limitado,
      stock_actual: created.stock_actual,
      stock_minimo_alerta: created.stock_minimo_alerta,
      activo: 1,
      categorias: ['Cena'],
    });

  expect(res.statusCode).toBe(200);
  expect(res.body.data.categorias).toContain('Cena');
  expect(res.body.data.categorias).not.toContain('Merienda');
});
```

### Test 4 — Categorías vacías

Decidir regla.

Recomendación:

```txt
Producto admin debe tener al menos una categoría.
```

Test:

```js
it('POST /api/admin/productos rechaza categorias vacías', async () => {
  const res = await request(app)
    .post('/api/admin/productos')
    .set('Cookie', adminCookie())
    .set('Origin', ORIGIN)
    .send({
      nombre: `${RUN_ID}-SIN-CATEGORIA`,
      precio: 1000,
      tipo: 'comida',
      stock_limitado: 1,
      stock_actual: 1,
      stock_minimo_alerta: 1,
      activo: 1,
      categorias: [],
    });

  expect(res.statusCode).toBe(400);
});
```

Confirmar que estos tests fallen antes de implementar.

---

## TDD — RED frontend

Agregar o ampliar:

```txt
frontend/test/mappers.test.ts
frontend/test/product-form-dialog.test.tsx
```

### Test mapper

```ts
it('adminToApiPayload incluye categorias desde meals', () => {
  const payload = adminToApiPayload({
    id: '1',
    name: 'Pizza',
    description: '',
    price: 3000,
    type: 'comida',
    meals: ['merienda', 'cena'],
    icon: 'pizza',
    image: undefined,
    active: true,
    stockLimited: true,
    stockCurrent: 10,
    stockMin: 2,
  });

  expect(payload.categorias).toEqual(['Merienda', 'Cena']);
});
```

---

## GREEN — Backend implementación

### 1. Schema

En:

```txt
backend/src/api/schemas/producto.schema.js
```

Agregar:

```js
const categoriaNombreSchema = z.enum(['Merienda', 'Cena']);

categorias: z.array(categoriaNombreSchema).min(1).optional()
```

Si se decide que sea obligatorio:

```js
categorias: z.array(categoriaNombreSchema).min(1)
```

Recomendación práctica:

```txt
createProductoSchema: categorias obligatorio.
updateProductoSchema: categorias opcional, pero si viene no puede estar vacío.
```

### 2. Model transaccional

En:

```txt
backend/src/api/models/producto.model.js
```

Crear helpers:

```js
async function getCategoriaIdsByNombre(conn, categorias) {
  const [rows] = await conn.query(
    `SELECT id, nombre FROM categoria WHERE nombre IN (${categorias.map(() => '?').join(',')})`,
    categorias
  );

  if (rows.length !== categorias.length) {
    throw new ValidationError('Una o más categorías no existen');
  }

  return rows.map((r) => r.id);
}
```

Crear:

```js
export async function createWithCategorias(pool, data) { ... }
export async function updateWithCategorias(pool, id, data) { ... }
```

Flujo create:

```txt
BEGIN
INSERT producto
SELECT categorias
INSERT producto_categoria
COMMIT
```

Flujo update:

```txt
BEGIN
UPDATE producto
if categorias !== undefined:
  DELETE producto_categoria
  INSERT producto_categoria
COMMIT
```

### 3. Controller

En:

```txt
backend/src/api/controllers/producto.controller.js
```

Usar `createWithCategorias` y `updateWithCategorias` si existe `categorias`.

### 4. Respuesta

Asegurar que `findByIdAdmin` devuelva `categorias` actualizado.

---

## GREEN — Frontend implementación

En:

```txt
frontend/lib/admin.ts
```

Modificar:

```ts
export function adminToApiPayload(p: AdminProduct) {
  return {
    nombre: p.name.trim(),
    descripcion: p.description.trim() || undefined,
    precio: p.price,
    tipo: p.type,
    stock_limitado: p.stockLimited ? 1 : 0,
    stock_actual: p.stockLimited ? p.stockCurrent : undefined,
    stock_minimo_alerta: p.stockMin,
    activo: p.active ? 1 : 0,
    categorias: p.meals.map((m) => (m === 'merienda' ? 'Merienda' : 'Cena')),
  } as const
}
```

---

## Criterios de aceptación

```txt
[ ] Crear producto Merienda desde admin aparece en menú Merienda.
[ ] Crear producto Cena desde admin aparece en menú Cena.
[ ] Crear producto ambas categorías aparece en ambas.
[ ] Editar categorías actualiza producto_categoria.
[ ] Producto sin categorías no se crea o queda claramente bloqueado.
[ ] Tests backend pasan.
[ ] Tests frontend pasan.
```

---

# 6. Corrección P1-2 — Producto con imagen: no cerrar diálogo antes del upload

## Severidad

```txt
P1
```

## Problema

El diálogo de producto intenta subir imagen luego de crear el producto. Si falla la imagen, intenta mostrar error y quedarse abierto.

Pero el `onSave` del padre puede cerrar `creating/editing` antes de que el upload termine.

## Impacto real

Medio/alto.

El admin puede crear producto con imagen, fallar la subida de imagen y no enterarse claramente.

## Archivos

```txt
frontend/components/admin/product-form-dialog.tsx
frontend/components/admin/products-screen.tsx
frontend/test/product-form-dialog.test.tsx
```

---

## TDD — RED frontend

### Test 1 — Crear producto con imagen exitosa actualiza lista

```ts
it('crear producto con imagen llama onProductUpdated y cierra tras upload exitoso', async () => {
  // Arrange:
  // - render ProductFormDialog creating
  // - mock onSave -> producto id real "123"
  // - mock apiPostForm -> ApiProducto con imagen_url
  // Act:
  // - seleccionar imagen
  // - guardar
  // Assert:
  // - onProductUpdated llamado con image absoluta
  // - onClose llamado después del upload
});
```

### Test 2 — Upload de imagen falla y diálogo queda abierto

```ts
it('si falla upload de imagen en creación, muestra error y no cierra el diálogo', async () => {
  // Arrange:
  // - onSave exitoso
  // - apiPostForm falla
  // Act:
  // - seleccionar imagen
  // - guardar
  // Assert:
  // - aparece "Producto creado, pero la imagen no se pudo subir"
  // - onClose NO fue llamado
});
```

### Test 3 — ProductsScreen no cierra creando dentro de handleSave

```ts
it('ProductsScreen delega el cierre del diálogo al ProductFormDialog', async () => {
  // Verificar que al crear producto, el dialog sigue montado hasta que ProductFormDialog llama onClose.
});
```

---

## GREEN — Implementación

### 1. No cerrar desde `handleSave`

En:

```txt
frontend/components/admin/products-screen.tsx
```

Cambiar `handleSave` para que no haga:

```ts
setEditing(null)
setCreating(false)
```

dentro de las ramas de create/update.

Dejar:

```ts
return mapped
```

El cierre debe quedar centralizado en:

```txt
ProductFormDialog.handleSubmit -> onClose()
```

después de que todo terminó correctamente.

### 2. Actualizar lista con imagen

Ya existe `onProductUpdated`. Asegurar que `ProductFormDialog` lo llame al subir imagen exitosamente y que `ProductsScreen` lo pase siempre.

Buscar render:

```tsx
<ProductFormDialog
  ...
  onProductUpdated={handleProductUpdated}
/>
```

Si no está, agregarlo.

### 3. Error de imagen

Si upload falla:

```ts
setLocalSubmitError(...)
return
```

No llamar `onClose()`.

---

## Criterios de aceptación

```txt
[ ] Crear producto sin imagen cierra correctamente.
[ ] Crear producto con imagen exitosa actualiza la lista con la imagen.
[ ] Crear producto con imagen fallida mantiene diálogo abierto.
[ ] Error de imagen visible.
[ ] Admin puede reintentar.
[ ] Tests frontend pasan.
```

---

# 7. Corrección P1-3 — Público debe responder a tienda cerrada

## Severidad

```txt
P1
```

## Problema

Backend bloquea pedidos si `configuracion_tienda.estado !== 'abierta'`, pero la UI pública parece enterarse recién al confirmar pedido.

## Impacto real

Alto en UX.

El cliente puede:

```txt
- cargar carrito;
- llenar datos;
- hacer transferencia;
- subir comprobante;
- recién al final ver error de tienda cerrada.
```

## Archivos

```txt
frontend/components/menu/menu-screen.tsx
frontend/components/menu/checkout-screen.tsx
frontend/lib/api.ts
frontend/lib/types.ts
frontend/test/menu*.test.tsx
frontend/test/checkout*.test.tsx
backend/src/api/controllers/configuracion.controller.js
backend/src/api/models/pedido.model.js
```

---

## TDD — RED frontend

### Test 1 — Menú muestra tienda cerrada

```ts
it('MenuScreen muestra mensaje público cuando configuracion_tienda está cerrada', async () => {
  // mock GET /api/configuracion-tienda -> { estado: 'cerrada', mensaje_publico: 'Volvemos a las 19' }
  // mock GET /api/productos -> productos
  // assert mensaje visible
});
```

### Test 2 — Menú deshabilita agregar si cerrada

```ts
it('MenuScreen no permite agregar productos si tienda está cerrada', async () => {
  // assert botones Agregar disabled o no presentes
});
```

### Test 3 — Checkout bloquea confirmar si cerrada

```ts
it('CheckoutScreen bloquea confirmación si tienda está cerrada', async () => {
  // mock config cerrada
  // assert botón confirmar disabled o error visible
});
```

---

## GREEN — Implementación

### 1. Crear helper API

Archivo sugerido:

```txt
frontend/lib/configuracion-tienda.ts
```

```ts
import { apiGet } from './api'
import type { ApiConfiguracion } from './types'

export async function getConfiguracionTienda() {
  return apiGet<ApiConfiguracion>('/api/configuracion-tienda')
}
```

### 2. MenuScreen

Cargar config en paralelo con productos:

```ts
const configResource = useApiResource(getConfiguracionTienda)
```

Si cerrada:

```tsx
<TiendaCerradaBanner mensaje={config.mensaje_publico} />
```

Reglas:

```txt
estado abierta -> normal
estado cerrada -> mostrar mensaje y bloquear compras
estado demo -> mostrar aviso demo si aplica
```

Para bloquear compras, se puede pasar prop a `ProductCard`:

```tsx
<ProductCard product={p} disabled={storeClosed} disabledReason="La tienda está cerrada" />
```

Si no querés tocar ProductCard ahora:

```txt
ocultar FloatingCartBar y mostrar aviso
```

Pero mejor bloquear `add`.

### 3. CheckoutScreen

Antes de permitir confirmación, cargar config:

```txt
si estado !== abierta:
- mostrar mensaje
- disabled Confirmar pedido
```

Backend sigue siendo autoridad final.

---

## Criterios de aceptación

```txt
[ ] Menú muestra estado cerrado.
[ ] Mensaje público se ve.
[ ] No se puede confirmar pedido si tienda cerrada.
[ ] Backend sigue bloqueando igualmente.
[ ] Estado abierta funciona normal.
[ ] Tests frontend pasan.
```

---

# 8. Corrección P1-4 — Estado de pago correcto en caja

## Severidad

```txt
P1
```

## Problema

`createCajaSchema` default `estado_pago = pendiente`. Si la UI no envía `pagado`, una venta en efectivo de caja puede quedar pendiente.

## Decisión recomendada

Para caja:

```txt
Efectivo presencial:
- por defecto debe quedar pagado.

Transferencia presencial:
- si el vendedor confirma que se pagó, debe quedar pagado.
- si no hay confirmación explícita, puede quedar pendiente.
```

## Backend recomendado

En:

```txt
backend/src/api/controllers/pedido.controller.js
```

dentro de `crearCaja`:

```js
const data = { ...req.body };

if (data.estado_pago === undefined && data.metodo_pago === 'efectivo') {
  data.estado_pago = 'pagado';
}

const result = await createWithTransaction(pool, {
  ...data,
  origen: 'caja',
});
```

No aplicar al flujo público.

---

## TDD — RED backend

Agregar tests en:

```txt
backend/tests/caja.test.js
```

### Test efectivo sin estado_pago

```js
it('caja efectivo sin estado_pago queda pagado por defecto', async () => {
  const res = await request(app)
    .post('/api/admin/pedidos/caja')
    .set('Cookie', adminCookie())
    .set('Origin', ORIGIN)
    .send({
      nombre_cliente: `${RUN_ID}-EFECTIVO-DEFAULT`,
      metodo_pago: 'efectivo',
      items: [{ producto_id: PRODUCTO_ID, cantidad: 1 }],
    });

  expect(res.statusCode).toBe(201);
  expect(res.body.data.estado_pago).toBe('pagado');
});
```

### Test transferencia sin estado_pago

Definir regla. Recomendación:

```txt
queda pendiente si no se envía pagado explícitamente.
```

```js
it('caja transferencia sin estado_pago queda pendiente por defecto', async () => {
  ...
  expect(res.body.data.estado_pago).toBe('pendiente');
});
```

### Test transferencia explícitamente pagado

```js
it('caja transferencia con estado_pago=pagado queda pagado', async () => {
  ...
  expect(res.body.data.estado_pago).toBe('pagado');
});
```

---

## Frontend

En `caja-screen.tsx`, confirmar que cuando se registra venta:

```txt
efectivo -> envía estado_pago pagado
transferencia -> define claramente si pagado o pendiente
```

Si la UI no pregunta, default recomendado:

```txt
efectivo: pagado
transferencia: pagado si caja está confirmando pago en el momento
```

---

## Criterios de aceptación

```txt
[ ] Caja efectivo queda pagado.
[ ] Caja transferencia queda en estado definido por UX.
[ ] Backend tiene default seguro para efectivo.
[ ] Tests backend pasan.
[ ] UI muestra estado de pago final.
```

---

# 9. Corrección P1-5 — NEXT_PUBLIC_API_URL obligatorio en producción

## Severidad

```txt
P1
```

## Problema

`resolveApiBase()` devuelve string vacío en producción si falta `NEXT_PUBLIC_API_URL`. Eso evita LAN inválido, pero puede hacer que los fetch vayan a rutas relativas del frontend.

## Objetivo

Evitar deploy roto por variable faltante.

## TDD — RED frontend

En:

```txt
frontend/test/config.test.ts
```

Agregar:

```ts
it('resolveApiBase devuelve vacío en production sin NEXT_PUBLIC_API_URL', () => {
  expect(resolveApiBase({
    nodeEnv: 'production',
    apiUrl: '',
    isBrowser: true,
    browserLocation: { protocol: 'https:', hostname: 'kermingo.vercel.app' },
  })).toBe('');
});
```

Si preferís comportamiento más estricto:

```ts
it('production sin NEXT_PUBLIC_API_URL falla claramente', () => {
  expect(() => assertApiBaseForProduction()).toThrow(/NEXT_PUBLIC_API_URL/)
});
```

## Implementación recomendada

Crear script:

```txt
frontend/scripts/check-env.mjs
```

```js
if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_API_URL) {
  console.error('NEXT_PUBLIC_API_URL es requerido en producción');
  process.exit(1);
}
```

En `package.json`:

```json
{
  "scripts": {
    "prebuild": "node scripts/check-env.mjs",
    "build": "next build"
  }
}
```

Cuidado: en Vercel `NODE_ENV=production` en build. Debe estar configurada.

## Criterios de aceptación

```txt
[ ] Producción no puede buildear/deployar sin NEXT_PUBLIC_API_URL.
[ ] Dev LAN sigue funcionando.
[ ] ABSOLUTE_IMAGE_URL sigue funcionando.
[ ] DEPLOY.md documenta variable.
```

---

# 10. Corrección P2-1 — Validar comprobante en frontend

## Severidad

```txt
P2
```

## Problema

Checkout acepta:

```txt
image/*,application/pdf
```

Eso puede permitir HEIC u otros formatos que backend rechazará.

## TDD — RED frontend

En:

```txt
frontend/test/checkout-screen.test.tsx
```

Tests:

```txt
[ ] archivo HEIC muestra error y no se asigna como receipt.
[ ] archivo mayor a 5 MB muestra error.
[ ] PDF válido se acepta.
[ ] PNG/JPG/WEBP válido se acepta.
```

## Implementación

En `checkout-screen.tsx`:

```ts
const ALLOWED_RECEIPT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]

const MAX_RECEIPT_SIZE = 5 * 1024 * 1024
```

Al seleccionar:

```ts
const file = e.target.files?.[0]
if (!file) return

if (!ALLOWED_RECEIPT_TYPES.includes(file.type)) {
  setSubmitError('El comprobante debe ser JPG, PNG, WEBP o PDF.')
  e.target.value = ''
  return
}

if (file.size > MAX_RECEIPT_SIZE) {
  setSubmitError('El comprobante no puede superar 5 MB.')
  e.target.value = ''
  return
}

setReceipt(file)
```

Actualizar accept:

```tsx
accept="image/jpeg,image/png,image/webp,application/pdf"
```

## Criterios de aceptación

```txt
[ ] HEIC no se acepta.
[ ] PDF se acepta.
[ ] JPG/PNG/WEBP se aceptan.
[ ] >5MB no se acepta.
[ ] Backend sigue validando.
```

---

# 11. Corrección P2-2 — PayStatus completo

## Severidad

```txt
P2
```

## Problema

`PayStatus` actual simplifica demasiado:

```txt
pendiente
pagado
```

pero backend maneja:

```txt
pendiente
comprobante_subido
pagado
rechazado
```

## Implementación

En:

```txt
frontend/lib/admin.ts
```

Cambiar:

```ts
export type PayStatus = 'pendiente' | 'pagado'
```

por:

```ts
export type PayStatus =
  | 'pendiente'
  | 'comprobante_subido'
  | 'pagado'
  | 'rechazado'
```

Y:

```ts
function mapPayStatus(s: string): PayStatus {
  if (
    s === 'pendiente' ||
    s === 'comprobante_subido' ||
    s === 'pagado' ||
    s === 'rechazado'
  ) {
    return s
  }
  return 'pendiente'
}
```

Actualizar badges donde corresponda.

## Tests

```txt
[ ] mapPayStatus('comprobante_subido') devuelve comprobante_subido.
[ ] mapPayStatus('rechazado') devuelve rechazado.
[ ] Cocina/Pedidos visualizan pago pendiente/rechazado/subido correctamente.
```

---

# 12. Corrección P2-3 — cena_habilitada_desde

## Severidad

```txt
P2
```

## Problema

Backend soporta:

```txt
cena_habilitada_desde
```

pero la UI admin no lo expone.

## Decisión necesaria

Elegir:

```txt
A. Se usa en el evento.
B. No se usa por ahora.
```

## Si se usa

Agregar en `ConfigScreen`:

```txt
input type=time
```

Guardar como:

```txt
HH:MM:SS
```

Tests:

```txt
[ ] guardar solo cena_habilitada_desde -> 200.
[ ] UI muestra valor.
[ ] UI guarda valor.
```

## Si no se usa

Documentar:

```txt
cena_habilitada_desde está soportado por backend pero no expuesto en UI B7.
```

---

# 13. Corrección P2-4 — Metadata comprobante sin drive_id

## Estado

El commit indica que `drive_id` ya no se expone. Verificar con test.

## Test backend

```js
it('GET comprobante metadata no expone drive_id', async () => {
  const res = await request(app)
    .get(`/api/admin/pedidos/${pedidoId}/comprobante`)
    .set('Cookie', adminCookie());

  expect(res.statusCode).toBe(200);
  expect(res.body.data).not.toHaveProperty('drive_id');
  expect(res.body.data).toHaveProperty('url_publica');
});
```

---

# 14. Corrección P2-5 — Tests CORS/CSRF producción

## Objetivo

Asegurar:

```txt
LAN automático solo development.
Producción solo FRONTEND_URL/FRONTEND_URLS explícitos.
```

Tests recomendados:

```txt
[ ] NODE_ENV=production + Origin LAN -> 403.
[ ] NODE_ENV=production + FRONTEND_URL -> 200.
[ ] Sin Origin ni Referer en mutación admin -> 403.
[ ] Referer confiable sin Origin -> 200.
[ ] Referer inválido sin Origin -> 403.
```

Puede requerir aislar environments o crear helpers testeables.

---

# 15. QA manual completo antes del evento

## Público

```txt
[ ] Abrir desde celular con datos móviles.
[ ] Menú carga productos.
[ ] Producto con imagen carga.
[ ] Producto agotado no se agrega.
[ ] Combo/promo se agrega.
[ ] Stock insuficiente muestra error al confirmar.
[ ] Tienda cerrada muestra aviso.
[ ] Checkout solo transferencia.
[ ] Comprobante obligatorio.
[ ] PDF/JPG/PNG/WEBP aceptados.
[ ] HEIC rechazado.
[ ] Pedido creado muestra ticket.
[ ] Seguimiento por token funciona.
```

## Comprobantes

```txt
[ ] Online transferencia aparece en /admin/comprobantes.
[ ] Abrir metadata.
[ ] Abrir url_publica.
[ ] Aprobar.
[ ] Rechazar.
[ ] Reaprobar rechazado.
[ ] No se ve drive_id en response.
```

## Caja

```txt
[ ] Crear pedido efectivo.
[ ] Confirmar estado_pago pagado.
[ ] Crear pedido transferencia.
[ ] Confirmar estado_pago esperado.
[ ] Pedido aparece en cocina.
[ ] Cancelar repone stock.
[ ] Editar pedido de caja si UI lo permite.
```

## Cocina

```txt
[ ] recibido -> en_preparacion.
[ ] recibido -> listo.
[ ] en_preparacion -> recibido.
[ ] en_preparacion -> listo.
[ ] listo -> en_preparacion.
[ ] listo -> entregado con confirmación.
[ ] entregado terminal.
[ ] Polling cada 10 segundos.
[ ] Mobile tabs.
[ ] Cancelar desde cocina si corresponde.
```

## Productos

```txt
[ ] Crear producto Merienda.
[ ] Aparece en menú Merienda.
[ ] Crear producto Cena.
[ ] Aparece en menú Cena.
[ ] Crear producto con imagen.
[ ] Imagen se ve sin hard refresh.
[ ] Fallo de imagen deja diálogo abierto.
[ ] Reemplazar imagen.
[ ] Quitar imagen.
[ ] Editar stock.
[ ] Desactivar/recuperar.
```

## Configuración

```txt
[ ] Guardar solo mensaje_publico.
[ ] Guardar solo estado.
[ ] Guardar cena_habilitada_desde o confirmar que no aplica.
[ ] Body vacío falla.
[ ] Público refleja tienda cerrada.
```

## Auth

```txt
[ ] Login correcto.
[ ] Login inválido.
[ ] Redirect a dashboard.
[ ] Logout.
[ ] Ruta protegida sin sesión.
[ ] Cookie vencida.
[ ] Sin flash de contenido admin.
[ ] Credenciales demo ocultas.
```

---

# 16. Lista priorizada de implementación

```txt
1. TDD categorías de productos.
2. Implementar persistencia producto_categoria.
3. TDD producto con imagen y diálogo abierto en error.
4. Ajustar cierre de ProductFormDialog/ProductsScreen.
5. TDD tienda cerrada en público.
6. Implementar lectura de configuracion_tienda en menú/checkout.
7. TDD caja estado_pago default.
8. Implementar default seguro para efectivo en caja.
9. TDD validación de comprobante frontend.
10. Implementar validación file type/size.
11. TDD NEXT_PUBLIC_API_URL production.
12. Implementar prebuild/check-env.
13. TDD cocina state machine completo.
14. Completar tests cocina backend/frontend.
15. TDD metadata comprobante sin drive_id.
16. TDD PayStatus completo.
17. Implementar PayStatus completo.
18. Decidir cena_habilitada_desde.
19. Ejecutar suites completas.
20. QA manual.
```

---

# 17. Prompt listo para OpenCode

```txt
Continuemos con Kermingo.

Branch:
feature/frontend-ticket-qr

Último commit auditado:
c649943 fix: address admin audit flow findings

Objetivo:
Aplicar correcciones TDD sobre los flujos B7 end-to-end antes de merge/deploy.

Trabajar bajo TDD:
1. Escribir test que falle.
2. Implementar mínimo fix.
3. Ejecutar test puntual.
4. Refactor.
5. Ejecutar suites completas.

No hacer commit hasta mostrar resumen.
No subir .env ni secretos.
No hacer refactor masivo fuera del alcance.

## Prioridad 1 — Productos y categorías

Problema:
Admin permite elegir Merienda/Cena, pero categorías no parecen persistirse en producto_categoria.

TDD backend:
- POST admin productos con categorias ['Merienda'] -> aparece en /api/productos?categoria=Merienda.
- POST con ['Cena'] -> aparece en Cena.
- PUT cambia categorias -> producto_categoria se actualiza.
- categorias [] -> 400 o regla definida.

TDD frontend:
- adminToApiPayload incluye categorias desde meals.

Implementar:
- schema producto acepta categorias.
- modelo create/update usa transacción para producto + producto_categoria.
- frontend manda categorias desde meals.

## Prioridad 2 — Crear producto con imagen

Problema:
ProductsScreen puede cerrar diálogo antes de que ProductFormDialog muestre error de upload.

TDD frontend:
- crear producto con imagen exitosa actualiza lista.
- si upload imagen falla, diálogo queda abierto y muestra error.

Implementar:
- ProductsScreen.handleSave no cierra creating/editing.
- ProductFormDialog cierra solo al final exitoso.
- onProductUpdated actualiza lista con imagen.

## Prioridad 3 — Tienda cerrada en público

Problema:
Backend bloquea tienda cerrada, pero público parece enterarse recién al submit.

TDD frontend:
- MenuScreen muestra mensaje si configuracion_tienda cerrada.
- Checkout bloquea confirmación si cerrada.

Implementar:
- helper getConfiguracionTienda.
- menú/checkout leen config.
- estado cerrada bloquea compra y muestra mensaje_publico.

## Prioridad 4 — Caja estado_pago default

Problema:
Caja schema default es pendiente; efectivo presencial debería quedar pagado por defecto si no se envía estado_pago.

TDD backend:
- caja efectivo sin estado_pago -> pagado.
- caja transferencia sin estado_pago -> pendiente o regla definida.
- caja transferencia con estado_pago pagado -> pagado.

Implementar:
- default seguro en crearCaja para efectivo.

## Prioridad 5 — Validación comprobante frontend

TDD frontend:
- HEIC rechazado.
- >5MB rechazado.
- PDF/JPG/PNG/WEBP aceptados.

Implementar:
- accept exacto.
- validación file.type y size antes de setReceipt.

## Prioridad 6 — API URL producción

TDD frontend:
- resolveApiBase production sin env devuelve '' o falla claramente.
- prebuild/check-env falla sin NEXT_PUBLIC_API_URL en production.

Implementar:
- script check-env si corresponde.
- docs deploy.

## Prioridad 7 — Cocina state machine tests

TDD backend:
- recibido -> en_preparacion 200.
- recibido -> listo 200.
- recibido -> entregado 400.
- en_preparacion -> recibido 200.
- en_preparacion -> listo 200.
- en_preparacion -> entregado 400.
- listo -> en_preparacion 200.
- listo -> entregado 200.
- entregado -> listo 400.
- same-state 400.

TDD frontend:
- getActions por estado.

## Prioridad 8 — Comprobante metadata sin drive_id

TDD backend:
- GET comprobante no expone drive_id.
- expone url_publica, nombre_original, mime_type, tamanio_bytes.

## Prioridad 9 — PayStatus completo

TDD frontend:
- mapPayStatus conserva comprobante_subido y rechazado.

Implementar:
- PayStatus = pendiente | comprobante_subido | pagado | rechazado.
- actualizar badges.

## Verificación final

Backend:
cd backend
npm test

Frontend:
cd frontend
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build

Manual:
- compra online transferencia
- comprobantes aprobar/rechazar/reaprobar
- caja efectivo/transferencia
- cocina transiciones
- productos con categorias e imagen
- tienda cerrada
- auth admin

Resultado esperado:

# Resultado TDD B7 flows

## Tests escritos primero
-

## Cambios backend
-

## Cambios frontend
-

## Tests ejecutados
-

## Build/lint/typecheck
-

## Pendientes
-

## ¿Listo para merge?
-
```

---

# 18. Criterios de aceptación final

## Backend

```txt
[ ] npm test pasa.
[ ] Producto categorias persistidas.
[ ] Caja efectivo default pagado.
[ ] Cocina state machine testeada.
[ ] Config updates parciales funcionan.
[ ] Comprobante metadata no expone drive_id.
[ ] Stock/combos siguen transaccionales.
```

## Frontend

```txt
[ ] pnpm test pasa.
[ ] pnpm lint sin errores.
[ ] tsc pasa.
[ ] build pasa.
[ ] Menú lee tienda cerrada.
[ ] Checkout bloquea tienda cerrada.
[ ] Comprobante validado por tipo/tamaño.
[ ] Producto con imagen no oculta error.
[ ] PayStatus completo.
[ ] API URL prod protegida.
```

## Evento

```txt
[ ] Compra pública transferencia funciona.
[ ] Caja funciona.
[ ] Cocina funciona.
[ ] Comprobantes funciona.
[ ] Productos funciona.
[ ] Configuración funciona.
[ ] Auth admin funciona.
[ ] Prueba en notebook.
[ ] Prueba en tablet.
[ ] Prueba en celular con datos.
```
