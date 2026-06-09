import request from 'supertest';
import app from '../src/app.js';

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
