import { getPool } from '../database/db.js';
import {
  findPublic,
  findAdmin,
  updateMinimal,
} from '../models/configuracion.model.js';
import { respuestaExitosa } from '../utils/respuesta.utils.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * GET /api/configuracion-tienda
 * Lectura pública de configuración (estado + mensaje).
 */
export async function obtenerPublico(req, res, next) {
  try {
    const pool = getPool();
    const config = await findPublic(pool);
    if (!config) throw new NotFoundError('Configuración no encontrada');
    return respuestaExitosa(res, config, 'Configuración obtenida');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/configuracion-tienda
 * Lectura admin de configuración completa.
 */
export async function obtenerAdmin(req, res, next) {
  try {
    const pool = getPool();
    const config = await findAdmin(pool);
    if (!config) throw new NotFoundError('Configuración no encontrada');
    return respuestaExitosa(res, config, 'Configuración obtenida');
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/configuracion-tienda
 * Actualiza los campos mínimos de configuración.
 *
 * FIX retroactivo: ya no se infiere "no encontrado" desde `affectedRows`.
 * `mysql2` `affectedRows` cuenta filas MODIFICADAS, no matched; un UPDATE
 * no-op (mismos datos) devuelve 0 sin que la fila haya desaparecido. Como
 * el seed garantiza `id = 1`, la verificación de existencia se hace con
 * un SELECT posterior vía `findAdmin`.
 */
export async function actualizarAdmin(req, res, next) {
  try {
    const pool = getPool();
    await updateMinimal(pool, req.body);
    const config = await findAdmin(pool);
    if (!config) throw new NotFoundError('Configuración no encontrada');
    return respuestaExitosa(res, config, 'Configuración actualizada');
  } catch (err) {
    next(err);
  }
}
