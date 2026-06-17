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

const PROD_REQUIRED_ENV = {
  NODE_ENV: 'production',
  FRONTEND_URL: 'https://kermingo.vercel.app',
  DB_HOST: '127.0.0.1',
  DB_PORT: '3306',
  DB_USER: 'root',
  DB_PASSWORD: 'changeme',
  DB_NAME: 'kermingo',
  JWT_SECRET: 'prod-test-secret',
  GOOGLE_DRIVE_FOLDER_ID: 'folder-id',
  GOOGLE_OAUTH_CLIENT_ID: 'oauth-client-id',
  GOOGLE_OAUTH_CLIENT_SECRET: 'oauth-client-secret',
  GOOGLE_OAUTH_REFRESH_TOKEN: 'oauth-refresh-token',
};

async function withFreshConfigImport(envOverrides, loader) {
  const previousEnv = { ...process.env };

  try {
    for (const [key, value] of Object.entries({ ...PROD_REQUIRED_ENV, ...envOverrides })) {
      process.env[key] = String(value);
    }

    jest.resetModules();
    return await loader();
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in previousEnv)) {
        delete process.env[key];
      }
    }

    for (const [key, value] of Object.entries(previousEnv)) {
      process.env[key] = value;
    }
  }
}

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

  it('PUT con Origin LAN http://192.168.0.34:3000 en desarrollo → 200', async () => {
    const res = await request(app)
      .put('/api/admin/configuracion-tienda')
      .set('Origin', 'http://192.168.0.34:3000')
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

describe('Configuración — isTrustedOrigin en entorno production', () => {
  it('rechaza origen LAN (http://192.168.0.34:3000) cuando NODE_ENV=production', async () => {
    const { default: environments } = await withFreshConfigImport(
      {
        FRONTEND_URL: 'https://kermingo.vercel.app',
      },
      async () => import('../src/api/config/environments.js')
    );

    const { isTrustedOrigin } = environments;

    expect(isTrustedOrigin('http://192.168.0.34:3000')).toBe(false);
  });

  it('acepta FRONTEND_URL configurado cuando NODE_ENV=production', async () => {
    const frontendUrl = 'https://kermingo.vercel.app';
    const { default: environments } = await withFreshConfigImport(
      {
        FRONTEND_URL: frontendUrl,
      },
      async () => import('../src/api/config/environments.js')
    );

    const { isTrustedOrigin } = environments;

    expect(isTrustedOrigin(frontendUrl)).toBe(true);
    expect(isTrustedOrigin(`${frontendUrl}/admin/dashboard`)).toBe(true);
  });

  it('middleware requireTrustedOrigin rechaza LAN y acepta FRONTEND_URL en producción', async () => {
    const frontendUrl = 'https://kermingo.vercel.app';
    const { requireTrustedOrigin } = await withFreshConfigImport(
      {
        FRONTEND_URL: frontendUrl,
      },
      async () => import('../src/api/middlewares/origin.middleware.js')
    );

    const forbiddenNext = jest.fn();
    requireTrustedOrigin(
      {
        method: 'POST',
        get: (headerName) => {
          if (headerName === 'origin') return 'http://192.168.0.34:3000';
          return null;
        },
      },
      {},
      forbiddenNext
    );

    expect(forbiddenNext).toHaveBeenCalledTimes(1);
    expect(forbiddenNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Origen no permitido'),
      })
    );

    const allowedNext = jest.fn();
    requireTrustedOrigin(
      {
        method: 'POST',
        get: (headerName) => {
          if (headerName === 'origin') return frontendUrl;
          return null;
        },
      },
      {},
      allowedNext
    );

    expect(allowedNext).toHaveBeenCalledTimes(1);
    expect(allowedNext).toHaveBeenCalledWith();
  });
});
