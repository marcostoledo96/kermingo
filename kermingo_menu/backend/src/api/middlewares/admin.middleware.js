import jwt from 'jsonwebtoken';
import { getPool } from '../database/db.js';
import { AuthError } from '../utils/errors.js';
import environments from '../config/environments.js';

export async function requireAdmin(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) throw new AuthError('Token no encontrado');

    const decoded = jwt.verify(token, environments.jwt.secret);
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT id, nombre, email, activo FROM usuario WHERE id = ?',
      [decoded.userId]
    );

    const usuario = rows[0];
    if (!usuario) throw new AuthError('Usuario no encontrado');
    if (!usuario.activo) throw new AuthError('Cuenta inactiva');

    req.usuario = { id: usuario.id, nombre: usuario.nombre, email: usuario.email };
    next();
  } catch (err) {
    if (err instanceof AuthError) return next(err);
    return next(new AuthError('Token inválido o expirado'));
  }
}
