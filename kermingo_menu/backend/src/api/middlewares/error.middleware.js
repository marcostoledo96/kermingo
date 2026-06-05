import { AppError } from '../utils/errors.js';
import { respuestaError } from '../utils/respuesta.utils.js';

export default function errorMiddleware(err, req, res, next) {
  if (err instanceof AppError) {
    return respuestaError(res, err, err.statusCode);
  }

  console.error('Error no manejado:', err);
  return respuestaError(res, new Error('Error interno del servidor'), 500);
}
