import { jest } from '@jest/globals';
import request from 'supertest';
import { Readable } from 'stream';
import app from '../src/app.js';
import jwt from 'jsonwebtoken';
import pool from '../src/api/database/db.js';
import environments from '../src/api/config/environments.js';
import { uploadFile, _getDriveStateForTest, _resetDriveForTest } from '../src/api/services/drive.service.js';

const COOKIE_NAME = environments.cookie.name;
const JWT_SECRET = environments.jwt.secret;
const ORIGIN = environments.frontendUrl;

const TEST_RUN_ID = `test-product-image-${Date.now()}`;

function adminCookie(userId = 1) {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
  return `${COOKIE_NAME}=${token}`;
}

// 1x1 transparent PNG file hex
const PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

/**
 * Helper: create a temporary product via the admin API.
 * Returns the product ID from the API response.
 */
async function createTempProduct(suffix = '1') {
  const res = await request(app)
    .post('/api/admin/productos')
    .set('Cookie', adminCookie())
    .set('Origin', ORIGIN)
    .send({
      nombre: `${TEST_RUN_ID}-prod-${suffix}`,
      descripcion: 'Producto temporal para test de imagen',
      precio: 999,
      tipo: 'comida',
      stock_limitado: 1,
      stock_actual: 10,
      stock_minimo_alerta: 2,
      activo: 1,
      categorias: ['Merienda'],
    });

  if (res.statusCode !== 201 || !res.body?.data?.id) {
    throw new Error(`Failed to create temp product: ${res.statusCode} ${JSON.stringify(res.body)}`);
  }
  return res.body.data.id;
}

/**
 * Helper: clean up all test-created products and their related data.
 */
async function cleanupTempProducts() {
  const [rows] = await pool.query(
    'SELECT id FROM producto WHERE nombre LIKE ?',
    [`${TEST_RUN_ID}%`]
  );
  const ids = rows.map((r) => r.id);

  if (ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    await pool.query(
      `DELETE FROM producto_categoria WHERE producto_id IN (${placeholders})`,
      ids
    );
    await pool.query(
      `DELETE FROM producto WHERE id IN (${placeholders})`,
      ids
    );
  }

  // Clean up test-created archivo_drive rows
  await pool.query(
    "DELETE FROM archivo_drive WHERE tipo = 'producto_imagen' AND drive_id LIKE ?",
    [`${TEST_RUN_ID}%`]
  );
}

describe('Product Image Endpoints', () => {
  let savedState;
  let tempProductId;
  let product1OriginalImagenId;

  beforeAll(async () => {
    savedState = _getDriveStateForTest();

    // Capture product id=1's imagen_archivo_id BEFORE any test runs
    const [rows] = await pool.query('SELECT imagen_archivo_id FROM producto WHERE id = 1');
    product1OriginalImagenId = rows[0]?.imagen_archivo_id ?? null;

    // Create a temporary product for image tests
    tempProductId = await createTempProduct();
  });

  afterEach(async () => {
    // Restore saved Drive state
    _resetDriveForTest(savedState);

    // Reset the temp product's imagen_archivo_id to NULL
    // (safe: only touches our test-created product)
    await pool.query('UPDATE producto SET imagen_archivo_id = NULL WHERE id = ?', [tempProductId]);

    // Clean up test-created archivo_drive rows
    await pool.query(
      "DELETE FROM archivo_drive WHERE tipo = 'producto_imagen' AND drive_id LIKE ?",
      [`${TEST_RUN_ID}%`]
    );

    // REGRESSION GUARD: product id=1 must never be mutated by image tests
    const [check] = await pool.query('SELECT imagen_archivo_id FROM producto WHERE id = 1');
    expect(check[0].imagen_archivo_id).toBe(product1OriginalImagenId);
  });

  afterAll(async () => {
    _resetDriveForTest(savedState);

    // Full cleanup: remove temp product and its related data
    await cleanupTempProducts();

    // Final regression guard
    const [finalCheck] = await pool.query('SELECT imagen_archivo_id FROM producto WHERE id = 1');
    expect(finalCheck[0].imagen_archivo_id).toBe(product1OriginalImagenId);

    await pool.end();
  });

  describe('GET /api/productos y /api/productos/:id', () => {
    it('GET /api/productos includes null imagen_url for temp product by default', async () => {
      const res = await request(app).get('/api/productos');
      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);

      const tempProd = res.body.data.find(p => p.id === tempProductId);
      expect(tempProd).toBeDefined();
      expect(tempProd).toHaveProperty('imagen_url');
      expect(tempProd.imagen_url).toBeNull();
    });

    it('returns imagen_url when product has an associated image', async () => {
      // Create a dummy image in archivo_drive
      const [insertResult] = await pool.query(
        `INSERT INTO archivo_drive (drive_id, nombre_original, mime_type, tamanio_bytes, tipo)
         VALUES (?, ?, ?, ?, ?)`,
        [`${TEST_RUN_ID}-mock-drive-id-123`, 'test-image.webp', 'image/webp', 1024, 'producto_imagen']
      );
      const archivoId = insertResult.insertId;
      await pool.query('UPDATE producto SET imagen_archivo_id = ? WHERE id = ?', [archivoId, tempProductId]);

      const res = await request(app).get('/api/productos');
      expect(res.statusCode).toBe(200);

      const tempProd = res.body.data.find(p => p.id === tempProductId);
      expect(tempProd).toBeDefined();
      expect(tempProd.imagen_url).toContain(`/api/productos/${tempProductId}/imagen?v=${archivoId}`);
      expect(tempProd.imagen_nombre_original).toBe('test-image.webp');
      expect(tempProd.imagen_mime_type).toBe('image/webp');
      expect(tempProd.imagen_tamanio_bytes).toBe(1024);
    });
  });

  describe('GET /api/productos/:id/imagen', () => {
    it('returns 404 if product has no image', async () => {
      const res = await request(app).get(`/api/productos/${tempProductId}/imagen`);
      expect(res.statusCode).toBe(404);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toContain('no encontrada');
    });

    it('returns image stream with webp headers', async () => {
      // Create a dummy image in archivo_drive
      const [insertResult] = await pool.query(
        `INSERT INTO archivo_drive (drive_id, nombre_original, mime_type, tamanio_bytes, tipo)
         VALUES (?, ?, ?, ?, ?)`,
        [`${TEST_RUN_ID}-mock-drive-id-456`, 'test.webp', 'image/webp', 2048, 'producto_imagen']
      );
      const archivoId = insertResult.insertId;
      await pool.query('UPDATE producto SET imagen_archivo_id = ? WHERE id = ?', [archivoId, tempProductId]);

      // Mock Drive client
      const mockDriveClient = {
        files: {
          get: jest.fn().mockImplementation(() => {
            return Promise.resolve({
              data: Readable.from(Buffer.from('webp-fake-bytes')),
            });
          }),
        },
      };
      _resetDriveForTest({ driveClient: mockDriveClient, isConfigured: true });

      const res = await request(app)
        .get(`/api/productos/${tempProductId}/imagen`)
        .buffer();
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('image/webp');
      expect(res.headers['cache-control']).toContain('public');
      expect(res.headers['content-disposition']).toContain(`inline; filename="producto-${tempProductId}.webp"`);
      expect(res.body.toString()).toBe('webp-fake-bytes');
    });

    it('returns 503 if Google Drive read fails', async () => {
      const [insertResult] = await pool.query(
        `INSERT INTO archivo_drive (drive_id, nombre_original, mime_type, tamanio_bytes, tipo)
         VALUES (?, ?, ?, ?, ?)`,
        [`${TEST_RUN_ID}-mock-fail-id`, 'test.webp', 'image/webp', 2048, 'producto_imagen']
      );
      const archivoId = insertResult.insertId;
      await pool.query('UPDATE producto SET imagen_archivo_id = ? WHERE id = ?', [archivoId, tempProductId]);

      // Mock Drive client to fail
      const mockDriveClient = {
        files: {
          get: jest.fn().mockRejectedValue(new Error('Drive API failure')),
        },
      };
      _resetDriveForTest({ driveClient: mockDriveClient, isConfigured: true });

      const res = await request(app).get(`/api/productos/${tempProductId}/imagen`);
      expect(res.statusCode).toBe(503);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toContain('lectura');
    });
  });

  describe('POST /api/admin/productos/:id/imagen', () => {
    it('requires admin token and trusted origin', async () => {
      // Auth/origin failures never touch the DB, so using tempProductId is safe
      const res = await request(app)
        .post(`/api/admin/productos/${tempProductId}/imagen`)
        .attach('imagen', PNG_BUFFER, 'test.png');
      expect(res.statusCode).toBe(401);
    });

    it('requires trusted origin even with admin token', async () => {
      const res = await request(app)
        .post(`/api/admin/productos/${tempProductId}/imagen`)
        .set('Cookie', adminCookie())
        .attach('imagen', PNG_BUFFER, 'test.png');
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('Origen no permitido');
    });

    it('successfully uploads, processes WebP, and updates product image', async () => {
      const mockDriveClient = {
        files: {
          create: jest.fn().mockResolvedValue({
            data: {
              id: `${TEST_RUN_ID}-mock-uploaded-drive-id`,
              webViewLink: `https://drive.google.com/file/d/${TEST_RUN_ID}-mock-uploaded-drive-id`,
            },
          }),
        },
      };
      _resetDriveForTest({ driveClient: mockDriveClient, isConfigured: true });

      const res = await request(app)
        .post(`/api/admin/productos/${tempProductId}/imagen`)
        .set('Cookie', adminCookie())
        .set('Origin', ORIGIN)
        .attach('imagen', PNG_BUFFER, 'test.png');

      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.imagen_url).toContain(`/api/productos/${tempProductId}/imagen?v=`);
      expect(res.body.data.imagen_nombre_original).toBe('test.png');
      expect(res.body.data.imagen_mime_type).toBe('image/webp'); // converted to webp!

      // Verify DB row
      const [rows] = await pool.query('SELECT * FROM archivo_drive WHERE drive_id = ?', [`${TEST_RUN_ID}-mock-uploaded-drive-id`]);
      expect(rows.length).toBe(1);
      expect(rows[0].tipo).toBe('producto_imagen');
      expect(rows[0].mime_type).toBe('image/webp');
    });

    it('returns 400 for unsupported file MIME type (e.g. PDF)', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 mock content');
      const res = await request(app)
        .post(`/api/admin/productos/${tempProductId}/imagen`)
        .set('Cookie', adminCookie())
        .set('Origin', ORIGIN)
        .attach('imagen', pdfBuffer, 'test.pdf');

      expect(res.statusCode).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toContain('Tipo de archivo no soportado');
    });

    it('returns 400 if magic bytes do not match mime type (fake extension)', async () => {
      const fakePngBuffer = Buffer.from('%PDF-1.4 fake png content');
      const res = await request(app)
        .post(`/api/admin/productos/${tempProductId}/imagen`)
        .set('Cookie', adminCookie())
        .set('Origin', ORIGIN)
        .attach('imagen', fakePngBuffer, 'test.png');

      expect(res.statusCode).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toContain('contenido no coincide con el tipo declarado');
    });

    it('returns 503 if Google Drive upload fails', async () => {
      const mockDriveClient = {
        files: {
          create: jest.fn().mockRejectedValue(new Error('Drive upload failure')),
        },
      };
      _resetDriveForTest({ driveClient: mockDriveClient, isConfigured: true });

      const res = await request(app)
        .post(`/api/admin/productos/${tempProductId}/imagen`)
        .set('Cookie', adminCookie())
        .set('Origin', ORIGIN)
        .attach('imagen', PNG_BUFFER, 'test.png');

      expect(res.statusCode).toBe(503);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toContain('upload');
    });
  });

  describe('DELETE /api/admin/productos/:id/imagen', () => {
    it('removes image association from product without deleting from Drive', async () => {
      // Create a dummy image in archivo_drive
      const [insertResult] = await pool.query(
        `INSERT INTO archivo_drive (drive_id, nombre_original, mime_type, tamanio_bytes, tipo)
         VALUES (?, ?, ?, ?, ?)`,
        [`${TEST_RUN_ID}-mock-drive-id-789`, 'test.webp', 'image/webp', 2048, 'producto_imagen']
      );
      const archivoId = insertResult.insertId;
      await pool.query('UPDATE producto SET imagen_archivo_id = ? WHERE id = ?', [archivoId, tempProductId]);

      const res = await request(app)
        .delete(`/api/admin/productos/${tempProductId}/imagen`)
        .set('Cookie', adminCookie())
        .set('Origin', ORIGIN);

      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.imagen_url).toBeNull();
      expect(res.body.data.imagen_archivo_id).toBeNull();

      // Verify the image row still exists in DB
      const [rows] = await pool.query('SELECT id FROM archivo_drive WHERE id = ?', [archivoId]);
      expect(rows.length).toBe(1);
    });
  });

  describe('Google Drive Folder Routing Logic', () => {
    it('uploadFile without folderId uses default Drive folderId from environments', async () => {
      const mockDriveClient = {
        files: {
          create: jest.fn().mockResolvedValue({
            data: { id: `${TEST_RUN_ID}-test-file-id`, webViewLink: null },
          }),
        },
      };

      _resetDriveForTest({ driveClient: mockDriveClient, isConfigured: true });

      await uploadFile(Buffer.from('test'), 'comprobante.png', 'image/png');

      expect(mockDriveClient.files.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            parents: [environments.googleDrive.folderId],
          }),
        })
      );
    });

    it('uploadFile with explicit folderId option uses provided folderId', async () => {
      const customFolderId = `${TEST_RUN_ID}-custom-folder-test`;

      const mockDriveClient = {
        files: {
          create: jest.fn().mockResolvedValue({
            data: { id: `${TEST_RUN_ID}-test-file-id`, webViewLink: null },
          }),
        },
      };

      _resetDriveForTest({ driveClient: mockDriveClient, isConfigured: true });

      await uploadFile(Buffer.from('test'), 'producto.webp', 'image/webp', {
        folderId: customFolderId,
      });

      expect(mockDriveClient.files.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            parents: [customFolderId],
          }),
        })
      );
    });
  });

  describe('Regression guard: product id=1 is never mutated', () => {
    it('product id=1 imagen_archivo_id remains unchanged across all image operations', async () => {
      // This test explicitly reads product id=1's current imagen_archivo_id
      // and asserts it matches the value captured before any tests ran.
      // This ensures no other test (even accidentally) modifies the seed product.
      const [rows] = await pool.query('SELECT imagen_archivo_id FROM producto WHERE id = 1');
      expect(rows[0].imagen_archivo_id).toBe(product1OriginalImagenId);
    });
  });
});