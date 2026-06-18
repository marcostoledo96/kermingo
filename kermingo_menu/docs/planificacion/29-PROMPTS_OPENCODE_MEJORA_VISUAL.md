# 29 — Prompts para OpenCode: mejora visual Kermingo

> Estos prompts están pensados para trabajar por cambios chicos, con ramas por módulo y commits por funcionalidad.  
> No ejecutar todo en un único prompt gigante. Usar una rama por módulo.

---

## 1. Prompt maestro de contexto visual

```txt
Analizá el proyecto Kermingo en Next.js/Tailwind antes de tocar código.

Contexto visual aprobado:
Kermingo debe sentirse como un afiche de kermesse patria llevado a una web mobile-first: familiar, institucional, argentino, futbolero/Mundial, Día de la Bandera, con foco en Bingo y Kermesse, y con identificación scout sutil porque lo organiza el Grupo Scout San Patricio, especialmente la Tropa Raider “Compañía de Jesús” y la Comunidad Raider “Fortaleza de María”.

Para el admin, la dirección visual cambia levemente:
No debe parecer dashboard SaaS ni CRM. Debe parecer una mesa de control real de evento: caja, cocina, pedidos, stock, pagos y comprobantes en vivo. Debe ser táctil, rápido, claro para voluntarios y usable desde celular durante el evento.

Reglas anti-cliché:
- No glassmorphism decorativo.
- No gradientes IA genéricos.
- No hero SaaS centrado.
- No cards repetidas sin intención.
- No sombras pesadas como relleno.
- No emojis como iconografía principal.
- No uppercase con tracking en cada sección.
- No verde/rojo/ámbar Tailwind default si existe alternativa de marca.
- No estética restaurante elegante.
- No estética infantil.

Paleta base:
- azul #003B73
- celeste #75AADB
- fondo #EEF5FF
- dorado #F6B21A
- blanco #FFFFFF

Antes de cambiar código:
1. Leé AGENTS.md.
2. Leé DOCUMENTACION/IA/WEBAPP.md.
3. Leé docs/planificacion/12-DISENO_VISUAL_V0.md.
4. Leé docs/planificacion/25-REFERENCIA_VISUAL_FRONTEND.md.
5. Leé docs/planificacion/28-AUDITORIA_VISUAL_Y_PLAN_MEJORA_FRONTEND.md.
6. Revisá las capturas actuales en captures/.

Al finalizar:
- actualizar documentación en docs/planificacion/ o DOCUMENTACION/IA/ si cambia la UI o el flujo;
- ejecutar pnpm lint si está disponible;
- ejecutar pnpm build si no tarda demasiado;
- informar archivos modificados, verificación y pendientes.
```

---

## 2. Prompt 1 — Normalizar datos del evento y tokens visuales

```txt
Trabajemos SOLO en normalizar datos del evento y tokens visuales compartidos.

Objetivo:
Evitar inconsistencias como Echeverría 3920 vs Estomba 1980 y empezar a sacar colores Tailwind default de los estados.

Alcance permitido:
- frontend/lib/evento.ts si no existe
- frontend/app/globals.css
- frontend/components/admin/admin-ui.tsx
- componentes que solo consuman datos del evento: event-info, footer, ticket-screen
- documentación correspondiente

No tocar:
- backend
- contrato de API
- lógica de carrito
- checkout
- caja/cocina/pedidos/productos todavía

Tareas:
1. Crear una fuente única para datos del evento en frontend/lib/evento.ts.
2. Marcar la dirección como dato a confirmar si el repo está inconsistente.
3. Reemplazar textos hardcodeados de fecha/horario/dirección donde sea seguro.
4. Crear tokens CSS o clases de estado para Kermingo.
5. En admin-ui, crear o preparar un StatusBadge/EstadoBadge que use tokens propios.
6. No modificar layouts grandes todavía.
7. Actualizar docs con esta decisión.

Criterios:
- El proyecto compila.
- No hay imports rotos.
- No cambia el contrato de API.
- No se toca backend.
- La documentación queda actualizada.
```

---

## 3. Prompt 2 — Rediseñar SOLO admin dashboard

```txt
Mejorá SOLO /admin/dashboard.

Problema:
El dashboard actual se siente como un dashboard genérico con métricas 3x2. Quiero que se sienta como una mesa de control de Kermingo durante el evento.

Objetivo visual:
- operativo;
- táctil;
- claro;
- mobile-first;
- argentino/Kermingo sin decorar de más;
- sin estética SaaS;
- enfocado en qué hay que resolver ahora.

Alcance permitido:
- frontend/components/admin/dashboard-screen.tsx
- frontend/components/admin/admin-ui.tsx solo si necesitás primitivas visuales
- frontend/components/admin/admin-header.tsx solo ajuste mínimo justificado
- frontend/app/globals.css solo tokens/clases compartidas
- documentación correspondiente

No tocar:
- backend
- API
- caja
- cocina
- pedidos
- productos
- login
- landing
- menú público

Requisitos funcionales:
- Mantener accesos a Caja, Cocina, Pedidos y Productos.
- Si Comprobantes/Reportes/Configuración no tienen ruta implementada, no deben parecer accesos activos. Dejarlos deshabilitados o “Próximamente”.
- Mantener últimos pedidos.
- Mantener stock bajo y agotados.
- Mantener modo demo/en vivo, pero con jerarquía clara.

Nueva jerarquía:
1. Bloque “Ahora en el evento” con pendientes, pagos pendientes y listos.
2. Acciones de jornada: Caja rápida, Cocina, Pedidos, Productos.
3. Alertas de stock.
4. Recaudación como dato secundario o financiero.
5. Últimos pedidos.

Diseño:
- Cambiar métricas 3x2 por una tira o panel operativo.
- Evitar 6 cards iguales.
- Usar dorado solo para la acción principal o caja rápida.
- Reemplazar emerald/amber/rose/sky/slate por tokens Kermingo.
- Usar tabular-nums en números.
- En mobile 360px no debe quedar saturado.
- En desktop debe aprovechar mejor el ancho.

Verificación:
- revisar 360px, 390px, 430px y desktop;
- no overflow horizontal;
- foco visible;
- pnpm lint;
- pnpm build si no tarda demasiado.

Resultado esperado:
Responder con:

## Resultado mejora Dashboard Admin Kermingo

Reading this as:
-

Archivos modificados:
-

Cambios de layout:
-

Cambios de jerarquía operativa:
-

Cambios de color/tokens:
-

Rutas deshabilitadas o pendientes:
-

Clichés eliminados:
-

Verificación mobile/performance:
-

Comandos ejecutados:
-

Pendientes / decisiones para Marcos:
-
```

---

## 4. Prompt 3 — Rediseñar SOLO Admin Caja

```txt
Mejorá SOLO /admin/caja.

Objetivo:
La pantalla debe sentirse como una caja rápida real de kermesse: vender rápido, agregar productos sin fricción, cobrar y registrar pedido.

Alcance permitido:
- frontend/components/admin/caja-screen.tsx
- frontend/components/admin/admin-ui.tsx si necesitás primitivas
- frontend/app/globals.css solo tokens compartidos
- documentación correspondiente

No tocar:
- backend
- contrato de API
- dashboard
- cocina
- pedidos
- productos
- frontend público

Cambios requeridos:
1. Hacer los botones de producto más operativos y menos “card de menú”.
2. Mostrar mejor precio, stock y estado.
3. Si un producto ya está en la venta, mostrar cantidad agregada en el botón.
4. En desktop, carrito lateral siempre claro.
5. En mobile, barra inferior o sheet de cobro que no tape productos.
6. Efectivo debe ser opción rápida y clara.
7. Transferencia debe indicar si queda pendiente de verificación.
8. No usar colores default de Tailwind para alerta/peligro.
9. Mantener foco visible y controles táctiles.

Verificación:
- venta con carrito vacío;
- venta con 1 producto;
- venta con varios productos;
- producto agotado;
- stock bajo;
- efectivo;
- transferencia;
- mobile 360, 390, 430;
- desktop.
```

---

## 5. Prompt 4 — Rediseñar SOLO Admin Cocina / Entrega

```txt
Mejorá SOLO /admin/cocina.

Objetivo:
La pantalla debe funcionar como un KDS simple para una kermesse. Debe permitir ver rápido qué preparar, qué está listo y qué entregar.

Alcance permitido:
- frontend/components/admin/cocina-screen.tsx
- frontend/components/admin/admin-ui.tsx si necesitás primitivas
- frontend/app/globals.css solo tokens compartidos
- documentación correspondiente

No tocar:
- backend
- contrato de API
- caja
- pedidos
- productos
- dashboard
- frontend público

Cambios requeridos:
1. Dar más claridad visual a los estados: recibido, en preparación, listo, entregado.
2. En desktop, evaluar columnas por estado o una composición que parezca tablero operativo.
3. En mobile, mantener tabs si conviene, pero las cards deben diferenciarse mejor por estado.
4. Productos pendientes debe ser más útil y visible.
5. Cancelar no debe competir visualmente con acciones normales.
6. No depender solo del color para estados.
7. Mantener polling y lógica actual.
8. No cambiar endpoints.

Verificación:
- sin pedidos;
- pedidos recibidos;
- pedidos en preparación;
- pedidos listos;
- pedido con observaciones;
- pedido con pago pendiente;
- cancelar;
- avanzar estado;
- mobile y desktop.
```

---

## 6. Prompt 5 — Rediseñar SOLO Admin Pedidos

```txt
Mejorá SOLO /admin/pedidos.

Objetivo:
La pantalla debe ayudar a resolver excepciones y controlar pedidos, no solo listar cards.

Alcance permitido:
- frontend/components/admin/orders-screen.tsx
- frontend/components/admin/admin-ui.tsx si necesitás primitivas
- frontend/app/globals.css solo tokens compartidos
- documentación correspondiente

No tocar:
- backend
- contrato de API
- dashboard
- caja
- cocina
- productos
- frontend público

Cambios requeridos:
1. Crear jerarquía “Necesitan acción” antes que “Todos”.
2. Reducir cantidad de chips por card.
3. Mostrar estado de pedido y pago sin que compitan.
4. Acción principal dinámica según estado.
5. Acciones secundarias menos protagonistas.
6. Mantener búsqueda y filtros.
7. No usar colores Tailwind default.
8. Empty states claros.

Verificación:
- pedido recibido;
- en preparación;
- listo;
- entregado;
- cancelado;
- pago pendiente;
- pago confirmado;
- búsqueda sin resultados;
- mobile y desktop.
```

---

## 7. Prompt 6 — Rediseñar SOLO Admin Productos

```txt
Mejorá SOLO /admin/productos.

Objetivo:
La pantalla debe sentirse como inventario operativo de evento, no como tabla SaaS.

Alcance permitido:
- frontend/components/admin/products-screen.tsx
- frontend/components/admin/product-form-dialog.tsx
- frontend/components/admin/admin-ui.tsx si necesitás primitivas
- frontend/app/globals.css solo tokens compartidos
- documentación correspondiente

No tocar:
- backend
- contrato de API
- caja
- cocina
- pedidos
- dashboard
- frontend público

Cambios requeridos:
1. Mantener tabla desktop pero con lectura más clara de inventario.
2. Cards mobile más compactas.
3. Estados activo/desactivado/agotado con tokens Kermingo.
4. Stock bajo más visible.
5. Acciones peligrosas separadas.
6. Modal de stock más claro y táctil.
7. Imagen/placeholder debe ayudar a identificar, no decorar.

Verificación:
- producto activo;
- desactivado;
- agotado;
- stock bajo;
- stock ilimitado;
- crear producto;
- editar producto;
- ajustar stock;
- mobile y desktop.
```

---

## 8. Prompt 7 — Mejorar carrito, checkout, ticket y seguimiento

```txt
Mejorá SOLO pantallas públicas posteriores al menú:
- /carrito
- /confirmar
- /confirmado
- /seguimiento

Objetivo:
El flujo debe ser rápido y claro para familias usando celular durante el evento. Debe mantener identidad Kermingo, pero sin parecer checkout genérico.

Alcance permitido:
- frontend/components/menu/cart-screen.tsx
- frontend/components/menu/cart-item-row.tsx
- frontend/components/menu/checkout-screen.tsx
- frontend/components/menu/ticket-screen.tsx
- frontend/components/menu/tracking-screen.tsx
- frontend/app/globals.css solo tokens compartidos
- documentación correspondiente

No tocar:
- backend
- contrato de API
- menú
- landing
- admin

Cambios requeridos:
1. Carrito: más claro como “pedido para retirar”.
2. Checkout: organizar en pasos visibles sin wizard pesado.
3. Transferencia: instrucciones claras y comprobante guiado.
4. Efectivo: aclarar pago al retirar.
5. Ticket QR: más protagonista y escaneable, estilo talón de kermesse.
6. Seguimiento: línea de progreso recibida/preparando/listo/entregado.
7. Reducir cards repetidas.
8. Focus visible y errores inline.
9. No animaciones pesadas.

Verificación:
- carrito vacío;
- carrito con productos;
- checkout efectivo;
- checkout transferencia con comprobante;
- error de validación;
- ticket con QR;
- seguimiento sin token;
- seguimiento con token;
- mobile 360, 390, 430 y desktop.
```

---

## 9. Prompt 8 — Auditoría final visual y docs

```txt
Hacé una auditoría final visual del frontend de Kermingo después de las mejoras.

Pantallas:
- home
- menú
- carrito
- confirmar
- confirmado/ticket QR
- seguimiento
- admin dashboard
- admin caja
- admin cocina
- admin pedidos
- admin productos

Devolvé:
1. diagnóstico visual por pantalla;
2. problemas pendientes;
3. inconsistencias de paleta/tipografía/espaciado;
4. riesgos de UX;
5. bugs visuales mobile;
6. rutas rotas o links a pantallas inexistentes;
7. checklist de accesibilidad;
8. archivos de documentación que actualizaste.

No modifiques código en esta tarea salvo documentación.
```
