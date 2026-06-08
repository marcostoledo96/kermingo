# Estado actual de Kermingo

## Estructura confirmada

```txt
kermingo_menu/
├── AGENTS.md
├── diseno-de-landing-kermingo/
└── docs/
```

## Referencia visual obligatoria

```txt
/home/marcos/Escritorio/Kermingo/kermingo_menu/diseno-de-landing-kermingo
```

## Frontend

Existe un prototipo Next.js generado en v0 dentro de:

```txt
diseno-de-landing-kermingo/
```

Debe conservarse como base visual fuerte.

## Backend

**Estado**: ✅ Creado, con Base de Datos (Schema, Seed e Índices) alineados al tipo `promo`, Lógica de Stock corregida contra stock ilimitado y deadlocks, y Tests unitarios y de salud pasando con Jest/Supertest.

Ubicación:

```txt
backend/
```

Stack: Express 4.21 + MySQL + ESM + cors + cookie-parser + dotenv + nodemon + Jest + Supertest
Puerto: 3001 (configurable via `.env`)

## Documentación

La planificación vive en:

```txt
docs/planificacion/
```

## Próximo paso recomendado

1. Avanzar a la Etapa B6 (Caja, Cocina, Comprobantes, Google Drive y Reportes).
