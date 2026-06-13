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

**Estado**: ✅ Creado.
- Base de Datos (Schema, Seed e Índices) alineados al tipo `promo`, lógica de stock corregida contra stock ilimitado y deadlocks.
- Implementado el módulo de subida de imágenes de producto a Google Drive con procesamiento y optimización WebP utilizando `sharp`.
- Implementado endpoint público `GET /api/productos/:id/imagen` que transmite la imagen como stream desde Google Drive y añade cabeceras HTTP de caché optimizadas (`Cache-Control`, `Content-Disposition`, `Content-Type: image/webp`).
- Implementados endpoints de administración protegidos `POST /api/admin/productos/:id/imagen` y `DELETE /api/admin/productos/:id/imagen` con verificación de firmas de archivo (magic bytes) para PNG/JPEG/WEBP.
- Todos los tests unitarios y de integración pasando con Jest/Supertest (199 tests en total).

Ubicación:

```txt
backend/
```

Stack: Express 4.21 + MySQL + ESM + sharp + cors + cookie-parser + dotenv + nodemon + Jest + Supertest
Puerto: 3001 (configurable via `.env`)

## Documentación

La planificación vive en:

```txt
docs/planificacion/
```

## Próximo paso recomendado

1. Continuar con la integración del frontend para consumir estas imágenes y soportar la subida desde el panel de administración.
