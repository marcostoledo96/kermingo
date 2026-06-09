# Testing — Kermingo

> Leé este archivo cuando necesites correr tests, escribir uno nuevo,
> o entender la estrategia de testing del backend.

---

## Índice

1. [Stack de testing](#1-stack-de-testing)
2. [Comandos](#2-comandos)
3. [Convenciones](#3-convenciones)
4. [Estructura de tests](#4-estructura-de-tests)
5. [Patrones para tests con DB real](#5-patrones-para-tests-con-db-real)
6. [Patrones para tests con mocks](#6-patrones-para-tests-con-mocks)
7. [Cobertura actual](#7-cobertura-actual)
8. [Tipos de tests](#8-tipos-de-tests)

---

## 1. Stack de testing

| Tecnología | Versión | Para qué |
|---|---|---|
| Jest | 29.x | Framework de testing |
| Supertest | 6.x | Tests de integración HTTP |
| `--experimental-vm-modules` | Flag | Necesario porque el proyecto usa ESM |

**Archivo de config:** `backend/package.json` (campo `jest` implícito, usa defaults de Jest 29).

---

## 2. Comandos

```bash
cd backend

# Correr todos los tests
npm test

# Correr un archivo específico
npx jest tests/path/to/file.test.js

# Ver coverage
npm test -- --coverage
```

**Nota:** ESM requiere el flag `--experimental-vm-modules`:

```json
"scripts": {
  "test": "node --experimental-vm-modules node_modules/.bin/jest"
}
```

---

## 3. Convenciones

- Archivos de test: `*.test.js` dentro de `backend/tests/`.
- `describe` e `it` en **español** cuando describe comportamiento de negocio.
- `describe` e `it` en inglés cuando describe comportamiento técnico (ej: middleware, schema).
- Un archivo de test por módulo: `pedido.model.test.js` → teste `pedido.model.js`.

---

## 4. Estructura de tests

```
backend/tests/
├── unit/
│   ├── pedido.model.test.js      # Unit tests de modelo con DB mock
│   ├── auth.schema.test.js       # Unit tests de schemas Zod
│   └── ...
├── integration/
│   ├── pedido.api.test.js        # Integration tests HTTP con DB real
│   ├── auth.api.test.js          # Integration tests de login/logout
│   └── ...
└── helpers/
    └── setup.js                  # Fixtures, RUN_ID, limpieza
```

---

## 5. Patrones para tests con DB real

Los tests de integración requieren una base de datos MySQL accesible.

**Patrón estándar:**

```javascript
import { getPool } from '../../src/api/database/db.js';

const RUN_ID = Date.now();

beforeAll(async () => {
  // Crear fixtures con RUN_ID para aislamiento
  // Ej: INSERT con nombre que incluye RUN_ID
});

afterAll(async () => {
  // Limpieza con cancelWithTransaction o DELETE WHERE nombre LIKE '%RUN_ID%'
  const pool = getPool();
  // ... limpieza ...
  await pool.end();
});
```

**Reglas:**
- Usar `RUN_ID` para distinguir datos de test entre ejecuciones.
- Limpieza en `afterAll`, no en `afterEach` (más eficiente).
- `pool.end()` al final para cerrar conexiones.
- No hacer `DELETE` masivos; usar filtros específicos con `RUN_ID`.

---

## 6. Patrones para tests con mocks

ESM con Jest requiere `jest.unstable_mockModule`:

```javascript
import { jest } from '@jest/globals';

// Mock del pool de DB
const mockPool = {
  query: jest.fn(),
  getConnection: jest.fn(),
};

jest.unstable_mockModule('../../src/api/database/db.js', () => ({
  getPool: () => mockPool,
}));

// Importar DESPUÉS del mock
const { createWithTransaction } = await import('../../src/api/models/pedido.model.js');
```

**Gotcha:** `jest.unstable_mockModule` tiene scope de archivo. No se puede re-mockear el mismo módulo en el mismo archivo con valores distintos. Si necesitás diferentes mocks por test, usá `mockPool.query.mockImplementationOnce(fn)`.

---

## 7. Cobertura actual

| Suite | Tests | Estado |
|---|---|---|
| Pedido model | ~60 | Core: creación, cancelación, stock, transacciones |
| Auth schema | ~10 | Validación Zod de login |
| Pedido schema | ~18 | Validación de creación, query, estado |
| Integration API | ~55 | Endpoints HTTP con DB real |
| **Total** | **~143** | Rama caja + untracked adicionales |

La suite está en constante crecimiento. Para el conteo exacto, correr `npm test`.

---

## 8. Tipos de tests

### Unit tests (con mocks)

- **Schemas Zod:** Validar que los schemas aceptan lo que deben y rechazan lo que no.
- **Modelos con pool mockeado:** Testear SQL generado, lógica de expansión de combos, normalización de teléfono.

### Integration tests (con DB real)

- **API completa:** Supertest contra Express con DB real.
- **Fixtures:** Crear datos de test en `beforeAll`, limpiar en `afterAll`.
- **Flujos:** Crear pedido → avanzar estado → cancelar → verificar stock repuesto.

### Lo que NO se testea (todavía)

- Frontend (no hay tests de React todavía).
- Google Drive API (no implementada completamente).
- Subida de comprobantes (B6.3 pendiente).