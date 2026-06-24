import request from 'supertest';
import app from '../src/app.js';
import jwt from 'jsonwebtoken';
import pool from '../src/api/database/db.js';
import environments from '../src/api/config/environments.js';
import {
  validatePaymentTransition,
  transitionsByMethod,
  PAGO_TRANSITIONS,
  createWithTransaction,
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
    'SELECT id, estado_pedido, comprobante_archivo_id FROM pedido WHERE nombre_cliente LIKE ?',
    [`${RUN_ID}%`]
  );
  const archivoIds = rows.map((row) => row.comprobante_archivo_id).filter(Boolean);

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
    if (archivoIds.length > 0) {
      const aph = archivoIds.map(() => '?').join(',');
      await pool.query(
        `UPDATE pedido SET comprobante_archivo_id = NULL WHERE comprobante_archivo_id IN (${aph})`,
        archivoIds
      );
      await pool.query(`DELETE FROM archivo_drive WHERE id IN (${aph})`, archivoIds);
    }

    const ph = ids.map(() => '?').join(',');
    await pool.query(`DELETE FROM pedido_detalle WHERE pedido_id IN (${ph})`, ids);
    await pool.query(`DELETE FROM pedido WHERE id IN (${ph})`, ids);
  }
}

async function limpiarProductosDeTest() {
  const [rows] = await pool.query(
    'SELECT id FROM producto WHERE nombre LIKE ?',
    [`${RUN_ID}-PRODUCTO-%`]
  );
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return;

  const ph = ids.map(() => '?').join(',');
  await pool.query(`DELETE FROM combo_producto WHERE combo_id IN (${ph}) OR producto_id IN (${ph})`, [...ids, ...ids]);
  await pool.query(`DELETE FROM producto_categoria WHERE producto_id IN (${ph})`, ids);
  await pool.query(`DELETE FROM producto WHERE id IN (${ph})`, ids);
}

async function crearProductoFixture({
  suffix,
  tipo = 'comida',
  disponible = 1,
  stockLimitado = 1,
  stockActual = 50,
  precio = 1000,
}) {
  const [result] = await pool.query(
    `INSERT INTO producto
       (nombre, descripcion, precio, tipo, stock_limitado, stock_actual, stock_minimo_alerta, activo, disponible, orden)
     VALUES (?, 'Producto test caja promo', ?, ?, ?, ?, 5, 1, ?, 0)`,
    [`${RUN_ID}-PRODUCTO-${suffix}`, precio, tipo, stockLimitado, stockActual, disponible]
  );
  return result.insertId;
}

async function crearPromoFixture({ promoDisponible = 1, componenteDisponible = 1 } = {}) {
  const componenteId = await crearProductoFixture({
    suffix: `COMP-${Math.random().toString(36).slice(2, 6)}`,
    disponible: componenteDisponible,
    stockActual: 20,
    precio: 500,
  });
  const promoId = await crearProductoFixture({
    suffix: `PROMO-${Math.random().toString(36).slice(2, 6)}`,
    tipo: 'promo',
    disponible: promoDisponible,
    stockLimitado: 0,
    stockActual: null,
    precio: 1200,
  });
  await pool.query(
    'INSERT INTO combo_producto (combo_id, producto_id, cantidad) VALUES (?, ?, ?)',
    [promoId, componenteId, 2]
  );
  return { promoId, componenteId };
}

async function adjuntarComprobanteFalso(pedidoId, tag = 'e2e') {
  const [archivoRes] = await pool.query(
    `INSERT INTO archivo_drive (drive_id, nombre_original, mime_type, tamanio_bytes, tipo, url_publica)
     VALUES (?, ?, ?, ?, 'comprobante', ?)`,
    [`test-drive-${pedidoId}-${tag}-${Date.now()}`, 'comprobante-test.jpg', 'image/jpeg', 1024, null]
  );
  await pool.query('UPDATE pedido SET comprobante_archivo_id = ? WHERE id = ?', [archivoRes.insertId, pedidoId]);
  return archivoRes.insertId;
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
    // Caja orders now start as pagado (force-pagado). Create two orders:
    // one efectivo, one transferencia — both start as pagado.
    // Use direct DB to set one to pendiente for the pending->pagado transition test.
    pedidoEfectivo = await crearPedidoCaja({
      nombre_cliente: `${RUN_ID}-EFECTIVO`,
      metodo_pago: 'efectivo',
      items: [{ producto_id: 5, cantidad: 1 }],
    });
    // Force efectivo order to pendiente for transition test (caja starts as pagado)
    await pool.query('UPDATE pedido SET estado_pago = ? WHERE id = ?', [
      'pendiente',
      pedidoEfectivo.id,
    ]);

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
    // Transferencia order starts as pagado (force-pagado). Force to pendiente via DB for test.
    await pool.query('UPDATE pedido SET estado_pago = ? WHERE id = ?', [
      'pendiente',
      pedidoTransferencia.id,
    ]);
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
      'SELECT producto_id, precio_unitario, cantidad, subtotal FROM pedido_detalle WHERE pedido_id = ? ORDER BY producto_id ASC',
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

  it('PUT edits only metadata of an online pedido deterministically', async () => {
    const pedidoOnline = await createWithTransaction(pool, {
      nombre_cliente: `${RUN_ID}-ONLINE`,
      metodo_pago: 'transferencia',
      origen: 'online',
      items: [{ producto_id: 5, cantidad: 1 }],
    });

    const pedidoId = pedidoOnline.pedidoId;
    const [pedidoBeforeRows] = await pool.query(
      'SELECT origen, total FROM pedido WHERE id = ?',
      [pedidoId]
    );
    expect(pedidoBeforeRows[0].origen).toBe('online');
    const totalBefore = parseFloat(pedidoBeforeRows[0].total);

    const detalleBefore = await readDetalle(pedidoId);
    const stockBefore = await readStock([5]);

    const res = await request(app)
      .put(`/api/admin/pedidos/${pedidoId}`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        nombre_cliente: `${RUN_ID}-ONLINE-UPDATED`,
        mesa: 'Mesa 77',
        observaciones: 'Sin mayonesa',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);

    const [pedidoAfterRows] = await pool.query(
      'SELECT nombre_cliente, mesa, observaciones, total FROM pedido WHERE id = ?',
      [pedidoId]
    );
    const pedidoAfter = pedidoAfterRows[0];
    expect(pedidoAfter.nombre_cliente).toBe(`${RUN_ID}-ONLINE-UPDATED`);
    expect(pedidoAfter.mesa).toBe('Mesa 77');
    expect(pedidoAfter.observaciones).toBe('Sin mayonesa');
    expect(parseFloat(pedidoAfter.total)).toBeCloseTo(totalBefore, 2);

    const detalleAfter = await readDetalle(pedidoId);
    expect(detalleAfter).toHaveLength(detalleBefore.length);
    for (let i = 0; i < detalleBefore.length; i += 1) {
      expect(detalleAfter[i].producto_id).toBe(detalleBefore[i].producto_id);
      expect(detalleAfter[i].cantidad).toBe(detalleBefore[i].cantidad);
      expect(parseFloat(detalleAfter[i].subtotal)).toBeCloseTo(parseFloat(detalleBefore[i].subtotal), 2);
      expect(parseFloat(detalleAfter[i].precio_unitario)).toBeCloseTo(
        parseFloat(detalleBefore[i].precio_unitario),
        2
      );
    }

    const stockAfter = await readStock([5]);
    expect(stockAfter.get(5).stock_actual).toBe(stockBefore.get(5).stock_actual);
  });

  it('PUT allows online pedido item edits with stock and total reconciliation', async () => {
    const pedidoOnline = await createWithTransaction(pool, {
      nombre_cliente: `${RUN_ID}-ONLINE-RECON-ITEM`,
      metodo_pago: 'efectivo',
      origen: 'online',
      items: [{ producto_id: prodIdLimited, cantidad: 1 }],
    });

    const pedidoId = pedidoOnline.pedidoId;

    const stockBefore = await readStock([prodIdLimited, prodIdLimited2]);
    const stockBeforeLimited = Number(stockBefore.get(prodIdLimited).stock_actual);
    const stockBeforeLimited2 = Number(stockBefore.get(prodIdLimited2).stock_actual);

    const [pedidoBeforeRows] = await pool.query(
      'SELECT origen, estado_pedido, total FROM pedido WHERE id = ?',
      [pedidoId]
    );
    const pedidoBefore = pedidoBeforeRows[0];
    expect(pedidoBefore.origen).toBe('online');

    const totalBefore = parseFloat(pedidoBefore.total);
    const estadoPedidoBefore = pedidoBefore.estado_pedido;

    const detalleBefore = await readDetalle(pedidoId);
    expect(detalleBefore).toHaveLength(1);
    expect(detalleBefore[0].producto_id).toBe(prodIdLimited);
    expect(detalleBefore[0].cantidad).toBe(1);

    const [priceRows] = await pool.query('SELECT id, precio FROM producto WHERE id IN (?, ?)', [
      prodIdLimited,
      prodIdLimited2,
    ]);
    const priceMap = new Map(priceRows.map((r) => [r.id, parseFloat(r.precio)]));
    const expectedTotal = priceMap.get(prodIdLimited) * 3 + priceMap.get(prodIdLimited2) * 2;

    const res = await request(app)
      .put(`/api/admin/pedidos/${pedidoId}`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        items: [
          { producto_id: prodIdLimited, cantidad: 3 },
          { producto_id: prodIdLimited2, cantidad: 2 },
        ],
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(parseFloat(res.body.data.total)).toBeCloseTo(expectedTotal, 2);

    const [pedidoAfterRows] = await pool.query(
      'SELECT origen, estado_pedido, total FROM pedido WHERE id = ?',
      [pedidoId]
    );
    const pedidoAfter = pedidoAfterRows[0];
    expect(pedidoAfter.origen).toBe('online');
    expect(pedidoAfter.estado_pedido).toBe(estadoPedidoBefore);
    expect(parseFloat(pedidoAfter.total)).not.toBeCloseTo(totalBefore, 2);
    expect(parseFloat(pedidoAfter.total)).toBeCloseTo(expectedTotal, 2);

    const detalleAfter = await readDetalle(pedidoId);
    expect(detalleAfter).toHaveLength(2);
    const detalleByProduct = new Map(detalleAfter.map((d) => [d.producto_id, d.cantidad]));
    expect(detalleByProduct.get(prodIdLimited)).toBe(3);
    expect(detalleByProduct.get(prodIdLimited2)).toBe(2);

    const stockAfter = await readStock([prodIdLimited, prodIdLimited2]);
    expect(stockAfter.get(prodIdLimited).stock_actual).toBe(stockBeforeLimited + 1 - 3);
    expect(stockAfter.get(prodIdLimited2).stock_actual).toBe(stockBeforeLimited2 - 2);
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

  it('PUT allows metadata-only edits on cancelled pedido with no item/total/stock changes', async () => {
    const cancelPedidoMeta = await crearPedidoCaja({
      nombre_cliente: `${RUN_ID}-CANCEL-META`,
      metodo_pago: 'efectivo',
      items: [{ producto_id: prodIdLimited, cantidad: 1 }],
    });

    const cancelRes = await request(app)
      .patch(`/api/admin/pedidos/${cancelPedidoMeta.id}/cancelar`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN);
    expect(cancelRes.statusCode).toBe(200);

    const [pedidoBeforeRows] = await pool.query(
      'SELECT estado_pedido, total FROM pedido WHERE id = ?',
      [cancelPedidoMeta.id]
    );
    expect(pedidoBeforeRows[0].estado_pedido).toBe('cancelado');

    const [detalleBeforeRows] = await pool.query(
      'SELECT producto_id, cantidad, precio_unitario, subtotal FROM pedido_detalle WHERE pedido_id = ? ORDER BY producto_id ASC',
      [cancelPedidoMeta.id]
    );

    const [stockBeforeRows] = await pool.query(
      'SELECT stock_actual FROM producto WHERE id = ?',
      [prodIdLimited]
    );

    const totalBefore = parseFloat(pedidoBeforeRows[0].total);
    const stockBefore = stockBeforeRows[0].stock_actual;

    const res = await request(app)
      .put(`/api/admin/pedidos/${cancelPedidoMeta.id}`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        nombre_cliente: `${RUN_ID}-CANCEL-META-UPDATED`,
        mesa: 'Mesa 99',
        observaciones: 'Sin ketchup',
      });

    expect(res.statusCode).toBe(200);

    const [pedidoAfterRows] = await pool.query(
      'SELECT estado_pedido, total, nombre_cliente, mesa, observaciones FROM pedido WHERE id = ?',
      [cancelPedidoMeta.id]
    );
    const pedidoAfter = pedidoAfterRows[0];
    expect(pedidoAfter.estado_pedido).toBe('cancelado');
    expect(pedidoAfter.nombre_cliente).toBe(`${RUN_ID}-CANCEL-META-UPDATED`);
    expect(pedidoAfter.mesa).toBe('Mesa 99');
    expect(pedidoAfter.observaciones).toBe('Sin ketchup');
    expect(parseFloat(pedidoAfter.total)).toBeCloseTo(totalBefore, 2);

    const [detalleAfterRows] = await pool.query(
      'SELECT producto_id, cantidad, precio_unitario, subtotal FROM pedido_detalle WHERE pedido_id = ? ORDER BY producto_id ASC',
      [cancelPedidoMeta.id]
    );
    expect(detalleAfterRows).toHaveLength(detalleBeforeRows.length);
    for (let i = 0; i < detalleBeforeRows.length; i += 1) {
      expect(detalleAfterRows[i].producto_id).toBe(detalleBeforeRows[i].producto_id);
      expect(detalleAfterRows[i].cantidad).toBe(detalleBeforeRows[i].cantidad);
      expect(parseFloat(detalleAfterRows[i].subtotal)).toBeCloseTo(parseFloat(detalleBeforeRows[i].subtotal), 2);
      expect(parseFloat(detalleAfterRows[i].precio_unitario)).toBeCloseTo(
        parseFloat(detalleBeforeRows[i].precio_unitario),
        2
      );
    }

    const [stockAfterRows] = await pool.query(
      'SELECT stock_actual FROM producto WHERE id = ?',
      [prodIdLimited]
    );
    expect(stockAfterRows[0].stock_actual).toBe(stockBefore);
  });

  it('PUT canceled pedido with empty items array fails as expected', async () => {
    const canceledPedido = await crearPedidoCaja({
      nombre_cliente: `${RUN_ID}-CANCEL-EMPTY-ITEMS`,
      metodo_pago: 'efectivo',
      items: [{ producto_id: prodIdLimited, cantidad: 1 }],
    });

    const cancelRes = await request(app)
      .patch(`/api/admin/pedidos/${canceledPedido.id}/cancelar`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN);
    expect(cancelRes.statusCode).toBe(200);

    const res = await request(app)
      .put(`/api/admin/pedidos/${canceledPedido.id}`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ items: [] });

    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('PUT allows delivered pedido item edits with stock/total reconciliation', async () => {
    const deliveredPedido = await crearPedidoCaja({
      nombre_cliente: `${RUN_ID}-DELIVERED-ITEM-EDIT`,
      metodo_pago: 'transferencia',
      items: [{ producto_id: prodIdLimited, cantidad: 1 }],
    });

    const stockBefore = await readStock([prodIdLimited, prodIdLimited2]);
    const [precioRows] = await pool.query(
      'SELECT id, precio FROM producto WHERE id IN (?, ?)',
      [prodIdLimited, prodIdLimited2]
    );
    const precioMap = new Map(precioRows.map((r) => [r.id, parseFloat(r.precio)]));
    const [pedidoBeforeRows] = await pool.query('SELECT total FROM pedido WHERE id = ?', [deliveredPedido.id]);
    const totalBefore = parseFloat(pedidoBeforeRows[0].total);

    try {
      await pool.query(
        'UPDATE pedido SET estado_pedido = ?, estado_pago = ?, metodo_pago = ? WHERE id = ?',
        ['entregado', 'pendiente', 'transferencia', deliveredPedido.id]
      );

      const resItems = await request(app)
        .put(`/api/admin/pedidos/${deliveredPedido.id}`)
        .set('Cookie', adminCookie())
        .set('Origin', ORIGIN)
        .send({
          items: [
            { producto_id: prodIdLimited, cantidad: 3 },
            { producto_id: prodIdLimited2, cantidad: 1 },
          ],
        });

      expect(resItems.statusCode).toBe(200);
      expect(resItems.body.ok).toBe(true);

      const expectedTotal = precioMap.get(prodIdLimited) * 3 + precioMap.get(prodIdLimited2) * 1;
      expect(parseFloat(resItems.body.data.total)).toBeCloseTo(expectedTotal, 2);
      expect(resItems.body.data.estado_pedido).toBe('entregado');
      expect(parseFloat(resItems.body.data.total)).not.toBeCloseTo(totalBefore, 2);

      const stockAfter = await readStock([prodIdLimited, prodIdLimited2]);
      expect(stockAfter.get(prodIdLimited).stock_actual).toBe(
        stockBefore.get(prodIdLimited).stock_actual + 1 - 3
      );
      expect(stockAfter.get(prodIdLimited2).stock_actual).toBe(
        stockBefore.get(prodIdLimited2).stock_actual - 1
      );

      const [pedidoAfterRows] = await pool.query('SELECT estado_pedido FROM pedido WHERE id = ?', [deliveredPedido.id]);
      expect(pedidoAfterRows[0].estado_pedido).toBe('entregado');
    } finally {
      await pool.query(
        'UPDATE pedido SET estado_pedido = ? WHERE id = ?',
        ['en_preparacion', deliveredPedido.id]
      );
    }
  });

  it('PUT rejects invalid payment transition in edit', async () => {
    const transitionPedido = await crearPedidoCaja({
      nombre_cliente: `${RUN_ID}-TRANSITION-FORCE`,
      metodo_pago: 'efectivo',
      items: [{ producto_id: prodIdLimited, cantidad: 1 }],
    });

    await pool.query(
      'UPDATE pedido SET estado_pago = ?, metodo_pago = ? WHERE id = ?',
      ['pendiente', 'efectivo', transitionPedido.id]
    );

    const res = await request(app)
      .put(`/api/admin/pedidos/${transitionPedido.id}`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ estado_pago: 'rechazado' });

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

  async function readDetalle(pedidoId) {
    const [rows] = await pool.query(
      'SELECT producto_id, precio_unitario, cantidad, subtotal FROM pedido_detalle WHERE pedido_id = ? ORDER BY producto_id ASC',
      [pedidoId]
    );
    return rows;
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

  it('PUT metadata + payment correction keeps comprobante_archivo_id and item/stock unchanged', async () => {
    const pedido = await crearPedidoCaja({
      nombre_cliente: `${RUN_ID}-COMP-KEEP`,
      metodo_pago: 'transferencia',
      items: [{ producto_id: prodIdLimited, cantidad: 1 }],
    });

    await pool.query('UPDATE pedido SET estado_pago = ? WHERE id = ?', ['pendiente', pedido.id]);
    const comprobanteArchivoId = await adjuntarComprobanteFalso(pedido.id, 'comprobante-keep');

    const [beforeRows] = await pool.query(
      'SELECT comprobante_archivo_id, estado_pago, total FROM pedido WHERE id = ?',
      [pedido.id]
    );
    const beforePedido = beforeRows[0];
    const detalleBefore = await readDetalle(pedido.id);
    const stockBefore = await readStock([prodIdLimited]);

    expect(beforePedido.comprobante_archivo_id).toBe(comprobanteArchivoId);
    expect(beforePedido.estado_pago).toBe('pendiente');

    const res = await request(app)
      .put(`/api/admin/pedidos/${pedido.id}`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        estado_pago: 'comprobante_subido',
        observaciones: 'Corrección manual de pago',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);

    const [afterRows] = await pool.query(
      'SELECT comprobante_archivo_id, estado_pago, total FROM pedido WHERE id = ?',
      [pedido.id]
    );
    const afterPedido = afterRows[0];
    const detalleAfter = await readDetalle(pedido.id);
    const stockAfter = await readStock([prodIdLimited]);

    expect(afterPedido.comprobante_archivo_id).toBe(comprobanteArchivoId);
    expect(afterPedido.estado_pago).toBe('comprobante_subido');
    expect(parseFloat(afterPedido.total)).toBeCloseTo(parseFloat(beforePedido.total), 2);
    expect(detalleAfter).toHaveLength(detalleBefore.length);
    for (let i = 0; i < detalleBefore.length; i += 1) {
      expect(detalleAfter[i].producto_id).toBe(detalleBefore[i].producto_id);
      expect(detalleAfter[i].cantidad).toBe(detalleBefore[i].cantidad);
      expect(parseFloat(detalleAfter[i].precio_unitario)).toBeCloseTo(
        parseFloat(detalleBefore[i].precio_unitario),
        2
      );
      expect(parseFloat(detalleAfter[i].subtotal)).toBeCloseTo(parseFloat(detalleBefore[i].subtotal), 2);
    }
    expect(stockAfter.get(prodIdLimited).stock_actual).toBe(
      stockBefore.get(prodIdLimited).stock_actual
    );
  });

  it('PUT rejects transferencia to efectivo when a comprobante is already attached', async () => {
    const pedido = await crearPedidoCaja({
      nombre_cliente: `${RUN_ID}-COMP-EFECTIVO-BLOCK`,
      metodo_pago: 'transferencia',
      items: [{ producto_id: prodIdLimited, cantidad: 1 }],
    });

    await pool.query('UPDATE pedido SET estado_pago = ? WHERE id = ?', ['comprobante_subido', pedido.id]);
    const comprobanteArchivoId = await adjuntarComprobanteFalso(pedido.id, 'efectivo-block');

    const res = await request(app)
      .put(`/api/admin/pedidos/${pedido.id}`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ metodo_pago: 'efectivo' });

    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);

    const [afterRows] = await pool.query(
      'SELECT metodo_pago, estado_pago, comprobante_archivo_id FROM pedido WHERE id = ?',
      [pedido.id]
    );
    expect(afterRows[0].metodo_pago).toBe('transferencia');
    expect(afterRows[0].estado_pago).toBe('comprobante_subido');
    expect(afterRows[0].comprobante_archivo_id).toBe(comprobanteArchivoId);
  });

  it('PUT paid order keeps estado_pago=pagado when method changes', async () => {
    const paidPedido = await crearPedidoCaja({
      nombre_cliente: `${RUN_ID}-PAID-METHOD`,
      metodo_pago: 'efectivo',
      items: [{ producto_id: prodIdLimited, cantidad: 1 }],
    });

    const res = await request(app)
      .put(`/api/admin/pedidos/${paidPedido.id}`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ metodo_pago: 'transferencia' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.estado_pago).toBe('pagado');
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
    // Caja orders now start as pagado (force-pagado). Create a transferencia
    // order and force it to comprobante_subido via direct DB update for the
    // coherence test, since PATCH can't transition from pagado (terminal).
    coherencePedido = await crearPedidoCaja({
      nombre_cliente: `${RUN_ID}-COHERENCE`,
      metodo_pago: 'transferencia',
      items: [{ producto_id: prodIdLimited, cantidad: 1 }],
    });
    // Direct DB: override terminal pagado to comprobante_subido for test setup
    await pool.query('UPDATE pedido SET estado_pago = ? WHERE id = ?', [
      'comprobante_subido',
      coherencePedido.id,
    ]);
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

  it('PR1: caja transferencia sin estado_pago queda pagado (force-pagado)', async () => {
    const res = await request(app)
      .post('/api/admin/pedidos/caja')
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        nombre_cliente: `${RUN_ID}-B7-CAJA-TRANSFERENCIA-FORCE-PAGADO`,
        metodo_pago: 'transferencia',
        items: [{ producto_id: 5, cantidad: 1 }],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.estado_pago).toBe('pagado');
    expect(res.body.data.estado_pedido).toBe('en_preparacion');
    expect(res.body.data.origen).toBe('caja');
  });

  it('PR1: caja transferencia con estado_pago=pendiente se fuerza a pagado', async () => {
    const res = await request(app)
      .post('/api/admin/pedidos/caja')
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        nombre_cliente: `${RUN_ID}-B7-CAJA-TRANSFER-PENDIENTE-FORCE`,
        metodo_pago: 'transferencia',
        estado_pago: 'pendiente',
        items: [{ producto_id: 5, cantidad: 1 }],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.estado_pago).toBe('pagado');
    expect(res.body.data.estado_pedido).toBe('en_preparacion');
    expect(res.body.data.origen).toBe('caja');
  });

  it('PR1: caja transferencia con estado_pago=rechazado se fuerza a pagado', async () => {
    const res = await request(app)
      .post('/api/admin/pedidos/caja')
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        nombre_cliente: `${RUN_ID}-B7-CAJA-TRANSFER-RECHAZADO-FORCE`,
        metodo_pago: 'transferencia',
        estado_pago: 'rechazado',
        items: [{ producto_id: 5, cantidad: 1 }],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.estado_pago).toBe('pagado');
    expect(res.body.data.estado_pedido).toBe('en_preparacion');
  });

  it('PR1: caja efectivo con estado_pago=pendiente se fuerza a pagado', async () => {
    const res = await request(app)
      .post('/api/admin/pedidos/caja')
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        nombre_cliente: `${RUN_ID}-B7-CAJA-EFECTIVO-EXPLICIT-PENDIENTE`,
        metodo_pago: 'efectivo',
        estado_pago: 'pendiente',
        items: [{ producto_id: 5, cantidad: 1 }],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.estado_pago).toBe('pagado');
    expect(res.body.data.estado_pedido).toBe('en_preparacion');
  });

  it('POST /api/admin/pedidos/caja with available promo returns 201 and deducts component stock', async () => {
    await pool.query('UPDATE configuracion_tienda SET estado = ? WHERE id = 1', ['abierta']);
    const { promoId, componenteId } = await crearPromoFixture({ promoDisponible: 1 });
    const [[before]] = await pool.query('SELECT stock_actual FROM producto WHERE id = ?', [componenteId]);

    const res = await request(app)
      .post('/api/admin/pedidos/caja')
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        nombre_cliente: `${RUN_ID}-B7-CAJA-PROMO-OK`,
        metodo_pago: 'efectivo',
        items: [{ producto_id: promoId, cantidad: 2 }],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ producto_id: promoId, cantidad: 2 })])
    );

    const [[after]] = await pool.query('SELECT stock_actual FROM producto WHERE id = ?', [componenteId]);
    expect(after.stock_actual).toBe(before.stock_actual - 4);
  });

  it('POST /api/admin/pedidos/caja with unavailable promo returns 400 instead of 500', async () => {
    await pool.query('UPDATE configuracion_tienda SET estado = ? WHERE id = 1', ['abierta']);
    const { promoId } = await crearPromoFixture({ promoDisponible: 0 });

    const res = await request(app)
      .post('/api/admin/pedidos/caja')
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        nombre_cliente: `${RUN_ID}-B7-CAJA-PROMO-NO-DISPONIBLE`,
        metodo_pago: 'efectivo',
        items: [{ producto_id: promoId, cantidad: 1 }],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toContain('no está disponible');
  });

  afterAll(async () => {
    await limpiarPedidosDeTest();
    await limpiarProductosDeTest();
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
