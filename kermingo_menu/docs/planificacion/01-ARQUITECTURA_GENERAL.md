# 01 — Arquitectura general

## Arquitectura elegida

```txt
Cliente navegador
    ↓
Frontend Next.js en Vercel
    ↓ fetch con credentials
Backend Express API en Railway
    ↓
MySQL Railway
    ↓
Google Drive API para imágenes y comprobantes
```

## Frontend

Tecnologías:

- Next.js
- React
- TypeScript
- TailwindCSS 4
- Componentes del prototipo v0
- lucide-react
- jsPDF para ticket PDF
- localStorage para persistencia del carrito

El frontend no renderiza EJS. React reemplaza el frontend anterior porque el profesor lo autorizó.

## Backend

Tecnologías:

- Node.js
- Express
- MySQL
- mysql2/promise
- Arquitectura MVC
- ESM (`type: module`)
- bcrypt
- JWT en cookie httpOnly
- cookie-parser
- cors
- multer con memoryStorage
- Google Drive API
- Zod
- ExcelJS
- Jest + Supertest

## Base de datos

MySQL en Railway.

Tablas principales:

- `usuario`
- `producto`
- `categoria`
- `producto_categoria`
- `combo_producto`
- `pedido`
- `pedido_detalle`
- `archivo_drive`
- `configuracion_tienda`

## Separación de responsabilidades

### Frontend

Se encarga de:

- vistas públicas
- carrito
- checkout
- ticket visual
- admin visual
- formularios
- llamadas a API
- estados de UI
- validaciones de experiencia de usuario

### Backend

Se encarga de:

- reglas de negocio
- validaciones reales
- login y sesión
- stock
- pedidos
- pagos
- comprobantes
- subida a Google Drive
- reportes Excel
- seguridad
- conexión MySQL

## Por qué esta arquitectura es válida para el TP

El repo docente actual ya trabaja con backend y frontend separados. El backend mantiene los contenidos centrales del seminario:

- Express
- MySQL
- dotenv
- CORS
- API REST
- modularización
- patrón MVC
- CRUD
- endpoints GET/POST/PUT/DELETE

React/Next.js suma valor al frontend, sin eliminar el aprendizaje backend.
