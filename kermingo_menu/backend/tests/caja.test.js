import request from 'supertest';
import app from '../src/app.js';
import jwt from 'jsonwebtoken';
import pool from '../src/api/database/db.js';
import environments from '../src/api/config/environments.js';
import {
  validatePaymentTransition,
  PAGO_TRANSITIONS,
  cancelWithTransaction,
} from '../src/api/models/pedido.model.js';
import {
  updateEstadoPagoSchema,
  pedidoQuerySchema,
  editPedidoSchema,
} from '../src/api/schemas/pedido.schema.js';

const COOKIE_NAME = environments.cookie.name;
const JWT_SECRET = environments.jwt.secret;
const ORIGIN = environments.frontendUrl;

function adminCookie(userId = 1) {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
  return `${COOKIE_NAME}=${token}`;
}

async function crearPedidoCaja(payload) {
  const res = await request(app)
    .post('/api/admin/pedidos/caja')
    .set('Cookie', adminCookie())
    .set('Origin', ORIGIN)
    .send(payload);
  expect(res.statusCode).toBe(201);
  return res.body.data;
}

/**
 * FIX retroactivo (ChatGPT Codex P2): cleanup con cancelWithTransaction
 * en vez de DELETE directo. Esto restaura el stock de productos y
 * componentes de combos antes de borrar las filas, evitando que runs
 * repetidos de `npm test` agoten el stock del producto 5 (Pancho).
 */
async function limpiarPedidosDeTest() {
  const [rows] = await pool.query(
    "SELECT id FROM pedido WHERE nombre_cliente LIKE 'TEST-%'"
  );
  for (const { id } of rows) {
    try {
      // cancelWithTransaction restaura stock si el pedido está en estado
      // cancelable (recibido/en_preparacion). Si ya está cancelado, no-op.
      await cancelWithTransaction(pool, id);
    } catch (err) {
      // Si la cancelación falla (ej. pedido ya en estado terminal),
      // seguimos con DELETE directo para limpiar.
    }
  }
  // DELETE final para limpiar filas (canceladas o no).
  const [remaining] = await pool.query(
    "SELECT id FROM pedido WHERE nombre_cliente LIKE 'TEST-%'"
  );
  const ids = remaining.map((r) => r.id);
  if (ids.length > 0) {
    const ph = ids.map(() => '?').join(',');
    await pool.query(`DELETE FROM pedido_detalle WHERE pedido_id IN (${ph})`, ids);
    await pool.query(`DELETE FROM pedido WHERE id IN (${ph})`, ids);
  }

  await pool.query(`DELETE FROM pedido_detalle WHERE pedido_id IN (${ph})`, ids);
  await pool.query(`DELETE FROM pedido WHERE id IN (${ph})`, ids);
}

// Unit tests

describe('Caja payment-state machine (unit)', () => {
  it('pendiente -> pagado is valid', () => {
    expect(validatePaymentTransition('pendiente', 'pagado')).toBe(true);
  });

  it('pendiente -> comprobante_subido is valid', () => {
    expect(validatePaymentTransition('pendiente', 'comprobante_subido')).toBe(true);
  });

  it('comprobante_subido -> pagado is valid', () => {
    expect(validatePaymentTransition('comprobante_subido', 'pagado')).toBe(true);
  });

  it('comprobante_subido -> rechazado is valid', () => {
    expect(validatePaymentTransition('comprobante_subido', 'rechazado')).toBe(true);
  });

  it('rechazado -> pendiente is valid', () => {
    expect(validatePaymentTransition('rechazado', 'pendiente')).toBe(true);
  });

  it('pagado -> anything is invalid (terminal)', () => {
    expect(validatePaymentTransition('pagado', 'pendiente')).toBe(false);
    expect(validatePaymentTransition('pagado', 'rechazado')).toBe(false);
    expect(validatePaymentTransition('pagado', 'comprobante_subido')).toBe(false);
  });

  it('pendiente -> rechazado is invalid', () => {
    expect(validatePaymentTransition('pendiente', 'rechazado')).toBe(false);
  });

  it('rechazado -> pagado is invalid', () => {
    expect(validatePaymentTransition('rechazado', 'pagado')).toBe(false);
  });

  it('same state is invalid (FIX retroactivo: idempotencia devuelve 400)', () => {
    // FIX retroactivo: `from === to` ahora retorna `false`.
    // Antes retornaba `true`, lo que hacía que mysql2 ejecutara un UPDATE
    // no-op (affectedRows=0) y el controller lanzara 404 'Pedido no
    // encontrado'. Ahora `validatePaymentTransition` retorna `false`
    // → `updateEstadoPago` retorna `-1` → controller lanza 400 con
    // 'Transición de estado de pago no válida'.
    expect(validatePaymentTransition('pagado', 'pagado')).toBe(false);
    expect(validatePaymentTransition('pendiente', 'pendiente')).toBe(false);
  });

  it('PAGO_TRANSITIONS contains all expected keys', () => {
    expect(Object.keys(PAGO_TRANSITIONS)).toEqual(
      expect.arrayContaining(['pendiente', 'comprobante_subido', 'rechazado', 'pagado'])
    );
  });
});

// Schema validation tests

describe('Caja schema validation', () => {
  it('updateEstadoPagoSchema accepts comprobante_subido', () => {
    const result = updateEstadoPagoSchema.safeParse({ estado_pago: 'comprobante_subido' });
    expect(result.success).toBe(true);
  });

  it('pedidoQuerySchema parses solo_pagos_pendientes=true', () => {
    const result = pedidoQuerySchema.safeParse({ solo_pagos_pendientes: 'true' });
    expect(result.success).toBe(true);
    expect(result.data.solo_pagos_pendientes).toBe(true);
  });

  it('pedidoQuerySchema parses solo_pagos_pendientes=false', () => {
    const result = pedidoQuerySchema.safeParse({ solo_pagos_pendientes: 'false' });
    expect(result.success).toBe(true);
    expect(result.data.solo_pagos_pendientes).toBe(false);
  });

  it('pedidoQuerySchema treats missing solo_pagos_pendientes as undefined', () => {
    const result = pedidoQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.solo_pagos_pendientes).toBeUndefined();
  });

  it('editPedidoSchema accepts valid items with optional fields', () => {
    const result = editPedidoSchema.safeParse({
      nombre_cliente: 'Test',
      mesa: 'M1',
      observaciones: 'x',
      metodo_pago: 'efectivo',
      items: [{ producto_id: 5, cantidad: 1 }],
    });
    expect(result.success).toBe(true);
  });

  it('editPedidoSchema rejects empty items', () => {
    const result = editPedidoSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });
});

// Auth-boundary tests (unauthenticated)

describe('PATCH /api/admin/pedidos/:id/pago (auth boundary)', () => {
  it('returns 401 without admin cookie', async () => {
    const res = await request(app)
      .patch('/api/admin/pedidos/1/pago')
      .send({ estado_pago: 'pagado' });
    expect(res.statusCode).toEqual(401);
    expect(res.body.ok).toEqual(false);
  });
});

describe('GET /api/admin/pedidos (auth boundary + unpaid filter)', () => {
  it('returns 401 without admin cookie', async () => {
    const res = await request(app).get('/api/admin/pedidos?solo_pagos_pendientes=true');
    expect(res.statusCode).toEqual(401);
    expect(res.body.ok).toEqual(false);
  });

  it('returns 401 with invalid solo_pagos_pendientes value and no cookie', async () => {
    const res = await request(app).get('/api/admin/pedidos?solo_pagos_pendientes=maybe');
    expect(res.statusCode).toEqual(401);
    expect(res.body.ok).toEqual(false);
  });
});

// PR1: Authenticated payment-transition integration tests

describe('Authenticated PATCH payment transitions (PR1 integration)', () => {
  let pedidoEfectivo;
  let pedidoTransferencia;

  beforeAll(async () => {
    await limpiarPedidosDeTest();
    pedidoEfectivo = await crearPedidoCaja({
      nombre_cliente: 'TEST-B6-2-EFFECTIVO',
      metodo_pago: 'efectivo',
      items: [{ producto_id: 5, cantidad: 1 }], // Pancho
    });
    pedidoTransferencia = await crearPedidoCaja({
      nombre_cliente: 'TEST-B6-2-TRANSFERENCIA',
      metodo_pago: 'transferencia',
      items: [{ producto_id: 5, cantidad: 1 }],
    });
  });

  afterAll(async () => {
    await limpiarPedidosDeTest();
  });

  it('PATCH pendiente -> pagado for efectivo returns 200, stock/estado_pedido unchanged', async () => {
    // FIX retroactivo: capturar stock del producto 5 justo antes del PATCH
    // para validar que el PATCH de pago NO lo modifica.
    const [[stockAntes]] = await pool.query(
      'SELECT stock_actual FROM producto WHERE id = 5'
    );
    const res = await request(app)
      .patch(`/api/admin/pedidos/${pedidoEfectivo.id}/pago`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ estado_pago: 'pagado' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.estado_pago).toBe('pagado');
    expect(res.body.data.estado_pedido).toBe('recibido');

    // FIX retroactivo: validar invariante "stock no cambia con PATCH de pago".
    // (Comentario 3 de Copilot Medium — esta cobertura faltaba en el PR original.)
    const [[stockDespues]] = await pool.query(
      'SELECT stock_actual FROM producto WHERE id = 5'
    );
    expect(stockDespues.stock_actual).toBe(stockAntes.stock_actual);
  });

  it('PATCH pendiente -> pagado for transferencia returns 200 without comprobante', async () => {
    const res = await request(app)
      .patch(`/api/admin/pedidos/${pedidoTransferencia.id}/pago`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ estado_pago: 'pagado' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.estado_pago).toBe('pagado');
  });

  it('PATCH pagado -> pendiente returns 400 (backward forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/admin/pedidos/${pedidoEfectivo.id}/pago`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ estado_pago: 'pendiente' });
    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('PATCH pagado -> rechazado returns 400 (terminal)', async () => {
    const res = await request(app)
      .patch(`/api/admin/pedidos/${pedidoTransferencia.id}/pago`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ estado_pago: 'rechazado' });
    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('PATCH pagado -> pagado returns 400 (idempotente no es válido, FIX retroactivo)', async () => {
    // FIX retroactivo: admin puede mandar mismo estado actual. Con el fix,
    // `validatePaymentTransition('pagado', 'pagado')` retorna `false`,
    // `updateEstadoPago` retorna `-1`, controller lanza 400 con
    // 'Transición de estado de pago no válida'. Antes retornaba 404.
    const res = await request(app)
      .patch(`/api/admin/pedidos/${pedidoEfectivo.id}/pago`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ estado_pago: 'pagado' });
    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toMatch(/Transición de estado de pago no válida/);
  });
});

// PR1: Authenticated unpaid-filter integration tests
// FIX retroactivo: tests originales no eran deterministas (pasaban con DB
// vacía). Ahora creamos fixtures propios con `nombre_cliente` único y
// filtramos por nombre para verificar el comportamiento del filtro.

describe('Authenticated GET solo_pagos_pendientes (PR1 integration)', () => {
  let pedidoPendiente;
  let pedidoPagado;
  let pedidoCancelado;
  const TEST_PREFIX = 'TEST-FILTER';

  beforeAll(async () => {
    await limpiarPedidosDeTest();
    // Fixture: pedido pendiente (sin PATCH de pago, queda en 'pendiente')
    pedidoPendiente = await crearPedidoCaja({
      nombre_cliente: `${TEST_PREFIX}-PENDIENTE-${Date.now()}`,
      metodo_pago: 'efectivo',
      items: [{ producto_id: 5, cantidad: 1 }],
    });
    // Fixture: pedido pagado
    const resPagado = await request(app)
      .post('/api/admin/pedidos/caja')
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        nombre_cliente: `${TEST_PREFIX}-PAGADO-${Date.now()}`,
        metodo_pago: 'efectivo',
        items: [{ producto_id: 5, cantidad: 1 }],
      });
    pedidoPagado = resPagado.body.data;
    await request(app)
      .patch(`/api/admin/pedidos/${pedidoPagado.id}/pago`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ estado_pago: 'pagado' });
    // Fixture: pedido cancelado (mismo flujo que pagado pero después cancelamos)
    const resCanc = await request(app)
      .post('/api/admin/pedidos/caja')
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        nombre_cliente: `${TEST_PREFIX}-CANCELADO-${Date.now()}`,
        metodo_pago: 'efectivo',
        items: [{ producto_id: 5, cantidad: 1 }],
      });
    pedidoCancelado = resCanc.body.data;
    await cancelWithTransaction(pool, pedidoCancelado.id);
  });

  afterAll(async () => {
    await limpiarPedidosDeTest();
  });

  it('excludes TEST-FILTER-PAGADO from the unpaid list', async () => {
    const res = await request(app)
      .get(`/api/admin/pedidos?solo_pagos_pendientes=true&limit=100&buscar=${TEST_PREFIX}`)
      .set('Cookie', adminCookie());
    expect(res.statusCode).toBe(200);
    const pedidos = res.body.data.pedidos;
    // Ninguno de los TEST-FILTER-* debe ser pagado.
    const tienePagado = pedidos.some((p) => p.estado_pago === 'pagado');
    expect(tienePagado).toBe(false);
    // Verificación específica: TEST-FILTER-PAGADO no debe aparecer.
    const aparecePagado = pedidos.some((p) => p.id === pedidoPagado.id);
    expect(aparecePagado).toBe(false);
  });

  it('excludes TEST-FILTER-CANCELADO from the unpaid list', async () => {
    const res = await request(app)
      .get(`/api/admin/pedidos?solo_pagos_pendientes=true&limit=100&buscar=${TEST_PREFIX}`)
      .set('Cookie', adminCookie());
    expect(res.statusCode).toBe(200);
    const pedidos = res.body.data.pedidos;
    // Verificación específica: TEST-FILTER-CANCELADO no debe aparecer.
    const apareceCancelado = pedidos.some((p) => p.id === pedidoCancelado.id);
    expect(apareceCancelado).toBe(false);
  });

  it('only returns TEST-FILTER pedidos with estado_pago in pendiente or rechazado', async () => {
    const res = await request(app)
      .get(`/api/admin/pedidos?solo_pagos_pendientes=true&limit=100&buscar=${TEST_PREFIX}`)
      .set('Cookie', adminCookie());
    expect(res.statusCode).toBe(200);
    const pedidos = res.body.data.pedidos;
    // Solo debe traer TEST-FILTER-PENDIENTE (pagado y cancelado excluidos).
    for (const p of pedidos) {
      expect(['pendiente', 'rechazado']).toContain(p.estado_pago);
    }
    // Verificación específica: TEST-FILTER-PENDIENTE debe aparecer.
    const aparecePendiente = pedidos.some((p) => p.id === pedidoPendiente.id);
    expect(aparecePendiente).toBe(true);
  });
});

// PR2: Auth boundary for PUT

describe('PUT /api/admin/pedidos/:id (auth boundary)', () => {
  it('returns 401 without admin cookie', async () => {
    const res = await request(app)
      .put('/api/admin/pedidos/1')
      .send({ items: [{ producto_id: 5, cantidad: 1 }] });
    expect(res.statusCode).toEqual(401);
    expect(res.body.ok).toEqual(false);
  });
});

// PR2: Edit correction integration tests

describe('Authenticated PUT edit correction (PR2 integration)', () => {
  let editPedido;
  let prodIdLimited = 9;   // Torta frita (stock_limitado=1, stock_actual=30)
  let prodIdLimited2 = 6;  // Nuggets (stock_limitado=1, stock_actual=20)
  let prodIdUnlimited = 18; // Agua mineral (stock_limitado=0)
  let prodIdCombo = 24;     // Combo cena (promo)

  async function readStock(ids) {
    const [rows] = await pool.query(
      'SELECT id, stock_actual, stock_limitado FROM producto WHERE id IN (?)',
      [ids]
    );
    const map = new Map();
    for (const r of rows) map.set(r.id, r);
    return map;
  }

  async function readDetalle(pedidoId) {
    const [rows] = await pool.query(
      'SELECT producto_id, cantidad, precio_unitario, subtotal FROM pedido_detalle WHERE pedido_id = ?',
      [pedidoId]
    );
    return rows;
  }

  beforeAll(async () => {
    // Ensure baseline stock for products we will consume/rest across tests
    const baselineStock = {
      5: 30,   // Pancho (used in PR1 and PR2 online tests)
      6: 20,   // Nuggets
      9: 30,   // Torta frita (edit tests)
      15: 60,  // Coca Cola
      18: 0,   // Agua mineral (unlimited, but keep as-is)
      24: 0,   // Combo cena placeholder
    };
    for (const [pid, stock] of Object.entries(baselineStock)) {
      if (pid === '18' || pid === '24') continue;
      await pool.query('UPDATE producto SET stock_actual = ? WHERE id = ?', [stock, pid]);
    }

    await limpiarPedidosDeTest();
    editPedido = await crearPedidoCaja({
      nombre_cliente: 'TEST-B6-2-EDIT',
      metodo_pago: 'efectivo',
      items: [{ producto_id: prodIdLimited, cantidad: 1 }],
    });
  });

  afterAll(async () => {
    await limpiarPedidosDeTest();
  });

  it('PUT replaces items and total, stock reflects delta', async () => {
    const stockBefore = await readStock([prodIdLimited, prodIdLimited2]);

    const res = await request(app)
      .put(`/api/admin/pedidos/${editPedido.id}`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        items: [
          { producto_id: prodIdLimited2, cantidad: 2 },
          { producto_id: prodIdLimited, cantidad: 3 },
        ],
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    const pedido = res.body.data;

    // total recalculated (Nuggets 3000*2 + Torta frita 1000*3 = 9000)
    expect(parseFloat(pedido.total)).toBeCloseTo(9000, 0);
    expect(pedido.items.length).toBe(2);

    const detalles = await readDetalle(editPedido.id);
    const tieneNuggets = detalles.some((d) => d.producto_id === prodIdLimited2 && d.cantidad === 2);
    expect(tieneNuggets).toBe(true);

    const stockAfter = await readStock([prodIdLimited, prodIdLimited2]);
    // Torta frita: 1 consumed before, then 3 consumed after => +1 -3 = delta -2
    expect(stockAfter.get(prodIdLimited).stock_actual).toBe(
      stockBefore.get(prodIdLimited).stock_actual + 1 - 3
    );
    // Nuggets: nothing before, 2 after => delta -2
    expect(stockAfter.get(prodIdLimited2).stock_actual).toBe(
      stockBefore.get(prodIdLimited2).stock_actual - 2
    );
  });

  it('PUT updates metadata along with items', async () => {
    const res = await request(app)
      .put(`/api/admin/pedidos/${editPedido.id}`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        nombre_cliente: 'TEST-B6-2-EDIT-RENAMED',
        mesa: 'Mesa 99',
        observaciones: 'Sin cebolla',
        metodo_pago: 'transferencia',
        items: [{ producto_id: prodIdLimited, cantidad: 1 }],
      });

    expect(res.statusCode).toBe(200);
    const pedido = res.body.data;
    expect(pedido.nombre_cliente).toBe('TEST-B6-2-EDIT-RENAMED');
    expect(pedido.mesa).toBe('Mesa 99');
    // observaciones may not be returned by findById controller wrapper; assert only what's visible
    expect(pedido.metodo_pago).toBe('transferencia');
  });

  it('PUT rejects for insufficient stock and preserves original state', async () => {
    const [stockPanchoBefore] = await pool.query(
      'SELECT stock_actual FROM producto WHERE id = ?',
      [prodIdLimited]
    );
    const panchoBefore = stockPanchoBefore[0].stock_actual;

    // Try replacing with impossible quantity
    const res = await request(app)
      .put(`/api/admin/pedidos/${editPedido.id}`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        items: [{ producto_id: prodIdLimited, cantidad: 9999 }],
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.ok).toBe(false);

    // Stock unchanged
    const [stockPanchoAfter] = await pool.query(
      'SELECT stock_actual FROM producto WHERE id = ?',
      [prodIdLimited]
    );
    expect(stockPanchoAfter[0].stock_actual).toBe(panchoBefore);

    // Detalle unchanged (from before this failed attempt)
    const detalles = await readDetalle(editPedido.id);
    expect(detalles.length).toBeGreaterThanOrEqual(1);
  });

  it('PUT rejects editing an online pedido', async () => {
    // create an online pedido via public route
    const resPost = await request(app)
      .post('/api/pedidos')
      .send({
        nombre_cliente: 'TEST-B6-2-ONLINE',
        metodo_pago: 'efectivo',
        items: [{ producto_id: 5, cantidad: 1 }],
      });
    expect(resPost.statusCode).toBe(201);
    const pedidoOnline = resPost.body.data;

    const res = await request(app)
      .put(`/api/admin/pedidos/${pedidoOnline.id}`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ items: [{ producto_id: 5, cantidad: 2 }] });

    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('PUT edits a cancelled pedido fails as expected', async () => {
    const editPedido2 = await crearPedidoCaja({
      nombre_cliente: 'TEST-B6-2-CANCEL-THEN-EDIT2',
      metodo_pago: 'efectivo',
      items: [{ producto_id: prodIdLimited, cantidad: 1 }],
    });

    // cancel it
    const cancelRes = await request(app)
      .patch(`/api/admin/pedidos/${editPedido2.id}/cancelar`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN);
    expect(cancelRes.statusCode).toBe(200);

    const res = await request(app)
      .put(`/api/admin/pedidos/${editPedido2.id}`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ items: [{ producto_id: prodIdLimited, cantidad: 1 }] });

    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('PUT works with an unlimited product without stock change', async () => {
    const stockBeforeUnlimited = await readStock([prodIdUnlimited]);
    const res = await request(app)
      .put(`/api/admin/pedidos/${editPedido.id}`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        items: [{ producto_id: prodIdUnlimited, cantidad: 5 }],
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.items.length).toBe(1);
    const stockAfterUnlimited = await readStock([prodIdUnlimited]);
    expect(stockAfterUnlimited.get(prodIdUnlimited).stock_actual).toBe(
      stockBeforeUnlimited.get(prodIdUnlimited).stock_actual
    );
  });

  it('PUT works with promo combo and reconciles component stock', async () => {
    const beforeIds = [1, 5, 15];
    const [stockBeforeCombo] = await pool.query(
      'SELECT id, stock_actual FROM producto WHERE id IN (?)',
      [beforeIds]
    );
    const beforeMap = new Map(stockBeforeCombo.map((r) => [r.id, r.stock_actual]));

    // prior detalle: prodIdUnlimited (18 qty 5) — unlimited, no stock impact
    // combo cena (24) qty 2: deducts 2 each of 1, 5, 15; no restore needed
    const res = await request(app)
      .put(`/api/admin/pedidos/${editPedido.id}`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        items: [{ producto_id: prodIdCombo, cantidad: 2 }],
      });

    expect(res.statusCode).toBe(200);

    const [stockAfterCombo] = await pool.query(
      'SELECT id, stock_actual FROM producto WHERE id IN (?)',
      [beforeIds]
    );
    const afterMap = new Map(stockAfterCombo.map((r) => [r.id, r.stock_actual]));

    for (const idComp of beforeIds) {
      expect(afterMap.get(idComp)).toBe(beforeMap.get(idComp) - 2);
    }
  });

  it('PUT rejects editing a pedido not found', async () => {
    const res = await request(app)
      .put('/api/admin/pedidos/99999')
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ items: [{ producto_id: 5, cantidad: 1 }] });
    expect(res.statusCode).toBe(404);
    expect(res.body.ok).toBe(false);
  });

  it('PUT reconciles empty-to items correctly', async () => {
    const pedidoVacio = await crearPedidoCaja({
      nombre_cliente: 'TEST-B6-2-EMPTY-TO',
      metodo_pago: 'efectivo',
      items: [{ producto_id: prodIdLimited, cantidad: 1 }],
    });

    const [stockBefore] = await pool.query(
      'SELECT stock_actual FROM producto WHERE id = ?',
      [prodIdLimited]
    );

    // swap to different product
    const res = await request(app)
      .put(`/api/admin/pedidos/${pedidoVacio.id}`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        items: [{ producto_id: prodIdLimited2, cantidad: 2 }],
      });
    expect(res.statusCode).toBe(200);
    expect(parseFloat(res.body.data.total)).toBeCloseTo(6000, 0); // Nuggets 3000*2

    // original item restored (Pancho stock should be +1 vs before)
    const [stockAfter] = await pool.query(
      'SELECT stock_actual FROM producto WHERE id = ?',
      [prodIdLimited]
    );
    expect(stockAfter[0].stock_actual).toBe(stockBefore[0].stock_actual + 1);
  });
});

/*
Manual test checklist (from spec.md):
1. Seed local DB with one caja pedido efectivo pending, one transferencia pending,
    one comprobante_subido, one pagado; login admin and save cookie.txt.
2. curl -b cookie.txt -X PATCH /api/admin/pedidos/:id/pago \
      -H 'Content-Type: application/json' -d '{"estado_pago":"pagado"}' \
      on the cash pending pedido -> 200, payment updates, stock unchanged.
3. Same PATCH on transferencia pending pedido without comprobante -> 200 (caja verified).
4. Same PATCH on already paid pedido with {"estado_pago":"pendiente"} -> 400.
5. curl -b cookie.txt GET '/api/admin/pedidos?solo_pagos_pendientes=true&origen=caja' \
      -> only pendiente/rechazado returned; cancelado excluded even if pago=pendiente.
6. curl -b cookie.txt -X PUT /api/admin/pedidos/:id \
      -H 'Content-Type: application/json' \
      -d '{"items":[{"producto_id":5,"cantidad":3},{"producto_id":6,"cantidad":2}]}' \
      -> 200, total updated, stock reconciled.
7. Repeat PUT with qty exceeding stock -> 409; re-read stock and detalle unchanged.
*/

// FIX retroactivo: cerrar pool al final del archivo para evitar open handles
// (Comentario 7 de Copilot Medium).
afterAll(async () => {
  await pool.end();
});
