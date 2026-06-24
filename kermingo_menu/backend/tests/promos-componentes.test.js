import request from 'supertest';
import app from '../src/app.js';
import jwt from 'jsonwebtoken';
import pool from '../src/api/database/db.js';
import environments from '../src/api/config/environments.js';

const COOKIE_NAME = environments.cookie.name;
const JWT_SECRET = environments.jwt.secret;
const ORIGIN = environments.frontendUrl;
const RUN_ID = `TEST-PR2-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

function adminCookie(userId = 1) {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
  return `${COOKIE_NAME}=${token}`;
}

async function crearProductoAdmin(payload) {
  const base = {
    descripcion: 'Producto test promo comp',
    precio: 1000,
    stock_limitado: 1,
    stock_actual: 50,
    stock_minimo_alerta: 5,
    activo: 1,
    disponible: 1,
    categorias: ['Merienda'],
  };
  const nombre = `${RUN_ID}-${Math.random().toString(36).slice(2, 8)}`;
  const res = await request(app)
    .post('/api/admin/productos')
    .set('Cookie', adminCookie())
    .set('Origin', ORIGIN)
    .send({ ...base, ...payload, nombre });
  return res;
}

async function limpiarProductosDeTest() {
  const [rows] = await pool.query('SELECT id FROM producto WHERE nombre LIKE ?', [`${RUN_ID}%`]);
  const ids = rows.map((r) => r.id);
  if (ids.length > 0) {
    const ph = ids.map(() => '?').join(',');
    await pool.query(`DELETE FROM combo_producto WHERE combo_id IN (${ph})`, ids);
    await pool.query(`DELETE FROM producto_categoria WHERE producto_id IN (${ph})`, ids);
    await pool.query(`DELETE FROM producto WHERE id IN (${ph})`, ids);
  }
}

describe('Promo component API — GET /api/admin/productos/:id/componentes', () => {
  afterAll(async () => {
    await limpiarProductosDeTest();
  });

  it('returns 404 for non-existent product', async () => {
    const res = await request(app)
      .get('/api/admin/productos/999999/componentes')
      .set('Cookie', adminCookie());
    expect(res.statusCode).toBe(404);
  });

  it('returns 400 for non-promo product', async () => {
    const creado = await crearProductoAdmin({ tipo: 'comida' });
    const id = creado.body.data.id;
    const res = await request(app)
      .get(`/api/admin/productos/${id}/componentes`)
      .set('Cookie', adminCookie());
    expect(res.statusCode).toBe(400);
  });

  it('returns 200 with empty array for promo without components', async () => {
    const creado = await crearProductoAdmin({ tipo: 'promo', disponible: 0 });
    const id = creado.body.data.id;
    const res = await request(app)
      .get(`/api/admin/productos/${id}/componentes`)
      .set('Cookie', adminCookie());
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });
});

describe('Promo component API — PUT /api/admin/productos/:id/componentes', () => {
  let promoId;
  let componenteId1;
  let componenteId2;

  beforeAll(async () => {
    const comp1 = await crearProductoAdmin({ tipo: 'comida' });
    componenteId1 = comp1.body.data.id;

    const comp2 = await crearProductoAdmin({ tipo: 'comida' });
    componenteId2 = comp2.body.data.id;

    const promo = await crearProductoAdmin({ tipo: 'promo', disponible: 0 });
    promoId = promo.body.data.id;
  });

  afterAll(async () => {
    await limpiarProductosDeTest();
    try { await pool.end(); } catch { /* noop */ }
  });

  it('returns 400 for PUT on non-promo product', async () => {
    const comida = await crearProductoAdmin({ tipo: 'comida' });
    const id = comida.body.data.id;
    const res = await request(app)
      .put(`/api/admin/productos/${id}/componentes`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ componentes: [{ producto_id: componenteId1, cantidad: 2 }] });
    expect(res.statusCode).toBe(400);
  });

  it('accepts empty componentes to clear promo components safely', async () => {
    const setupRes = await request(app)
      .put(`/api/admin/productos/${promoId}/componentes`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        componentes: [
          { producto_id: componenteId1, cantidad: 1 },
          { producto_id: componenteId2, cantidad: 2 },
        ],
      });
    expect(setupRes.statusCode).toBe(200);

    const res = await request(app)
      .put(`/api/admin/productos/${promoId}/componentes`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ componentes: [] });
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(0);

    const getRes = await request(app)
      .get(`/api/admin/productos/${promoId}/componentes`)
      .set('Cookie', adminCookie());
    expect(getRes.statusCode).toBe(200);
    expect(Array.isArray(getRes.body.data)).toBe(true);
    expect(getRes.body.data).toHaveLength(0);

    const [[producto]] = await pool.query('SELECT disponible FROM producto WHERE id = ?', [promoId]);
    expect(producto.disponible).toBe(0);
  });

  it('returns 400 for duplicate product in componentes', async () => {
    const res = await request(app)
      .put(`/api/admin/productos/${promoId}/componentes`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        componentes: [
          { producto_id: componenteId1, cantidad: 1 },
          { producto_id: componenteId1, cantidad: 2 },
        ],
      });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for self-reference (promo as its own component)', async () => {
    const res = await request(app)
      .put(`/api/admin/productos/${promoId}/componentes`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ componentes: [{ producto_id: promoId, cantidad: 1 }] });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for cantidad < 1', async () => {
    const res = await request(app)
      .put(`/api/admin/productos/${promoId}/componentes`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ componentes: [{ producto_id: componenteId1, cantidad: 0 }] });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for inactive (activo=0) component', async () => {
    await pool.query('UPDATE producto SET activo = 0 WHERE id = ?', [componenteId1]);
    const res = await request(app)
      .put(`/api/admin/productos/${promoId}/componentes`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ componentes: [{ producto_id: componenteId1, cantidad: 1 }] });
    await pool.query('UPDATE producto SET activo = 1 WHERE id = ?', [componenteId1]);
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for missing (non-existent) component', async () => {
    const res = await request(app)
      .put(`/api/admin/productos/${promoId}/componentes`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ componentes: [{ producto_id: 999999, cantidad: 1 }] });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for promo-as-component (no nested promos)', async () => {
    const otroPromo = await crearProductoAdmin({ tipo: 'promo', disponible: 0 });
    const otroPromoId = otroPromo.body.data.id;
    const res = await request(app)
      .put(`/api/admin/productos/${promoId}/componentes`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ componentes: [{ producto_id: otroPromoId, cantidad: 1 }] });
    expect(res.statusCode).toBe(400);
  });

  it('valid PUT replaces componentes atomically; GET returns names/qty/stock fields', async () => {
    // First PUT: set componentes
    const res1 = await request(app)
      .put(`/api/admin/productos/${promoId}/componentes`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        componentes: [
          { producto_id: componenteId1, cantidad: 2 },
          { producto_id: componenteId2, cantidad: 3 },
        ],
      });
    expect(res1.statusCode).toBe(200);
    expect(res1.body.ok).toBe(true);
    expect(res1.body.data).toHaveLength(2);

    const comp = res1.body.data.find((c) => c.producto_id === componenteId1);
    expect(comp).toBeDefined();
    expect(comp.cantidad).toBe(2);
    expect(comp).toHaveProperty('nombre');
    expect(comp).toHaveProperty('stock_limitado');
    expect(comp).toHaveProperty('stock_actual');
    expect(comp).toHaveProperty('activo');
    expect(comp).toHaveProperty('disponible');

    // GET to verify persistence
    const getRes = await request(app)
      .get(`/api/admin/productos/${promoId}/componentes`)
      .set('Cookie', adminCookie());
    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.data).toHaveLength(2);

    // Second PUT: atomic replace with different set
    const res2 = await request(app)
      .put(`/api/admin/productos/${promoId}/componentes`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        componentes: [{ producto_id: componenteId1, cantidad: 5 }],
      });
    expect(res2.statusCode).toBe(200);
    expect(res2.body.data).toHaveLength(1);
    expect(res2.body.data[0].cantidad).toBe(5);

    // Verify old component is gone via GET
    const getRes2 = await request(app)
      .get(`/api/admin/productos/${promoId}/componentes`)
      .set('Cookie', adminCookie());
    expect(getRes2.body.data).toHaveLength(1);
  });
});
