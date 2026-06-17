import request from 'supertest';
import app from '../src/app.js';
import jwt from 'jsonwebtoken';
import pool from '../src/api/database/db.js';
import environments from '../src/api/config/environments.js';

const COOKIE_NAME = environments.cookie.name;
const JWT_SECRET = environments.jwt.secret;
const ORIGIN = environments.frontendUrl;

const RUN_ID = `TEST-PRODUCTO-CATEG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

function adminCookie(userId = 1) {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
  return `${COOKIE_NAME}=${token}`;
}

async function crearProducto(payload) {
  const base = {
    descripcion: 'Producto test categoria',
    precio: 1234,
    tipo: 'comida',
    stock_limitado: 1,
    stock_actual: 10,
    stock_minimo_alerta: 2,
    activo: 1,
  };

  const res = await request(app)
    .post('/api/admin/productos')
    .set('Cookie', adminCookie())
    .set('Origin', ORIGIN)
    .send({
      nombre: `${RUN_ID}-${Math.random().toString(36).slice(2, 8)}`,
      ...base,
      ...payload,
    });

  return res;
}

async function limpiarProductosDeTest() {
  const [rows] = await pool.query('SELECT id FROM producto WHERE nombre LIKE ?', [`${RUN_ID}%`]);
  const ids = rows.map((r) => r.id);

  if (ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    await pool.query(`DELETE FROM producto_categoria WHERE producto_id IN (${placeholders})`, ids);
    await pool.query(`DELETE FROM producto WHERE id IN (${placeholders})`, ids);
  }
}

describe('Producto categorías en admin (regresión B7)', () => {
  afterEach(async () => {
    await limpiarProductosDeTest();
  });

  afterAll(async () => {
    await limpiarProductosDeTest();
    try {
      await pool.end();
    } catch {
      // pool may already be cerrado por ejecución conjunta de suites
    }
  });

  it('POST /api/admin/productos crea producto asociado a Merienda', async () => {
    const res = await crearProducto({
      categorias: ['Merienda'],
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.categorias).toContain('Merienda');
  });

  it('PUT /api/admin/productos/:id reemplaza categorias de Merienda a Cena', async () => {
    const creadoRes = await crearProducto({
      categorias: ['Merienda'],
    });

    const creado = creadoRes.body.data;

    const res = await request(app)
      .put(`/api/admin/productos/${creado.id}`)
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({
        descripcion: creado.descripcion,
        precio: creado.precio,
        categorias: ['Cena'],
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.categorias).toBe('Cena');
    expect(res.body.data.categorias).not.toContain('Merienda');
  });

  it('POST /api/admin/productos rechaza categorias vacias', async () => {
    const res = await crearProducto({
      categorias: [],
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});
