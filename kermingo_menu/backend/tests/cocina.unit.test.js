// Tests unitarios de transicionEstadoValida — sin mocks, sin HTTP.
// Archivo separado porque jest.mock tiene scope de archivo y no permite
// importar la implementación real en cocina.test.js (que mockea pedido.model.js).
import { transicionEstadoValida, TRANSICIONES_VALIDAS } from '../src/api/models/pedido.model.js';

describe('transicionEstadoValida (unit, real impl)', () => {
  // El estado `recibido` se eliminó del flujo: pedidos nuevos entran
  // directamente como `en_preparacion`. Las transiciones desde/hacia
  // `recibido` ahora son inválidas.

  // ── Forward transitions (nuevo flujo) ──

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

  // ── Invalid: recibido ya no es un estado inicial válido ──

  it('recibido → en_preparacion: false (estado inicial eliminado)', () => {
    expect(transicionEstadoValida('recibido', 'en_preparacion')).toBe(false);
  });

  it('recibido → listo: false (estado inicial eliminado)', () => {
    expect(transicionEstadoValida('recibido', 'listo')).toBe(false);
  });

  it('en_preparacion → recibido: false (backward a recibido eliminado)', () => {
    expect(transicionEstadoValida('en_preparacion', 'recibido')).toBe(false);
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
  it('recibido no está en el state machine (eliminado)', () => {
    expect(TRANSICIONES_VALIDAS.recibido).toBeUndefined();
  });

  it('en_preparacion solo permite listo (sin volver a recibido)', () => {
    expect(TRANSICIONES_VALIDAS.en_preparacion).toEqual(['listo']);
  });

  it('listo permite en_preparacion y entregado', () => {
    expect(TRANSICIONES_VALIDAS.listo).toEqual(['en_preparacion', 'entregado']);
  });

  it('entregado has no transitions (terminal)', () => {
    expect(TRANSICIONES_VALIDAS.entregado).toEqual([]);
  });
});
