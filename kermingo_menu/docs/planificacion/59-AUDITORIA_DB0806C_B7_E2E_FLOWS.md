# 59 — Auditoría técnica B7 E2E — `db0806c`

## Proyecto

```txt
Kermingo
```

## Branch auditado

```txt
feature/frontend-ticket-qr
```

## Commit auditado

```txt
db0806c fix: complete B7 e2e flow corrections
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

# 1. Contexto

Kermingo es una app web para un evento scout/recaudatorio.

## Stack

```txt
Backend:
- Express
- MySQL
- API REST
- Zod
- Multer
- JWT en cookie httpOnly
- Google Drive OAuth

Frontend:
- Next.js
- React
- TypeScript
- TailwindCSS
```

## Áreas auditadas

```txt
1. Productos y categorías.
2. Producto con imagen.
3. Menú público y tienda cerrada/demo.
4. Checkout y comprobante obligatorio.
5. Backend de comprobantes.
6. Caja rápida.
7. Build/env.
8. Configuración admin.
9. Seguridad e infraestructura.
10. Flujos E2E reales del evento.
```

## Evidencia de verificación reportada

```txt
Backend:
- npm test -- --testPathPattern='(productos-categorias|producto-imagen)' => pass, 17 tests
- npm test -- --testPathPattern=comprobantes.unit => pass, 40 tests
- npm test -- --testPathPattern=caja --testNamePattern='P1-4' => pass, 3 tests

Frontend:
- pnpm test => pass, 185 tests
- pnpm exec tsc --noEmit => pass
- pnpm lint => pass con 4 warnings react-hooks/set-state-in-effect
- NEXT_PUBLIC_API_URL=http://localhost:3001 pnpm build => pass

Repo:
- git diff --check => pass
```

## Warnings conocidos

```txt
El full backend caja.test.js todavía tiene 3 fallos PR2 edit conocidos, no relacionados con Plan 58:
- PUT replaces items and total, stock reflects delta
- PUT works with promo combo and reconciles component stock
- PUT reconciles empty-to items correctly
```

## Alcance de esta auditoría

Esta auditoría es una revisión estática del código y del diff del commit informado, tomando como válida la evidencia local reportada. No ejecuté los tests en mi entorno.

---

# 2. Veredicto general

## Veredicto

```txt
NO MERGEABLE todavía por P1-1.
```

El branch está mucho más cerca que el snapshot anterior. El commit `db0806c` corrige bien varios puntos del Plan 58:

```txt
[OK] Comprobantes.
[OK] Transición rechazado -> pagado.
[OK] Configuración parcial.
[OK] Credenciales demo condicionadas.
[OK] NEXT_PUBLIC_API_URL requerido en producción.
[OK] Tienda cerrada/demo en público.
[OK] Validación de comprobante frontend/backend.
[OK] Producto con imagen parcialmente corregido.
[OK] Estado de pago default para caja efectivo.
```

Pero encontré un bug real en **Caja rápida**:

```txt
El filtro Merienda/Cena filtra por nombre del producto, no por categoría.
```

Esto afecta una pantalla operativa principal del evento y debe corregirse antes de merge/deploy.

## Estado final estimado

```txt
Ahora:
No mergeable por P1-1.

Después de corregir P1-1 y alinear contrato de categorías:
Mergeable con fixes P2/P3 pendientes.

Antes de producción/evento:
Requiere QA manual completo en notebook/tablet/celular.
```

---

# 3. Resumen de hallazgos

## P0 — Bloqueantes absolutos

```txt
P0-0 — No detecté P0 confirmado.
```

## P1 — Altos / antes de merge

```txt
P1-1 — Caja rápida filtra Merienda/Cena por nombre del producto, no por categoría.
P1-2 — Categorías en createProductoSchema: documentación dice obligatorio, schema lo deja opcional.
P1-3 — PUT /api/admin/productos/:id con solo categorias puede fallar.
P1-4 — Fallas conocidas de edición de caja siguen siendo riesgo si la UI permite editar pedidos.
```

## P2 — Medios

```txt
P2-1 — Menú público no bloquea compra mientras configuración de tienda está loading/error.
P2-2 — Validación de comprobante frontend/backend no cruza extensión y MIME de forma estricta.
P2-3 — setProductoCategorias no preserva orden de salida enviado, aunque la salida es determinística.
P2-4 — NEXT_PUBLIC_API_URL obligatorio está bien, pero puede molestar en builds locales sin env.
P2-5 — Config cena_habilitada_desde está expuesta; revisar formato visual y tests.
```

## P3 — Bajos / mejoras

```txt
P3-1 — Datos bancarios hardcodeados en frontend.
P3-2 — package.json del frontend sigue con name "my-project".
P3-3 — 4 warnings react-hooks/set-state-in-effect.
```

---

# 4. P0 — Bloqueantes

## P0-0 — No detecté P0 confirmado

No encontré un bloqueo absoluto en el commit `db0806c`.

Los problemas P0 anteriores parecen resueltos:

```txt
[OK] /admin/comprobantes ya consulta por estado_pago específico.
[OK] Reaprobar rechazado está permitido en backend.
[OK] Configuración permite updates parciales.
[OK] Credenciales demo están condicionadas.
[OK] Tienda cerrada/demo se contempla en público.
```

---

# 5. P1-1 — Caja rápida filtra Merienda/Cena por nombre del producto

## Severidad

```txt
P1 — Alto
```

## Archivos

```txt
frontend/components/admin/caja-screen.tsx
frontend/lib/admin.ts
frontend/lib/types.ts
```

## Problema

En Caja rápida hay filtros:

```txt
Todos
Merienda
Cena
Bebidas
Promos
```

Pero el filtro `Merienda` / `Cena` no usa las categorías reales del producto. Usa el nombre del producto:

```ts
p.type !== 'bebida' && p.type !== 'promo' && p.name.toLowerCase().includes(filter)
```

Esto significa:

```txt
Filtro Cena:
- muestra productos cuyo nombre contiene "cena".
- NO muestra productos asociados a categoría "Cena" si su nombre no contiene "cena".

Filtro Merienda:
- muestra productos cuyo nombre contiene "merienda".
- NO muestra productos asociados a categoría "Merienda" si su nombre no contiene "merienda".
```

## Impacto real

Alto para el evento.

Caja rápida es una pantalla operativa principal. Si los filtros por momento no funcionan:

```txt
- el vendedor tarda más;
- puede creer que faltan productos;
- la carga de pedidos presenciales se vuelve más lenta;
- puede afectar la operación en hora pico.
```

## Cómo reproducir

1. Crear o usar un producto con:
   ```txt
   nombre = Pizza muzza
   categorias = Cena
   tipo = comida
   ```
2. Entrar a:
   ```txt
   /admin/caja
   ```
3. Seleccionar filtro:
   ```txt
   Cena
   ```
4. Resultado actual probable:
   ```txt
   Pizza muzza no aparece, porque su nombre no contiene "cena".
   ```

## Fix recomendado

Agregar categorías al tipo `CajaProduct` y mapearlas desde `ApiProducto.categorias`.

### Paso 1 — Extender CajaProduct

En:

```txt
frontend/lib/admin.ts
```

Agregar `meals`:

```ts
export type CajaProduct = {
  id: number
  name: string
  price: number
  type: ProductType
  meals: MealCategory[]
  icon: ProductIcon
  image?: string
  stockLimited: boolean
  stockActual: number | null
  stockMinimoAlerta: number
}
```

### Paso 2 — Mapear categorías

En `apiToCajaProduct`:

```ts
export function apiToCajaProduct(p: ApiProducto): CajaProduct {
  return {
    id: p.id,
    name: p.nombre,
    price: typeof p.precio === 'string' ? parseFloat(p.precio) : p.precio,
    type: p.tipo,
    meals: parseCategorias(p.categorias),
    icon: inferIcon(p.nombre, p.tipo),
    image: ABSOLUTE_IMAGE_URL(p.imagen_url),
    stockLimited: p.stock_limitado === 1,
    stockActual: p.stock_actual,
    stockMinimoAlerta: p.stock_minimo_alerta,
  }
}
```

Asegurar que `parseCategorias` esté disponible y soporte:

```txt
Merienda
Cena
Merienda, Cena
Cena, Merienda
```

### Paso 3 — Corregir filtro de Caja

En:

```txt
frontend/components/admin/caja-screen.tsx
```

Cambiar la lógica de `matchesFilter` por:

```ts
const matchesFilter =
  filter === 'todos'
    ? true
    : filter === 'bebida'
      ? p.type === 'bebida'
      : filter === 'promo'
        ? p.type === 'promo'
        : p.meals.includes(filter)
```

## Tests recomendados

Agregar en frontend:

```txt
frontend/test/caja-screen.test.tsx
```

o ampliar test existente.

Casos:

```txt
[ ] Filtro "cena" muestra producto con categorias = "Cena".
[ ] Filtro "merienda" muestra producto con categorias = "Merienda".
[ ] Filtro "bebida" sigue mostrando bebidas.
[ ] Filtro "promo" sigue mostrando promos.
[ ] Filtro "todos" muestra todos los productos.
```

## Criterios de aceptación

```txt
[ ] Caja filtro Cena muestra productos de categoría Cena aunque no tengan "cena" en el nombre.
[ ] Caja filtro Merienda muestra productos de categoría Merienda aunque no tengan "merienda" en el nombre.
[ ] Bebidas y Promos siguen funcionando.
[ ] Tests frontend pasan.
[ ] QA manual en /admin/caja confirma filtros correctos.
```

---

# 6. P1-2 — Categorías: documentación dice obligatorio, schema lo deja opcional

## Severidad

```txt
P1 — Alto / contrato inconsistente
```

## Archivos

```txt
backend/src/api/schemas/producto.schema.js
DOCUMENTACION/IA/API.md
backend/tests/productos-categorias.test.js
```

## Problema

La documentación dice que `categorias` es obligatorio al crear producto:

```txt
createProductoSchema: { ..., categorias } — categorias es array obligatorio con mínimo 1.
```

Pero el schema backend lo define como opcional:

```js
categorias: z.array(z.enum(['Merienda', 'Cena'])).min(1).optional()
```

## Impacto real

Medio/alto.

Desde UI probablemente se envía `categorias`, porque `adminToApiPayload` las construye desde `meals`.

Pero por API directa, tests futuros o una IA que use el contrato backend, se puede crear producto sin categorías:

```txt
- producto queda en DB;
- no aparece en menú público por filtros Merienda/Cena;
- admin puede creer que producto existe correctamente;
- operación queda inconsistente.
```

## Cómo reproducir

Enviar:

```http
POST /api/admin/productos
```

con body sin `categorias`:

```json
{
  "nombre": "Producto sin categoría",
  "precio": 1000,
  "tipo": "comida",
  "stock_limitado": 1,
  "stock_actual": 10,
  "stock_minimo_alerta": 2,
  "activo": 1
}
```

Resultado esperado según docs:

```txt
400
```

Resultado probable actual:

```txt
201
```

porque `categorias` es opcional.

## Fix recomendado

Hacer categorías obligatorias en create y opcionales en update, pero si vienen no pueden estar vacías.

```js
const categoriasSchema = z.array(z.enum(['Merienda', 'Cena'])).min(1);

export const createProductoSchema = z.object({
  nombre: z.string().min(1).max(120),
  descripcion: z.string().max(500).optional(),
  precio: z.coerce.number().min(0),
  tipo: z.enum(['comida', 'bebida', 'promo']),
  categorias: categoriasSchema,
  stock_limitado: z.coerce.number().int().refine((v) => v === 0 || v === 1, {
    message: 'stock_limitado debe ser 0 o 1',
  }),
  stock_actual: z.coerce.number().int().min(0).optional(),
  stock_minimo_alerta: z.coerce.number().int().min(0).default(5),
  activo: z.coerce.number().int().refine((v) => v === 0 || v === 1).default(1),
}).strict();

export const updateProductoSchema = createProductoSchema.partial().extend({
  categorias: categoriasSchema.optional(),
}).strict();
```

## Tests recomendados

Backend:

```txt
[ ] POST /api/admin/productos sin categorias -> 400.
[ ] POST /api/admin/productos con categorias [] -> 400.
[ ] POST /api/admin/productos con ["Merienda"] -> 201.
[ ] POST /api/admin/productos con ["Cena"] -> 201.
[ ] PUT /api/admin/productos/:id sin categorias mantiene categorías existentes.
[ ] PUT /api/admin/productos/:id con categorias [] -> 400.
```

## Criterios de aceptación

```txt
[ ] Código y documentación coinciden.
[ ] No se pueden crear productos sin categoría.
[ ] Update puede omitir categorías sin borrarlas.
[ ] Update con categorías vacías falla.
[ ] Tests backend pasan.
```

---

# 7. P1-3 — PUT con solo categorías puede fallar

## Severidad

```txt
P1 — Alto / contrato parcial roto
```

## Archivos

```txt
backend/src/api/controllers/producto.controller.js
backend/src/api/models/producto.model.js
backend/tests/productos-categorias.test.js
```

## Problema

El `updateProductoSchema` permite updates parciales.

Pero en el controller:

```js
const { categorias, ...productoData } = req.body;
const affectedRows = await update(conn, id, productoData);
```

Si el body trae solo:

```json
{
  "categorias": ["Cena"]
}
```

entonces:

```js
productoData = {}
```

y el modelo ejecuta:

```js
UPDATE producto SET ? WHERE id = ?
```

con `{}`.

Eso puede generar SQL inválido o comportamiento inesperado.

## Impacto real

Medio.

La UI actual probablemente manda payload completo, pero el contrato backend declara updates parciales. Además, una IA o un futuro componente podría intentar actualizar solo categorías.

## Cómo reproducir

1. Crear producto con `categorias: ['Merienda']`.
2. Enviar:
   ```http
   PUT /api/admin/productos/:id
   ```
   con:
   ```json
   {
     "categorias": ["Cena"]
   }
   ```
3. Resultado esperado:
   ```txt
   200 y categorías actualizadas.
   ```
4. Resultado posible actual:
   ```txt
   error SQL / 500 / behavior inconsistente.
   ```

## Fix recomendado

En `actualizar`, solo ejecutar `UPDATE producto` si hay campos reales de producto.

```js
const keysProducto = Object.keys(productoData);

if (keysProducto.length > 0) {
  const affectedRows = await update(conn, id, productoData);
  if (affectedRows === 0) {
    throw new NotFoundError('Producto no encontrado');
  }
} else {
  const existente = await findByIdAdmin(pool, id);
  if (!existente) {
    throw new NotFoundError('Producto no encontrado');
  }
}

if (Object.prototype.hasOwnProperty.call(req.body, 'categorias')) {
  await setProductoCategorias(conn, id, categorias);
}
```

Mejor aún: usar `conn` para verificar existencia, no `pool`, para mantener la misma transacción.

## Tests recomendados

```txt
[ ] PUT /api/admin/productos/:id con solo categorias -> 200.
[ ] PUT solo categorias actualiza producto_categoria.
[ ] PUT solo categorias producto inexistente -> 404.
[ ] PUT body vacío -> 400 o regla definida.
```

## Criterios de aceptación

```txt
[ ] El contrato update parcial funciona.
[ ] Se puede actualizar solo categorías.
[ ] No hay SQL inválido con productoData vacío.
[ ] Producto inexistente devuelve 404.
[ ] Tests backend pasan.
```

---

# 8. P1-4 — Fallas conocidas de edición de caja siguen siendo riesgo

## Severidad

```txt
P1 si edición de caja está habilitada.
P2 si edición de caja no está visible/operativa.
```

## Contexto

Se reportan 3 fallos conocidos en `caja.test.js` relacionados con PR2 edit:

```txt
- PUT replaces items and total, stock reflects delta
- PUT works with promo combo and reconciles component stock
- PUT reconciles empty-to items correctly
```

## Impacto real

Alto si la UI permite corregir pedidos de caja.

El flujo real incluye:

```txt
- cliente pide en caja;
- caja puede necesitar modificar pedido;
- stock y combos deben reconciliarse bien;
- si falla, puede haber sobreventa o totales incorrectos.
```

## Decisión requerida

Elegir una de dos opciones antes de producción:

### Opción A — Edición de caja habilitada

Entonces hay que arreglar los tests y el flujo:

```txt
[ ] PUT reemplaza items y total correctamente.
[ ] PUT con promo combo reconcilia componentes.
[ ] PUT de pedido vacío a items funciona.
[ ] PUT con stock insuficiente hace rollback.
```

### Opción B — Edición de caja deshabilitada para evento

Entonces:

```txt
[ ] Ocultar botón editar pedido en UI.
[ ] Documentar deuda.
[ ] Mantener cancelación + recreación como workaround.
```

## Fix recomendado

Si no es indispensable para el evento, recomiendo **deshabilitar edición de caja** visualmente y dejarlo para una etapa posterior, salvo que ya esté muy cerca de resolverse.

## Criterios de aceptación

```txt
[ ] Si edición está visible, los tests PR2 edit pasan.
[ ] Si edición no está soportada, la UI no la ofrece.
[ ] Caja puede cancelar y recrear pedido como alternativa.
```

---

# 9. P2-1 — Menú no bloquea compra mientras configuración está loading/error

## Severidad

```txt
P2 — Medio
```

## Archivo

```txt
frontend/components/menu/menu-screen.tsx
```

## Problema

`MenuScreen` carga productos y configuración por separado.

El estado principal `state` depende solo de productos:

```ts
const state: LoadState = loading ? 'loading' : error ? 'error' : 'ready'
```

La configuración se usa así:

```ts
const isStoreClosed = storeConfig?.estado === 'cerrada'
const isStoreDemo = storeConfig?.estado === 'demo'
const isStoreDisabled = isStoreClosed || isStoreDemo
```

Si productos cargan primero y configuración todavía está cargando:

```txt
isStoreDisabled = false
```

Entonces las cards pueden estar habilitadas hasta que llegue config.

Si configuración falla:

```txt
storeConfig = null
isStoreDisabled = false
```

Entonces se podría agregar al carrito aunque no se pudo verificar si la tienda está abierta.

Checkout sí bloquea si `storeConfigLoading` o `storeConfigError`, lo cual evita el POST final, pero el menú puede dar una experiencia inconsistente.

## Impacto real

Medio.

No debería generar pedidos inválidos porque checkout y backend bloquean. Pero UX queda confusa.

## Fix recomendado

Capturar loading/error de configuración:

```ts
const {
  data: storeConfig,
  loading: storeConfigLoading,
  error: storeConfigError,
  refetch: refetchConfig,
} = useApiResource<ApiConfiguracion>(...)
```

Definir:

```ts
const isStoreDisabled =
  storeConfigLoading ||
  Boolean(storeConfigError) ||
  storeConfig?.estado === 'cerrada' ||
  storeConfig?.estado === 'demo'
```

Mostrar banner para error:

```txt
No pudimos verificar si la tienda está abierta. Reintentá.
```

Y botón:

```tsx
<button onClick={() => refetchConfig()}>Reintentar estado tienda</button>
```

## Tests recomendados

```txt
[ ] MenuScreen config loading deshabilita ProductCard.
[ ] MenuScreen config error deshabilita ProductCard.
[ ] MenuScreen config error muestra retry.
[ ] FloatingCartBar queda deshabilitado si config loading/error.
```

## Criterios de aceptación

```txt
[ ] Menú no permite agregar si no verificó estado de tienda.
[ ] Config error se comunica claramente.
[ ] Checkout sigue bloqueando.
[ ] Backend sigue siendo autoridad final.
```

---

# 10. P2-2 — Validación comprobante no cruza extensión y MIME estrictamente

## Severidad

```txt
P2 — Medio/bajo
```

## Archivos

```txt
frontend/components/menu/checkout-screen.tsx
backend/src/api/middlewares/upload.middleware.js
backend/src/api/utils/file-signature.utils.js
backend/tests/comprobantes.unit.test.js
```

## Estado actual positivo

Frontend valida:

```txt
- tamaño máximo 5 MB;
- extensiones jpg/jpeg/png/webp/pdf;
- MIME permitido image/jpeg, image/png, image/webp, application/pdf.
```

Backend valida:

```txt
- extensión permitida;
- MIME permitido;
- magic bytes según MIME.
```

Además, el caso solicitado `.jpg` con MIME `image/heif` se rechaza.

## Problema

La validación no parece cruzar estrictamente extensión y MIME.

Ejemplo:

```txt
archivo.png con MIME image/jpeg
```

Ambos son permitidos, y si los bytes son JPEG probablemente pasa. La extensión no coincide con el MIME.

## Impacto real

Bajo/medio.

No permite HEIC ni archivos fuera de política, y los magic bytes protegen el contenido. Pero si se pidió “mismatch sospechoso”, una política estricta debería rechazar extensión/MIME inconsistentes.

## Fix recomendado opcional

En backend:

```js
const expectedMime = ALLOWED_RECEIPT_EXTENSIONS[extension];

if (file.mimetype && expectedMime !== file.mimetype) {
  throw new ValidationError('La extensión del archivo no coincide con el tipo declarado.');
}
```

Considerar:

```txt
.jpg -> image/jpeg
.jpeg -> image/jpeg
```

En frontend, replicar la misma regla para UX temprana.

## Tests recomendados

```txt
[ ] .jpg + image/png -> 400 si se adopta política estricta.
[ ] .png + image/jpeg -> 400.
[ ] .jpeg + image/jpeg -> OK.
[ ] .jpg + image/jpeg -> OK.
```

## Criterios de aceptación

```txt
[ ] HEIC/HEIF rechazado.
[ ] >5MB rechazado.
[ ] Magic bytes siguen validándose.
[ ] Mismatch extensión/MIME se decide explícitamente.
```

---

# 11. P2-3 — Orden de categorías es determinístico, pero no necesariamente el enviado

## Severidad

```txt
P2 bajo
```

## Archivo

```txt
backend/src/api/models/producto.model.js
```

## Estado actual

`setProductoCategorias` deduplica categorías manteniendo orden de entrada para insertar:

```js
return [...new Set(normalizadas)];
```

Luego reconstruye ids en orden de entrada usando `categoriasNormalized`.

La salida pública/admin usa:

```sql
GROUP_CONCAT(c.nombre ORDER BY c.nombre SEPARATOR ', ')
```

Eso hace que el resultado sea determinístico por orden alfabético, no por orden enviado.

## Impacto real

Bajo.

Para Kermingo, las categorías son solo:

```txt
Cena
Merienda
```

y los mappers frontend detectan por regex. El orden visual no afecta funcionalidad.

## Recomendación

No tocar salvo que quieras mostrar siempre:

```txt
Merienda, Cena
```

En ese caso, usar `ORDER BY FIELD(c.nombre, 'Merienda', 'Cena')`.

---

# 12. P2-4 — NEXT_PUBLIC_API_URL obligatorio puede molestar en build local

## Severidad

```txt
P2 bajo / DX
```

## Archivos

```txt
frontend/package.json
frontend/scripts/check-env.mjs
frontend/scripts/env-guard.mjs
```

## Estado actual

El build ejecuta:

```json
"build": "NODE_ENV=production node scripts/check-env.mjs && next build"
```

El script falla si:

```txt
NODE_ENV=production
NEXT_PUBLIC_API_URL no está definido
```

## Impacto real

Positivo para producción. Puede molestar en local si alguien corre:

```bash
pnpm build
```

sin env.

## Fix recomendado

Documentar claramente:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001 pnpm build
```

Agregar si falta:

```txt
frontend/.env.local.example
```

con:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=false
```

## Criterios de aceptación

```txt
[ ] Producción no buildea sin NEXT_PUBLIC_API_URL.
[ ] Local tiene ejemplo claro.
[ ] README/DEPLOY lo documenta.
```

---

# 13. P2-5 — cena_habilitada_desde está expuesta; revisar formato visual

## Severidad

```txt
P2 bajo
```

## Archivos

```txt
frontend/components/admin/config-screen.tsx
backend/src/api/schemas/configuracion.schema.js
```

## Estado actual

La UI tiene input:

```tsx
type="time"
step={1}
```

y normaliza:

```ts
valor.length === 5 ? `${valor}:00` : valor
```

Backend acepta:

```txt
HH:MM:SS
```

## Impacto real

Bajo.

Algunos navegadores muestran `type=time` sin segundos aunque `step={1}`. El normalizador cubre `HH:MM`.

## Tests recomendados

```txt
[ ] ConfigScreen envía 19:00:00 cuando input devuelve 19:00.
[ ] ConfigScreen envía 19:00:30 cuando input devuelve 19:00:30.
[ ] ConfigScreen puede limpiar cena_habilitada_desde con null.
```

---

# 14. P3-1 — Datos bancarios hardcodeados

## Severidad

```txt
P3 — Mejora
```

## Archivo

```txt
frontend/components/menu/checkout-screen.tsx
```

## Estado

Los datos bancarios están hardcodeados en el frontend.

## Impacto

Bajo para MVP si son definitivos. Pero si cambian antes del evento, requiere deploy.

## Mejora futura

Mover datos bancarios a:

```txt
configuración backend
variables públicas controladas
pantalla admin config
```

---

# 15. P3-2 — package.json frontend con nombre genérico

## Severidad

```txt
P3 — Prolijidad
```

## Archivo

```txt
frontend/package.json
```

## Estado

```json
"name": "my-project"
```

## Mejora

Cambiar a:

```json
"name": "kermingo-frontend"
```

---

# 16. P3-3 — Warnings de hooks

## Severidad

```txt
P3 — Mejora
```

## Estado

Se reportan 4 warnings:

```txt
react-hooks/set-state-in-effect
```

## Recomendación

No bloquear. Documentar o resolver si no complica `useApiResource`.

---

# 17. Validaciones positivas por flujo

## 17.1 Compra pública online

Estado: **bien encaminado**.

El checkout:

```txt
- fuerza metodo_pago = transferencia;
- requiere receipt;
- envía FormData;
- guarda token de seguimiento;
- limpia carrito solo tras éxito.
```

Backend:

```txt
- bloquea efectivo público;
- exige comprobante para transferencia;
- valida stock transaccionalmente.
```

## 17.2 Tienda cerrada/demo

Estado: **corregido parcialmente**.

`MenuScreen`:

```txt
- lee /api/configuracion-tienda;
- muestra banner si cerrada/demo;
- deshabilita ProductCard;
- deshabilita FloatingCartBar.
```

`CheckoutScreen`:

```txt
- lee /api/configuracion-tienda;
- bloquea confirmar si loading/error/cerrada/demo.
```

Pendiente:

```txt
- bloquear también mientras config carga o falla en MenuScreen.
```

## 17.3 Comprobantes

Estado: **bien corregido**.

```txt
- Query por estado_pago específico.
- Metadata con url_publica.
- No expone drive_id en respuesta.
- Reaprobar rechazado permitido por backend.
```

## 17.4 Caja

Estado: **parcial**.

Positivo:

```txt
- Backend default efectivo sin estado_pago -> pagado.
- Frontend manda pagado para efectivo y pendiente para transferencia.
```

Pendiente:

```txt
- Filtros Merienda/Cena incorrectos.
- Edición de caja PR2 sigue con fallos conocidos si se habilita.
```

## 17.5 Cocina

Estado: **bien encaminado**.

```txt
- State machine ágil implementada.
- Entregado terminal.
- Polling cada 10 segundos.
- Tests focalizados reportados.
```

## 17.6 Productos e imágenes

Estado: **muy cerca**.

Positivo:

```txt
- Backend persiste categorías en producto_categoria.
- Frontend manda categorías desde meals.
- Imagen al crear producto usa onProductUpdated.
- Si upload falla, diálogo intenta quedar abierto.
```

Pendiente:

```txt
- Schema/documentación inconsistente sobre categorías obligatorias.
- PUT solo categorías puede fallar.
```

## 17.7 Configuración

Estado: **bien encaminado**.

```txt
- Updates parciales backend.
- UI para estado.
- UI para mensaje público.
- UI para cena_habilitada_desde.
- Normalización HH:MM -> HH:MM:SS.
```

---

# 18. Regresiones posibles introducidas por db0806c

```txt
1. Caja filtro Merienda/Cena roto por usar name.includes(filter).
2. POST producto sin categorías puede seguir aceptándose aunque docs dicen obligatorio.
3. PUT solo categorías puede romper por UPDATE con objeto vacío.
4. Menú permite agregar mientras configuración está loading/error.
5. Build local sin NEXT_PUBLIC_API_URL ahora falla; intencional, pero debe documentarse.
```

---

# 19. Qué probar manualmente antes del evento

## Público

```txt
[ ] Abrir /menu desde celular con datos.
[ ] Tienda abierta: agregar producto.
[ ] Tienda cerrada: no se puede agregar.
[ ] Tienda demo: no se puede agregar.
[ ] Config API lenta: verificar que no permita avanzar indebidamente.
[ ] Checkout solo transferencia.
[ ] PDF/JPG/PNG/WEBP aceptados.
[ ] HEIC rechazado.
[ ] Archivo >5MB rechazado.
[ ] Stock insuficiente muestra error claro.
[ ] Seguimiento por token funciona.
```

## Comprobantes

```txt
[ ] Pedido con comprobante_subido aparece en /admin/comprobantes.
[ ] Abrir comprobante con url_publica.
[ ] Aprobar.
[ ] Rechazar.
[ ] Reaprobar rechazado.
[ ] Confirmar response no contiene drive_id.
```

## Caja

```txt
[ ] Filtro Todos muestra productos.
[ ] Filtro Merienda muestra productos de Merienda.
[ ] Filtro Cena muestra productos de Cena.
[ ] Filtro Bebidas muestra bebidas.
[ ] Filtro Promos muestra promos.
[ ] Crear pedido efectivo queda pagado.
[ ] Crear pedido transferencia queda pendiente o según decisión.
[ ] Pedido aparece en cocina.
[ ] Cancelación repone stock.
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
```

## Productos

```txt
[ ] Crear producto Merienda aparece en menú Merienda.
[ ] Crear producto Cena aparece en menú Cena.
[ ] Crear producto sin categorías debe fallar si se adopta obligatoriedad.
[ ] Editar solo categorías funciona.
[ ] Crear producto con imagen exitosa actualiza lista.
[ ] Fallo de imagen mantiene modal abierto.
[ ] Reemplazar imagen.
[ ] Quitar imagen.
```

## Configuración

```txt
[ ] Guardar solo mensaje.
[ ] Guardar solo estado.
[ ] Guardar hora cena.
[ ] Body vacío falla.
[ ] Público refleja estado cerrado/demo.
```

## Auth

```txt
[ ] Login correcto.
[ ] Login inválido.
[ ] Logout.
[ ] Ruta admin sin sesión.
[ ] Cookie vencida.
[ ] Sin flash de contenido protegido.
[ ] Credenciales demo ocultas.
```

---

# 20. Lista priorizada de fixes

```txt
1. Arreglar filtros Merienda/Cena en Caja rápida usando categorías reales.
2. Decidir y alinear contrato de categorias obligatorias en create.
3. Soportar PUT /productos/:id con solo categorías.
4. Bloquear menú también cuando config está loading/error.
5. Agregar/confirmar tests para filtro Caja por categoría.
6. Agregar test para POST producto sin categorías.
7. Agregar test para PUT solo categorías.
8. Agregar test de config loading/error en MenuScreen.
9. Documentar NEXT_PUBLIC_API_URL en .env.local.example o README frontend.
10. Resolver o dejar explícitamente fuera de alcance los 3 fallos heredados de caja edit.
```

---

# 21. Tests recomendados

## Backend

```txt
[ ] POST /api/admin/productos sin categorias -> 400.
[ ] POST /api/admin/productos con categorias [] -> 400.
[ ] POST /api/admin/productos con ["Merienda"] -> 201.
[ ] POST /api/admin/productos con ["Cena"] -> 201.
[ ] PUT /api/admin/productos/:id sin categorias mantiene categorías.
[ ] PUT /api/admin/productos/:id con categorias [] -> 400.
[ ] PUT /api/admin/productos/:id con solo categorias -> 200.
[ ] PUT solo categorias producto inexistente -> 404.
[ ] Caja efectivo sin estado_pago -> pagado.
[ ] Caja transferencia sin estado_pago -> pendiente o regla definida.
[ ] GET comprobante metadata no expone drive_id.
```

## Frontend

```txt
[ ] Caja filter "cena" muestra producto con categorias = "Cena".
[ ] Caja filter "merienda" muestra producto con categorias = "Merienda".
[ ] Caja filter "bebida" muestra bebidas.
[ ] Caja filter "promo" muestra promos.
[ ] MenuScreen config loading deshabilita ProductCard.
[ ] MenuScreen config error deshabilita ProductCard.
[ ] MenuScreen config error muestra retry.
[ ] Checkout HEIC rechazado.
[ ] Checkout >5MB rechazado.
[ ] Checkout PDF/JPG/PNG/WEBP aceptados.
[ ] ProductFormDialog error upload mantiene abierto.
[ ] ProductFormDialog success actualiza lista.
```

---

# 22. Comandos de verificación final

## Backend

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/backend

npm test -- --testPathPattern='(productos-categorias|producto-imagen)'
npm test -- --testPathPattern=comprobantes.unit
npm test -- --testPathPattern=caja --testNamePattern='P1-4'
npm test -- --testPathPattern=cocina
```

## Frontend

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/frontend

pnpm test
pnpm exec tsc --noEmit
pnpm lint
NEXT_PUBLIC_API_URL=http://localhost:3001 pnpm build
```

## Repo

```bash
git diff --check
```

---

# 23. Criterios de aceptación para merge

```txt
[ ] P1-1 corregido: Caja filtra Merienda/Cena por categoría real.
[ ] P1-2 resuelto: categorias create obligatorio o documentación alineada.
[ ] P1-3 corregido: PUT solo categorias funciona o queda prohibido por schema.
[ ] Edición de caja: decisión explícita habilitada con tests o deshabilitada en UI.
[ ] Tests focalizados pasan.
[ ] Frontend build/typecheck/lint pasan.
[ ] QA manual de caja, menú, checkout, comprobantes y cocina sin errores.
```

---

# 24. Veredicto final

## Estado actual

```txt
No mergeable todavía por P1-1.
```

## Estado esperado después de P1-1/P1-2/P1-3

```txt
Mergeable con fixes P2/P3 pendientes.
```

## Estado esperado antes de producción/evento

```txt
Debe tener QA manual completo en:
- notebook caja
- tablet cocina
- celular compra pública
- Drive comprobantes
- Drive imágenes
- Railway/Vercel
```
