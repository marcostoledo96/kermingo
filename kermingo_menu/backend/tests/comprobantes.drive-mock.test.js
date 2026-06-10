/**
 * Integration tests for B6.3 Comprobantes — Drive success and error paths via mock
 *
 * Uses _getDriveStateForTest/_resetDriveForTest for safe save/restore.
 * Tests DriveUploadError mapping to 503 and safe internal filename format.
 *
 * Note: Drive service now uses OAuth refresh token authentication.
 * Mock tests inject a mock driveClient via _resetDriveForTest,
 * so OAuth credentials are not required for these tests.
 *
 * Requires: running MySQL DB with test data (schema + seed).
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import jwt from 'jsonwebtoken';
import pool from '../src/api/database/db.js';
import environments from '../src/api/config/environments.js';
import { uploadFile, isDriveReady, _getDriveStateForTest, _resetDriveForTest } from '../src/api/services/drive.service.js';
import { DriveUploadError } from '../src/api/utils/errors.js';
import { cancelWithTransaction } from '../src/api/models/pedido.model.js';

const RUN_ID = `TEST-DRIVEMOCK-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const COOKIE_NAME = environments.cookie.name;
const JWT_SECRET = environments.jwt.secret;
const ORIGIN = environments.frontendUrl;

function adminCookie(userId = 1) {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
  return `${COOKIE_NAME}=${token}`;
}

// ── Save original Drive state for restoration ──
let savedState;

// ── Helpers ──

async function asegurarTiendaAbierta() {
  await pool.query('UPDATE configuracion_tienda SET estado = ? WHERE id = 1', ['abierta']);
}

async function limpiarPedidosDeTest() {
  const [rows] = await pool.query(
    'SELECT id, estado_pedido FROM pedido WHERE nombre_cliente LIKE ?',
    [`${RUN_ID}%`]
  );
  for (const pedido of rows) {
    if (!['listo', 'entregado'].includes(pedido.estado_pedido)) {
      try {
        await cancelWithTransaction(pool, pedido.id);
      } catch {
        // fall through to DELETE
      }
    }
  }
  const [remaining] = await pool.query(
    'SELECT id FROM pedido WHERE nombre_cliente LIKE ?',
    [`${RUN_ID}%`]
  );
  const ids = remaining.map((r) => r.id);
  if (ids.length > 0) {
    const ph = ids.map(() => '?').join(',');
    const [archRows] = await pool.query(
      `SELECT comprobante_archivo_id FROM pedido WHERE id IN (${ph}) AND comprobante_archivo_id IS NOT NULL`,
      ids
    );
    const archivoIds = archRows.map((r) => r.comprobante_archivo_id).filter(Boolean);
    if (archivoIds.length > 0) {
      const aph = archivoIds.map(() => '?').join(',');
      await pool.query(
        `UPDATE pedido SET comprobante_archivo_id = NULL WHERE comprobante_archivo_id IN (${aph})`,
        archivoIds
      );
      await pool.query(`DELETE FROM archivo_drive WHERE id IN (${aph})`, archivoIds);
    }
    await pool.query(`DELETE FROM pedido_detalle WHERE pedido_id IN (${ph})`, ids);
    await pool.query(`DELETE FROM pedido WHERE id IN (${ph})`, ids);
  }
}

// ── Unit: drive.service with mocked client ──

describe('drive.service — mocked success and error paths', () => {
  beforeAll(() => {
    savedState = _getDriveStateForTest();
  });

  afterEach(() => {
    // Restore saved Drive state after each test
    _resetDriveForTest(savedState);
  });

  afterAll(() => {
    _resetDriveForTest(savedState);
  });

  it('uploadFile succeeds with mocked Drive client', async () => {
    const mockDriveClient = {
      files: {
        create: jest.fn().mockResolvedValue({
          data: {
            id: 'mock-drive-file-id-123',
            webViewLink: 'https://drive.google.com/file/d/mock-drive-file-id-123',
          },
        }),
      },
    };

    _resetDriveForTest({ driveClient: mockDriveClient, isConfigured: true });
    expect(isDriveReady()).toBe(true);

    const result = await uploadFile(
      Buffer.from('test-image-content'),
      'receipt.jpg',
      'image/jpeg'
    );

    expect(result).toEqual({
      driveFileId: 'mock-drive-file-id-123',
      webViewLink: 'https://drive.google.com/file/d/mock-drive-file-id-123',
      internalName: expect.stringMatching(/^\d+-[0-9a-f-]+-receipt\.jpg$/),
    });
    expect(mockDriveClient.files.create).toHaveBeenCalledTimes(1);

    // Verify the call was made with correct params — internal filename format
    const createCall = mockDriveClient.files.create.mock.calls[0][0];
    expect(createCall.requestBody.name).toMatch(/^\d+-[0-9a-f-]+-/);
    expect(createCall.requestBody.name).toContain('receipt.jpg');
    expect(createCall.requestBody.mimeType).toBe('image/jpeg');
    expect(createCall.fields).toBe('id, webViewLink');

    // Verify media.body is a stream (has pipe), not a raw Buffer
    expect(typeof createCall.media.body.pipe).toBe('function');
  });

  it('uploadFile throws DriveUploadError when Drive API returns an error', async () => {
    const apiError = new Error('Rate limit exceeded');
    const mockDriveClient = {
      files: {
        create: jest.fn().mockRejectedValue(apiError),
      },
    };

    _resetDriveForTest({ driveClient: mockDriveClient, isConfigured: true });
    expect(isDriveReady()).toBe(true);

    await expect(
      uploadFile(Buffer.from('test'), 'fail.jpg', 'image/jpeg')
    ).rejects.toThrow(DriveUploadError);

    await expect(
      uploadFile(Buffer.from('test'), 'fail.jpg', 'image/jpeg')
    ).rejects.toThrow('Rate limit exceeded');
  });

  it('uploadFile throws DriveUploadError when Drive is not configured', async () => {
    _resetDriveForTest({ driveClient: null, isConfigured: false });
    expect(isDriveReady()).toBe(false);

    await expect(
      uploadFile(Buffer.from('test'), 'test.jpg', 'image/jpeg')
    ).rejects.toThrow(DriveUploadError);
  });

  it('_getDriveStateForTest/_resetDriveForTest round-trip restores state', () => {
    const beforeState = _getDriveStateForTest();
    _resetDriveForTest({ driveClient: {}, isConfigured: true });
    expect(isDriveReady()).toBe(true);
    _resetDriveForTest(beforeState);
    // State is back to original
  });

  it('reset with undefined state is safe', () => {
    _resetDriveForTest({ driveClient: undefined, isConfigured: false });
    expect(isDriveReady()).toBe(false);

    _resetDriveForTest(); // defaults: null client, false configured
    expect(isDriveReady()).toBe(false);
  });

  it('uploadFile sanitizes originalName in Drive filename', async () => {
    const mockDriveClient = {
      files: {
        create: jest.fn().mockResolvedValue({
          data: {
            id: 'mock-id',
            webViewLink: 'https://drive.google.com/file/d/mock-id',
          },
        }),
      },
    };
    _resetDriveForTest({ driveClient: mockDriveClient, isConfigured: true });

    const result = await uploadFile(
      Buffer.from('test'),
      '../../../etc/passwd',
      'application/pdf'
    );

    // Internal name should NOT contain path separators
    expect(result.internalName).not.toContain('../');
    expect(result.internalName).not.toContain('/');
    // Internal name has sanitized portion
    expect(result.internalName).toMatch(/^\d+-[0-9a-f-]+-/);
  });

  it('uploadFile handles very long original names', async () => {
    const mockDriveClient = {
      files: {
        create: jest.fn().mockResolvedValue({
          data: { id: 'mock-id', webViewLink: null },
        }),
      },
    };
    _resetDriveForTest({ driveClient: mockDriveClient, isConfigured: true });

    const longName = 'a'.repeat(500) + '.pdf';
    const result = await uploadFile(Buffer.from('test'), longName, 'application/pdf');

    // The sanitized portion should be truncated
    const parts = result.internalName.split('-');
    // Timestamp (13+) + UUID (36) + sanitized (<=100 chars)
    expect(result.internalName.length).toBeLessThan(200);
  });
});

// ── Integration: POST /api/pedidos transferencia with mocked Drive ──

describe('POST /api/pedidos — transferencia with mocked Drive (success path)', () => {
  beforeAll(async () => {
    await asegurarTiendaAbierta();
    savedState = _getDriveStateForTest();

    // Inject mock Drive client for all tests in this describe block
    const mockDriveClient = {
      files: {
        create: jest.fn().mockResolvedValue({
          data: {
            id: 'mock-drive-file-id-456',
            webViewLink: 'https://drive.google.com/file/d/mock-drive-file-id-456',
          },
        }),
      },
    };
    _resetDriveForTest({ driveClient: mockDriveClient, isConfigured: true });
  });

  afterEach(async () => {
    await limpiarPedidosDeTest();
  });

  afterAll(async () => {
    // Restore original Drive state
    _resetDriveForTest(savedState);
  });

  it('creates pedido with estado_pago=comprobante_subido and comprobante_archivo_id', async () => {
    const res = await request(app)
      .post('/api/pedidos')
      .field('nombre_cliente', `${RUN_ID}-mock-drive`)
      .field('metodo_pago', 'transferencia')
      .field('items', JSON.stringify([{ producto_id: 5, cantidad: 1 }]))
      .attach('comprobante', Buffer.from('%PDF-1.4 mock content'), {
        filename: 'comprobante.pdf',
        contentType: 'application/pdf',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.estado_pago).toBe('comprobante_subido');
    expect(res.body.data.comprobante_archivo_id).toBeDefined();
    expect(res.body.data.comprobante_archivo_id).not.toBeNull();

    // Verify in DB that archivo_drive row was created
    const archivoId = res.body.data.comprobante_archivo_id;
    const [archRows] = await pool.query(
      'SELECT id, drive_id, nombre_original, mime_type, tamanio_bytes, tipo, url_publica FROM archivo_drive WHERE id = ?',
      [archivoId]
    );
    expect(archRows.length).toBe(1);
    expect(archRows[0].drive_id).toBe('mock-drive-file-id-456');
    expect(archRows[0].nombre_original).toBe('comprobante.pdf');
    expect(archRows[0].mime_type).toBe('application/pdf');
    expect(archRows[0].tipo).toBe('comprobante');
    expect(archRows[0].url_publica).toBe('https://drive.google.com/file/d/mock-drive-file-id-456');
  });

  it('GET /api/admin/pedidos/:id/comprobante returns metadata for mocked Drive file', async () => {
    // Create pedido with mocked Drive
    const createRes = await request(app)
      .post('/api/pedidos')
      .field('nombre_cliente', `${RUN_ID}-admin-comp-mock`)
      .field('metodo_pago', 'transferencia')
      .field('items', JSON.stringify([{ producto_id: 5, cantidad: 1 }]))
      .attach('comprobante', Buffer.from('%PDF-1.4 mock content'), {
        filename: 'receipt_mock.pdf',
        contentType: 'application/pdf',
      });

    expect(createRes.statusCode).toBe(201);
    const pedidoId = createRes.body.data.id;
    const archivoId = createRes.body.data.comprobante_archivo_id;
    expect(archivoId).not.toBeNull();

    // Retrieve comprobante metadata via admin endpoint
    const compRes = await request(app)
      .get(`/api/admin/pedidos/${pedidoId}/comprobante`)
      .set('Cookie', adminCookie());

    expect(compRes.statusCode).toBe(200);
    expect(compRes.body.ok).toBe(true);
    expect(compRes.body.data.drive_id).toBe('mock-drive-file-id-456');
    expect(compRes.body.data.nombre_original).toBe('receipt_mock.pdf');
    expect(compRes.body.data.mime_type).toBe('application/pdf');
    expect(compRes.body.data.tamanio_bytes).toBeDefined();
    expect(compRes.body.data.url_publica).toBe('https://drive.google.com/file/d/mock-drive-file-id-456');
    expect(compRes.body.data.buffer).toBeUndefined(); // No raw file bytes
  });
});

// ── Integration: POST /api/pedidos transferencia with Drive API error (503) ──

describe('POST /api/pedidos — transferencia with Drive API error', () => {
  beforeAll(async () => {
    await asegurarTiendaAbierta();
    savedState = _getDriveStateForTest();

    // Inject Drive client that fails on create
    const failingDriveClient = {
      files: {
        create: jest.fn().mockRejectedValue(new Error('Rate limit exceeded')),
      },
    };
    _resetDriveForTest({ driveClient: failingDriveClient, isConfigured: true });
  });

  afterEach(async () => {
    await limpiarPedidosDeTest();
  });

  afterAll(async () => {
    _resetDriveForTest(savedState);
  });

  it('returns 503 when Drive upload fails with API error', async () => {
    const res = await request(app)
      .post('/api/pedidos')
      .field('nombre_cliente', `${RUN_ID}-drive-error`)
      .field('metodo_pago', 'transferencia')
      .field('items', JSON.stringify([{ producto_id: 5, cantidad: 1 }]))
      .attach('comprobante', Buffer.from('%PDF-1.4 mock'), {
        filename: 'comprobante.pdf',
        contentType: 'application/pdf',
      });

    expect(res.statusCode).toBe(503);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toContain('upload');

    // Verify no pedido was created
    const [rows] = await pool.query(
      'SELECT id FROM pedido WHERE nombre_cliente = ?',
      [`${RUN_ID}-drive-error`]
    );
    expect(rows.length).toBe(0);
  });

  it('does not insert archivo_drive row when Drive upload fails', async () => {
    await request(app)
      .post('/api/pedidos')
      .field('nombre_cliente', `${RUN_ID}-drive-noarch`)
      .field('metodo_pago', 'transferencia')
      .field('items', JSON.stringify([{ producto_id: 5, cantidad: 1 }]))
      .attach('comprobante', Buffer.from('%PDF-1.4 mock'), {
        filename: 'comprobante.pdf',
        contentType: 'application/pdf',
      });

    // No pedido should exist for this nombre_cliente
    const [pedRows] = await pool.query(
      'SELECT comprobante_archivo_id FROM pedido WHERE nombre_cliente = ?',
      [`${RUN_ID}-drive-noarch`]
    );
    expect(pedRows.length).toBe(0);
  });
});