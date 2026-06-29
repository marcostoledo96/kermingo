import { jest } from '@jest/globals';
import { createWithTransaction } from '../src/api/models/pedido.model.js';
import { ValidationError } from '../src/api/utils/errors.js';

function createPoolMock(productRows = []) {
  const conn = {
    beginTransaction: jest.fn(),
    query: jest.fn()
      .mockResolvedValueOnce([[{ estado: 'abierta' }]])
      .mockResolvedValueOnce([productRows]),
    rollback: jest.fn(),
    commit: jest.fn(),
    release: jest.fn(),
  };

  return {
    pool: { getConnection: jest.fn().mockResolvedValue(conn) },
    conn,
  };
}

describe('createWithTransaction (unit)', () => {
  it('rechaza como validación un producto inexistente o inactivo', async () => {
    const { pool, conn } = createPoolMock([]);

    let error;
    try {
      await createWithTransaction(pool, {
        nombre_cliente: 'Cliente test',
        metodo_pago: 'transferencia',
        items: [{ producto_id: 34, cantidad: 1 }],
      });
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe('Producto 34 no encontrado o inactivo');

    expect(conn.rollback).toHaveBeenCalledTimes(1);
    expect(conn.commit).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledTimes(1);
  });
});
