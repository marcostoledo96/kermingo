# 28 — Auditoría visual y plan de mejora frontend Kermingo

> Documento generado a partir del ZIP `kermingo_frontend_visual_review.zip` y de las capturas incluidas en `captures/`.  
> Fecha de auditoría: 15/06/2026.  
> Objetivo: dejar una guía accionable para mejorar el frontend público y admin sin romper identidad, UX ni contrato de API.

---

## 1. Lectura general

El proyecto ya tiene una identidad bastante definida para la parte pública: Kermingo se apoya en Argentina, Mundial, Día de la Bandera, bingo/kermesse, familia scout, celeste, azul y dorado. La landing y el menú avanzaron en una dirección reconocible. El problema principal aparece cuando el sistema pasa de “afiche público” a “herramienta operativa”: el admin todavía se siente más como un dashboard genérico ordenado que como una mesa real de control para una kermesse.

La mejora no debería rediseñar todo desde cero. Conviene dividir el producto en dos lenguajes hermanos:

```txt
Público:
  Afiche de kermesse patria llevado a web mobile-first.

Admin:
  Mesa de control del evento: caja, cocina, pedidos, stock y comprobantes en vivo.
```

El admin puede ser más denso, más directo y menos “lindo por lindo”. El público puede seguir siendo más cálido, festivo y orientado a comprar rápido desde el celular.

---

## 2. Hallazgos críticos del ZIP

### 2.1. Hay inconsistencia fuerte en la dirección del evento

En los archivos aparece una contradicción:

```txt
README.md: Echeverría 3920
AGENTS.md: Estomba 1980
frontend/components/event-info.tsx: Estomba 1980
frontend/components/footer.tsx: Estomba 1980
frontend/components/menu/ticket-screen.tsx: Estomba 1980
```

Esto es crítico porque afecta landing, ticket, footer, confirmación y comunicación del evento.

**Decisión requerida:** Marcos debe confirmar una única dirección. Hasta confirmar, toda mejora visual debe tratar la dirección como dato de configuración, no como texto hardcodeado disperso.

**Recomendación técnica:** crear un archivo único:

```txt
frontend/lib/evento.ts
```

Con:

```ts
export const EVENTO_KERMINGO = {
  nombre: 'Kermingo',
  fecha: 'Sábado 20 de junio de 2026',
  horario: '17 a 21 hs',
  direccion: 'A CONFIRMAR',
  organizador: 'Grupo Scout San Patricio',
}
```

Luego usar esa fuente en landing, footer, ticket, checkout y seguimiento.

---

### 2.2. El dashboard admin actual no está mal, pero está conceptualmente mal priorizado

La pantalla `admin/dashboard` actualmente muestra:

```txt
- saludo;
- métricas 3x2;
- stock bajo y agotados;
- accesos rápidos;
- últimos pedidos.
```

Visualmente está limpia, pero comunica “panel de métricas”. Para un evento de 17 a 21 hs, con voluntarios usando celular o notebook, la pantalla debería comunicar “qué tengo que resolver ahora”.

Problemas observados:

- Las métricas ocupan el primer bloque pero no indican prioridad operativa.
- Recaudación compite visualmente con estados operativos.
- “Pendientes”, “Preparando” y “Listos” son más importantes que “Entregados”, pero todos pesan parecido.
- Los accesos rápidos parecen cards SaaS, no botones de trabajo.
- Las alertas de stock están bien ubicadas, pero todavía parecen widgets genéricos.
- El estado “En vivo” y “Modo demo” están duplicados o mal jerarquizados.
- Hay links a `/admin/comprobantes`, `/admin/reportes` y `/admin/config` que no existen en `app/admin/`; eso puede generar 404 si se dejan activos.

**Conclusión:** el dashboard debe convertirse en una “cartelera operativa”.

---

### 2.3. La paleta se rompe en estados

Aunque existe una paleta Kermingo, en varios componentes aparecen colores Tailwind semánticos genéricos:

```txt
emerald
amber
rose
sky
slate
red
```

Aparecen en:

```txt
components/admin/admin-ui.tsx
components/admin/dashboard-screen.tsx
components/admin/caja-screen.tsx
components/admin/cocina-screen.tsx
components/admin/orders-screen.tsx
components/admin/products-screen.tsx
components/menu/checkout-screen.tsx
components/menu/tracking-screen.tsx
components/menu/cart-screen.tsx
```

No está prohibido usar variaciones de verde/rojo/ámbar, pero ahora se sienten como defaults de Tailwind. Kermingo necesita estados propios, controlados por tokens.

---

### 2.4. Hay demasiadas superficies tipo card

Patrón repetido:

```txt
rounded-2xl / rounded-3xl
bg-white
border
shadow-sm / shadow-lg
```

Esto aparece en público, menú, checkout, tracking, ticket, admin y productos. Las cards son útiles, pero cuando todo es card, nada tiene jerarquía.

**Regla nueva:** una pantalla debe tener como máximo 2 tipos de superficie principal.

Ejemplo:

```txt
Landing:
  - bloque afiche / franja editorial;
  - card solo donde haya datos.

Menú:
  - cards de producto;
  - barra flotante.

Admin:
  - panel operativo;
  - lista/ticket de pedido.
```

---

### 2.5. El admin todavía no tiene una navegación de app real

`AdminHeader` es claro, pero cada pantalla funciona como una ruta suelta con botón volver. Para un evento en vivo, conviene tener navegación persistente o al menos una barra inferior/rail admin.

Opciones:

```txt
Mobile:
  barra inferior con Caja, Cocina, Pedidos, Productos.

Desktop:
  sidebar fino o top nav persistente con estado de tienda.
```

La referencia de shadcn/sidebar es útil como base técnica, pero no debe copiarse visualmente de forma genérica.

---

## 3. Dirección visual propuesta

## 3.1. Concepto

```txt
Kermingo público = afiche patrio de kermesse.
Kermingo admin = mesa de control de kermesse, simple, táctil y en vivo.
```

El admin no debe parecer:

```txt
- SaaS genérico;
- CRM;
- fintech;
- dashboard de restaurante elegante;
- tabla empresarial aburrida.
```

Debe parecer:

```txt
- operativo;
- familiar;
- rápido;
- claro para voluntarios;
- útil durante una jornada real;
- conectado con la identidad patria sin decorar de más.
```

---

## 3.2. Sistema de tokens recomendado

Centralizar en `globals.css` o en un archivo de tokens compartido.

```css
:root {
  --km-azul: #003B73;
  --km-celeste: #75AADB;
  --km-fondo: #EEF5FF;
  --km-dorado: #F6B21A;
  --km-tinta: #173B5C;
  --km-tinta-suave: #3A5675;
  --km-papel: #FFFFFF;
  --km-linea: rgba(117, 170, 219, 0.28);

  --km-info-bg: #E8F3FF;
  --km-info-text: #003B73;

  --km-preparando-bg: #FFF4DA;
  --km-preparando-text: #7A5500;

  --km-listo-bg: #E2F7F8;
  --km-listo-text: #005B66;

  --km-alerta-bg: #FFF1E6;
  --km-alerta-text: #8A4A00;

  --km-peligro-bg: #FFF0F2;
  --km-peligro-text: #8C1D2D;

  --km-entregado-bg: #EAF0F7;
  --km-entregado-text: #304C68;
}
```

### Reglas de uso

```txt
Dorado:
  Solo CTA principal, caja rápida, bingo/premios y acentos puntuales.

Azul:
  Navegación, acciones principales secundarias, textos fuertes.

Celeste:
  Fondos, líneas, chips suaves, estados informativos.

Rojo/peligro:
  Revocar/cancelar/agotar/rechazar. Nunca para decorar.

Verde:
  Evitar emerald default. Usar cian/verde azulado propio para “listo/pagado”.
```

---

## 3.3. Tipografía

Actualmente se usa:

```txt
Inter: cuerpo.
Bricolage Grotesque: display.
```

La combinación funciona para el carácter de Kermingo, pero hay problemas de uso:

- `font-display` aparece en demasiados lugares.
- Hay mucho `font-extrabold`.
- Hay demasiados textos `uppercase` con tracking.
- Los datos operativos deberían usar `tabular-nums` y monoespaciado solo donde ayude.

### Reglas nuevas

```txt
Display:
  Usar Bricolage solo para marca, hero, títulos de pantalla y números protagonistas.

Cuerpo:
  Usar Inter o una sans legible equivalente.

Datos operativos:
  Usar font-mono o tabular-nums solo para códigos, totales, horarios y cantidades.

Uppercase:
  Usar máximo 1 vez por bloque grande, no en cada título.
```

### Alternativa futura

Si Marcos quiere alejarse más del look genérico, se puede evaluar reemplazar Inter por una sans más cálida y legible, por ejemplo Atkinson Hyperlegible o Nunito Sans, siempre usando `next/font` y sin links externos. No lo haría en el primer cambio si hay poco tiempo.

---

## 4. Diagnóstico por pantalla

## 4.1. Home / Landing

### Estado actual

La home ya comunica Kermingo bastante bien. El hero con logo, banderines y azul funciona. El bloque de bingo está mejor que una grilla genérica.

### Problemas

- La dirección está inconsistente respecto del README y los prompts anteriores.
- Todavía hay algunas superficies tipo card que podrían sentirse repetidas.
- El hero depende de una imagen de fondo relativamente pesada (`/images/kermingo-hero.png`) y conviene verificar peso final.
- El logo `kermingo-logo.png` pesa más de lo ideal para un logo mobile si no está optimizado.
- El CTA “Ver menú” está bien, pero el público necesita verlo muy temprano en pantallas de 360–430 px.

### Propuesta

- Mantener la dirección visual actual.
- Pasar datos del evento a `lib/evento.ts`.
- Optimizar logo/hero en WebP/AVIF o al menos revisar peso.
- Reducir el uso de sombras grandes.
- Mantener el bingo como bloque protagonista secundario.
- Usar franja editorial patria en vez de más cards.

### Archivos

```txt
frontend/app/page.tsx
frontend/components/header.tsx
frontend/components/hero.tsx
frontend/components/cta-buttons.tsx
frontend/components/event-info.tsx
frontend/components/bingo-teaser.tsx
frontend/components/activities.tsx
frontend/components/footer.tsx
frontend/lib/evento.ts   # nuevo recomendado
```

---

## 4.2. Menú / Catálogo público

### Estado actual

El menú está cerca de una buena versión. Tiene tabs Merienda/Cena, filtros, cards de producto, carrito flotante y estructura mobile-first.

### Problemas

- Las cards de producto pueden sentirse demasiado iguales cuando hay muchos productos.
- `ProductImage` usa `<img>` nativo por imágenes variables. Esto puede ser válido, pero el plan ideal es pasar a `next/image` cuando el origen esté definido en `next.config.mjs`.
- Los placeholders están bien encaminados, pero todavía el ícono del producto puede sentirse protagonista si falta imagen.
- El filtro visual puede mejorar con más diferencia entre tabs principales y filtros secundarios.
- En stock/status puede haber residuos de colores Tailwind default.

### Propuesta

- Mantener grilla simple, pero introducir variación por categoría mediante encabezados de sección compactos.
- Separar claramente “tabs de momento” de “filtros de tipo”.
- Preparar `imagen_url` desde API como primera fuente.
- Para productos sin imagen, usar placeholder de marca más sobrio: sello Kermingo + patrón mínimo, no ícono grande.
- Reemplazar status colors por tokens propios.

### Archivos

```txt
frontend/components/menu/menu-screen.tsx
frontend/components/menu/menu-header.tsx
frontend/components/menu/menu-filters.tsx
frontend/components/menu/product-card.tsx
frontend/components/menu/product-visual.tsx
frontend/components/menu/floating-cart.tsx
frontend/lib/products.ts
frontend/lib/types.ts
```

---

## 4.3. Carrito

### Estado actual

El carrito vacío es claro y tiene CTA. El carrito con items usa layout mobile razonable.

### Problemas

- Se parece mucho al checkout y al tracking por la repetición de cards blancas.
- La acción destructiva de borrar usa hover rose default.
- El resumen inferior puede sentirse como checkout genérico.
- Faltan microcopys útiles para evento: “Retirás en el mostrador”, “Tené el número a mano”.

### Propuesta

- Convertir el carrito en “bolsa de pedido Kermingo”.
- Usar una tira superior de contexto: “Pedido para retirar en el mostrador”.
- Mantener total sticky, pero con menos sombra.
- Agregar un pequeño recordatorio de que stock se confirma al finalizar.
- Usar tokens propios para quitar/borrar.

### Archivos

```txt
frontend/components/menu/cart-screen.tsx
frontend/components/menu/cart-item-row.tsx
```

---

## 4.4. Confirmar / Checkout

### Estado actual

El checkout está funcionalmente completo: datos, pago, comprobante y resumen.

### Problemas

- Sigue el patrón de cards grandes repetidas.
- Hay labels uppercase y textos grises que pueden tener contraste flojo.
- El método de pago debería ser más claro para familias durante el evento.
- El bloque de comprobante tiene que sentirse seguro y guiado.
- El botón final debe tener un texto específico: no “Continuar”, sino “Confirmar pedido”.

### Propuesta

- Hacer checkout en pasos visuales simples:

```txt
1. Tus datos
2. Cómo pagás
3. Revisá y confirmá
```

- No bloquear con wizard si no hace falta, pero sí organizar visualmente.
- Para transferencia: mostrar requisitos antes del upload.
- Para efectivo: aclarar “Pagás al retirar”.
- Mantener el total sticky en mobile.
- Focus al primer error.

### Archivos

```txt
frontend/components/menu/checkout-screen.tsx
frontend/components/menu/cart-context.tsx
```

---

## 4.5. Confirmado / Ticket QR

### Estado actual

La pantalla de ticket tiene QR y código, lo cual es correcto para seguimiento y retiro.

### Problemas

- Debe priorizar escaneo/lectura en mostrador.
- El QR debe tener suficiente quiet zone, contraste y tamaño táctil/visual.
- El ticket no debe parecer una card genérica de confirmación de SaaS.
- Dirección inconsistente también afecta acá.

### Propuesta

- Convertir el ticket en “talón de kermesse”: perforado visual sutil, borde patria, QR protagonista.
- Mostrar:

```txt
Pedido #1042
Estado actual
QR
Nombre
Total
Método de pago
Retiro en mostrador
```

- Agregar botón “Seguir pedido” y “Volver al menú”.
- Mantener QR muy limpio: blanco, sin fondos decorativos detrás.

### Archivos

```txt
frontend/components/menu/ticket-screen.tsx
frontend/app/confirmado/page.tsx
```

---

## 4.6. Seguimiento

### Estado actual

La pantalla permite ingresar token y ver estado. Visualmente sigue la identidad.

### Problemas

- El input de token parece formulario genérico.
- Falta una metáfora visual de recorrido del pedido.
- Estados podrían estar más claros: recibido → en preparación → listo → entregado.
- Las cards internas usan muchas superficies similares.

### Propuesta

- Usar una línea de progreso tipo “cartelera de retiro”.
- Mostrar claramente el próximo paso:

```txt
Ahora: En preparación
Próximo: Te avisamos cuando esté listo para retirar
```

- Mantener CTA para buscar pedido sin cargar de decoración.
- Si no hay token, usar estado vacío amable: “Buscá tu pedido con el código del ticket”.

### Archivos

```txt
frontend/components/menu/tracking-screen.tsx
frontend/app/seguimiento/page.tsx
```

---

## 4.7. Admin Dashboard

### Estado actual

Dashboard limpio, responsive y funcional. Pero no tiene suficiente carácter ni priorización operativa.

### Problemas principales

- Demasiadas métricas card al inicio.
- No se ve como “centro de operaciones del evento”.
- Accesos rápidos parecen opciones de menú, no acciones urgentes.
- En desktop ocupa mucho espacio con aire que no aporta.
- En mobile es largo: el usuario tarda en llegar a últimos pedidos.
- Links a rutas faltantes.
- Los estados usan colores default.

### Propuesta de rediseño

#### Mobile

```txt
[Header compacto]
[Estado de tienda + demo/en vivo]
[Bloque Ahora]
  - Pedidos por preparar
  - Pagos a validar
  - Listos para entregar
[Botones grandes]
  Caja rápida | Cocina | Pedidos
[Alertas]
  Stock bajo | Agotados
[Últimos pedidos compactos]
```

#### Desktop

```txt
┌─────────────────────────────────────────────────────────────┐
│ Header: Kermingo Admin · tienda/demo · sesión               │
├───────────────┬─────────────────────────────┬───────────────┤
│ Navegación    │ Ahora en el evento           │ Acciones      │
│ Caja          │ Pedidos nuevos               │ Caja rápida   │
│ Cocina        │ En preparación               │ Cocina        │
│ Pedidos       │ Listos                        │ Productos     │
│ Productos     │ Pagos pendientes              │               │
├───────────────┴─────────────────────────────┴───────────────┤
│ Stock / Agotados / Últimos pedidos                           │
└─────────────────────────────────────────────────────────────┘
```

### Cambios concretos

- Reemplazar 6 metric cards por una “tira de operación” compacta.
- Hacer protagonista “Pedidos pendientes / Pagos a validar / Listos para entregar”.
- Agrupar accesos rápidos como “acciones de jornada”.
- Desactivar u ocultar accesos a rutas no existentes.
- Usar un componente `EstadoOperativoBadge` con tokens propios.
- Crear `AdminShell` o `AdminNav` para que el admin tenga consistencia.

### Archivos

```txt
frontend/components/admin/dashboard-screen.tsx
frontend/components/admin/admin-header.tsx
frontend/components/admin/admin-ui.tsx
frontend/app/admin/layout.tsx
```

---

## 4.8. Admin Caja

### Estado actual

Caja es la pantalla más operativa del sistema. Tiene catálogo, buscador, filtros y carrito lateral/mobile. Es útil.

### Problemas

- Los productos son botones grandes, pero todavía se parecen al menú público sin fotos.
- Falta una lectura más rápida para vendedor: precio, stock y cantidad agregada.
- El carrito mobile puede competir con el catálogo.
- Estados de pago necesitan más claridad.
- Los datos cliente/teléfono/mesa podrían estar integrados como panel de venta, no como formulario largo.

### Propuesta

- Caja debe sentirse como “registradora rápida”, no como menú.
- Productos en botones densos:

```txt
Producto
$ precio
stock / agotado
```

- Al agregar, mostrar cantidad en el botón del producto.
- Carrito lateral en desktop siempre visible.
- En mobile, botón flotante “Cobrar · $total” y sheet del carrito.
- Efectivo debe ser opción default y clara.
- Transferencia debe marcar “pendiente de verificación” si aplica.

### Archivos

```txt
frontend/components/admin/caja-screen.tsx
frontend/components/admin/admin-ui.tsx
frontend/lib/admin.ts
```

---

## 4.9. Admin Cocina / Entrega

### Estado actual

Cocina tiene polling cada 10 segundos, tabs de estado, cards de pedidos y resumen de productos pendientes. Está bien orientada funcionalmente.

### Problemas

- Las cards de pedido pueden ser visualmente parecidas entre estados.
- Hay colores default `emerald`, `red`, `amber`, `slate`.
- “Productos pendientes” está bueno, pero podría ser más protagonista en desktop.
- En mobile, tabs + pedidos pueden requerir demasiado scroll.
- La acción “Cancelar” compite con acciones normales.

### Propuesta

- Convertir cocina en tablero KDS simplificado.
- Por estado:

```txt
Recibidos       → borde azul/celeste
En preparación  → borde dorado suave
Listos          → borde cian/verde azulado
```

- En desktop, usar columnas por estado si la cantidad de pedidos no es enorme.
- En mobile, mantener tabs, pero cada card debe tener una banda superior de estado muy clara.
- Agrupar productos pendientes arriba cuando haya más de 0.
- Separar cancelar como acción secundaria/menú, no botón igual al resto.

### Archivos

```txt
frontend/components/admin/cocina-screen.tsx
frontend/components/admin/admin-ui.tsx
```

---

## 4.10. Admin Pedidos

### Estado actual

Pedidos muestra filtros y cards/listado. Sirve para búsqueda y gestión general.

### Problemas

- En mobile hay muchas chips y estados por pedido.
- Las acciones “Ver”, “Marcar pagado”, “En preparación”, “Cancelar” pueden saturar.
- Estado de pago y estado de pedido compiten.
- Falta priorización: qué requiere intervención.

### Propuesta

- Separar filtros rápidos de búsqueda.
- Crear vistas:

```txt
Necesitan acción
Todos
Pagos pendientes
Listos para entregar
Cancelados
```

- En cada card, mostrar primero lo operativo:

```txt
#1042 · $11.000
Sofía Pérez
Pago: pendiente / pagado
Pedido: recibido / preparando / listo
Acción principal según estado
```

- Acciones secundarias en desplegable o fila menos prominente.

### Archivos

```txt
frontend/components/admin/orders-screen.tsx
frontend/components/admin/admin-ui.tsx
```

---

## 4.11. Admin Productos

### Estado actual

Productos tiene buscador, filtros, tabla desktop y cards mobile. Ya integra datos de imagen desde API.

### Problemas

- La tabla desktop parece panel admin estándar.
- En mobile, cada producto es card similar.
- Estados activo/desactivado/agotado usan colores default.
- Ajuste de stock modal puede mejorar.
- Imagen de producto en admin debería ayudar a identificar rápido, pero no dominar.

### Propuesta

- En desktop, mantener tabla pero hacerla más “inventario de evento”.
- Agregar columna de “riesgo stock” visual y no solo número.
- En mobile, convertir cards en filas compactas de inventario.
- Desactivar/agotar debe requerir confirmación o undo.
- Hacer más claro cuándo un producto es promo y cuándo tiene stock ilimitado.

### Archivos

```txt
frontend/components/admin/products-screen.tsx
frontend/components/admin/product-form-dialog.tsx
frontend/components/admin/admin-ui.tsx
frontend/lib/admin.ts
```

---

## 5. Nuevo sistema de componentes admin recomendado

Crear o extender `components/admin/admin-ui.tsx` con primitivas realmente compartidas.

```txt
AdminShell
AdminNav
AdminPageHeader
PanelOperativo
TiraEstadoEvento
EstadoBadge
BotonOperacion
BotonPeligro
ListaOperativa
PedidoCompacto
AlertaStock
EmptyStateAdmin
```

### 5.1. `EstadoBadge`

Debe reemplazar usos sueltos de `Badge` con tonos genéricos.

```ts
export type EstadoVisual =
  | 'informacion'
  | 'pendiente'
  | 'preparando'
  | 'listo'
  | 'entregado'
  | 'pagoPendiente'
  | 'agotado'
  | 'cancelado'
  | 'demo'
```

### 5.2. `BotonOperacion`

Para botones frecuentes de admin.

```txt
Variantes:
- principal: dorado
- secundaria: azul/celeste
- neutra: blanco/azul
- peligrosa: borde peligro
```

### 5.3. `PanelOperativo`

Surface menos genérica que card:

```txt
- borde fino;
- header compacto;
- contenido directo;
- sin sombra salvo hover interactivo.
```

---

## 6. Cambios concretos por archivo

## 6.1. `frontend/app/globals.css`

Cambios:

- Crear tokens CSS Kermingo.
- Agregar clases utilitarias:

```css
.km-focus
.km-panel
.km-panel-operativo
.km-tabular
.km-safe-bottom
```

- Evitar `transition-all` en nuevos componentes.
- Agregar `touch-action: manipulation` a botones/links si no rompe.
- Mantener `prefers-reduced-motion`.

---

## 6.2. `frontend/app/layout.tsx`

Cambios:

- Mantener `next/font`.
- Revisar si `generator: 'v0.app'` debe quitarse para que no quede rastro innecesario de prototipo.
- No agregar links externos de fuentes.
- Si se cambia font, hacerlo en un commit separado.

---

## 6.3. `frontend/lib/evento.ts` nuevo

Crear fuente única para:

```txt
nombre
fecha
horario
dirección
organizador
frase institucional
rutas de logo/escudos
```

Esto elimina inconsistencias entre README, AGENTS, landing, footer y ticket.

---

## 6.4. `frontend/components/admin/admin-ui.tsx`

Cambios:

- Reemplazar tonos `emerald/amber/rose/sky/slate` por tokens propios.
- Crear `EstadoBadge`.
- Crear `ActionSurface` o `BotonOperacion`.
- Evitar uppercase por defecto.
- Mantener `aria-label` en icon buttons.

---

## 6.5. `frontend/components/admin/admin-header.tsx`

Cambios:

- Reducir altura en mobile.
- Mostrar logo + sección sin usar tracking excesivo.
- En desktop, permitir navegación persistente.
- En mobile, agregar acceso rápido a dashboard si no hay bottom nav.
- No duplicar “Modo demo” y “En vivo” sin explicar.

---

## 6.6. `frontend/components/admin/dashboard-screen.tsx`

Cambios:

- Reemplazar `MetricCard` por `BloqueAhora`.
- Convertir métricas en tira compacta.
- Dar prioridad a:

```txt
1. pedidos pendientes;
2. pagos pendientes;
3. pedidos listos;
4. stock bajo/agoyados;
5. recaudación;
6. últimos pedidos.
```

- Desactivar links a rutas inexistentes.
- Reducir espacios verticales en desktop.
- Agregar estado de tienda como contexto, no decoración.

---

## 6.7. `frontend/components/admin/caja-screen.tsx`

Cambios:

- Producto como botón de caja más compacto.
- Mostrar cantidad agregada en producto.
- Carrito sticky lateral más fuerte en desktop.
- En mobile, sheet/bottom bar “Cobrar”.
- Quitar hover translate si genera movimiento innecesario.
- Usar tokens propios en errores y stock.

---

## 6.8. `frontend/components/admin/cocina-screen.tsx`

Cambios:

- Evaluar columnas por estado en desktop.
- Card de pedido con banda de estado.
- Productos pendientes más visibles.
- Cancelar como acción secundaria.
- Tokens de estado propios.
- Evitar red/emerald Tailwind default.

---

## 6.9. `frontend/components/admin/orders-screen.tsx`

Cambios:

- Crear vista “Necesitan acción”.
- Reducir chips.
- Acción principal dinámica según estado.
- Acciones secundarias menos protagonistas.
- Mejor empty state por filtro.

---

## 6.10. `frontend/components/admin/products-screen.tsx`

Cambios:

- Tabla desktop tipo inventario, no dashboard genérico.
- Cards mobile más compactas.
- Imagen mini o placeholder sobrio.
- Modal stock más simple.
- Confirmación/undo en acciones destructivas.

---

## 6.11. `frontend/components/menu/product-visual.tsx`

Cambios:

- Si el dominio de imágenes se define, pasar de `<img>` nativo a `next/image` con `remotePatterns`.
- Si se mantiene `<img>`, asegurar dimensiones estables, `loading="lazy"`, `decoding="async"`, y contenedor con aspect ratio.
- Mejorar placeholder para que el ícono no sea protagonista.

---

## 7. Propuesta específica para el dashboard admin

## 7.1. Nuevo layout mobile

```txt
Pantalla: /admin/dashboard

Header compacto
└── Kermingo Admin · Modo demo / Tienda abierta

Bloque Ahora
┌─────────────────────────────┐
│ Ahora en el evento          │
│ 3 pedidos pendientes        │
│ 4 pagos por revisar         │
│ 2 listos para entregar      │
└─────────────────────────────┘

Acciones de jornada
┌ Caja rápida ┐ ┌ Cocina ┐
┌ Pedidos     ┐ ┌ Productos ┐

Alertas
┌ Stock bajo: 6 productos ┐
┌ Agotados: 2 productos   ┐

Últimos pedidos
#1042 · Martín G. · Listo · Pagado · $6.500
#1041 · Lucía P. · Preparando · Pago pendiente
```

## 7.2. Nuevo layout desktop

```txt
max-w-6xl o max-w-7xl

┌──────────────────────────────────────────────────────────┐
│ Buenos días, Admin.                  Tienda: Modo demo   │
│ Sábado 20 de junio · 17 a 21 hs     Última sync 20:45   │
└──────────────────────────────────────────────────────────┘

┌────────────────────────────┬────────────────────────────┐
│ Ahora                      │ Acciones de jornada         │
│ - Pendientes 3             │ [Caja rápida] [Cocina]      │
│ - Preparando 5             │ [Pedidos] [Productos]       │
│ - Listos 2                 │                              │
│ - Pagos pendientes 4       │ Recaudación $187.500        │
└────────────────────────────┴────────────────────────────┘

┌────────────────────────────┬────────────────────────────┐
│ Stock bajo                 │ Últimos pedidos             │
│ Agotados                   │ tabla compacta/lista        │
└────────────────────────────┴────────────────────────────┘
```

## 7.3. Visual

- Fondo celeste suave.
- Panel principal con borde patria fino.
- Botones de acción grandes, no cards genéricas.
- Números con `tabular-nums`.
- Dorado solo para Caja rápida o CTA operativo principal.
- Estado “En vivo” debe tener texto claro y no depender solo de punto verde.

---

## 8. Prioridades

## 8.1. Rápido — 1 a 2 horas

```txt
1. Confirmar y centralizar dirección del evento.
2. Ocultar/deshabilitar links admin a rutas inexistentes.
3. Crear tokens de estado en admin-ui.
4. Reemplazar colores emerald/amber/rose/sky/slate en dashboard.
5. Rediseñar dashboard con bloque “Ahora” + acciones grandes.
6. Reducir uppercase/tracking en admin.
7. Actualizar docs después del cambio.
```

## 8.2. Medio — 3 a 6 horas

```txt
1. Crear AdminShell/AdminNav.
2. Rediseñar Caja con comportamiento de registradora rápida.
3. Rediseñar Cocina como tablero KDS simple.
4. Rediseñar Pedidos con vista “Necesitan acción”.
5. Crear StatusBadge unificado para todo admin.
6. Hacer revisión de accesibilidad mobile.
7. Capturar screenshots 360, 390, 430 y desktop.
```

## 8.3. Profundo — 1 a 2 días

```txt
1. Formalizar design system en docs.
2. Migrar imágenes a next/image con remotePatterns/storage definido.
3. Crear navegación admin consistente mobile/desktop.
4. Mejorar checkout con errores inline y foco al error.
5. Rediseñar ticket QR como talón de kermesse.
6. Agregar estados vacíos y errores con copy consistente.
7. Sincronizar filtros/tabs relevantes con URL.
8. Agregar pruebas visuales o Playwright básico para flujos principales.
```

---

## 9. Riesgos de romper UX o funcionalidad

```txt
Riesgo 1: tocar componentes admin compartidos puede alterar caja, cocina, pedidos y productos al mismo tiempo.
Mitigación: modificar admin-ui en commit separado y revisar todas las pantallas.

Riesgo 2: cambiar nombres de estados puede romper mappers/API.
Mitigación: separar tokens visuales de estados de dominio.

Riesgo 3: pasar imágenes a next/image sin configurar remotePatterns rompe imágenes remotas.
Mitigación: no migrar hasta definir dominio/storage.

Riesgo 4: ocultar accesos rápidos puede confundir si Marcos esperaba esas pantallas.
Mitigación: dejarlos como “Próximamente” deshabilitados o confirmar.

Riesgo 5: aumentar densidad admin puede bajar legibilidad mobile.
Mitigación: probar 360, 390 y 430 px.

Riesgo 6: usar dorado en muchas acciones reduce jerarquía.
Mitigación: reservar dorado para CTA principal de cada pantalla.

Riesgo 7: cambios de tipografía pueden mover layouts.
Mitigación: no cambiar familia de fuente en el mismo commit que rediseño funcional.
```

---

## 10. Checklist de aceptación visual

Antes de cerrar cualquier mejora de frontend:

```txt
General:
- No hay dirección contradictoria.
- No hay overflow horizontal en 360px.
- No aparecen rutas admin activas que den 404.
- No hay gradientes IA genéricos.
- No hay glassmorphism decorativo.
- No hay cards idénticas sin jerarquía.
- No hay emojis como iconografía principal.
- No hay uppercase con tracking en cada sección.

Mobile:
- Revisado en 360px, 390px y 430px.
- Botones principales son fáciles de tocar.
- El CTA principal aparece sin scroll excesivo.
- La barra inferior no tapa contenido.

Admin:
- El dashboard responde “qué hago ahora”.
- Caja permite vender rápido.
- Cocina permite preparar rápido.
- Pedidos permite resolver excepciones.
- Productos permite corregir stock sin confusión.

Accesibilidad:
- Icon-only buttons tienen aria-label.
- Inputs tienen label o aria-label.
- Focus visible real.
- No depende solo del color para estados.
- Contraste suficiente.

Performance:
- No se agregaron assets pesados.
- Imágenes con tamaño estable.
- Sin animaciones largas.
- Sin transition-all en nuevos componentes.

Verificación:
- pnpm lint
- pnpm build si no tarda demasiado
- tests existentes si el cambio toca lógica
- screenshots antes/después
```

---

## 11. Fuentes consultadas

- Vercel Skills — Agent Skills: https://vercel.com/docs/agent-resources/skills
- Skills.sh directory: https://www.skills.sh/
- Anthropic `frontend-design` skill: https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md
- Vercel Web Interface Guidelines skill: https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
- Vercel React Best Practices skill: https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/SKILL.md
- Vercel Next Best Practices skill: https://raw.githubusercontent.com/vercel-labs/next-skills/main/skills/next-best-practices/SKILL.md
- Vercel Next.js & shadcn admin dashboard template: https://vercel.com/templates/next.js/next-js-and-shadcn-ui-admin-dashboard
- Vercel admin dashboard starter: https://vercel.com/templates/next.js/admin-dashboard
- shadcn sidebar blocks: https://ui.shadcn.com/blocks/sidebar
- Tailwind Plus UI blocks: https://tailwindcss.com/plus
- Next.js Image Component: https://nextjs.org/docs/app/api-reference/components/image
- Next.js Font Optimization: https://nextjs.org/docs/app/getting-started/fonts
- Baymard Checkout UX: https://baymard.com/blog/current-state-of-checkout-ux
- NNGroup QR code usability: https://www.nngroup.com/articles/qr-code-guidelines/
- W3C WCAG contrast minimum: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
- W3C WCAG target size minimum: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- W3C WCAG focus appearance: https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- Square Kitchen Display System: https://squareup.com/us/en/point-of-sale/restaurants/kitchen-display-system
- Oracle KDS reference: https://www.oracle.com/food-beverage/restaurant-pos-systems/kds-kitchen-display-systems/
- Netresearch Git Workflow Skill: https://github.com/netresearch/git-workflow-skill

---

## 12. Estado de implementación — Prompt 1 completado

### 12.1. Fuente única de datos del evento (`frontend/lib/evento.ts`)

**Decisión tomada:** Se creó `frontend/lib/evento.ts` como fuente única de verdad para datos del evento (nombre, fecha, horario, dirección, organizadores, frase institucional, temática, precios de entrada).

**Inconsistencia de dirección resuelta parcialmente:**
- AGENTS.md (verdad operativa) dice `Estomba 1980`.
- README.md dice `Echeverría 3920`.
- `evento.ts` usa `Estomba 1980` como valor operativo, con `direccionPendienteDeConfirmar: true` para que Marcos confirme.
- Se debe actualizar el README si Marcos confirma Estomba.

**Componentes migrados:**
- `components/event-info.tsx` — fecha, horario, dirección, efemeride, organizadores
- `components/footer.tsx` — nombre, fecha, horario, dirección, organizadores, descripción
- `components/menu/ticket-screen.tsx` — nombre, dirección, frase institucional
- `components/admin/admin-ui.tsx` — AdminFooter usa nombre y fechaCorta

### 12.2. Tokens de estado CSS y componente `EstadoBadge`

**Variables CSS añadidas a `globals.css`:**

| Token | Valor | Uso |
|---|---|---|
| `--km-info-bg/text` | `#E8F3FF` / `#003B73` | Recibido, pendiente |
| `--km-preparando-bg/text` | `#FFF4DA` / `#7A5500` | En preparación |
| `--km-listo-bg/text` | `#E2F7F8` / `#005B66` | Listo, pagado |
| `--km-alerta-bg/text` | `#FFF1E6` / `#8A4A00` | Stock bajo |
| `--km-peligro-bg/text` | `#FFF0F2` / `#8C1D2D` | Cancelado, agotado |
| `--km-entregado-bg/text` | `#EAF0F7` / `#304C68` | Entregado, cerrado |
| `--km-demo-bg/text` | `#F3F0FF` / `#5B21B6` | Modo demo |
| `--km-azul` / `--km-celeste` / `--km-fondo` / `--km-dorado` / `--km-tinta` / `--km-tinta-suave` / `--km-papel` / `--km-linea` | Paleta base | Ya existían en `@theme`, ahora duplicados en `:root` para uso en CSS custom properties |

**Clases utilitarias añadidas:**
- `.km-focus` — focus ring visible
- `.km-panel` — panel operativo
- `.km-panel-operativo` — alias
- `.km-tabular` — tabular-nums
- `.km-safe-bottom` — safe-area padding

**Componente `EstadoBadge` añadido a `admin-ui.tsx`:**
- Tipo `EstadoVisual` con 11 estados: `informacion`, `pendiente`, `preparando`, `listo`, `entregado`, `pagoPendiente`, `agotado`, `cancelado`, `demo`, `stockBajo`, `activo`
- Mapea a `BadgeTone` usando tokens CSS en vez de clases Tailwind genéricas
- `BadgeTone` ampliado con `preparando`, `listo`, `entregado`, `alerta`, `demo`
- `IconBox` migrado de colores Tailwind genéricos (emerald-50, amber-50, sky-50, slate-100, rose-50) a tokens CSS Kermingo

**`SectionTitle`:** Reducido `uppercase tracking-widest` a `tracking-wide` sin uppercase — más legible, menos "screaming SaaS".

**`AdminFooter`:** Usa `EVENTO.nombre` y `EVENTO.fechaCorta` de `lib/evento.ts`; removido `uppercase`.

### 12.3. Pendiente de confirmar por Marcos

- [ ] Dirección: ¿Estomba 1980 o Echeverría 3920? Actualmente usa Estomba 1980 por AGENTS.md.
- [ ] Verificar visualmente que los nuevos tokens de estado se vean bien en todos los admin screens existentes (caja, cocina, pedidos, productos — dashboard ya migrado).
- [ ] Migrar gradualmente los badges existentes en otros admin screens de `Badge` genérico a `EstadoBadge` con tokens.

---

## 13. Estado de implementación — Prompt 2 completado

### 13.1. Dashboard rediseñado como mesa operativa del evento

**Archivo modificado:** `frontend/components/admin/dashboard-screen.tsx`

**Cambios principales:**

1. **Reemplazadas 6 metric cards iguales** por tira operativa "Ahora en el evento" con 4 indicadores operativos: Pendientes, Pagos por revisar, Listos para entregar, Preparando. Cada uno linkea a Pedidos o Cocina según corresponda. En desktop se muestra como strip horizontal; en mobile como grilla 2×2.

2. **Nueva jerarquía operativa:**
   - Ahora en el evento → pendientes, pagos pendientes, listos
   - Acciones de jornada → Caja rápida (dorado), Cocina, Pedidos, Productos
   - Alertas de stock → stock bajo y agotados
   - Recaudación → dato financiero secundario (1fr en desktop)
   - Últimos pedidos → tabla compacta (2fr en desktop)

3. **Eliminados colores Tailwind default:** emerald, amber, rose, sky, slate reemplazados por variables CSS `--km-*` y `EstadoBadge` en todos los estados de pedidos, pagos y alertas.

4. **Rutas no implementadas deshabilitadas:** Comprobantes, Reportes y Configuración se muestran como "Próximamente" con opacidad reducida y sin link, porque no existe `page.tsx` para esas rutas.

5. **Dorado reservado solo para Caja rápida:** único botón highlight con fondo dorado, los demás usan azul/celeste.

6. **`km-tabular`** aplicado a todos los números, códigos y montos.

7. **`km-panel`** usado como superficie en vez de cards con sombras.

8. **Desktop usa `max-w-6xl`** y layout `1fr/2fr` para recaudación + últimos pedidos, en vez de `max-w-5xl` con todo en 1 columna.

9. **Mobile 360px:** densidad controlada, padding reducido, grilla 2×2 para Ahora y Acciones, sin scroll excesivo.

10. **Barra de contexto del evento:** fecha, horario y dirección desde `EVENTO` (lib/evento.ts) debajo del saludo.

11. **Estado de tienda usa tokens:** "En vivo" con `--km-listo-text`, "Demo" con `--km-demo-text`, "Cerrada" con `--km-peligro-text` en vez de `bg-emerald-500`.

**Clichés eliminados:**
- 6 metric cards iguales tipo SaaS → tira operativa con jerarquía
- Colores Tailwind default (emerald/amber/rose/sky/slate) → tokens `--km-*`
- `Badge` con tones genéricos → `EstadoBadge` con `EstadoVisual`
- Links activos a rutas sin página → deshabilitados con "Próximamente"
- Dorado en varios elementos → solo Caja rápida
- Shadow-heavy cards → `km-panel` sin sombra
- `font-display` en labels → `km-tabular` solo en datos
- Live indicator con punto `bg-emerald-500` → tokens Kermingo

**Verificación ejecutada:**
- `pnpm exec tsc --noEmit` ✅ sin errores
- `pnpm lint` ✅ sin errores ni warnings
- `pnpm test` ✅ 92/92 tests pasados
- `pnpm build` ✅ build exitoso

---

## 14. Estado de implementación — Prompt 3 completado

### 14.1. Caja rediseñada como registradora rápida de kermesse

**Archivo modificado:** `frontend/components/admin/caja-screen.tsx`

**Cambios principales:**

1. **Botones de producto operativos** — reemplazadas cards con icono/imagen por botones densos que muestran nombre, precio con `km-tabular`, stock en unidades (`5 u`), y badges inline para "Agotado" / "Bajo". Sin hover translate (era fricción), sin icono de producto (menos ruido).

2. **Cantidad en el botón** — si un producto ya está en la venta, aparece un badge dorado (-right-1 -top-1) con la cantidad agregada. El fondo del botón cambia a un sutil dorado/8 para indicar visualmente que está en el carrito.

3. **Panel lateral desktop siempre visible** — `km-panel` sin sombras pesadas, header azul con conteo, líneas compactas con +/- y subtotal por línea, datos opcionales más compactos (text-xs), total grande con `km-tabular`.

4. **Barra "Cobrar" mobile** — barra inferior con `km-safe-bottom`, fondo azul, botón dorado con total + chevron-up. No cubre productos; la grilla tiene `pb-24` para compensar. Toca para abrir sheet del pedido.

5. **Efectivo como default destacado** — botón de efectivo usa `--km-listo-bg` (teal/cian) como fondo activo, con indicador "Se registra como pagado al confirmar". Transferencia usa azul oscuro activo.

6. **Transferencia con aviso de verificación** — al elegir transferencia, aparece barra `--km-preparando-bg` con ícono de reloj: "Pago pendiente de verificación". El payload sigue enviando `estado_pago: pendiente`.

7. **Tokens Kermingo en vez de Tailwind defaults** — eliminados `border-red-200`, `bg-red-50`, `text-red-700`, `bg-emerald-100`, `text-emerald-600`, `text-slate-400`, `hover:bg-red-50`, `hover:text-red-500`, `bg-slate-50`, `border-slate-200`, `text-slate-300`, `border-slate-200`. Reemplazados por variables CSS `--km-*`.

8. **Accesibilidad** — `km-focus` en todos los controles, `aria-label` en todos los inputs y botones, `touch-action: manipulation` implícito por botones nativos.

9. **Mobile 360px** — grilla 2 cols, padding reducido, filtros compactos, barra inferior con safe-area, sin overflow horizontal.

**Clichés eliminados:**
- Cards con icono grande tipo menú → botones operativos densos
- Hover translate en productos → `active:scale-[0.98]` sutil
- `Badge` con tones `danger`/`warning` genéricos → texto inline con tokens `--km-*`
- Colores Tailwind default (red, slate, emerald) → tokens `--km-peligro-*`, `--km-entregado-*`, `--km-listo-*`, `--km-preparando-*`
- Confirmación con `bg-emerald-100`/`text-emerald-600` → `--km-listo-bg`/`--km-listo-text`
- `shadow-sm`/`shadow-lg` en cards → `km-panel` sin sombra
- `uppercase tracking-wide` en "Total" → texto normal
- Quitar ítem con `hover:bg-red-50 hover:text-red-500` → `hover:bg-[var(--km-peligro-bg)] hover:text-[var(--km-peligro-text)]`

**Verificación ejecutada:**
- `pnpm exec tsc --noEmit` ✅ sin errores
- `pnpm lint` ✅ sin errores ni warnings
- `pnpm test` ✅ 92/92 tests pasados
- `pnpm build` ✅ build exitoso

---

## 15. Estado de implementación — Prompt 4 completado

### 15.1. Cocina rediseñada como KDS simple de kermesse

**Archivo modificado:** `frontend/components/admin/cocina-screen.tsx`

**Cambios principales:**

1. **Strip de productos pendientes** — movido de sidebar lateral a strip horizontal protagonista arriba de todo. Muestra ítems agrupados por producto con chips compactos (`3× Pizza`, `2× Coca`). Usa tokens `--km-preparando-*`. Hasta 12 en desktop, 8 en mobile, con indicador "+N más" si excede.

2. **Desktop: tablero KDS 3 columnas** — reemplazada grilla 2 cols genérica por 3 columnas fijas por estado (Recibidos, En preparación, Listos). Cada columna tiene header con icono de estado (`CircleDot`, `Flame`, `Bell`) + label + conteo con `km-tabular`. Pedidos cerrados (entregados/cancelados) colapsados en `<details>` al final para no competir con activos.

3. **Mobile: tabs con estado visual** — cada tab ahora usa el color de estado correspondiente como fondo activo (celeste para Recibidos, ámbar para Preparando, cian para Listos, gris para Entregados), con icono de estado. No solo conteo, sino identificación visual inmediata.

4. **Card de pedido KDS** — cada card tiene:
   - Borde izquierdo de 3px coloreado por estado (no solo badge)
   - Banner de estado con icono + texto (no solo color)
   - Código, cliente, hora, mesa con `km-tabular`
   - Observaciones con tokens `--km-preparando-*` (no `bg-amber-50 text-amber-700`)
   - Líneas de producto compactas con cantidad en fondo azul/10

5. **Acción principal única** — reemplazada grilla 2×2 de botones por un solo botón contextual grande: "Empezar" (recibido → preparación), "Marcar listo" (preparación → listo), "Entregado" (listo → entregado). Con icono de destino y flecha.

6. **Cancelar oculto en menú desplegable** — reemplazado botón visible "Cancelar" que competía con acciones normales por icono `MoreHorizontal` ("…") que abre menú desplegable con "Cancelar pedido". Solo disponible en estados `recibido` y `preparacion`. Usa tokens `--km-peligro-*`.

7. **Pago pendiente como `EstadoBadge`** — reemplazado `Badge` con tone `danger` genérico por `EstadoBadge` con `estado="pagoPendiente"`. Pago ok usa `estado="listo"`.

8. **Tokens Kermingo exclusivamente** — eliminados todos los colores Tailwind default: `bg-red-50`, `text-red-700`, `border-red-200`, `text-emerald-500`, `text-red-500`, `bg-amber-50`, `text-amber-700`, `text-slate-400`, `border-slate-200`. Reemplazados por variables CSS `--km-*`.

9. **Polling, endpoints y lógica preservados** — no se modificó el polling (10s, visibilitychange), los endpoints (`/api/admin/cocina/pedidos`, `/api/admin/cocina/pedidos/:id/estado`, `/api/admin/pedidos/:id/cancelar`), ni la lógica de avance/cancelación.

10. **Accesibilidad** — `km-focus` en todos los controles, `aria-label` en tabs y botones, `km-tabular` en números.

**Clichés eliminados:**
- Grilla 2 cols genérica → tablero KDS 3 columnas por estado
- Tabs sin diferenciación visual → tabs con color/icono de estado
- Card con `border-2 border-[#75AADB]/20` → `border-l-[3px]` + banner de estado con icono
- `Badge` con tones genéricos → `EstadoBadge` con tokens `--km-*`
- 4 botones en grilla 2×2 → 1 botón principal contextual
- "Cancelar" como botón visible → menú desplegable oculto
- Observaciones `bg-amber-50 text-amber-700` → `--km-preparando-bg`/`--km-preparando-text`
- Errores `bg-red-50 text-red-700` → `--km-peligro-bg`/`--km-peligro-text`
- Entregado `text-emerald-500` → `--km-entregado-text`
- Cancelado `text-red-500` → `--km-peligro-text`
- Vacío `text-slate-400` → `text-[#003B73]/35`
- Sidebar "Productos pendientes" secundaria → strip protagonista arriba
- `shadow-sm` en cards → `km-panel` sin sombra
- Solo color para estados → borde izquierdo + banner + icono + color

**Verificación ejecutada:**
- `pnpm exec tsc --noEmit` ✅ sin errores
- `pnpm lint` ✅ sin errores ni warnings
- `pnpm test` ✅ 92/92 tests pasados
- `pnpm build` ✅ build exitoso

---

## 16. Estado de implementación — Prompt 5 completado

### 16.1. Pedidos rediseñado como herramienta de resolución de excepciones

**Archivo modificado:** `frontend/components/admin/orders-screen.tsx`

**Cambios principales:**

1. **Vista "Necesitan acción" como tab principal** — reemplazado listado genérico por dos tabs: "Necesitan acción" (default) y "Todos". La vista de acción muestra solo pedidos que requieren intervención (pendientes de pago, recibidos, en preparación, listos). El tab tiene badge con conteo. Empty state positivo cuando no hay pendientes.

2. **Cards con jerarquía clara, sin chips que compitan** — cada card muestra: `EstadoBadge` para estado del pedido, línea compacta `PaymentLine` para pago+método (sin badge extra), origen como tag sutil. Antes había 4 chips/badges compitiendo (estado, pago, método, origen).

3. **Borde izquierdo coloreado por estado** — cada card y fila de tabla tiene `border-l-[3px]` con el token de color del estado, igual que cocina-screen.

4. **Acción principal dinámica** — un solo botón contextual grande por estado: "Empezar" (recibido → preparación), "Marcar listo" (preparación → listo), "Entregar" (listo → entregado). Con icono de destino y flecha. Pedidos cerrados solo muestran "Ver detalle".

5. **Acciones secundarias en menú desplegable** — "Cancelar pedido" y "Ver detalle" en menú desplegable (icono `MoreHorizontal`), no como botones visibles que compiten con la acción principal. Igual patrón que cocina-screen.

6. **Pago pendiente resaltado** — si el pedido necesita pago y no está cerrado, aparece aviso inline con tokens `--km-preparando-*`: "Pago pendiente — verificá al entregar". Botón rápido "Pagado" con tokens `--km-listo-*`.

7. **Filtros colapsables** — reemplazado panel de filtros siempre visible por panel desplegable con toggle. Los filtros activos se indican con badge en el botón. Búsqueda siempre visible.

8. **Tabla desktop optimizada** — de 7 columnas a 5: pedido, cliente, estado (que incluye pago+método como línea compacta), total, acción. `km-tabular` en códigos, horas y montos.

9. **Empty states contextuales** — "Necesitan acción" vacío: "Todo en orden" con icono `CircleCheck` en `--km-listo-*`. "Todos" vacío: "No hay pedidos todavía" con icono `Inbox`. Ambos con botón "Limpiar filtros" si hay filtros activos.

10. **Tokens Kermingo exclusivamente** — eliminados `emerald-600`, `sky-600`, `red-200`, `bg-red-50`, `text-red-700`, `slate-400`, `slate-500`, `bg-amber-50`, `text-amber-700`, `bg-red-50/50`, `text-red-500`, `bg-emerald-50`, `text-emerald-600`, `border-red-200`. Reemplazados por variables CSS `--km-*`.

11. **Modal de detalle alineado** — usa `EstadoBadge` en vez de `Badge` con tones genéricos. Notas con `--km-preparando-*`. Comprobante adjunto con `--km-listo-*`. Comprobante sin adjunto con `--km-peligro-*`. Headers sin `uppercase tracking-widest`. Acción principal grande en el footer.

12. **Endpoints, data flow y lógica preservados** — no se modificaron endpoints, validaciones, lógica de avance/cancelación/pago ni el contrato de API.

**Clichés eliminados:**
- Listado genérico de pedidos → herramienta de resolución de excepciones
- "Todos" como vista default → "Necesitan acción" como vista principal
- 4 chips/badges compitiendo por atención → 1 `EstadoBadge` + línea compacta de pago + origen sutil
- 4 botones visibles que compiten → 1 acción principal dinámica + menú desplegable
- `Badge` con tones genéricos (`info`, `warning`, `success`, `neutral`, `danger`) → `EstadoBadge` con tokens `--km-*`
- Filtros siempre visibles → filtros colapsables con indicador de filtros activos
- Empty state genérico → empty states contextuales por vista
- Colores Tailwind default (emerald, sky, red, slate, amber) → tokens `--km-*`
- Tabla con 7 columnas → tabla con 5 columnas (pago+método combinados)
- `rounded-2xl + shadow-sm` → `km-panel` con `border-l-[3px]` de estado
- `uppercase tracking-widest` en modal headers → `tracking-wide` sin uppercase
- Errores con `border-red-200 bg-red-50 text-red-700` → `--km-peligro-bg`/`--km-peligro-text`
- Notas con `bg-amber-50 text-amber-700` → `--km-preparando-bg`/`--km-preparando-text`
- Comprobante sin adjunto con `bg-red-50/50 text-red-500` → `--km-peligro-bg`/`--km-peligro-text`
- Comprobante adjunto con `bg-emerald-50 text-emerald-600` → `--km-listo-bg`/`--km-listo-text`
- Acción de cancelar como botón visible → menú desplegable oculto

**Verificación ejecutada:**
- `pnpm exec tsc --noEmit` ✅ sin errores
- `pnpm lint` ✅ sin errores ni warnings
- `pnpm test` ✅ 92/92 tests pasados
- `pnpm build` ✅ build exitoso

---

## 17. Estado de implementación — Prompt 6 completado

### 17.1. Productos rediseñado como inventario operativo del evento

**Archivos modificados:**
- `frontend/components/admin/products-screen.tsx`
- `frontend/components/admin/product-form-dialog.tsx`
- `DOCUMENTACION/IA/WEBAPP.md`
- `docs/planificacion/28-AUDITORIA_VISUAL_Y_PLAN_MEJORA_FRONTEND.md`

**Cambios principales:**

1. **Encabezado "Inventario"** — reemplaza "Catálogo" para transmitir gestión de stock, no catálogo público. Conteo con `km-tabular`.

2. **Tabla desktop tipo inventario** — header sin `uppercase` excesivo, solo `tracking-wide`. `StockCell` con unidades `u` e ícono `InfinityIcon` para stock ilimitado. Colores de stock por tokens: agotado `--km-peligro-text`, bajo `--km-alerta-text`, OK `--km-listo-text`.

3. **Cards mobile compactas** — `km-panel` con `border-l-[3px]` coloreado por estado. Acciones primarias (Editar/Stock) separadas de acción peligrosa (Desactivar/Recuperar) en menú desplegable con `MoreHorizontal`. Productos desactivados con `opacity-70`.

4. **`EstadoBadge` en vez de `Badge` con tones genéricos** — activo → `activo` (teal), agotado → `agotado` (rojo), desactivado → `entregado` (gris azulado), stock bajo → `stockBajo` (naranja).

5. **Acciones peligrosas separadas** — Desactivar/Recuperar en menú desplegable (desktop y mobile), no como botón visible que compite con Editar y Stock. Tono peligro con `--km-peligro-*`, tono recuperar con `--km-listo-*`.

6. **Modal de stock táctil** — header azul con ícono `Boxes`, info del producto (nombre + stock mínimo), contador grande (h-14 w-14) con `active:scale-95`, feedback visual de estado: agotado (`--km-peligro-bg/text` + `PackageX`), stock bajo (`--km-alerta-bg/text` + `AlertTriangle` + mínimo visible), stock OK (`--km-listo-bg/text`). `km-tabular`, `km-focus`.

7. **Stock inline en mobile** — `StockInline` con ícono infinito, tokens de color por estado, unidades `u`.

8. **Tokens Kermingo exclusivamente** — eliminados `text-amber-600`, `text-red-500`, `text-slate-700`, `text-slate-400`, `text-slate-500`, `text-slate-600`, `bg-red-50`, `border-red-200`, `text-red-700`, `text-red-600`, `bg-slate-300`, `border-slate-300`, `text-slate-400`. Reemplazados por variables CSS `--km-*` y opacidades de `#003B73`.

9. **Formulario de producto** — errores con `--km-peligro-bg/text`, "Quitar foto" con `--km-peligro-bg/text`, checkbox desmarcado con `border-[#75AADB]/40`, hint texts con `text-[#003B73]/40`, toggle off con `bg-[#75AADB]/40`.

10. **Endpoints, data flow y lógica preservados** — no se modificaron endpoints, validaciones, ni contrato de API.

**Clichés eliminados:**
- "Catálogo" → "Inventario"
- Tabla genérica SaaS → tabla de inventario operativo con stock visual por tokens
- `Badge` con tones `success`/`neutral`/`danger`/`warning` → `EstadoBadge` con `EstadoVisual`
- Botón "Desactivar"/"Recuperar" visible en fila → menú desplegable separado
- Stock como número genérico con `font-mono` → `StockCell` con íconos, unidades y colores por estado
- `text-amber-600` → `--km-alerta-text`
- `text-red-500` → `--km-peligro-text`
- `text-slate-700` → `--km-listo-text` / `text-[#003B73]`
- `text-slate-400` → `text-[#003B73]/40`
- `text-slate-500` → `text-[#003B73]/50`
- `bg-red-50`/`border-red-200` → `--km-peligro-bg`
- `bg-slate-300` → `bg-[#75AADB]/40`
- `border-slate-300` → `border-[#75AADB]/40`
- Modal de stock genérico → modal táctil con feedback de estado
- `rounded-2xl border shadow` → `km-panel`

**Verificación ejecutada:**
- `pnpm exec tsc --noEmit` ✅ sin errores
- `pnpm lint` ✅ sin errores ni warnings
- `pnpm test` ✅ 92/92 tests pasados
- `pnpm build` ✅ build exitoso

---

## 18. Estado de implementación — Prompt 7 completado

### 18.1. Carrito, checkout, ticket y seguimiento mejorados

**Archivos modificados:**
- `frontend/components/menu/cart-screen.tsx`
- `frontend/components/menu/cart-item-row.tsx`
- `frontend/components/menu/checkout-screen.tsx`
- `frontend/components/menu/ticket-screen.tsx`
- `frontend/components/menu/tracking-screen.tsx`
- `frontend/test/ticket-screen.test.tsx`
- `frontend/test/tracking-screen-token.test.tsx`
- `DOCUMENTACION/IA/WEBAPP.md`
- `docs/planificacion/28-AUDITORIA_VISUAL_Y_PLAN_MEJORA_FRONTEND.md`

**Cambios principales:**

1. **Carrito como "pedido para retirar"** — título cambió de "Tu carrito" a "Tu pedido". Se agregó banner de contexto con ícono `Store`: "Pedido para retirar en el mostrador del evento". Texto del CTA cambió de "Continuar pedido" a "Confirmar pedido". Nota del resumen simplificada: "El stock se reserva al confirmar. Retirás tu pedido en el mostrador del evento."

2. **Checkout organizado en pasos visibles** — tres secciones numeradas con círculos azules: "1. Tu pedido", "2. Tus datos", "3. Cómo pagás". Cada sección usa `km-panel` en vez de `rounded-3xl bg-white shadow-sm`. Campo de nombre con `autoFocus` y error inline si tiene menos de 2 caracteres.

3. **Transferencia con instrucciones claras y comprobante guiado** — sección "Datos para transferir" con texto introductorio "Copiá los datos y hacé la transferencia. Luego subí el comprobante." Botones de copiar usan `km-focus`. Comprobante adjuntado muestra `FileCheck2` con `--km-listo-bg/text` y checkmark "✓ Comprobante adjuntado" en vez de texto genérico. Aviso de validación con `--km-preparando-bg/text`: "El pago queda pendiente hasta que verifiquemos el comprobante."

4. **Efectivo clarificado como "pagás al retirar"** — banner con `--km-preparando-bg` y ícono `Banknote`: "Pagás al retirar el pedido" como título, "Acercate al mostrador, indicá tu número de pedido y abonás en efectivo al retirar" como detalle.

5. **Ticket QR protagonista estilo talón de kermesse** — encabezado cambió de "Pedido confirmado" a "Talón de kermesse". QR aumentado a 176px con quiet zone blanca (`rounded-xl bg-white p-3 ring-1 ring-black/5`) dentro de un contenedor con borde punteado celeste. QR tiene etiqueta "Escaneá para seguir tu pedido" arriba y token legible abajo. Sección de retiro cambió de `MapPin` genérico a `Store` con texto "Retirá en el mostrador" + dirección del evento desde `EVENTO.direccion`. Todos los colores hardcoded reemplazados por `var(--km-*)`.

6. **Seguimiento con línea de progreso** — reemplazadas barras genéricas por línea de progreso con dots coloreados por token de estado (`--km-info-text`, `--km-preparando-text`, `--km-listo-text`, `--km-entregado-text`). Cada paso completado usa `Check` con color del paso correspondiente; paso activo usa `ring-4 ring-[var(--km-dorado)]/25`. Texto "En curso ahora" debajo del paso activo. Header de estado usa tokens `var(--km-*)` en vez de colores Tailwind default (`bg-emerald-500`, `bg-[#16A34A]`, etc.). Sección de pago usa `--km-preparando-*`, `--km-info-*`, `--km-listo-*`, `--km-peligro-*` según estado. Sección de retiro en mostrador añadida con ícono `Store` y `--km-info-bg/text`.

7. **Cards repetidas reducidas** — `km-panel` reemplaza `rounded-3xl bg-white shadow-sm shadow-[#003B73]/5` en carrito, checkout y seguimiento. `shadow-lg shadow-black/10` solo en el header de estado de seguimiento (única superficie que necesita jerarquía).

8. **Focus visible y errores inline** — `km-focus` en todos los controles interactivos (botones, inputs, enlaces). Errores de validación inline con `--km-peligro-bg/text`. Error de envío con `--km-peligro-bg/text` en vez de `border-rose-200 bg-rose-50 text-rose-700`. Error de seguimiento con `--km-peligro-bg/text`.

9. **Sin animaciones pesadas** — solo `transition-colors` y `active:scale-[0.99]` en botones principales. Sin `transition-all` en nuevos componentes.

10. **Tokens Kermingo y `var(--km-*)` exclusivamente** — eliminados colores Tailwind default: `rose-50`, `rose-600`, `emerald-600`, `bg-[#16A34A]`, `text-[#16A34A]`, `bg-[#ECFDF3]`, `border-[#16A34A]/40`, `text-[#15803D]`, `bg-[#FEF2F2]`, `text-[#B91C1C]`, `border-[#DC2626]/40`, `text-[#1D4ED8]`, `border-[#75AADB]/50`, `text-[#9CA3AF]`, `bg-[#FFF6E0]`, `text-[#9A6B00]`, `border-[#F6B21A]/40`, `shadow-[#003B73]/5` en favor de `var(--km-*)` y `km-panel`.

**Clichés eliminados:**
- "Tu carrito" → "Tu pedido"
- "Continuar pedido" → "Confirmar pedido"
- Checkout sin pasos → 3 pasos numerados visibles
- Transferencia sin guía → instrucciones + comprobante guiado con confirmación visual
- Efectivo "Pagás en caja" → "Pagás al retirar el pedido"
- Ticket como card genérica → talón de kermesse con QR protagonista
- QR sin quiet zone → QR con zona blanca y borde punteado celeste
- "Pedido confirmado" → "Talón de kermesse"
- Seguimiento con `bg-[#16A34A]`/`text-[#16A34A]` → tokens `--km-listo-text`/`--km-listo-bg`
- `bg-emerald-500` → `var(--km-listo-text)` para entregado
- `bg-[#DC2626]` → `var(--km-peligro-text)` para cancelado
- `bg-[#FFF6E0] text-[#9A6B00]` → `var(--km-preparando-bg/text)`
- `border-rose-200 bg-rose-50 text-rose-700` → `var(--km-peligro-bg/text)`
- `shadow-sm shadow-[#003B73]/5` → `km-panel`
- `text-[#9CA3AF]` → `text-[var(--km-tinta-suave)]`
- `text-[#6B7280]` → `text-[var(--km-tinta-suave)]`
- `rounded-3xl` en resumen → `km-panel`
- `uppercase tracking-wide` en labels → `tracking-wide` sin uppercase
- Tracking sin contexto de retiro → sección "Retirá tu pedido en el mostrador del evento"
- Tracking sin barra de progreso por estado → línea de progreso con dots coloreados por token

**Verificación ejecutada:**
- `pnpm exec tsc --noEmit` ✅ sin errores
- `pnpm lint` ✅ sin errores ni warnings
- `pnpm test` ✅ 92/92 tests pasados (2 tests actualizados: placeholder de tracking y tamaño QR)
- `pnpm build` ✅ build exitoso
