import { ForbiddenError } from '../utils/errors.js';
import environments from '../config/environments.js';

const UNSAFE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

function safeOriginFromUrl(value) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function requireTrustedOrigin(req, _res, next) {
  if (!UNSAFE_METHODS.includes(req.method)) {
    return next();
  }

  const origin = req.get('origin');
  const referer = req.get('referer');
  if (origin && environments.isTrustedOrigin(origin)) {
    return next();
  }

  const refererOrigin = referer ? safeOriginFromUrl(referer) : null;

  if (!origin && refererOrigin && environments.isTrustedOrigin(refererOrigin)) {
    return next();
  }

  return next(new ForbiddenError('Origen no permitido'));
}
