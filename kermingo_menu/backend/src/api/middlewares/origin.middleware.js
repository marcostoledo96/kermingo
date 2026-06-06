import { AuthError } from '../utils/errors.js';
import environments from '../config/environments.js';

const UNSAFE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

export function requireTrustedOrigin(req, _res, next) {
  if (!UNSAFE_METHODS.includes(req.method)) {
    return next();
  }

  const origin = req.get('origin');
  const referer = req.get('referer');

  if (origin && origin === environments.frontendUrl) {
    return next();
  }

  if (!origin && referer && referer.startsWith(environments.frontendUrl)) {
    return next();
  }

  return next(new AuthError('Origen no permitido'));
}
