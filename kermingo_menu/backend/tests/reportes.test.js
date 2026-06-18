import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import pool from '../src/api/database/db.js';
import environments from '../src/api/config/environments.js';
import { obtenerReportes } from '../src/api/models/reportes.model.js';

const RUN_ID = `TEST-REPORTES-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

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

async function crearProductoTest({ nombre, precio, stockLimitado = 0, stockActual = null }) {
  const [result] = await pool.query(
    `INSERT INTO producto
       (nombre, descripcion, precio, tipo, stock_limitado, stock_actual, stock_minimo_alerta, activo, disponible, orden)
     VALUES
       (?, 'Producto de test reportes', ?, 'comida', ?, ?, 5, 1, 1, 0)`,
    [nombre, precio, stockLimitado, stockActual]
  );

  return {
    id: result.insertId,
    nombre,
    precio,
  };
}

async function crearPedidoTest({
  nombreCliente,
  metodoPago,
  estadoPago,
  estadoPedido = 'en_preparacion',
  total,
  origen = 'online',
}) {
  const token = `${RUN_ID}-token-${Math.random().toString(36).slice(2, 10)}`;
  const [result] = await pool.query(
    `INSERT INTO pedido
       (token_seguimiento, origen, nombre_cliente, metodo_pago, estado_pago, estado_pedido, total)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [token, origen, nombreCliente, metodoPago, estadoPago, estadoPedido, total]
  );

  return result.insertId;
}

async function crearDetallePedido({ pedidoId, producto, cantidad }) {
  const subtotal = producto.precio * cantidad;
  await pool.query(
    `INSERT INTO pedido_detalle
       (pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal)
     VALUES
       (?, ?, ?, ?, ?, ?)`,
    [pedidoId, producto.id, producto.nombre, producto.precio, cantidad, subtotal]
  );
}

async function prepararFixturesReporte() {
  await asegurarTiendaAbierta();

  const productoA = await crearProductoTest({
    nombre: `${RUN_ID}-producto-a`,
    precio: 10,
    stockLimitado: 0,
    stockActual: null,
  });

  const productoB = await crearProductoTest({
    nombre: `${RUN_ID}-producto-b`,
    precio: 20,
    stockLimitado: 0,
    stockActual: null,
  });

  const pedidoPagadoEfectivo = await crearPedidoTest({
    nombreCliente: `${RUN_ID}-pedido-1`,
    metodoPago: 'efectivo',
    estadoPago: 'pagado',
    total: 20,
  });
  await crearDetallePedido({ pedidoId: pedidoPagadoEfectivo, producto: productoA, cantidad: 2 });

  const pedidoPagadoTransferencia = await crearPedidoTest({
    nombreCliente: `${RUN_ID}-pedido-2`,
    metodoPago: 'transferencia',
    estadoPago: 'pagado',
    total: 50,
  });
  await crearDetallePedido({ pedidoId: pedidoPagadoTransferencia, producto: productoA, cantidad: 3 });
  await crearDetallePedido({ pedidoId: pedidoPagadoTransferencia, producto: productoB, cantidad: 1 });

  const pedidoPendiente = await crearPedidoTest({
    nombreCliente: `${RUN_ID}-pedido-3`,
    metodoPago: 'transferencia',
    estadoPago: 'pendiente',
    total: 100,
  });
  await crearDetallePedido({ pedidoId: pedidoPendiente, producto: productoB, cantidad: 5 });

  const pedidoCancelado = await crearPedidoTest({
    nombreCliente: `${RUN_ID}-pedido-4`,
    metodoPago: 'efectivo',
    estadoPago: 'pagado',
    estadoPedido: 'cancelado',
    total: 999,
  });
  await crearDetallePedido({ pedidoId: pedidoCancelado, producto: productoA, cantidad: 7 });
}

async function limpiarReportesTest() {
  const [pedidos] = await pool.query('SELECT id FROM pedido WHERE nombre_cliente LIKE ?', [`${RUN_ID}%`]);
  const pedidoIds = pedidos.map((row) => row.id);
  if (pedidoIds.length > 0) {
    const placeholders = pedidoIds.map(() => '?').join(',');
    await pool.query(`DELETE FROM pedido_detalle WHERE pedido_id IN (${placeholders})`, pedidoIds);
    await pool.query(`DELETE FROM pedido WHERE id IN (${placeholders})`, pedidoIds);
  }

  const [productos] = await pool.query('SELECT id FROM producto WHERE nombre LIKE ?', [`${RUN_ID}%`]);
  const productoIds = productos.map((row) => row.id);
  if (productoIds.length > 0) {
    const phProductos = productoIds.map(() => '?').join(',');
    await pool.query(`DELETE FROM producto WHERE id IN (${phProductos})`, productoIds);
  }
}

describe('GET /api/admin/reportes auth boundary', () => {
  it('retorna 401 sin cookie de admin', async () => {
    const res = await request(app).get('/api/admin/reportes');
    expect(res.statusCode).toBe(401);
    expect(res.body.ok).toBe(false);
  });
});

describe('GET /api/admin/reportes (integración + agregados SQL)', () => {
  beforeAll(async () => {
    await limpiarReportesTest();
    await prepararFixturesReporte();
  });

  afterAll(async () => {
    await limpiarReportesTest();
    try {
      await pool.end();
    } catch {
      // pool can be cerrado por otro test o haber sido finalizado previamente
    }
  });

  it('calcula métricas y ranking de venta', async () => {
    const res = await request(app)
      .get('/api/admin/reportes')
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN);

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);

    const reportes = res.body.data;
    expect(typeof reportes.total_recaudado).toBe('number');
    expect(reportes.total_recaudado).toBeCloseTo(70);
    expect(reportes.total_efectivo).toBeCloseTo(20);
    expect(reportes.total_transferencia).toBeCloseTo(50);
    expect(reportes.pedidos_pagados).toBe(2);
    expect(reportes.pedidos_pendientes_pago).toBe(1);
    expect(reportes.monto_pendiente_pago).toBeCloseTo(100);
    expect(reportes.productos_vendidos).toBe(6);

    expect(Array.isArray(reportes.ranking_productos)).toBe(true);
    expect(reportes.ranking_productos.length).toBe(2);
    expect(reportes.ranking_productos[0]).toMatchObject({
      producto_id: expect.any(Number),
      nombre: `${RUN_ID}-producto-a`,
      cantidad: 5,
    });
    expect(reportes.producto_top).toEqual(reportes.ranking_productos[0]);
    expect(new Date(reportes.actualizado_en).toString()).not.toBe('Invalid Date');
  });

  it('el modelo de reportes devuelve las mismas agregaciones', async () => {
    const directData = await obtenerReportes(pool, { rankingLimit: 2 });
    expect(directData.total_recaudado).toBeCloseTo(70);
    expect(directData.total_efectivo).toBeCloseTo(20);
    expect(directData.total_transferencia).toBeCloseTo(50);
    expect(directData.pedidos_pagados).toBe(2);
    expect(directData.pedidos_pendientes_pago).toBe(1);
    expect(directData.monto_pendiente_pago).toBeCloseTo(100);
    expect(directData.productos_vendidos).toBe(6);
    expect(directData.ranking_productos.length).toBe(2);
    expect(directData.producto_top).toMatchObject({
      nombre: `${RUN_ID}-producto-a`,
      cantidad: 5,
    });
    expect(directData.ranking_productos[0].producto_id).toBe(directData.producto_top.producto_id);
    expect(directData.actualizado_en).toEqual(expect.any(String));
  });
});
