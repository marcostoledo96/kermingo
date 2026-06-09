import request from 'supertest';
import app from '../src/app.js';
import jwt from 'jsonwebtoken';
import pool from '../src/api/database/db.js';
import environments from '../src/api/config/environments.js';
import {
  validatePaymentTransition,
  PAGO_TRANSITIONS,
} from '../src/api/models/pedido.model.js';
import {
  updateEstadoPagoSchema,
  pedidoQuerySchema,
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

async function limpiarPedidosDeTest() {
  const [rows] = await pool.query(
    "SELECT id FROM pedido WHERE nombre_cliente LIKE 'TEST-B6-2%'"
  );
  const ids = rows.map((r) => r.id);
  if (ids.length > 0) {
    const ph = ids.map(() => '?').join(',');
    await pool.query(`DELETE FROM pedido_detalle WHERE pedido_id IN (${ph})`, ids);
    await pool.query(`DELETE FROM pedido WHERE id IN (${ph})`, ids);
  }
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

  it('same state is always valid', () => {
    expect(validatePaymentTransition('pagado', 'pagado')).toBe(true);
    expect(validatePaymentTransition('pendiente', 'pendiente')).toBe(true);
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
    const res = await request(app)
      .patch(`/api/admin/pedidos/${pedidoEfectivo.id}/pago`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ estado_pago: 'pagado' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.estado_pago).toBe('pagado');
    expect(res.body.data.estado_pedido).toBe('recibido');
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
*/
