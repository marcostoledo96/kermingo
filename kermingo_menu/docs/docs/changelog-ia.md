# Changelog IA

## Fase 0 — Setup y preparación del proyecto (2026-06-04)

### Cambios aplicados

- Creada carpeta `frontend/` con copia del prototipo v0 desde `diseno-de-landing-kermingo/`.
- `diseno-de-landing-kermingo/` se conserva intacta como referencia visual.
- Instalado pnpm 11.5.1 vía `npm install -g pnpm --prefix ~/.local/`.
- Instaladas dependencias frontend (602 paquetes, Next.js 16.2.6).
- Agregado ESLint (`eslint`, `eslint-config-next`, `@eslint/eslintrc`) como devDependencies.
- Creado `eslint.config.mjs` para flat config de ESLint v10.
- Creado `.npmrc` con `onlyBuiltDependencies` para msw, sharp, unrs-resolver.
- Instaladas 13 skills externas desde skills.sh:
  - `vercel-labs/next-skills` (next-best-practices, next-cache-components, next-upgrade)
  - `vercel-labs/agent-skills` (vercel-composition-patterns, deploy-to-vercel, vercel-react-best-practices, vercel-react-native-skills, vercel-react-view-transitions, vercel-cli-with-tokens, vercel-optimize, web-design-guidelines, writing-guidelines)
  - `mattpocock/skills` (tdd)
- Sincronizadas skills locales a `.agents/skills/` (kermingo-backend-api, kermingo-frontend-v0, kermingo-verification).
- Ejecutado `gentle-ai skill-registry refresh --force` → 55 skills registradas.
- Creado `docs/docs/registro-skills.md` con clasificación completa de todas las skills.
- Build exitoso: ✅ `pnpm build` compila correctamente (Next.js 16.2.6 + Turbopack).
- Lint parcial: ESLint v10 tiene conflicto con `eslint-config-next` (circular structure error). El build funciona.

### Problemas detectados y estado

- ESLint: conflicto entre ESLint v10 y `eslint-config-next`. Build no está bloqueado.
- pnpm 11.5.1: políticas estrictas de build scripts resueltas con `.npmrc`.
- Engram: naming conflict entre `kermingo` y `entradas_kermingo`.

---

## Actualización documentación — referencia visual obligatoria

Se actualizó la documentación para reflejar que la carpeta:

```txt
/home/marcos/Escritorio/Kermingo/kermingo_menu/diseno-de-landing-kermingo
```

es la referencia visual obligatoria del frontend.

Cambios aplicados:

- Actualizado `AGENTS.md`.
- Actualizado índice maestro.
- Actualizada estructura real del proyecto.
- Agregado `25-REFERENCIA_VISUAL_FRONTEND.md`.
- Agregado `26-AGENTS_Y_SKILLS.md`.
- Reescritas tareas frontend detalladas con rutas reales.
- Reescritas tareas backend e integración para respetar estructura actual.
- Agregado script `docs/scripts/sincronizar_skills_a_raiz.sh`.
