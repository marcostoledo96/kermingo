# 04 — Backend API Express + MySQL

## Stack

```txt
Node.js
Express
MySQL
mysql2/promise
dotenv
cors
cookie-parser
bcrypt
jsonwebtoken
multer
googleapis
zod
exceljs
jest
supertest
```

## Scripts sugeridos

```json
{
  "type": "module",
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "test": "jest --runInBand"
  }
}
```

## Estructura backend

```txt
backend/src/
├── app.js
├── server.js
└── api/
    ├── config/
    │   └── environments.js
    ├── database/
    │   ├── db.js
    │   ├── schema.sql
    │   └── seed.sql
    ├── routes/
    │   ├── index.routes.js
    │   ├── auth.routes.js
    │   ├── producto.routes.js
    │   ├── categoria.routes.js
    │   ├── pedido.routes.js
    │   ├── caja.routes.js
    │   ├── cocina.routes.js
    │   ├── archivo.routes.js
    │   ├── reporte.routes.js
    │   └── configuracion.routes.js
    ├── controllers/
    ├── models/
    ├── middlewares/
    ├── schemas/
    ├── services/
    └── utils/
```

## Middleware global

`app.js` debe configurar:

- `express.json()`
- `express.urlencoded({ extended: true })`
- `cookieParser()`
- `cors({ origin: [...], credentials: true })`
- logger simple
- rutas `/api`
- middleware 404
- middleware de errores

## Formato uniforme de respuesta

Respuesta exitosa:

```json
{
  "ok": true,
  "data": {},
  "message": "Operación exitosa"
}
```

Respuesta de error:

```json
{
  "ok": false,
  "error": "Mensaje claro del error"
}
```

## Convenciones

- Endpoints en español.
- Tablas en español singular.
- Modelos hablan con MySQL.
- Controladores no contienen SQL.
- Rutas no contienen lógica.
- Validaciones reales con Zod.
- Placeholders SQL `?`.
- `affectedRows` para PUT/DELETE.
- Transacciones para crear/cancelar pedidos.
