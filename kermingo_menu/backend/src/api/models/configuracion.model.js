export async function findPublic(pool) {
  const [rows] = await pool.query(
    'SELECT id, estado, mensaje_publico FROM configuracion_tienda WHERE id = 1'
  );
  return rows[0] || null;
}

export async function findAdmin(pool) {
  const [rows] = await pool.query(
    'SELECT id, estado, mensaje_publico, cena_habilitada_desde FROM configuracion_tienda WHERE id = 1'
  );
  return rows[0] || null;
}

export async function updateMinimal(pool, data) {
  const fields = [];
  const values = [];

  if (data.estado !== undefined) {
    fields.push('estado = ?');
    values.push(data.estado);
  }
  if (data.mensaje_publico !== undefined) {
    fields.push('mensaje_publico = ?');
    values.push(data.mensaje_publico);
  }
  if (data.cena_habilitada_desde !== undefined) {
    fields.push('cena_habilitada_desde = ?');
    values.push(data.cena_habilitada_desde);
  }

  if (fields.length === 0) return 0;

  const sql = `UPDATE configuracion_tienda SET ${fields.join(', ')} WHERE id = 1`;
  const [result] = await pool.query(sql, values);
  return result.affectedRows;
}
