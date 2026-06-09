// Tests unitarios de transicionEstadoValida — sin mocks, sin HTTP.
// Archivo separado porque jest.mock tiene scope de archivo y no permite
// importar la implementación real en cocina.test.js (que mockea pedido.model.js).
import { transicionEstadoValida } from '../src/api/models/pedido.model.js';

describe('transicionEstadoValida (unit, real impl)', () => {
  it('recibido → en_preparacion: true', () => {
    expect(transicionEstadoValida('recibido', 'en_preparacion')).toBe(true);
  });

  it('en_preparacion → listo: true', () => {
    expect(transicionEstadoValida('en_preparacion', 'listo')).toBe(true);
  });

  it('listo → entregado: true', () => {
    expect(transicionEstadoValida('listo', 'entregado')).toBe(true);
  });

  it('recibido → listo: false (salto)', () => {
    expect(transicionEstadoValida('recibido', 'listo')).toBe(false);
  });

  it('listo → recibido: false (retroceso)', () => {
    expect(transicionEstadoValida('listo', 'recibido')).toBe(false);
  });

  it('recibido → recibido: false (mismo estado, FIX retroactivo)', () => {
    expect(transicionEstadoValida('recibido', 'recibido')).toBe(false);
  });
});