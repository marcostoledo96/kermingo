import { ValidationError } from '../utils/errors.js';

const SQL_BASE_PUBLIC = `
  SELECT
    p.id,
    p.nombre,
    p.descripcion,
    p.precio,
    p.tipo,
    p.stock_limitado,
    p.stock_actual,
    p.stock_minimo_alerta,
    p.activo,
    p.disponible,
    p.orden,
    p.imagen_archivo_id,
    ai.nombre_original AS imagen_nombre_original,
    ai.mime_type AS imagen_mime_type,
    ai.tamanio_bytes AS imagen_tamanio_bytes,
    CASE WHEN ai.id IS NOT NULL THEN CONCAT('/api/productos/', p.id, '/imagen?v=', ai.id) ELSE NULL END AS imagen_url,
    GROUP_CONCAT(c.nombre ORDER BY c.nombre SEPARATOR ', ') AS categorias
  FROM producto p
  LEFT JOIN producto_categoria pc ON pc.producto_id = p.id
  LEFT JOIN categoria c ON c.id = pc.categoria_id
  LEFT JOIN archivo_drive ai ON ai.id = p.imagen_archivo_id
  WHERE p.activo = 1
    AND (p.tipo <> 'promo' OR EXISTS (SELECT 1 FROM combo_producto cp WHERE cp.combo_id = p.id))
`;

const SQL_GROUP_ORDER_PUBLIC = `
  GROUP BY p.id, p.nombre, p.descripcion, p.precio, p.tipo,
           p.stock_limitado, p.stock_actual, p.stock_minimo_alerta, p.activo,
           p.disponible, p.orden,
           p.imagen_archivo_id, ai.id, ai.nombre_original, ai.mime_type, ai.tamanio_bytes
  ORDER BY p.orden ASC, p.id ASC
`;

const SQL_BASE_ADMIN = `
  SELECT
    p.id,
    p.nombre,
    p.descripcion,
    p.precio,
    p.tipo,
    p.stock_limitado,
    p.stock_actual,
    p.stock_minimo_alerta,
    p.activo,
    p.disponible,
    p.orden,
    p.imagen_archivo_id,
    ai.nombre_original AS imagen_nombre_original,
    ai.mime_type AS imagen_mime_type,
    ai.tamanio_bytes AS imagen_tamanio_bytes,
    CASE WHEN ai.id IS NOT NULL THEN CONCAT('/api/productos/', p.id, '/imagen?v=', ai.id) ELSE NULL END AS imagen_url,
    GROUP_CONCAT(c.nombre ORDER BY c.nombre SEPARATOR ', ') AS categorias,
    (SELECT COUNT(*) FROM combo_producto cp WHERE cp.combo_id = p.id) AS componentes_count
  FROM producto p
  LEFT JOIN producto_categoria pc ON pc.producto_id = p.id
  LEFT JOIN categoria c ON c.id = pc.categoria_id
  LEFT JOIN archivo_drive ai ON ai.id = p.imagen_archivo_id
  WHERE 1 = 1
`;

const SQL_GROUP_ORDER_ADMIN = `
  GROUP BY p.id, p.nombre, p.descripcion, p.precio, p.tipo,
           p.stock_limitado, p.stock_actual, p.stock_minimo_alerta, p.activo,
           p.disponible, p.orden,
           p.imagen_archivo_id, ai.id, ai.nombre_original, ai.mime_type, ai.tamanio_bytes
  ORDER BY p.orden ASC, p.id ASC
`;

function buildWherePublic(filters, values) {
  const conditions = [];

  if (filters.tipo) {
    conditions.push('AND p.tipo = ?');
    values.push(filters.tipo);
  }

  if (filters.categoria) {
    conditions.push('AND c.nombre = ?');
    values.push(filters.categoria);
  }

  if (filters.buscar) {
    conditions.push('AND p.nombre LIKE ?');
    values.push(`%${filters.buscar}%`);
  }

  return conditions.join('\n');
}

export function buildWhereAdmin(filters, values) {
  const conditions = [];

  if (filters.estado === 'activo') {
    // Active + available + not sold out (or unlimited stock)
    conditions.push('AND p.activo = 1 AND p.disponible = 1 AND (p.stock_limitado = 0 OR p.stock_actual IS NULL OR p.stock_actual > 0)');
  } else if (filters.estado === 'desactivado' || filters.estado === 'inactivo') {
    conditions.push('AND p.activo = 0');
  } else if (filters.estado === 'agotado') {
    // Active + available but sold out (limited stock at 0 or below)
    conditions.push('AND p.activo = 1 AND p.disponible = 1 AND p.stock_limitado = 1 AND p.stock_actual <= 0');
  } else if (filters.estado === 'todavia_no_disponible') {
    conditions.push('AND p.activo = 1 AND p.disponible = 0');
  }
  // 'todos' or undefined => no estado filter

  if (filters.tipo) {
    conditions.push('AND p.tipo = ?');
    values.push(filters.tipo);
  }

  return conditions.join('\n');
}

export async function findAllPublic(pool, filters = {}) {
  const values = [];
  const where = buildWherePublic(filters, values);
  const sql = `${SQL_BASE_PUBLIC}\n${where}\n${SQL_GROUP_ORDER_PUBLIC}`;

  const [rows] = await pool.query(sql, values);
  return rows;
}

export async function findByIdPublic(pool, id) {
  const values = [id];
  const where = 'AND p.id = ?';
  const sql = `${SQL_BASE_PUBLIC}\n${where}\n${SQL_GROUP_ORDER_PUBLIC}`;

  const [rows] = await pool.query(sql, values);
  return rows[0] || null;
}

export async function findAllAdmin(pool, filters = {}) {
  const values = [];
  const where = buildWhereAdmin(filters, values);

  const sqlData = `${SQL_BASE_ADMIN}\n${where}\n${SQL_GROUP_ORDER_ADMIN}\nLIMIT ? OFFSET ?`;
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(filters.limit, 10) || 24));
  const offset = (page - 1) * limit;

  const dataValues = [...values, limit, offset];

  const sqlCount = `SELECT COUNT(DISTINCT p.id) AS total FROM producto p LEFT JOIN producto_categoria pc ON pc.producto_id = p.id LEFT JOIN categoria c ON c.id = pc.categoria_id WHERE 1 = 1\n${where}`;

  const [[{ total }]] = await pool.query(sqlCount, values);
  const [productos] = await pool.query(sqlData, dataValues);

  return { productos, total };
}

export async function findByIdAdmin(pool, id) {
  const values = [id];
  const where = 'AND p.id = ?';
  const sql = `${SQL_BASE_ADMIN}\n${where}\n${SQL_GROUP_ORDER_ADMIN}`;

  const [rows] = await pool.query(sql, values);
  return rows[0] || null;
}

export async function create(pool, data) {
  const [result] = await pool.query('INSERT INTO producto SET ?', [data]);
  return result.insertId;
}

function normalizarCategorias(valor) {
  if (!Array.isArray(valor) || valor.length === 0) {
    return [];
  }

  const normalizadas = valor
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);

  return [...new Set(normalizadas)];
}

export async function setProductoCategorias(conn, productoId, categorias) {
  const categoriasNormalized = normalizarCategorias(categorias);

  await conn.query('DELETE FROM producto_categoria WHERE producto_id = ?', [productoId]);

  if (categoriasNormalized.length === 0) {
    return;
  }

  const [filas] = await conn.query(
    `SELECT id, nombre FROM categoria WHERE nombre IN (${categoriasNormalized.map(() => '?').join(',')})`,
    categoriasNormalized,
  );

  if (filas.length !== categoriasNormalized.length) {
    throw new ValidationError('Categoría inválida');
  }

  const idPorNombre = new Map(filas.map((f) => [f.nombre, f.id]));
  const inserciones = categoriasNormalized.map((nombre) => [productoId, idPorNombre.get(nombre)]);

  await conn.query('INSERT INTO producto_categoria (producto_id, categoria_id) VALUES ?', [inserciones]);
}

export async function update(pool, id, data) {
  const [result] = await pool.query('UPDATE producto SET ? WHERE id = ?', [data, id]);
  return result.affectedRows;
}

export async function deactivate(pool, id) {
  const [result] = await pool.query('UPDATE producto SET activo = 0 WHERE id = ?', [id]);
  return result.affectedRows;
}

export async function restore(pool, id) {
  const [result] = await pool.query('UPDATE producto SET activo = 1 WHERE id = ?', [id]);
  return result.affectedRows;
}

export async function updateStock(pool, id, stock) {
  const [result] = await pool.query('UPDATE producto SET stock_actual = ? WHERE id = ?', [stock, id]);
  return result.affectedRows;
}

export async function updateImagenArchivoId(conn, productoId, archivoId) {
  const [result] = await conn.query('UPDATE producto SET imagen_archivo_id = ? WHERE id = ?', [archivoId, productoId]);
  return result.affectedRows;
}

/**
 * Returns true when the promo (combo) has at least one component configured.
 * Non-promo products always return true (no components required).
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {number} productoId
 * @param {string} tipo
 * @returns {Promise<boolean>}
 */
export async function promoTieneComponentes(conn, productoId, tipo) {
  if (tipo !== 'promo') return true;
  const [rows] = await conn.query(
    'SELECT COUNT(*) AS n FROM combo_producto WHERE combo_id = ?',
    [productoId]
  );
  return (rows[0]?.n ?? 0) > 0;
}

/**
 * Batch-reorder products within a transaction.
 * @param {import('mysql2/promise').PoolConnection} conn - Active transaction connection
 * @param {Array<{id: number, orden: number}>} ordenes - Array of {id, orden} pairs
 */
export async function updateOrdenes(conn, ordenes) {
  for (const item of ordenes) {
    await conn.query('UPDATE producto SET orden = ? WHERE id = ?', [item.orden, item.id])
  }
}

/**
 * Get all components of a promo, joined with product info for names/stock.
 * @param {import('mysql2/promise').Pool} pool
 * @param {number} comboId - The promo product ID
 * @returns {Promise<Array<{producto_id: number, nombre: string, cantidad: number, activo: number, disponible: number, stock_limitado: number, stock_actual: number|null}>>}
 */
export async function findComponentes(pool, comboId) {
  const [rows] = await pool.query(
    `SELECT
       cp.producto_id,
       p.nombre,
       cp.cantidad,
       p.activo,
       p.disponible,
       p.stock_limitado,
       p.stock_actual
     FROM combo_producto cp
     JOIN producto p ON p.id = cp.producto_id
     WHERE cp.combo_id = ?
     ORDER BY cp.producto_id`,
    [comboId]
  );
  return rows;
}

/**
 * Atomically replace all components of a promo within a transaction.
 * Caller must validate that the target is a promo and that each component is valid
 * BEFORE calling this function.
 * @param {import('mysql2/promise').PoolConnection} conn - Active transaction connection
 * @param {number} comboId - The promo product ID
 * @param {Array<{producto_id: number, cantidad: number}>} componentes
 */
export async function setComponentes(conn, comboId, componentes) {
  await conn.query('DELETE FROM combo_producto WHERE combo_id = ?', [comboId]);
  if (componentes.length === 0) return;
  const rows = componentes.map((c) => [comboId, c.producto_id, c.cantidad]);
  await conn.query(
    'INSERT INTO combo_producto (combo_id, producto_id, cantidad) VALUES ?',
    [rows]
  );
}
