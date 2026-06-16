/**
 * Tests de integración del controller de cocina con mocks del modelo.
 *
 * Estrategia: usamos jest.unstable_mockModule (la única forma de mockear
 * módulos ESM en Jest 29 con --experimental-vm-modules) para inyectar
 * funciones mock del modelo, y luego importamos el controller real con
 * import dinámico. Esto prueba el controller real, no una copia.
 */
import { jest } from '@jest/globals';
import request from 'supertest';

// ─── Mocks (deben declararse ANTES del import dinámico) ──────────────
jest.unstable_mockModule('../src/api/middlewares/admin.middleware.js', () => ({
  requireAdmin: (req, _res, next) => {
    req.usuario = { id: 1, nombre: 'Test', email: 'test@test.com' };
    next();
  },
}));

jest.unstable_mockModule('../src/api/middlewares/origin.middleware.js', () => ({
  requireTrustedOrigin: (_req, _res, next) => next(),
}));

const findKitchenPedidosMock = jest.fn();
const findByIdMock = jest.fn();
const updateEstadoPedidoMock = jest.fn();
const transicionEstadoValidaMock = jest.fn();

jest.unstable_mockModule('../src/api/models/pedido.model.js', () => ({
  // Exports requeridos por los tests (con jest.fn para spy):
  findKitchenPedidos: findKitchenPedidosMock,
  findById: findByIdMock,
  updateEstadoPedido: updateEstadoPedidoMock,
  transicionEstadoValida: transicionEstadoValidaMock,
  // Otros exports del módulo (no usados por estos tests, pero requeridos
  // para que la importación estática del controller funcione):
  TRANSICIONES_VALIDAS: {},
  PAGO_TRANSITIONS: {},
  transitionsByMethod: {},
  createWithTransaction: jest.fn(),
  findByToken: jest.fn(),
  findAllAdmin: jest.fn(),
  updateEstadoPago: jest.fn(),
  validatePaymentTransition: jest.fn(),
  cancelWithTransaction: jest.fn(),
  editWithTransaction: jest.fn(),
  assertStoreOpen: jest.fn().mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../src/api/database/db.js', () => ({
  getPool: () => ({ query: jest.fn(), getConnection: jest.fn() }),
  default: { query: jest.fn(), getConnection: jest.fn() },
}));

// ─── Imports dinámicos (DESPUÉS de los mocks) ────────────────────────
const { default: app } = await import('../src/app.js');

// ─── Tests ───────────────────────────────────────────────────────────

describe('Cocina admin workflow (con mocks del modelo)', () => {
  beforeEach(() => {
    findKitchenPedidosMock.mockReset();
    findByIdMock.mockReset();
    updateEstadoPedidoMock.mockReset();
    transicionEstadoValidaMock.mockReset();
  });

  // --- GET /pedidos ---

  it('GET /api/admin/cocina/pedidos → 200 con array de pedidos', async () => {
    const pedidosMock = [
      { id: 1, numero: 'KMG-0001', estado_pedido: 'recibido', cantidad_items: 2 },
      { id: 2, numero: 'KMG-0002', estado_pedido: 'en_preparacion', cantidad_items: 1 },
    ];
    findKitchenPedidosMock.mockResolvedValue(pedidosMock);

    const res = await request(app).get('/api/admin/cocina/pedidos');

    expect(res.statusCode).toEqual(200);
    expect(res.body.ok).toEqual(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].numero).toEqual('KMG-0001');
    expect(findKitchenPedidosMock).toHaveBeenCalledTimes(1);
  });

  // --- GET /pedidos/:id ---

  it('GET /api/admin/cocina/pedidos/:id existente → 200 con pedido', async () => {
    const pedidoMock = {
      id: 1,
      numero: 'KMG-0001',
      nombre_cliente: 'Juan',
      estado_pedido: 'recibido',
      items: [{ producto_id: 10, nombre_producto: 'Empanada', cantidad: 2, subtotal: 2000 }],
    };
    findByIdMock.mockResolvedValue(pedidoMock);

    const res = await request(app).get('/api/admin/cocina/pedidos/1');

    expect(res.statusCode).toEqual(200);
    expect(res.body.ok).toEqual(true);
    expect(res.body.data.id).toEqual(1);
    expect(res.body.data.nombre_cliente).toEqual('Juan');
    expect(res.body.data.items).toHaveLength(1);
  });

  it('GET /api/admin/cocina/pedidos/:id inexistente → 404', async () => {
    findByIdMock.mockResolvedValue(null);

    const res = await request(app).get('/api/admin/cocina/pedidos/999');

    expect(res.statusCode).toEqual(404);
    expect(res.body.ok).toEqual(false);
  });

  // --- PATCH /pedidos/:id/estado ---

  it('PATCH /:id/estado transición válida → 200', async () => {
    const pedidoMock = { id: 1, estado_pedido: 'recibido' };
    const pedidoActualizado = { id: 1, estado_pedido: 'en_preparacion' };
    findByIdMock
      .mockResolvedValueOnce(pedidoMock)
      .mockResolvedValueOnce(pedidoActualizado);
    transicionEstadoValidaMock.mockReturnValue(true);
    updateEstadoPedidoMock.mockResolvedValue(1);

    const res = await request(app)
      .patch('/api/admin/cocina/pedidos/1/estado')
      .send({ estado_pedido: 'en_preparacion' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.ok).toEqual(true);
    expect(res.body.data.estado_pedido).toEqual('en_preparacion');
  });

  it('PATCH /:id/estado backward en_preparacion→recibido → 200 (agile)', async () => {
    const pedidoMock = { id: 1, estado_pedido: 'en_preparacion' };
    const pedidoActualizado = { id: 1, estado_pedido: 'recibido' };
    findByIdMock
      .mockResolvedValueOnce(pedidoMock)
      .mockResolvedValueOnce(pedidoActualizado);
    transicionEstadoValidaMock.mockReturnValue(true);
    updateEstadoPedidoMock.mockResolvedValue(1);

    const res = await request(app)
      .patch('/api/admin/cocina/pedidos/1/estado')
      .send({ estado_pedido: 'recibido' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.ok).toEqual(true);
    expect(res.body.data.estado_pedido).toEqual('recibido');
  });

  it('PATCH /:id/estado backward listo→en_preparacion → 200 (agile)', async () => {
    const pedidoMock = { id: 1, estado_pedido: 'listo' };
    const pedidoActualizado = { id: 1, estado_pedido: 'en_preparacion' };
    findByIdMock
      .mockResolvedValueOnce(pedidoMock)
      .mockResolvedValueOnce(pedidoActualizado);
    transicionEstadoValidaMock.mockReturnValue(true);
    updateEstadoPedidoMock.mockResolvedValue(1);

    const res = await request(app)
      .patch('/api/admin/cocina/pedidos/1/estado')
      .send({ estado_pedido: 'en_preparacion' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.ok).toEqual(true);
    expect(res.body.data.estado_pedido).toEqual('en_preparacion');
  });

  it('PATCH /:id/estado direct recibido→listo → 200 (agile)', async () => {
    const pedidoMock = { id: 1, estado_pedido: 'recibido' };
    const pedidoActualizado = { id: 1, estado_pedido: 'listo' };
    findByIdMock
      .mockResolvedValueOnce(pedidoMock)
      .mockResolvedValueOnce(pedidoActualizado);
    transicionEstadoValidaMock.mockReturnValue(true);
    updateEstadoPedidoMock.mockResolvedValue(1);

    const res = await request(app)
      .patch('/api/admin/cocina/pedidos/1/estado')
      .send({ estado_pedido: 'listo' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.ok).toEqual(true);
    expect(res.body.data.estado_pedido).toEqual('listo');
  });

  it('PATCH /:id/estado entregado→listo → 400 (delivered is terminal)', async () => {
    const pedidoMock = { id: 1, estado_pedido: 'entregado' };
    findByIdMock.mockResolvedValue(pedidoMock);
    transicionEstadoValidaMock.mockReturnValue(false);

    const res = await request(app)
      .patch('/api/admin/cocina/pedidos/1/estado')
      .send({ estado_pedido: 'listo' });

    expect(res.statusCode).toEqual(400);
    expect(res.body.ok).toEqual(false);
    expect(res.body.error).toMatch(/no válida/i);
  });

  it('PATCH /:id/estado salto inválido → 400 con mensaje unificado', async () => {
    const pedidoMock = { id: 1, estado_pedido: 'listo' };
    findByIdMock.mockResolvedValue(pedidoMock);
    transicionEstadoValidaMock.mockReturnValue(false);

    const res = await request(app)
      .patch('/api/admin/cocina/pedidos/1/estado')
      .send({ estado_pedido: 'recibido' });

    expect(res.statusCode).toEqual(400);
    expect(res.body.ok).toEqual(false);
    expect(res.body.error).toMatch(/no válida/i);
  });

  it('PATCH /:id/estado mismo estado → 400 (FIX retroactivo)', async () => {
    const pedidoMock = { id: 1, estado_pedido: 'recibido' };
    findByIdMock.mockResolvedValue(pedidoMock);
    transicionEstadoValidaMock.mockReturnValue(false);

    const res = await request(app)
      .patch('/api/admin/cocina/pedidos/1/estado')
      .send({ estado_pedido: 'recibido' });

    expect(res.statusCode).toEqual(400);
    expect(res.body.ok).toEqual(false);
    expect(res.body.error).toMatch(/no válida/i);
  });

  it('PATCH /:id/estado id inexistente → 404', async () => {
    findByIdMock.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/admin/cocina/pedidos/9999/estado')
      .send({ estado_pedido: 'en_preparacion' });

    expect(res.statusCode).toEqual(404);
    expect(res.body.ok).toEqual(false);
  });

  it('PATCH /:id/estado estado fuera de enum → 400 (validación Zod)', async () => {
    const res = await request(app)
      .patch('/api/admin/cocina/pedidos/1/estado')
      .send({ estado_pedido: 'borrado' });

    expect(res.statusCode).toEqual(400);
    expect(res.body.ok).toEqual(false);
  });

  it('PATCH /:id/estado id no numérico → 400 (validación Zod)', async () => {
    const res = await request(app)
      .patch('/api/admin/cocina/pedidos/abc/estado')
      .send({ estado_pedido: 'en_preparacion' });

    expect(res.statusCode).toEqual(400);
    expect(res.body.ok).toEqual(false);
  });
});
