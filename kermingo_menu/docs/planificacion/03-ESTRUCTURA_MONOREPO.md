# 03 — Estructura del proyecto actual y objetivo

## Estructura actual confirmada por Marcos

```txt
kermingo_menu/
├── AGENTS.md
├── diseno-de-landing-kermingo/
└── docs/
    ├── planificacion/
    ├── scripts/
    ├── docs/
    └── .agents/
```

La carpeta:

```txt
/home/marcos/Escritorio/Kermingo/kermingo_menu/diseno-de-landing-kermingo
```

es la base visual obligatoria.

## Estructura objetivo, respetando la actual

```txt
kermingo_menu/
├── AGENTS.md
├── diseno-de-landing-kermingo/       # Frontend Next.js para Vercel
├── backend/                          # API Express para Railway
└── docs/
    ├── planificacion/
    ├── scripts/
    ├── docs/
    │   ├── estado-actual.md
    │   ├── changelog-ia.md
    │   └── mapa-archivos.md
    └── .agents/
        └── skills/
```

## Importante sobre `frontend/`

La documentación anterior hablaba de `frontend/`, pero la estructura real que Marcos quiere conservar usa:

```txt
diseno-de-landing-kermingo/
```

Por lo tanto, cuando una tarea diga “frontend”, debe interpretarse como:

```txt
diseno-de-landing-kermingo/
```

No renombrar esa carpeta sin autorización.

## Deploy Vercel

En Vercel, configurar:

```txt
Root Directory: diseno-de-landing-kermingo
Framework: Next.js
Build Command: pnpm build
Install Command: pnpm install
Output: automático para Next.js
```

## Backend futuro

Crear:

```txt
backend/
├── package.json
├── .env.example
├── src/
│   ├── app.js
│   ├── server.js
│   └── api/
│       ├── config/
│       ├── database/
│       ├── routes/
│       ├── controllers/
│       ├── models/
│       ├── middlewares/
│       ├── schemas/
│       ├── services/
│       └── utils/
└── tests/
```

## Documentación viva

Actualizar estos archivos cuando cambie algo:

```txt
docs/docs/estado-actual.md
docs/docs/changelog-ia.md
docs/docs/mapa-archivos.md
```

## Skills locales

Actualmente están en:

```txt
docs/.agents/skills/
```

Si OpenCode no las detecta, sincronizar a:

```txt
.agents/skills/
```

con:

```bash
bash docs/scripts/sincronizar_skills_a_raiz.sh
```
