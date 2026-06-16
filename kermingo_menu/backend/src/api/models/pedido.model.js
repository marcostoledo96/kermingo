import crypto from 'crypto';
import { createArchivo } from './archivo.model.js';
import { ValidationError } from '../utils/errors.js';

//
// ── Helpers ────────────────────────────────────────────────────────
//

function normalizarTelefono(raw) {
  if (!raw) return null;
  let t = raw.replace(/[^\d]/g, '');
  if (!t) return null;
  if (t.startsWith('549')) return t;
  if (t.startsWith('54') && t.length > 2) {
    const resto = t.slice(2);
    if (resto.startsWith('9')) return t;
    return `549${resto}`;
  }
  if (t.startsWith('0')) t = t.slice(1);
  if (t.length >= 8 && t.length <= 12) return `549${t}`;
  return null;
}

function generarToken() {
  return crypto.randomBytes(16).toString('hex');
}

function formatearNumero(insertId) {
  return `KMG-${String(insertId).padStart(4, '0')}`;
}

/**
 * Cheap, non-locking preflight check that the store is open.
 * Throws ValidationError if store is closed or config row is missing.
 * @param {import('mysql2/promise').Pool} pool
 * @returns {Promise<void>}
 */
export async function assertStoreOpen(pool) {
  const [[config]] = await pool.query(
    'SELECT estado FROM configuracion_tienda WHERE id = 1'
  );
  if (!config || config.estado !== 'abierta') {
    throw new ValidationError('La tienda esta cerrada');
  }
}

export const TRANSICIONES_VALIDAS = {
  recibido: ['en_preparacion', 'listo'],
  en_preparacion: ['recibido', 'listo'],
  listo: ['en_preparacion', 'entregado'],
  entregado: [],
};

export function transicionEstadoValida(actual, siguiente) {
  if (actual === siguiente) return false;
  return (TRANSICIONES_VALIDAS[actual] || []).includes(siguiente);
}

/**
 * Payment-state machine for admin caja follow-up, keyed by metodo_pago.
 * efectivo: pendiente -> pagado; pagado terminal.
 * transferencia: pendiente -> pagado|comprobante_subido;
 *   comprobante_subido -> pagado|rechazado;
 *   rechazado -> pendiente|comprobante_subido; pagado terminal.
 */
export const transitionsByMethod = {
  efectivo: {
    pendiente: ['pagado'],
    pagado: [], // terminal
  },
  transferencia: {
    pendiente: ['pagado', 'comprobante_subido'],
    comprobante_subido: ['pagado', 'rechazado'],
    rechazado: ['pendiente', 'comprobante_subido'],
    pagado: [], // terminal
  },
};

/**
 * Backward-compatible generic transition map (merges all methods).
 * Used only by tests that import PAGO_TRANSITIONS for key enumeration.
 */
export const PAGO_TRANSITIONS = {
  pendiente: ['pagado', 'comprobante_subido'],
  comprobante_subido: ['pagado', 'rechazado'],
  rechazado: ['pendiente', 'comprobante_subido'],
  pagado: [],
};

/**
 * Validates an admin payment-state transition, method-aware.
 * @param {string} from - current estado_pago
 * @param {string} to - requested estado_pago
 * @param {string} [metodoPago] - 'efectivo' | 'transferencia' (optional for backward compat)
 * @returns {boolean}
 */
export function validatePaymentTransition(from, to, metodoPago) {
  if (from === to) return true;
  if (metodoPago && transitionsByMethod[metodoPago]) {
    return (transitionsByMethod[metodoPago][from] || []).includes(to);
  }
  // Backward compat: check all methods
  return (PAGO_TRANSITIONS[from] || []).includes(to);
}

export async function createWithTransaction(pool, data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 0. Verificar configuracion_tienda
    const [[config]] = await conn.query(
      'SELECT estado FROM configuracion_tienda WHERE id = 1 FOR UPDATE'
    );
    if (!config || config.estado !== 'abierta') {
      throw new Error('La tienda no está abierta para pedidos');
    }

    // 1. Expandir items y acumular requerimientos de stock
    const requerimientos = new Map();
    const itemsExpandidos = [];

    for (const item of data.items) {
      const [prodRows] = await conn.query(
        'SELECT id, nombre, precio, tipo, stock_limitado, stock_actual FROM producto WHERE id = ? AND activo = 1',
        [item.producto_id]
      );
      const producto = prodRows[0];
      if (!producto) throw new Error(`Producto ${item.producto_id} no encontrado o inactivo`);

      itemsExpandidos.push({
        producto_id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        tipo: producto.tipo,
        cantidad: item.cantidad,
      });

      if (producto.tipo === 'promo') {
        const [compRows] = await conn.query(
          'SELECT producto_id, cantidad FROM combo_producto WHERE combo_id = ?',
          [item.producto_id]
        );
        if (compRows.length === 0) {
          throw new Error(`La promo "${producto.nombre}" no tiene componentes configurados en combo_producto`);
        }
        for (const comp of compRows) {
          const total = comp.cantidad * item.cantidad;
          requerimientos.set(comp.producto_id, (requerimientos.get(comp.producto_id) || 0) + total);
        }
      } else {
        requerimientos.set(producto.id, (requerimientos.get(producto.id) || 0) + item.cantidad);
      }
    }

    // 2. Bloquear productos requeridos con SELECT FOR UPDATE (orden determinístico)
    const idsRequeridos = [...requerimientos.keys()].sort((a, b) => a - b);
    let stockMap = new Map();
    if (idsRequeridos.length > 0) {
      const placeholders = idsRequeridos.map(() => '?').join(',');
      const [stockRows] = await conn.query(
        `SELECT id, nombre, stock_limitado, stock_actual FROM producto WHERE id IN (${placeholders}) ORDER BY id FOR UPDATE`,
        idsRequeridos
      );

      stockMap = new Map(stockRows.map((r) => [r.id, r]));

      for (const id of idsRequeridos) {
        const producto = stockMap.get(id);
        if (!producto) throw new Error(`Producto ${id} no encontrado`);
        const necesario = requerimientos.get(id);
        if (producto.stock_limitado && producto.stock_actual < necesario) {
          throw new Error(
            `Stock insuficiente de "${producto.nombre}". Necesario: ${necesario}, disponible: ${producto.stock_actual}`
          );
        }
      }
    }

    // 3. Calcular total
    const total = itemsExpandidos.reduce((sum, item) => {
      return sum + parseFloat(item.precio) * item.cantidad;
    }, 0);

    // 3.5. Insert archivo_drive row if comprobante was uploaded (before pedido INSERT so we have the ID)
    let comprobanteArchivoId = null;
    if (data.archivo) {
      comprobanteArchivoId = await createArchivo(conn, {
        drive_id: data.archivo.drive_id,
        nombre_original: data.archivo.nombre_original,
        mime_type: data.archivo.mime_type,
        tamanio_bytes: data.archivo.tamanio_bytes,
        tipo: 'comprobante',
        url_publica: data.archivo.url_publica || null,
      });
    }

    // 4. INSERT pedido
    const token = generarToken();
    const estadoPago = data.estado_pago || (data.archivo ? 'comprobante_subido' : 'pendiente');
    const [pedidoResult] = await conn.query(
      `INSERT INTO pedido
       (token_seguimiento, origen, nombre_cliente, mesa, telefono_cliente,
        telefono_whatsapp, observaciones, metodo_pago, estado_pago, estado_pedido, total, comprobante_archivo_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        token,
        data.origen || 'online',
        data.nombre_cliente,
        data.mesa || null,
        data.telefono_cliente || null,
        normalizarTelefono(data.telefono_cliente),
        data.observaciones || null,
        data.metodo_pago,
        estadoPago,
        data.estado_pedido || 'recibido',
        total,
        comprobanteArchivoId,
      ]
    );

    const pedidoId = pedidoResult.insertId;

    // 5. Generar y guardar número KMG-XXXX
    const numero = formatearNumero(pedidoId);
    await conn.query('UPDATE pedido SET numero = ? WHERE id = ?', [numero, pedidoId]);

    // 6. INSERT pedido_detalle (snapshot)
    for (const item of itemsExpandidos) {
      const subtotal = parseFloat(item.precio) * item.cantidad;
      await conn.query(
        `INSERT INTO pedido_detalle
         (pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [pedidoId, item.producto_id, item.nombre, item.precio, item.cantidad, subtotal]
      );
    }

    // 7. Descontar stock acumulado con UPDATE defensivo
    for (const [productoId, cantidad] of requerimientos) {
      const prod = stockMap.get(productoId);
      if (!prod || !prod.stock_limitado) {
        continue; // Saltar productos ilimitados
      }
      const [result] = await conn.query(
        'UPDATE producto SET stock_actual = stock_actual - ? WHERE id = ? AND stock_limitado = 1 AND stock_actual >= ?',
        [cantidad, productoId, cantidad]
      );
      if (result.affectedRows === 0) {
        throw new Error(`Stock insuficiente de "${prod.nombre || productoId}" al descontar`);
      }
    }

    await conn.commit();
    return { pedidoId, numero, token };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function findKitchenPedidos(pool) {
  const [rows] = await pool.query(
    `SELECT p.id, p.numero, p.nombre_cliente, p.mesa, p.estado_pedido,
            p.estado_pago, p.observaciones, p.created_at, p.total,
            COUNT(pd.id) AS cantidad_items
     FROM pedido p
     LEFT JOIN pedido_detalle pd ON pd.pedido_id = p.id
     WHERE p.estado_pedido IN ('recibido', 'en_preparacion', 'listo')
     GROUP BY p.id, p.numero, p.nombre_cliente, p.mesa, p.estado_pedido,
              p.estado_pago, p.observaciones, p.created_at, p.total
     ORDER BY FIELD(p.estado_pedido, 'recibido', 'en_preparacion', 'listo'), p.created_at ASC`
  );
  return rows;
}

export async function findByToken(pool, token) {
  const [rows] = await pool.query(
    `SELECT p.id, p.numero, p.token_seguimiento, p.origen, p.nombre_cliente,
            p.mesa, p.estado_pedido, p.estado_pago, p.metodo_pago, p.total,
            p.comprobante_archivo_id,
            p.observaciones, p.created_at, p.updated_at
     FROM pedido p
     WHERE p.token_seguimiento = ?`,
    [token]
  );
  const pedido = rows[0];
  if (!pedido) return null;

  const [detalles] = await pool.query(
    `SELECT producto_id, nombre_producto, precio_unitario, cantidad, subtotal
     FROM pedido_detalle WHERE pedido_id = ?`,
    [pedido.id]
  );
  pedido.items = detalles;
  return pedido;
}

export async function findById(pool, id) {
  const [rows] = await pool.query(
    `SELECT p.id, p.numero, p.token_seguimiento, p.origen, p.nombre_cliente,
            p.mesa, p.telefono_cliente, p.observaciones,
            p.metodo_pago, p.estado_pago, p.estado_pedido, p.total,
            p.comprobante_archivo_id,
            p.created_at, p.updated_at
     FROM pedido p WHERE p.id = ?`,
    [id]
  );
  const pedido = rows[0];
  if (!pedido) return null;

  const [detalles] = await pool.query(
    `SELECT pd.id, pd.producto_id, pd.nombre_producto, pd.precio_unitario,
            pd.cantidad, pd.subtotal
     FROM pedido_detalle pd WHERE pd.pedido_id = ?`,
    [id]
  );
  pedido.items = detalles;
  return pedido;
}

export async function findAllAdmin(pool, filters = {}) {
  const values = [];
  const conditions = [];

  if (filters.estado_pedido) {
    conditions.push('AND p.estado_pedido = ?');
    values.push(filters.estado_pedido);
  }
  if (filters.metodo_pago) {
    conditions.push('AND p.metodo_pago = ?');
    values.push(filters.metodo_pago);
  }
  if (filters.origen) {
    conditions.push('AND p.origen = ?');
    values.push(filters.origen);
  }
  if (filters.buscar) {
    conditions.push('AND (p.nombre_cliente LIKE ? OR p.numero LIKE ? OR p.telefono_cliente LIKE ?)');
    values.push(`%${filters.buscar}%`, `%${filters.buscar}%`, `%${filters.buscar}%`);
  }

  // unpaid/caja filter: overrides estado_pago if present
  // excludes cancelados — a cancelled pedido is not actionable for caja payment follow-up
  if (filters.solo_pagos_pendientes === true) {
    conditions.push("AND p.estado_pago IN ('pendiente','rechazado')");
    conditions.push("AND p.estado_pedido != 'cancelado'");
  } else if (filters.estado_pago) {
    conditions.push('AND p.estado_pago = ?');
    values.push(filters.estado_pago);
  }

  const where = conditions.length ? `WHERE 1=1\n${conditions.join('\n')}` : '';

  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(filters.limit, 10) || 24));
  const offset = (page - 1) * limit;

  const sqlCount = `SELECT COUNT(*) AS total FROM pedido p ${where}`;
  const [[{ total }]] = await pool.query(sqlCount, values);

  const sqlData = `SELECT p.* FROM pedido p ${where} ORDER BY p.id DESC LIMIT ? OFFSET ?`;
  const [pedidos] = await pool.query(sqlData, [...values, limit, offset]);

  return { pedidos, total };
}

export async function updateEstadoPedido(pool, id, nuevoEstado) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT id, estado_pedido FROM pedido WHERE id = ? FOR UPDATE',
      [id]
    );

    const pedido = rows[0];

    if (!pedido) {
      await conn.rollback();
      return 0;
    }

    if (!transicionEstadoValida(pedido.estado_pedido, nuevoEstado)) {
      await conn.rollback();
      return -1;
    }

    const [result] = await conn.query(
      'UPDATE pedido SET estado_pedido = ? WHERE id = ?',
      [nuevoEstado, id]
    );

    await conn.commit();
    return result.affectedRows;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function updateEstadoPago(pool, id, nuevoEstado) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock row and read current state
    const [pedRows] = await conn.query(
      'SELECT id, estado_pedido, estado_pago, metodo_pago FROM pedido WHERE id = ? FOR UPDATE',
      [id]
    );
    const pedido = pedRows[0];
    if (!pedido) {
      await conn.rollback();
      return 0;
    }
    // Block payment changes for cancelled pedidos
    if (pedido.estado_pedido === 'cancelado') {
      await conn.rollback();
      return -2;
    }
    // Reject same-state transitions — an explicit payment PATCH should change state, not be a no-op
    if (pedido.estado_pago === nuevoEstado) {
      await conn.rollback();
      return -1;
    }
    if (!validatePaymentTransition(pedido.estado_pago, nuevoEstado, pedido.metodo_pago)) {
      await conn.rollback();
      return -1;
    }

    const [result] = await conn.query(
      'UPDATE pedido SET estado_pago = ? WHERE id = ?',
      [nuevoEstado, id]
    );

    await conn.commit();
    return result.affectedRows;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function cancelWithTransaction(pool, id) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [pedRows] = await conn.query(
      "SELECT id, estado_pedido FROM pedido WHERE id = ? FOR UPDATE", [id]
    );
    const pedido = pedRows[0];
    if (!pedido) {
      await conn.rollback();
      return 0;
    }
    if (!['recibido', 'en_preparacion'].includes(pedido.estado_pedido)) {
      await conn.rollback();
      return -1;
    }

    const [detalles] = await conn.query(
      `SELECT pd.producto_id, pd.cantidad, p.tipo
       FROM pedido_detalle pd
       JOIN producto p ON p.id = pd.producto_id
       WHERE pd.pedido_id = ?`,
      [id]
    );

    const reposiciones = new Map();

    for (const d of detalles) {
      if (d.tipo === 'promo') {
        const [comps] = await conn.query(
          'SELECT producto_id, cantidad FROM combo_producto WHERE combo_id = ?',
          [d.producto_id]
        );
        for (const comp of comps) {
          const total = comp.cantidad * d.cantidad;
          reposiciones.set(comp.producto_id, (reposiciones.get(comp.producto_id) || 0) + total);
        }
      } else {
        reposiciones.set(d.producto_id, (reposiciones.get(d.producto_id) || 0) + d.cantidad);
      }
    }

    // 1. Ordenar IDs de forma determinista
    const idsAReponer = [...reposiciones.keys()].sort((a, b) => a - b);
    let stockMap = new Map();
    if (idsAReponer.length > 0) {
      const placeholders = idsAReponer.map(() => '?').join(',');
      // 2. Bloquear en orden determinista
      const [stockRows] = await conn.query(
        `SELECT id, stock_limitado FROM producto WHERE id IN (${placeholders}) ORDER BY id FOR UPDATE`,
        idsAReponer
      );
      stockMap = new Map(stockRows.map((r) => [r.id, r]));
    }

    // 3. Ejecutar actualizaciones defensivas omitiendo productos ilimitados
    for (const [productoId, cantidad] of reposiciones) {
      const prod = stockMap.get(productoId);
      if (!prod || !prod.stock_limitado) {
        continue; // Omitir ilimitados
      }
      await conn.query(
        'UPDATE producto SET stock_actual = stock_actual + ? WHERE id = ? AND stock_limitado = 1',
        [cantidad, productoId]
      );
    }

    const [updateResult] = await conn.query(
      "UPDATE pedido SET estado_pedido = 'cancelado' WHERE id = ?",
      [id]
    );

    await conn.commit();
    return updateResult.affectedRows;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Edita un pedido de caja transaccionalmente, reconciliando stock.
 * Restaura stock anterior, valida nuevo set, descuenta stock nuevo.
 * Rechaza si estado_pedido es 'cancelado' o 'entregado'.
 * Si data.items no está presente, saltea reconciliación de stock (solo metadatos).
 * Si metodo_pago cambia, ajusta estado_pago para coherencia.
 * @param {mysql2.Pool} pool
 * @param {number} id - pedido_id
 * @param {object} data - payload con items opcionales y metadatos opcionales
 * @returns {Promise<number>} affectedRows
 * @throws {Error} con mensaje descriptivo para 400/409
 */
export async function editWithTransaction(pool, id, data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Bloquear pedido
    const [pedRows] = await conn.query(
      'SELECT id, estado_pedido, estado_pago, metodo_pago, origen FROM pedido WHERE id = ? FOR UPDATE',
      [id]
    );
    const pedido = pedRows[0];
    if (!pedido) {
      await conn.rollback();
      return 0; // not found
    }
    if (pedido.origen !== 'caja') {
      await conn.rollback();
      return -2; // only caja pedidos editable
    }
    if (['cancelado', 'entregado'].includes(pedido.estado_pedido)) {
      await conn.rollback();
      return -1; // not allowed
    }

    // 2. Coerce estado_pago when metodo_pago changes
    let estadoPagoEffectivo = pedido.estado_pago;
    if (data.metodo_pago !== undefined && data.metodo_pago !== pedido.metodo_pago) {
      // pagado stays pagado (terminal for all methods)
      if (estadoPagoEffectivo !== 'pagado') {
        const validStates = Object.keys(transitionsByMethod[data.metodo_pago] || {});
        if (!validStates.includes(estadoPagoEffectivo)) {
          estadoPagoEffectivo = 'pendiente';
        }
      }
    }

    // --- Stock reconciliation only when items is present ---
    let total = null;
    if (data.items) {
      // 3. Leer detalle actual y calcular reposiciones (stock a devolver)
      const [detalles] = await conn.query(
        `SELECT pd.producto_id, pd.cantidad, p.tipo
         FROM pedido_detalle pd
         JOIN producto p ON p.id = pd.producto_id
         WHERE pd.pedido_id = ?`,
        [id]
      );

      const reposiciones = new Map();
      for (const d of detalles) {
        if (d.tipo === 'promo') {
          const [comps] = await conn.query(
            'SELECT producto_id, cantidad FROM combo_producto WHERE combo_id = ?',
            [d.producto_id]
          );
          for (const comp of comps) {
            const totalQty = comp.cantidad * d.cantidad;
            reposiciones.set(comp.producto_id, (reposiciones.get(comp.producto_id) || 0) + totalQty);
          }
        } else {
          reposiciones.set(d.producto_id, (reposiciones.get(d.producto_id) || 0) + d.cantidad);
        }
      }

      // 4. Expandir nuevo set de items
      const nuevosRequerimientos = new Map();
      const itemsExpandidos = [];

      for (const item of data.items) {
        const [prodRows] = await conn.query(
          'SELECT id, nombre, precio, tipo, stock_limitado, stock_actual FROM producto WHERE id = ? AND activo = 1',
          [item.producto_id]
        );
        const producto = prodRows[0];
        if (!producto) throw new Error(`Producto ${item.producto_id} no encontrado o inactivo`);

        itemsExpandidos.push({
          producto_id: producto.id,
          nombre: producto.nombre,
          precio: producto.precio,
          tipo: producto.tipo,
          cantidad: item.cantidad,
          stock_limitado: producto.stock_limitado,
          stock_actual: producto.stock_actual,
        });

        if (producto.tipo === 'promo') {
          const [compRows] = await conn.query(
            'SELECT producto_id, cantidad FROM combo_producto WHERE combo_id = ?',
            [item.producto_id]
          );
          if (compRows.length === 0) {
            throw new Error(`La promo "${producto.nombre}" no tiene componentes configurados`);
          }
          for (const comp of compRows) {
            const totalQty = comp.cantidad * item.cantidad;
            nuevosRequerimientos.set(comp.producto_id, (nuevosRequerimientos.get(comp.producto_id) || 0) + totalQty);
          }
        } else {
          nuevosRequerimientos.set(producto.id, (nuevosRequerimientos.get(producto.id) || 0) + item.cantidad);
        }
      }

      // 5. Calcular stock disponible con reposicion aplicada
      const unionIds = new Set([...reposiciones.keys(), ...nuevosRequerimientos.keys()]);
      const idsOrdenados = [...unionIds].sort((a, b) => a - b);
      let stockMap = new Map();

      if (idsOrdenados.length > 0) {
        const placeholders = idsOrdenados.map(() => '?').join(',');
        const [stockRows] = await conn.query(
          `SELECT id, nombre, stock_limitado, stock_actual FROM producto WHERE id IN (${placeholders}) ORDER BY id FOR UPDATE`,
          idsOrdenados
        );
        stockMap = new Map(stockRows.map((r) => [r.id, r]));
      }

      for (const idProd of nuevosRequerimientos.keys()) {
        const prod = stockMap.get(idProd);
        if (!prod) throw new Error(`Producto ${idProd} no encontrado`);
        const necesario = nuevosRequerimientos.get(idProd);
        const restore = reposiciones.get(idProd) || 0;
        const disponible = prod.stock_limitado ? prod.stock_actual + restore : Infinity;
        if (disponible < necesario) {
          throw new Error(
            `Stock insuficiente de "${prod.nombre}". Necesario: ${necesario}, disponible (con reposicion): ${disponible}`
          );
        }
      }

      // 6. Aplicar delta (restaurar viejo + descontar nuevo)
      for (const idProd of idsOrdenados) {
        const prod = stockMap.get(idProd);
        if (!prod || !prod.stock_limitado) continue;
        const restore = reposiciones.get(idProd) || 0;
        const deduct = nuevosRequerimientos.get(idProd) || 0;
        const net = restore - deduct;
        await conn.query(
          'UPDATE producto SET stock_actual = stock_actual + ? WHERE id = ? AND stock_limitado = 1',
          [net, idProd]
        );
      }

      // 7. Recalcular total
      total = itemsExpandidos.reduce((sum, item) => {
        return sum + parseFloat(item.precio) * item.cantidad;
      }, 0);

      // 8. Borrar detalle anterior y reescribir
      await conn.query('DELETE FROM pedido_detalle WHERE pedido_id = ?', [id]);
      for (const item of itemsExpandidos) {
        const subtotal = parseFloat(item.precio) * item.cantidad;
        await conn.query(
          `INSERT INTO pedido_detalle
           (pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, item.producto_id, item.nombre, item.precio, item.cantidad, subtotal]
        );
      }
    }

    // 9. Actualizar metadatos del pedido
    const campos = [];
    const valores = [];
    if (data.nombre_cliente !== undefined) {
      campos.push('nombre_cliente = ?');
      valores.push(data.nombre_cliente);
    }
    if (data.mesa !== undefined) {
      campos.push('mesa = ?');
      valores.push(data.mesa || null);
    }
    if (data.telefono_cliente !== undefined) {
      campos.push('telefono_cliente = ?');
      valores.push(data.telefono_cliente || null);
      campos.push('telefono_whatsapp = ?');
      valores.push(normalizarTelefono(data.telefono_cliente));
    }
    if (data.observaciones !== undefined) {
      campos.push('observaciones = ?');
      valores.push(data.observaciones || null);
    }
    if (data.metodo_pago !== undefined) {
      campos.push('metodo_pago = ?');
      valores.push(data.metodo_pago);
    }
    // Coerced estado_pago if metodo_pago changed
    if (estadoPagoEffectivo !== pedido.estado_pago) {
      campos.push('estado_pago = ?');
      valores.push(estadoPagoEffectivo);
    }
    // Total only if items were provided
    if (total !== null) {
      campos.push('total = ?');
      valores.push(total);
    }

    if (campos.length > 0) {
      valores.push(id);
      await conn.query(
        `UPDATE pedido SET ${campos.join(', ')} WHERE id = ?`,
        valores
      );
    }

    await conn.commit();
    return 1;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
