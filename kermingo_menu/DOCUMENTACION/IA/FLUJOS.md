# Flujos End-to-End — Kermingo

> Leé este archivo cuando necesites entender cómo es el recorrido completo
> de un usuario o administrador en el sistema.

---

## Índice

1. [Compra online](#1-compra-online)
2. [Caja rápida](#2-caja-rápida)
3. [Cancelación con reposición](#3-cancelación-con-reposición)
4. [Edición de caja](#4-edición-de-caja)
5. [Administración de productos](#5-administración-de-productos)
6. [Configuración de tienda](#6-configuración-de-tienda)
7. [Flujo de cocina](#7-flujo-de-cocina)
8. [Verificación de pago](#8-verificación-de-pago)

---

## 1. Compra online

```
[Visitante]
    │
    ├── GET /api/configuracion-tienda (en paralelo con productos)
    │   ├── estado='abierta' → flujo normal
    │   ├── estado='cerrada' → muestra mensaje_publico, deshabilita compras
    │   ├── estado='demo' → muestra aviso, deshabilita compras
    │   ├── loading → skeleton
    │   └── error → mensaje de retry
    │
    ├── GET /api/productos
    │   └── Carga la carta filtrada por categoría.
    │
    ├── Agrega items al carrito (localStorage)
    │   └── Si es promo, se acumulan las cantidades necesarias.
    │
    ├── CheckoutScreen: validación previa al envío
    │   ├── Vuelve a verificar estado de la tienda (config)
    │   ├── Si cerrada/demo → bloquea confirmación
    │   ├── Valida comprobante: solo JPG/PNG/WEBP/PDF, máx 5 MB
    │   └── HEIC rechazado antes de setear receipt
    │
    ├── POST /api/pedidos
    │   ├── multipart/form-data: { nombre_cliente, items, metodo_pago: 'transferencia', comprobante }
    │   ├── Backend valida stock con transacción.
    │   ├── Si stock insuficiente → 409 (InsufficientStockError).
    │   ├── Si tienda cerrada → 400 (ValidationError).
    │   ├── Si OK → descuenta stock, genera KMG-XXXX y token.
    │   ├── **B7:** El pedido se crea con `estado_pedido='recibido'` (gate de verificación de pago).
    │   └── Response: { ok, data: { pedido }, message }
    │
    ├── [Admin] Confirma pago desde solapa "Pendiente de confirmación" en /admin/pedidos
    │   ├── Ejecuta `PATCH /api/admin/pedidos/:id/pago {estado_pago: 'pagado'}`
    │   ├── Si 200 → ejecuta `PATCH /api/admin/pedidos/:id/estado {estado_pedido: 'en_preparacion'}`
    │   └── El pedido aparece en cocina (ver flujo de cocina).
    │
    └── GET /api/pedidos/seguimiento/:token
        ├── Si `estado_pedido='recibido'` y `estado_pago!='pagado'` → muestra "Estamos comprobando tu pago"
        └── Muestra estado del pedido y items.

**Regla:** Los pedidos online aceptan únicamente `metodo_pago: 'transferencia'` con `comprobante` adjunto. Si falta el archivo, el backend responde 400. Si el visitante intenta `efectivo`, también responde 400; efectivo queda reservado para caja rápida (admin). Ver `CORE.md` sección 2 para la state machine de pago.

---

## 2. Caja rápida

```
[Admin logueado]
    │
    ├── POST /api/auth/login
    │   └── Cookie httpOnly con JWT.
    │
    ├── POST /api/admin/pedidos/caja
    │   ├── Body: { nombre_cliente, items, metodo_pago, estado_pago?, estado_pedido? }
    │   ├── Requiere: requireAdmin + requireTrustedOrigin
    │   ├── Default estado_pago según método:
    │   │   ├── efectivo sin estado_pago → 'pagado' (backend coercion)
    │   │   └── transferencia sin estado_pago → 'pendiente'
    │   ├── **B7:** Default `estado_pedido='en_preparacion'` (caja bypassa el gate `recibido`)
    │   ├── Puede setear estado_pago='pagado' explícitamente.
    │   ├── Puede setear estado_pedido inicial (override del default).
    │   ├── Backend valida stock con transacción.
    │   └── Crea pedido con origen='caja'.
    │
    └── PATCH /api/admin/pedidos/:id/pago
        └── Marca como pagado si fue efectivo y ya se cobró.

**Ventaja:** El admin puede crear un pedido ya pagado y con estado avanzado, ideal para ventas presenciales. **Fix B7:** efectivo sin `estado_pago` explícito queda `'pagado'` por defecto en el backend; transferencia sin `estado_pago` queda `'pendiente'`. Los pedidos de caja saltan el gate `recibido` y van directo a `en_preparacion`.

---

## 3. Cancelación con reposición

```
[Admin logueado]
    │
    ├── PATCH /api/admin/pedidos/:id/cancelar
    │   ├── Requiere: requireAdmin + requireTrustedOrigin
    │   ├── Backend verifica: estado_pedido IN ('recibido', 'en_preparacion')
    │   ├── Si no cumple → 400 (ValidationError)
    │   ├── Obtiene items del pedido.
    │   ├── Expande combos → acumula cantidades a reponer.
    │   ├── SELECT ... FOR UPDATE (bloqueo determinístico por ID).
    │   ├── UPDATE producto SET stock_actual = stock_actual + ? WHERE stock_limitado = 1
    │   ├── UPDATE pedido SET estado_pedido = 'cancelado'
    │   └── Commit.
```

**Qué se repone:** Todo el stock deducido al crear el pedido, incluyendo los componentes de las promos.

**Qué NO se repone:** Productos con `stock_limitado = 0` (ilimitados).

---

## 4. Edición de caja

Los pedidos creados desde caja (`origen='caja'`) son editables por el admin. Los pedidos online no se pueden editar, solo cancelar.

La edición de items (agregar/quitar productos) no está implementada todavía en el MVP actual. El admin puede:

1. Cambiar estado del pedido.
2. Cambiar estado de pago.
3. Cancelar el pedido (que repone stock).

---

## 5. Administración de productos

```
[Admin logueado en /admin/productos]
    │
    ├── Carga productos con GET /api/admin/productos?estado=activo
    │   ├── Default: solo activos y disponibles con stock.
    │   ├── Puede cambiar filtro a: todos, desactivado, agotado, todavia_no_disponible.
    │   └── Cada cambio refetchea del servidor.
    │
    ├── Productos agrupados por categoría (Merienda/Cena)
    │   └── Ordenados por orden ASC dentro de cada grupo.
    │
    ├── Reordenamiento (desktop):
    │   └── Arrastrar fila → PATCH /api/admin/productos/orden { ordenes: [{ id, orden }] }
    │
    ├── Reordenamiento (mobile/accesible):
    │   └── Botones up/down → mismo endpoint PATCH.
    │
    └── Crear/editar producto incluye campos orden y disponible (todavía no disponible).
```

---

## 6. Configuración de tienda

```
[Admin logueado]
    │
    ├── GET /api/admin/configuracion-tienda
    │   └── Muestra config completa (estado, mensaje, hora de cena, categoría default).
    │
    └── PUT /api/admin/configuracion-tienda
        ├── Body: { estado: 'abierta'|'cerrada'|'demo', mensaje_publico?, cena_habilitada_desde?, categoria_default? }
        ├── Requiere: requireAdmin + requireTrustedOrigin
        └── Actualiza el singleton id=1.
        └── categoria_default: 'merienda' | 'cena' — pestaña inicial del menú público.
```

**Estados:**

| Estado | Efecto |
|---|---|
| `'abierta'` | Se pueden crear pedidos (online y caja) |
| `'cerrada'` | `createWithTransaction` lanza error |
| `'demo'` | Reservado para frontend sin crear pedidos reales |

El mensaje público se muestra en el frontend cuando la tienda está cerrada.

---

## 7. Flujo de cocina

```
[Admin logueado en vista cocina]
    │
    ├── GET /api/admin/cocina/pedidos
    │   └── **B7:** Solo pedidos en estados: en_preparacion, listo.
    │       Los pedidos online en `recibido` deben ser confirmados desde la solapa
    │       "Pendiente de confirmación" en /admin/pedidos antes de aparecer aquí.
    │       Ordenados por prioridad (en_preparacion primero).
    │
    ├── PATCH /api/admin/cocina/pedidos/:id/estado
    │   ├── Body: { estado_pedido: 'en_preparacion'|'listo'|'entregado'|'recibido' }
    │   ├── Valida transición según TRANSICIONES_VALIDAS:
    │   │   recibido → en_preparacion|listo
    │   │   en_preparacion → recibido|listo
    │   │   listo → en_preparacion|entregado
    │   │   entregado → (ninguna, terminal)
    │   └── Si transición inválida → 400 (ValidationError)
    │
    └── Cockpit visual: cards con estado, nombre, items.
        Acciones por estado:
        - En preparación: "Volver a recibido" (→ recibido, desaparece de KDS) + "Marcar listo" (→ listo)
        - Listo: "Volver a preparación" (→ preparación) + "Entregado" (→ entregado, con confirmación)

> **B7:** Los pedidos en `recibido` ya no aparecen en el KDS de cocina. Se gestionan desde la solapa "Pendiente de confirmación" en `/admin/pedidos`.
```

La cocina usa la misma state machine que el flujo de admin normal, pero con una vista optimizada y transiciones ágiles que permiten retroceder un paso para corregir errores o marcar productos como listos directamente.

---

## 8. Verificación de pago

El admin gestiona la verificación de pago desde la solapa **"Pendiente de confirmación"** (`recibido`) en `/admin/pedidos`.

### Flujo de confirmación de pago (B7)

```
[Admin logueado en /admin/pedidos → tab "Pendiente de confirmación"]
    │
    ├── GET /api/admin/pedidos?estado_pedido=recibido&limit=24
    │   └── Lista pedidos online que esperan verificación de pago.
    │
    ├── Por cada pedido en recibido:
    │   ├── Si es transferencia: admin revisa comprobante (vía GET /comprobante)
    │   ├── Si es efectivo: admin verifica pago offline (sin comprobante)
    │   └── Admin hace clic en "Confirmar pago"
    │
    ├── Confirmación de pago (secuencia NO atómica):
    │   1. PATCH /api/admin/pedidos/:id/pago { estado_pago: 'pagado' }
    │      ├── Si 200 → continúa al paso 2
    │      └── Si falla → error en UI, NO se ejecuta paso 2
    │   2. PATCH /api/admin/pedidos/:id/estado { estado_pedido: 'en_preparacion' }
    │      ├── Si 200 → pedido aparece en cocina
    │      └── Si falla → queda en recibido+pagado, admin puede reintentar
    │
    └── Nota: Cambiar estado_pago NO afecta el stock.
```

> **Riesgo conocido:** La secuencia no es atómica si el paso 2 falla. El pedido puede quedar en `recibido`+`pagado`. El admin puede reintentar el state PATCH manualmente.

### Otros flujos de pago

```
PATCH /api/admin/pedidos/:id/pago (genérico, desde cualquier tab)
  ├── Body: { estado_pago: 'pagado'|'rechazado' }
  └── Marca el pago como confirmado o rechazado.
```

**Flujo de comprobantes (B6.3 implementado, B6.3.1 hardening):**

```
pendiente → comprobante_subido → pagado (o rechazado)
```

- `POST /api/pedidos` con `metodo_pago=transferencia` y archivo `comprobante` → `estado_pago=comprobante_subido`.
- **Preflight (B6.3.1):** Antes de subir a Drive, se verifica que la tienda esté abierta (`assertStoreOpen`). Si está cerrada → 400, sin intento de Drive.
- **Magic bytes (B6.3.1):** Después de Multer, se valida que el contenido real del archivo coincida con el MIME declarado (PDF/PNG/JPEG/WEBP). Si no coincide → 400.
- **Nombre interno seguro (B6.3.1):** El archivo se sube a Drive con nombre `${timestamp}-${uuid}-${sanitizedOriginal}`. `nombre_original` en DB preserva el nombre original.
- **Error tipado (B6.3.1):** Cualquier error de Drive → `DriveUploadError` → 503 `"Servicio de upload no disponible"`.
- El archivo se sube a Google Drive vía `drive.service.js` usando OAuth de usuario con refresh token.
- **B7 decisión de diseño:** El endpoint devuelve metadatos (`nombre_original`, `mime_type`, `tamanio_bytes`, `url_publica`). `drive_id` no se expone (B7 fix P2-5). El frontend muestra metadata + botón "Abrir en Drive" si `url_publica` existe. El acceso depende de los permisos de Drive del usuario OAuth que subió el archivo. Si en el futuro se necesita que cualquier admin vea el archivo sin permisos Drive directos, se implementará un proxy autenticado en el backend.
- `GET /api/admin/pedidos/:id/comprobante` devuelve metadatos seguros del archivo (no proxea bytes).
- `PATCH /api/admin/pedidos/:id/pago` permite `comprobante_subido → pagado|rechazado`.
- Caja rápida puede crear transferencias sin comprobante (estado `pagado` directo).
