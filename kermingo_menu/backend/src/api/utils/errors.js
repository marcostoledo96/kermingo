export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.esOperacional = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Error de validación') {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(message, 404);
  }
}

export class AuthError extends AppError {
  constructor(message = 'No autorizado') {
    super(message, 401);
  }
}

export class InsufficientStockError extends AppError {
  constructor(message = 'Stock insuficiente') {
    super(message, 409);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado') {
    super(message, 403);
  }
}

export class DriveUploadError extends AppError {
  constructor(message = 'Servicio de upload no disponible') {
    super(message, 503);
    this.name = 'DriveUploadError';
  }
}
