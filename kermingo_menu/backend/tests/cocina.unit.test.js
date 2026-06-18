// Tests unitarios de transicionEstadoValida — sin mocks, sin HTTP.
// Archivo separado porque jest.mock tiene scope de archivo y no permite
// importar la implementación real en cocina.test.js (que mockea pedido.model.js).
import { transicionEstadoValida, TRANSICIONES_VALIDAS } from '../src/api/models/pedido.model.js';

describe('transicionEstadoValida (unit, real impl)', () => {
  // El estado `recibido` es el estado inicial para pedidos online.
  // Caja pedidos entran directamente como `en_preparacion`.

  // ── Forward transitions (state machine) ──

  it('recibido → en_preparacion: true (payment confirmed, release to kitchen)', () => {
    expect(transicionEstadoValida('recibido', 'en_preparacion')).toBe(true);
  });

  it('recibido → listo: true (fast-forward to ready)', () => {
    expect(transicionEstadoValida('recibido', 'listo')).toBe(true);
  });

  it('en_preparacion → listo: true', () => {
    expect(transicionEstadoValida('en_preparacion', 'listo')).toBe(true);
  });

  it('listo → entregado: true', () => {
    expect(transicionEstadoValida('listo', 'entregado')).toBe(true);
  });

  // ── Backward transitions (agile: go back to fix mistakes) ──

  it('listo → en_preparacion: true (backward one step)', () => {
    expect(transicionEstadoValida('listo', 'en_preparacion')).toBe(true);
  });

  it('en_preparacion → recibido: true (kitchen sends back to pending confirmation)', () => {
    expect(transicionEstadoValida('en_preparacion', 'recibido')).toBe(true);
  });

  // ── Invalid transitions ──

  it('entregado → listo: false (delivered is terminal)', () => {
    expect(transicionEstadoValida('entregado', 'listo')).toBe(false);
  });

  it('entregado → en_preparacion: false (delivered is terminal)', () => {
    expect(transicionEstadoValida('entregado', 'en_preparacion')).toBe(false);
  });

  it('entregado → recibido: false (delivered is terminal)', () => {
    expect(transicionEstadoValida('entregado', 'recibido')).toBe(false);
  });

  it('en_preparacion → entregado: false (skip to delivered)', () => {
    expect(transicionEstadoValida('en_preparacion', 'entregado')).toBe(false);
  });

  // ── Same-state transitions (always invalid) ──

  it('recibido → recibido: false (same state)', () => {
    expect(transicionEstadoValida('recibido', 'recibido')).toBe(false);
  });

  it('en_preparacion → en_preparacion: false (same state)', () => {
    expect(transicionEstadoValida('en_preparacion', 'en_preparacion')).toBe(false);
  });

  it('listo → listo: false (same state)', () => {
    expect(transicionEstadoValida('listo', 'listo')).toBe(false);
  });

  it('entregado → entregado: false (same state)', () => {
    expect(transicionEstadoValida('entregado', 'entregado')).toBe(false);
  });

  // ── Unknown states ──

  it('unknown from state: false', () => {
    expect(transicionEstadoValida('cancelado', 'listo')).toBe(false);
  });

  it('unknown to state: false', () => {
    expect(transicionEstadoValida('en_preparacion', 'cancelado')).toBe(false);
  });
});

describe('TRANSICIONES_VALIDAS (constant)', () => {
  it('recibido allows en_preparacion and listo', () => {
    expect(TRANSICIONES_VALIDAS.recibido).toEqual(['en_preparacion', 'listo']);
  });

  it('en_preparacion allows listo and recibido', () => {
    expect(TRANSICIONES_VALIDAS.en_preparacion).toEqual(['listo', 'recibido']);
  });

  it('listo allows en_preparacion and entregado', () => {
    expect(TRANSICIONES_VALIDAS.listo).toEqual(['en_preparacion', 'entregado']);
  });

  it('entregado has no transitions (terminal)', () => {
    expect(TRANSICIONES_VALIDAS.entregado).toEqual([]);
  });
});