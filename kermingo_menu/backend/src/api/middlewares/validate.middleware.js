import { ZodError } from 'zod';
import { ValidationError } from '../utils/errors.js';

export function validateBody(schema) {
  return (req, _res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const detalles = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        return next(new ValidationError(`Error de validación en body: ${detalles}`));
      }
      next(error);
    }
  };
}

export function validateQuery(schema) {
  return (req, _res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const detalles = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        return next(new ValidationError(`Error de validación en query: ${detalles}`));
      }
      next(error);
    }
  };
}

export function validateParams(schema) {
  return (req, _res, next) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const detalles = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
        return next(new ValidationError(`Error de validación en params: ${detalles}`));
      }
      next(error);
    }
  };
}
