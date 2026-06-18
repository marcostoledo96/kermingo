# 55 — Instrucciones para OpenCode — Rediseño Admin v0 + Integración Front/Back B7

## Contexto

Este documento es para ejecutar en OpenCode desde el proyecto local:

```txt
/home/marcos/Escritorio/Kermingo/kermingo_menu
```

El usuario dejó un ZIP final generado por v0 como **referencia visual y de componentes**. Ese ZIP contiene un nuevo diseño admin mucho mejor encaminado, especialmente:

```txt
- AdminShell con sidebar
- AdminSession con idea de cookie httpOnly + /api/auth/me
- Admin UI primitives
- Dashboard operativo
- Caja rápida visual
- Pedidos
- Cocina / entrega
- Productos
- Comprobantes
- Configuración
- Reportes
```

El ZIP debe usarse como **referencia para copiar/adaptar archivos**, no como reemplazo ciego del proyecto.

---

# 1. Objetivo general

Mejorar el admin de Kermingo para que sea cómodo, ágil y operativo durante el evento.

Prioridad real:

```txt
1. Notebook
2. Tablet
3. Celular solo como fallback
```

El admin debe servir para:

```txt
- Ver resumen en vivo.
- Entrar rápido a caja.
- Ver pedidos pendientes.
- Revisar comprobantes.
- Preparar/entregar pedidos.
- Gestionar productos.
- Subir imágenes de productos.
- Abrir/cerrar tienda.
- Consultar reportes.
```

No debe parecer:

```txt
- dashboard SaaS genérico
- diseño de IA con cards repetidas
- app corporativa
- pantalla decorativa sin utilidad
```

Debe sentirse conectado con:

```txt
- landing pública
- menú público
- identidad Kermingo
- Grupo Scout San Patricio
```

Paleta base:

```txt
azul:    #003B73
celeste: #75AADB
fondo:   #EEF5FF
dorado:  #F6B21A
blanco
```

---

# 2. Archivos de referencia del ZIP v0 que hay que leer

Antes de tocar código, leer estos archivos del ZIP de referencia.

> Asumir que el ZIP fue descomprimido en una carpeta de referencia.  
> Ejemplo recomendado:
>
> ```txt
> /home/marcos/Escritorio/Kermingo/kermingo_menu/diseno-de-landing-kermingo/
> ```
>
> Si el ZIP queda en otra ruta, adaptar paths.

## 2.1 Layout/admin shell

Leer y usar como base:

```txt
diseno-de-landing-kermingo/components/admin/admin-shell.tsx
diseno-de-landing-kermingo/components/admin/admin-ui.tsx
diseno-de-landing-kermingo/components/admin/admin-session.tsx
```

Estos archivos son los más importantes.

### Qué copiar/adaptar

```txt
admin-shell.tsx:
- sidebar desktop/tablet
- drawer mobile
- topbar compacta
- sección activa
- botón de sonido/avisos
- logout
- footer admin

admin-ui.tsx:
- Badge
- AdminCard
- IconBox
- SectionTitle
- tonos visuales sobrios
- constantes de estado si existen

admin-session.tsx:
- idea de cookie httpOnly
- /api/auth/me
- credentials: include
- manejo 401
- no guardar JWT real
```

### Qué NO copiar ciegamente

```txt
- endpoints si no coinciden con backend real
- modo demo si oculta errores reales
- localStorage como verdad de sesión
```

---

## 2.2 Dashboard admin

Leer:

```txt
diseno-de-landing-kermingo/components/admin/dashboard-screen.tsx
diseno-de-landing-kermingo/app/admin/dashboard/page.tsx
```

Usar como base visual del nuevo:

```txt
frontend/components/admin/dashboard-screen.tsx
frontend/app/admin/dashboard/page.tsx
```

### Qué preservar

```txt
- “Panel general”
- resumen en vivo
- accesos rápidos uniformes
- últimos pedidos como lista/tabla operativa
- status de tienda
- botón/indicador de avisos
```

### Qué adaptar

```txt
- Reemplazar datos demo por datos reales cuando exista API.
- Si todavía no se conecta todo, aislar mocks en un bloque claro.
- No dejar métricas falsas como si fueran reales.
```

---

## 2.3 Caja rápida

Leer:

```txt
diseno-de-landing-kermingo/components/admin/caja-screen.tsx
diseno-de-landing-kermingo/app/admin/caja/page.tsx
```

Usar como referencia visual, pero no copiar como definitivo si sigue usando `PRODUCTS` mock.

### Qué preservar

```txt
- buscador de productos
- filtros táctiles
- carrito/resumen visible
- método pago efectivo/transferencia
- nombre cliente
- botón registrar venta
- layout cómodo para notebook/tablet
```

### Qué adaptar

```txt
- Conectar productos reales desde backend.
- Usar IDs reales numéricos stringificados.
- Crear venta real con endpoint de caja.
- Nombre puede ser “Caja” si no se sabe el cliente.
```

---

## 2.4 Pedidos / cocina / comprobantes / productos

Leer:

```txt
diseno-de-landing-kermingo/components/admin/orders-screen.tsx
diseno-de-landing-kermingo/components/admin/cocina-screen.tsx
diseno-de-landing-kermingo/components/admin/receipts-screen.tsx
diseno-de-landing-kermingo/components/admin/products-screen.tsx
diseno-de-landing-kermingo/components/admin/product-form-dialog.tsx
```

Usar como referencia de UI, pero adaptar a backend real.

### Pedidos

```txt
- lista compacta
- filtros
- detalle
- acciones rápidas
```

### Cocina / entrega

```txt
- flujo recibido/preparación/listo/entregado
- para pedidos de caja, evaluar simplificar a entregar rápido
```

### Comprobantes

```txt
- mostrar solo transferencias
- revisar comprobante
- aprobar/rechazar
```

### Productos

```txt
- listar productos reales
- editar
- stock
- subir/quitar imagen
```

---

## 2.5 Archivos que NO se deben copiar ciegamente

No copiar ciegamente:

```txt
diseno-de-landing-kermingo/package.json
diseno-de-landing-kermingo/pnpm-lock.yaml
diseno-de-landing-kermingo/next.config.mjs
diseno-de-landing-kermingo/lib/products.ts
```

Motivos:

```txt
package.json:
- puede traer dependencias innecesarias
- puede cambiar versiones del proyecto

next.config.mjs:
- trae ignoreBuildErrors: true
- no queremos builds verdes falsos

lib/products.ts:
- es mock visual
- backend real debe ser fuente de verdad
```

Si hace falta copiar algo, hacerlo selectivo.

---

# 3. Estado funcional deseado de B7

## 3.1 Flujo online público

Cambio funcional confirmado:

```txt
Desde celular / web pública SOLO se permite pagar por transferencia.
```

Flujo:

```txt
cliente compra desde celular
→ selecciona productos
→ paga por transferencia
→ sube comprobante
→ pedido queda con estado_pago = comprobante_subido
→ caja revisa comprobante
→ caja marca pagado o rechazado
→ entrega/preparación gestiona pedido
```

## 3.2 Flujo caja

Caja puede:

```txt
- cargar pedido rápido
- pedir nombre del cliente o usar “Caja”
- cobrar efectivo
- cobrar transferencia
- registrar pedido
- enviarlo a entrega/preparación
```

Flujo:

```txt
cliente compra en caja
→ vendedor carga pedido
→ paga efectivo o transferencia
→ pedido queda registrado
→ encargado prepara/entrega
```

Para pedidos de caja:

```txt
No es tan necesario marcar “listo para entregar”.
El cliente puede estar esperando ahí mismo.
```

Esto puede resolverse en UI con acción rápida:

```txt
Entregado
```

pero antes de tocar backend, revisar si la máquina de estados permite la transición.

---

# 4. Backend pendiente antes o durante B7

Antes de integrar admin real, cerrar el hardening de imágenes de productos.

## 4.1 Pendientes backend de imágenes

Archivo principal:

```txt
backend/src/api/services/drive.service.js
```

### Bug crítico

`uploadFile()` no debe usar carpeta de productos como fallback general.

Debe quedar:

```js
const folderId = options.folderId || environments.googleDrive.folderId;
```

No:

```js
const folderId = options.folderId || environments.googleDrive.productosFolderId || environments.googleDrive.folderId;
```

Resultado:

```txt
comprobantes sin options.folderId → GOOGLE_DRIVE_FOLDER_ID
productos con options.folderId → GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID
```

## 4.2 `.env` local/Railway

Agregar local y Railway:

```env
GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID=1LWWeuAz4iV4Yq-iM8q1f_HZm-FEAUCmk
```

No subir `.env`.

## 4.3 `.env.example`

Agregar:

```env
GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID=your-product-images-folder-id
```

## 4.4 Sharp

En:

```txt
backend/src/api/services/image.service.js
```

Capturar errores de `sharp` y devolver `ValidationError 400`.

## 4.5 Tests

En:

```txt
backend/tests/producto-imagen.test.js
```

No borrar todas las imágenes de producto.

Usar `TEST_RUN_ID`.

---

# 5. Backend funcional nuevo requerido por cambio de flujo

## 5.1 Online solo transferencia

Actualmente revisar si `POST /api/pedidos` permite `metodo_pago = efectivo`.

Nueva regla:

```txt
POST /api/pedidos público:
- debe aceptar solamente transferencia
- debe requerir comprobante
- efectivo público debe devolver 400
```

Caja sigue aceptando:

```txt
efectivo
transferencia
```

### Cambios backend sugeridos

En:

```txt
backend/src/api/controllers/pedido.controller.js
```

Agregar validación explícita:

```js
if (metodoPago === 'efectivo') {
  throw new ValidationError('Los pedidos online solo aceptan pago por transferencia. Para pagar en efectivo, acercate a caja.');
}
```

Mantener:

```txt
transferencia online requiere comprobante
```

### Tests backend

Agregar/actualizar:

```txt
POST /api/pedidos con efectivo → 400
POST /api/pedidos con transferencia sin comprobante → 400
POST /api/pedidos con transferencia + comprobante → 201
POST /api/admin/pedidos/caja con efectivo → 201
POST /api/admin/pedidos/caja con transferencia → 201
```

### Documentación

Actualizar:

```txt
docs/planificacion
DOCUMENTACION/IA/API.md
DOCUMENTACION/IA/FLUJOS.md
```

---

# 6. Frontend — Integración del admin v0

## 6.1 Copiar/adaptar estructura admin

Desde referencia:

```txt
components/admin/admin-shell.tsx
components/admin/admin-ui.tsx
components/admin/admin-session.tsx
```

A destino:

```txt
frontend/components/admin/admin-shell.tsx
frontend/components/admin/admin-ui.tsx
frontend/components/admin/admin-session.tsx
```

Verificar imports:

```txt
@/components/kermingo-logo
@/components/argentina-stripe
@/lib/products
lucide-react
```

Si faltan componentes visuales, copiar también:

```txt
components/kermingo-logo.tsx
components/argentina-stripe.tsx
```

pero evitar duplicar si ya existen en frontend.

---

## 6.2 Admin layout

Referencia:

```txt
app/admin/layout.tsx
```

Destino:

```txt
frontend/app/admin/layout.tsx
```

Debe envolver admin con:

```tsx
<AdminSessionProvider>{children}</AdminSessionProvider>
```

---

## 6.3 Admin login

Referencia:

```txt
components/admin/login-screen.tsx
app/admin/page.tsx
```

Destino:

```txt
frontend/components/admin/login-screen.tsx
frontend/app/admin/page.tsx
```

Pero revisar endpoints.

### Reglas auth

Backend usa cookie httpOnly.

Frontend debe:

```txt
- login con credentials: 'include'
- logout con credentials: 'include'
- /api/auth/me con credentials: 'include'
- requests admin con credentials: 'include'
- no guardar JWT real en localStorage
- no usar Authorization Bearer con cookie
- si 401, limpiar sesión y redirigir a /admin
```

---

## 6.4 API client frontend

Crear o ajustar:

```txt
frontend/lib/api/client.ts
frontend/lib/api/auth.ts
frontend/lib/api/productos.ts
frontend/lib/api/pedidos.ts
frontend/lib/api/config.ts
```

Base URL:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Helper:

```ts
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
```

Fetch:

```ts
credentials: 'include'
```

Manejo de respuesta:

```ts
{ ok, data, error }
```

Manejo central de 401:

```txt
- avisar sesión vencida
- limpiar usuario local
- redirigir a /admin
```

---

# 7. Dashboard admin — Instrucciones de integración

## 7.1 Usar referencia v0

Copiar/adaptar:

```txt
components/admin/dashboard-screen.tsx
```

## 7.2 Reemplazar datos demo gradualmente

Si backend ya tiene endpoints de resumen, usarlos.

Si no existen, dashboard puede tener:

```txt
- loading
- error
- demo marcado claramente
```

No dejar datos falsos como si fueran reales.

## 7.3 Resumen en vivo

Debe mostrar:

```txt
Pendientes
Preparando
Listos
Entregados
Pagos pendientes
Recaudación
```

Alinear números y estilos.

## 7.4 Accesos rápidos

Deben ser uniformes:

```txt
Caja rápida
Pedidos
Cocina / Entrega
Comprobantes
Productos
Configuración
Reportes
```

Caja puede destacarse, pero no parecer sección activa.

## 7.5 Últimos pedidos

Mostrar lista/tabla consistente.

Campos:

```txt
código
cliente
origen
método de pago
estado pago
estado pedido
total
hora
acción
```

---

# 8. Caja rápida — Instrucciones de integración

## 8.1 Base visual

Referencia:

```txt
components/admin/caja-screen.tsx
```

La pantalla visual está bastante bien. No rehacer completa.

## 8.2 Conectar productos reales

No usar:

```txt
lib/products.ts
```

Usar:

```txt
GET /api/productos
```

Mapear backend a UI.

## 8.3 Crear pedido de caja real

Usar endpoint real:

```txt
POST /api/admin/pedidos/caja
```

o el endpoint que exista en backend.

Datos:

```txt
nombre_cliente: valor del input o "Caja"
telefono_cliente: opcional
mesa: opcional si existe
metodo_pago: efectivo | transferencia
items: producto_id numérico + cantidad
estado_pago: pagado si caja confirma pago
```

## 8.4 UX

```txt
- nombre visible
- placeholder: "Nombre o Caja"
- método default: efectivo
- total muy visible
- registrar venta
- limpiar venta
- último pedido registrado
```

---

# 9. Pedidos, cocina y comprobantes

## 9.1 Pedidos

Referencia:

```txt
components/admin/orders-screen.tsx
```

Conectar a:

```txt
GET /api/admin/pedidos
PATCH /api/admin/pedidos/:id/estado
PATCH /api/admin/pedidos/:id/pago
PUT /api/admin/pedidos/:id
PATCH /api/admin/pedidos/:id/cancelar
```

Usar endpoints reales disponibles.

## 9.2 Cocina / entrega

Referencia:

```txt
components/admin/cocina-screen.tsx
```

Flujos:

```txt
online: recibido → preparación → listo → entregado
caja: recibido/preparación → entregado si backend lo permite
```

Si backend no permite salto para caja, no cambiar silenciosamente: informar.

## 9.3 Comprobantes

Referencia:

```txt
components/admin/receipts-screen.tsx
```

Conectar a:

```txt
GET /api/admin/pedidos?solo_pagos_pendientes=true
GET /api/admin/pedidos/:id/comprobante
PATCH /api/admin/pedidos/:id/pago
```

Reglas:

```txt
comprobante_subido → pagado
comprobante_subido → rechazado
rechazado → comprobante_subido si se vuelve a subir
```

---

# 10. Productos + imágenes

## 10.1 Productos

Referencia:

```txt
components/admin/products-screen.tsx
components/admin/product-form-dialog.tsx
```

Conectar a:

```txt
GET /api/admin/productos
POST /api/admin/productos
PUT /api/admin/productos/:id
PATCH /api/admin/productos/:id/stock
PATCH /api/admin/productos/:id/desactivar
PATCH /api/admin/productos/:id/recuperar
```

## 10.2 Imágenes

Conectar a:

```txt
POST /api/admin/productos/:id/imagen
DELETE /api/admin/productos/:id/imagen
```

Input:

```tsx
<input type="file" accept="image/webp,image/jpeg,image/png" />
```

Enviar:

```txt
FormData field: imagen
```

Mostrar:

```txt
- preview local
- imagen actual desde imagen_url
- botón subir/reemplazar
- botón quitar
- errores 400/413/503
```

---

# 11. Configuración y reportes

## 11.1 Configuración

Referencia:

```txt
components/admin/settings-screen.tsx
```

Conectar a endpoint real de configuración tienda.

Debe manejar:

```txt
abierta
cerrada
demo
mensaje público
horario cena si existe
```

## 11.2 Reportes

Referencia:

```txt
components/admin/reports-screen.tsx
```

Conectar cuando existan endpoints reales.

Mientras tanto, marcar como:

```txt
pendiente de integración
```

No mostrar datos falsos sin aviso.

---

# 12. Archivos que OpenCode debe leer primero

## Referencia v0

```txt
diseno-de-landing-kermingo/components/admin/admin-shell.tsx
diseno-de-landing-kermingo/components/admin/admin-session.tsx
diseno-de-landing-kermingo/components/admin/admin-ui.tsx
diseno-de-landing-kermingo/components/admin/dashboard-screen.tsx
diseno-de-landing-kermingo/components/admin/caja-screen.tsx
diseno-de-landing-kermingo/components/admin/orders-screen.tsx
diseno-de-landing-kermingo/components/admin/cocina-screen.tsx
diseno-de-landing-kermingo/components/admin/receipts-screen.tsx
diseno-de-landing-kermingo/components/admin/products-screen.tsx
diseno-de-landing-kermingo/components/admin/product-form-dialog.tsx
diseno-de-landing-kermingo/components/admin/settings-screen.tsx
diseno-de-landing-kermingo/components/admin/reports-screen.tsx
diseno-de-landing-kermingo/app/admin/layout.tsx
diseno-de-landing-kermingo/app/admin/page.tsx
diseno-de-landing-kermingo/app/admin/dashboard/page.tsx
diseno-de-landing-kermingo/app/admin/caja/page.tsx
```

## Proyecto actual

```txt
frontend/app/admin/**
frontend/components/admin/**
frontend/lib/**
frontend/app/menu/**
frontend/components/menu/**

backend/src/api/routes/**
backend/src/api/controllers/**
backend/src/api/models/**
backend/src/api/schemas/**
backend/src/api/services/**
backend/src/api/middlewares/**
backend/tests/**
```

---

# 13. Qué copiar y qué adaptar

## Copiar casi directo

```txt
admin-ui.tsx
admin-shell.tsx
app/admin/layout.tsx
```

Pero revisar imports y paths.

## Copiar con adaptación

```txt
admin-session.tsx
login-screen.tsx
dashboard-screen.tsx
caja-screen.tsx
orders-screen.tsx
cocina-screen.tsx
receipts-screen.tsx
products-screen.tsx
product-form-dialog.tsx
settings-screen.tsx
reports-screen.tsx
```

## No copiar ciegamente

```txt
package.json
pnpm-lock.yaml
next.config.mjs
lib/products.ts
```

---

# 14. Etapas recomendadas para OpenCode

## Etapa 1 — Backend hardening

```txt
B6.4.1
```

Completar antes de frontend.

## Etapa 2 — Importar shell admin + sesión

```txt
- admin-shell
- admin-ui
- admin-session
- layout admin
- login
```

## Etapa 3 — Dashboard visual

```txt
- dashboard-screen
- resumen en vivo
- accesos rápidos
- últimos pedidos
```

Puede quedar mock marcado si no hay endpoint de resumen.

## Etapa 4 — Caja real

```txt
- caja-screen
- productos reales
- crear pedido caja real
```

## Etapa 5 — Pedidos/cocina/comprobantes

```txt
- pedidos reales
- estados reales
- comprobantes reales
```

## Etapa 6 — Productos + imágenes

```txt
- admin productos real
- upload imagen
- quitar imagen
```

## Etapa 7 — Config/reportes

```txt
- configuración real
- reportes reales o pendiente claro
```

---

# 15. Prompt listo para OpenCode

```txt
Continuemos con Kermingo.

Objetivo: integrar el nuevo diseño admin generado por v0 en el proyecto real, conectándolo al backend gradualmente y corrigiendo también los pendientes backend necesarios para B7.

No hacer commit todavía.

## Contexto

Estoy dejando una carpeta/ZIP de referencia visual generado por v0. Usalo como referencia para leer y copiar/adaptar archivos.

Ruta esperada de referencia:
diseno-de-landing-kermingo/

No modificar esa carpeta de referencia.
Copiar/adaptar archivos hacia:
frontend/

## Primero: cerrar backend B6.4.1

Antes de integrar admin real:

1. En backend/src/api/services/drive.service.js:
   uploadFile() sin options.folderId debe usar GOOGLE_DRIVE_FOLDER_ID.
   Cambiar:
   options.folderId || environments.googleDrive.productosFolderId || environments.googleDrive.folderId
   por:
   options.folderId || environments.googleDrive.folderId

2. Agregar GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID a backend/.env.example.

3. En backend/src/api/services/image.service.js:
   capturar errores de sharp y lanzar ValidationError 400.

4. En backend/tests/producto-imagen.test.js:
   usar TEST_RUN_ID y no borrar todas las imágenes producto.

5. En backend/src/api/controllers/producto.controller.js:
   crear() y actualizar() deben usar findByIdAdmin.

6. En backend/src/api/routes/producto.routes.js:
   ordenar /:id/imagen antes de /:id.

7. Ejecutar:
   cd backend
   npm test

## Segundo: cambiar flujo público de pago

Nueva regla:
- El cliente desde celular/web pública solo puede pagar por transferencia.
- Efectivo solo en caja.

Backend:
- POST /api/pedidos con metodo_pago=efectivo debe devolver 400.
- POST /api/pedidos transferencia sin comprobante debe devolver 400.
- POST /api/pedidos transferencia con comprobante debe seguir funcionando.
- POST /api/admin/pedidos/caja debe permitir efectivo y transferencia.

Frontend:
- checkout público debe mostrar solo transferencia.
- efectivo no debe aparecer como opción pública.
- caja debe permitir efectivo/transferencia.

Agregar/actualizar tests.

## Tercero: importar base admin v0

Leer desde referencia:

- components/admin/admin-shell.tsx
- components/admin/admin-ui.tsx
- components/admin/admin-session.tsx
- components/admin/dashboard-screen.tsx
- components/admin/caja-screen.tsx
- components/admin/orders-screen.tsx
- components/admin/cocina-screen.tsx
- components/admin/receipts-screen.tsx
- components/admin/products-screen.tsx
- components/admin/product-form-dialog.tsx
- components/admin/settings-screen.tsx
- components/admin/reports-screen.tsx
- app/admin/layout.tsx
- app/admin/page.tsx
- app/admin/dashboard/page.tsx
- app/admin/caja/page.tsx

Copiar/adaptar hacia frontend/.

No copiar ciegamente:
- package.json
- pnpm-lock.yaml
- next.config.mjs
- lib/products.ts

## Cuarto: auth admin real

Backend usa cookie httpOnly.

Frontend debe:
- login con credentials: include
- logout con credentials: include
- validar sesión con /api/auth/me
- requests admin con credentials: include
- no guardar JWT real en localStorage
- no usar Authorization Bearer con cookie
- si 401, limpiar sesión y redirigir a /admin
- localStorage solo puede cachear usuario para UI

Corregir error de token al navegar entre páginas admin.

## Quinto: admin shell/navegación

Implementar:
- sidebar desktop/tablet
- drawer mobile
- topbar compacta
- sección activa
- navegación persistente entre:
  - Panel general
  - Caja rápida
  - Pedidos
  - Cocina / Entrega
  - Comprobantes
  - Productos
  - Configuración
  - Reportes

## Sexto: dashboard operativo

Usar dashboard v0 como base.

Debe mostrar:
- Resumen en vivo
- Accesos rápidos uniformes
- Últimos pedidos

No dejar datos falsos sin marcar.
Si no hay endpoint real de resumen, dejar mock claramente marcado como temporal.

## Séptimo: caja rápida real

Caja debe:
- cargar productos reales
- permitir nombre del cliente o “Caja”
- permitir efectivo/transferencia
- registrar pedido real con endpoint de caja
- mostrar último pedido registrado
- limpiar carrito solo si backend responde OK

## Octavo: pedidos/cocina/comprobantes/productos

Integrar por etapas:
1. Pedidos reales
2. Cocina real
3. Comprobantes reales
4. Productos reales
5. Upload/quitar imagen producto
6. Configuración real
7. Reportes

## Verificación

Backend:
cd backend
npm test

Frontend:
cd frontend
npm run lint
npm run build

Manual:
- login admin
- navegar entre páginas sin error de token
- ver dashboard
- cargar venta en caja
- crear pedido online transferencia
- revisar comprobante
- ver pedido en cocina/entrega
- subir imagen producto
- ver imagen en menú

## Resultado esperado

Responder con:

## Resultado integración admin v0 + B7

Backend:
-

Frontend:
-

Archivos copiados de referencia:
-

Archivos adaptados:
-

Auth/token:
-

Flujo público transferencia-only:
-

Dashboard:
-

Caja:
-

Pedidos/cocina/comprobantes:
-

Productos/imágenes:
-

Tests:
-

Build:
-

Pendientes:
-

¿Listo para siguiente etapa?
-
```

---

# 16. Criterios de aceptación finales

```txt
[ ] Backend tests pasan.
[ ] Frontend build pasa.
[ ] Login admin no rompe al navegar.
[ ] Sidebar admin funciona.
[ ] Dashboard se ve consistente.
[ ] Resumen en vivo no tiene números desalineados.
[ ] Accesos rápidos no confunden Caja con sección activa.
[ ] Últimos pedidos tienen badges/tipografía consistentes.
[ ] Checkout público solo transferencia.
[ ] Caja permite efectivo/transferencia.
[ ] Caja crea pedidos reales.
[ ] Comprobantes se revisan desde admin.
[ ] Productos usan backend real.
[ ] Upload imagen producto funciona.
[ ] No se subió .env.
```
