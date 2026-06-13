import { AppError } from '../utils/errors.js';
import { respuestaError } from '../utils/respuesta.utils.js';

export default function errorMiddleware(err, req, res, next) {
  // Handle DriveUploadError by name for 503 mapping
  if (err.name === 'DriveUploadError') {
    return res.status(503).json({
      ok: false,
      error: 'Servicio de upload no disponible',
    });
  }

  // Handle DriveReadError by name for 503 mapping
  if (err.name === 'DriveReadError') {
    return res.status(503).json({
      ok: false,
      error: 'Servicio de lectura no disponible',
    });
  }

  if (err instanceof AppError) {
    return respuestaError(res, err, err.statusCode);
  }

  console.error('Error no manejado:', err);
  return respuestaError(res, new Error('Error interno del servidor'), 500);
}
