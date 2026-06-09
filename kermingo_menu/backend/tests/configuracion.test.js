import request from 'supertest';
import app from '../src/app.js';
import pool from '../src/api/database/db.js';

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

afterAll(async () => {
  await pool.end();
});
