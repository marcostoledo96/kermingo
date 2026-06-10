# Flujos End-to-End — Kermingo

> Leé este archivo cuando necesites entender cómo es el recorrido completo
> de un usuario o administrador en el sistema.

---

## Índice

1. [Compra online](#1-compra-online)
2. [Caja rápida](#2-caja-rápida)
3. [Cancelación con reposición](#3-cancelación-con-reposición)
4. [Edición de caja](#4-edición-de-caja)
5. [Configuración de tienda](#5-configuración-de-tienda)
6. [Flujo de cocina](#6-flujo-de-cocina)
7. [Verificación de pago](#7-verificación-de-pago)

---

## 1. Compra online

```
[Visitante]
    │
    ├── GET /api/configuracion-tienda
    │   └── Verifica: ¿estado === 'abierta'? Si no, muestra mensaje.
    │
    ├── GET /api/productos
    │   └── Carga la carta filtrada por categoría.
    │
    ├── Agrega items al carrito (localStorage)
    │   └── Si es promo, se acumulan las cantidades necesarias.
    │
    ├── POST /api/pedidos
    │   ├── Body: { nombre_cliente, items, metodo_pago: 'efectivo' }
    │   ├── Backend valida stock con transacción.
    │   ├── Si stock insuficiente → 409 (InsufficientStockError).
    │   ├── Si tienda cerrada → 400 (ValidationError).
    │   ├── Si OK → descuenta stock, genera KMG-XXXX y token.
    │   └── Response: { ok, data: { pedido }, message }
    │
    └── GET /api/pedidos/seguimiento/:token
        └── Muestra estado del pedido y items.
```

**Regla:** Los pedidos online aceptan `metodo_pago: 'efectivo'` (JSON) o `'transferencia'` (multipart con `comprobante`). Si el visitante elige transferencia sin archivo adjunto, el backend responde 400. Si elige efectivo con archivo, también 400. Ver `CORE.md` sección 2 para la state machine de pago.

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
    │   ├── Puede setear estado_pago='pagado' directamente.
    │   ├── Puede setear estado_pedido inicial (recibido, en_preparacion, listo, entregado).
    │   ├── Backend valida stock con transacción.
    │   └── Crea pedido con origen='caja'.
    │
    └── PATCH /api/admin/pedidos/:id/pago
        └── Marca como pagado si fue efectivo y ya se cobró.
```

**Ventaja:** El admin puede crear un pedido ya pagado y con estado avanzado, ideal para ventas presenciales.

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

## 5. Configuración de tienda

```
[Admin logueado]
    │
    ├── GET /api/admin/configuracion-tienda
    │   └── Muestra config completa (estado, mensaje, hora de cena).
    │
    └── PUT /api/admin/configuracion-tienda
        ├── Body: { estado: 'abierta'|'cerrada'|'demo', mensaje_publico?, cena_habilitada_desde? }
        ├── Requiere: requireAdmin + requireTrustedOrigin
        └── Actualiza el singleton id=1.
```

**Estados:**

| Estado | Efecto |
|---|---|
| `'abierta'` | Se pueden crear pedidos (online y caja) |
| `'cerrada'` | `createWithTransaction` lanza error |
| `'demo'` | Reservado para frontend sin crear pedidos reales |

El mensaje público se muestra en el frontend cuando la tienda está cerrada.

---

## 6. Flujo de cocina

```
[Admin logueado en vista cocina]
    │
    ├── GET /api/admin/cocina/pedidos
    │   └── Pedidos en estados: recibido, en_preparacion, listo.
    │       Ordenados por prioridad (recibido primero).
    │
    ├── PATCH /api/admin/cocina/pedidos/:id/estado
    │   ├── Body: { estado_pedido: 'en_preparacion'|'listo'|'entregado' }
    │   ├── Valida transición: recibido → en_preparacion → listo → entregado
    │   └── Si transición inválida → 400 (ValidationError)
    │
    └── Cockpit visual: cards con estado, nombre, items.
```

La cocina usa la misma state machine que el flujo de admin normal, pero con una vista optimizada.

---

## 7. Verificación de pago

```
[Admin logueado]
    │
    ├── GET /api/admin/pedidos?estado_pago=pendiente
    │   └── Lista pedidos con pago pendiente.
    │
    ├── PATCH /api/admin/pedidos/:id/pago
    │   ├── Body: { estado_pago: 'pagado'|'rechazado' }
    │   └── Marca el pago como confirmado o rechazado.
    │
    └── Nota: Cambiar estado_pago NO afecta el stock.
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
- `GET /api/admin/pedidos/:id/comprobante` devuelve metadatos seguros del archivo (no proxea bytes).
- `PATCH /api/admin/pedidos/:id/pago` permite `comprobante_subido → pagado|rechazado`.
- Caja rápida puede crear transferencias sin comprobante (estado `pagado` directo).