# Kermingo

Kermingo es una app web hecha para organizar la venta de comida y bebida de un evento scout recaudatorio. La idea es que las familias puedan ver el menú, armar su pedido desde el celular, elegir cómo pagan y seguir el estado de la compra sin depender de planillas sueltas o mensajes perdidos.

El evento está pensado para el **20 de junio de 2026**, en **Estomba 1980**, con una estética argentina, mundialista y scout: bingo, kermesse, comida, disfraces y recaudación para el campamento de verano.

## Para qué sirve

La app cubre el circuito completo del evento:

- publicar el menú de productos y combos;
- recibir pedidos online;
- aceptar pagos en efectivo o transferencia;
- subir y revisar comprobantes;
- preparar pedidos desde una pantalla de cocina;
- vender rápido desde caja presencial;
- controlar stock;
- ver reportes básicos de recaudación y productos vendidos.

Está pensada para que el equipo organizador tenga una herramienta simple, usable desde celulares y notebooks, sin perder control administrativo.

## Cómo está construida

El proyecto está separado en dos partes principales:

- **Frontend:** Next.js, React, TypeScript y TailwindCSS.
- **Backend:** Node.js, Express, MySQL, JWT en cookie httpOnly, Zod, Multer y Google Drive para comprobantes/imágenes.

La estructura principal es:

```txt
kermingo_menu/
├── backend/                    # API REST Express + MySQL
├── frontend/                   # App web Next.js
├── DOCUMENTACION/IA/           # Documentación técnica del proyecto
├── docs/planificacion/         # Auditorías, planes y decisiones de trabajo
├── openspec/                   # Specs y cambios del flujo SDD/OpenSpec
└── diseno-de-landing-kermingo/ # Referencia visual local, no usada en deploy
```

El frontend activo vive en `frontend/`. La carpeta `diseno-de-landing-kermingo/` fue usada como referencia visual del prototipo original y no debe tocarse ni dependerse de ella para deploy.

## Funcionalidades principales

### Menú público

- Home con información del evento.
- Menú dividido por categorías.
- Productos con imagen, precio, stock y disponibilidad.
- Productos “todavía no disponibles” visibles, pero no comprables.
- Carrito persistente en `localStorage`.

### Pedidos

- Checkout con datos del comprador.
- Pago en efectivo o transferencia.
- Comprobante obligatorio cuando se elige transferencia.
- Validación de stock en backend.
- Descuento de stock al confirmar pedido.
- Ticket de confirmación.
- Seguimiento del pedido desde el mismo celular.

### Administración

- Login admin con JWT en cookie httpOnly.
- Dashboard con métricas reales.
- Gestión de pedidos por estados.
- Revisión de comprobantes.
- Caja rápida para ventas presenciales.
- Cocina/KDS para preparar pedidos.
- Gestión de productos, imágenes, stock, orden y disponibilidad.
- Configuración de tienda abierta/cerrada y categoría inicial.
- Reportes de recaudación y ranking de productos.

### Reportes

La pantalla de reportes muestra datos reales desde el backend:

- recaudación total;
- total por efectivo y transferencia;
- pedidos pagados;
- productos vendidos;
- pagos pendientes de revisión;
- producto más vendido;
- ranking de productos;
- descarga simple en CSV.

## Cómo correrlo en local

### Backend

```bash
cd backend
npm install
npm run dev
```

Tests:

```bash
cd backend
npm test
```

Health check:

```bash
curl http://localhost:3001/api/health
```

Las variables de entorno del backend están documentadas en:

```txt
backend/.env.example
```

No commitear `.env`, credenciales, keys ni zips con datos privados.

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Build de producción:

```bash
cd frontend
NEXT_PUBLIC_API_URL=http://localhost:3001 pnpm build
```

Tests y lint:

```bash
cd frontend
pnpm lint
pnpm test
```

## Deploy

El deploy previsto es:

- **Frontend:** Vercel, con root directory `kermingo_menu/frontend`.
- **Backend:** Railway, con root directory `kermingo_menu/backend`.
- **Base de datos:** MySQL en Railway.

Para una base nueva hay que cargar:

```txt
backend/src/api/database/schema.sql
backend/src/api/database/indexes.sql
backend/src/api/database/seed.sql
```

Si la base ya existía antes de los cambios de productos, también puede hacer falta aplicar la migración manual correspondiente en `backend/src/api/database/migrations/manual/`.

## Documentación técnica

La documentación más detallada está en:

```txt
DOCUMENTACION/IA/
```

Los archivos más útiles para entender el sistema son:

- `DOCUMENTACION/IA/INDEX.md`
- `DOCUMENTACION/IA/ARQUITECTURA.md`
- `DOCUMENTACION/IA/API.md`
- `DOCUMENTACION/IA/WEBAPP.md`
- `DOCUMENTACION/IA/CORE.md`
- `DOCUMENTACION/IA/TESTING.md`

## Estado del proyecto

El proyecto ya tiene frontend, backend, tests y documentación técnica. Antes de publicar una versión final conviene hacer una pasada manual completa del flujo: pedido online, transferencia con comprobante, caja rápida, cocina, productos, configuración y reportes.
