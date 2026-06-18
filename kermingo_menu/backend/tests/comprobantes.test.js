/**
 * Integration tests for B6.3 Comprobantes / Google Drive
 * Spec traceability: payment-proofs/R1-S1..S4, R3-S1..S4, R4-S1..S4, R5-S1..S2
 *   etapa-5/R1-S1..S2, R2-S1..S2, R3-S1..S3
 *
 * Requires: running MySQL DB with test data (schema + seed).
 * Drive service behavior depends on RUN_REAL_DRIVE_TESTS and OAuth credentials.
 * By default, tests do NOT call real Google Drive.
 * Real Drive upload is enabled only with RUN_REAL_DRIVE_TESTS=true and OAuth credentials configured.
 *
 * We test the request validation and response shapes primarily.
 */

import request from 'supertest';
import app from '../src/app.js';
import jwt from 'jsonwebtoken';
import pool from '../src/api/database/db.js';
import environments from '../src/api/config/environments.js';
import { cancelWithTransaction } from '../src/api/models/pedido.model.js';
import { isDriveReady } from '../src/api/services/drive.service.js';

const RUN_ID = `TEST-B63-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const COOKIE_NAME = environments.cookie.name;
const JWT_SECRET = environments.jwt.secret;
const ORIGIN = environments.frontendUrl;

function adminCookie(userId = 1) {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
  return `${COOKIE_NAME}=${token}`;
}

// Check if Drive is actually configured in the test environment.
// RUN_REAL_DRIVE_TESTS must be explicitly set to 'true' to enable real Drive API calls.
// DRIVE_CONFIGURED is true only when RUN_REAL_DRIVE_TESTS=true AND Drive service initialized.
// DRIVE_READY indicates whether the Drive service is initialized (OAuth credentials present).
const RUN_REAL_DRIVE_TESTS = process.env.RUN_REAL_DRIVE_TESTS === 'true';
const DRIVE_READY = isDriveReady();
const DRIVE_CONFIGURED = RUN_REAL_DRIVE_TESTS && DRIVE_READY;

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
    // Clean archivo_drive orphans
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

// ── Tests ──

describe('B6.3 Comprobantes integration', () => {
  beforeAll(async () => {
    await asegurarTiendaAbierta();
  });

  afterEach(async () => {
    await limpiarPedidosDeTest();
  });

  afterAll(async () => {
    await pool.end();
  });

  // ── Validation: Transferencia requires comprobante ────────

  describe('POST /api/pedidos — transferencia validations', () => {
    it('transferencia without file returns 400', async () => {
      const res = await request(app)
        .post('/api/pedidos')
        .field('nombre_cliente', `${RUN_ID}-transfer-nofile`)
        .field('metodo_pago', 'transferencia')
        .field('items', JSON.stringify([{ producto_id: 5, cantidad: 1 }]));

      expect(res.statusCode).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toContain('comprobante');
    });

    it('efectivo with file returns 400 (online rejects cash)', async () => {
      // Use a valid JPEG buffer so magic bytes validation passes,
      // then the controller rejects it because online only accepts transferencia.
      const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]);
      const res = await request(app)
        .post('/api/pedidos')
        .field('nombre_cliente', `${RUN_ID}-efectivo-con-file`)
        .field('metodo_pago', 'efectivo')
        .field('items', JSON.stringify([{ producto_id: 5, cantidad: 1 }]))
        .attach('comprobante', jpegBuffer, {
          filename: 'receipt.jpg',
          contentType: 'image/jpeg',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.toLowerCase()).toContain('efectivo');
    });

    it('efectivo without file returns 400 (online rejects cash)', async () => {
      // B7: public orders no longer accept efectivo; must use caja for that.
      const res = await request(app)
        .post('/api/pedidos')
        .field('nombre_cliente', `${RUN_ID}-efectivo-no-file`)
        .field('metodo_pago', 'efectivo')
        .field('items', JSON.stringify([{ producto_id: 5, cantidad: 1 }]));

      expect(res.statusCode).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.toLowerCase()).toContain('efectivo');
    });

    it('caja transferencia without file creates pedido with estado_pedido=en_preparacion (bypass comprobante)', async () => {
      const res = await request(app)
        .post('/api/admin/pedidos/caja')
        .set('Cookie', adminCookie())
        .set('Origin', ORIGIN)
        .send({
          nombre_cliente: `${RUN_ID}-caja-transfer`,
          metodo_pago: 'transferencia',
          items: [{ producto_id: 5, cantidad: 1 }],
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.comprobante_archivo_id).toBeNull();
      expect(res.body.data.estado_pedido).toBe('en_preparacion');
      expect(res.body.data.origen).toBe('caja');
    });
  });

  // ── File validation ────────────────────────────────────────

  describe('POST /api/pedidos — file MIME and size validation', () => {
    it('rejects invalid MIME type (text/plain)', async () => {
      const res = await request(app)
        .post('/api/pedidos')
        .field('nombre_cliente', `${RUN_ID}-bad-mime`)
        .field('metodo_pago', 'transferencia')
        .field('items', JSON.stringify([{ producto_id: 5, cantidad: 1 }]))
        .attach('comprobante', Buffer.from('text content'), {
          filename: 'receipt.txt',
          contentType: 'text/plain',
        });

      // fileFilter rejects before reaching controller
      expect(res.statusCode).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toContain('no soportado');
    });

    it('rejects oversized file (>5MB)', async () => {
      const bigBuffer = Buffer.alloc(6 * 1024 * 1024, 'a');
      const res = await request(app)
        .post('/api/pedidos')
        .field('nombre_cliente', `${RUN_ID}-oversized`)
        .field('metodo_pago', 'transferencia')
        .field('items', JSON.stringify([{ producto_id: 5, cantidad: 1 }]))
        .attach('comprobante', bigBuffer, {
          filename: 'big-file.jpg',
          contentType: 'image/jpeg',
        });

      expect([400, 413]).toContain(res.statusCode);
      expect(res.body.ok).toBe(false);
    });

    it('rejects spoofed MIME — PDF mimetype but not PDF content → 400', async () => {
      const res = await request(app)
        .post('/api/pedidos')
        .field('nombre_cliente', `${RUN_ID}-spoofed-pdf`)
        .field('metodo_pago', 'transferencia')
        .field('items', JSON.stringify([{ producto_id: 5, cantidad: 1 }]))
        .attach('comprobante', Buffer.from('not a real pdf file content'), {
          filename: 'fake.pdf',
          contentType: 'application/pdf',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toMatch(/contenido no coincide|invalido/i);
    });

    it('rejects spoofed MIME — PNG mimetype but JPEG content → 400', async () => {
      // JPEG header bytes with PNG mimetype
      const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]);
      const res = await request(app)
        .post('/api/pedidos')
        .field('nombre_cliente', `${RUN_ID}-spoofed-png`)
        .field('metodo_pago', 'transferencia')
        .field('items', JSON.stringify([{ producto_id: 5, cantidad: 1 }]))
        .attach('comprobante', jpegBuffer, {
          filename: 'fake.png',
          contentType: 'image/png',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.ok).toBe(false);
    });
  });

  // ── Upload success flow (Drive configured) or failure (Drive not configured) ──

  describe('POST /api/pedidos — upload+Drive flow', () => {
    it(DRIVE_READY
      ? 'transferencia with valid file creates pedido with comprobante_subido (Drive configured)'
      : 'transferencia with valid file returns 503 when Drive not configured',
    async () => {
      // Use a valid PDF buffer to pass magic bytes validation
      const pdfBuffer = Buffer.from('%PDF-1.4 mock content');
      const res = await request(app)
        .post('/api/pedidos')
        .field('nombre_cliente', `${RUN_ID}-upload-flow`)
        .field('metodo_pago', 'transferencia')
        .field('items', JSON.stringify([{ producto_id: 5, cantidad: 1 }]))
        .attach('comprobante', pdfBuffer, {
          filename: 'receipt.pdf',
          contentType: 'application/pdf',
        });

      if (DRIVE_READY) {
        expect(res.statusCode).toBe(201);
        expect(res.body.data.estado_pago).toBe('comprobante_subido');
        expect(res.body.data.estado_pedido).toBe('recibido');
        expect(res.body.data.comprobante_archivo_id).toBeDefined();
        expect(res.body.data.comprobante_archivo_id).not.toBeNull();
      } else {
        // Drive not configured → 503
        expect(res.statusCode).toBe(503);
        expect(res.body.ok).toBe(false);
        // Verify no pedido was created
        const [rows] = await pool.query(
          'SELECT id FROM pedido WHERE nombre_cliente = ?',
          [`${RUN_ID}-upload-flow`]
        );
        expect(rows.length).toBe(0);
      }
    });
  });

  // ── Admin comprobante access ──────────────────────────────

  describe('GET /api/admin/pedidos/:id/comprobante', () => {
    it('unauthenticated request returns 401', async () => {
      const res = await request(app)
        .get('/api/admin/pedidos/1/comprobante');

      expect(res.statusCode).toBe(401);
    });

    it('non-existent pedido returns 404', async () => {
      const res = await request(app)
        .get('/api/admin/pedidos/999999/comprobante')
        .set('Cookie', adminCookie());

      expect(res.statusCode).toBe(404);
    });

    it('pedido without comprobante returns 404', async () => {
      // B7: public route rejects efectivo; use caja route to create efectivo order.
      const efectivoRes = await request(app)
        .post('/api/admin/pedidos/caja')
        .set('Cookie', adminCookie())
        .set('Origin', ORIGIN)
        .send({
          nombre_cliente: `${RUN_ID}-no-comp-access`,
          metodo_pago: 'efectivo',
          items: [{ producto_id: 5, cantidad: 1 }],
        });
      const pedidoId = efectivoRes.body.data.id;

      const res = await request(app)
        .get(`/api/admin/pedidos/${pedidoId}/comprobante`)
        .set('Cookie', adminCookie());

      expect(res.statusCode).toBe(404);
    });

    // Only test comprobante metadata access when Drive is configured
    if (DRIVE_READY) {
      it('admin retrieves comprobante metadata for pedido with comprobante → 200', async () => {
        const createRes = await request(app)
          .post('/api/pedidos')
          .field('nombre_cliente', `${RUN_ID}-admin-comp`)
          .field('metodo_pago', 'transferencia')
          .field('items', JSON.stringify([{ producto_id: 5, cantidad: 1 }]))
          .attach('comprobante', Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]), {
            filename: 'receipt.jpg',
            contentType: 'image/jpeg',
          });
        const pedidoId = createRes.body.data.id;

        const res = await request(app)
          .get(`/api/admin/pedidos/${pedidoId}/comprobante`)
          .set('Cookie', adminCookie());

        expect(res.statusCode).toBe(200);
        expect(res.body.ok).toBe(true);
        expect(res.body.data).not.toHaveProperty('drive_id');
        expect(res.body.data.nombre_original).toBeDefined();
        expect(res.body.data.mime_type).toBeDefined();
        expect(res.body.data.tamanio_bytes).toBeDefined();
        expect(res.body.data.url_publica).toBeDefined();
        expect(res.body.data.url_proxy).toBeDefined();
        expect(res.body.data.url_proxy).toContain('/comprobante/imagen');
        expect(res.body.data.buffer).toBeUndefined(); // No file bytes
      });
    }
  });

  // ── Admin comprobante image proxy ──────────────────────────────

  describe('GET /api/admin/pedidos/:id/comprobante/imagen', () => {
    it('unauthenticated request returns 401', async () => {
      const res = await request(app)
        .get('/api/admin/pedidos/1/comprobante/imagen');

      expect(res.statusCode).toBe(401);
    });

    it('non-existent pedido returns 404', async () => {
      const res = await request(app)
        .get('/api/admin/pedidos/999999/comprobante/imagen')
        .set('Cookie', adminCookie());

      expect(res.statusCode).toBe(404);
    });

    it('pedido without comprobante returns 404', async () => {
      // Create an efectivo pedido (no comprobante)
      const efectivoRes = await request(app)
        .post('/api/admin/pedidos/caja')
        .set('Cookie', adminCookie())
        .set('Origin', ORIGIN)
        .send({
          nombre_cliente: `${RUN_ID}-no-comp-proxy`,
          metodo_pago: 'efectivo',
          items: [{ producto_id: 5, cantidad: 1 }],
        });
      const pedidoId = efectivoRes.body.data.id;

      const res = await request(app)
        .get(`/api/admin/pedidos/${pedidoId}/comprobante/imagen`)
        .set('Cookie', adminCookie());

      expect(res.statusCode).toBe(404);
    });

    if (DRIVE_CONFIGURED) {
      it('proxies comprobante image bytes from Drive → 200 with Content-Type', async () => {
        const createRes = await request(app)
          .post('/api/pedidos')
          .field('nombre_cliente', `${RUN_ID}-comp-proxy`)
          .field('metodo_pago', 'transferencia')
          .field('items', JSON.stringify([{ producto_id: 5, cantidad: 1 }]))
          .attach('comprobante', Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]), {
            filename: 'receipt.jpg',
            contentType: 'image/jpeg',
          });
        const pedidoId = createRes.body.data.id;

        const res = await request(app)
          .get(`/api/admin/pedidos/${pedidoId}/comprobante/imagen`)
          .set('Cookie', adminCookie());

        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toMatch(/^image\//);
        expect(res.headers['content-disposition']).toContain('inline');
        expect(res.body.length).toBeGreaterThan(0);
      });
    }
  });

  // ── Payment state transitions with comprobante_subido ──────

  describe('PATCH /api/admin/pedidos/:id/pago — comprobante_subido transitions', () => {
    let pedidoCompSubido;

    // Only run these tests when Drive is NOT configured, since we need comprobante_subido state
    if (!DRIVE_READY) {
      // Test transitions using caja-created pedido with estado_pago set directly
      beforeAll(async () => {
        // Use caja to create a transferencia pedido, then manually set comprobante_subido
        const createRes = await request(app)
          .post('/api/admin/pedidos/caja')
          .set('Cookie', adminCookie())
          .set('Origin', ORIGIN)
          .send({
            nombre_cliente: `${RUN_ID}-pago-trans`,
            metodo_pago: 'transferencia',
            items: [{ producto_id: 5, cantidad: 1 }],
          });
        const pedidoId = createRes.body.data.id;

        // Manually set estado_pago to comprobante_subido for testing transitions
        await pool.query(
          'UPDATE pedido SET estado_pago = ? WHERE id = ?',
          ['comprobante_subido', pedidoId]
        );
        pedidoCompSubido = { id: pedidoId };
      });

      it('comprobante_subido → pagado is valid → 200', async () => {
        const res = await request(app)
          .patch(`/api/admin/pedidos/${pedidoCompSubido.id}/pago`)
          .set('Cookie', adminCookie())
          .set('Origin', ORIGIN)
          .send({ estado_pago: 'pagado' });

        expect(res.statusCode).toBe(200);
        expect(res.body.data.estado_pago).toBe('pagado');
      });

      it('comprobante_subido → rechazado is valid → 200', async () => {
        // Create another and test
        const createRes = await request(app)
          .post('/api/admin/pedidos/caja')
          .set('Cookie', adminCookie())
          .set('Origin', ORIGIN)
          .send({
            nombre_cliente: `${RUN_ID}-pago-rechazo`,
            metodo_pago: 'transferencia',
            items: [{ producto_id: 5, cantidad: 1 }],
          });
        const pid = createRes.body.data.id;
        await pool.query('UPDATE pedido SET estado_pago = ? WHERE id = ?', ['comprobante_subido', pid]);

        const res = await request(app)
          .patch(`/api/admin/pedidos/${pid}/pago`)
          .set('Cookie', adminCookie())
          .set('Origin', ORIGIN)
          .send({ estado_pago: 'rechazado' });

        expect(res.statusCode).toBe(200);
        expect(res.body.data.estado_pago).toBe('rechazado');
      });

      it('comprobante_subido → pendiente is invalid → 400', async () => {
        const createRes = await request(app)
          .post('/api/admin/pedidos/caja')
          .set('Cookie', adminCookie())
          .set('Origin', ORIGIN)
          .send({
            nombre_cliente: `${RUN_ID}-pago-invalid`,
            metodo_pago: 'transferencia',
            items: [{ producto_id: 5, cantidad: 1 }],
          });
        const pid = createRes.body.data.id;
        await pool.query('UPDATE pedido SET estado_pago = ? WHERE id = ?', ['comprobante_subido', pid]);

        const res = await request(app)
          .patch(`/api/admin/pedidos/${pid}/pago`)
          .set('Cookie', adminCookie())
          .set('Origin', ORIGIN)
          .send({ estado_pago: 'pendiente' });

        expect(res.statusCode).toBe(400);
      });

      it('rechazado → comprobante_subido is valid → 200', async () => {
        const createRes = await request(app)
          .post('/api/admin/pedidos/caja')
          .set('Cookie', adminCookie())
          .set('Origin', ORIGIN)
          .send({
            nombre_cliente: `${RUN_ID}-pago-resubmit`,
            metodo_pago: 'transferencia',
            items: [{ producto_id: 5, cantidad: 1 }],
          });
        const pid = createRes.body.data.id;

        // First set to comprobante_subido, then reject, then re-submit
        await pool.query('UPDATE pedido SET estado_pago = ? WHERE id = ?', ['comprobante_subido', pid]);
        await request(app)
          .patch(`/api/admin/pedidos/${pid}/pago`)
          .set('Cookie', adminCookie())
          .set('Origin', ORIGIN)
          .send({ estado_pago: 'rechazado' });

        const res = await request(app)
          .patch(`/api/admin/pedidos/${pid}/pago`)
          .set('Cookie', adminCookie())
          .set('Origin', ORIGIN)
          .send({ estado_pago: 'comprobante_subido' });

        expect(res.statusCode).toBe(200);
        expect(res.body.data.estado_pago).toBe('comprobante_subido');
      });
    }

    // When Drive IS configured, test with actual upload flow
    if (DRIVE_READY) {
      beforeEach(async () => {
        const res = await request(app)
          .post('/api/pedidos')
          .field('nombre_cliente', `${RUN_ID}-pago-trans`)
          .field('metodo_pago', 'transferencia')
          .field('items', JSON.stringify([{ producto_id: 5, cantidad: 1 }]))
          .attach('comprobante', Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]), {
            filename: 'receipt.jpg',
            contentType: 'image/jpeg',
          });
        pedidoCompSubido = res.body.data;
      });

      it('comprobante_subido → pagado is valid → 200', async () => {
        const res = await request(app)
          .patch(`/api/admin/pedidos/${pedidoCompSubido.id}/pago`)
          .set('Cookie', adminCookie())
          .set('Origin', ORIGIN)
          .send({ estado_pago: 'pagado' });

        expect(res.statusCode).toBe(200);
        expect(res.body.data.estado_pago).toBe('pagado');
      });

      it('comprobante_subido → rechazado is valid → 200', async () => {
        const res = await request(app)
          .patch(`/api/admin/pedidos/${pedidoCompSubido.id}/pago`)
          .set('Cookie', adminCookie())
          .set('Origin', ORIGIN)
          .send({ estado_pago: 'rechazado' });

        expect(res.statusCode).toBe(200);
        expect(res.body.data.estado_pago).toBe('rechazado');
      });

      it('comprobante_subido → pendiente is invalid → 400', async () => {
        const res = await request(app)
          .patch(`/api/admin/pedidos/${pedidoCompSubido.id}/pago`)
          .set('Cookie', adminCookie())
          .set('Origin', ORIGIN)
          .send({ estado_pago: 'pendiente' });

        expect(res.statusCode).toBe(400);
      });
    }
  });

  // ── Store closed ──────────────────────────────────────────

  describe('POST /api/pedidos — edge cases', () => {
    it('store closed rejects transfer multipart → 400 (preflight before Drive upload)', async () => {
      await pool.query('UPDATE configuracion_tienda SET estado = ? WHERE id = 1', ['cerrada']);
      try {
        const res = await request(app)
          .post('/api/pedidos')
          .field('nombre_cliente', `${RUN_ID}-closed`)
          .field('metodo_pago', 'transferencia')
          .field('items', JSON.stringify([{ producto_id: 5, cantidad: 1 }]))
          .attach('comprobante', Buffer.from('%PDF-1.4 fake content'), {
            filename: 'receipt.pdf',
            contentType: 'application/pdf',
          });

        // Store is closed → preflight returns 400 before Drive upload attempt
        expect(res.statusCode).toBe(400);
        expect(res.body.error).toMatch(/tienda/i);
      } finally {
        await asegurarTiendaAbierta();
      }
    });

    it('insufficient stock rejects order → 409 (via caja)', async () => {
      const [prods] = await pool.query(
        'SELECT id, nombre, stock_actual FROM producto WHERE stock_limitado = 1 ORDER BY id LIMIT 1'
      );
      if (prods.length === 0) {
        console.warn('No limited-stock product found — skipping test');
        return;
      }
      const prod = prods[0];
      const impossibleQty = (prod.stock_actual || 0) + 100;

      // B7: public route rejects efectivo, so use caja for stock check
      const res = await request(app)
        .post('/api/admin/pedidos/caja')
        .set('Cookie', adminCookie())
        .set('Origin', ORIGIN)
        .send({
          nombre_cliente: `${RUN_ID}-no-stock`,
          metodo_pago: 'efectivo',
          items: [{ producto_id: prod.id, cantidad: impossibleQty }],
        });

      expect(res.statusCode).toBe(409);
    });

    it('public route rejects efectivo before stock check → 400', async () => {
      const res = await request(app)
        .post('/api/pedidos')
        .field('nombre_cliente', `${RUN_ID}-cash-rejected`)
        .field('metodo_pago', 'efectivo')
        .field('items', JSON.stringify([{ producto_id: 5, cantidad: 1 }]));

      expect(res.statusCode).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.toLowerCase()).toContain('efectivo');
    });
  });
});
