# Autenticación — Kermingo

> Leé este archivo cuando trabajes en login, cookies, middleware de auth,
> CSRF, o necesites entender cómo se protege un endpoint.

---

## Índice

1. [JWT en cookie httpOnly](#1-jwt-en-cookie-httponly)
2. [Flujo de login](#2-flujo-de-login)
3. [Flujo de logout](#3-flujo-de-logout)
4. [Middleware requireAdmin](#4-middleware-requireadmin)
5. [Middleware requireTrustedOrigin (CSRF)](#5-middleware-requiretrustedorigin-csrf)
6. [bcrypt y contraseñas](#6-bcrypt-y-contraseñas)
7. [Roles](#7-roles)
8. [Errores de autenticación](#8-errores-de-autenticación)

---

## 1. JWT en cookie httpOnly

**Archivo:** `backend/src/api/controllers/auth.controller.js`

El token JWT se envuelve en una cookie:

| Opción | Desarrollo | Producción |
|---|---|---|
| `httpOnly` | `true` | `true` |
| `secure` | `false` | `true` |
| `sameSite` | `'lax'` | `'none'` |
| `path` | `'/'` | `'/'` |
| `maxAge` | `86400000` (24h) | `86400000` (24h) |

**Nombre de la cookie:** `kermingo_admin_token` (configurable vía `COOKIE_NAME`).

**Gotcha:** `sameSite: 'none'` en producción requiere `secure: true`, lo que a su vez requiere HTTPS. Sin HTTPS en dev local, la cookie no se envía si se fuerza `secure: true`. Ver `GOTCHAS.md`.

---

## 2. Flujo de login

```
POST /api/auth/login
  → validateBody(loginSchema)        # { email, contrasenia }
  → auth.controller.login
      → findByEmail(pool, email)     # Busca usuario en DB
      → bcrypt.compare(contrasenia, hash)  # Verifica contraseña
      → jwt.sign({ userId }, secret, { expiresIn: '24h' })
      → res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS)
      → respuestaExitosa(res, { usuario }, 'Sesión iniciada correctamente')
```

**Si falla:** Devuelve `AuthError` (401) con mensaje genérico: "Credenciales inválidas". No revela si el email existe o no.

---

## 3. Flujo de logout

```
POST /api/auth/logout
  → requireTrustedOrigin              # CSRF check
  → auth.controller.logout
      → res.clearCookie(COOKIE_NAME, CLEAR_COOKIE_OPTIONS)
      → respuestaExitosa(res, null, 'Sesión cerrada correctamente')
```

---

## 4. Middleware requireAdmin

**Archivo:** `backend/src/api/middlewares/admin.middleware.js`

```javascript
requireAdmin(req, res, next)
  → Lee cookie 'kermingo_admin_token'
  → Si no existe → AuthError (401)
  → jwt.verify(token, secret) → decoded
  → SELECT id, nombre, email, activo FROM usuario WHERE id = ?
  → Si no existe o inactivo → AuthError (401)
  → req.usuario = { id, nombre, email }
  → next()
```

**Importante:** Este middleware hace una query a la base de datos en cada request protegida. Para tests unitarios, se necesita mock o DB real.

---

## 5. Middleware requireTrustedOrigin (CSRF)

**Archivo:** `backend/src/api/middlewares/origin.middleware.js`

Protección CSRF para métodos unsafe (`POST`, `PUT`, `PATCH`, `DELETE`):

```
requireTrustedOrigin(req, res, next)
  → Si método es GET/HEAD/OPTIONS → next()
  → Lee header Origin
  → Si Origin existe y coincide exactamente con FRONTEND_URL → next()
  → Si Origin existe y no coincide → ForbiddenError 403
  → Si Origin no existe, lee Referer
  → Parsea Referer con new URL(referer).origin
  → Si refererOrigin coincide con FRONTEND_URL → next()
  → Si no cumple → ForbiddenError 403
```

**`FRONTEND_URL`** se configura en `environments.js` (default: `http://localhost:3000`).

---

## 6. bcrypt y contraseñas

- Hash: `bcrypt.hash()` con 10 rounds (cost factor por defecto).
- Verificación: `bcrypt.compare(plain, hash)`.
- La contraseña temporal del seed es `admin123` con hash precomputado.
- No hay endpoint de cambio de contraseña en el MVP.

---

## 7. Roles

**No hay roles separados en el MVP.** Todos los usuarios admin logueados pueden hacer todo:

- Crear pedidos de caja
- Cambiar estados de pedido
- Cambiar estados de pago
- Cancelar pedidos
- Gestionar productos
- Configurar la tienda

La tabla `usuario` tiene campo `activo` (TINYINT) para desactivar cuentas, pero no campo `rol`. Si se necesitan roles en el futuro, se agrega un campo `rol` con ENUM.

---

## 8. Errores de autenticación

| Error | Código | Cuándo |
|---|---|---|
| Token no encontrado | 401 | Cookie ausente |
| Token inválido o expirado | 401 | JWT no verifica o expiró |
| Usuario no encontrado | 401 | ID del token no existe en DB |
| Cuenta inactiva | 401 | Campo `activo = 0` |
| Credenciales inválidas | 401 | Email o contraseña incorrectos |
| Origen no permitido | 403 | CSRF failure (origin/referer no coincide) |

Los errores 401 usan `AuthError`; el error 403 de CSRF usa `ForbiddenError`. El frontend trata 401 como "no autenticado" y redirige al login. El 403 indica "prohibido" (origen no confiable).