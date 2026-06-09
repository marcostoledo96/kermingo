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
recibido → en_preparacion → listo → entregado
    ↓
cancelado  (solo desde 'recibido' o 'en_preparacion')
```

**Transiciones válidas** (definidas en `pedido.model.js` → `TRANSICIONES_VALIDAS`):

| Estado actual | Puede pasar a |
|---|---|
| `recibido` | `en_preparacion` |
| `en_preparacion` | `listo` |
| `listo` | `entregado` |

**Reglas:**
- No se puede retroceder estados.
- No se puede pasar de `entregado` a nada.
- `cancelado` solo desde `recibido` o `en_preparacion` (enforce en `cancelWithTransaction`).
- La cocina usa la misma state machine vía `cocina.controller.js` → `updateEstadoPedido`.
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
| `comprobante_subido` | Se subió comprobante de transferencia (sin implementar completamente — B6.3) |
| `pagado` | Pago confirmado (efectivo o transferencia verificada) |
| `rechazado` | Comprobante rechazado (sin flujo completo todavía — B6.3) |

**Exports del modelo:**

| Export | Tipo | Descripción |
|---|---|---|
| `transitionsByMethod` | Object | Map method-aware: keys `efectivo`, `transferencia`. Cada key mapea estado → array de estados permitidos. |
| `PAGO_TRANSITIONS` | Object | Backward-compatible. Merge genérico de todos los métodos. Usado por tests para key enumeration. |
| `validatePaymentTransition(from, to, metodoPago?)` | Function | Valida transición de pago. Si `metodoPago` se provee, usa `transitionsByMethod[metodoPago]`. Si no, usa `PAGO_TRANSITIONS` (merge genérico). Retorna `true` para same-state (`from === to`) — el rechazo de no-cambio está en `updateEstadoPago` (línea 368-371). |

**Reglas:**
- Pedidos online solo permiten `metodo_pago: 'efectivo'` (transferencia bloqueada en controller).
- Caja rápida puede crear pedido con `estado_pago: 'pagado'` directamente.
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
| `metodo_pago` | Solo `'efectivo'` | `'efectivo'` o `'transferencia'` |
| `estado_pago` inicial | Siempre `'pendiente'` | Puede ser `'pendiente'` o `'pagado'` |
| `estado_pedido` inicial | Siempre `'recibido'` | Puede ser `'recibido'`, `'en_preparacion'`, `'listo'` o `'entregado'` |
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
|---|---|---|
| `estado` | ENUM | `'abierta'`, `'cerrada'`, `'demo'` |
| `mensaje_publico` | TEXT | Mensaje que se muestra cuando la tienda está cerrada |
| `cena_habilitada_desde` | TIME | Hora desde la que se habilita la cena (o `NULL`) |

- `'abierta'`: pedidos reales se crean normalmente.
- `'cerrada'`: `createWithTransaction` lanza error.
- `'demo'`: (reservado) el frontend puede funcionar sin crear pedidos reales.

---

## 10. Validación de tienda abierta

Dentro de `createWithTransaction`, se hace:

```sql
SELECT estado FROM configuracion_tienda WHERE id = 1 FOR UPDATE
```

Si `estado !== 'abierta'`, se lanza error → rollback.

**Gotcha:** El seed inserta `estado='cerrada'`. Los tests de integración deben abrir la tienda manualmente o mockear.

Ver `GOTCHAS.md` para más detalles.