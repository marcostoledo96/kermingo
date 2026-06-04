# 09 — Autenticación con cookies httpOnly y CORS

## Decisión

Usar JWT en cookie httpOnly.

## Motivo

Es más seguro que guardar token admin en localStorage.

## Flujo login

```txt
Frontend /admin/login
    ↓ POST /api/auth/login
Backend valida bcrypt
    ↓
Backend genera JWT 24h
    ↓
Set-Cookie httpOnly
    ↓
Frontend redirige a /admin/dashboard
```

## Cookie producción

Como frontend y backend están en dominios distintos:

```txt
Frontend: https://kermingo.vercel.app
Backend: https://kermingo-backend.up.railway.app
```

La cookie debe usar:

```txt
httpOnly: true
secure: true
sameSite: "none"
maxAge: 24h
```

## Cookie local

En desarrollo:

```txt
httpOnly: true
secure: false
sameSite: "lax"
```

## CORS backend

Configurar CORS con origins explícitos:

```js
cors({
  origin: [
    "http://localhost:3000",
    "https://kermingo.vercel.app"
  ],
  credentials: true
})
```

No usar `origin: "*"` con cookies.

## Fetch frontend

Todas las llamadas admin deben incluir:

```ts
credentials: "include"
```

## Endpoints

```txt
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

## Middleware auth

`requireAuth` debe:

1. leer cookie
2. verificar JWT
3. cargar usuario
4. si no es válido, devolver 401

## Escalabilidad futura

Por ahora no hay roles, pero se deja listo para agregar:

```txt
rol ENUM('admin','caja','cocina')
```
