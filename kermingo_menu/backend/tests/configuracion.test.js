import request from 'supertest';
import app from '../src/app.js';
import pool from '../src/api/database/db.js';
import jwt from 'jsonwebtoken';
import environments from '../src/api/config/environments.js';

const COOKIE_NAME = environments.cookie.name;
const JWT_SECRET = environments.jwt.secret;
const ORIGIN = environments.frontendUrl;

function adminCookie(userId = 1) {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
  return `${COOKIE_NAME}=${token}`;
}

describe('Configuracion endpoints sin autenticacion', () => {
  it('GET /api/configuracion-tienda -> 200 publico sin cookie', async () => {
    const res = await request(app).get('/api/configuracion-tienda');
    expect(res.statusCode).toEqual(200);
    // Solo validamos que la ruta está montada y responde.
    // Si la fila `configuracion_tienda.id=1` no existe (sin seed), el handler
    // devuelve 404. Un fallo de conexión a DB devolvería 500 desde el error
    // middleware, no 404.
    expect(typeof res.body).toBe('object');
  });

  it('GET /api/admin/configuracion-tienda -> 401 sin cookie', async () => {
    const res = await request(app).get('/api/admin/configuracion-tienda');
    expect(res.statusCode).toEqual(401);
    expect(res.body.ok).toEqual(false);
  });

  it('PUT /api/admin/configuracion-tienda -> 401 sin cookie', async () => {
    const res = await request(app)
      .put('/api/admin/configuracion-tienda')
      .send({ estado: 'abierta' });
    expect(res.statusCode).toEqual(401);
    expect(res.body.ok).toEqual(false);
  });
});

describe('Configuracion endpoints validacion body (sin auth)', () => {
  it('PUT /api/admin/configuracion-tienda -> 401 sin cookie (validación 400 requiere auth)', async () => {
    // Sin cookie el middleware `requireAdmin` corta antes que Zod.
    // La validación 400 de Zod se prueba en `configuracion.controller.test.js`
    // (con admin mockeado) y en `configuracion.unit.test.js` (schema puro).
    const res = await request(app)
      .put('/api/admin/configuracion-tienda')
      .send({ estado: 'no_existe' });
    expect(res.statusCode).toEqual(401);
    expect(res.body.ok).toEqual(false);
  });
});

describe('Configuracion origin guard (authenticated)', () => {
  it('PUT /api/admin/configuracion-tienda with untrusted origin returns 403', async () => {
    const res = await request(app)
      .put('/api/admin/configuracion-tienda')
      .set('Cookie', adminCookie())
      .set('Origin', 'https://evil.example.com')
      .send({ estado: 'abierta' });
    expect(res.statusCode).toBe(403);
    expect(res.body.ok).toBe(false);
  });

  it('PUT /api/admin/configuracion-tienda with trusted origin returns not-403', async () => {
    const res = await request(app)
      .put('/api/admin/configuracion-tienda')
      .set('Cookie', adminCookie())
      .set('Origin', ORIGIN)
      .send({ estado: 'abierta' });
    // We expect 200 (success) or 400/409 (validation error), NOT 403
    expect(res.statusCode).not.toBe(403);
    expect(res.statusCode).not.toBe(401);
  });

  it('PUT /api/admin/configuracion-tienda without origin but with referer from trusted host returns not-403', async () => {
    const res = await request(app)
      .put('/api/admin/configuracion-tienda')
      .set('Cookie', adminCookie())
      .set('Referer', `${ORIGIN}/admin/configuracion-tienda`)
      .send({ estado: 'abierta' });
    expect(res.statusCode).not.toBe(403);
    expect(res.statusCode).not.toBe(401);
  });
});

afterAll(async () => {
  await pool.end();
});
