import request from 'supertest';
import app from '../src/app.js';

describe('GET /api/health', () => {
  it('debería retornar 200 y estado ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.ok).toEqual(true);
    expect(res.body.data.status).toEqual('ok');
  });
});
