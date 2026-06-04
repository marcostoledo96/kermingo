# 02 — Decisiones técnicas

## 1. Next.js en vez de Vite

Se elige Next.js porque:

- el prototipo de v0 ya viene en Next.js
- Vercel lo soporta muy bien
- permite mantener estructura moderna
- facilita deploy
- permite usar TypeScript, Tailwind y componentes ya generados

No se usará Next.js como backend principal. La API real estará en Express/Railway.

## 2. Backend API REST pura

No se usarán vistas EJS.

El backend será:

```txt
Express + MySQL + MVC + API REST
```

Esto queda justificado porque el profesor autorizó reemplazar el frontend por React.

## 3. Monorepo

Estructura:

```txt
kermingo/
├── backend/
├── frontend/
└── docs/
```

Ventajas:

- una sola carpeta de proyecto
- documentación compartida
- fácil de abrir en OpenCode
- deploy independiente por carpeta

## 4. TypeScript solo en frontend

Frontend:

```txt
TypeScript
```

Backend:

```txt
JavaScript ESM
```

Se mantiene JavaScript en backend para estar más cerca del estilo docente del profesor.

## 5. Cookies httpOnly para auth admin

Se usará cookie segura en vez de localStorage para login admin.

Ventajas:

- el token no queda expuesto directamente a JavaScript
- más seguro contra XSS
- el navegador envía la cookie automáticamente al backend

Como frontend y backend estarán en dominios distintos, en producción se necesita:

```txt
SameSite=None
Secure=true
credentials: true
CORS con origin exacto
```

## 6. Sesión de 24 horas

El JWT de admin durará 24 horas.

Habrá endpoint de logout para limpiar cookie.

## 7. Zod

Zod es una librería de validación de datos.

Sirve para validar cuerpos de request antes de guardar en MySQL.

Ejemplo:

```txt
nombre_cliente obligatorio
metodo_pago debe ser transferencia o efectivo
comprobante obligatorio solo si metodo_pago = transferencia
```

## 8. Multer + Google Drive

No conviene subir directo desde el navegador a Drive, porque habría que exponer credenciales o crear flujos más complejos.

Flujo recomendado:

```txt
Frontend Next.js
    ↓ multipart/form-data
Backend Express + Multer memoryStorage
    ↓ valida archivo
Google Drive API
    ↓
MySQL guarda drive_id y metadata
```

Multer solo recibe el archivo temporalmente en memoria. No se guarda en disco.

## 9. Imágenes y consumo de red

Para consumir menos transferencia del backend:

- imágenes públicas de producto: intentar usar URL pública directa de Drive
- comprobantes: acceso autenticado por backend/proxy solo cuando admin los abre
- proxy como fallback si Drive directo falla

## 10. Carrito persistente

El carrito debe persistir en `localStorage`.

Motivo: el usuario puede salir del sitio para hacer transferencia y volver sin perder el pedido.

## 11. Combos reales

Los combos se modelan con `combo_producto`.

Un combo descuenta stock de sus productos internos.

Ejemplo:

```txt
Combo Merienda
- 1 medialuna
- 1 chocolatada
```

Al comprar 2 combos, descuenta 2 medialunas y 2 chocolatadas.

## 12. Un usuario inicial, escalable

Se implementa tabla `usuario` sin roles obligatorios.

Puede escalar después a roles agregando:

```txt
rol ENUM('admin','caja','cocina')
```

Por ahora todos los usuarios logueados pueden hacer todo.
