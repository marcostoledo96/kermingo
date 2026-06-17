import request from 'supertest';
import app from '../src/app.js';
import jwt from 'jsonwebtoken';
import pool from '../src/api/database/db.js';
import environments from '../src/api/config/environments.js';

const RUN_ID = `TEST-COCINA-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const COOKIE_NAME = environments.cookie.name;
const JWT_SECRET = environments.jwt.secret;
const ORIGIN = environments.frontendUrl;
let PRODUCTO_ID;

function adminCookie(userId = 1) {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
  return `${COOKIE_NAME}=${token}`;
}

async function asegurarTiendaAbierta() {
  await pool.query('UPDATE configuracion_tienda SET estado = ? WHERE id = 1', ['abierta']);
}

async function prepararProductoBase() {
  const [rows] = await pool.query(
    'SELECT id FROM producto WHERE activo = 1 AND stock_limitado = 0 LIMIT 1'
  );
  if (!rows.length) {
    throw new Error('No hay producto base activo e ilimitado para tests de cocina');
  }
  PRODUCTO_ID = rows[0].id;
}

async function crearPedidoEnCocina(estadoInicial = 'recibido') {
  const res = await request(app)
    .post('/api/admin/pedidos/caja')
    .set('Cookie', adminCookie())
    .set('Origin', ORIGIN)
    .send({
      nombre_cliente: `${RUN_ID}-cocina-${Date.now()}`,
      metodo_pago: 'efectivo',
      estado_pedido: estadoInicial,
      items: [{ producto_id: PRODUCTO_ID, cantidad: 1 }],
    });
  expect(res.statusCode).toBe(201);
  return res.body.data;
}

async function limpiarPedidosDeTest() {
  const [rows] = await pool.query(
    'SELECT id FROM pedido WHERE nombre_cliente LIKE ?',
    [`${RUN_ID}%`]
  );
  const ids = rows.map((r) => r.id);
  if (!ids.length) return;

  const ph = ids.map(() => '?').join(',');
  await pool.query(`DELETE FROM pedido_detalle WHERE pedido_id IN (${ph})`, ids);
  await pool.query(`DELETE FROM pedido WHERE id IN (${ph})`, ids);
}

// ─── Nivel 1: Endpoints sin autenticación (sin mocks, HTTP real) ──────

describe('Cocina endpoints sin autenticacion', () => {
  it('GET /api/admin/cocina/pedidos -> 401 sin cookie', async () => {
    const res = await request(app).get('/api/admin/cocina/pedidos');
    expect(res.statusCode).toEqual(401);
    expect(res.body.ok).toEqual(false);
  });

  it('GET /api/admin/cocina/pedidos/:id -> 401 sin cookie', async () => {
    const res = await request(app).get('/api/admin/cocina/pedidos/1');
    expect(res.statusCode).toEqual(401);
    expect(res.body.ok).toEqual(false);
  });

  it('PATCH /api/admin/cocina/pedidos/:id/estado -> 401 sin cookie', async () => {
    const res = await request(app)
      .patch('/api/admin/cocina/pedidos/1/estado')
      .send({ estado_pedido: 'en_preparacion' });
    expect(res.statusCode).toEqual(401);
    expect(res.body.ok).toEqual(false);
  });
});

describe('Cocina endpoints autenticados con DB real', () => {
  beforeAll(async () => {
    await asegurarTiendaAbierta();
    await prepararProductoBase();
  });

  afterEach(async () => {
    await limpiarPedidosDeTest();
  });

  afterAll(async () => {
    await limpiarPedidosDeTest();
    try {
      await pool.end();
    } catch (_) {
      // If another suite already closed the shared pool, ignore.
    }
  });

  it('PATCH /api/admin/cocina/pedidos/:id/estado permite recibido → en_preparacion', async () => {
    const pedido = await crearPedidoEnCocina('recibido');

    const res = await request(app)
      .patch(`/api/admin/cocina/pedidos/${pedido.id}/estado`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ estado_pedido: 'en_preparacion' });

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toEqual(true);
    expect(res.body.data.estado_pedido).toEqual('en_preparacion');
  });

  it('PATCH /api/admin/cocina/pedidos/:id/estado permite recibido → listo', async () => {
    const pedido = await crearPedidoEnCocina('recibido');

    const res = await request(app)
      .patch(`/api/admin/cocina/pedidos/${pedido.id}/estado`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ estado_pedido: 'listo' });

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toEqual(true);
    expect(res.body.data.estado_pedido).toEqual('listo');
  });

  it('PATCH /api/admin/cocina/pedidos/:id/estado permite en_preparacion → listo', async () => {
    const pedido = await crearPedidoEnCocina('recibido');

    await request(app)
      .patch(`/api/admin/cocina/pedidos/${pedido.id}/estado`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ estado_pedido: 'en_preparacion' });

    const res = await request(app)
      .patch(`/api/admin/cocina/pedidos/${pedido.id}/estado`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ estado_pedido: 'listo' });

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toEqual(true);
    expect(res.body.data.estado_pedido).toEqual('listo');
  });

  it('PATCH /api/admin/cocina/pedidos/:id/estado permite listo → en_preparacion', async () => {
    const pedido = await crearPedidoEnCocina('recibido');

    await request(app)
      .patch(`/api/admin/cocina/pedidos/${pedido.id}/estado`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ estado_pedido: 'en_preparacion' });

    await request(app)
      .patch(`/api/admin/cocina/pedidos/${pedido.id}/estado`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ estado_pedido: 'listo' });

    const res = await request(app)
      .patch(`/api/admin/cocina/pedidos/${pedido.id}/estado`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ estado_pedido: 'en_preparacion' });

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toEqual(true);
    expect(res.body.data.estado_pedido).toEqual('en_preparacion');
  });

  it('PATCH /api/admin/cocina/pedidos/:id/estado permite listo → entregado', async () => {
    const pedido = await crearPedidoEnCocina('recibido');

    await request(app)
      .patch(`/api/admin/cocina/pedidos/${pedido.id}/estado`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ estado_pedido: 'en_preparacion' });

    await request(app)
      .patch(`/api/admin/cocina/pedidos/${pedido.id}/estado`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ estado_pedido: 'listo' });

    const res = await request(app)
      .patch(`/api/admin/cocina/pedidos/${pedido.id}/estado`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ estado_pedido: 'entregado' });

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toEqual(true);
    expect(res.body.data.estado_pedido).toEqual('entregado');
  });

  it('PATCH /api/admin/cocina/pedidos/:id/estado rechaza entregado → listo', async () => {
    const pedido = await crearPedidoEnCocina('recibido');

    await request(app)
      .patch(`/api/admin/cocina/pedidos/${pedido.id}/estado`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ estado_pedido: 'en_preparacion' });

    await request(app)
      .patch(`/api/admin/cocina/pedidos/${pedido.id}/estado`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ estado_pedido: 'listo' });

    const enviado = await request(app)
      .patch(`/api/admin/cocina/pedidos/${pedido.id}/estado`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ estado_pedido: 'entregado' });

    expect(enviado.statusCode).toBe(200);
    expect(enviado.body.ok).toEqual(true);
    expect(enviado.body.data.estado_pedido).toEqual('entregado');

    const res = await request(app)
      .patch(`/api/admin/cocina/pedidos/${pedido.id}/estado`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ estado_pedido: 'listo' });

    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toEqual(false);
  });
});
