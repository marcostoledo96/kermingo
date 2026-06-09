/**
 * Tests unitarios del schema Zod para configuración.
 * Sin HTTP, sin mocks, sin DB. Usa safeParse directamente.
 */
import { updateConfiguracionSchema } from '../src/api/schemas/configuracion.schema.js';

// ─── Helpers ──────────────────────────────────────────────────────────

function expectSuccess(result) {
  if (!result.success) {
    throw new Error(`Expected success but got: ${JSON.stringify(result.error.issues)}`);
  }
}

function expectFailure(result) {
  if (result.success) {
    throw new Error(`Expected failure but got success with: ${JSON.stringify(result.data)}`);
  }
}

// ─── Tests ────────────────────────────────────────────────────────────

describe('updateConfiguracionSchema (unit)', () => {
  // ─── estado (requerido) ──────────────────────────────────────────────

  describe('estado (requerido)', () => {
    it('acepta estado "abierta"', () => {
      const result = updateConfiguracionSchema.safeParse({ estado: 'abierta' });
      expectSuccess(result);
      expect(result.data.estado).toBe('abierta');
    });

    it('acepta estado "cerrada"', () => {
      const result = updateConfiguracionSchema.safeParse({ estado: 'cerrada' });
      expectSuccess(result);
      expect(result.data.estado).toBe('cerrada');
    });

    it('acepta estado "demo"', () => {
      const result = updateConfiguracionSchema.safeParse({ estado: 'demo' });
      expectSuccess(result);
      expect(result.data.estado).toBe('demo');
    });

    it('rechaza estado inválido', () => {
      const result = updateConfiguracionSchema.safeParse({ estado: 'no_existe' });
      expectFailure(result);
      const estadoIssue = result.error.issues.find((i) => i.path.includes('estado'));
      expect(estadoIssue).toBeDefined();
    });

    it('rechaza body sin estado', () => {
      const result = updateConfiguracionSchema.safeParse({});
      expectFailure(result);
      const estadoIssue = result.error.issues.find((i) => i.path.includes('estado'));
      expect(estadoIssue).toBeDefined();
    });
  });

  // ─── mensaje_publico (nullable + optional) ───────────────────────────

  describe('mensaje_publico (nullable + optional)', () => {
    it('acepta mensaje_publico como string', () => {
      const result = updateConfiguracionSchema.safeParse({
        estado: 'abierta',
        mensaje_publico: 'texto',
      });
      expectSuccess(result);
      expect(result.data.mensaje_publico).toBe('texto');
    });

    it('acepta mensaje_publico null (FIX retroactivo)', () => {
      const result = updateConfiguracionSchema.safeParse({
        estado: 'abierta',
        mensaje_publico: null,
      });
      expectSuccess(result);
      expect(result.data.mensaje_publico).toBeNull();
    });

    it('acepta body sin mensaje_publico (opcional)', () => {
      const result = updateConfiguracionSchema.safeParse({ estado: 'abierta' });
      expectSuccess(result);
      expect(result.data.mensaje_publico).toBeUndefined();
    });

    it('acepta mensaje_publico de 500 chars (límite)', () => {
      const result = updateConfiguracionSchema.safeParse({
        estado: 'abierta',
        mensaje_publico: 'a'.repeat(500),
      });
      expectSuccess(result);
    });

    it('rechaza mensaje_publico de 501 chars', () => {
      const result = updateConfiguracionSchema.safeParse({
        estado: 'abierta',
        mensaje_publico: 'a'.repeat(501),
      });
      expectFailure(result);
      const msgIssue = result.error.issues.find((i) => i.path.includes('mensaje_publico'));
      expect(msgIssue).toBeDefined();
    });
  });

  // ─── cena_habilitada_desde (nullable + optional + regex) ─────────────

  describe('cena_habilitada_desde (nullable + optional + regex)', () => {
    it('acepta formato HH:MM:SS válido (20:30:00)', () => {
      const result = updateConfiguracionSchema.safeParse({
        estado: 'abierta',
        cena_habilitada_desde: '20:30:00',
      });
      expectSuccess(result);
      expect(result.data.cena_habilitada_desde).toBe('20:30:00');
    });

    it('acepta 00:00:00 (inicio del día)', () => {
      const result = updateConfiguracionSchema.safeParse({
        estado: 'abierta',
        cena_habilitada_desde: '00:00:00',
      });
      expectSuccess(result);
    });

    it('acepta 23:59:59 (fin del día)', () => {
      const result = updateConfiguracionSchema.safeParse({
        estado: 'abierta',
        cena_habilitada_desde: '23:59:59',
      });
      expectSuccess(result);
    });

    it('acepta null (FIX retroactivo para limpiar)', () => {
      const result = updateConfiguracionSchema.safeParse({
        estado: 'abierta',
        cena_habilitada_desde: null,
      });
      expectSuccess(result);
      expect(result.data.cena_habilitada_desde).toBeNull();
    });

    it('acepta body sin cena_habilitada_desde (opcional)', () => {
      const result = updateConfiguracionSchema.safeParse({ estado: 'abierta' });
      expectSuccess(result);
      expect(result.data.cena_habilitada_desde).toBeUndefined();
    });

    it('rechaza formato sin segundos (20:30)', () => {
      const result = updateConfiguracionSchema.safeParse({
        estado: 'abierta',
        cena_habilitada_desde: '20:30',
      });
      expectFailure(result);
      const cenaIssue = result.error.issues.find((i) => i.path.includes('cena_habilitada_desde'));
      expect(cenaIssue).toBeDefined();
    });

    it('rechaza hora inválida (25:00:00)', () => {
      const result = updateConfiguracionSchema.safeParse({
        estado: 'abierta',
        cena_habilitada_desde: '25:00:00',
      });
      expectFailure(result);
      const cenaIssue = result.error.issues.find((i) => i.path.includes('cena_habilitada_desde'));
      expect(cenaIssue).toBeDefined();
    });

    it('rechaza string arbitrario', () => {
      const result = updateConfiguracionSchema.safeParse({
        estado: 'abierta',
        cena_habilitada_desde: 'mal',
      });
      expectFailure(result);
      const cenaIssue = result.error.issues.find((i) => i.path.includes('cena_habilitada_desde'));
      expect(cenaIssue).toBeDefined();
    });
  });

  // ─── strict (rechaza props extras) ───────────────────────────────────

  describe('strict (rechaza props extras)', () => {
    it('rechaza prop extra "extra"', () => {
      const result = updateConfiguracionSchema.safeParse({
        estado: 'abierta',
        extra: 'no',
      });
      expectFailure(result);
      const strictIssue = result.error.issues.find(
        (i) => i.code === 'unrecognized_keys' || i.message?.toLowerCase().includes('unrecognized')
      );
      expect(strictIssue).toBeDefined();
    });

    it('rechaza múltiples props extras', () => {
      const result = updateConfiguracionSchema.safeParse({
        estado: 'abierta',
        foo: 1,
        bar: 2,
      });
      expectFailure(result);
    });
  });
});