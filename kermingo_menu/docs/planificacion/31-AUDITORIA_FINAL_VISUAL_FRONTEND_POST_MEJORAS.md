# 31 — Auditoría final visual frontend post-mejoras

> Fecha: 15/06/2026  
> Objetivo: diagnóstico visual completo de todas las pantallas Kermingo después de las mejoras aplicadas (Prompts 1-7).  
> Método: inspección de código fuente + comparación con plan de mejora (doc 28). No se ejecutó browser visual pass — ver §7.

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Diagnóstico por pantalla](#2-diagnóstico-por-pantalla)
   - [Home / Landing](#21-home--landing)
   - [Menú público](#22-menú-público)
   - [Carrito](#23-carrito)
   - [Confirmar / Checkout](#24-confirmar--checkout)
   - [Confirmado / Ticket QR](#25-confirmado--ticket-qr)
   - [Seguimiento](#26-seguimiento)
   - [Admin Dashboard](#27-admin-dashboard)
   - [Admin Caja](#28-admin-caja)
   - [Admin Cocina](#29-admin-cocina)
   - [Admin Pedidos](#210-admin-pedidos)
   - [Admin Productos](#211-admin-productos)
3. [Problemas pendientes](#3-problemas-pendientes)
4. [Inconsistencias de paleta / tipografía / espaciado](#4-inconsistencias-de-paleta--tipografía--espaciado)
5. [Riesgos de UX](#5-riesgos-de-ux)
6. [Rutas rotas o links a pantallas inexistentes](#6-rutas-rotas-o-links-a-pantallas-inexistentes)
7. [Checklist de accesibilidad](#7-checklist-de-accesibilidad)
8. [Bugs visuales mobile a verificar manualmente](#8-bugs-visuales-mobile-a-verificar-manualmente)
9. [Archivos de documentación actualizados](#9-archivos-de-documentación-actualizados)

---

## 1. Resumen ejecutivo

**Estado general: BUENO, con focos de migración incompleta.**  

Las mejoras de los Prompts 1-7 impactaron positivamente en el admin completo (dashboard, caja, cocina, pedidos, productos) y en las pantallas públicas de flujo de compra (carrito, checkout, ticket, seguimiento). Todas estas pantallas ahora usan tokens CSS `--km-*`, `EstadoBadge`, `km-panel`, `km-focus`, `km-tabular`, y eliminaron colores Tailwind default.

Sin embargo, **la landing (home) y el menú público no recibieron la misma migración**:

| Área | Estado de migración |
|------|:---:|
| Admin (dashboard, caja, cocina, pedidos, productos) | ✅ Completamente migrado |
| Flujo público (carrito, checkout, ticket, seguimiento) | ✅ Completamente migrado |
| Menú público (`menu-screen`, `product-card`, `product-visual`, `menu-header`, `floating-cart`, `menu-filters`) | ❌ Sin migrar |
| Landing (`hero`, `header`, `event-info`, `activities`, `bingo-teaser`, `footer`, `cta-buttons`, `disguise-note`) | ❌ Sin migrar (usa `#003B73`, `#75AADB`, `#EEF5FF`, etc. hardcodeados) |
| Admin header (`admin-header.tsx`) | ⚠️ Parcial — usa hardcoded hex colors |
| Layout / `globals.css` | ✅ Tokens creados, clases utilitarias activas |
| `lib/evento.ts` | ✅ Creado y consumido en footer, event-info, ticket-screen, admin-ui |

---

## 2. Diagnóstico por pantalla

### 2.1. Home / Landing

**Archivos:** `app/page.tsx`, `components/hero.tsx`, `components/header.tsx`, `components/event-info.tsx`, `components/bingo-teaser.tsx`, `components/activities.tsx`, `components/disguise-note.tsx`, `components/footer.tsx`, `components/cta-buttons.tsx`

**Tokens Kermingo:** No migrados. Todos los componentes usan valores hex hardcodeados (`#003B73`, `#75AADB`, `#F6B21A`, `#EEF5FF`, `#3A5675`).  

**Problemas detectados:**

| Problema | Severidad | Detalle |
|----------|:---------:|---------|
| Colores hex hardcodeados | 🟡 Media | Hero.tsx: `#003B73`, `#F6B21A`, `#003B73/70` hardcodeados. Si la paleta cambia, hay que reemplazar en N componentes. |
| Fecha hardcodeada en hero | 🟡 Media | `Hero.tsx` línea 37: `"Sábado 20 de junio · 17 a 21 hs"` — no usa `EVENTO.fecha`/`EVENTO.horario` de `lib/evento.ts` |
| Hero imagen de fondo pesada | 🔵 Info | Usa `next/image` con `fill` y `sizes="100vw"`, pero la imagen `/images/kermingo-hero.png` no se auditó peso |
| Logo puede no estar optimizado | 🔵 Info | `KermingoLogo` en hero es `h-28 w-28` con `drop-shadow`. Verificar peso de la imagen |
| Banderines SVG | 🔵 Info | `Banderines` se renderiza en header, hero y footer — sin problemas de peso por ser SVG |
| Footer parcialmente migrado | 🟢 Ok | Footer ya consume `EVENTO.nombre`, `EVENTO.fecha`, `EVENTO.horario`, `EVENTO.direccion`, `EVENTO.descripcion` — pero colores hardcodeados |

### 2.2. Menú público

**Archivos:** `components/menu/menu-screen.tsx`, `components/menu/product-card.tsx`, `components/menu/product-visual.tsx`, `components/menu/menu-header.tsx`, `components/menu/menu-filters.tsx`, `components/menu/floating-cart.tsx`

**Tokens Kermingo:** No migrados. Todos los colores son hex hardcodeados. Uso de `bg-[#EEF5FF]`, `text-[#003B73]`, `text-[#3A5675]`, `border-[#75AADB]/20`, etc.

**Problemas detectados:**

| Problema | Severidad | Detalle |
|----------|:---------:|---------|
| Error state usa `rose-*` Tailwind default | 🔴 Alta | `menu-screen.tsx` línea 129-147: `border-rose-200 bg-rose-50`, `text-rose-500`, `text-rose-700`, `bg-rose-600 hover:bg-rose-700` — debería ser `--km-peligro-*` |
| Empty state usa hex hardcodeados | 🟡 Media | `menu-screen.tsx` línea 160-179: `#75AADB/40`, `#003B73`, `#3A5675`, `#003B73` — no usa `var(--km-*)` |
| Tabs sticky con hex hardcodeados | 🟡 Media | `menu-screen.tsx` línea 107: `bg-[#EEF5FF]`, `border-[#75AADB]/20`, `shadow-[0_4px_8px_-4px_rgba(0,59,115,0.08)]` |
| Product card colores hex hardcodeados | 🟡 Media | `product-card.tsx`: `#003B73/8`, `#F6B21A/20`, `#8a5d00`, `#75AADB/20`, `#5b6b7d`, `#003B73`, `#3A5675`, `#EEF5FF`, `#F6B21A`, `#ffbe2e` |
| `product-card.tsx` focus-visible hardcodeado | 🟡 Media | Líneas 115, 125, 138: `focus-visible:ring-2 focus-visible:ring-[#003B73]` |
| Stock labels usan tokens inline | 🟢 Ok semánticamente | Pero podrían migrarse a `var(--km-*)` para consistencia |
| Skeleton loading | 🟢 Ok | `animate-pulse rounded-3xl bg-white/70 shadow-sm` — simple, sin fugas cromáticas |

### 2.3. Carrito

**Archivo:** `components/menu/cart-screen.tsx`, `components/menu/cart-item-row.tsx`

**Tokens Kermingo:** ✅ Migrado. Usa exclusivamente `var(--km-fondo)`, `var(--km-azul)`, `var(--km-tinta-suave)`, `var(--km-linea)`, `var(--km-dorado)`, `var(--km-info-bg/text)`, `var(--km-peligro-bg/text)`, `km-panel`, `km-focus`, `km-tabular`, `km-safe-bottom`.

**Problemas detectados:**

| Problema | Severidad | Detalle |
|----------|:---------:|---------|
| Ninguno significativo | ✅ | Pantalla limpia, vacío state claro, CTA prominente |
| Banner de contexto "Pedido para retirar" | 🟢 Ok | Usa `--km-info-bg/text` correctamente |
| Disabled CTA button no usa tokens | 🔵 Info | Si se deshabilitara, no tiene estado disabled visual — pero actualmente no hay escenario de disabled |

### 2.4. Confirmar / Checkout

**Archivo:** `components/menu/checkout-screen.tsx`

**Tokens Kermingo:** ✅ Mayormente migrado.

**Problemas detectados:**

| Problema | Severidad | Detalle |
|----------|:---------:|---------|
| Disabled button colores Tailwind default | 🟡 Media | `checkout-screen.tsx` línea 462: `'cursor-not-allowed bg-[#E2E8F0] text-[#94A3B8] shadow-none'` — debería ser `var(--km-entregado-bg)` y `var(--km-tinta-suave)` |
| Datos bancarios hardcodeados | 🔵 Info | Están en el componente mismo (CBU, alias, CUIT, etc.) — podrían ir a un archivo de configuración |
| "Editar" link con `text-xs font-bold` | 🟢 Ok | Subjetivo: quizá muy sutil como acción de editar pedido |
| Pasos numerados con círculo azul | 🟢 Ok | Correcto visualmente |

### 2.5. Confirmado / Ticket QR

**Archivo:** `components/menu/ticket-screen.tsx`

**Tokens Kermingo:** ✅ Migrado. Usa `var(--km-*)` exclusivamente, QR con quiet zone, talón de kermesse.

**Problemas detectados:**

| Problema | Severidad | Detalle |
|----------|:---------:|---------|
| QR `fgColor` hardcodeado a `#003B73` | 🔵 Info | Valdría la pena usar `var(--km-azul)` pero el QR usa `fgColor` como string CSS, no CSS var — es aceptable porque el QR se renderiza en SVG inline |
| Print stylesheet no verificado | 🔵 Info | `print:hidden` en header y botones, pero no se auditó comportamiento real de impresión |
| Perforación visual con `rounded-full bg-[var(--km-azul)]` | 🟢 Ok | Efecto decorativo correcto |

### 2.6. Seguimiento

**Archivo:** `components/menu/tracking-screen.tsx`

**Tokens Kermingo:** ✅ Migrado. Línea de progreso con dots coloreados por token, `km-panel`, `km-focus`, `km-tabular`.

**Problemas detectados:**

| Problema | Severidad | Detalle |
|----------|:---------:|---------|
| `pickProductIcon` para mapeo | 🔵 Info | Usa nombre del producto para inferir icono — frágil si los nombres cambian |
| Auto-fetch por URL token puede fallar si token largo | 🔵 Info | Sin problemas de seguridad aparentes, pero revisar encoding |
| Ninguno visual significativo | ✅ | Pantalla clara, línea de progreso legible, estados con ícono + texto |

### 2.7. Admin Dashboard

**Archivo:** `components/admin/dashboard-screen.tsx`

**Tokens Kermingo:** ✅ Migrado. `EstadoBadge`, `km-panel`, `km-tabular`, `km-focus`. Dorado reservado para Caja rápida. "Ahora en el evento" como bloque principal.

**Problemas detectados:**

| Problema | Severidad | Detalle |
|----------|:---------:|---------|
| Recargar página no persiste tab | 🔵 Info | Si el usuario está en "Necesitan acción" y recarga, vuelve a default — menor impacto porque es operativo en vivo |
| Rutas deshabilitadas como "Próximamente" | 🟢 Ok | Correcto según doc 28 — evita 404 |
| Header de estado de tienda | 🟢 Ok | Usa `--km-listo-text` / `--km-demo-text` / `--km-peligro-text` |
| Sin navegación persistente (AdminShell) | 🟡 Media | Doc 28 §2.5 recomendaba AdminShell/AdminNav — no se implementó en estos prompts |

### 2.8. Admin Caja

**Archivo:** `components/admin/caja-screen.tsx`

**Tokens Kermingo:** ✅ Migrado. Botones operativos densos, badges dorados de cantidad, barra mobile con `km-safe-bottom`.

**Problemas detectados:**

| Problema | Severidad | Detalle |
|----------|:---------:|---------|
| Grilla de productos 2 cols puede ser estrecha en mobile 360px | 🟡 Media | Botones con nombre + precio + stock en 2 columnas puede forzar truncado. Verificar visualmente. |
| Sheet mobile no auditado en vivo | 🔵 Info | Barra "Cobrar" es visible, pero el sheet del pedido no se probó en browser |
| Efectivo como default | 🟢 Ok | Visualmente claro con `--km-listo-bg` |

### 2.9. Admin Cocina

**Archivo:** `components/admin/cocina-screen.tsx`

**Tokens Kermingo:** ✅ Migrado. KDS 3 columnas en desktop, tabs con color de estado, strip de productos pendientes.

**Problemas detectados:**

| Problema | Severidad | Detalle |
|----------|:---------:|---------|
| 3 columnas KDS puede quedar vacía si hay pocos pedidos | 🔵 Info | Empty state por columna no definido; si la columna está vacía se ve el header sin contenido |
| Strip "Productos pendientes" truncado en mobile | 🟡 Media | Muestra hasta 8 chips, "+N más". Verificar que el tamaño de chip sea táctil (>24px). |
| Polling 10s no cambió | 🟢 Ok | Se preservó funcionalidad |

### 2.10. Admin Pedidos

**Archivo:** `components/admin/orders-screen.tsx`

**Tokens Kermingo:** ✅ Migrado. Vista "Necesitan acción", borde izquierdo coloreado, acción principal dinámica.

**Problemas detectados:**

| Problema | Severidad | Detalle |
|----------|:---------:|---------|
| Buscador con debounce 300ms | 🟢 Ok | Funcionalmente correcto |
| Filtros colapsables con badge de activos | 🟢 Ok | Correcto |
| Modal de detalle alineado con tokens | 🟢 Ok | Correcto |

### 2.11. Admin Productos

**Archivo:** `components/admin/products-screen.tsx`, `components/admin/product-form-dialog.tsx`

**Tokens Kermingo:** ✅ Migrado. "Inventario" como header, tabla tipo inventario, modal de stock táctil.

**Problemas detectados:**

| Problema | Severidad | Detalle |
|----------|:---------:|---------|
| Thumbnail de producto usa `<img>` nativo | 🔵 Info | Doc 28 lo menciona como pendiente — no se migró a `next/image` porque el dominio no está configurado |
| Desactivar/Recuperar en menú desplegable | 🟢 Ok | Correcto — no compite con Editar/Stock |

---

## 3. Problemas pendientes

### 🔴 Alta prioridad

| # | Problema | Archivos | Por qué |
|---|----------|----------|---------|
| 1 | **Menú público no migrado a tokens** | `menu-screen.tsx`, `product-card.tsx`, `floating-cart.tsx`, `menu-header.tsx`, `menu-filters.tsx`, `product-visual.tsx` | Usa hex hardcodeados y `rose-*` Tailwind default. Inconsistente con el resto del frontend. |
| 2 | **Error state del menú usa `rose-*`** | `menu-screen.tsx` L129-147 | Usa colores Tailwind default que deberían ser `--km-peligro-*`. |
| 3 | **Dirección pendiente de confirmar** | `lib/evento.ts` | `direccionPendienteDeConfirmar: true` — Marcos debe confirmar Estomba 1980 o Echeverría 3920. |

### 🟡 Media prioridad

| # | Problema | Archivos | Por qué |
|---|----------|----------|---------|
| 4 | **Admin header colores hardcodeados** | `admin-header.tsx` | Usa `#003B73`, `#75AADB`, `#EEF5FF`, `#75AADB/20`, `#75AADB/30` — debería migrar a `var(--km-*)` |
| 5 | **Hero fecha hardcodeada** | `hero.tsx` L37 | `"Sábado 20 de junio · 17 a 21 hs"` debería usar `EVENTO.fecha` y `EVENTO.horario` |
| 6 | **Disabled button en checkout usa `#E2E8F0` / `#94A3B8`** | `checkout-screen.tsx` L462 | Colores genéricos de Tailwind — deberían ser `var(--km-*)` |
| 7 | **Landing completa usa colores hardcodeados** | `hero.tsx`, `header.tsx`, `event-info.tsx`, `activities.tsx`, `bingo-teaser.tsx`, `cta-buttons.tsx`, `disguise-note.tsx` | Todos los componentes de landing usan hex `#003B73`, `#75AADB`, `#F6B21A`, `#EEF5FF` hardcodeados |
| 8 | **Sin AdminShell / navegación persistente** | `app/admin/layout.tsx` | Doc 28 recomendaba barra inferior mobile y sidebar desktop — no implementado |

### 🔵 Info / Futuro

| # | Problema | Detalle |
|---|----------|---------|
| 9 | `generator: 'v0.app'` en metadata del layout | `app/layout.tsx` L23 — no afecta visual, pero es rastro de prototipo |
| 10 | Imágenes no migradas a `next/image` con `remotePatterns` | Productos, logo, hero — el dominio de imágenes no está definido |
| 11 | Sin navegación admin persistente | Mobile podría beneficiarse de bottom nav (Caja, Cocina, Pedidos, Productos) |
| 12 | Checkout: datos bancarios hardcodeados en componente | Deberían ir a un archivo de configuración |

---

## 4. Inconsistencias de paleta / tipografía / espaciado

### Paleta

| Área | Lo que usa | Lo que debería usar |
|------|-----------|-------------------|
| Admin completo | ✅ `var(--km-*)`, `--km-*` tokens | — |
| Flujo público (carrito → seguimiento) | ✅ `var(--km-*)` | — |
| Menú público | ❌ Hex hardcodeados + `rose-*` | `var(--km-*)` |
| Landing | ❌ Hex hardcodeados | `var(--km-*)` |
| Admin header | ⚠️ Hex hardcodeados | `var(--km-*)` |

**Problema estructural:** El proyecto tiene dos sistemas de color funcionando en paralelo: uno con `var(--km-*)` (post-migración) y otro con hex hardcodeados (pre-migración). Esto no causa bugs visuales porque los valores hex son los mismos que los tokens, pero **si se decide cambiar un color de la paleta, hay que tocar archivos de ambos sistemas**.

### Tipografía

| Uso | Estado | Observación |
|-----|--------|-------------|
| `font-display` (Bricolage Grotesque) en títulos | ✅ | Correcto |
| `font-sans` (Inter) en cuerpo | ✅ | Correcto |
| `font-mono` (Geist Mono) en códigos | ✅ | Solo admin-header usa `font-mono` para "Kermingo" label |
| `tracking-wide` en lugar de `uppercase tracking-widest` | ✅ | Migrado en todos los componentes actualizados |
| `km-tabular` en números, códigos, totales | ✅ | Aplicado en admin y flujo público |
| `font-display` en product-card | ✅ | Títulos de producto con Bricolage |

### Espaciado

| Patrón | Estado |
|--------|--------|
| `km-panel` reemplaza `rounded-2xl border shadow-sm` | ✅ Admin, carrito, checkout, seguimiento |
| `km-panel` NO usado en menú público | ❌ `menu-screen.tsx` usa `rounded-3xl border bg-white` |
| `km-safe-bottom` en barras inferiores | ✅ carrito, checkout, caja mobile |
| `km-focus` en controles interactivos | ✅ En todos los componentes migrados |

---

## 5. Riesgos de UX

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|:-----------:|:-------:|------------|
| Productos agotados no se distinguen bien en menú | Baja | Medio | Tienen `opacity-70` o `text-[#5b6b7d]` y label "Sin stock" — verificar en mobile |
| Caja mobile: barra inferior puede solaparse con teclado virtual | Media | Alto | `km-safe-bottom` ayuda, pero no cubre keyboard. Verificar en iOS/Android real |
| Admin sin navegación persistente: usuario se pierde entre pantallas | Media | Bajo | Cada pantalla tiene `backHref` al dashboard. Es operativo, no crítico. |
| Checkout: error de envío sin scroll automático | Baja | Medio | Si el error aparece abajo, usuario podría no verlo si está scrolleado arriba. |
| Seguimiento: token de URL puede ser muy largo para algunos QR scanners | Baja | Bajo | El QR usa nivel M de corrección — suficiente para tokens de ~20 caracteres. |

---

## 6. Rutas rotas o links a pantallas inexistentes

| Ruta | Estado | Observación |
|------|:-----:|-------------|
| `/admin/comprobantes` | ❌ No existe | Dashboard la muestra como "Próximamente" deshabilitada ✅ |
| `/admin/reportes` | ❌ No existe | Dashboard la muestra como "Próximamente" deshabilitada ✅ |
| `/admin/config` | ❌ No existe | Dashboard la muestra como "Próximamente" deshabilitada ✅ |
| `/admin/dashboard` | ✅ Existe | Activo |
| `/admin/caja` | ✅ Existe | Activo |
| `/admin/cocina` | ✅ Existe | Activo |
| `/admin/pedidos` | ✅ Existe | Activo |
| `/admin/productos` | ✅ Existe | Activo |
| `/` | ✅ Existe | Home |
| `/menu` | ✅ Existe | Menú público |
| `/carrito` | ✅ Existe | Carrito |
| `/confirmar` | ✅ Existe | Checkout |
| `/confirmado` | ✅ Existe | Ticket QR |
| `/seguimiento` | ✅ Existe | Seguimiento |

**Rutas de funcionalidades futuras (planificadas pero no implementadas):** comprobantes, reportes, configuración. El dashboard ya las maneja correctamente como "Próximamente".

---

## 7. Checklist de accesibilidad

> Esta checklist se verificó por inspección de código fuente. La verificación visual con herramientas (axe DevTools, WAVE, contrast checker) es manual y queda pendiente.

| Requisito | Estado | Evidencia |
|-----------|:-----:|-----------|
| Icon-only buttons con `aria-label` | ✅ | Verificado en admin-ui, caja, cocina, pedidos, productos, carrito, checkout, ticket, tracking |
| Inputs con `label` o `aria-label` | ✅ | Checkout: `Field` component con `<label>`, seguimiento: `<label>` + `htmlFor` implícito |
| Focus visible real (no `outline: none` sin reemplazo) | ✅ | `km-focus` class implementa `box-shadow` visible. Componentes migrados lo usan. |
| No depende solo del color para estados | ✅ | Estados en cocina: borde izquierdo + banner + icono + texto. Tracking: línea de progreso + icono + texto. |
| Contraste suficiente (WCAG AA 4.5:1 texto normal) | ⚠️ Pendiente | Tokes `--km-alerta-text: #8A4A00` sobre `--km-alerta-bg: #FFF1E6` puede tener contraste bajo (~3.5:1). Verificar. |
| Touch targets mínimo 24×24 CSS px | ⚠️ Parcial | Botones de acción: 48px ✓. Chips de filtro y chips de stock en menú: ~20px — medir. |
| `prefers-reduced-motion` | ✅ | En `globals.css` L115-124. |
| `touch-action: manipulation` | 🔵 No implementado | Doc 28 lo recomendaba. No se agregó en ningún componente. |
| Roles ARIA en elementos dinámicos | ⚠️ Parcial | `role="alert"` en error states ✓. `aria-pressed` en payment options ✓. Faltan `aria-live` en áreas que se actualizan dinámicamente (cocina polling, seguimiento polling). |
| Skip links / navegación por teclado | ❌ No implementado | No hay skip link al contenido principal. No crítico para evento de 4 hs, pero deseable. |

---

## 8. Bugs visuales mobile a verificar manualmente

> Estos son escenarios que **no pueden verificarse por inspección de código** y requieren browser visual pass en dispositivos reales o emulados.

| # | Escenario | Pantalla | Qué verificar |
|---|-----------|----------|---------------|
| 1 | 360px viewport: grilla 2 cols de productos en caja | `/admin/caja` | Botones no deben truncar nombre + precio + stock |
| 2 | 360px viewport: menú con tabs + filtros sticky | `/menu` | No debe solaparse con el header ni quedar contenido oculto |
| 3 | Sheet carrito mobile en caja | `/admin/caja` | El sheet no debe tapar completamente el catálogo; fondo semi-transparente funciona |
| 4 | Banner "Pedido para retirar" + resumen sticky | `/carrito` | En 360px, debe leerse completo sin scroll horizontal |
| 5 | QR en ticket en 360px | `/confirmado` | QR 176px debe ser escaneable sin zoom. Verificar quiet zone. |
| 6 | Línea de progreso de seguimiento en 360px | `/seguimiento` | Dots + labels + línea conectora no deben romperse |
| 7 | Cocina KDS 3 columnas en tablet 768px | `/admin/cocina` | 3 columnas de estado deben ser legibles en landscape |
| 8 | Dashboard "Ahora en el evento" en 390px | `/admin/dashboard` | Grid 2×2 de indicadores operativos no debe saturarse |
| 9 | Teclado virtual en checkout | `/confirmar` | El botón sticky "Confirmar pedido" no debe quedar oculto detrás del teclado. |
| 10 | Impresión del ticket | `/confirmado` | `print:hidden` oculta header/botones. Verificar que el contenido impreso sea legible y completo. |
| 11 | Toast o feedback de copia de CBU | `/confirmar` | Al copiar CBU, el check verde debe verse sin cortes |

---

## 9. Archivos de documentación actualizados

| Archivo | Cambio |
|---------|--------|
| `docs/planificacion/31-AUDITORIA_FINAL_VISUAL_FRONTEND_POST_MEJORAS.md` | ✨ Nuevo — este documento |
| `DOCUMENTACION/IA/WEBAPP.md` | 📝 Agregado link a esta auditoría en sección de referencia visual (§5) |

---

## Checkpoint

```txt
Checkpoint automatico: listo
Checkpoint manual requerido: si — browser visual pass en escenarios de §8
Auditoria con ChatGPT recomendada: si, para verificar contraste de tokens --km-* con WCAG AA
Bloquea avance a siguiente etapa: no
```

---

## Próximos pasos sugeridos

1. **Inmediato**: migrar menú público (`menu-screen.tsx`, `product-card.tsx`) a tokens `--km-*` y reemplazar `rose-*` por `--km-peligro-*`.
2. **Corto**: migrar landing y admin-header a `var(--km-*)`.
3. **Medio**: implementar AdminShell / navegación persistente (bottom nav mobile, sidebar desktop).
4. **Medio**: pasar imágenes de productos a `next/image` con `remotePatterns` configurado.
5. **Manual**: ejecutar browser visual pass (escenarios §8) y registrar screenshots.
6. **Manual**: verificar contraste de `--km-alerta-text` sobre `--km-alerta-bg` con herramienta de contraste.