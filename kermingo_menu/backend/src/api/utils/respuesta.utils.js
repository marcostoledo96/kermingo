import environments from '../config/environments.js';

export function respuestaExitosa(res, data = null, message = '', statusCode = 200) {
  return res.status(statusCode).json({ ok: true, data, message });
}

export function respuestaError(res, error, statusCode = 500) {
  const message = typeof error === 'string' ? error : error?.message || 'Error interno del servidor';
  const payload = { ok: false, error: message };

  if (!environments.esProduccion && error?.stack) {
    payload.stack = error.stack;
  }

  return res.status(statusCode).json(payload);
}
