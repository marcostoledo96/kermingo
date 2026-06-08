import crypto from 'crypto';

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

const TRANSICIONES_VALIDAS = {
  recibido: ['en_preparacion'],
  en_preparacion: ['listo'],
  listo: ['entregado'],
};

/**
 * Payment-state machine for admin caja follow-up.
 * Valid transitions: pendiente -> pagado|comprobante_subido,
 * comprobante_subido -> pagado|rechazado, rechazado -> pendiente, pagado terminal.
 */
export const PAGO_TRANSITIONS = {
  pendiente: ['pagado', 'comprobante_subido'],
  comprobante_subido: ['pagado', 'rechazado'],
  rechazado: ['pendiente'],
  pagado: [], // terminal
};

/**
 * Validates an admin payment-state transition.
 * @param {string} from - current estado_pago
 * @param {string} to - requested estado_pago
 * @returns {boolean}
 */
export function validatePaymentTransition(from, to) {
  if (from === to) return true;
  return (PAGO_TRANSITIONS[from] || []).includes(to);
}

//
// ── Public ─────────────────────────────────────────────────────────
//

function transicionEstadoValida(actual, siguiente) {
  if (actual === siguiente) return true;
  return (TRANSICIONES_VALIDAS[actual] || []).includes(siguiente);
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

    // 4. INSERT pedido
    const token = generarToken();
    const [pedidoResult] = await conn.query(
      `INSERT INTO pedido
       (token_seguimiento, origen, nombre_cliente, mesa, telefono_cliente,
        telefono_whatsapp, observaciones, metodo_pago, estado_pago, estado_pedido, total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        token,
        data.origen || 'online',
        data.nombre_cliente,
        data.mesa || null,
        data.telefono_cliente || null,
        normalizarTelefono(data.telefono_cliente),
        data.observaciones || null,
        data.metodo_pago,
        data.estado_pago || 'pendiente',
        data.estado_pedido || 'recibido',
        total,
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
     GROUP BY p.id
     ORDER BY FIELD(p.estado_pedido, 'recibido', 'en_preparacion', 'listo'), p.created_at ASC`
  );
  return rows;
}

export async function findByToken(pool, token) {
  const [rows] = await pool.query(
    `SELECT p.id, p.numero, p.token_seguimiento, p.origen, p.nombre_cliente,
            p.mesa, p.estado_pedido, p.estado_pago, p.metodo_pago, p.total,
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
  if (filters.solo_pagos_pendientes) {
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
  const pedido = await findById(pool, id);
  if (!pedido) return 0;
  if (!transicionEstadoValida(pedido.estado_pedido, nuevoEstado)) return -1;

  const [result] = await pool.query(
    'UPDATE pedido SET estado_pedido = ? WHERE id = ?',
    [nuevoEstado, id]
  );
  return result.affectedRows;
}

export async function updateEstadoPago(pool, id, nuevoEstado) {
  const pedido = await findById(pool, id);
  if (!pedido) return 0;
  if (!validatePaymentTransition(pedido.estado_pago, nuevoEstado)) return -1;

  const [result] = await pool.query(
    'UPDATE pedido SET estado_pago = ? WHERE id = ?',
    [nuevoEstado, id]
  );
  return result.affectedRows;
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
