# Spec: Store Configuration — Review Fixes

## Purpose

Módulo de configuración de tienda. Lectura pública de estado + mensaje; admin CRUD con autenticación JWT + trusted origin. Persistencia en singleton row `id=1` de `configuracion_tienda`.

Fixes retroactivos del PR #2: CSRF protection, affectedRows bug, nullable schema, corrección de tests.

## Files

`configuracion.schema.js` (1 Zod schema), `configuracion.model.js` (3 functions: `findPublic`, `findAdmin`, `updateMinimal`), `configuracion.controller.js` (3 handlers), `configuracion.routes.js` (1 pública + 2 admin), `index.routes.js` (mounts), `configuracion.test.js` (integración), `configuracion.controller.test.js` (mocks, nuevo), `configuracion.unit.test.js` (unitarios Zod, nuevo).

## Endpoints

| Método | Ruta | Auth | Origin | Handler | Schema |
|--------|------|------|--------|---------|--------|
| GET | `/api/configuracion-tienda` | público | any | `obtenerPublico` | — |
| GET | `/api/admin/configuracion-tienda` | admin | any | `obtenerAdmin` | — |
| PUT | `/api/admin/configuracion-tienda` | admin | trusted | `actualizarAdmin` | `updateConfiguracionSchema` |

**FIX (P1 CSRF)**: PUT admin aplica `requireTrustedOrigin` antes de `validateBody`. Consistente con `pedido`, `producto`, `cocina`.

## Zod Schema

```js
{
  estado: z.enum(['abierta', 'cerrada', 'demo']),           // required
  mensaje_publico: z.string().max(500).nullable().optional(),
  cena_habilitada_desde: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/, 'Formato: HH:MM:SS')
    .nullable()
    .optional(),
}.strict()
```

**FIX (nullable)**: `mensaje_publico` y `cena_habilitada_desde` aceptan `null` para limpiar. `null` escribe SQL `NULL`; ausencia omite columna. Strict mode rechaza props extras.

## State

Singleton `id=1` (seed). `estado` ENUM NOT NULL DEFAULT 'cerrada'. `mensaje_publico` TEXT NULL. `cena_habilitada_desde` TIME NULL.

## Handler: actualizarAdmin

**BUG**: `affected === 0` → 404. `mysql2` cuenta filas modificadas, no matched; UPDATE no-op devuelve 0.

**FIX**: descartar `affectedRows`. Tras `updateMinimal`, ejecutar `findAdmin`; si `null` → 404, si no → 200.

## Model: updateMinimal

Body vacío → 0 sin UPDATE. `null` en nullable → SQL `NULL`. `''` → string vacío.

## Testing Evidence

**Auth (sin DB):** (1) GET público sin cookie → 200. (2) GET admin sin cookie → 401. (3) PUT admin sin cookie → 401. (4) PUT sin Origin/Referer confiable → 403. (5) PUT + Origin confiable → 200.

**Read:** (6) GET público → `{id, estado, mensaje_publico}`. (7) GET admin → `{id, estado, mensaje_publico, cena_habilitada_desde}`. (8) Sin seed → 404.

**Update:** (9) Estado válido → 200. (10) Mismos valores → 200 (FIX: antes 404). (11) `mensaje_publico: null` → limpia (FIX). (12) `cena_habilitada_desde: null` → limpia (FIX). (13) Mensaje texto → persiste. (14) Hora válida → persiste. (15) Estado fuera enum → 400. (16) Mensaje > 500 chars → 400. (17) Hora formato inválido → 400. (18) `null` como string → 400 (regex). (19) Props extras → 400 (strict).

**CSRF:** (20) `Origin: evil.com` → 401 (FIX retroactivo, ver WARNING en verify-report sobre semántica 401 vs 403). (21) `Referer: evil.com` → 401. (22) Sin Origin, Referer frontend → 200. (23) Sin Origin ni Referer → 401.

## Requirements Summary

| Requirement | Scenario Count | Cobertura |
|---|---|---|
| Auth gating (admin required en GET/PUT admin) | 2 | 2, 3 |
| CSRF protection en PUT admin (requireTrustedOrigin) | 5 | 4, 5, 20, 21, 23 |
| Origin legacy fallback (sin Origin, con Referer de frontend) | 1 | 22 |
| GET público retorna estado + mensaje | 1 | 6 |
| GET admin retorna estado + mensaje + cena_habilitada | 1 | 7 |
| GET 404 si fila id=1 no existe | 1 | 8 |
| PUT estado válido persiste | 1 | 9 |
| PUT no-op (mismos valores) retorna 200 (FIX) | 1 | 10 |
| PUT con null limpia campo en DB (FIX) | 2 | 11, 12 |
| PUT con string válido persiste | 2 | 13, 14 |
| PUT estado fuera de enum 400 (Zod) | 1 | 15 |
| PUT mensaje_publico > 500 chars 400 (Zod) | 1 | 16 |
| PUT cena_habilitada formato inválido 400 (Zod) | 1 | 17 |
| PUT null en string (string no matchea regex) 400 (Zod) | 1 | 18 |
| PUT strict mode rechaza props extras (Zod) | 1 | 19 |

## Out of Scope

No agregar DB de test. No rehacer estructura. No tocar main. No tocar PRs #1/#4/#5.
