# Auth API — etapa-4-auth

## Overview

JWT authentication with httpOnly cookies for Kermingo admin users. Replaces placeholder admin middleware with real JWT verification and bcrypt password comparison.

## Endpoint definitions

### POST /api/auth/login

**Purpose**: Authenticate admin user and set JWT cookie.

**Request body** (JSON):
```json
{
  "email": "admin@kermingo.com",
  "contrasenia": "MiPassword123"
}
```

**Success response** (200):
```json
{
  "success": true,
  "message": "Sesión iniciada correctamente",
  "data": {
    "usuario": {
      "id": 1,
      "nombre": "Admin",
      "email": "admin@kermingo.com"
    }
  }
}
```

**Error responses**:
- 400 — validation error ("Email inválido" or "Contrasenia requerida")
- 401 — "Credenciales inválidas" (user not found OR wrong password — same message to prevent enumeration)
- 401 — "Cuenta inactiva" (user exists but activo = 0)

**Behavior**:
1. Validate body with Zod schema (email format, non-empty password)
2. Find user by email in `usuario` table
3. If not found → throw AuthError("Credenciales inválidas")
4. If usuario.activo === 0 → throw AuthError("Cuenta inactiva")
5. bcrypt.compare(contrasenia, usuario.contrasenia_hash)
6. If invalid → throw AuthError("Credenciales inválidas")
7. jwt.sign({ userId: usuario.id }, secret, { expiresIn })
8. Set httpOnly cookie `token` with JWT
9. Return user data (no password, no hash)

**Cookie set**:
```
token=<jwt>; HttpOnly; Secure; SameSite=None (prod) / Lax (dev); Path=/; Max-Age=86400
```

---

### POST /api/auth/logout

**Purpose**: Clear JWT cookie to terminate session.

**Request**: No body required. Requires cookie to be present (client should send cookie).

**Success response** (200):
```json
{
  "success": true,
  "message": "Sesión cerrada correctamente",
  "data": null
}
```

**Behavior**:
1. res.clearCookie('token', CLEAR_COOKIE_OPTIONS)
2. Cookie options match login (httpOnly, secure, sameSite, path)
3. Return success message

---

### GET /api/auth/me

**Purpose**: Return current authenticated user data.

**Request**: Requires valid JWT cookie. Uses `requireAdmin` middleware.

**Success response** (200):
```json
{
  "success": true,
  "message": "Usuario autenticado",
  "data": {
    "usuario": {
      "id": 1,
      "nombre": "Admin",
      "email": "admin@kermingo.com",
      "activo": 1
    }
  }
}
```

**Error responses**:
- 401 — "Token no encontrado" (no cookie)
- 401 — "Token inválido o expirado" (jwt.verify fails)
- 401 — "Usuario no encontrado" (user deleted from DB)
- 401 — "Cuenta inactiva" (user.activo === 0)

**Behavior** (requireAdmin middleware):
1. Extract `token` from req.cookies
2. jwt.verify(token, secret) → decoded { userId }
3. Query `usuario` table for id = decoded.userId, select id, nombre, email, activo
4. If no rows → AuthError("Usuario no encontrado")
5. If usuario.activo === 0 → AuthError("Cuenta inactiva")
6. Set req.usuario = { id, nombre, email }
7. Controller queries full user row again to return activo status (for frontend info)

---

## Cookie configuration

### Environment: production (esProduccion = true)

```js
{
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  path: '/',
  maxAge: 24 * 60 * 60 * 1000, // 86400000 ms = 24h
}
```

**Note**: `sameSite: 'none'` requires `secure: true`. This is needed for cross-site cookies when frontend (Vercel) calls backend (Railway) — browsers require Secure + SameSite=None for cross-site.

### Environment: development (esProduccion = false)

```js
{
  httpOnly: true,
  secure: false,
  sameSite: 'lax',
  path: '/',
  maxAge: 24 * 60 * 60 * 1000,
}
```

**Note**: `sameSite: 'lax'` allows normal same-site navigation with cookies. `secure: false` because no HTTPS in dev.

### Clear cookie (logout)

Same options as set, but without `maxAge`. Browser clears when session ends.

---

## Security considerations

### Token contents
JWT payload is minimal: `{ userId }`. No email, no roles (future), no sensitive data.

### Password handling
- Passwords stored as bcrypt hashes (via seed.sql admin creation)
- bcrypt.compare used for login validation
- Original password never logged or returned

### Error message uniformity
Login failure returns "Credenciales inválidas" for both:
- User does not exist
- User exists but wrong password

This prevents email enumeration attacks.

### Inactive accounts
Users with activo = 0 cannot login. AuthError("Cuenta inactiva") thrown before bcrypt.compare.

### JWT secret
Loaded from environments.jwt.secret. Must be strong, non-empty string configured via environment variable.

### Cookie not accessible to JS
httpOnly: true means document.cookie cannot read the token. Protects against XSS attacks stealing session tokens.

---

## Middleware behavior

### requireAdmin (admin.middleware.js)

Applied to all `/admin/*` routes. Acts as auth guard:

1. Check req.cookies.token exists → 401 if missing
2. jwt.verify(token, secret) → 401 if invalid/expired
3. Query usuario table for userId → 401 if deleted
4. Check usuario.activo === 1 → 401 if inactive
5. Set req.usuario = { id, nombre, email }
6. next() → route handler

If any step fails, AuthError is passed to error handler middleware which returns JSON error response.

---

## File mapping

### Created (4 files)

| File | Purpose |
|------|---------|
| `backend/src/api/schemas/auth.schema.js` | Zod login schema with email and contrasenia validation |
| `backend/src/api/models/usuario.model.js` | findByEmail(pool, email) → usuario row |
| `backend/src/api/controllers/auth.controller.js` | login, logout, me handlers |
| `backend/src/api/routes/auth.routes.js` | Router mounting 3 endpoints |

### Modified (2 files)

| File | Change |
|------|--------|
| `backend/src/api/middlewares/admin.middleware.js` | Rewritten from placeholder to real JWT verification |
| `backend/src/api/routes/index.routes.js` | Added `authRouter` mounted at `/auth` |

### Dependencies installed

- `bcrypt` — password hashing
- `jsonwebtoken` — JWT sign/verify

---

## Deferred / future improvements

| Item | Reason deferred |
|------|-----------------|
| Refresh tokens | Not needed for 24h sessions; can add later without breaking existing flow |
| Role-based access control (RBAC) | MVP uses single admin role; middleware supports adding roles to JWT payload |
| Rate limiting on /auth/login | Prevent brute force; can add express-rate-limit per IP |
| Login attempt lockout | Track failed attempts in DB; temporary lock after N failures |
| Token rotation on refresh | Refresh endpoint would issue new JWT, invalidating old one |
| CORS origin allowlist | Currently uses `origin: '*'` for development; production should specify exact origins |

---

## Verification results

9/9 curl tests passed:

1. ✅ Login correcto → 200, cookie set, user data returned
2. ✅ Login incorrecto → 401 "Credenciales inválidas"
3. ✅ /me con cookie → 200, user data
4. ✅ /me sin cookie → 401 "Token no encontrado"
5. ✅ Admin productos con cookie → 200, paginated data (auth middleware works)
6. ✅ Admin productos sin cookie → 401 (middleware blocks unauthorized access)
7. ✅ Logout → 200, clearCookie
8. ✅ /me post-logout → 401 (cookie properly cleared)
9. ✅ Zod validation → 400 "Email inválido"

---

## Integration with other endpoints

Auth middleware (`requireAdmin`) is applied to all `/admin/*` routes:

- GET /api/admin/productos
- POST /api/admin/productos
- PUT /api/admin/productos/:id
- PATCH /api/admin/productos/:id/desactivar
- PATCH /api/admin/productos/:id/recuperar
- PATCH /api/admin/productos/:id/stock

Future admin endpoints (pedidos, caja, cocina) will automatically use the same middleware.

---

## Related documentation

- `docs/planificacion/09-AUTH_COOKIES_CORS.md` — Auth, cookies, CORS design
- `docs/planificacion/06-ENDPOINTS_API.md` — Endpoint definitions
- `docs/planificacion/17-TAREAS_BACKEND_DETALLADAS.md` — Etapa B4 section marked complete