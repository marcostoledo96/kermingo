/**
 * Tests del controller de configuración con mocks del modelo.
 *
 * Estrategia: usamos jest.unstable_mockModule (la única forma de mockear
 * módulos ESM en Jest 29 con --experimental-vm-modules) para inyectar
 * funciones mock del modelo y middlewares, y luego importamos la app real
 * con import dinámico. Esto prueba el controller real, no una copia.
 *
 * Los tests de CSRF con middleware de origen REAL están en
 * `configuracion.csrf.test.js` (archivo separado porque
 * `jest.unstable_mockModule` no permite toggle por test).
 */
import { jest } from '@jest/globals';
import request from 'supertest';

// ─── Mocks (deben declararse ANTES del import dinámico) ──────────────

// Admin: simula usuario autenticado
jest.unstable_mockModule('../src/api/middlewares/admin.middleware.js', () => ({
  requireAdmin: (req, _res, next) => {
    req.usuario = { id: 1, nombre: 'Test', email: 't@t' };
    next();
  },
}));

// Origin: bypass para estos tests (CSRF real está en otro archivo).
jest.unstable_mockModule('../src/api/middlewares/origin.middleware.js', () => ({
  requireTrustedOrigin: (_req, _res, next) => next(),
}));

const findPublicMock = jest.fn();
const findAdminMock = jest.fn();
const updateMinimalMock = jest.fn();

jest.unstable_mockModule('../src/api/models/configuracion.model.js', () => ({
  findPublic: findPublicMock,
  findAdmin: findAdminMock,
  updateMinimal: updateMinimalMock,
}));

jest.unstable_mockModule('../src/api/database/db.js', () => ({
  getPool: () => ({ query: jest.fn(), getConnection: jest.fn() }),
  default: { query: jest.fn(), getConnection: jest.fn() },
}));

// ─── Imports dinámicos (DESPUÉS de los mocks) ────────────────────────
const { default: app } = await import('../src/app.js');

// ─── Helpers ─────────────────────────────────────────────────────────

const CONFIG_PUBLIC_ROW = {
  id: 1,
  estado: 'abierta',
  mensaje_publico: '¡Bienvenidos!',
};

const CONFIG_ADMIN_ROW = {
  id: 1,
  estado: 'abierta',
  mensaje_publico: '¡Bienvenidos!',
  cena_habilitada_desde: '20:30:00',
};

// ─── Tests ───────────────────────────────────────────────────────────

describe('Configuración — Controller con mocks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── GET público (sin auth) ─────────────────────────────────────────

  describe('GET /api/configuracion-tienda (público)', () => {
    it('retorna 200 con datos públicos cuando findPublic encuentra la fila', async () => {
      findPublicMock.mockResolvedValue({ ...CONFIG_PUBLIC_ROW });

      const res = await request(app).get('/api/configuracion-tienda');

      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(1);
      expect(res.body.data.estado).toBe('abierta');
      expect(res.body.data.mensaje_publico).toBe('¡Bienvenidos!');
      expect(findPublicMock).toHaveBeenCalledTimes(1);
    });

    it('retorna 404 cuando findPublic devuelve null (sin seed)', async () => {
      findPublicMock.mockResolvedValue(null);

      const res = await request(app).get('/api/configuracion-tienda');

      expect(res.statusCode).toBe(404);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toMatch(/no encontrad/i);
    });
  });

  // ─── GET admin (con auth mockeada) ──────────────────────────────────

  describe('GET /api/admin/configuracion-tienda (admin)', () => {
    it('retorna 200 con datos completos cuando findAdmin encuentra la fila', async () => {
      findAdminMock.mockResolvedValue({ ...CONFIG_ADMIN_ROW });

      const res = await request(app).get('/api/admin/configuracion-tienda');

      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(1);
      expect(res.body.data.estado).toBe('abierta');
      expect(res.body.data.mensaje_publico).toBe('¡Bienvenidos!');
      expect(res.body.data.cena_habilitada_desde).toBe('20:30:00');
      expect(findAdminMock).toHaveBeenCalledTimes(1);
    });

    it('retorna 404 cuando findAdmin devuelve null', async () => {
      findAdminMock.mockResolvedValue(null);

      const res = await request(app).get('/api/admin/configuracion-tienda');

      expect(res.statusCode).toBe(404);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toMatch(/no encontrad/i);
    });
  });

  // ─── PUT admin (FIX retroactivo affectedRows) ───────────────────────

  describe('PUT /api/admin/configuracion-tienda (admin)', () => {
    it('actualiza estado y retorna 200 con la config completa', async () => {
      updateMinimalMock.mockResolvedValue(1);
      findAdminMock.mockResolvedValue({ ...CONFIG_ADMIN_ROW, estado: 'cerrada' });

      const res = await request(app)
        .put('/api/admin/configuracion-tienda')
        .send({ estado: 'cerrada' });

      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.estado).toBe('cerrada');
      expect(updateMinimalMock).toHaveBeenCalledTimes(1);
      expect(updateMinimalMock).toHaveBeenCalledWith(expect.anything(), { estado: 'cerrada' });
      expect(findAdminMock).toHaveBeenCalledTimes(1);
    });

    it('retorna 200 incluso con mismos valores (no-op, FIX retroactivo)', async () => {
      // updateMinimal devuelve 0 affectedRows (no modifica nada),
      // pero el controller hace findAdmin post-update y retorna 200.
      updateMinimalMock.mockResolvedValue(0);
      findAdminMock.mockResolvedValue({ ...CONFIG_ADMIN_ROW });

      const res = await request(app)
        .put('/api/admin/configuracion-tienda')
        .send({ estado: 'abierta' });

      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
      // Verificamos que se llama a findAdmin después del update (no se basa en affectedRows)
      expect(findAdminMock).toHaveBeenCalledTimes(1);
    });

    it('permite mensaje_publico null explícito para limpiar el campo', async () => {
      updateMinimalMock.mockResolvedValue(1);
      findAdminMock.mockResolvedValue({ ...CONFIG_ADMIN_ROW, mensaje_publico: null });

      const res = await request(app)
        .put('/api/admin/configuracion-tienda')
        .send({ estado: 'cerrada', mensaje_publico: null });

      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(updateMinimalMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ mensaje_publico: null })
      );
    });

    it('permite cena_habilitada_desde null explícito para limpiar el campo', async () => {
      updateMinimalMock.mockResolvedValue(1);
      findAdminMock.mockResolvedValue({ ...CONFIG_ADMIN_ROW, cena_habilitada_desde: null });

      const res = await request(app)
        .put('/api/admin/configuracion-tienda')
        .send({ estado: 'demo', cena_habilitada_desde: null });

      expect(res.statusCode).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(updateMinimalMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ cena_habilitada_desde: null })
      );
    });

    it('retorna 404 cuando findAdmin post-update devuelve null (seed borrado)', async () => {
      updateMinimalMock.mockResolvedValue(1);
      findAdminMock.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/admin/configuracion-tienda')
        .send({ estado: 'abierta' });

      expect(res.statusCode).toBe(404);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toMatch(/no encontrad/i);
    });
  });

  // ─── PUT Zod validation ─────────────────────────────────────────────

  describe('PUT /api/admin/configuracion-tienda — validación Zod', () => {
    it('rechaza estado inválido → 400', async () => {
      const res = await request(app)
        .put('/api/admin/configuracion-tienda')
        .send({ estado: 'no_existe' });

      expect(res.statusCode).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toMatch(/estado/i);
    });

    it('rechaza mensaje_publico mayor a 500 chars → 400', async () => {
      const res = await request(app)
        .put('/api/admin/configuracion-tienda')
        .send({ estado: 'abierta', mensaje_publico: 'a'.repeat(501) });

      expect(res.statusCode).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    it('rechaza cena_habilitada_desde con formato inválido → 400', async () => {
      const res = await request(app)
        .put('/api/admin/configuracion-tienda')
        .send({ estado: 'abierta', cena_habilitada_desde: 'mal formato' });

      expect(res.statusCode).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    it('rechaza props extras (strict) → 400', async () => {
      const res = await request(app)
        .put('/api/admin/configuracion-tienda')
        .send({ estado: 'abierta', extra: 'no' });

      expect(res.statusCode).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    it('rechaza body sin estado → 400', async () => {
      const res = await request(app)
        .put('/api/admin/configuracion-tienda')
        .send({ mensaje_publico: 'algo' });

      expect(res.statusCode).toBe(400);
      expect(res.body.ok).toBe(false);
    });
  });
});

// Los tests de CSRF con middleware de origen REAL están en
// `configuracion.csrf.test.js` (archivo separado porque
// `jest.unstable_mockModule` no permite toggle por test).