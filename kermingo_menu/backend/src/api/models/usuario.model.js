export async function findByEmail(pool, email) {
  const [rows] = await pool.query(
    'SELECT id, nombre, email, contrasenia_hash, activo FROM usuario WHERE email = ?',
    [email]
  );
  return rows[0] || null;
}
