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
    GROUP_CONCAT(c.nombre ORDER BY c.nombre SEPARATOR ', ') AS categorias
  FROM producto p
  LEFT JOIN producto_categoria pc ON pc.producto_id = p.id
  LEFT JOIN categoria c ON c.id = pc.categoria_id
  WHERE p.activo = 1
`;

const SQL_GROUP_ORDER_PUBLIC = `
  GROUP BY p.id, p.nombre, p.descripcion, p.precio, p.tipo,
           p.stock_limitado, p.stock_actual, p.stock_minimo_alerta, p.activo
  ORDER BY p.tipo, p.nombre
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
    GROUP_CONCAT(c.nombre ORDER BY c.nombre SEPARATOR ', ') AS categorias
  FROM producto p
  LEFT JOIN producto_categoria pc ON pc.producto_id = p.id
  LEFT JOIN categoria c ON c.id = pc.categoria_id
  WHERE 1 = 1
`;

const SQL_GROUP_ORDER_ADMIN = `
  GROUP BY p.id, p.nombre, p.descripcion, p.precio, p.tipo,
           p.stock_limitado, p.stock_actual, p.stock_minimo_alerta, p.activo
  ORDER BY p.id DESC
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

function buildWhereAdmin(filters, values) {
  const conditions = [];

  if (filters.estado === 'activo') {
    conditions.push('AND p.activo = 1');
  } else if (filters.estado === 'inactivo') {
    conditions.push('AND p.activo = 0');
  }

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

export async function create(pool, data) {
  const [result] = await pool.query('INSERT INTO producto SET ?', [data]);
  return result.insertId;
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
