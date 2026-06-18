import { getPool } from '../database/db.js';
import { obtenerReportes } from '../models/reportes.model.js';
import { respuestaExitosa } from '../utils/respuesta.utils.js';

/**
 * GET /api/admin/reportes
 * Retorna métricas agregadas de recaudación y productos vendidos.
 */
export async function obtenerReportesAdmin(req, res, next) {
  try {
    const pool = getPool();
    const data = await obtenerReportes(pool);
    return respuestaExitosa(res, data, 'Reportes obtenidos correctamente');
  } catch (error) {
    next(error);
  }
}
