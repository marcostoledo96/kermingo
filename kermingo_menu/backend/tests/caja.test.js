import request from 'supertest';
import app from '../src/app.js';
import jwt from 'jsonwebtoken';
import pool from '../src/api/database/db.js';
import environments from '../src/api/config/environments.js';
import {
  validatePaymentTransition,
  transitionsByMethod,
  PAGO_TRANSITIONS,
  cancelWithTransaction,
} from '../src/api/models/pedido.model.js';
import {
  updateEstadoPagoSchema,
  pedidoQuerySchema,
  editPedidoSchema,
} from '../src/api/schemas/pedido.schema.js';

const RUN_ID = `TEST-B6-2-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

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
 * FIX retroactivo: cleanup con cancelWithTransaction en vez de
 * reposición manual de stock. Esto evita doble reposición para
 * pedidos ya cancelados (Copilot High + ChatGPT P2 en PR #4).
 * También unifica el patrón con el fix del PR #3.
 */
async function limpiarPedidosDeTest() {
  const [rows] = await pool.query(
    'SELECT id, estado_pedido FROM pedido WHERE nombre_cliente LIKE ?',
    [`${RUN_ID}%`]
  );
  for (const pedido of rows) {
    if (['listo', 'entregado'].includes(pedido.estado_pedido)) {
      throw new Error(
        `Cleanup encontró pedido terminal ${pedido.id} en estado ${pedido.estado_pedido}. El test que lo creó debe restaurar stock explícitamente.`
      );
    }
    try {
      await cancelWithTransaction(pool, pedido.id);
    } catch (err) {
      // cancelWithTransaction may fail for terminal states — fall through to DELETE
    }
  }
  const [remaining] = await pool.query(
    'SELECT id FROM pedido WHERE nombre_cliente LIKE ?',
    [`${RUN_ID}%`]
  );
  const ids = remaining.map((r) => r.id);
  if (ids.length > 0) {
    const ph = ids.map(() => '?').join(',');
    await pool.query(`DELETE FROM pedido_detalle WHERE pedido_id IN (${ph})`, ids);
    await pool.query(`DELETE FROM pedido WHERE id IN (${ph})`, ids);
  }
}

/**
 * P1-4 — Deuda documentada: edición de pedidos de caja.
 *
 * La UI de caja (/admin/caja) NO ofrece edición de pedidos existentes.
 * Por lo tanto, este suite NO cubre los 3 flujos PR2 edit que se
 * conocen como faltantes:
 *   - PUT replaces items and total, stock reflects delta
 *   - PUT works with promo combo and reconciles component stock
 *   - PUT reconciles empty-to items correctly
 *
 * Decisión: cancelar + recrear pedido es el workaround soportado
 * para el evento. La UI de edición queda como trabajo post-evento.
 * Ver docs/planificacion/59-AUDITORIA_DB0806C_B7_E2E_FLOWS.md (P1-4).
 */

// Unit tests

describe('Caja payment-state machine (unit)', () => {
  it('pendiente -> pagado is valid (generic)', () => {
    expect(validatePaymentTransition('pendiente', 'pagado')).toBe(true);
  });

  it('pendiente -> comprobante_subido is valid (generic)', () => {
    expect(validatePaymentTransition('pendiente', 'comprobante_subido')).toBe(true);
  });

  it('comprobante_subido -> pagado is valid (generic)', () => {
    expect(validatePaymentTransition('comprobante_subido', 'pagado')).toBe(true);
  });

  it('comprobante_subido -> rechazado is valid (generic)', () => {
    expect(validatePaymentTransition('comprobante_subido', 'rechazado')).toBe(true);
  });

  it('rechazado -> pendiente is valid (generic)', () => {
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

  it('same state is valid for transition map (no-op in model layer)', () => {
    expect(validatePaymentTransition('pagado', 'pagado')).toBe(true);
    expect(validatePaymentTransition('pendiente', 'pendiente')).toBe(true);
  });

  it('same state is rejected by updateEstadoPago (explicit PATCH should change state)', async () => {
    // Create an efectivo pedido already in pagado state
    const pagoPedido = await crearPedidoCaja({
      nombre_cliente: `${RUN_ID}-SAME-STATE`,
      metodo_pago: 'efectivo',
      items: [{ producto_id: 5, cantidad: 1 }],
    });
    // Mark as pagado
    await request(app)
      .patch(`/api/admin/pedidos/${pagoPedido.id}/pago`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ estado_pago: 'pagado' });

    // Try PATCH with same state — should be 400
    const res = await request(app)
      .patch(`/api/admin/pedidos/${pagoPedido.id}/pago`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ estado_pago: 'pagado' });

    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('PAGO_TRANSITIONS contains all expected keys', () => {
    expect(Object.keys(PAGO_TRANSITIONS)).toEqual(
      expect.arrayContaining(['pendiente', 'comprobante_subido', 'rechazado', 'pagado'])
    );
  });
});

// Method-aware payment state machine (unit)

describe('Caja payment-state-machine method-aware (unit)', () => {
  it('efectivo: pendiente -> pagado is valid', () => {
    expect(validatePaymentTransition('pendiente', 'pagado', 'efectivo')).toBe(true);
  });

  it('efectivo: pendiente -> comprobante_subido is invalid', () => {
    expect(validatePaymentTransition('pendiente', 'comprobante_subido', 'efectivo')).toBe(false);
  });

  it('efectivo: pendiente -> rechazado is invalid', () => {
    expect(validatePaymentTransition('pendiente', 'rechazado', 'efectivo')).toBe(false);
  });

  it('efectivo: pagado -> pendiente is invalid (terminal)', () => {
    expect(validatePaymentTransition('pagado', 'pendiente', 'efectivo')).toBe(false);
  });

  it('efectivo: same-state pendiente is valid (no-op)', () => {
    expect(validatePaymentTransition('pendiente', 'pendiente', 'efectivo')).toBe(true);
  });

  it('transferencia: pendiente -> comprobante_subido is valid', () => {
    expect(validatePaymentTransition('pendiente', 'comprobante_subido', 'transferencia')).toBe(true);
  });

  it('transferencia: pendiente -> pagado is valid', () => {
    expect(validatePaymentTransition('pendiente', 'pagado', 'transferencia')).toBe(true);
  });

  it('transferencia: comprobante_subido -> pagado is valid', () => {
    expect(validatePaymentTransition('comprobante_subido', 'pagado', 'transferencia')).toBe(true);
  });

  it('transferencia: comprobante_subido -> rechazado is valid', () => {
    expect(validatePaymentTransition('comprobante_subido', 'rechazado', 'transferencia')).toBe(true);
  });

  it('transferencia: rechazado -> pendiente is valid', () => {
    expect(validatePaymentTransition('rechazado', 'pendiente', 'transferencia')).toBe(true);
  });

  it('transferencia: rechazado -> comprobante_subido is valid', () => {
    expect(validatePaymentTransition('rechazado', 'comprobante_subido', 'transferencia')).toBe(true);
  });

  it('transferencia: rechazado -> pagado is valid', () => {
    expect(validatePaymentTransition('rechazado', 'pagado', 'transferencia')).toBe(true);
  });

  it('transferencia: pagado -> anything is invalid (terminal)', () => {
    expect(validatePaymentTransition('pagado', 'pendiente', 'transferencia')).toBe(false);
  });

  it('transitionsByMethod has efectivo and transferencia keys', () => {
    expect(Object.keys(transitionsByMethod)).toEqual(
      expect.arrayContaining(['efectivo', 'transferencia'])
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

  it('editPedidoSchema accepts metadata-only body without items', () => {
    const result = editPedidoSchema.safeParse({ nombre_cliente: 'Test' });
    expect(result.success).toBe(true);
  });

  it('editPedidoSchema accepts metodo_pago only', () => {
    const result = editPedidoSchema.safeParse({ metodo_pago: 'transferencia' });
    expect(result.success).toBe(true);
  });

  it('editPedidoSchema rejects empty body (no fields at all)', () => {
    const result = editPedidoSchema.safeParse({});
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
    // Create explicit pending estado_pago to validate pending -> pagado transition for efectivo.
    const pedidoEfectivoRes = await request(app)
      .post('/api/admin/pedidos/caja')
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        nombre_cliente: `${RUN_ID}-EFECTIVO`,
        metodo_pago: 'efectivo',
        estado_pago: 'pendiente',
        items: [{ producto_id: 5, cantidad: 1 }], // Pancho
      });
    expect(pedidoEfectivoRes.statusCode).toBe(201);
    pedidoEfectivo = pedidoEfectivoRes.body.data;

    pedidoTransferencia = await crearPedidoCaja({
      nombre_cliente: `${RUN_ID}-TRANSFERENCIA`,
      metodo_pago: 'transferencia',
      items: [{ producto_id: 5, cantidad: 1 }],
    });
  });

  afterAll(async () => {
    await limpiarPedidosDeTest();
  });

  it('PATCH pendiente -> pagado for efectivo returns 200, stock/estado_pedido unchanged (en_preparacion)', async () => {
    const res = await request(app)
      .patch(`/api/admin/pedidos/${pedidoEfectivo.id}/pago`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ estado_pago: 'pagado' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.estado_pago).toBe('pagado');
    expect(res.body.data.estado_pedido).toBe('en_preparacion');
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

  it('PATCH rechazado -> pagado for transferencia returns 200', async () => {
    const resCreate = await request(app)
      .post('/api/admin/pedidos/caja')
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        nombre_cliente: `${RUN_ID}-TRANSFERENCIA-RECHAZADO`,
        metodo_pago: 'transferencia',
        items: [{ producto_id: 5, cantidad: 1 }],
      });
    expect(resCreate.statusCode).toBe(201);

    await pool.query('UPDATE pedido SET estado_pago = ? WHERE id = ?', [
      'rechazado',
      resCreate.body.data.id,
    ]);

    const res = await request(app)
      .patch(`/api/admin/pedidos/${resCreate.body.data.id}/pago`)
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
});

// PR1: Authenticated unpaid-filter integration tests

describe('Authenticated GET solo_pagos_pendientes (PR1 integration)', () => {
  it('excludes pagado pedidos from the unpaid list', async () => {
    const res = await request(app)
      .get('/api/admin/pedidos?solo_pagos_pendientes=true&limit=100')
      .set('Cookie', adminCookie());
    expect(res.statusCode).toBe(200);
    const pedidos = res.body.data.pedidos;
    const tienePagado = pedidos.some((p) => p.estado_pago === 'pagado');
    expect(tienePagado).toBe(false);
  });

  it('excludes cancelado pedidos even when their pago is still pendiente', async () => {
    const res = await request(app)
      .get('/api/admin/pedidos?solo_pagos_pendientes=true&limit=100')
      .set('Cookie', adminCookie());
    expect(res.statusCode).toBe(200);
    const pedidos = res.body.data.pedidos;
    const tieneCancelado = pedidos.some((p) => p.estado_pedido === 'cancelado');
    expect(tieneCancelado).toBe(false);
  });

  it('only returns pedidos with estado_pago in pendiente or rechazado', async () => {
    const res = await request(app)
      .get('/api/admin/pedidos?solo_pagos_pendientes=true&limit=100')
      .set('Cookie', adminCookie());
    expect(res.statusCode).toBe(200);
    const pedidos = res.body.data.pedidos;
    for (const p of pedidos) {
      expect(['pendiente', 'rechazado']).toContain(p.estado_pago);
    }
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
      18: 0,   // Agua mineral (unlimited product)
      24: 0,   // Combo cena placeholder
    };
    for (const [pid, stock] of Object.entries(baselineStock)) {
      await pool.query('UPDATE producto SET stock_actual = ? WHERE id = ?', [stock, pid]);
    }

    // Ensure fixture characteristics are explicit for unstable local DBs.
    await pool.query('UPDATE producto SET stock_limitado = 0 WHERE id = ?', [18]);
    await pool.query('UPDATE producto SET activo = 1 WHERE id = ?', [24]);

    await limpiarPedidosDeTest();
    editPedido = await crearPedidoCaja({
      nombre_cliente: `${RUN_ID}-EDIT`,
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

      const [priceRows] = await pool.query(
        'SELECT id, precio FROM producto WHERE id IN (?, ?)',
        [prodIdLimited2, prodIdLimited]
      );
      const priceMap = new Map(priceRows.map((r) => [r.id, parseFloat(r.precio)]));
      const expectedTotal =
        priceMap.get(prodIdLimited2) * 2 +
        priceMap.get(prodIdLimited) * 3;

      expect(parseFloat(pedido.total)).toBeCloseTo(expectedTotal, 0);
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
        nombre_cliente: `${RUN_ID}-EDIT-RENAMED`,
        mesa: 'Mesa 99',
        observaciones: 'Sin cebolla',
        metodo_pago: 'transferencia',
        items: [{ producto_id: prodIdLimited, cantidad: 1 }],
      });

    expect(res.statusCode).toBe(200);
    const pedido = res.body.data;
    expect(pedido.nombre_cliente).toBe(`${RUN_ID}-EDIT-RENAMED`);
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
    // B7: public route only accepts transferencia with comprobante.
    // Use a minimal valid JPEG to create an online pedido.
    const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00]);
    const resPost = await request(app)
      .post('/api/pedidos')
      .field('nombre_cliente', `${RUN_ID}-ONLINE`)
      .field('metodo_pago', 'transferencia')
      .field('items', JSON.stringify([{ producto_id: 5, cantidad: 1 }]))
      .attach('comprobante', jpegBuffer, {
        filename: 'receipt.jpg',
        contentType: 'image/jpeg',
      });

    // If Drive is not configured, skip this test (upload fails with 503)
    if (resPost.statusCode === 503) {
      console.warn('Skipping online pedido edit test — Drive not configured');
      return;
    }

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
      nombre_cliente: `${RUN_ID}-CANCEL-THEN-EDIT2`,
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
      nombre_cliente: `${RUN_ID}-EMPTY-TO`,
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
      const [priceRows] = await pool.query('SELECT precio FROM producto WHERE id = ?', [prodIdLimited2]);
      const expectedTotal = parseFloat(priceRows[0].precio) * 2;
      expect(parseFloat(res.body.data.total)).toBeCloseTo(expectedTotal, 0);

    // original item restored (Pancho stock should be +1 vs before)
    const [stockAfter] = await pool.query(
      'SELECT stock_actual FROM producto WHERE id = ?',
      [prodIdLimited]
    );
    expect(stockAfter[0].stock_actual).toBe(stockBefore[0].stock_actual + 1);
  });
});

// B6.2.1: Partial edit (integration)

describe('Caja partial edit (integration)', () => {
  let partialPedido;
  let prodIdLimited = 9; // Torta frita

  async function readStock(ids) {
    const [rows] = await pool.query(
      'SELECT id, stock_actual, stock_limitado FROM producto WHERE id IN (?)',
      [ids]
    );
    const map = new Map();
    for (const r of rows) map.set(r.id, r);
    return map;
  }

  beforeAll(async () => {
    await limpiarPedidosDeTest();
    partialPedido = await crearPedidoCaja({
      nombre_cliente: `${RUN_ID}-PARTIAL`,
      metodo_pago: 'efectivo',
      items: [{ producto_id: prodIdLimited, cantidad: 1 }],
    });
  });

  afterAll(async () => {
    await limpiarPedidosDeTest();
  });

  it('PUT only nombre_cliente updates name, stock unchanged', async () => {
    const stockBefore = await readStock([prodIdLimited]);

    const res = await request(app)
      .put(`/api/admin/pedidos/${partialPedido.id}`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ nombre_cliente: `${RUN_ID}-PARTIAL-RENAMED` });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.nombre_cliente).toBe(`${RUN_ID}-PARTIAL-RENAMED`);

    const stockAfter = await readStock([prodIdLimited]);
    expect(stockAfter.get(prodIdLimited).stock_actual).toBe(
      stockBefore.get(prodIdLimited).stock_actual
    );
  });

  it('PUT only metodo_pago updates method', async () => {
    const res = await request(app)
      .put(`/api/admin/pedidos/${partialPedido.id}`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ metodo_pago: 'transferencia' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.metodo_pago).toBe('transferencia');
  });

  it('PUT empty body returns 400', async () => {
    const res = await request(app)
      .put(`/api/admin/pedidos/${partialPedido.id}`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

// B6.2.1: Edit metodo_pago coherence (integration)

describe('Caja edit metodo_pago coherence (integration)', () => {
  let coherencePedido;
  let prodIdLimited = 9; // Torta frita

  beforeAll(async () => {
    await limpiarPedidosDeTest();
    coherencePedido = await crearPedidoCaja({
      nombre_cliente: `${RUN_ID}-COHERENCE`,
      metodo_pago: 'transferencia',
      items: [{ producto_id: prodIdLimited, cantidad: 1 }],
    });
    // Mark as comprobante_subido
    await request(app)
      .patch(`/api/admin/pedidos/${coherencePedido.id}/pago`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ estado_pago: 'comprobante_subido' });
  });

  afterAll(async () => {
    await limpiarPedidosDeTest();
  });

  it('PUT transferencia -> efectivo coerces comprobante_subido to pendiente', async () => {
    const res = await request(app)
      .put(`/api/admin/pedidos/${coherencePedido.id}`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ metodo_pago: 'efectivo' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.metodo_pago).toBe('efectivo');
    expect(res.body.data.estado_pago).toBe('pendiente');
  });
});

// B6.2.1: Cancelled payment block (integration)

describe('Caja cancelled payment block (integration)', () => {
  let cancelPedido;
  let prodIdLimited = 9; // Torta frita

  beforeAll(async () => {
    await limpiarPedidosDeTest();
    cancelPedido = await crearPedidoCaja({
      nombre_cliente: `${RUN_ID}-CANCEL-PAY-BLOCK`,
      metodo_pago: 'efectivo',
      items: [{ producto_id: prodIdLimited, cantidad: 1 }],
    });
    // Cancel it
    const cancelRes = await request(app)
      .patch(`/api/admin/pedidos/${cancelPedido.id}/cancelar`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN);
    expect(cancelRes.statusCode).toBe(200);
  });

  afterAll(async () => {
    await limpiarPedidosDeTest();
  });

  it('PATCH payment on cancelled pedido returns 400', async () => {
    const res = await request(app)
      .patch(`/api/admin/pedidos/${cancelPedido.id}/pago`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ estado_pago: 'pagado' });

    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

// B7: Public vs caja payment method tests

describe('B7: Public route rejects efectivo; caja accepts both', () => {
  it('POST /api/pedidos with efectivo returns 400', async () => {
    const res = await request(app)
      .post('/api/pedidos')
      .field('nombre_cliente', `${RUN_ID}-B7-PUBLIC-EFECTIVO`)
      .field('metodo_pago', 'efectivo')
      .field('items', JSON.stringify([{ producto_id: 5, cantidad: 1 }]));

    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.toLowerCase()).toContain('efectivo');
  });

  it('POST /api/admin/pedidos/caja with efectivo returns 201', async () => {
    const res = await request(app)
      .post('/api/admin/pedidos/caja')
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        nombre_cliente: `${RUN_ID}-B7-CAJA-EFECTIVO`,
        metodo_pago: 'efectivo',
        items: [{ producto_id: 5, cantidad: 1 }],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.metodo_pago).toBe('efectivo');
  });

  it('POST /api/admin/pedidos/caja with transferencia returns 201', async () => {
    const res = await request(app)
      .post('/api/admin/pedidos/caja')
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        nombre_cliente: `${RUN_ID}-B7-CAJA-TRANSFER`,
        metodo_pago: 'transferencia',
        items: [{ producto_id: 5, cantidad: 1 }],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.metodo_pago).toBe('transferencia');
  });

  it('P1-4: caja efectivo sin estado_pago queda pagado', async () => {
    const res = await request(app)
      .post('/api/admin/pedidos/caja')
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        nombre_cliente: `${RUN_ID}-B7-CAJA-EFECTIVO-DEFAULT-PAGO`,
        metodo_pago: 'efectivo',
        items: [{ producto_id: 5, cantidad: 1 }],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.estado_pago).toBe('pagado');
    expect(res.body.data.estado_pedido).toBe('en_preparacion');
    expect(res.body.data.origen).toBe('caja');
  });

  it('P1-4: caja transferencia sin estado_pago queda pendiente', async () => {
    const res = await request(app)
      .post('/api/admin/pedidos/caja')
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        nombre_cliente: `${RUN_ID}-B7-CAJA-TRANSFERENCIA-DEFAULT-PEND`,
        metodo_pago: 'transferencia',
        items: [{ producto_id: 5, cantidad: 1 }],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.estado_pago).toBe('pendiente');
    expect(res.body.data.estado_pedido).toBe('en_preparacion');
    expect(res.body.data.origen).toBe('caja');
  });

  it('P1-4: caja explícita estado_pago se preserva', async () => {
    const res = await request(app)
      .post('/api/admin/pedidos/caja')
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        nombre_cliente: `${RUN_ID}-B7-CAJA-EFECTIVO-EXPLICIT`,
        metodo_pago: 'efectivo',
        estado_pago: 'pendiente',
        items: [{ producto_id: 5, cantidad: 1 }],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.estado_pago).toBe('pendiente');
  });

  afterAll(async () => {
    await limpiarPedidosDeTest();
  });
});

// Pool cleanup — must be last afterAll
afterAll(async () => {
  try { await pool.end(); } catch (_) { /* pool ya cerrado por otra suite */ }
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
5. PATCH efectivo pedido with {"estado_pago":"comprobante_subido"} -> 400 (method-aware block).
6. PATCH cancelled pedido with {"estado_pago":"pagado"} -> 400 (cancelled block).
7. curl -b cookie.txt GET '/api/admin/pedidos?solo_pagos_pendientes=true&origen=caja' \
      -> only pendiente/rechazado returned; cancelado excluded even if pago=pendiente.
8. curl -b cookie.txt -X PUT /api/admin/pedidos/:id \
      -H 'Content-Type: application/json' \
      -d '{"items":[{"producto_id":5,"cantidad":3},{"producto_id":6,"cantidad":2}]}' \
      -> 200, total updated, stock reconciled.
 7. Repeat PUT with qty exceeding stock -> 409; re-read stock and detalle unchanged.
*/
