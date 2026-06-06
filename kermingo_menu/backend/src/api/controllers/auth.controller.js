import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getPool } from '../database/db.js';
import { findByEmail } from '../models/usuario.model.js';
import { respuestaExitosa } from '../utils/respuesta.utils.js';
import { AuthError } from '../utils/errors.js';
import environments from '../config/environments.js';

const COOKIE_NAME = environments.cookie.name;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: environments.esProduccion,
  sameSite: environments.esProduccion ? 'none' : 'lax',
  path: '/',
  maxAge: 24 * 60 * 60 * 1000,
};

const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: environments.esProduccion,
  sameSite: environments.esProduccion ? 'none' : 'lax',
  path: '/',
};

export async function login(req, res, next) {
  try {
    const { email, contrasenia } = req.body;
    const pool = getPool();
    const usuario = await findByEmail(pool, email);
    if (!usuario) throw new AuthError('Credenciales inválidas');
    if (!usuario.activo) throw new AuthError('Credenciales inválidas');

    const valida = await bcrypt.compare(contrasenia, usuario.contrasenia_hash);
    if (!valida) throw new AuthError('Credenciales inválidas');

    const token = jwt.sign({ userId: usuario.id }, environments.jwt.secret, {
      expiresIn: environments.jwt.expiresIn,
    });

    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    return respuestaExitosa(res, {
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email },
    }, 'Sesión iniciada correctamente');
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    res.clearCookie(COOKIE_NAME, CLEAR_COOKIE_OPTIONS);
    return respuestaExitosa(res, null, 'Sesión cerrada correctamente');
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT id, nombre, email, activo FROM usuario WHERE id = ?',
      [req.usuario.id]
    );
    const usuario = rows[0];
    if (!usuario || !usuario.activo) throw new AuthError('No autorizado');
    return respuestaExitosa(res, { usuario }, 'Usuario autenticado');
  } catch (err) {
    next(err);
  }
}
