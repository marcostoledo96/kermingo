/**
 * Tests de CSRF con middleware de origen REAL.
 *
 * Este archivo es separado de `configuracion.controller.test.js` porque
 * `jest.unstable_mockModule` tiene scope de archivo: no se puede
 * re-mockear `origin.middleware.js` después del primer import dinámico.
 *
 * Estrategia: NO mockeamos `origin.middleware.js`. El middleware real
 * corre. Solo mockeamos `admin.middleware.js` (para evitar DB) y el
 * modelo de configuracion. Los tests envían headers Origin/Referer
 * reales para verificar el comportamiento del middleware.
 */
import { jest } from '@jest/globals';
import request from 'supertest';
import environments from '../src/api/config/environments.js';

const ORIGIN = environments.frontendUrl;

// ─── Mocks (sin mockear origin.middleware.js) ───────────────────────

jest.unstable_mockModule('../src/api/middlewares/admin.middleware.js', () => ({
  requireAdmin: (req, _res, next) => {
    req.usuario = { id: 1, nombre: 'Test', email: 't@t' };
    next();
  },
}));

const findAdminMock = jest.fn();
const updateMinimalMock = jest.fn();

jest.unstable_mockModule('../src/api/models/configuracion.model.js', () => ({
  findPublic: jest.fn(),
  findAdmin: findAdminMock,
  updateMinimal: updateMinimalMock,
}));

jest.unstable_mockModule('../src/api/database/db.js', () => ({
  getPool: () => ({ query: jest.fn(), getConnection: jest.fn() }),
  default: { query: jest.fn(), getConnection: jest.fn() },
}));

// ─── Imports dinámicos (origin.middleware real) ──────────────────────
const { default: app } = await import('../src/app.js');

const CONFIG_ADMIN_ROW = {
  id: 1,
  estado: 'abierta',
  mensaje_publico: '¡Bienvenidos!',
  cena_habilitada_desde: '20:30:00',
};

// ─── Tests CSRF ─────────────────────────────────────────────────────
// `requireTrustedOrigin` lanza `ForbiddenError` (403) para orígenes
// no confiables. Los tests esperan 403 para reflejar el comportamiento
// actual del middleware.

describe('Configuración — CSRF con origin middleware real', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    updateMinimalMock.mockResolvedValue(1);
    findAdminMock.mockResolvedValue({ ...CONFIG_ADMIN_ROW });
  });

  it('PUT con Origin http://localhost:3000 (frontend) → 200', async () => {
    const res = await request(app)
      .put('/api/admin/configuracion-tienda')
      .set('Origin', 'http://localhost:3000')
      .send({ estado: 'abierta' });

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('PUT con Origin http://evil.com → 403 (CSRF bloquea origen no confiable)', async () => {
    const res = await request(app)
      .put('/api/admin/configuracion-tienda')
      .set('Origin', 'http://evil.com')
      .send({ estado: 'abierta' });

    expect(res.statusCode).toBe(403);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toMatch(/origen/i);
  });

  it('PUT con Referer http://localhost:3000/admin (sin Origin) → 200', async () => {
    const res = await request(app)
      .put('/api/admin/configuracion-tienda')
      .set('Referer', 'http://localhost:3000/admin')
      .send({ estado: 'abierta' });

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('PUT con Referer http://evil.com → 403 (CSRF bloquea referer no confiable)', async () => {
    const res = await request(app)
      .put('/api/admin/configuracion-tienda')
      .set('Referer', 'http://evil.com/admin')
      .send({ estado: 'abierta' });

    expect(res.statusCode).toBe(403);
    expect(res.body.ok).toBe(false);
  });

  it('PUT sin Origin ni Referer → 403 (CSRF bloquea sin headers de origen)', async () => {
    const res = await request(app)
      .put('/api/admin/configuracion-tienda')
      .send({ estado: 'abierta' });

    expect(res.statusCode).toBe(403);
    expect(res.body.ok).toBe(false);
  });

  it('GET admin con Origin hostil → 200 (GET no es método unsafe)', async () => {
    // requireTrustedOrigin solo aplica a POST/PUT/PATCH/DELETE.
    // Los GET pasan sin chequear origen.
    const res = await request(app)
      .get('/api/admin/configuracion-tienda')
      .set('Origin', 'http://evil.com');

    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('PUT con Referer que empieza igual pero dominio distinto → 403 (no acepta prefijo engañoso)', async () => {
    const maliciousReferer = `${ORIGIN}.evil.com/admin/configuracion-tienda`;
    const res = await request(app)
      .put('/api/admin/configuracion-tienda')
      .set('Referer', maliciousReferer)
      .send({ estado: 'abierta' });
    expect(res.statusCode).toBe(403);
    expect(res.body.ok).toBe(false);
  });

  it('PUT con Origin inválido aunque Referer sea válido → 403 (Origin tiene prioridad)', async () => {
    const res = await request(app)
      .put('/api/admin/configuracion-tienda')
      .set('Origin', 'https://evil.example.com')
      .set('Referer', `${ORIGIN}/admin/configuracion-tienda`)
      .send({ estado: 'abierta' });
    expect(res.statusCode).toBe(403);
    expect(res.body.ok).toBe(false);
  });
});
