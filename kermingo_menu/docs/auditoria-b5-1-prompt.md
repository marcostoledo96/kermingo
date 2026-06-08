# Prompt de Auditoría Post-B5.1 para ChatGPT

Sos arquitecto de software senior y QA técnico. Te paso el ZIP actualizado de Kermingo después de B5.1.

## Contexto

Kermingo es el backend de un evento scout recaudatorio (kermesse + bingo). Stack: Node.js + Express + MySQL (mysql2/promise) + ESM + JWT en cookie httpOnly + bcrypt + Zod.

Antes de B5.1, una auditoría detectó 4 problemas críticos y 9 importantes. Esta auditoría verifica que todos fueron corregidos.

## ZIP adjunto: `kermingo-backend-auditoria-b5-1.zip`

Incluye: código fuente del backend (`backend/src/`), specs OpenSpec (`openspec/`), AGENTS.md, documentación de planificación, y el documento de auditoría previa (`docs/planificacion/31-B5_1_FIXES_SEGURIDAD_VALIDACION_STOCK.md`).

## Los 14 puntos a verificar

Auditá específicamente si quedaron corregidos estos puntos:

### 1. Validación Zod reemplaza req (CRIT-1)
Verificá en `backend/src/api/middlewares/validate.middleware.js`:
- ¿`validateBody` asigna `req.body = schema.parse(req.body)` (no solo `schema.parse`)?
- ¿Lo mismo para `validateQuery` con `req.query` y `validateParams` con `req.params`?

### 2. Schemas críticos son strict (CRIT-1)
Verificá en `backend/src/api/schemas/`:
- ¿`createPedidoSchema` tiene `.strict()`?
- ¿`createProductoSchema` tiene `.strict()`?
- ¿`loginSchema` tiene `.strict()`?
- ¿`updateProductoSchema` tiene `.strict()`?
- ¿`stockAdjustmentSchema` tiene `.strict()`?

### 3. POST /api/pedidos no acepta estados manipulados (CRIT-1)
Verificá que `createPedidoSchema` NO incluya `estado_pago` ni `estado_pedido` como campos permitidos. Si un cliente envía esos campos, el schema `.strict()` debe rechazarlos.

### 4. Stock acumula requerimientos incluyendo componentes de promo (CRIT-2)
Verificá en `backend/src/api/models/pedido.model.js` función `createWithTransaction`:
- ¿Usa un `Map` para acumular requerimientos por `producto_id`?
- ¿Para productos tipo `promo`, carga componentes de `combo_producto` y acumula `componente.cantidad * item.cantidad`?
- ¿Para productos normales, acumula `item.cantidad`?
- ¿Bloquea con `SELECT FOR UPDATE` los productos requeridos (no solo los items directos)?
- ¿Valida stock total acumulado contra stock disponible?

### 5. No puede quedar stock negativo (CRIT-2)
Verificá en `createWithTransaction`:
- ¿El `UPDATE` de descuento usa `WHERE stock_actual >= ?` como defensa?
- ¿Verifica `affectedRows` y lanza error si es 0?

### 6. Promos descuentan componentes, no stock propio (CRIT-2)
Verificá en `createWithTransaction`:
- ¿Para productos tipo `promo`, el descuento se aplica a los componentes de `combo_producto`?
- ¿El producto promo en sí NO se descuenta (no aparece en el Map de requerimientos)?

### 7. cancelWithTransaction devuelve affectedRows correcto (IMP-2)
Verificá en `backend/src/api/models/pedido.model.js` función `cancelWithTransaction`:
- ¿Guarda el resultado del `UPDATE pedido SET estado_pedido = 'cancelado'` en una variable?
- ¿Devuelve `updateResult.affectedRows` (no `pedRows.affectedRows` del SELECT)?

### 8. configuracion_tienda.estado bloquea pedidos (CRIT-4)
Verificá en `createWithTransaction`:
- ¿Al inicio de la transacción, consulta `configuracion_tienda` con `FOR UPDATE`?
- ¿Si `estado !== 'abierta'`, lanza error?
- ¿El error se propaga al controller como `ValidationError` con mensaje claro?

### 9. Protección CSRF mínima por Origin/Referer (CRIT-3)
Verificá:
- ¿Existe `backend/src/api/middlewares/origin.middleware.js`?
- ¿Exporta `requireTrustedOrigin`?
- ¿Verifica `Origin` header contra `environments.frontendUrl`?
- ¿Si no hay `Origin`, verifica `Referer`?
- ¿Se aplica a rutas admin mutantes (POST/PUT/PATCH/DELETE) en `pedido.routes.js` y `producto.routes.js`?

### 10. COOKIE_NAME configurable (IMP-6)
Verificá:
- ¿`backend/src/api/config/environments.js` tiene `cookie.name` desde `process.env.COOKIE_NAME`?
- ¿`auth.controller.js` usa `environments.cookie.name` para setear y limpiar la cookie?
- ¿`admin.middleware.js` usa `environments.cookie.name` para leer la cookie?

### 11. FRONTEND_URL requerido en producción (IMP-5)
Verificá en `environments.js`:
- ¿`FRONTEND_URL` está en el array de `requeridos` para producción?
- ¿Si falta, lanza error al arrancar?

### 12. Login no revela cuenta inactiva (IMP-4)
Verificá en `auth.controller.js` función `login`:
- ¿Si `!usuario.activo`, lanza `AuthError('Credenciales inválidas')` (no `'Cuenta inactiva'`)?
- ¿El mensaje es idéntico para email inexistente, password incorrecta y cuenta inactiva?

### 13. Telefono WhatsApp normalizado mejorado (IMP-3)
Verificá en `pedido.model.js` función `normalizarTelefono`:
- ¿Quita todos los no-dígitos?
- ¿Si empieza con `549`, conserva?
- ¿Si empieza con `54` sin `9`, transforma a `549...`?
- ¿Si empieza con `0`, quita el `0`?
- ¿Para números argentinos locales (8-12 dígitos), prefija `549`?
- ¿Si no puede normalizar, devuelve `null`?

### 14. Transferencia sin comprobante bloqueada o documentada (IMP-1)
Verificá en `pedido.controller.js` función `crear`:
- ¿Si `metodo_pago === 'transferencia'`, lanza `ValidationError` con mensaje claro?
- ¿El mensaje indica que transferencia online requiere comprobante?
- ¿La ruta de caja (`crearCaja`) permite transferencia sin comprobante (porque el admin verifica manualmente)?

## Formato de respuesta esperado

Por cada punto (1-14), respondé:

```
[PUNTO-N] ✅ CORREGIDO / ❌ NO CORREGIDO / ⚠️ PARCIAL
Archivo: path/to/file.js
Líneas: X-Y
Evidencia: [código relevante o explicación]
```

Al final, un resumen:

```
## Resumen

Puntos corregidos: X/14
Puntos no corregidos: Y/14
Puntos parciales: Z/14

### ¿El backend está listo para avanzar a B6?
[SÍ / NO]

### Si NO, qué falta:
- [Lista de fixes pendientes]

### Si SÍ, recomendaciones antes de B6:
- [Lista de mejoras opcionales]
```

## Veredicto final

Decime si ya puedo avanzar a B6 — Caja, Cocina, Comprobantes y Reportes.
