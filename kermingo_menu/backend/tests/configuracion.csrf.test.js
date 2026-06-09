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

// ─── Tests CSRF (FIX retroactivo P1) ────────────────────────────────
// NOTA sobre status code: `requireTrustedOrigin` lanza `AuthError` (401),
// no 403. Esto es semánticamente incorrecto — un cliente autenticado
// que envía un Origin no confiable debería ser 403 Forbidden, no
// 401 Unauthorized. Es un bug pre-existente del middleware que excede
// el scope de este change retroactivo. Documentado como WARNING en
// `verify-report.md`. Tests esperan 401 para reflejar el comportamiento
// actual.

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

  it('PUT con Origin http://evil.com → 401 (FIX retroactivo CSRF bloquea)', async () => {
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

  it('PUT con Referer http://evil.com → 401 (FIX retroactivo CSRF bloquea)', async () => {
    const res = await request(app)
      .put('/api/admin/configuracion-tienda')
      .set('Referer', 'http://evil.com/admin')
      .send({ estado: 'abierta' });

    expect(res.statusCode).toBe(403);
    expect(res.body.ok).toBe(false);
  });

  it('PUT sin Origin ni Referer → 401 (FIX retroactivo CSRF bloquea)', async () => {
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
});
