import { jest } from '@jest/globals';
import request from 'supertest';
import { Readable } from 'stream';
import app from '../src/app.js';
import jwt from 'jsonwebtoken';
import pool from '../src/api/database/db.js';
import environments from '../src/api/config/environments.js';
import { _getDriveStateForTest, _resetDriveForTest } from '../src/api/services/drive.service.js';

const COOKIE_NAME = environments.cookie.name;
const JWT_SECRET = environments.jwt.secret;
const ORIGIN = environments.frontendUrl;

function adminCookie(userId = 1) {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
  return `${COOKIE_NAME}=${token}`;
}

// 1x1 transparent PNG file hex
const PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

describe('Product Image Endpoints', () => {
  let savedState;

  beforeAll(() => {
    savedState = _getDriveStateForTest();
  });

  afterEach(async () => {
    // Restore saved Drive state
    _resetDriveForTest(savedState);
    // Clean up product ID 1 database modifications
    await pool.query('UPDATE producto SET imagen_archivo_id = NULL WHERE id = 1');
    await pool.query("DELETE FROM archivo_drive WHERE tipo = 'producto_imagen'");
  });

  afterAll(async () => {
    _resetDriveForTest(savedState);
    await pool.end();
  });

  describe('GET /api/productos y /api/productos/:id', () => {
    it('GET /api/productos includes null imagen_url by default', async () => {
      const res = await request(app).get('/api/productos');
      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
      
      const prod1 = res.body.data.find(p => p.id === 1);
      if (prod1) {
        expect(prod1).toHaveProperty('imagen_url');
        expect(prod1.imagen_url).toBeNull();
      }
    });

    it('returns imagen_url when product has an associated image', async () => {
      // Create a dummy image in archivo_drive
      const [insertResult] = await pool.query(
        `INSERT INTO archivo_drive (drive_id, nombre_original, mime_type, tamanio_bytes, tipo)
         VALUES (?, ?, ?, ?, ?)`,
        ['mock-drive-id-123', 'test-image.webp', 'image/webp', 1024, 'producto_imagen']
      );
      const archivoId = insertResult.insertId;
      await pool.query('UPDATE producto SET imagen_archivo_id = ? WHERE id = 1', [archivoId]);

      const res = await request(app).get('/api/productos');
      expect(res.statusCode).toBe(200);
      
      const prod1 = res.body.data.find(p => p.id === 1);
      expect(prod1).toBeDefined();
      expect(prod1.imagen_url).toContain(`/api/productos/1/imagen?v=${archivoId}`);
      expect(prod1.imagen_nombre_original).toBe('test-image.webp');
      expect(prod1.imagen_mime_type).toBe('image/webp');
      expect(prod1.imagen_tamanio_bytes).toBe(1024);
    });
  });

  describe('GET /api/productos/:id/imagen', () => {
    it('returns 404 if product has no image', async () => {
      const res = await request(app).get('/api/productos/1/imagen');
      expect(res.statusCode).toBe(404);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toContain('no encontrada');
    });

    it('returns image stream with webp headers', async () => {
      // Create a dummy image in archivo_drive
      const [insertResult] = await pool.query(
        `INSERT INTO archivo_drive (drive_id, nombre_original, mime_type, tamanio_bytes, tipo)
         VALUES (?, ?, ?, ?, ?)`,
        ['mock-drive-id-456', 'test.webp', 'image/webp', 2048, 'producto_imagen']
      );
      const archivoId = insertResult.insertId;
      await pool.query('UPDATE producto SET imagen_archivo_id = ? WHERE id = 1', [archivoId]);

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
        .get('/api/productos/1/imagen')
        .buffer();
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('image/webp');
      expect(res.headers['cache-control']).toContain('public');
      expect(res.headers['content-disposition']).toContain('inline; filename="producto-1.webp"');
      expect(res.body.toString()).toBe('webp-fake-bytes');
    });

    it('returns 503 if Google Drive read fails', async () => {
      const [insertResult] = await pool.query(
        `INSERT INTO archivo_drive (drive_id, nombre_original, mime_type, tamanio_bytes, tipo)
         VALUES (?, ?, ?, ?, ?)`,
        ['mock-fail-id', 'test.webp', 'image/webp', 2048, 'producto_imagen']
      );
      const archivoId = insertResult.insertId;
      await pool.query('UPDATE producto SET imagen_archivo_id = ? WHERE id = 1', [archivoId]);

      // Mock Drive client to fail
      const mockDriveClient = {
        files: {
          get: jest.fn().mockRejectedValue(new Error('Drive API failure')),
        },
      };
      _resetDriveForTest({ driveClient: mockDriveClient, isConfigured: true });

      const res = await request(app).get('/api/productos/1/imagen');
      expect(res.statusCode).toBe(503);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toContain('lectura');
    });
  });

  describe('POST /api/admin/productos/:id/imagen', () => {
    it('requires admin token and trusted origin', async () => {
      const res = await request(app)
        .post('/api/admin/productos/1/imagen')
        .attach('imagen', PNG_BUFFER, 'test.png');
      expect(res.statusCode).toBe(401);
    });

    it('requires trusted origin even with admin token', async () => {
      const res = await request(app)
        .post('/api/admin/productos/1/imagen')
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
              id: 'mock-uploaded-drive-id',
              webViewLink: 'https://drive.google.com/file/d/mock-uploaded-drive-id',
            },
          }),
        },
      };
      _resetDriveForTest({ driveClient: mockDriveClient, isConfigured: true });

      const res = await request(app)
        .post('/api/admin/productos/1/imagen')
        .set('Cookie', adminCookie())
        .set('Origin', ORIGIN)
        .attach('imagen', PNG_BUFFER, 'test.png');

      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.imagen_url).toContain('/api/productos/1/imagen?v=');
      expect(res.body.data.imagen_nombre_original).toBe('test.png');
      expect(res.body.data.imagen_mime_type).toBe('image/webp'); // converted to webp!

      // Verify DB row
      const [rows] = await pool.query('SELECT * FROM archivo_drive WHERE drive_id = ?', ['mock-uploaded-drive-id']);
      expect(rows.length).toBe(1);
      expect(rows[0].tipo).toBe('producto_imagen');
      expect(rows[0].mime_type).toBe('image/webp');
    });

    it('returns 400 for unsupported file MIME type (e.g. PDF)', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 mock content');
      const res = await request(app)
        .post('/api/admin/productos/1/imagen')
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
        .post('/api/admin/productos/1/imagen')
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
        .post('/api/admin/productos/1/imagen')
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
        ['mock-drive-id-789', 'test.webp', 'image/webp', 2048, 'producto_imagen']
      );
      const archivoId = insertResult.insertId;
      await pool.query('UPDATE producto SET imagen_archivo_id = ? WHERE id = 1', [archivoId]);

      const res = await request(app)
        .delete('/api/admin/productos/1/imagen')
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
});
