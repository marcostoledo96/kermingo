import multer from 'multer';
import path from 'node:path';
import { assertAllowedFileSignature } from '../utils/file-signature.utils.js';
import { ValidationError } from '../utils/errors.js';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const ALLOWED_PRODUCT_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

const ALLOWED_RECEIPT_EXTENSIONS = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

function getSupportedReceiptMimeError(file) {
  return `Tipo de archivo no soportado: ${file?.mimetype || 'indefinido'}. Solo se permiten JPG, PNG, WEBP y PDF.`;
}

function getReceiptExtension(file) {
  const fileName = file?.originalname || '';
  return path.extname(fileName).toLowerCase();
}

function isSupportedReceiptExtension(file) {
  const extension = getReceiptExtension(file);
  return !!ALLOWED_RECEIPT_EXTENSIONS[extension];
}

export function validateReceiptUploadMetadata(file) {
  if (!isSupportedReceiptExtension(file)) {
    throw new ValidationError(`Extension de archivo no soportada: ${file?.originalname || 'archivo'}. Solo se permiten JPG, PNG, WEBP y PDF.`);
  }

  if (file.mimetype && !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new ValidationError(getSupportedReceiptMimeError(file));
  }

  const extension = getReceiptExtension(file);
  const expectedMime = ALLOWED_RECEIPT_EXTENSIONS[extension];
  if (file.mimetype && expectedMime !== file.mimetype) {
    throw new ValidationError(
      `La extensión del archivo (${extension}) no coincide con el tipo declarado (${file.mimetype}).`
    );
  }
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.memoryStorage();

function fileFilter(_req, file, cb) {
  try {
    validateReceiptUploadMetadata(file);
    cb(null, true);
  } catch (err) {
    cb(err, false);
  }
}

/**
 * Validates receipt file by extension and, when present, MIME + magic bytes.
 */
export function assertMagicBytes(req, _res, next) {
  if (!req.file) {
    return next();
  }

  try {
    validateReceiptUploadMetadata(req.file);

    if (req.file.mimetype) {
      assertAllowedFileSignature(req.file.buffer, req.file.mimetype);
    }

    next();
  } catch (err) {
    next(err);
  }
}

function productImageFileFilter(_req, file, cb) {
  if (ALLOWED_PRODUCT_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no soportado: ${file.mimetype}. Solo se permiten JPG, PNG y WEBP.`), false);
  }
}

export const uploadComprobante = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter,
});

export const uploadProductoImagen = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: productImageFileFilter,
});

/**
 * Validates that req.file exists, has an allowed image mime type, and matches magic bytes.
 */
export function assertProductImageMagicBytes(req, res, next) {
  if (!req.file) {
    return next(new ValidationError('Archivo de imagen requerido'));
  }
  if (!ALLOWED_PRODUCT_IMAGE_MIME_TYPES.includes(req.file.mimetype)) {
    return next(new ValidationError(`Tipo de archivo no soportado: ${req.file.mimetype}. Solo se permiten JPG, PNG y WEBP.`));
  }
  try {
    assertAllowedFileSignature(req.file.buffer, req.file.mimetype);
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Error handler for Multer errors (LIMIT_FILE_SIZE, etc.).
 * Should be used as middleware after routes that use uploadComprobante or uploadProductoImagen.
 */
export function handleMulterError(err, _req, res, next) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      ok: false,
      error: 'El archivo supera el límite de 5 MB',
    });
  }
  if (err.message?.includes('no soportado')) {
    return res.status(400).json({
      ok: false,
      error: err.message,
    });
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({
      ok: false,
      error: `Error de upload: ${err.message}`,
    });
  }
  next(err);
}

export { assertAllowedFileSignature };
