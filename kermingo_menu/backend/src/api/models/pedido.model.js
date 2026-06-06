import crypto from 'crypto';

//
// ── Helpers ────────────────────────────────────────────────────────
//

function normalizarTelefono(raw) {
  // Quita +54, 0 inicial, espacios, guiones. Devuelve prefijo país mínimo.
  if (!raw) return null;
  let t = raw.replace(/[\s\-\(\)]/g, '');
  if (t.startsWith('+54')) t = t.slice(3);
  if (t.startsWith('54')) t = t.slice(2);
  if (t.startsWith('0')) t = t.slice(1);
  return t || null;
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

function transicionEstadoValida(actual, siguiente) {
  if (actual === siguiente) return true;
  return (TRANSICIONES_VALIDAS[actual] || []).includes(siguiente);
}

//
// ── Public ─────────────────────────────────────────────────────────
//

export async function createWithTransaction(pool, data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Validar stock de cada item (SELECT FOR UPDATE)
    for (const item of data.items) {
      const [prodRows] = await conn.query(
        'SELECT id, nombre, precio, tipo, stock_limitado, stock_actual FROM producto WHERE id = ? AND activo = 1 FOR UPDATE',
        [item.producto_id]
      );
      const producto = prodRows[0];
      if (!producto) throw new Error(`Producto ${item.producto_id} no encontrado o inactivo`);

      // Si es promo, validar stock de sus componentes
      if (producto.tipo === 'promo') {
        const [compRows] = await conn.query(
          `SELECT cp.producto_id, cp.cantidad, p.nombre, p.stock_actual, p.stock_limitado
           FROM combo_producto cp
           JOIN producto p ON p.id = cp.producto_id
           WHERE cp.combo_id = ? FOR UPDATE`,
          [item.producto_id]
        );
        for (const comp of compRows) {
          if (comp.stock_limitado && comp.stock_actual < comp.cantidad * item.cantidad) {
            throw new Error(
              `Stock insuficiente de "${comp.nombre}" (combo). Necesario: ${comp.cantidad * item.cantidad}, disponible: ${comp.stock_actual}`
            );
          }
        }
      } else if (producto.stock_limitado && producto.stock_actual < item.cantidad) {
        throw new Error(
          `Stock insuficiente de "${producto.nombre}". Necesario: ${item.cantidad}, disponible: ${producto.stock_actual}`
        );
      }

      // Guardar precio snapshot
      item._precio = producto.precio;
      item._nombre = producto.nombre;
      item._tipo = producto.tipo;
    }

    // 2. Calcular total
    const total = data.items.reduce((sum, item) => {
      return sum + parseFloat(item._precio) * item.cantidad;
    }, 0);

    // 3. INSERT pedido
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

    // 4. Generar y guardar número KMG-XXXX
    const numero = formatearNumero(pedidoId);
    await conn.query('UPDATE pedido SET numero = ? WHERE id = ?', [numero, pedidoId]);

    // 5. INSERT pedido_detalle (snapshot)
    for (const item of data.items) {
      const subtotal = parseFloat(item._precio) * item.cantidad;
      await conn.query(
        `INSERT INTO pedido_detalle
         (pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [pedidoId, item.producto_id, item._nombre, item._precio, item.cantidad, subtotal]
      );
    }

    // 6. Descontar stock
    for (const item of data.items) {
      if (item._tipo === 'promo') {
        // Descontar stock de cada componente según cantidad del combo
        const [comps] = await conn.query(
          'SELECT producto_id, cantidad FROM combo_producto WHERE combo_id = ?',
          [item.producto_id]
        );
        for (const comp of comps) {
          const totalCantidad = comp.cantidad * item.cantidad;
          await conn.query(
            'UPDATE producto SET stock_actual = stock_actual - ? WHERE id = ? AND stock_limitado = 1',
            [totalCantidad, comp.producto_id]
          );
        }
      } else {
        // Producto normal
        await conn.query(
          'UPDATE producto SET stock_actual = stock_actual - ? WHERE id = ? AND stock_limitado = 1',
          [item.cantidad, item.producto_id]
        );
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
  if (filters.estado_pago) {
    conditions.push('AND p.estado_pago = ?');
    values.push(filters.estado_pago);
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
    conditions.push('AND (p.nombre_cliente LIKE ? OR p.numero LIKE ?)');
    values.push(`%${filters.buscar}%`, `%${filters.buscar}%`);
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

    // Leer pedido actual
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

    // Leer detalles
    const [detalles] = await conn.query(
      `SELECT pd.producto_id, pd.cantidad, p.tipo
       FROM pedido_detalle pd
       JOIN producto p ON p.id = pd.producto_id
       WHERE pd.pedido_id = ? FOR UPDATE`,
      [id]
    );

    // Reponer stock
    for (const d of detalles) {
      if (d.tipo === 'promo') {
        // Reponer componentes del combo
        const [comps] = await conn.query(
          'SELECT producto_id, cantidad FROM combo_producto WHERE combo_id = ?',
          [d.producto_id]
        );
        for (const comp of comps) {
          await conn.query(
            'UPDATE producto SET stock_actual = stock_actual + ? WHERE id = ? AND stock_limitado = 1',
            [comp.cantidad * d.cantidad, comp.producto_id]
          );
        }
      } else {
        await conn.query(
          'UPDATE producto SET stock_actual = stock_actual + ? WHERE id = ? AND stock_limitado = 1',
          [d.cantidad, d.producto_id]
        );
      }
    }

    // Marcar como cancelado
    await conn.query(
      "UPDATE pedido SET estado_pedido = 'cancelado' WHERE id = ?",
      [id]
    );

    await conn.commit();
    return pedRows.affectedRows;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
