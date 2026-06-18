# 57 — Auditoría técnica B7 — Admin flows & visuals

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
bb1e24187220ef972930cffebed1b8dafed980d6
```

## Commit message

```txt
feat: refine admin flows and visuals
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

# 1. Contexto de la auditoría

Kermingo es una aplicación web para un evento scout/kermesse.

## Stack

```txt
Frontend:
- Next.js
- React
- TypeScript
- TailwindCSS
- localStorage para carrito
- Admin con cookie httpOnly + AdminSessionProvider

Backend:
- Node.js
- Express
- MySQL
- API REST
- Zod
- Multer
- JWT en cookie httpOnly
- Google Drive OAuth
```

## Áreas revisadas

```txt
1. Admin visual alignment.
2. Auth admin con cookie httpOnly.
3. Cocina y nueva state machine ágil.
4. Imágenes de productos y ABSOLUTE_IMAGE_URL.
5. Backend: pedidos, cocina, productos, comprobantes, auth, config.
6. Seguridad: CORS, CSRF, cookies, datos expuestos.
7. Tests y falsa cobertura.
8. Riesgos operativos para el evento.
```

## Evidencia local reportada

```txt
Backend npm test: 225 tests passing.
Frontend pnpm test: 132 tests passing.
```

## Aclaración

Esta auditoría es una revisión técnica estática del código del branch y del commit informado. No ejecuté tests en mi entorno.

---

# 2. Veredicto general

## Veredicto

```txt
BLOQUEAR deploy/merge final hasta corregir P0-1.
```

Como rama de trabajo, el snapshot está bien encaminado. El último commit mejora visuales, flujo admin y documentación. Pero detecté un bug operativo importante en la pantalla de comprobantes que puede impedir revisar pagos por transferencia, que es un flujo central del evento.

## Estado resumido

```txt
¿El branch compila según evidencia local? Sí.
¿Hay buena base técnica? Sí.
¿La sesión admin está mejor encaminada? Sí.
¿La cocina nueva está alineada entre UI/backend? Bastante sí.
¿Hay un bug bloqueante operativo? Sí: comprobantes puede cargar vacío.
¿Listo para producción/evento? No todavía.
¿Listo para seguir iterando? Sí.
```

---

# 3. Resumen de hallazgos

## P0 — Bloqueante

```txt
P0-1 — /admin/comprobantes puede no mostrar comprobantes subidos por usar solo_pagos_pendientes=true.
```

## P1 — Debe corregirse antes de merge final

```txt
P1-1 — “Reaprobar” comprobante rechazado intenta transición inválida rechazado -> pagado.
P1-2 — Guardar mensaje público en Config puede fallar porque backend exige estado.
P1-3 — Credenciales demo visibles en login admin.
P1-4 — API_BASE tiene fallback LAN útil en dev, pero peligroso/roto si falta env en producción.
P1-5 — Faltan tests reales de la nueva state machine de cocina.
```

## P2 — Riesgos medios / deuda técnica

```txt
P2-1 — AdminSessionProvider puede renderizar children en estado unauthenticated mientras redirige.
P2-2 — Estados de pago se colapsan demasiado en mappers admin.
P2-3 — Al crear producto con imagen, la lista puede no actualizar imagen hasta refrescar.
P2-4 — Admin Productos carga solo 24 productos.
P2-5 — drive_id se expone en metadata admin de comprobante.
P2-6 — CORS/CSRF está bien encaminado pero requiere tests de producción.
```

## P3 — Mejoras menores

```txt
P3-1 — QA visual manual requerido en notebook/tablet/celular.
P3-2 — Revisar referencias antiguas a diseno-de-landing-kermingo como carpeta versionada.
P3-3 — Reportes puede quedar placeholder, pero sin métricas falsas.
```

---

# 4. P0-1 — Comprobantes puede no mostrar comprobantes subidos

## Severidad

```txt
P0 — Bloquea deploy/merge final
```

## Riesgo real

Muy alto. El flujo principal de compra online ahora depende de:

```txt
cliente paga por transferencia
→ sube comprobante
→ caja revisa comprobante
→ caja marca pagado/rechazado
```

Si `/admin/comprobantes` no muestra los pedidos con `estado_pago = comprobante_subido`, caja no puede revisar pagos.

## Archivo frontend

```txt
kermingo_menu/frontend/components/admin/comprobantes-screen.tsx
```

## Líneas aproximadas

```txt
loadOrders: líneas 88-97
filtered: líneas 113-119
```

## Código problemático conceptual

En `loadOrders`, la pantalla usa:

```ts
const params = {
  solo_pagos_pendientes: filter === 'all' ? undefined : 'true',
  limit: 100,
}
```

Luego filtra en cliente:

```ts
if (filter === 'comprobante_subido') {
  list = list.filter((o) => o.estado_pago === 'comprobante_subido')
}
```

## Archivo backend

```txt
kermingo_menu/backend/src/api/models/pedido.model.js
```

## Líneas aproximadas

```txt
findAllAdmin solo_pagos_pendientes: líneas 48-56
```

## Código backend relevante

```js
if (filters.solo_pagos_pendientes === true) {
  conditions.push("AND p.estado_pago IN ('pendiente','rechazado')");
  conditions.push("AND p.estado_pedido != 'cancelado'");
}
```

## Problema

El frontend pide:

```txt
solo_pagos_pendientes=true
```

pero después intenta mostrar:

```txt
estado_pago = comprobante_subido
```

El backend, con `solo_pagos_pendientes=true`, devuelve:

```txt
pendiente
rechazado
```

No devuelve:

```txt
comprobante_subido
```

Resultado probable:

```txt
/admin/comprobantes default queda vacío aunque existan comprobantes a revisar.
```

## Fix recomendado

Corregir frontend para pedir explícitamente el estado que necesita.

### Opción recomendada

Modificar `loadOrders` en `comprobantes-screen.tsx`:

```ts
const loadOrders = useCallback(async () => {
  setLoading(true)
  setError(null)

  try {
    const params: Record<string, string | number | undefined> = {
      limit: 100,
      metodo_pago: 'transferencia',
      origen: 'online',
    }

    if (filter === 'comprobante_subido') {
      params.estado_pago = 'comprobante_subido'
    } else if (filter === 'rechazado') {
      params.estado_pago = 'rechazado'
    }

    const data = await apiGet<{
      pedidos: ApiPedidoListItem[]
      paginacion: { total: number }
    }>('/api/admin/pedidos', params)

    setOrders(data.pedidos)
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      expireSession()
      return
    }
    setError(err instanceof Error ? err.message : 'Error al cargar pedidos')
  } finally {
    setLoading(false)
  }
}, [filter, expireSession])
```

Y simplificar `filtered` para que solo aplique búsqueda, o mantener un filtro defensivo.

### Opción alternativa

Cambiar backend para que `solo_pagos_pendientes=true` incluya `comprobante_subido`:

```sql
AND p.estado_pago IN ('pendiente','rechazado','comprobante_subido')
```

Pero esta opción puede afectar a Caja u otras pantallas que usan ese filtro con otro significado. Por eso recomiendo corregir frontend en Comprobantes.

## Tests requeridos

### Frontend

```txt
[ ] /admin/comprobantes default carga estado_pago=comprobante_subido.
[ ] /admin/comprobantes rechazados carga estado_pago=rechazado.
[ ] /admin/comprobantes all carga transferencias online.
[ ] La búsqueda local sigue funcionando.
```

### Backend opcional

```txt
[ ] GET /api/admin/pedidos?estado_pago=comprobante_subido devuelve comprobantes.
[ ] GET /api/admin/pedidos?metodo_pago=transferencia&origen=online filtra correctamente.
```

## Criterios de aceptación

```txt
[ ] Un pedido online con transferencia y comprobante aparece en /admin/comprobantes.
[ ] El filtro “Pendientes” muestra comprobante_subido.
[ ] El filtro “Rechazados” muestra rechazados.
[ ] Aprobar y rechazar siguen funcionando.
[ ] No se rompe la pantalla de caja.
```

---

# 5. P1-1 — “Reaprobar” comprobante rechazado intenta transición inválida

## Severidad

```txt
P1 — Corregir antes de merge final
```

## Riesgo real

Medio/alto. Si caja rechazó un comprobante por error, la UI ofrece “Reaprobar”, pero el backend probablemente lo rechaza.

## Archivo backend

```txt
kermingo_menu/backend/src/api/models/pedido.model.js
```

## Líneas aproximadas

```txt
transitionsByMethod: líneas 68-79
```

## State machine actual

Para transferencia:

```js
transferencia: {
  pendiente: ['pagado', 'comprobante_subido'],
  comprobante_subido: ['pagado', 'rechazado'],
  rechazado: ['pendiente', 'comprobante_subido'],
  pagado: [],
}
```

Esto significa que backend permite:

```txt
rechazado -> pendiente
rechazado -> comprobante_subido
```

pero no:

```txt
rechazado -> pagado
```

## Archivo frontend

```txt
kermingo_menu/frontend/components/admin/comprobantes-screen.tsx
```

## Líneas aproximadas

```txt
ComprobanteCard reapprove: líneas 173-181
Modal reapprove: líneas 133-141
```

## Problema

La acción “Reaprobar” llama a `markPaid`, o sea intenta:

```txt
rechazado -> pagado
```

Pero esa transición no existe.

## Opciones de solución

### Opción A — Recomendación para evento: permitir reaprobar directo

Cambiar backend:

```js
rechazado: ['pendiente', 'comprobante_subido', 'pagado'],
```

Ventaja:

```txt
Caja puede corregir rápido un rechazo equivocado.
```

Tests:

```txt
[ ] transferencia rechazado -> pagado devuelve 200.
[ ] efectivo rechazado -> pagado no aplica.
[ ] pagado sigue terminal.
```

### Opción B — Mantener state machine estricta y cambiar UI

Cambiar UI:

```txt
“Reaprobar” -> “Volver a revisión”
```

y enviar:

```ts
apiPatch(`/api/admin/pedidos/${id}/pago`, {
  estado_pago: 'comprobante_subido',
})
```

Luego caja puede aprobar desde `comprobante_subido`.

Ventaja:

```txt
Respeta state machine actual.
```

Desventaja:

```txt
Más pasos durante el evento.
```

## Recomendación

Para el evento, recomiendo **Opción A**:

```txt
permitir rechazado -> pagado para transferencia.
```

El admin ya está revisando manualmente el comprobante; la acción directa es más fluida.

## Criterios de aceptación

```txt
[ ] Si la UI muestra “Reaprobar”, backend acepta rechazado -> pagado.
[ ] Si backend no lo acepta, la UI no debe ofrecer esa acción.
[ ] Hay test backend de la transición elegida.
[ ] Hay test frontend del botón.
```

---

# 6. P1-2 — Guardar mensaje público en Config puede fallar

## Severidad

```txt
P1 — Corregir antes de merge final
```

## Riesgo real

Medio/alto. El admin puede intentar actualizar el mensaje público y recibir error de validación, aunque la UI parezca correcta.

## Archivo frontend

```txt
kermingo_menu/frontend/components/admin/config-screen.tsx
```

## Líneas aproximadas

```txt
handleUpdateMessage: líneas 59-66
```

## Código frontend

```ts
const updated = await apiPut<ApiConfiguracion>('/api/admin/configuracion-tienda', {
  mensaje_publico: config.mensaje_publico || '',
})
```

## Archivo backend

```txt
kermingo_menu/backend/src/api/schemas/configuracion.schema.js
```

## Líneas aproximadas

```txt
schema: líneas 5-16
```

## Schema actual

```js
export const updateConfiguracionSchema = z.object({
  estado: z.enum(['abierta', 'cerrada', 'demo']),
  mensaje_publico: z.string().max(500).nullable().optional(),
  cena_habilitada_desde: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/, 'Formato esperado: HH:MM:SS')
    .nullable()
    .optional(),
}).strict();
```

## Problema

`estado` es obligatorio.

Pero frontend envía solo:

```json
{
  "mensaje_publico": "..."
}
```

## Modelo backend

El modelo sí soporta updates parciales:

```txt
updateMinimal() solo agrega campos presentes.
```

## Fix recomendado

Hacer `estado` opcional y exigir al menos un campo.

```js
export const updateConfiguracionSchema = z.object({
  estado: z.enum(['abierta', 'cerrada', 'demo']).optional(),
  mensaje_publico: z.string().max(500).nullable().optional(),
  cena_habilitada_desde: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/, 'Formato esperado: HH:MM:SS')
    .nullable()
    .optional(),
}).strict().refine(
  (data) =>
    data.estado !== undefined ||
    data.mensaje_publico !== undefined ||
    data.cena_habilitada_desde !== undefined,
  { message: 'Debe enviarse al menos un campo para actualizar' }
);
```

## Tests requeridos

```txt
[ ] PUT /api/admin/configuracion-tienda con solo estado -> 200.
[ ] PUT /api/admin/configuracion-tienda con solo mensaje_publico -> 200.
[ ] PUT /api/admin/configuracion-tienda con solo cena_habilitada_desde -> 200.
[ ] PUT /api/admin/configuracion-tienda con body vacío -> 400.
[ ] PUT /api/admin/configuracion-tienda con estado inválido -> 400.
```

## Criterios de aceptación

```txt
[ ] Botón “Guardar mensaje” funciona.
[ ] Botón “Abrir/Cerrar tienda” funciona.
[ ] Backend valida campos inválidos.
[ ] Body vacío no se acepta.
[ ] La UI muestra errores claros.
```

---

# 7. P1-3 — Credenciales demo visibles en login admin

## Severidad

```txt
P1 — Corregir antes de deploy
```

## Riesgo real

Alto si esas credenciales existen en producción.

## Archivo

```txt
kermingo_menu/frontend/components/admin/login-screen.tsx
```

## Líneas aproximadas

```txt
Credenciales demo visibles: líneas 178-183
```

## Problema

La UI muestra:

```txt
admin@kermingo.com / admin123
```

Esto no debe aparecer en producción.

## Fix recomendado

Mostrar solo si existe una variable pública explícita:

```tsx
{process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS === 'true' && (
  <p className="pt-1 text-center text-[11px] text-[#6B7280]">
    Credenciales de prueba:{' '}
    <code className="rounded bg-[#EEF5FF] px-1.5 py-0.5 text-[#003B73]">
      admin@kermingo.com
    </code>{' '}
    /{' '}
    <code className="rounded bg-[#EEF5FF] px-1.5 py-0.5 text-[#003B73]">
      admin123
    </code>
  </p>
)}
```

En producción:

```env
NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=false
```

o directamente no definirla.

## También revisar

```txt
backend/src/api/database/seed.sql
Railway variables
admin real
```

Confirmar que la contraseña de producción no sea:

```txt
admin123
```

## Tests requeridos

```txt
[ ] Login no muestra credenciales cuando NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS no está seteada.
[ ] Login muestra credenciales solo cuando NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=true.
```

## Criterios de aceptación

```txt
[ ] No se muestran credenciales demo en producción.
[ ] Password real de producción no es admin123.
[ ] La documentación aclara cómo activar modo demo si se necesita.
```

---

# 8. P1-4 — API_BASE fallback LAN puede romper producción si falta env

## Severidad

```txt
P1 — Corregir/validar antes de deploy
```

## Archivo

```txt
kermingo_menu/frontend/lib/config.ts
```

## Líneas aproximadas

```txt
API_BASE: líneas 3-12
ABSOLUTE_IMAGE_URL: líneas 14-18
```

## Código actual

```ts
const DEFAULT_API_BASE = 'http://localhost:3001'

function inferBrowserApiBase(): string {
  if (typeof window === 'undefined') return DEFAULT_API_BASE
  const { protocol, hostname } = window.location
  return `${protocol}//${hostname}:3001`
}

export const API_BASE: string =
  process.env.NEXT_PUBLIC_API_URL || inferBrowserApiBase()
```

## Lo bueno

Esto ayuda mucho en desarrollo LAN:

```txt
abrís frontend desde tablet/celular
→ infiere http://IP_DE_LA_NOTEBOOK:3001
```

## Problema

En producción, si Vercel no tiene `NEXT_PUBLIC_API_URL`, se puede inferir algo inválido:

```txt
https://tu-app.vercel.app:3001
```

## Fix recomendado

### Opción segura

```ts
const DEFAULT_API_BASE = 'http://localhost:3001'

function inferBrowserApiBase(): string {
  if (typeof window === 'undefined') return DEFAULT_API_BASE

  if (process.env.NODE_ENV === 'production') {
    console.error('NEXT_PUBLIC_API_URL es requerido en producción')
    return ''
  }

  const { protocol, hostname } = window.location
  return `${protocol}//${hostname}:3001`
}

export const API_BASE: string =
  process.env.NEXT_PUBLIC_API_URL || inferBrowserApiBase()
```

### Opción más estricta

Para build/deploy, documentar y validar en CI:

```txt
NEXT_PUBLIC_API_URL obligatorio para producción.
```

## Criterios de aceptación

```txt
[ ] En Vercel está configurado NEXT_PUBLIC_API_URL.
[ ] Producción no depende de fallback LAN.
[ ] Desarrollo LAN sigue funcionando.
[ ] ABSOLUTE_IMAGE_URL sigue convirtiendo imagen_url relativas correctamente.
```

---

# 9. P1-5 — Faltan tests reales de cocina state machine

## Severidad

```txt
P1 — Corregir antes de merge final
```

## Lo implementado

Backend:

```txt
TRANSICIONES_VALIDAS:
recibido -> en_preparacion | listo
en_preparacion -> recibido | listo
listo -> en_preparacion | entregado
entregado -> terminal
```

Archivo:

```txt
kermingo_menu/backend/src/api/models/pedido.model.js
```

Líneas aproximadas:

```txt
TRANSICIONES_VALIDAS: líneas 49-58
```

Controller cocina:

```txt
cambiarEstadoCocina valida transicionEstadoValida y luego updateEstadoPedido.
```

Archivo:

```txt
kermingo_menu/backend/src/api/controllers/cocina.controller.js
```

Líneas aproximadas:

```txt
cambiarEstadoCocina: líneas 53-73
```

Frontend:

```txt
getActions(status)
```

Archivo:

```txt
kermingo_menu/frontend/lib/cocina-actions.ts
```

Líneas aproximadas:

```txt
acciones: líneas 20-49
```

## Problema

El test `backend/tests/cocina.test.js` visible solo cubre endpoints sin autenticación.

No se ven tests suficientes de transiciones válidas/inválidas.

## Tests backend requeridos

```txt
[ ] recibido -> en_preparacion = 200.
[ ] recibido -> listo = 200.
[ ] recibido -> entregado = 400.
[ ] en_preparacion -> recibido = 200.
[ ] en_preparacion -> listo = 200.
[ ] en_preparacion -> entregado = 400.
[ ] listo -> en_preparacion = 200.
[ ] listo -> entregado = 200.
[ ] entregado -> listo = 400.
[ ] same-state transition = 400.
```

## Tests frontend requeridos

```txt
[ ] getActions('recibido') devuelve Empezar y Listo directo.
[ ] getActions('preparacion') devuelve Volver a recibido y Marcar listo.
[ ] getActions('listo') devuelve Volver a preparación y Entregado.
[ ] getActions('entregado') devuelve [].
[ ] getActions('cancelado') devuelve [].
```

## Criterios de aceptación

```txt
[ ] Backend y frontend están alineados en la state machine.
[ ] Entregado sigue terminal.
[ ] No se permite recibido -> entregado.
[ ] No se permite en_preparacion -> entregado.
[ ] No se permiten transiciones al mismo estado.
[ ] Tests pasan.
```

---

# 10. P2-1 — AdminSessionProvider renderiza children en estado unauthenticated

## Severidad

```txt
P2 — Riesgo medio
```

## Archivo

```txt
kermingo_menu/frontend/components/admin/admin-session.tsx
```

## Líneas aproximadas

```txt
clearAndRedirect: líneas 85-91
render provider: líneas 177-201
```

## Problema

Cuando `/api/auth/me` devuelve 401:

```ts
setStatus('unauthenticated')
router.replace('/admin')
```

Pero el render solo intercepta:

```txt
error
loading
```

Cualquier otro estado renderiza `children`, incluido `unauthenticated`.

## Riesgo

Puede haber un flash de contenido admin o se pueden disparar requests de componentes hijos antes de redirigir.

## Fix recomendado

Agregar caso explícito:

```tsx
{status === 'unauthenticated' ? (
  <div className="flex min-h-screen items-center justify-center bg-[#EEF5FF]">
    <p className="text-sm font-medium text-[var(--km-tinta-suave)]">
      Redirigiendo al login…
    </p>
  </div>
) : status === 'error' ? (
  ...
) : status === 'loading' ? (
  ...
) : (
  children
)}
```

## Criterios de aceptación

```txt
[ ] Cuando status = unauthenticated no se renderiza admin.
[ ] Redirige a /admin.
[ ] No hay flash de contenido protegido.
[ ] Tests de sesión cubren 401.
```

---

# 11. P2-2 — Estados de pago se colapsan en mappers admin

## Severidad

```txt
P2 — Riesgo medio
```

## Archivo

```txt
kermingo_menu/frontend/lib/admin.ts
```

## Líneas aproximadas

```txt
PayStatus: líneas 90-92
mapPayStatus: líneas 146-148
```

## Código actual

```ts
export type PayStatus = 'pendiente' | 'pagado'

function mapPayStatus(s: string): PayStatus {
  return s === 'pagado' ? 'pagado' : 'pendiente'
}
```

## Problema

Se pierde información importante:

```txt
comprobante_subido -> pendiente
rechazado -> pendiente
```

En algunas pantallas puede estar bien simplificar, pero en admin operativo conviene distinguirlos.

## Fix recomendado

Extender tipo:

```ts
export type PayStatus =
  | 'pendiente'
  | 'comprobante_subido'
  | 'pagado'
  | 'rechazado'

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

Luego actualizar badges en pantallas que usen `payStatus`.

## Criterios de aceptación

```txt
[ ] Admin distingue pendiente.
[ ] Admin distingue comprobante_subido.
[ ] Admin distingue rechazado.
[ ] Admin distingue pagado.
[ ] Cocina/Pedidos/Dashboard no pierden información operativa.
```

---

# 12. P2-3 — Crear producto con imagen no actualiza lista o cierra ocultando error

## Severidad

```txt
P2 — Riesgo medio
```

## Archivo

```txt
kermingo_menu/frontend/components/admin/product-form-dialog.tsx
```

## Líneas aproximadas

```txt
create mode upload: líneas 179-193
uploadImage helper: líneas 32-35 del bloque final
```

## Problema

En modo creación:

```txt
1. Se crea producto.
2. Si había archivo pendiente, se sube imagen.
3. El retorno actualizado de uploadImage no se usa para actualizar la lista.
4. Si falla imagen, setLocalSubmitError se setea, pero luego el diálogo se cierra igual.
```

## Riesgo

El producto queda creado pero sin imagen visible hasta refrescar, o el usuario no ve que falló la imagen.

## Fix recomendado

### Después de upload exitoso

Modificar el flujo para usar el producto actualizado:

```ts
const updated = await uploadImage(saved.id, pendingFile)
const updatedImage = ABSOLUTE_IMAGE_URL(updated.imagen_url)

const savedWithImage: AdminProduct = {
  ...saved,
  image: updatedImage,
}

onImageUploaded?.(savedWithImage)
```

Más simple: hacer que `onSave` acepte o refresque después de subir imagen:

```ts
await uploadImage(saved.id, pendingFile)
await onRefreshProducts()
```

### Si falla imagen

No cerrar automáticamente:

```ts
catch (err) {
  setLocalSubmitError(
    err instanceof ApiError
      ? `Producto creado, pero la imagen no se pudo subir: ${err.message}`
      : 'Producto creado, pero la imagen no se pudo subir'
  )
  return
}
```

Y mostrar botones:

```txt
Reintentar imagen
Cerrar igual
```

## Criterios de aceptación

```txt
[ ] Crear producto con imagen muestra imagen en lista sin refrescar manual.
[ ] Si falla upload, el usuario ve el error.
[ ] El diálogo no se cierra ocultando el error.
[ ] Editar producto con imagen sigue funcionando.
[ ] Quitar imagen sigue funcionando.
```

---

# 13. P2-4 — Productos admin carga solo 24 productos

## Severidad

```txt
P2 — Riesgo medio
```

## Archivo

```txt
kermingo_menu/frontend/components/admin/products-screen.tsx
```

## Líneas aproximadas

```txt
apiGet /api/admin/productos limit 24: líneas 78-88
```

## Problema

```ts
apiGet<ApiProductoPaginada>('/api/admin/productos', { limit: 24 })
```

El evento puede superar 24 productos. Ya se había hablado de más productos posibles.

## Fix recomendado

Para MVP:

```ts
const data = await apiGet<ApiProductoPaginada>('/api/admin/productos', { limit: 100 })
```

Mejor futuro:

```txt
paginación real o “cargar más”.
```

## Criterios de aceptación

```txt
[ ] Admin ve todos los productos esperados.
[ ] Si hay más de 24, se muestran o hay paginación.
[ ] Búsqueda/filtros operan sobre todos los productos cargados.
```

---

# 14. P2-5 — `drive_id` expuesto en metadata admin de comprobante

## Severidad

```txt
P2 — Seguridad/datos, no crítico porque es admin-only
```

## Archivo

```txt
kermingo_menu/backend/src/api/controllers/pedido.controller.js
```

## Líneas aproximadas

```txt
obtenerComprobante: líneas 120-127
```

## Problema

El endpoint admin devuelve:

```txt
drive_id
nombre_original
mime_type
tamanio_bytes
url_publica
created_at
```

`drive_id` no parece necesario para la UI.

## Fix recomendado

Devolver solo:

```js
return respuestaExitosa(res, {
  nombre_original: archivo.nombre_original,
  mime_type: archivo.mime_type,
  tamanio_bytes: archivo.tamanio_bytes,
  url_publica: archivo.url_publica,
  created_at: archivo.created_at,
}, 'Comprobante obtenido correctamente');
```

## Criterios de aceptación

```txt
[ ] UI sigue funcionando.
[ ] No se expone drive_id si no hace falta.
[ ] Admin puede abrir url_publica.
```

---

# 15. P2-6 — CORS/CSRF requiere tests de producción

## Severidad

```txt
P2 — Seguridad
```

## Estado actual positivo

En backend:

```txt
devFrontendOriginPatterns = [] en producción.
FRONTEND_URL es requerido en producción.
requireTrustedOrigin valida métodos unsafe.
Origin confiable o Referer confiable si no hay Origin.
```

Archivos:

```txt
kermingo_menu/backend/src/api/config/environments.js
kermingo_menu/backend/src/api/middlewares/origin.middleware.js
```

## Tests recomendados

```txt
[ ] NODE_ENV=production + Origin LAN -> 403.
[ ] NODE_ENV=production + FRONTEND_URL -> 200.
[ ] Sin Origin ni Referer en ruta mutante admin -> 403.
[ ] Referer confiable sin Origin -> 200.
[ ] Referer inválido sin Origin -> 403.
```

## Criterios de aceptación

```txt
[ ] LAN automático solo development.
[ ] Producción solo origins explícitos.
[ ] No hay wildcard con credentials.
[ ] Mutaciones admin protegidas.
```

---

# 16. P3 — QA visual y documentación

## P3-1 — QA visual manual

Probar en:

```txt
[ ] Notebook 1366px.
[ ] Notebook 1920px.
[ ] Tablet horizontal.
[ ] Tablet vertical.
[ ] Celular fallback.
```

Pantallas:

```txt
/admin
/admin/dashboard
/admin/caja
/admin/pedidos
/admin/comprobantes
/admin/cocina
/admin/productos
/admin/config
/admin/reportes
/menu
/carrito
/confirmar
/confirmado
/seguimiento
```

## P3-2 — Referencia visual local

El commit documenta que:

```txt
diseno-de-landing-kermingo/ es local, no versionada.
```

Hacer búsqueda por referencias viejas:

```bash
grep -R "diseno-de-landing-kermingo" -n .
```

Criterio:

```txt
[ ] Ningún documento dice que la carpeta versionada es obligatoria.
[ ] AGENTS.md aclara que es local.
[ ] CI/build no depende de esa carpeta.
```

## P3-3 — Reportes

Si reportes no está integrado:

```txt
[ ] Mostrar “Reportes en integración”.
[ ] No mostrar métricas falsas.
[ ] No prometer export que no existe.
```

---

# 17. Positivos detectados

## 17.1 Pedido público bloquea efectivo

Backend ya tiene validación:

```txt
metodo_pago === efectivo -> ValidationError
transferencia sin comprobante -> ValidationError
```

Archivo:

```txt
backend/src/api/controllers/pedido.controller.js
```

Líneas aproximadas:

```txt
30-42
```

## 17.2 Caja sigue separada

`crearCaja` usa:

```txt
origen: caja
```

y no tiene la restricción de efectivo público.

Archivo:

```txt
backend/src/api/controllers/pedido.controller.js
```

Líneas aproximadas:

```txt
87-99
```

## 17.3 Admin session está bien encaminado

`AdminSessionProvider` declara explícitamente:

```txt
verdad = cookie httpOnly + /api/auth/me
localStorage = cache UI
no JWT real
```

y usa `credentials: include`.

Archivos:

```txt
frontend/components/admin/admin-session.tsx
frontend/lib/api.ts
frontend/components/admin/login-screen.tsx
```

## 17.4 API client centralizado

`apiGet`, `apiPost`, `apiPostForm`, `apiPut`, `apiPatch`, `apiDelete` usan:

```txt
credentials: include
```

y callback de 401.

## 17.5 Imágenes relativas corregidas

`ABSOLUTE_IMAGE_URL` convierte `imagen_url` relativa a absoluta usando `API_BASE`.

Archivos:

```txt
frontend/lib/config.ts
frontend/lib/admin.ts
frontend/components/admin/product-form-dialog.tsx
```

## 17.6 Comprobantes usa metadata/url_publica

La pantalla usa:

```txt
GET /api/admin/pedidos/:id/comprobante
url_publica
```

y no intenta descargar bytes desde un endpoint inexistente.

---

# 18. Regresiones posibles por el último commit

## Regresión 1 — Comprobantes vacío

El cambio visual puede haber dejado una query incompatible con backend.

Estado:

```txt
P0-1
```

## Regresión 2 — Guardar mensaje público falla

Config visual funciona, pero schema exige `estado`.

Estado:

```txt
P1-2
```

## Regresión 3 — Reaprobar rechazado falla

UI ofrece acción que backend no permite.

Estado:

```txt
P1-1
```

## Regresión 4 — Admin sin sesión puede mostrar flash

`unauthenticated` renderiza children mientras redirige.

Estado:

```txt
P2-1
```

## Regresión 5 — Productos con imagen recién creada no reflejan estado

Upload posterior no actualiza lista o error se oculta.

Estado:

```txt
P2-3
```

---

# 19. Tests recomendados

## Backend

```txt
[ ] POST /api/pedidos efectivo público -> 400.
[ ] POST /api/pedidos transferencia sin comprobante -> 400.
[ ] POST /api/pedidos transferencia con comprobante -> 201.
[ ] POST /api/admin/pedidos/caja efectivo -> 201.
[ ] POST /api/admin/pedidos/caja transferencia -> 201.
[ ] transferencia rechazado -> pagado -> 200 si se elige permitir reaprobar directo.
[ ] PUT /api/admin/configuracion-tienda solo mensaje_publico -> 200.
[ ] PUT /api/admin/configuracion-tienda solo estado -> 200.
[ ] PUT /api/admin/configuracion-tienda body vacío -> 400.
[ ] Cocina recibido -> en_preparacion -> 200.
[ ] Cocina recibido -> listo -> 200.
[ ] Cocina recibido -> entregado -> 400.
[ ] Cocina en_preparacion -> recibido -> 200.
[ ] Cocina en_preparacion -> listo -> 200.
[ ] Cocina en_preparacion -> entregado -> 400.
[ ] Cocina listo -> en_preparacion -> 200.
[ ] Cocina listo -> entregado -> 200.
[ ] Cocina entregado -> listo -> 400.
[ ] Cocina same-state -> 400.
[ ] Production Origin LAN -> 403.
[ ] Production FRONTEND_URL -> 200.
```

## Frontend

```txt
[ ] Comprobantes default pide estado_pago=comprobante_subido.
[ ] Comprobantes muestra pedido con comprobante_subido.
[ ] Comprobantes abre url_publica.
[ ] Comprobantes aprobar funciona.
[ ] Comprobantes rechazar funciona.
[ ] Comprobantes reaprobar coincide con backend.
[ ] Config guardar mensaje llama PUT correcto y funciona.
[ ] Login no muestra credenciales demo en producción.
[ ] AdminSession 401 no renderiza children.
[ ] API_BASE usa NEXT_PUBLIC_API_URL en producción.
[ ] getActions cubre todos los estados de cocina.
[ ] Crear producto con imagen actualiza lista.
[ ] Admin productos muestra más de 24 o tiene paginación.
```

---

# 20. QA manual antes del evento

## 20.1 Flujo público transferencia

```txt
[ ] Abrir menú desde celular con datos móviles.
[ ] Agregar productos.
[ ] Ir al checkout.
[ ] Confirmar que solo existe transferencia.
[ ] Subir comprobante.
[ ] Crear pedido.
[ ] Ver ticket/código.
[ ] Abrir seguimiento.
[ ] Confirmar que el pedido aparece en admin.
```

## 20.2 Comprobantes

```txt
[ ] Pedido online con comprobante aparece por defecto en /admin/comprobantes.
[ ] Abrir detalle.
[ ] Abrir comprobante en Drive.
[ ] Aprobar pago.
[ ] Rechazar pago.
[ ] Reaprobar o volver a revisión según decisión elegida.
```

## 20.3 Configuración

```txt
[ ] Cerrar tienda.
[ ] Intentar compra pública: debe bloquear.
[ ] Cambiar mensaje público.
[ ] Ver mensaje en menú público.
[ ] Abrir tienda.
[ ] Compra pública funciona.
```

## 20.4 Cocina

```txt
[ ] recibido -> en_preparacion.
[ ] recibido -> listo.
[ ] en_preparacion -> recibido.
[ ] en_preparacion -> listo.
[ ] listo -> en_preparacion.
[ ] listo -> entregado.
[ ] entregado no permite cambios.
[ ] Polling cada 10 segundos no molesta.
```

## 20.5 Caja

```txt
[ ] Crear pedido efectivo.
[ ] Crear pedido transferencia.
[ ] Nombre “Caja” funciona.
[ ] Stock se descuenta.
[ ] Pedido aparece en cocina.
[ ] Pedido se entrega.
```

## 20.6 Productos e imágenes

```txt
[ ] Crear producto sin imagen.
[ ] Crear producto con imagen.
[ ] Imagen aparece en lista sin refrescar manual.
[ ] Cambiar imagen.
[ ] Quitar imagen.
[ ] Ver imagen en menú público.
```

## 20.7 Admin session

```txt
[ ] Login.
[ ] Navegar por todas las secciones admin.
[ ] Refrescar página.
[ ] Logout.
[ ] Simular cookie vencida.
[ ] No hay flash de contenido admin.
```

---

# 21. Comandos de verificación

## Backend

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/backend
npm test
```

## Frontend

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/frontend
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

## Búsqueda de referencia visual vieja

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu
grep -R "diseno-de-landing-kermingo" -n .
```

## OpenSpec / Gentle AI

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu
openspec validate
```

o el comando equivalente si lo ejecutás con Gentle AI.

---

# 22. Prompt para OpenCode

Copiar y pegar:

```txt
Continuemos con Kermingo.

Branch actual:
feature/frontend-ticket-qr

Commit auditado:
bb1e24187220ef972930cffebed1b8dafed980d6

Objetivo:
corregir hallazgos de auditoría del commit "feat: refine admin flows and visuals" antes de merge/deploy.

Trabajar bajo SDD/Gentle AI si está disponible.
No hacer commit hasta mostrar resumen.
No subir .env ni secretos.
No hacer refactor masivo si no hace falta.

## P0 obligatorio

1. Corregir /admin/comprobantes:
   - El filtro default debe mostrar pedidos online transferencia con estado_pago=comprobante_subido.
   - No usar solo_pagos_pendientes=true para comprobante_subido, porque backend devuelve pendiente/rechazado.
   - Usar estado_pago=comprobante_subido, metodo_pago=transferencia, origen=online.
   - Agregar test frontend.

## P1 obligatorios

2. Resolver “Reaprobar” rechazado:
   Elegir una opción y aplicarla de forma consistente:
   A) Backend permite transferencia rechazado -> pagado.
   B) UI cambia “Reaprobar” por “Volver a revisión” y manda comprobante_subido.
   Recomendación: opción A para fluidez de caja.
   Agregar tests.

3. Corregir configuración:
   - updateConfiguracionSchema debe permitir updates parciales.
   - estado debe ser optional.
   - exigir al menos un campo.
   - PUT solo mensaje_publico debe funcionar.
   - PUT solo estado debe funcionar.
   - body vacío debe devolver 400.
   Agregar tests backend.

4. Ocultar credenciales demo:
   - Login no debe mostrar admin@kermingo.com / admin123 salvo NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=true.
   - Confirmar que producción no usa admin123.

5. Revisar API_BASE:
   - NEXT_PUBLIC_API_URL debe ser obligatorio/documentado para producción.
   - Fallback LAN solo development.
   - ABSOLUTE_IMAGE_URL debe seguir funcionando.

6. Agregar tests cocina:
   - recibido -> en_preparacion 200
   - recibido -> listo 200
   - recibido -> entregado 400
   - en_preparacion -> recibido 200
   - en_preparacion -> listo 200
   - en_preparacion -> entregado 400
   - listo -> en_preparacion 200
   - listo -> entregado 200
   - entregado -> listo 400
   - same-state 400

## P2 deseables

7. AdminSessionProvider:
   - status unauthenticated no debe renderizar children.
   - mostrar "Redirigiendo..." mientras router.replace('/admin').

8. PayStatus:
   - no colapsar comprobante_subido/rechazado a pendiente si la pantalla necesita diferenciar.
   - extender tipo si corresponde.

9. Producto con imagen:
   - crear producto con imagen debe actualizar lista con imagen sin refrescar manual.
   - si falla upload de imagen, no cerrar diálogo ocultando error.

10. Productos admin:
   - aumentar limit de 24 a 100 o implementar paginación.

11. Comprobante metadata:
   - considerar no devolver drive_id si UI no lo usa.

12. CORS/CSRF:
   - agregar tests production LAN -> 403 y FRONTEND_URL -> OK.

## Verificación

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
- /admin/comprobantes muestra comprobantes subidos.
- aprobar/rechazar/reaprobar funciona.
- config guarda mensaje.
- cocina permite transiciones ágiles.
- login no muestra credenciales demo en producción.
- imágenes producto funcionan.

## Resultado esperado

Responder con:

# Resultado corrección auditoría bb1e241

## Cambios backend
-

## Cambios frontend
-

## Tests agregados/modificados
-

## Verificación ejecutada
-

## QA manual recomendado
-

## Pendientes
-

## ¿Listo para merge?
Sí/No, con justificación.
```

---

# 23. Criterios de aceptación final

## Bloqueantes

```txt
[ ] /admin/comprobantes default muestra comprobantes subidos.
[ ] Aprobar/rechazar/reaprobar funciona o UI coincide con state machine.
[ ] Guardar mensaje público en config funciona.
[ ] Login no muestra credenciales demo en producción.
[ ] API_BASE producción usa NEXT_PUBLIC_API_URL.
[ ] Tests cocina cubren la nueva state machine.
```

## Backend

```txt
[ ] npm test pasa.
[ ] Pedido público efectivo sigue bloqueado.
[ ] Caja efectivo/transferencia sigue permitido.
[ ] Config update parcial funciona.
[ ] Cocina state machine testeada.
[ ] CORS/CSRF production testeado.
```

## Frontend

```txt
[ ] pnpm test pasa.
[ ] pnpm lint sin errores.
[ ] tsc pasa.
[ ] build pasa.
[ ] Admin session sin flash de contenido protegido.
[ ] Comprobantes operativos.
[ ] Config operativa.
[ ] Productos imágenes operativas.
```

## Operativo

```txt
[ ] Notebook caja probado.
[ ] Tablet cocina probado.
[ ] Celular compra pública probado.
[ ] Drive comprobantes probado.
[ ] Drive imágenes probado.
```

---

# 24. Veredicto esperado después de corregir

Si se corrigen P0/P1 y pasan tests:

```txt
APROBADO PARA MERGE A MAIN
```

Aún así, antes de producción/evento:

```txt
QA manual completo en Vercel/Railway.
Prueba con celular real.
Prueba de Drive real.
Backup DB.
Runbook de emergencia.
```
