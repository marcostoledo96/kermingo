# Kermingo — Índice maestro actualizado

## Estructura real actual

El proyecto debe mantenerse con esta estructura:

```txt
kermingo_menu/
├── AGENTS.md
├── diseno-de-landing-kermingo/   # Frontend Next.js + referencia visual obligatoria
└── docs/
    ├── planificacion/
    ├── scripts/
    ├── docs/
    └── .agents/
```

El backend se agregará después como:

```txt
kermingo_menu/backend/
```

## Referencia visual obligatoria

La carpeta de referencia visual es:

```txt
/home/marcos/Escritorio/Kermingo/kermingo_menu/diseno-de-landing-kermingo
```

Dentro del repo:

```txt
diseno-de-landing-kermingo/
```

Toda tarea frontend debe leer:

```txt
docs/planificacion/25-REFERENCIA_VISUAL_FRONTEND.md
```

## Arquitectura objetivo

```txt
Frontend: diseno-de-landing-kermingo/ → Next.js + React + TypeScript + TailwindCSS → Vercel
Backend: backend/ → Express + MySQL + API REST + MVC → Railway
Base de datos: MySQL Railway
Archivos: Google Drive API
```

## Qué leer según la tarea

### Siempre

```txt
AGENTS.md
docs/planificacion/00-INDICE-MAESTRO.md
docs/planificacion/25-REFERENCIA_VISUAL_FRONTEND.md
```

### Backend

```txt
docs/planificacion/04-BACKEND_API_EXPRESS_MYSQL.md
docs/planificacion/05-BASE_DE_DATOS_MYSQL.md
docs/planificacion/06-ENDPOINTS_API.md
docs/planificacion/09-AUTH_COOKIES_CORS.md
docs/planificacion/11-GOOGLE_DRIVE_ARCHIVOS.md
docs/planificacion/17-TAREAS_BACKEND_DETALLADAS.md
```

### Frontend

```txt
docs/planificacion/07-FRONTEND_NEXTJS_V0.md
docs/planificacion/08-RUTAS_FRONTEND.md
docs/planificacion/10-CARRITO_LOCALSTORAGE.md
docs/planificacion/12-DISENO_VISUAL_V0.md
docs/planificacion/18-TAREAS_FRONTEND_DETALLADAS.md
docs/planificacion/25-REFERENCIA_VISUAL_FRONTEND.md
```

### Integración y deploy

```txt
docs/planificacion/13-FLUJOS_FUNCIONALES.md
docs/planificacion/14-DEPLOY_RAILWAY_VERCEL.md
docs/planificacion/15-VARIABLES_ENTORNO.md
docs/planificacion/16-TESTING.md
docs/planificacion/19-TAREAS_INTEGRACION_DEPLOY_DETALLADAS.md
```

### Agentes, skills y forma de trabajo

```txt
AGENTS.md
docs/planificacion/24-SKILLS_SH_RECOMENDADAS.md
docs/planificacion/26-AGENTS_Y_SKILLS.md
```

## MVP

- Landing
- Menú
- Carrito persistente
- Checkout
- Transferencia con comprobante
- Efectivo al retirar
- Creación de pedido
- Ticket digital
- Seguimiento por token sin login
- Login admin
- Productos
- Pedidos
- Caja rápida
- Cocina / Entrega
- Comprobantes
- Stock real con combos
- Reportes mínimos Excel
- Deploy frontend/backend/base

## Regla para IA

No ejecutar tareas grandes sin leer la documentación indicada.  
No rediseñar frontend ignorando `diseno-de-landing-kermingo`.  
No renombrar la carpeta visual sin autorización de Marcos.
