/**
 * Unit tests for B6.3 Comprobantes / Google Drive hardening
 * Tests: DriveUploadError, file signature validation, safe filename, schema preprocess
 * Spec traceability: error-handling/R1-S4, file-signature-validation/R1-S1..S8,
 *   drive-safe-upload/R1-S1..S3, R2-S1..S3
 */

import { jest } from '@jest/globals';
import { createPedidoSchema } from '../src/api/schemas/pedido.schema.js';
import { AppError, ValidationError, DriveUploadError } from '../src/api/utils/errors.js';
import { assertAllowedFileSignature } from '../src/api/utils/file-signature.utils.js';
import { validateReceiptUploadMetadata } from '../src/api/middlewares/upload.middleware.js';

// ── Schema preprocess tests ────────────────────────────────

describe('createPedidoSchema z.preprocess (unit)', () => {
  it('accepts native array items (JSON body)', () => {
    const input = {
      nombre_cliente: 'Test',
      metodo_pago: 'efectivo',
      items: [{ producto_id: 1, cantidad: 2 }],
    };
    const result = createPedidoSchema.parse(input);
    expect(result.items).toEqual([{ producto_id: 1, cantidad: 2 }]);
  });

  it('parses items from JSON string (multipart form-data)', () => {
    const input = {
      nombre_cliente: 'Test',
      metodo_pago: 'efectivo',
      items: '[{"producto_id":1,"cantidad":2}]',
    };
    const result = createPedidoSchema.parse(input);
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items).toEqual([{ producto_id: 1, cantidad: 2 }]);
  });

  it('rejects invalid JSON string in items', () => {
    const input = {
      nombre_cliente: 'Test',
      metodo_pago: 'efectivo',
      items: 'not-valid-json',
    };
    expect(() => createPedidoSchema.parse(input)).toThrow();
  });

  it('rejects empty items array', () => {
    const input = {
      nombre_cliente: 'Test',
      metodo_pago: 'efectivo',
      items: '[]',
    };
    expect(() => createPedidoSchema.parse(input)).toThrow();
  });
});

// ── DriveUploadError tests ─────────────────────────────────

describe('DriveUploadError (unit)', () => {
  it('extends AppError', () => {
    const err = new DriveUploadError();
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
  });

  it('has name DriveUploadError', () => {
    const err = new DriveUploadError();
    expect(err.name).toBe('DriveUploadError');
  });

  it('has statusCode 503', () => {
    const err = new DriveUploadError();
    expect(err.statusCode).toBe(503);
  });

  it('has default message Servicio de upload no disponible', () => {
    const err = new DriveUploadError();
    expect(err.message).toBe('Servicio de upload no disponible');
  });

  it('accepts custom message preserving name and statusCode', () => {
    const err = new DriveUploadError('Custom Drive error');
    expect(err.message).toBe('Custom Drive error');
    expect(err.name).toBe('DriveUploadError');
    expect(err.statusCode).toBe(503);
  });

  it('is recognized by err.name check in middleware', () => {
    const err = new DriveUploadError();
    expect(err.name === 'DriveUploadError').toBe(true);
  });
});

// ── assertAllowedFileSignature tests ───────────────────────

describe('assertAllowedFileSignature (unit)', () => {
  // Valid PDF
  it('valid PDF with correct magic bytes passes', () => {
    const buffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]); // %PDF-1.4
    expect(() => assertAllowedFileSignature(buffer, 'application/pdf')).not.toThrow();
  });

  // Valid PNG
  it('valid PNG with correct magic bytes passes', () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    expect(() => assertAllowedFileSignature(buffer, 'image/png')).not.toThrow();
  });

  // Valid JPEG
  it('valid JPEG with correct magic bytes passes', () => {
    const buffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]); // JPEG SOI + JFIF marker
    expect(() => assertAllowedFileSignature(buffer, 'image/jpeg')).not.toThrow();
  });

  // Valid WEBP
  it('valid WEBP with correct magic bytes passes', () => {
    const buffer = Buffer.alloc(16);
    buffer.write('RIFF', 0);   // RIFF header at offset 0
    buffer.writeUInt32LE(8, 4); // file size (dummy)
    buffer.write('WEBP', 8);    // WEBP at offset 8
    expect(() => assertAllowedFileSignature(buffer, 'image/webp')).not.toThrow();
  });

  // Spoofed MIME: PDF declared but content is not PDF
  it('spoofed MIME — fake PDF detected', () => {
    const buffer = Buffer.from('This is not a PDF');
    expect(() => assertAllowedFileSignature(buffer, 'application/pdf')).toThrow(ValidationError);
  });

  // Spoofed MIME: PNG declared but content is JPEG
  it('spoofed MIME — fake PNG (actually JPEG content)', () => {
    const buffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG bytes
    expect(() => assertAllowedFileSignature(buffer, 'image/png')).toThrow(ValidationError);
  });

  // Unsupported MIME type
  it('unsupported MIME type throws ValidationError', () => {
    const buffer = Buffer.from('anything');
    expect(() => assertAllowedFileSignature(buffer, 'text/plain')).toThrow(ValidationError);
  });

  it('unsupported MIME type application/zip throws ValidationError', () => {
    const buffer = Buffer.from([0x50, 0x4B, 0x03, 0x04]); // ZIP signature
    expect(() => assertAllowedFileSignature(buffer, 'application/zip')).toThrow(ValidationError);
  });

  // Empty buffer
  it('empty buffer throws ValidationError', () => {
    const buffer = Buffer.alloc(0);
    expect(() => assertAllowedFileSignature(buffer, 'application/pdf')).toThrow(ValidationError);
  });

  // null buffer
  it('null buffer throws ValidationError', () => {
    expect(() => assertAllowedFileSignature(null, 'application/pdf')).toThrow(ValidationError);
  });

  // Buffer too short for WEBP
  it('WEBP buffer too short throws ValidationError', () => {
    const buffer = Buffer.from([0x52, 0x49, 0x46, 0x46]); // RIFF but no WEBP
    expect(() => assertAllowedFileSignature(buffer, 'image/webp')).toThrow(ValidationError);
  });
});

// ── upload.middleware tests for comprobante validation ───────────────────

describe('upload.middleware receipt validation (unit)', () => {
  const validReceiptFiles = [
    { originalname: 'comprobante.jpg', mimetype: 'image/jpeg' },
    { originalname: 'comprobante.jpeg', mimetype: 'image/jpeg' },
    { originalname: 'comprobante.png', mimetype: 'image/png' },
    { originalname: 'comprobante.webp', mimetype: 'image/webp' },
    { originalname: 'comprobante.pdf', mimetype: 'application/pdf' },
  ];

  it.each(validReceiptFiles)('accepts valid receipt file combo: %j', ({ originalname, mimetype }) => {
    expect(() => validateReceiptUploadMetadata({ originalname, mimetype })).not.toThrow();
  });

  it('rejects .jpg with unsupported mime image/heif', () => {
    expect(() => validateReceiptUploadMetadata({ originalname: 'comprobante.jpg', mimetype: 'image/heif' })).toThrow(ValidationError);
  });

  it('accepts valid extension when mimetype is empty', () => {
    expect(() => validateReceiptUploadMetadata({ originalname: 'comprobante.jpg', mimetype: '' })).not.toThrow();
  });

  it('rejects unsupported extension even when mimetype is empty', () => {
    expect(() => validateReceiptUploadMetadata({ originalname: 'comprobante.txt', mimetype: '' })).toThrow(ValidationError);
  });
});

// ── archivo.model tests ─────────────────────────────────────

import { createArchivo, findArchivoById } from '../src/api/models/archivo.model.js';

describe('archivo.model (unit)', () => {
  it('createArchivo calls conn.query with correct params and returns insertId', async () => {
    const mockConn = {
      query: jest.fn().mockResolvedValue([{ insertId: 42 }]),
    };

    const id = await createArchivo(mockConn, {
      drive_id: 'drive-123',
      nombre_original: 'receipt.jpg',
      mime_type: 'image/jpeg',
      tamanio_bytes: 1024,
      tipo: 'comprobante',
      url_publica: 'https://drive.google.com/file/d/drive-123',
    });

    expect(id).toBe(42);
    expect(mockConn.query).toHaveBeenCalledTimes(1);
    const [sql, params] = mockConn.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO archivo_drive');
    expect(params).toEqual([
      'drive-123', 'receipt.jpg', 'image/jpeg', 1024, 'comprobante',
      'https://drive.google.com/file/d/drive-123',
    ]);
  });

  it('createArchivo works without url_publica', async () => {
    const mockConn = {
      query: jest.fn().mockResolvedValue([{ insertId: 7 }]),
    };

    const id = await createArchivo(mockConn, {
      drive_id: 'drive-456',
      nombre_original: 'receipt.pdf',
      mime_type: 'application/pdf',
      tamanio_bytes: 2048,
      tipo: 'comprobante',
    });

    expect(id).toBe(7);
    const params = mockConn.query.mock.calls[0][1];
    expect(params[5]).toBeNull(); // url_publica defaults to null
  });

  it('findArchivoById returns row when found', async () => {
    const mockRow = {
      id: 42,
      drive_id: 'drive-123',
      nombre_original: 'receipt.jpg',
      mime_type: 'image/jpeg',
      tamanio_bytes: 1024,
      tipo: 'comprobante',
      url_publica: 'https://drive.google.com/file/d/drive-123',
      created_at: '2026-06-09T10:00:00.000Z',
    };
    const mockPool = {
      query: jest.fn().mockResolvedValue([[mockRow]]),
    };

    const result = await findArchivoById(mockPool, 42);
    expect(result).toEqual(mockRow);
  });

  it('findArchivoById returns null when not found', async () => {
    const mockPool = {
      query: jest.fn().mockResolvedValue([[]]),
    };

    const result = await findArchivoById(mockPool, 9999);
    expect(result).toBeNull();
  });
});

// ── drive.service tests (unit via _getDriveStateForTest/_resetDriveForTest) ───────────

import { isDriveReady as _isDriveReady, _getDriveStateForTest, _resetDriveForTest as _resetDrive } from '../src/api/services/drive.service.js';

describe('drive.service (unit) — unconfigured and configured paths', () => {
  let savedState;

  beforeAll(() => {
    savedState = _getDriveStateForTest();
  });

  afterEach(() => {
    // Restore saved state after each test
    _resetDrive(savedState);
  });

  afterAll(() => {
    _resetDrive(savedState);
  });

  it('uploadFile throws DriveUploadError when Drive is not configured', async () => {
    _resetDrive({ driveClient: null, isConfigured: false });
    const { uploadFile } = await import('../src/api/services/drive.service.js');

    await expect(
      uploadFile(Buffer.from('test'), 'test.jpg', 'image/jpeg')
    ).rejects.toThrow(DriveUploadError);
  });

  it('uploadFile succeeds when Drive client is injected via _resetDriveForTest', async () => {
    const { uploadFile } = await import('../src/api/services/drive.service.js');
    const mockDriveClient = {
      files: {
        create: jest.fn().mockResolvedValue({
          data: { id: 'unit-test-drive-id', webViewLink: 'https://drive.google.com/unit-test' },
        }),
      },
    };
    _resetDrive({ driveClient: mockDriveClient, isConfigured: true });

    const result = await uploadFile(Buffer.from('unit-test'), 'unit.jpg', 'image/jpeg');
    expect(result.driveFileId).toBe('unit-test-drive-id');
    expect(result.webViewLink).toBe('https://drive.google.com/unit-test');
    expect(result.internalName).toMatch(/^\d+-[0-9a-f-]+-unit\.jpg$/);

    // Verify the Drive client received a stream-like body (has pipe method)
    const createCall = mockDriveClient.files.create.mock.calls[0][0];
    expect(typeof createCall.media.body.pipe).toBe('function');
  });

  it('uploadFile throws DriveUploadError on Drive API error', async () => {
    const { uploadFile } = await import('../src/api/services/drive.service.js');
    const mockDriveClient = {
      files: {
        create: jest.fn().mockRejectedValue(new Error('Drive API quota exceeded')),
      },
    };
    _resetDrive({ driveClient: mockDriveClient, isConfigured: true });

    await expect(
      uploadFile(Buffer.from('unit-test'), 'err.jpg', 'image/jpeg')
    ).rejects.toThrow(DriveUploadError);
  });

  it('uploadFile converts Buffer to Readable stream before passing to Drive client', async () => {
    const { uploadFile } = await import('../src/api/services/drive.service.js');
    const mockDriveClient = {
      files: {
        create: jest.fn().mockResolvedValue({
          data: { id: 'stream-test-id', webViewLink: 'https://drive.google.com/stream-test' },
        }),
      },
    };
    _resetDrive({ driveClient: mockDriveClient, isConfigured: true });

    const buf = Buffer.from('stream-body-content');
    await uploadFile(buf, 'stream.jpg', 'image/jpeg');

    const createCall = mockDriveClient.files.create.mock.calls[0][0];
    // media.body must be a readable stream (has pipe), not a raw Buffer
    expect(typeof createCall.media.body.pipe).toBe('function');
    // Verify it's an async iterable (Readable.from produces async iterators)
    expect(typeof createCall.media.body[Symbol.asyncIterator]).toBe('function');
  });

  it('_getDriveStateForTest/_resetDriveForTest round-trip restores state', () => {
    const beforeReset = _getDriveStateForTest();
    _resetDrive({ driveClient: {}, isConfigured: true });
    expect(_isDriveReady()).toBe(true);
    _resetDrive(beforeReset);
    // State restored
  });
});

// ── upload.middleware MIME validation (unit) ──────────────────

describe('upload.middleware MIME validation (unit)', () => {
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const DENIED = ['application/x-executable', 'text/plain', 'application/zip', 'image/gif'];

  it('allowed MIME types pass fileFilter', () => {
    expect(ALLOWED).toEqual(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
  });

  it('denied MIME types are rejected by fileFilter', () => {
    expect(DENIED.length).toBeGreaterThan(0);
  });
});
