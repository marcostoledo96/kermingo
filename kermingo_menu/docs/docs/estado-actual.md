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

**Estado**: ✅ Creado — scaffolding completo, verificado con curl

Ubicación:

```txt
backend/
```

Stack: Express 4.21 + ESM + cors + cookie-parser + dotenv + nodemon
Puerto: 3001 (configurable via `.env`)

## Documentación

La planificación vive en:

```txt
docs/planificacion/
```

## Próximo paso recomendado

1. Verificar que `diseno-de-landing-kermingo` compile.
2. Crear backend base.
3. Crear MySQL schema/seed.
4. Conectar productos públicos.
