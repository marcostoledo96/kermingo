# Lógica de Negocio — Kermingo

> Leé este archivo cuando trabajes en reglas de pedidos, stock, combos, cancelaciones,
> transiciones de estado o numeración.

---

## Índice

1. [State machine de pedido](#1-state-machine-de-pedido)
2. [State machine de pago](#2-state-machine-de-pago)
3. [Transacciones de stock](#3-transacciones-de-stock)
4. [Combos/promos](#4-combospromos)
5. [Numeración KMG-XXXX](#5-numeración-kmg-xxxx)
6. [Normalización de teléfono](#6-normalización-de-teléfono)
7. [Pedidos de caja vs online](#7-pedidos-de-caja-vs-online)
8. [Cancelación con reposición](#8-cancelación-con-reposición)
9. [Configuración de tienda (singleton)](#9-configuración-de-tienda-singleton)
10. [Validación de tienda abierta](#10-validación-de-tienda-abierta)

---

## 1. State machine de pedido

```
recibido ──→ en_preparacion ──→ listo ──→ entregado
   │              │    ↑            │    ↑
   │              │    │            │    │
   └──→ listo ────┘    └────────────┘
   (directo)        (retroceso)  (retroceso)
     ↓
 cancelado  (solo desde 'recibido' o 'en_preparacion')
```

**Transiciones válidas** (definidas en `pedido.model.js` → `TRANSICIONES_VALIDAS`):

| Estado actual | Puede pasar a | Propósito |
|---|---|---|
| `recibido` | `en_preparacion`, `listo` | Empezar preparación o marcar directo (productos ya listos) |
| `en_preparacion` | `recibido`, `listo` | Retroceder por error o avanzar a listo |
| `listo` | `en_preparacion`, `entregado` | Retroceder por error o marcar entregado |
| `entregado` | *(ninguna — estado terminal)* | No se puede deshacer |

**Reglas:**
- `entregado` es terminal: no se puede retroceder ni cambiar.
- Se permite retroceder un paso (`en_preparacion → recibido`, `listo → en_preparacion`) para corregir errores.
- Se permite saltar de `recibido → listo` directamente para productos que no necesitan preparación (ej: medialunas, bebidas).
- No se permite `recibido → entregado` (salto doble).
- No se permite `en_preparacion → entregado` (salto doble).
- Same-state transitions siempre son inválidas.
- `cancelado` solo desde `recibido` o `en_preparacion` (enforce en `cancelWithTransaction`).
- La cocina usa la misma state machine vía `cocina.controller.js` → `updateEstadoPedido`.
- **B7 (payment gate):** La cocina (`findKitchenPedidos`) solo lista pedidos en `en_preparacion` y `listo`. Los pedidos online comienzan en `recibido` y deben ser confirmados por un admin desde la solapa "Pendiente de confirmación" en `/admin/pedidos` antes de aparecer en cocina. Los pedidos de caja rápida comienzan en `en_preparacion` y aparecen directamente en cocina.
- `updateEstadoPedido` es atómico:
  1. Abre transacción (`conn.beginTransaction`).
  2. Bloquea el pedido con `SELECT ... FOR UPDATE`.
  3. Valida la transición bajo lock.
  4. Actualiza el estado dentro de la transacción.
  5. Hace commit o rollback según resultado.

---

## 2. State machine de pago

La máquina de estados de pago es **method-aware** (distintas transiciones según `metodo_pago`). Se define en `pedido.model.js` → `transitionsByMethod`.

```
efectivo:
  pendiente → pagado          (directo, pago en mano)
  pagado → (terminal)

transferencia:
  pendiente → pagado | comprobante_subido
  comprobante_subido → pagado | rechazado
  rechazado → pendiente | comprobante_subido
  pagado → (terminal)
```

**Estados del `enum estado_pago`:**

| Estado | Significado |
|---|---|
| `pendiente` | Recién creado, sin pago |
| `comprobante_subido` | Se subió comprobante de transferencia a Google Drive (B6.3 implementado) |
| `pagado` | Pago confirmado (efectivo o transferencia verificada) |
| `rechazado` | Comprobante rechazado por admin — puede re-subirse otro comprobante |

**Exports del modelo:**

| Export | Tipo | Descripción |
|---|---|---|
| `transitionsByMethod` | Object | Map method-aware: keys `efectivo`, `transferencia`. Cada key mapea estado → array de estados permitidos. |
| `PAGO_TRANSITIONS` | Object | Backward-compatible. Merge genérico de todos los métodos. Usado por tests para key enumeration. |
| `validatePaymentTransition(from, to, metodoPago?)` | Function | Valida transición de pago. Si `metodoPago` se provee, usa `transitionsByMethod[metodoPago]`. Si no, usa `PAGO_TRANSITIONS` (merge genérico). Retorna `true` para same-state (`from === to`) — el rechazo de no-cambio está en `updateEstadoPago` (línea 368-371). |

**Reglas:**
- Pedidos online con `metodo_pago: 'transferencia'` requieren archivo comprobante (multipart/form-data).
- Cualquier intento de usar efectivo en el endpoint online se rechaza con 400. Efectivo solo está disponible desde caja rápida (admin).
- El archivo se sube a Google Drive ANTES de la transacción DB. Si Drive falla → 503, no se crea pedido.
- Si la transacción DB falla después del upload exitoso, el archivo queda huérfano en Drive (aceptable para MVP).
- Caja rápida puede crear pedido con `estado_pago: 'pagado'` directamente, sin comprobante.
- `updateEstadoPago` bloquea cambios de pago en pedidos `cancelado` (retorna `-2`).
- `updateEstadoPago` rechaza same-state (`from === to`) con retorno `-1` (no idempotente como PATCH).

---

## 3. Transacciones de stock

Todas las operaciones de stock se hacen dentro de transacciones MySQL con `getConnection()` + `beginTransaction()`.

### Crear pedido (`createWithTransaction`)

1. Verifica `configuracion_tienda.estado = 'abierta'` con `FOR UPDATE`.
2. Expande items: si es promo, busca componentes en `combo_producto` y acumula requerimientos.
3. Bloquea productos con `SELECT ... FOR UPDATE` en orden determinístico (IDs ordenados).
4. Valida stock disponible vs. requerido.
5. `INSERT pedido` + `INSERT pedido_detalle` (snapshot de nombre y precio).
6. `UPDATE producto SET stock_actual = stock_actual - ? WHERE id = ? AND stock_limitado = 1 AND stock_actual >= ?` (defensivo).
7. Si `affectedRows === 0` en algún UPDATE de stock → lanza error → rollback.

### Cancelar pedido (`cancelWithTransaction`)

1. Verifica estado (`recibido` o `en_preparacion`).
2. Bloquea pedido con `FOR UPDATE`.
3. Repone stock acumulando cantidades (expandiendo combos).
4. `UPDATE pedido SET estado_pedido = 'cancelado'`.
5. Commit.

### Editar pedido (PATCH pago)

- **No toca stock.** Cambiar `estado_pago` no modifica inventario.

### Editar pedido de caja (`editWithTransaction`)

`PUT /api/admin/pedidos/:id` — edición transaccional con reconciliación de stock.

**Restricciones:**
- Solo pedidos con `origen = 'caja'`. Retorna `-2` si el pedido no es de caja.
- Pedidos `cancelado` o `entregado` no se pueden editar. Retorna `-1`.
- Si `data.items` no está presente, solo se editan metadatos (nombre, mesa, teléfono, observaciones, metodo_pago) sin tocar stock.

**Reconciliación de stock (cuando `data.items` está presente):**
1. Bloquea pedido con `FOR UPDATE`.
2. Lee detalle actual y calcula reposiciones (stock a devolver por items viejos, expandiendo combos).
3. Expande nuevo set de items y calcula nuevos requerimientos.
4. Bloquea productos con `FOR UPDATE` en orden determinístico (IDs ordenados, previene deadlocks).
5. Valida stock disponible = `stock_actual + reposiciones - nuevas requeridas` ≥ 0 para cada producto.
6. Aplica delta neto: `UPDATE producto SET stock_actual = stock_actual + (restore - deduct) WHERE id = ? AND stock_limitado = 1`.
7. Recalcula total, borra detalle anterior, inserta nuevo detalle.
8. Updates de campos del pedido (nombre, mesa, teléfono, observaciones, metodo_pago).

**Coerción de `estado_pago` al cambiar `metodo_pago`:**
- Si el nuevo `metodo_pago` no permite el `estado_pago` actual (ej. cambiar a `efectivo` con estado `comprobante_subido`), coacciona a `pendiente`.
- Si el estado actual es `pagado` (terminal), se mantiene independientemente del cambio de método.

---

## 4. Combos/promos

Los productos de tipo `'promo'` tienen `stock_limitado = 0` y `stock_actual = NULL`. Su disponibilidad depende del stock de sus componentes.

**Expansión de combo:**

| Tabla | Significado |
|---|---|
| `combo_producto` | Relación `combo_id → producto_id` con `cantidad` |

Ejemplo del seed: "Combo merienda" (id 23) = 3 medialunas (id 10, cantidad 3) + 1 café (id 21, cantidad 1).

Al crear un pedido con una promo:
1. Se buscan los componentes en `combo_producto`.
2. Se acumula la cantidad requerida por componente: `comp.cantidad × item.cantidad`.
3. Se valida el stock de los componentes, no de la promo.

---

## 5. Numeración KMG-XXXX

Cada pedido recibe un número legible al insertarse:

```javascript
function formatearNumero(insertId) {
  return `KMG-${String(insertId).padStart(4, '0')}`;
}
```

- Se genera después del `INSERT` usando el `insertId`.
- Se hace `UPDATE pedido SET numero = ? WHERE id = ?` dentro de la misma transacción.
- Formato: `KMG-0001`, `KMG-0002`, etc.

---

## 6. Normalización de teléfono

La función `normalizarTelefono(raw)` en `pedido.model.js`:

1. Elimina no-dígitos.
2. Si empieza con `549` → ya está.
3. Si empieza con `54` pero no con `549` → agrega `9` → `549...`.
4. Si empieza con `0` → quita el `0`.
5. Si tiene 8-12 dígitos → prepend `549`.
6. Guarda en `telefono_whatsapp` para enlace directo a WhatsApp.

---

## 7. Pedidos de caja vs online

| Aspecto | Online (`origen='online'`) | Caja (`origen='caja'`) |
|---|---|---|
| Endpoint | `POST /api/pedidos` | `POST /api/admin/pedidos/caja` |
| Auth | No | `requireAdmin` |
| `metodo_pago` | Solo `'transferencia'` | `'efectivo'` o `'transferencia'` |
| `estado_pago` inicial | Siempre `'comprobante_subido'` tras upload válido | Puede ser `'pendiente'` o `'pagado'` |
| `estado_pedido` inicial | **`'recibido'` (gate de verificación de pago)** | **`'en_preparacion'`** (caja bypassa el gate). El schema acepta override explícito si se necesita otro estado. |
| Aparece en cocina | Solo después de confirmar pago desde admin pedidos | Directamente al crearse |
| Editable | No (solo seguimiento) | Sí (admin puede editar) |

---

## 8. Cancelación con reposición

Solo pedidos en estado `recibido` o `en_preparacion` pueden cancelarse.

Proceso (`cancelWithTransaction`):
1. Verifica estado válido.
2. Obtiene detalles del pedido.
3. Expande combos: por cada item tipo promo, busca sus componentes y acumula cantidades a reponer.
4. Bloquea productos con `FOR UPDATE` en orden determinístico.
5. Reponer: `UPDATE producto SET stock_actual = stock_actual + ? WHERE id = ? AND stock_limitado = 1`.
6. Omite productos con `stock_limitado = 0` (ilimitados).
7. `UPDATE pedido SET estado_pedido = 'cancelado'`.
8. Commit.

---

## 9. Configuración de tienda (singleton)

La tabla `configuracion_tienda` tiene un solo registro: `id = 1`.

| Campo | Tipo | Valores |
|---|---|---|---|
| `estado` | ENUM | `'abierta'`, `'cerrada'`, `'demo'` |
| `mensaje_publico` | TEXT | Mensaje que se muestra cuando la tienda está cerrada |
| `cena_habilitada_desde` | TIME | Hora desde la que se habilita la cena (o `NULL`) |
| `categoria_default` | ENUM | `'merienda'`, `'cena'` — pestaña inicial del menú público (`'merienda'` por defecto) |

- `'abierta'`: pedidos reales se crean normalmente.
- `'cerrada'`: `createWithTransaction` lanza error.
- `'demo'`: (reservado) el frontend puede funcionar sin crear pedidos reales.

---

## 10. Estado de disponibilidad de productos

Cada producto tiene dos flags booleanos que determinan su visibilidad y comprabilidad:

| Flag | Default | Significado |
|---|---|---|
| `activo` | `1` | Si `0`, el producto está desactivado (oculto en menú público) |
| `disponible` | `1` | Si `0` con `activo=1`, el producto está "Todavía no disponible" (visible en menú público pero no comprable) |

**Estados derivados (usados por admin `GET /api/admin/productos?estado=`):**

| Filtro | SQL conditions |
|---|---|
| `activo` (default) | `activo=1 AND disponible=1 AND (stock_limitado=0 OR stock_actual IS NULL OR stock_actual > 0)` |
| `todos` | Sin WHERE de estado (todos los productos) |
| `desactivado` | `activo=0` |
| `agotado` | `activo=1 AND disponible=1 AND stock_limitado=1 AND stock_actual=0` |
| `todavia_no_disponible` | `activo=1 AND disponible=0` |

**Reglas de pedido:** `createWithTransaction` rechaza cualquier producto con `activo=0` o `disponible=0` dentro de la transacción, incluso si el frontend fue bypasseado. Combos/promos también validan disponibilidad de sus componentes.

**Ordenamiento:** Todas las listas de productos (públicas y admin) se ordenan por `orden ASC, id ASC`. El admin puede reordenar vía `PATCH /api/admin/productos/orden`.

---

## 11. Validación de tienda abierta

Existen dos puntos de validación de tienda abierta:

### 10a. Preflight barato (B6.3.1)

Antes de cualquier upload a Drive, el controller `crear` llama a `assertStoreOpen(pool)`:

```sql
SELECT estado FROM configuracion_tienda WHERE id = 1
```

Sin `FOR UPDATE`, sin transacción. Si `estado !== 'abierta'`, lanza `ValidationError('La tienda esta cerrada')` → 400. Esto evita archivos huérfanos en Drive cuando la tienda está cerrada.

### 10b. Validación transaccional (dentro de createWithTransaction)

Dentro de `createWithTransaction`, se hace con lock:

```sql
SELECT estado FROM configuracion_tienda WHERE id = 1 FOR UPDATE
```

Si `estado !== 'abierta'`, se lanza error → rollback. Esta validación protege contra cambios de estado concurrentes durante la creación del pedido.

**Gotcha:** El seed inserta `estado='cerrada'`. Los tests de integración deben abrir la tienda manualmente o mockear.

Ver `GOTCHAS.md` para más detalles.
