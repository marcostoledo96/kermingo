import { ValidationError } from './errors.js';

/**
 * File signature (magic bytes) definitions for allowed upload types.
 * Each entry maps a MIME type to its expected byte signature at a specific offset.
 */
const FILE_SIGNATURES = {
  'application/pdf': {
    offset: 0,
    bytes: [0x25, 0x50, 0x44, 0x46], // %PDF
  },
  'image/png': {
    offset: 0,
    bytes: [0x89, 0x50, 0x4E, 0x47], // PNG signature
  },
  'image/jpeg': {
    offset: 0,
    bytes: [0xFF, 0xD8, 0xFF], // JPEG SOI + marker
  },
  'image/webp': {
    offset: 0,
    bytes: [0x52, 0x49, 0x46, 0x46], // RIFF header
    secondaryOffset: 8,
    secondaryBytes: [0x57, 0x45, 0x42, 0x50], // WEBP at offset 8
  },
};

/**
 * Validates that the actual file content matches its declared MIME type
 * by inspecting magic bytes (file signatures).
 *
 * @param {Buffer} buffer - The file buffer from Multer memoryStorage
 * @param {string} mimeType - The declared MIME type from the upload
 * @throws {ValidationError} If the buffer is empty, MIME type is unsupported,
 *   or the file content does not match the declared MIME type
 */
export function assertAllowedFileSignature(buffer, mimeType) {
  // Empty buffer check
  if (!buffer || buffer.length === 0) {
    throw new ValidationError('Archivo vacío: el archivo no tiene contenido');
  }

  const signature = FILE_SIGNATURES[mimeType];
  if (!signature) {
    throw new ValidationError(
      `Archivo invalido: el contenido no coincide con el tipo declarado`
    );
  }

  // Check primary signature bytes
  const { offset, bytes } = signature;
  for (let i = 0; i < bytes.length; i++) {
    if (buffer[offset + i] !== bytes[i]) {
      throw new ValidationError(
        `Archivo invalido: el contenido no coincide con el tipo declarado`
      );
    }
  }

  // Check secondary signature (for WEBP: "WEBP" at offset 8)
  if (signature.secondaryBytes) {
    const secOffset = signature.secondaryOffset;
    const secBytes = signature.secondaryBytes;
    for (let i = 0; i < secBytes.length; i++) {
      if (buffer[secOffset + i] !== secBytes[i]) {
        throw new ValidationError(
          `Archivo invalido: el contenido no coincide con el tipo declarado`
        );
      }
    }
  }
}

/**
 * Express middleware that validates file magic bytes after Multer has populated req.file.
 * If no file is present (e.g., efectivo orders), the middleware passes through.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function assertMagicBytes(req, res, next) {
  if (!req.file) return next();
  try {
    assertAllowedFileSignature(req.file.buffer, req.file.mimetype);
    next();
  } catch (err) {
    next(err);
  }
}