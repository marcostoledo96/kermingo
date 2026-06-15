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

# Correr todos los tests (--runInBand, requiere MySQL con seed)
npm test

# Unit tests solamente (no requieren DB, rápidos)
npm run test:unit

# Integration tests solamente (requieren MySQL, --runInBand)
npm run test:integration

# Correr un archivo específico
npx jest tests/path/to/file.test.js

# Ver coverage
npm test -- --coverage

# Tests Drive real (opt-in, requiere credenciales OAuth)
RUN_REAL_DRIVE_TESTS=true npm test -- --testPathPattern=comprobantes.test
```

**Nota:** ESM requiere el flag `--experimental-vm-modules`:

```json
"scripts": {
  "test": "node --experimental-vm-modules node_modules/.bin/jest --runInBand",
  "test:unit": "node --experimental-vm-modules node_modules/.bin/jest --testMatch '**/*.unit.test.js'",
  "test:integration": "node --experimental-vm-modules node_modules/.bin/jest --runInBand --testPathIgnorePatterns='unit'"
}
```

**Nota sobre `--runInBand`:** Se introdujo en B6.3.1 para eliminar interferencias concurrentes del pool de MySQL. Todas las suites corren secuencialmente. Si se agregan más tests, mantener `--runInBand` en los scripts de integración.

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
├── caja.test.js                    # Tests de caja (state machine de pago, filtro pendientes, edición transaccional, cancelación, cleanup)
├── cocina.controller.test.js       # Integration tests de cocina controller
├── cocina.test.js                  # Integration tests HTTP de cocina con DB real
├── cocina.unit.test.js             # Unit tests de cocina model
├── comprobantes.drive-mock.test.js # Tests de Drive con mocks (usa _resetDriveForTest)
├── comprobantes.test.js            # Integration tests de comprobantes (multipart, MIME, Drive, preflight)
├── comprobantes.unit.test.js       # Unit tests de comprobantes (schema, file-signature, DriveUploadError)
├── configuracion.controller.test.js # Unit tests de configuracion controller
├── configuracion.csrf.test.js      # Tests de CSRF para configuración
├── configuracion.test.js           # Integration tests de configuración con DB real
├── configuracion.unit.test.js      # Unit tests de configuracion schema
└── health.test.js                  # Test de health check
```

**Nota:** Los tests están en `backend/tests/` directamente (no en subcarpetas `unit/` o `integration/`). El patrón naming convention distingue unit de integration: `*.unit.test.js` para unitarios con mocks, `*.test.js` para integración con DB real, `*.controller.test.js` para tests de controller.

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
- `pool.end()` al final para cerrar conexiones. Con `--runInBand`, solo la última suite en ejecutarse debe cerrar el pool, o usar un patrón seguro que verifique si el pool ya fue cerrado.
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

| Suite | Archivo | Descripción |
|---|---|---|---|
| Comprobantes (unit) | `comprobantes.unit.test.js` | Schema preprocess, archivo.model, drive.service, MIME validation, magic bytes, DriveUploadError |
| Comprobantes (drive-mock) | `comprobantes.drive-mock.test.js` | Drive mock tests con `_resetDriveForTest`, safe internal filename format |
| Comprobantes (integration) | `comprobantes.test.js` | Multipart upload, MIME/size validation, magic bytes rejection, comprobante access, payment transitions, Drive failure, preflight store closed |
| Caja | `caja.test.js` | State machine de pago (method-aware), filtro `solo_pagos_pendientes`, edición transaccional, cancelación, cleanup |
| Cocina (integration) | `cocina.test.js` | Endpoints HTTP de cocina con DB real |
| Cocina (controller) | `cocina.controller.test.js` | Unit tests de cocina controller |
| Cocina (unit) | `cocina.unit.test.js` | Unit tests de cocina model |
| Configuración (integration) | `configuracion.test.js` | Integration tests con DB real |
| Configuración (controller) | `configuracion.controller.test.js` | Controller unit tests |
| Configuración (CSRF) | `configuracion.csrf.test.js` | Tests de CSRF para configuración |
| Configuración (unit) | `configuracion.unit.test.js` | Schema Zod tests |
| Health | `health.test.js` | Health check endpoint |
| **Total** | 12 suites, **187 tests** | Contar con `npm test` para verificación exacta |

La suite está en constante crecimiento. Para el conteo exacto, correr `npm test`.

**Tests Drive real (opt-in):** Por defecto, los tests NO contactan Google Drive. Para ejecutar tests reales de Drive:

```bash
RUN_REAL_DRIVE_TESTS=true npm test -- --testPathPattern=comprobantes.test
```

Se espera ~18 tests reales de Drive cuando las credenciales OAuth están configuradas.

---

## 8. Tipos de tests

### Unit tests (con mocks)

- **Schemas Zod:** Validar que los schemas aceptan lo que deben y rechazan lo que no.
- **Modelos con pool mockeado:** Testear SQL generado, lógica de expansión de combos, normalización de teléfono.

### Integration tests (con DB real)

- **API completa:** Supertest contra Express con DB real.
- **Fixtures:** Crear datos de test en `beforeAll`, limpiar en `afterAll`.
- **Flujos:** Crear pedido → avanzar estado → cancelar → verificar stock repuesto.

### Frontend tests (React + Vitest)

El frontend usa **Vitest + React Testing Library** para tests de componentes y hooks:

| Test | Archivo | Qué cubre |
|------|---------|-----------|
| TicketScreen QR | `frontend/test/ticket-screen.test.tsx` | QR codifica URL correcta, no expone datos privados, tamaño 168px |
| TrackingScreen token | `frontend/test/tracking-screen-token.test.tsx` | Auto-fetch por `?token=`, missing token muestra form, URL token sobreescribe localStorage |
| useLocalStorageState | `frontend/test/use-local-storage.test.ts` | Estabilidad referencial, cache invalidation, evita React #185 |

**Comandos:**
```bash
cd frontend
pnpm test        # Todos los tests
pnpm test -- --coverage  # Con cobertura
```

### Lo que NO se testea (todavía)

### Testing de Drive service

- **Unit tests:** Mock `googleapis` via `jest.doMock` / `jest.resetModules`. Test `uploadFile` success + error throws. Test `isDriveReady` state. Test `assertAllowedFileSignature` con buffers reales (PDF/PNG/JPEG/WEBP válidos e inválidos).
- **Drive mock tests:** `comprobantes.drive-mock.test.js` usa `_getDriveStateForTest()` / `_resetDriveForTest()` para save/restore del estado interno del servicio Drive entre suites. Testea el formato de nombre interno seguro (`${timestamp}-${uuid}-${sanitizedOriginal}`).
- **Integration tests:** Drive upload depende de `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN` y `GOOGLE_DRIVE_FOLDER_ID` en env. Por defecto (`RUN_REAL_DRIVE_TESTS` ausente o `false`), los tests NO contactan Drive real. Solo cuando `RUN_REAL_DRIVE_TESTS=true` Y las credenciales OAuth están configuradas, el archivo sube a Drive real. Ver comando en sección 2.
- **Magic bytes integration:** `comprobantes.test.js` testea que un archivo con MIME `application/pdf` pero buffer sin firma `%PDF` recibe 400.
- **Preflight store closed:** `comprobantes.test.js` testea que tienda cerrada + transferencia con comprobante → 400 sin intentar Drive.
- **Patrón supertest multipart:** Usar `.field()` y `.attach()` para simular `multipart/form-data`. Ejemplo:

```javascript
const res = await request(app)
  .post('/api/pedidos')
  .field('nombre_cliente', 'Test')
  .field('metodo_pago', 'transferencia')
  .field('items', JSON.stringify([{ producto_id: 5, cantidad: 1 }]))
  .attach('comprobante', Buffer.from('fake'), {
    filename: 'receipt.jpg',
    contentType: 'image/jpeg',
  });
```