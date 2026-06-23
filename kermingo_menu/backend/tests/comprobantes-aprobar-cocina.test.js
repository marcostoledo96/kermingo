/**
 * Integration tests for PATCH /api/admin/pedidos/:id/comprobante/aprobar
 * and admin pedidos search (mesa + accent-insensitive).
 *
 * Spec traceability: hotfix-prod/Fase2 — aprobar comprobante manda a cocina.
 *   hotfix-prod/Fase1 — búsqueda por mesa + case/accent insensitive.
 *
 * Requires: running MySQL DB with test data (schema + seed).
 */

import request from 'supertest';
import app from '../src/app.js';
import jwt from 'jsonwebtoken';
import pool from '../src/api/database/db.js';
import environments from '../src/api/config/environments.js';

const RUN_ID = `TEST-APROBAR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const COOKIE_NAME = environments.cookie.name;
const JWT_SECRET = environments.jwt.secret;
const ORIGIN = environments.frontendUrl;

function adminCookie(userId = 1) {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
  return `${COOKIE_NAME}=${token}`;
}

async function asegurarTiendaAbierta() {
  await pool.query('UPDATE configuracion_tienda SET estado = ? WHERE id = 1', ['abierta']);
}

// Caja orders default to estado_pedido='en_preparacion', which would make the
// approval tests vacuously pass (the recibido→en_preparacion branch is never
// exercised). To prove the approval actually moves the pedido to cocina, we
// force estado_pedido='recibido' so the test asserts a real state transition.
async function crearPedidoTransferencia(estadoPago, estadoPedido = 'recibido') {
  const res = await request(app)
    .post('/api/admin/pedidos/caja')
    .set('Cookie', adminCookie())
    .set('Origin', ORIGIN)
    .send({
      nombre_cliente: `${RUN_ID}-${estadoPago}`,
      metodo_pago: 'transferencia',
      items: [{ producto_id: 18, cantidad: 1 }],
    });
  expect(res.statusCode).toBe(201);
  const pedidoId = res.body.data.id;
  if (estadoPago || estadoPedido !== 'en_preparacion') {
    await pool.query(
      'UPDATE pedido SET estado_pago = ?, estado_pedido = ? WHERE id = ?',
      [estadoPago || 'pendiente', estadoPedido, pedidoId],
    );
  }
  return pedidoId;
}

// Attach a real comprobante_archivo_id to a pedido so it passes the approval
// gate that requires a comprobante file. Inserts a minimal archivo_drive row.
async function adjuntarComprobante(pedidoId) {
  const [archRes] = await pool.query(
    `INSERT INTO archivo_drive (drive_id, nombre_original, mime_type, tamanio_bytes, tipo, url_publica)
     VALUES (?, ?, ?, ?, 'comprobante', ?)`,
    [`test-drive-${pedidoId}-${Date.now()}`, 'comprobante-test.jpg', 'image/jpeg', 1024, null],
  );
  await pool.query(
    'UPDATE pedido SET comprobante_archivo_id = ? WHERE id = ?',
    [archRes.insertId, pedidoId],
  );
  return archRes.insertId;
}

async function crearPedidoEfectivo() {
  const res = await request(app)
    .post('/api/admin/pedidos/caja')
    .set('Cookie', adminCookie())
    .set('Origin', ORIGIN)
    .send({
      nombre_cliente: `${RUN_ID}-efectivo`,
      metodo_pago: 'efectivo',
      items: [{ producto_id: 18, cantidad: 1 }],
    });
  expect(res.statusCode).toBe(201);
  return res.body.data.id;
}

async function limpiarPedidosDeTest() {
  const [rows] = await pool.query(
    'SELECT id, comprobante_archivo_id FROM pedido WHERE nombre_cliente LIKE ?',
    [`${RUN_ID}%`]
  );
  const ids = rows.map((r) => r.id);
  if (!ids.length) return;
  const ph = ids.map(() => '?').join(',');
  await pool.query(`DELETE FROM pedido_detalle WHERE pedido_id IN (${ph})`, ids);
  await pool.query(`DELETE FROM pedido WHERE id IN (${ph})`, ids);
  // Remove comprobante archivo_drive rows created by tests (drive_id prefix)
  const archivoIds = rows.map((r) => r.comprobante_archivo_id).filter(Boolean);
  if (archivoIds.length) {
    const aph = archivoIds.map(() => '?').join(',');
    await pool.query(`DELETE FROM archivo_drive WHERE id IN (${aph})`, archivoIds);
  }
}

async function limpiarProductosDeTest() {
  const [rows] = await pool.query(
    'SELECT id FROM producto WHERE nombre LIKE ?',
    [`${RUN_ID}%`]
  );
  const ids = rows.map((r) => r.id);
  if (!ids.length) return;
  const ph = ids.map(() => '?').join(',');
  await pool.query(`DELETE FROM combo_producto WHERE combo_id IN (${ph}) OR producto_id IN (${ph})`, [...ids, ...ids]);
  await pool.query(`DELETE FROM producto_categoria WHERE producto_id IN (${ph})`, ids);
  await pool.query(`DELETE FROM producto WHERE id IN (${ph})`, ids);
}

describe('Fase 2 — PATCH /api/admin/pedidos/:id/comprobante/aprobar', () => {
  beforeAll(async () => {
    await asegurarTiendaAbierta();
  });

  afterEach(async () => {
    await limpiarPedidosDeTest();
  });

  it('comprobante_subido -> pagado y estado_pedido=en_preparacion (desde recibido)', async () => {
    const id = await crearPedidoTransferencia('comprobante_subido');
    await adjuntarComprobante(id);
    // Sanity: the order must start as recibido so the approval proves the transition.
    const [before] = await pool.query('SELECT estado_pedido FROM pedido WHERE id = ?', [id]);
    expect(before[0].estado_pedido).toBe('recibido');

    const res = await request(app)
      .patch(`/api/admin/pedidos/${id}/comprobante/aprobar`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.estado_pago).toBe('pagado');
    expect(res.body.data.estado_pedido).toBe('en_preparacion');
    expect(res.body.message).toMatch(/cocina/i);
  });

  it('rechazado -> pagado y estado_pedido=en_preparacion (reaprobar desde recibido)', async () => {
    const id = await crearPedidoTransferencia('rechazado');
    await adjuntarComprobante(id);
    const [before] = await pool.query('SELECT estado_pedido FROM pedido WHERE id = ?', [id]);
    expect(before[0].estado_pedido).toBe('recibido');

    const res = await request(app)
      .patch(`/api/admin/pedidos/${id}/comprobante/aprobar`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.estado_pago).toBe('pagado');
    expect(res.body.data.estado_pedido).toBe('en_preparacion');
  });

  it('efectivo no se aprueba como comprobante -> 400', async () => {
    const id = await crearPedidoEfectivo();
    const res = await request(app)
      .patch(`/api/admin/pedidos/${id}/comprobante/aprobar`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN);

    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('pedido cancelado no se aprueba -> 400', async () => {
    const id = await crearPedidoTransferencia('comprobante_subido');
    await pool.query('UPDATE pedido SET estado_pedido = ? WHERE id = ?', ['cancelado', id]);
    const res = await request(app)
      .patch(`/api/admin/pedidos/${id}/comprobante/aprobar`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN);

    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('pedido ya pagado no se reaprueba -> 400', async () => {
    const id = await crearPedidoTransferencia('pagado');
    const res = await request(app)
      .patch(`/api/admin/pedidos/${id}/comprobante/aprobar`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN);

    expect(res.statusCode).toBe(400);
  });

  it('no retrocede un pedido ya en_preparacion', async () => {
    const id = await crearPedidoTransferencia('comprobante_subido');
    await adjuntarComprobante(id);
    await pool.query('UPDATE pedido SET estado_pedido = ? WHERE id = ?', ['en_preparacion', id]);
    const res = await request(app)
      .patch(`/api/admin/pedidos/${id}/comprobante/aprobar`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.estado_pago).toBe('pagado');
    expect(res.body.data.estado_pedido).toBe('en_preparacion');
  });

  it('transferencia sin comprobante adjunto no se aprueba -> 400', async () => {
    const id = await crearPedidoTransferencia('comprobante_subido');
    // No adjuntarComprobante: leave comprobante_archivo_id NULL
    const [before] = await pool.query(
      'SELECT comprobante_archivo_id FROM pedido WHERE id = ?',
      [id],
    );
    expect(before[0].comprobante_archivo_id).toBeNull();

    const res = await request(app)
      .patch(`/api/admin/pedidos/${id}/comprobante/aprobar`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN);

    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.toLowerCase()).toMatch(/comprobante.*adjunto|adjunto.*comprobante/);
  });

  it('requiere admin -> 401 sin cookie', async () => {
    const res = await request(app).patch('/api/admin/pedidos/1/comprobante/aprobar');
    expect(res.statusCode).toBe(401);
  });
});

describe('Fase 1 — admin pedidos search (mesa + accent/case insensitive)', () => {
  beforeAll(async () => {
    await asegurarTiendaAbierta();
  });

  afterEach(async () => {
    await limpiarPedidosDeTest();
  });

  it('buscar por mesa encuentra el pedido', async () => {
    const createRes = await request(app)
      .post('/api/admin/pedidos/caja')
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        nombre_cliente: `${RUN_ID}-mesa-busqueda`,
        mesa: 'MESA-XYZ-99',
        metodo_pago: 'efectivo',
        items: [{ producto_id: 18, cantidad: 1 }],
      });
    expect(createRes.statusCode).toBe(201);
    const pedidoId = createRes.body.data.id;

    const res = await request(app)
      .get('/api/admin/pedidos')
      .set('Cookie', adminCookie())
      .query({ buscar: 'XYZ-99', limit: 30, page: 1 });

    expect(res.statusCode).toBe(200);
    const ids = res.body.data.pedidos.map((p) => p.id);
    expect(ids).toContain(pedidoId);
  });

  it('buscar por nombre ignora mayúsculas/minúsculas (utf8mb4_unicode_ci)', async () => {
    const createRes = await request(app)
      .post('/api/admin/pedidos/caja')
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        nombre_cliente: `${RUN_ID}-JOSE-Mayus`,
        metodo_pago: 'efectivo',
        items: [{ producto_id: 18, cantidad: 1 }],
      });
    expect(createRes.statusCode).toBe(201);
    const pedidoId = createRes.body.data.id;

    const res = await request(app)
      .get('/api/admin/pedidos')
      .set('Cookie', adminCookie())
      .query({ buscar: `${RUN_ID}-jose-mayus`, limit: 30, page: 1 });

    expect(res.statusCode).toBe(200);
    const ids = res.body.data.pedidos.map((p) => p.id);
    expect(ids).toContain(pedidoId);
  });

  it('paginación respeta limit=30 y devuelve total', async () => {
    // Create enough orders to at least exercise the limit/offset path.
    for (let i = 0; i < 3; i += 1) {
      await request(app)
        .post('/api/admin/pedidos/caja')
        .set('Cookie', adminCookie())
        .set('Origin', ORIGIN)
        .send({
          nombre_cliente: `${RUN_ID}-paginado-${i}`,
          metodo_pago: 'efectivo',
          items: [{ producto_id: 18, cantidad: 1 }],
        });
    }
    const res = await request(app)
      .get('/api/admin/pedidos')
      .set('Cookie', adminCookie())
      .query({ buscar: `${RUN_ID}-paginado`, limit: 30, page: 1 });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.pedidos.length).toBeLessThanOrEqual(30);
    expect(res.body.data.paginacion.total).toBeGreaterThanOrEqual(3);
    expect(res.body.data.paginacion.limit).toBe(30);
    expect(res.body.data.paginacion.page).toBe(1);
  });

  it('excluir_estado_pedido=cancelado oculta pedidos cancelados server-side', async () => {
    const createRes = await request(app)
      .post('/api/admin/pedidos/caja')
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        nombre_cliente: `${RUN_ID}-excluir-cancelado`,
        metodo_pago: 'efectivo',
        items: [{ producto_id: 18, cantidad: 1 }],
      });
    expect(createRes.statusCode).toBe(201);
    const pedidoId = createRes.body.data.id;
    await pool.query('UPDATE pedido SET estado_pedido = ? WHERE id = ?', ['cancelado', pedidoId]);

    const res = await request(app)
      .get('/api/admin/pedidos')
      .set('Cookie', adminCookie())
      .query({ buscar: `${RUN_ID}-excluir-cancelado`, excluir_estado_pedido: 'cancelado', limit: 30, page: 1 });

    expect(res.statusCode).toBe(200);
    const ids = res.body.data.pedidos.map((p) => p.id);
    expect(ids).not.toContain(pedidoId);
  });
});

describe('Fase 3 — promo safe guard', () => {
  beforeAll(async () => {
    await asegurarTiendaAbierta();
  });

  afterEach(async () => {
    await limpiarProductosDeTest();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('crear promo disponible=1 la guarda como disponible=0 (sin componentes)', async () => {
    const res = await request(app)
      .post('/api/admin/productos')
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        nombre: `${RUN_ID}-promo-nueva`,
        precio: 1000,
        tipo: 'promo',
        categorias: ['Merienda'],
        stock_limitado: 0,
        disponible: 1,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.disponible).toBe(0);
  });

  it('actualizar promo a disponible=1 sin componentes -> 400', async () => {
    const createRes = await request(app)
      .post('/api/admin/productos')
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        nombre: `${RUN_ID}-promo-update`,
        precio: 1000,
        tipo: 'promo',
        categorias: ['Merienda'],
        stock_limitado: 0,
        disponible: 0,
      });
    expect(createRes.statusCode).toBe(201);
    const id = createRes.body.data.id;

    const res = await request(app)
      .put(`/api/admin/productos/${id}`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ disponible: 1 });

    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.toLowerCase()).toMatch(/componente/);
  });

  it('GET /api/productos no lista promos sin componentes', async () => {
    const createRes = await request(app)
      .post('/api/admin/productos')
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        nombre: `${RUN_ID}-promo-publica`,
        precio: 1000,
        tipo: 'promo',
        categorias: ['Merienda'],
        stock_limitado: 0,
        disponible: 1,
      });
    expect(createRes.statusCode).toBe(201);
    const id = createRes.body.data.id;

    const res = await request(app)
      .get('/api/productos')
      .query({ tipo: 'promo' });

    expect(res.statusCode).toBe(200);
    const ids = res.body.data.map((p) => p.id);
    expect(ids).not.toContain(id);
  });
});